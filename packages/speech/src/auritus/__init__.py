"""Compatibility alias: ``auritus`` is now :mod:`babulus_speech`.

Existing callers that still ``import auritus`` or ``import auritus.speech``
receive the very same module objects as ``babulus_speech``. Nothing here
carries behaviour of its own.
"""

import importlib
import importlib.abc
import importlib.util
import sys

import babulus_speech

_PREFIX = "auritus."
_TARGET = "babulus_speech."


class _AliasLoader(importlib.abc.Loader):
    """Hand back the already-imported ``babulus_speech`` module unchanged."""

    def __init__(self, real_module):
        self._real_module = real_module

    def create_module(self, spec):
        return self._real_module

    def exec_module(self, module):
        return None

    def get_code(self, fullname):
        """Let ``python -m auritus.<name>`` run the real module's code."""
        real_spec = self._real_module.__spec__
        return real_spec.loader.get_code(real_spec.name)


class _AliasFinder(importlib.abc.MetaPathFinder):
    """Resolve ``auritus.<name>`` to ``babulus_speech.<name>``."""

    def find_spec(self, fullname, path=None, target=None):
        if not fullname.startswith(_PREFIX):
            return None
        real_module = importlib.import_module(_TARGET + fullname[len(_PREFIX) :])
        return importlib.util.spec_from_loader(
            fullname,
            _AliasLoader(real_module),
            origin=real_module.__spec__.origin,
            is_package=hasattr(real_module, "__path__"),
        )


if not any(isinstance(finder, _AliasFinder) for finder in sys.meta_path):
    sys.meta_path.insert(0, _AliasFinder())

__version__ = babulus_speech.__version__
__all__ = list(babulus_speech.__all__)
globals().update({name: getattr(babulus_speech, name) for name in __all__})
