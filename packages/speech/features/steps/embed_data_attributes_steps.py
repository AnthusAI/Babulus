"""Behave steps for the embed's data-babulus and data-auritus attributes."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from behave import given, then, when

EMBED_DIR = Path(__file__).resolve().parents[4] / "packages" / "embed"
EXTRACT_SCRIPT = EMBED_DIR / "tests" / "support" / "extract-text.mjs"


def _extract(html: str, root: str) -> dict:
    completed = subprocess.run(
        ["node", str(EXTRACT_SCRIPT)],
        input=json.dumps({"html": html, "root": root}),
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(completed.stdout)


@given("the page article:")
def step_page_article(context) -> None:
    context.page_html = context.text.strip()


@when("the page article is replaced by:")
def step_page_article_replaced(context) -> None:
    context.page_html = context.text.strip()


@when('the embed extracts the narration text from "{root}"')
def step_extract(context, root: str) -> None:
    context.extraction = _extract(context.page_html, root)


@when("I remember the content hash")
def step_remember_hash(context) -> None:
    context.remembered_hash = context.extraction["hash"]


@then('the narration text includes "{expected}"')
def step_text_includes(context, expected: str) -> None:
    assert expected in context.extraction["text"], context.extraction["text"]


@then('the narration text does not include "{unexpected}"')
def step_text_excludes(context, unexpected: str) -> None:
    assert unexpected not in context.extraction["text"], context.extraction["text"]


@then("the narration text includes the break marker")
def step_text_has_break(context) -> None:
    assert "[[auritus:break]]" in context.extraction["text"], context.extraction


@then("the narration text includes the pause marker")
def step_text_has_pause(context) -> None:
    assert "[[auritus:pause]]" in context.extraction["text"], context.extraction


@then("the content hash is the one I remembered")
def step_hash_unchanged(context) -> None:
    assert context.extraction["hash"] == context.remembered_hash
