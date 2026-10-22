from __future__ import annotations

import hashlib
import importlib.metadata
from pathlib import Path
import re
import subprocess
import sys
import sysconfig
import tempfile
import urllib.request

# Keep the historical entry point used by CI, but retire the pip 23 internal patch.
PIP_URL = "https://files.pythonhosted.org/packages/3f/06/3e4420302363fbb71be3c7f35ce042f54bfca330e3e66b3a2e3c4cca579f/pip-26.2.2-py3-none-any.whl"
PIP_SHA256 = "fd7f4dfa8190e014013b9f08f3e973f4e4c26ffd179a204895533a7254813a70"
LEGACY_PTH = "import sys;exec(\"from pip._internal.network.download import Downloader\\nfrom pip._vendor.tenacity import retry, stop_after_attempt\\nDownloader.__call__ = retry(\\n    reraise=True,\\n    stop=stop_after_attempt(5),\\n    after=lambda state: print(f'!!! retry: attempt {state.attempt_number + 1} !!!')\\n)(Downloader.__call__)\\n\")\n"


def main() -> int:
    if sys.prefix == sys.base_prefix or sys.version_info < (3, 10):
        raise RuntimeError("Run this bootstrap in a Python 3.10+ virtual environment")
    target = Path(sysconfig.get_path("purelib")) / "sentry-pip-hack.pth"
    if target.exists():
        if target.read_text() != LEGACY_PTH:
            raise RuntimeError("Preserving an unrecognized sentry-pip-hack.pth; review it first")
        backup = target.with_suffix(".pth.disabled")
        if backup.exists() and backup.read_bytes() != target.read_bytes():
            raise RuntimeError("Preserving an existing different bootstrap backup")
        if not backup.exists():
            backup.write_bytes(target.read_bytes())
        target.unlink()
    version = tuple(
        int(x or 0)
        for x in re.match(r"(\d+)\.(\d+)(?:\.(\d+))?", importlib.metadata.version("pip")).groups()
    )
    if version >= (26, 2, 2):
        return 0
    # Pin the artifact hash so an old CA store cannot substitute executable code.
    with urllib.request.urlopen(PIP_URL, timeout=60) as response:
        wheel = response.read()
    if hashlib.sha256(wheel).hexdigest() != PIP_SHA256:
        raise RuntimeError("pip wheel checksum mismatch")
    with tempfile.TemporaryDirectory(prefix="sentry-secure-pip-") as directory:
        path = Path(directory) / "pip-26.2.2-py3-none-any.whl"
        path.write_bytes(wheel)
        subprocess.check_call(
            [
                sys.executable,
                "-m",
                "pip",
                "install",
                "--no-index",
                "--no-deps",
                "--upgrade",
                str(path),
            ]
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
