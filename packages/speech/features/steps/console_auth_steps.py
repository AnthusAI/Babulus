"""Steps that read the web console's sign-in source."""

from __future__ import annotations

import re
from pathlib import Path

from behave import given, then

CONSOLE = Path(__file__).resolve().parents[4] / "apps" / "console"


def _read(*parts: str) -> str:
    return CONSOLE.joinpath(*parts).read_text(encoding="utf-8")


@given("the console's login page source is read")
def step_read_login(context) -> None:
    context.console_text = _read("app", "login", "page.tsx")


@given("the console's sign-in library is read")
def step_read_auth(context) -> None:
    context.console_text = _read("lib", "auth.ts")


@given("the console's API client is read")
def step_read_api(context) -> None:
    context.console_text = _read("lib", "api.ts")


@given("the console's auth guard is read")
def step_read_guard(context) -> None:
    context.console_text = _read("components", "AuthGuard.tsx")


@given("the console's header is read")
def step_read_header(context) -> None:
    context.console_text = _read("components", "Header.tsx")


@then('the page has a button labelled "{label}"')
def step_button_label(context, label: str) -> None:
    assert label in context.console_text
    assert context.console_text.count("<button") == 1


@then("the page has no password or email field")
def step_no_fields(context) -> None:
    assert "<input" not in context.console_text
    assert 'type="password"' not in context.console_text


@then("the page offers no other identity provider")
def step_no_other_provider(context) -> None:
    for word in ("IdentityCenter", "Identity Center", "Cognito credentials", "SAML"):
        assert word not in context.console_text, word


@then('it builds a hosted UI authorize address with identity_provider "{provider}"')
def step_authorize(context, provider: str) -> None:
    assert f"identity_provider: '{provider}'" in context.console_text
    assert "/oauth2/authorize" in context.console_text


@then("it asks for the authorization code flow with an S256 code challenge")
def step_pkce(context) -> None:
    text = context.console_text
    assert "response_type: 'code'" in text
    assert "code_challenge_method: 'S256'" in text
    assert "crypto.subtle.digest('SHA-256'" in text


@then("it checks a random state and keeps the verifier only in session storage")
def step_state(context) -> None:
    text = context.console_text
    assert "crypto.getRandomValues" in text
    assert "sessionStorage.setItem(PKCE_STORAGE_KEY" in text
    assert "state !== expectedState" in text
    assert "localStorage.setItem(PKCE" not in text


@then('the default hosted UI domain prefix is "{prefix}"')
def step_domain_prefix(context, prefix: str) -> None:
    assert f"DEFAULT_COGNITO_DOMAIN = '{prefix}'" in context.console_text
    assert "NEXT_PUBLIC_COGNITO_DOMAIN" in context.console_text


@then("the callback exchange sends the code verifier to the token endpoint")
def step_verifier_sent(context) -> None:
    assert "/oauth2/token" in context.console_text
    assert "code_verifier: verifier" in context.console_text


@then("the callback exchange refuses a state that does not match")
def step_state_refused(context) -> None:
    text = context.console_text
    assert text.index("state !== expectedState") < text.index("/oauth2/token")


@then("it never uses USER_PASSWORD_AUTH or InitiateAuth")
def step_no_password_auth(context) -> None:
    assert "USER_PASSWORD_AUTH" not in context.console_text
    assert "InitiateAuth" not in context.console_text
    assert "PASSWORD" not in context.console_text


@then("it has no simulated development session")
def step_no_simulation(context) -> None:
    text = context.console_text.lower()
    assert "simulated" not in text
    assert "dev-token" not in text
    assert "loginwithcognito" not in text


@then("the console source has no password field anywhere")
def step_no_password_anywhere(context) -> None:
    for path in list((CONSOLE / "app").rglob("*.tsx")) + list(
        (CONSOLE / "components").rglob("*.tsx")
    ):
        assert 'type="password"' not in path.read_text(encoding="utf-8"), path


@then("a 403 answer becomes the message that the person is not an operator yet")
def step_403(context) -> None:
    text = context.console_text
    assert re.search(r"status === 403\) \{[^}]*NOT_OPERATOR_MESSAGE", text, re.S)
    assert "not an operator yet" in _read("lib", "auth.ts")


@then("a 401 answer is still reported as Unauthorized")
def step_401(context) -> None:
    assert re.search(
        r"status === 401\) \{\s*throw new Error\('Unauthorized'\)", context.console_text
    )


@then('a visitor without a stored session is redirected to "{route}"')
def step_redirect(context, route: str) -> None:
    text = context.console_text
    assert "getStoredSession()" in text
    assert f"router.replace('{route}')" in text


@then("the login and callback pages need no session")
def step_open_pages(context) -> None:
    assert "pathname === '/login' || pathname === '/callback'" in context.console_text


@then('signing out clears the stored session and returns to "{route}"')
def step_logout(context, route: str) -> None:
    text = context.console_text
    assert "clearSession();" in text
    assert f"router.push('{route}')" in text
