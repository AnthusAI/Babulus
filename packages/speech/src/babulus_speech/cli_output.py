"""Shared output rules for commands meant for people and for agents.

With ``--json`` a command prints exactly one JSON object on standard output:
the result, or ``{"ok": false, "error": ..., "fix": ...}``. Without it, a
failure prints an ``Error:`` line and a ``Fix:`` line on standard error. Either
way a failure exits non-zero and says what to do next.
"""

from __future__ import annotations

import json
from typing import Any, NoReturn

import typer


def succeed(data: dict[str, Any], *, json_output: bool, human: str) -> None:
    """Print a command's result as one JSON object or as human text."""
    if json_output:
        typer.echo(json.dumps({"ok": True, **data}, sort_keys=True))
    else:
        typer.echo(human)


def fail(
    message: str, fix: str, *, json_output: bool, code: int = 1, **extra: Any
) -> NoReturn:
    """Report a failure with the step that fixes it, then exit non-zero."""
    if json_output:
        typer.echo(
            json.dumps(
                {"ok": False, "error": message, "fix": fix, **extra}, sort_keys=True
            )
        )
    else:
        typer.secho(f"Error: {message}", fg=typer.colors.RED, err=True)
        typer.echo(f"Fix: {fix}", err=True)
    raise typer.Exit(code=code)
