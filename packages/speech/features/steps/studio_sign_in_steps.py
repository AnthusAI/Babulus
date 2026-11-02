"""Behave steps for Studio sign-in: fakes for the secure store, the provider, the broker and the Studio's file."""

from __future__ import annotations

import base64
import importlib.util
import json
import os
import time
from pathlib import Path
from unittest.mock import patch

import httpx
from behave import given, then, when
from cli_login.errors import AuthError, OAuthError
from cli_login.testing import (
    CLIENT_ID,
    ISSUER,
    FakeClock,
    FakeProvider,
    FakeStore,
    make_access_token,
)
from typer.testing import CliRunner

from babulus_speech import api, cli_session
from babulus_speech.api import (
    AuritusApiError,
    AuritusClient,
    AuritusSessionExpiredError,
    StoredSessionAuth,
)
from babulus_speech.cli import app as cli_app
from babulus_speech.cli_session import StudioLogin, StudioSession
from babulus_speech.commands import login as login_cmd

ORIGIN = "https://studio.example.test"
API = "https://api.example.test/prod"
TOKEN_URL = "https://auth.example.test/oauth2/token"
APPROVAL_URL = ORIGIN + "/cli/approve?t=abc"
MATCHING_CODE = "BCDF-GHJK"
PERSON = "person@example.test"


def _login(remote: bool = True) -> StudioLogin:
    values = {
        "publication": ORIGIN,
        "issuer": ISSUER,
        "client_id": CLIENT_ID,
        "oauth_domain": "https://auth.example.test",
        "api_endpoint": API,
        "callback_uri": "http://localhost:38512/",
    }
    if remote:
        values["broker_endpoint"] = "https://broker.example.test"
        values["remote_callback_uri"] = ORIGIN + "/cli/callback"
    return StudioLogin(**values)


def _encode(value: dict) -> str:
    raw = base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip("=")
    return raw


def _id_token(now: float, *, email: str, nonce: str | None) -> str:
    claims = {
        "iss": ISSUER,
        "aud": CLIENT_ID,
        "sub": "person-1",
        "token_use": "id",
        "exp": now + 3600,
        "email": email,
    }
    if nonce is not None:
        claims["nonce"] = nonce
    return _encode({"alg": "RS256"}) + "." + _encode(claims) + ".fixture-signature"


class FakeBroker:
    """The broker's /start and /poll and the provider's token endpoint, with no network."""

    def __init__(self, context, approver_email: str) -> None:
        self.context = context
        self.approver_email = approver_email
        self.nonce: str | None = None
        self.polls = 0

    def __call__(self, method, url, *, json_body=None, form=None, timeout=30):
        if url.endswith("/start"):
            self.nonce = json_body["nonce"]
            return (
                200,
                {
                    "protocol": 1,
                    "approval_url": APPROVAL_URL,
                    "transaction": "tx-1",
                    "matching_code": MATCHING_CODE,
                    "interval": 1,
                    "expires_at": time.time() + 600,
                },
                {},
            )
        if url.endswith("/poll"):
            self.polls += 1
            if self.polls == 1:
                return 400, {"error": "authorization_pending"}, {}
            return (
                200,
                {"code": "auth-code-1", "redirect_uri": ORIGIN + "/cli/callback"},
                {},
            )
        assert url == TOKEN_URL, url
        now = self.context.clock()
        return (
            200,
            {
                "id_token": _id_token(now, email=self.approver_email, nonce=self.nonce),
                "access_token": make_access_token(now),
                "refresh_token": "refresh-secret-remote",
                "expires_in": 3600,
            },
            {},
        )


def _session(context) -> StudioSession:
    store = None if context.real_store else context.store
    return StudioSession(
        context.studio,
        store=store,
        provider=context.provider,
        clock=context.clock,
        receive=context.receive,
    )


def _factory(context):
    return lambda studio: _session(context)


def _state_files(context) -> list[str]:
    root = Path(context.state_dir)
    return sorted(str(p.relative_to(root)) for p in root.rglob("*") if p.is_file())


def _run(context, args: list[str], *, patch_studio: bool = True):
    patches = [
        patch.object(login_cmd, "StudioSession", side_effect=_factory(context)),
        patch.object(login_cmd, "resolve_login", return_value=context.studio),
    ]
    if getattr(context, "signed_in_studio", False) or getattr(
        context, "remembered", False
    ):
        patches.append(
            patch.object(login_cmd, "load_login", return_value=context.studio)
        )
    broker = getattr(context, "broker", None)
    if broker is not None:
        real = cli_session.remote_login
        patches.append(
            patch.object(
                cli_session,
                "remote_login",
                side_effect=lambda *a, **k: real(
                    *a, http=broker, sleep=lambda s: None, **k
                ),
            )
        )
    for p in patches:
        p.start()
    try:
        context.result = CliRunner().invoke(cli_app, args)
    finally:
        for p in reversed(patches):
            p.stop()
    return context.result


@given("a Studio that publishes its sign-in values")
def step_studio(context) -> None:
    context.studio = _login()
    context.state_dir = os.path.join(context.scenario_root, "state")
    os.makedirs(context.state_dir)
    saved = {
        key: os.environ.get(key) for key in ("BABULUS_CLI_STATE_DIR", "CLI_LOGIN_STORE")
    }
    os.environ["BABULUS_CLI_STATE_DIR"] = context.state_dir
    os.environ.pop("CLI_LOGIN_STORE", None)

    def restore() -> None:
        for key, value in saved.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

    context.add_cleanup(restore)
    context.real_store = False
    context.broker = None
    context.error = None
    context.token = None
    context.auth_urls = []


@given("an empty secure store")
def step_store(context) -> None:
    context.clock = FakeClock()
    context.store = FakeStore()
    context.provider = FakeProvider(context.clock)

    def receive(callback, url, state, timeout):
        context.auth_urls.append(url)
        return "auth-code-1"

    context.receive = receive


@given("a Studio that publishes no remote sign-in broker")
def step_no_broker(context) -> None:
    context.studio = _login(remote=False)


@given("the secure store the machine would use is unavailable")
def step_unavailable(context) -> None:
    context.real_store = True
    os.environ["CLI_LOGIN_STORE"] = "plaintext-file"


@given("the person is signed in")
def step_signed_in(context) -> None:
    _session(context).login()
    cli_session.save_login(context.studio)
    context.signed_in_studio = True


@given("the provider has revoked the session")
def step_revoked(context) -> None:
    context.provider.failure = OAuthError("invalid_grant")


# ---- signing in ----


@when("the person signs in on this machine")
def step_sign_in(context) -> None:
    _run(context, ["login", "studio.example.test"])
    assert context.result.exit_code == 0, context.result.output


@when("the person tries to sign in on this machine")
def step_try_sign_in(context) -> None:
    _run(context, ["login", "studio.example.test"])


@when("the person signs in remotely and approves with the code on another device")
def step_remote(context) -> None:
    context.broker = FakeBroker(context, PERSON)
    _run(context, ["login", "studio.example.test", "--remote"])
    assert context.result.exit_code == 0, context.result.output


@when('the person signs in remotely expecting "{email}" and someone else approves')
def step_remote_wrong(context, email: str) -> None:
    context.broker = FakeBroker(context, "someone-else@example.test")
    _run(context, ["login", "studio.example.test", "--remote", "--expect-email", email])


@when("the person tries to sign in remotely")
def step_try_remote(context) -> None:
    _run(context, ["login", "studio.example.test", "--remote"])


@then("the secure store holds a renewable session for the person")
def step_holds(context) -> None:
    assert len(context.store.data) == 1, context.store.data
    record = json.loads(next(iter(context.store.data.values())))
    assert record["subject"] == "person-1"
    assert record["label"] == PERSON
    assert record["refresh_token"].startswith("refresh-secret")


@then("the secure store is empty")
def step_empty(context) -> None:
    assert context.store.data == {}


@then("the Google identity provider was asked for")
def step_google(context) -> None:
    assert len(context.auth_urls) == 1
    assert "identity_provider=Google" in context.auth_urls[0]
    assert "code_challenge_method=S256" in context.auth_urls[0]


@then("the only file on disk is the Studio's public sign-in values")
def step_only_file(context) -> None:
    files = [f for f in _state_files(context) if not f.endswith(".lock")]
    assert files == ["studio-login.json"], files
    mode = os.stat(os.path.join(context.state_dir, "studio-login.json")).st_mode
    assert mode & 0o777 == 0o600
    text = Path(context.state_dir, "studio-login.json").read_text()
    assert "refresh" not in text and "token" not in text.replace("token_endpoint", "")


@then("the command says who signed in")
def step_says(context) -> None:
    assert f"Signed in as {PERSON}" in context.result.output


@then("sign-in fails and says that plaintext storage is never used")
def step_plaintext(context) -> None:
    assert context.result.exit_code == 1
    assert "never used" in context.result.output


@then("no file is written")
def step_no_file(context) -> None:
    assert _state_files(context) == []


@then("the command printed the approval link and the matching code")
def step_printed(context) -> None:
    out = context.result.output
    assert APPROVAL_URL in out
    assert MATCHING_CODE in out


@then("nothing secret was printed")
def step_nothing_secret(context) -> None:
    out = context.result.output
    assert (
        "refresh-secret" not in out
        and "eyJ" not in out
        and "fixture-signature" not in out
    )


@then("the sign-in fails and says someone other than the expected person approved")
def step_wrong(context) -> None:
    assert context.result.exit_code == 1
    assert "Someone other than the expected person" in context.result.output


@then("the sign-in fails and says the Studio has no remote sign-in")
def step_no_remote(context) -> None:
    assert context.result.exit_code == 1
    assert (
        "no remote sign-in broker" in context.result.output
        or "broker" in context.result.output
    )


# ---- using the session ----


@when("an hour and a minute pass")
def step_pass(context) -> None:
    context.clock.advance(3660)
    context.calls_before = len(context.provider.calls)


@when("the command asks for a token")
def step_token(context) -> None:
    context.calls_before = getattr(context, "calls_before", len(context.provider.calls))
    try:
        context.token = StoredSessionAuth(_session(context)).access_token()
    except AuritusApiError as exc:
        context.error = exc


@when("the command asks for a token without ever having signed in")
def step_token_never(context) -> None:
    step_token(context)


@when('the command asks for a token for "{endpoint}"')
def step_token_other(context, endpoint: str) -> None:
    context.calls_before = len(context.provider.calls)
    try:
        context.token = StoredSessionAuth(_session(context), endpoint).access_token()
    except AuritusApiError as exc:
        context.error = exc


@then("the provider was asked to renew with the stored refresh token")
def step_renew(context) -> None:
    new = context.provider.calls[context.calls_before :]
    assert len(new) == 1
    assert new[0][1]["grant_type"] == "refresh_token"
    assert new[0][1]["refresh_token"].startswith("refresh-secret")


@then("the command gets a fresh access token")
def step_fresh(context) -> None:
    assert context.error is None, context.error
    claims = json.loads(base64.urlsafe_b64decode(context.token.split(".")[1] + "==="))
    assert claims["token_use"] == "access"
    assert claims["exp"] > context.clock()


@then('the command is told the session expired and to run "{command}"')
def step_expired(context, command: str) -> None:
    assert isinstance(context.error, AuritusSessionExpiredError), context.error
    assert command in str(context.error)


@then("no token is handed out")
def step_no_token(context) -> None:
    assert context.token is None
    assert isinstance(context.error, AuritusApiError)
    assert not isinstance(context.error, AuritusSessionExpiredError)


@then("the provider was not asked for anything new")
def step_not_asked(context) -> None:
    assert len(context.provider.calls) == context.calls_before


@when("the person signs out")
def step_sign_out(context) -> None:
    _run(context, ["logout"])
    assert context.result.exit_code == 0, context.result.output


@then("the provider revoked the refresh token")
def step_revoked_token(context) -> None:
    revokes = [c for c in context.provider.calls if c[0].endswith("/oauth2/revoke")]
    assert len(revokes) == 1
    assert revokes[0][1]["token"].startswith("refresh-secret")


@when("the person runs whoami")
def step_whoami(context) -> None:
    _run(context, ["whoami"])
    assert context.result.exit_code == 0, context.result.output


@then("the output names the person and the Studio")
def step_names(context) -> None:
    assert PERSON in context.result.output
    assert "studio.example.test" in context.result.output


@then("the output holds no token")
def step_no_token_output(context) -> None:
    out = context.result.output
    assert "refresh-secret" not in out and "eyJ" not in out


# ---- the password path is gone ----


def _option_refused(context, option: str) -> None:
    result = CliRunner().invoke(cli_app, ["login", option, "x"])
    assert result.exit_code == 2, result.output
    assert "No such option" in result.output


@then("babulus login has no password option")
def step_no_password(context) -> None:
    _option_refused(context, "--password")


@then("babulus login has no username option")
def step_no_username(context) -> None:
    _option_refused(context, "--username")


@then("babulus login has no sso option")
def step_no_sso(context) -> None:
    _option_refused(context, "--sso")


@then("the command source contains no Cognito password flow")
def step_no_flow(context) -> None:
    assert importlib.util.find_spec("babulus_speech.auth") is None
    root = Path(api.__file__).parent
    offenders = [
        str(p)
        for p in root.rglob("*.py")
        if any(
            marker in p.read_text(encoding="utf-8")
            for marker in ("USER_PASSWORD_AUTH", "initiate_auth", "login_with_password")
        )
    ]
    assert offenders == [], offenders


# ---- cloud worker and refusals ----


def _no_session(*args, **kwargs):
    raise AssertionError("the stored session must not be read by a cloud worker")


@when('a cloud worker\'s client with the job token "{token}" makes a request')
def step_cloud(context, token: str) -> None:
    context.sent = []
    context.calls_before = len(context.provider.calls)

    def send(self, method, url, *, headers, json_body):
        context.sent.append(headers)
        return httpx.Response(200, json={}, request=httpx.Request(method, url))

    with (
        patch.object(api, "load_config", return_value={"api_endpoint": API}),
        patch.object(api, "load_login", side_effect=_no_session),
        patch.object(api, "stored_session_auth", side_effect=_no_session),
        patch.object(api.AuritusClient, "_send", send),
    ):
        AuritusClient(base_url=API, token=token)._request("GET", "/jobs")


@then('the request carries the bearer "{token}"')
def step_bearer(context, token: str) -> None:
    assert context.sent[0]["Authorization"] == f"Bearer {token}"


@then("the stored session was not read")
def step_not_read(context) -> None:
    assert len(context.provider.calls) == context.calls_before


@when("the jobs API answers a request with 403")
def step_403(context) -> None:
    def send(self, method, url, *, headers, json_body):
        return httpx.Response(403, json={}, request=httpx.Request(method, url))

    with (
        patch.object(api, "load_config", return_value={"api_endpoint": API}),
        patch.object(api.AuritusClient, "_send", send),
    ):
        client = AuritusClient(base_url=API, auth=StoredSessionAuth(_session(context)))
        try:
            client._request("GET", "/jobs")
        except AuritusApiError as exc:
            context.error = exc


@then("the person is told this sign-in has no Babulus access to that Account")
def step_no_access(context) -> None:
    assert context.error is not None and context.error.status_code == 403
    assert "no Babulus access to that Account" in str(context.error)


@then("the person is told to ask an owner of the Account")
def step_ask_owner(context) -> None:
    assert "Ask an owner of the Account" in str(context.error)


# ---- discovery ----


class _Opener:
    def __init__(self, raw: bytes) -> None:
        self.raw = raw
        self.requests: list = []

    def open(self, request, timeout=None):
        self.requests.append(request)
        raw = self.raw

        class Response:
            def __enter__(self_inner):
                return self_inner

            def __exit__(self_inner, *args):
                return False

            def read(self_inner, size=-1):
                return raw if size < 0 else raw[:size]

        return Response()


def _document(**changes) -> dict:
    document = {
        "publication": ORIGIN,
        "issuer": ISSUER,
        "client_id": CLIENT_ID,
        "oauth_domain": "https://auth.example.test",
        "api_endpoint": API,
        "callback_uri": "http://localhost:38512/",
    }
    document.update(changes)
    return document


@when('the person names the Studio "{site}"')
def step_names_studio(context, site: str) -> None:
    context.opener = _Opener(json.dumps(_document()).encode())
    with patch.object(
        cli_session.urllib.request, "build_opener", return_value=context.opener
    ):
        _run(context, ["login", site])
    context.found = cli_session.discover(site, opener=context.opener)


@then("the sign-in values are read only from the Studio's well-known file over https")
def step_well_known(context) -> None:
    assert (
        context.opener.requests[0].full_url == ORIGIN + "/.well-known/babulus-cli.json"
    )
    assert cli_session._NoRedirect().redirect_request() is None
    assert context.found == _login(remote=False)


@then("the Studio is remembered for the next sign-in")
def step_remembered(context) -> None:
    assert cli_session.load_login() == context.studio


@when("the Studio serves {problem}")
def step_serves(context, problem: str) -> None:
    document = _document()
    raw: bytes
    if problem == "an unknown extra field":
        document["extra"] = "x"
        raw = json.dumps(document).encode()
    elif problem == "a missing issuer":
        del document["issuer"]
        raw = json.dumps(document).encode()
    elif problem == "values for a different Studio":
        document["publication"] = "https://other.example.test"
        raw = json.dumps(document).encode()
    elif problem == "an http jobs API endpoint":
        document["api_endpoint"] = "http://api.example.test/prod"
        raw = json.dumps(document).encode()
    elif problem == "a file larger than 16 KiB":
        document["client_id"] = "c" * (17 * 1024)
        raw = json.dumps(document).encode()
    elif problem == "something that is not JSON":
        raw = b"<html>not json</html>"
    else:
        raise AssertionError(problem)
    context.error = None
    try:
        cli_session.discover("studio.example.test", opener=_Opener(raw))
    except AuthError as exc:
        context.error = exc


@then("discovery fails and nothing is saved")
def step_discovery_fails(context) -> None:
    assert isinstance(context.error, AuthError)
    assert _state_files(context) == []
