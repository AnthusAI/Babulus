"""The Studio sign-in behind ``babulus login``, built on the shared ``cli-login`` library.

``cli-login`` owns the OAuth exchange, token checks, renewal, locking, secure storage and honest logout. This module
keeps only what is Babulus's own: reading a Studio's public sign-in values from
``/.well-known/babulus-cli.json``, remembering which Studio the machine is signed in to, and binding the session to the
one jobs API that Studio published, so a token is never sent anywhere else.

There is no plaintext fallback. If no secure store is usable, sign-in fails with the steps to fix it and writes nothing.
"""

from __future__ import annotations

import hashlib
import json
import os
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from cli_login.errors import AuthError, OAuthError  # noqa: F401 (re-exported)
from cli_login.oauth import receive_code
from cli_login.remote import remote_login
from cli_login.session import Session
from cli_login.target import Target

NAMESPACE = "babulus-oauth"
LOGIN_COMMAND = "babulus login"
DISCOVERY_PATH = "/.well-known/babulus-cli.json"
DISCOVERY_MAX_BYTES = 16 * 1024
STATE_DIR_ENV = "BABULUS_CLI_STATE_DIR"

_REQUIRED = frozenset(
    {
        "publication",
        "issuer",
        "client_id",
        "oauth_domain",
        "api_endpoint",
        "callback_uri",
    }
)
_OPTIONAL = frozenset({"broker_endpoint", "remote_callback_uri"})


def state_dir() -> Path:
    """The private directory for the public sign-in metadata and the session locks."""
    override = os.environ.get(STATE_DIR_ENV)
    if override:
        return Path(override).expanduser()
    return Path.home() / ".config" / "babulus"


def registry_path() -> Path:
    """Where the one signed-in Studio's public metadata is kept (mode 0600)."""
    return state_dir() / "studio-login.json"


@dataclass(frozen=True)
class StudioLogin:
    """A Studio's public sign-in values. Nothing here is a secret."""

    publication: str
    issuer: str
    client_id: str
    oauth_domain: str
    api_endpoint: str
    callback_uri: str
    broker_endpoint: str | None = None
    remote_callback_uri: str | None = None

    def __post_init__(self) -> None:
        object.__setattr__(self, "api_endpoint", self.api_endpoint.rstrip("/"))
        self.target()  # Validates every URL; raises AuthError.

    @property
    def host(self) -> str:
        return self.publication[len("https://") :]

    def target(self) -> Target:
        key = hashlib.sha256(
            "|".join((self.issuer, self.client_id, self.publication)).encode()
        ).hexdigest()[:40]
        return Target(
            issuer=self.issuer,
            client_id=self.client_id,
            oauth_domain=self.oauth_domain,
            token_endpoint=self.oauth_domain.rstrip("/") + "/oauth2/token",
            api_endpoint=self.api_endpoint,
            key=key,
            namespace=NAMESPACE,
            callback_uri=self.callback_uri,
            broker_endpoint=self.broker_endpoint,
            remote_callback_uri=self.remote_callback_uri,
        )


def normalize_site(value: str) -> str:
    """Turn ``studio.example.test`` or ``https://studio.example.test`` into an https origin."""
    text = value.strip()
    if not text:
        raise AuthError(
            "Name your Studio, for example `babulus login studio.example.test`."
        )
    if "://" not in text:
        text = "https://" + text
    parts = urllib.parse.urlsplit(text)
    if (
        parts.scheme != "https"
        or not parts.hostname
        or parts.username
        or parts.password
        or parts.path not in ("", "/")
        or parts.query
        or parts.fragment
    ):
        raise AuthError(f"{value!r} is not a Studio address; use its https host name.")
    return f"https://{parts.netloc}"


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args: Any, **kwargs: Any) -> None:
        return None


def discover(site: str, *, opener: Any = None) -> StudioLogin:
    """Read a Studio's public sign-in values: HTTPS only, no redirects, size-capped, strict schema."""
    origin = normalize_site(site)
    host = origin[len("https://") :]
    opener = opener or urllib.request.build_opener(_NoRedirect())
    request = urllib.request.Request(
        origin + DISCOVERY_PATH, headers={"Accept": "application/json"}
    )
    try:
        with opener.open(request, timeout=15) as response:
            raw = response.read(DISCOVERY_MAX_BYTES + 1)
    except urllib.error.HTTPError as error:
        if error.code == 404:
            raise AuthError(
                f"{host} does not publish CLI sign-in (its web app client does not register "
                "the command's callback)."
            ) from None
        raise AuthError(
            f"{host} did not serve its CLI sign-in values (HTTP {error.code}); redirects are refused."
        ) from None
    except (OSError, urllib.error.URLError, ValueError):
        raise AuthError(
            f"Could not reach {host} to read its CLI sign-in values; check the name and your connection."
        ) from None
    invalid = AuthError(
        f"{host} published invalid CLI sign-in values; nothing was saved."
    )
    if len(raw) > DISCOVERY_MAX_BYTES:
        raise invalid
    try:
        data = json.loads(raw)
    except ValueError:
        raise invalid from None
    if (
        not isinstance(data, dict)
        or not _REQUIRED <= set(data)
        or set(data) - _REQUIRED - _OPTIONAL
    ):
        raise invalid
    try:
        login = StudioLogin(**data)
    except (AuthError, TypeError, AttributeError):
        raise invalid from None
    if login.publication != origin:
        raise AuthError(
            f"{host} published sign-in values for a different Studio; nothing was saved."
        )
    return login


def save_login(login: StudioLogin) -> None:
    """Remember the Studio the machine signs in to (public values only), atomically, mode 0600."""
    directory = state_dir()
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    descriptor, temporary = tempfile.mkstemp(dir=directory, prefix=".studio-login-")
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            json.dump(asdict(login), handle)
        os.chmod(temporary, 0o600)
        os.replace(temporary, registry_path())
    except BaseException:
        Path(temporary).unlink(missing_ok=True)
        raise


def load_login() -> StudioLogin | None:
    """The remembered Studio, or None when this machine has never signed in."""
    path = registry_path()
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return StudioLogin(**data)
    except (ValueError, TypeError, AuthError):
        raise AuthError(
            f"The saved sign-in details are damaged; run `{LOGIN_COMMAND} <studio>` again."
        ) from None


def resolve_login(site: str | None = None, *, opener: Any = None) -> StudioLogin:
    """The Studio to sign in to: the named one (discovered), else the remembered one."""
    if site:
        return discover(site, opener=opener)
    remembered = load_login()
    if remembered is None:
        raise AuthError(
            "Name your Studio, for example `babulus login studio.example.test`."
        )
    return remembered


class StudioSession:
    """One Studio's signed-in session: the shared ``cli_login.Session`` plus the Studio's name in messages."""

    def __init__(
        self,
        login: StudioLogin,
        *,
        store: Any = None,
        provider: Any = None,
        clock: Any = time.time,
        receive: Any = receive_code,
    ) -> None:
        self.login_values = login
        self._session = Session(
            login.target(),
            store=store,
            provider=provider,
            clock=clock,
            receive=lambda *arguments: receive(*arguments),
            state_dir=state_dir(),
            login_command=f"{LOGIN_COMMAND} {login.host}",
            identity_provider="Google",
            api_token="access",
        )

    @property
    def store(self) -> Any:
        return self._session.store

    @property
    def api_endpoint(self) -> str:
        return self.login_values.api_endpoint

    def login(self) -> dict[str, Any]:
        """Local browser sign-in on the fixed loopback callback."""
        return self._session.login()

    def login_remote(self, **options: Any) -> dict[str, Any]:
        """Sign in through the Studio's broker: a person approves on another device. Stores like a local sign-in."""
        return remote_login(
            self._session.target, self._session.store_token_set, **options
        )

    def access_token(self, endpoint: str | None = None) -> str:
        """A valid access token for the Studio's jobs API, renewed when stale.

        The token goes only to the endpoint the Studio published; any other endpoint is refused.
        """
        return self._session.headers(endpoint or self.api_endpoint)["Authorization"]

    def refresh(self) -> None:
        """Drop the in-memory token so the next call renews it (after the API answered 401)."""
        self._session._token = (
            None  # noqa: SLF001 - cli-login has no public force-renew
        )

    def status(self) -> dict[str, Any]:
        return self._session.status() | {"publication": self.login_values.publication}

    def logout(self) -> dict[str, Any]:
        return self._session.logout()
