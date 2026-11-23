# A tiny Turing machine simulator.
def run(rules, tape, state="q0", blank="_",
        show=False, limit=500):
    t = dict(enumerate(tape)); h = 0; n = 0
    while state not in ("halt", "reject"):
        s = t.get(h, blank)
        w, d, state = rules[(state, s)]
        t[h] = w; h += 1 if d == "R" else -1
        n += 1
        if show:
            print(n, state, "".join(
                t.get(i, blank) for i in
                range(min(t), max(t) + 1)))
        if n > limit: return None, n, "limit"
    out = "".join(t[i] for i in sorted(t))
    return out.strip(blank), n, state

# Binary increment: go right, then carry left.
inc = {
 ("q0","0"):("0","R","q0"),
 ("q0","1"):("1","R","q0"),
 ("q0","_"):("_","L","q1"),
 ("q1","1"):("0","L","q1"),
 ("q1","0"):("1","L","halt"),
 ("q1","_"):("1","L","halt")}

# Palindrome over {a,b}: erase ends, compare.
pal = {
 ("q0","a"):("_","R","qa"),
 ("q0","b"):("_","R","qb"),
 ("q0","_"):("_","R","halt"),
 ("qa","a"):("a","R","qa"),
 ("qa","b"):("b","R","qa"),
 ("qa","_"):("_","L","ca"),
 ("qb","a"):("a","R","qb"),
 ("qb","b"):("b","R","qb"),
 ("qb","_"):("_","L","cb"),
 ("ca","a"):("_","L","back"),
 ("ca","_"):("_","L","halt"),
 ("ca","b"):("b","L","reject"),
 ("cb","b"):("_","L","back"),
 ("cb","_"):("_","L","halt"),
 ("cb","a"):("a","L","reject"),
 ("back","a"):("a","L","back"),
 ("back","b"):("b","L","back"),
 ("back","_"):("_","R","q0")}

if __name__ == "__main__":
    print("increment 1011 (=11):")
    print(run(inc, "1011", show=True))
    for x in ["0", "111", "1011"]:
        print(x, "->", run(inc, x)[0])
    for w in ["abba", "abab", "aba", ""]:
        r = run(pal, w)
        print(repr(w), r[2], "steps", r[1])
