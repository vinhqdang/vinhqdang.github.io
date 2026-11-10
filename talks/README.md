# Talks (Beamer sources)

| Folder | Talk |
|---|---|
| `keynote-trustworthy-ai/` | Keynote, Tay Do University, 15 Dec 2026: *Trustworthy AI for Smart Systems* (28 slides) |
| `healthcare-ai-trust/` | *Towards Trustworthy Healthcare AI* (23 slides) |
| `common/` | shared preamble (Metropolis theme), bibliography (`refs.bib`, `own.bib`), illustrative-figure data |

Build (needs TeX Live with Beamer, TikZ, pgfplots, biblatex/biber, Fira Sans):

    ./build.sh keynote-trustworthy-ai
    ./build.sh healthcare-ai-trust

Every claim, number and chart is sourced on the slide itself (footnote citations). Figures marked *illustrative*
or *simulated* are teaching illustrations, not results. `own.bib` is generated from the site's publication list.
Compiled PDFs are git-ignored until the slides are approved for publication.
