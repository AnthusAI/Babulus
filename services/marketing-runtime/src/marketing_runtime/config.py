import os


def get_env(name: str, default: str | None = None) -> str:
    value = os.getenv(name, default)
    if value is None or value == "":
        raise RuntimeError(f"Missing required env var: {name}")
    return value


def get_optional_env(name: str, default: str | None = None) -> str | None:
    value = os.getenv(name, default)
    return value if value not in (None, "") else default
