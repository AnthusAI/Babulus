"""babulus login, logout and whoami: sign in to a Studio through ``cli-login``."""

from __future__ import annotations

import typer

from babulus_speech.cli_session import (
    AuthError,
    StudioSession,
    load_login,
    resolve_login,
    save_login,
)


def _fail(exc: Exception) -> typer.Exit:
    typer.secho(str(exc), fg=typer.colors.RED, err=True)
    return typer.Exit(code=1)


def login(
    site: str | None = typer.Argument(
        None,
        help="Your Studio's host name (for example studio.example.test). Omit to sign in again to the last one.",
    ),
    remote: bool = typer.Option(
        False,
        "--remote",
        help="Sign in from a machine with no browser: approve on another device with a short matching code.",
    ),
    expect_email: str | None = typer.Option(
        None,
        "--expect-email",
        help="With --remote: refuse, and store nothing, if anyone else approves.",
    ),
) -> None:
    """Sign in with Google. Opens your browser, or prints an approval link with --remote."""
    if expect_email and not remote:
        typer.secho(
            "--expect-email only applies with --remote.", fg=typer.colors.RED, err=True
        )
        raise typer.Exit(code=2)
    try:
        studio = resolve_login(site)
        session = StudioSession(studio)
        if remote:
            options = {"expected_email": expect_email} if expect_email else {}
            result = session.login_remote(out=typer.echo, **options)
        else:
            result = session.login()
        save_login(studio)
    except AuthError as exc:
        raise _fail(exc) from exc
    typer.secho(f"Signed in as {result['label']}.", fg=typer.colors.GREEN)


def logout_cmd() -> None:
    """Sign out: revoke the session where reachable and remove it from the secure store."""
    try:
        studio = load_login()
        if studio is None:
            typer.echo("Not signed in.")
            return
        result = StudioSession(studio).logout()
    except AuthError as exc:
        raise _fail(exc) from exc
    typer.secho("Signed out on this machine.", fg=typer.colors.GREEN)
    if result["remote_revocation"] == "unconfirmed":
        typer.secho(
            "The sign-in provider could not be reached, so the session was not revoked there.",
            fg=typer.colors.YELLOW,
            err=True,
        )


def whoami_cmd() -> None:
    """Show who this machine is signed in as. Prints no token."""
    try:
        studio = load_login()
        if studio is None:
            typer.echo("Not signed in. Run `babulus login <studio>`.")
            raise typer.Exit(code=1)
        status = StudioSession(studio).status()
    except AuthError as exc:
        raise _fail(exc) from exc
    if not status.get("signed_in"):
        typer.echo(
            f"Not signed in to {studio.host}. Run `babulus login {studio.host}`."
        )
        raise typer.Exit(code=1)
    elapsed = int(status.get("elapsed_session_seconds") or 0)
    typer.echo(
        f"{status['label']} at {studio.host} (signed in {elapsed // 3600} hours ago)"
    )
