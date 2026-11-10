#!/usr/bin/env bash
# Build a talk:  ./build.sh keynote-trustworthy-ai   (or healthcare-ai-trust)
set -euo pipefail
cd "$(dirname "$0")/${1:?talk directory}"
latexmk -pdf -interaction=nonstopmode -halt-on-error main.tex
