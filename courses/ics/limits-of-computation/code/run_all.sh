#!/bin/sh
# Regenerates every demo output used on the slides (Python 3.14).
cd "$(dirname "$0")" || exit 1
PY=${PY:-$HOME/.local/bin/python3.14}
for f in montecarlo tm tmcost halting collatz growth sat satphase verify factor brute; do
  "$PY" "$f.py" > "../out/$f.txt" 2>&1
done
"$PY" --version > ../out/pyversion.txt 2>&1
