#!/usr/bin/env python3
"""Build the Computational Intelligence slides (week 'What is AI?').

1. run every code/*.py under Python 3.14 (fails loudly),
2. cut marked regions (# >>> name ... # <<< name) into snippets/<script>_<name>.py,
3. split printed output at '=== name ===' lines into snippets/<script>_<name>.out,
4. run latexmk and copy the PDF to ../slides/.
"""
import pathlib, re, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent
PY = shutil.which("python3.14") or str(pathlib.Path.home() / ".local/bin/python3.14")
OUT = ROOT.parent / "slides" / "computational-intelligence-ai-intelligence-minds.pdf"

snip = ROOT / "snippets"
shutil.rmtree(snip, ignore_errors=True)
snip.mkdir()
for code in sorted((ROOT / "code").glob("*.py")):
    text = code.read_text()
    for name, body in re.findall(r"^\s*# >>> (\w+)\n(.*?)^\s*# <<< \1\n", text, flags=re.S | re.M):
        lines = body.rstrip().splitlines()
        indent = min(len(l) - len(l.lstrip()) for l in lines if l.strip())
        (snip / f"{code.stem}_{name}.py").write_text("\n".join(l[indent:] for l in lines) + "\n")
    res = subprocess.run([PY, str(code)], capture_output=True, text=True, cwd=code.parent)
    if res.returncode != 0:
        sys.exit(f"{code.name} failed under {PY}\n{res.stderr}")
    parts = re.split(r"^=== (\w+) ===\n", res.stdout, flags=re.M)
    for name, body in zip(parts[1::2], parts[2::2]):
        (snip / f"{code.stem}_{name}.out").write_text(body.rstrip() + "\n")
subprocess.run(["latexmk", "-pdf", "-interaction=nonstopmode", "-halt-on-error", "main.tex"], cwd=ROOT, check=True,
               stdout=subprocess.DEVNULL)
OUT.parent.mkdir(exist_ok=True)
shutil.copy(ROOT / "main.pdf", OUT)
print("built", OUT)
