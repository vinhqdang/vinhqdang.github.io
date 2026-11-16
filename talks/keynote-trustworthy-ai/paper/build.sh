#!/bin/sh
# Build the keynote paper (Word) following the conference author guidelines.
cd "$(dirname "$0")" && pandoc paper.md --citeproc --reference-doc=reference.docx -o Keynote_Paper_TayDo_2026.docx
