"""auritus worker command (local GPU daemon)."""

from __future__ import annotations

import typer

from babulus_speech.worker.daemon import run_worker


def register(app: typer.Typer) -> None:
    """Attach ``worker`` as a top-level command (avoids Typer callback Option quirks)."""

    @app.command("worker")
    def worker(
        once: bool = typer.Option(
            False,
            "--once",
            help="Claim and process at most one job",
            flag_value=True,
        ),
        video: bool = typer.Option(
            None,
            "--video/--no-video",
            help=(
                "Take video jobs (needs Node, the toolchain and Chromium). "
                "Default: take them when this machine is set up for it."
            ),
        ),
        json_output: bool = typer.Option(
            False, "--json", help="Print events as one JSON object per line."
        ),
    ) -> None:
        """Claim speech and video jobs, run them locally, upload, mark done."""
        run_worker(once=bool(once), video=video, json_output=bool(json_output))
