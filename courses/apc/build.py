#!/usr/bin/env python3
"""Build the Algorithms and Programming Concepts slides.

For every topic:
  1. run code/<topic>.py under Python 3.14 (fails loudly if it does not run),
  2. cut the marked regions (# >>> name ... # <<< name) into src/<topic>/snippets/<name>.py,
  3. split the printed output at '=== name ===' lines into snippets/<name>.out,
  4. run latexmk and copy the PDF to slides/.
Usage: ./build.py [topic ...]
"""
import pathlib, re, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent
PY = shutil.which("python3.14") or str(pathlib.Path.home() / ".local/bin/python3.14")
TOPICS = ["searching", "sorting", "bigo", "trees", "graphs", "dp", "optimization"]
NAMES = {t: f"{i:02d}-{t}" for i, t in enumerate(TOPICS, 1)}


def build(topic: str) -> None:
    code = ROOT / "code" / f"{topic}.py"
    src = ROOT / "src" / topic
    snip = src / "snippets"
    shutil.rmtree(snip, ignore_errors=True)
    snip.mkdir(parents=True)
    text = code.read_text()
    for name, body in re.findall(r"^# >>> (\w+)\n(.*?)^# <<< \1\n", text, flags=re.S | re.M):
        (snip / f"{name}.py").write_text(body.rstrip() + "\n")
    res = subprocess.run([PY, str(code)], capture_output=True, text=True, cwd=code.parent)
    if res.returncode != 0:
        sys.exit(f"{topic}: demo failed under {PY}\n{res.stderr}")
    parts = re.split(r"^=== (\w+) ===\n", res.stdout, flags=re.M)
    for name, body in zip(parts[1::2], parts[2::2]):
        (snip / f"{name}.out").write_text(body.rstrip() + "\n")
    subprocess.run(["latexmk", "-pdf", "-interaction=nonstopmode", "-halt-on-error", "main.tex"], cwd=src, check=True,
                   stdout=subprocess.DEVNULL)
    shutil.copy(src / "main.pdf", ROOT / "slides" / f"{NAMES[topic]}.pdf")
    print(f"built slides/{NAMES[topic]}.pdf")


if __name__ == "__main__":
    for t in (sys.argv[1:] or TOPICS):
        build(t)
