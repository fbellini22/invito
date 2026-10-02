"""Compatibility entry point for the browser regression suite; sends no real emails."""
from pathlib import Path
import subprocess
import sys
root = Path(__file__).resolve().parents[1]
node = root / '.test-tools' / 'playwright' / 'driver' / 'node.exe'
sys.exit(subprocess.call([str(node), str(root / 'tests' / 'verify.cjs')], cwd=root))
