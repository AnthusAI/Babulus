"""A fake ``aws`` command for running the infra shell scripts without AWS.

``install`` writes executable stand-ins for ``aws``, ``gh`` and ``git`` into a
temporary directory that goes first on ``PATH``. The fake ``aws`` keeps the
account's state in a JSON file, appends every call to a log (arguments and, for
``file://`` arguments, the file's content and permission bits at call time),
and answers only the calls the scripts make. Nothing reaches the network.
"""

from __future__ import annotations

import json
import os
import stat
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

FAKE_AWS = r"""#!__PYTHON__
import json, os, stat, sys

state_path = os.environ["FAKE_AWS_STATE"]
log_path = os.environ["FAKE_AWS_LOG"]
with open(state_path) as handle:
    state = json.load(handle)
argv = sys.argv[1:]

received = []
for argument in argv:
    if argument.startswith("file://"):
        path = argument[len("file://"):]
        with open(path) as handle:
            received.append(
                {
                    "path": path,
                    "content": handle.read(),
                    "mode": stat.S_IMODE(os.stat(path).st_mode),
                }
            )
with open(log_path, "a") as handle:
    handle.write(json.dumps({"argv": argv, "files": received}) + "\n")


def save():
    with open(state_path, "w") as handle:
        json.dump(state, handle)


def option(name):
    return argv[argv.index(name) + 1] if name in argv else None


def fail(code, message):
    sys.stderr.write("An error occurred (" + code + ") when calling the operation: " + message + "\n")
    sys.exit(254)


service, command = argv[0], argv[1]

if (service, command) == ("sts", "get-caller-identity"):
    print(state["account"])
elif service == "secretsmanager":
    secrets = state["secrets"]
    if command == "describe-secret":
        name = option("--secret-id")
        if name not in secrets:
            fail("ResourceNotFoundException", "Secrets Manager can't find the specified secret.")
        print(secrets[name]["arn"])
    elif command == "create-secret":
        name = option("--name")
        secrets[name] = {"arn": "arn:aws:secretsmanager:us-east-1:" + state["account"] + ":secret:" + name + "-AbCdEf", "value": received[0]["content"]}
        save()
        print(secrets[name]["arn"])
    elif command == "put-secret-value":
        secrets[option("--secret-id")]["value"] = received[0]["content"]
        save()
elif service == "ssm":
    if command == "get-parameter":
        if state.get("context") is None:
            fail("ParameterNotFound", "Parameter not found.")
        print(state["context"])
    elif command == "put-parameter":
        state["context"] = received[0]["content"]
        save()
elif service == "cognito-idp":
    pool = option("--user-pool-id")
    if command == "list-user-pools":
        if option("--query").startswith("UserPools[?"):
            matches = [p["Id"] for p in state["pools"] if p["Name"].startswith("BabulusUserPool")]
            print(matches[0] if matches else "None")
        else:
            print("pool-stub")
    elif command == "get-group":
        if option("--group-name") not in state["groups"].get(pool, []):
            fail("ResourceNotFoundException", "Group not found.")
    elif command == "create-group":
        state["groups"].setdefault(pool, []).append(option("--group-name"))
        save()
    elif command == "list-users":
        wanted = option("--filter").split('"')[1]
        matches = [u["Username"] for u in state["users"] if u["email"] == wanted]
        print(matches[0] if matches else "None")
    elif command == "admin-add-user-to-group":
        state["members"].append(option("--username"))
        save()
    elif command == "admin-remove-user-from-group":
        state["members"].remove(option("--username"))
        save()
elif service == "iam":
    print("arn:aws:iam::" + state["account"] + ":oidc-provider/token.actions.githubusercontent.com")
elif service == "cloudfront":
    print("DISTSTUB")
elif service == "cloudformation":
    if command == "describe-stack-resource":
        print("stub-bootstrap-bucket")
    elif command == "describe-stacks":
        fail("ValidationError", "Stack does not exist")
    elif command == "describe-change-set":
        query = option("--query")
        print("CREATE_COMPLETE" if query == "Status" else "None")
"""

FAKE_GH = """#!/bin/sh
echo 1
"""

FAKE_GIT = """#!/bin/sh
# Answers only what bootstrap.sh asks of git.
case "$3" in
  rev-parse) echo "$FAKE_REPO_ROOT" ;;
  show) echo "Description: stub template" ;;
esac
"""


@dataclass
class FakeAws:
    """A temporary fake AWS account and the means to run a script against it."""

    root: Path
    state_path: Path
    log_path: Path
    account: str

    def state(self) -> dict[str, Any]:
        """Return the fake account's current state."""
        return json.loads(self.state_path.read_text(encoding="utf-8"))

    def calls(self) -> list[dict[str, Any]]:
        """Return every ``aws`` call so far: its arguments and file arguments."""
        if not self.log_path.exists():
            return []
        lines = self.log_path.read_text(encoding="utf-8").splitlines()
        return [json.loads(line) for line in lines]

    def calls_to(self, service: str, command: str) -> list[dict[str, Any]]:
        """Return the calls to one ``aws <service> <command>``."""
        return [c for c in self.calls() if _is(c, service, command)]

    def run(
        self, script: Path, arguments: list[str], stdin: str = ""
    ) -> subprocess.CompletedProcess:
        """Run a script with the fakes first on ``PATH``.

        :param script: The shell script to run.
        :param arguments: Its command line arguments.
        :param stdin: Text fed to its standard input.
        :returns: The finished process, output captured as text.
        """
        environment = {
            "PATH": f"{self.root / 'bin'}{os.pathsep}{os.environ['PATH']}",
            "HOME": str(self.root),
            "FAKE_AWS_STATE": str(self.state_path),
            "FAKE_AWS_LOG": str(self.log_path),
            "FAKE_REPO_ROOT": str(self.root),
            "AWS_PROFILE": "spec-profile",
            "TMPDIR": str(self.root / "tmp"),
        }
        return subprocess.run(
            ["bash", str(script), *arguments],
            input=stdin,
            capture_output=True,
            text=True,
            env=environment,
            cwd=str(self.root),
            timeout=60,
        )


def _is(call: dict[str, Any], service: str, command: str) -> bool:
    return call["argv"][:2] == [service, command]


def install(
    account: str,
    *,
    context_json: str | None = None,
    secrets: dict[str, dict[str, str]] | None = None,
    pools: list[dict[str, str]] | None = None,
    users: list[dict[str, str]] | None = None,
    groups: dict[str, list[str]] | None = None,
) -> FakeAws:
    """Create a fake AWS account in a new temporary directory.

    :param account: The account id ``sts get-caller-identity`` reports.
    :param context_json: The deploy-context parameter's value, or None when unset.
    :param secrets: Existing secrets by name, each ``{"arn", "value"}``.
    :param pools: User pools as ``{"Name", "Id"}``.
    :param users: Pool users as ``{"Username", "email"}``.
    :param groups: Existing groups by pool id.
    :returns: The fake account.
    """
    root = Path(tempfile.mkdtemp(prefix="fake-aws-"))
    (root / "bin").mkdir()
    (root / "tmp").mkdir()
    for name, text in (
        ("aws", FAKE_AWS.replace("__PYTHON__", sys.executable)),
        ("gh", FAKE_GH),
        ("git", FAKE_GIT),
    ):
        path = root / "bin" / name
        path.write_text(text, encoding="utf-8")
        path.chmod(path.stat().st_mode | stat.S_IXUSR)
    state_path = root / "state.json"
    state_path.write_text(
        json.dumps(
            {
                "account": account,
                "context": context_json,
                "secrets": secrets or {},
                "pools": pools or [],
                "users": users or [],
                "groups": groups or {},
                "members": [],
            }
        ),
        encoding="utf-8",
    )
    return FakeAws(root, state_path, root / "calls.jsonl", account)
