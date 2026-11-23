"""Dynamic programming: Fibonacci, coin change and longest common subsequence.

Run with:  python3.14 dp.py
"""
import math
import sys
from bisect import bisect_left
from timeit import timeit


def section(name: str) -> None:
    print(f"=== {name} ===")


# >>> fib_naive
def fib_naive(n):
    if n < 2:
        return n
    return fib_naive(n - 1) + fib_naive(n - 2)
# <<< fib_naive


# >>> fib_memo
from functools import cache


@cache
def fib_memo(n):
    if n < 2:
        return n
    return fib_memo(n - 1) + fib_memo(n - 2)
# <<< fib_memo


# >>> fib_table
def fib_table(n):
    table = [0, 1] + [0] * (n - 1)
    for i in range(2, n + 1):
        table[i] = table[i-1] + table[i-2]
    return table[n]
# <<< fib_table


# >>> coins
INF = float("inf")


def min_coins(coins, amount):
    best = [0] + [INF] * amount
    choice = [0] * (amount + 1)
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and best[a - c] + 1 < best[a]:
                best[a] = best[a - c] + 1
                choice[a] = c
    return best, choice
# <<< coins


# >>> coin_path
def coins_used(choice, amount):
    used = []
    while amount > 0:
        used.append(choice[amount])
        amount -= choice[amount]
    return used
# <<< coin_path


# >>> greedy
def greedy_coins(coins, amount):
    used = []
    for c in sorted(coins, reverse=True):
        while amount >= c:
            used.append(c)
            amount -= c
    return used
# <<< greedy


# >>> lcs
def lcs_table(a, b):
    n, m = len(a), len(b)
    t = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if a[i - 1] == b[j - 1]:
                t[i][j] = t[i - 1][j - 1] + 1
            else:
                up = t[i - 1][j]
                left = t[i][j - 1]
                t[i][j] = max(up, left)
    return t
# <<< lcs


# >>> lcs_trace
def lcs_string(a, b, t):
    i, j, out = len(a), len(b), []
    while i > 0 and j > 0:
        if a[i - 1] == b[j - 1]:
            out.append(a[i - 1])
            i, j = i - 1, j - 1
        elif t[i - 1][j] >= t[i][j - 1]:
            i -= 1
        else:
            j -= 1
    return "".join(reversed(out))
# <<< lcs_trace



# >>> stairs
@cache
def ways(n):
    # steps of 1 or 2 to reach stair n
    if n <= 1:
        return 1
    return ways(n - 1) + ways(n - 2)
# <<< stairs


# >>> edit
def edit_table(a, b):
    n, m = len(a), len(b)
    d = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        d[i][0] = i
    for j in range(m + 1):
        d[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = 0 if a[i-1] == b[j-1] else 1
            d[i][j] = min(d[i-1][j] + 1,
                          d[i][j-1] + 1,
                          d[i-1][j-1] + cost)
    return d
# <<< edit


# >>> edit_ops
def edit_ops(a, b, d):
    i, j = len(a), len(b)
    ops, path = [], [(i, j)]
    while i > 0 or j > 0:
        diag = i and j and d[i][j] == (
            d[i-1][j-1] + (a[i-1] != b[j-1]))
        if diag:
            if a[i-1] != b[j-1]:
                ops.append(a[i-1] + "->" + b[j-1])
            i, j = i - 1, j - 1
        elif i and d[i][j] == d[i-1][j] + 1:
            ops.append(f"del {a[i-1]}")
            i -= 1
        else:
            ops.append(f"ins {b[j-1]}")
            j -= 1
        path.append((i, j))
    return ops[::-1], path
# <<< edit_ops


# >>> grid
def grid_paths(grid):
    rows, cols = len(grid), len(grid[0])
    ways = [[0] * cols for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "#":
                continue
            if r == c == 0:
                ways[r][c] = 1
                continue
            up = ways[r - 1][c] if r else 0
            left = ways[r][c - 1] if c else 0
            ways[r][c] = up + left
    return ways
# <<< grid


# >>> rob
def rob(houses):
    take, skip = 0, 0
    for money in houses:
        take, skip = (skip + money,
                      max(take, skip))
    return max(take, skip)
# <<< rob


# >>> rob_plan
def rob_plan(houses):
    best = [0, houses[0]]
    for i in range(1, len(houses)):
        best.append(max(best[i],
                        best[i-1] + houses[i]))
    i, picks = len(houses), []
    while i > 0:
        if best[i] == best[i - 1]:
            i -= 1
        else:
            picks.append(i - 1)
            i -= 2
    return best, picks[::-1]
# <<< rob_plan


# >>> lis_n2
def lis_n2(a):
    best = [1] * len(a)
    prev = [-1] * len(a)
    for i in range(len(a)):
        for j in range(i):
            if a[j] < a[i] and best[j] >= best[i]:
                best[i] = best[j] + 1
                prev[i] = j
    i = max(range(len(a)), key=best.__getitem__)
    out = []
    while i >= 0:
        out.append(a[i])
        i = prev[i]
    return best, out[::-1]
# <<< lis_n2


# >>> lis_fast
from bisect import bisect_left


def lis_length(a):
    tails = []
    for x in a:
        k = bisect_left(tails, x)
        if k == len(tails):
            tails.append(x)
        else:
            tails[k] = x
    return len(tails)
# <<< lis_fast


# >>> knap_table
def knap_table(items, cap):
    n = len(items)
    t = [[0] * (cap + 1) for _ in range(n + 1)]
    for i, (w, v) in enumerate(items, 1):
        for c in range(cap + 1):
            t[i][c] = t[i - 1][c]
            if w <= c:
                t[i][c] = max(t[i][c],
                              t[i-1][c-w] + v)
    return t
# <<< knap_table


# >>> knap_pick
def knap_pick(items, t):
    c, picks = len(t[0]) - 1, []
    for i in range(len(items), 0, -1):
        if t[i][c] != t[i - 1][c]:
            picks.append(i)
            c -= items[i - 1][0]
    return picks[::-1]
# <<< knap_pick


# >>> partition
def can_partition(nums):
    total = sum(nums)
    if total % 2:
        return False
    reach = 1   # bit s set: sum s possible
    for x in nums:
        reach |= reach << x
    return bool(reach >> (total // 2) & 1)
# <<< partition


# >>> word_break
def word_break(s, words):
    cut = {0: None}
    for i in range(1, len(s) + 1):
        for w in words:
            j = i - len(w)
            if j in cut and s[j:i] == w:
                cut[i] = j
                break
    if len(s) not in cut:
        return None
    out, i = [], len(s)
    while i > 0:
        out.append(s[cut[i]:i])
        i = cut[i]
    return out[::-1]
# <<< word_break


# ---------- figure helpers (not shown on slides) ----------
def tikz_grid(rows, top=None, left=None, fill=None, path=(), arrows=(),
              cw=6.6, ch=5.4, size=r"\scriptsize", bend=40):
    """Print a TikZ table: rows of values, optional labels, fills, arrows."""
    fill = fill or {}
    print(r"\begin{tikzpicture}")
    for j, t in enumerate(top or []):
        print(rf"\node[font=\tiny\bfseries,text=tdBlue] at ({j*cw:.1f}mm,{ch*0.95:.1f}mm) {{{t}}};")
    for i, t in enumerate(left or []):
        print(rf"\node[font=\tiny\bfseries,text=tdBlue,anchor=east] at ({-cw*0.6:.1f}mm,{-i*ch:.1f}mm) {{{t}}};")
    for i, row in enumerate(rows):
        for j, v in enumerate(row):
            txt = "" if v is None else str(v).replace("#", r"\#")
            col = fill.get((i, j), "white")
            print(rf"\node[cell,minimum width={cw:.1f}mm,minimum height={ch:.1f}mm,font={size}\ttfamily,fill={col}] (c{i}x{j}) at ({j*cw:.1f}mm,{-i*ch:.1f}mm) {{{txt}}};")
    for a, b in zip(path, path[1:]):
        print(rf"\draw[tdAmber!80!black,very thick,->,shorten >=1.5pt,shorten <=1.5pt] (c{a[0]}x{a[1]}) -- (c{b[0]}x{b[1]});")
    for a, b, colr in arrows:
        print(rf"\draw[{colr},thick,->,shorten >=1pt,shorten <=1pt] (c{a[0]}x{a[1]}.north) to[bend left=40] (c{b[0]}x{b[1]}.north);")
    print(r"\end{tikzpicture}")


def coin_fig(coins, upto, target=None):
    best, choice = min_coins(coins, 11)
    row = [str(best[a]) if a <= upto else None for a in range(12)]
    fill, arrows = {}, []
    if target is not None:
        fill[(0, target)] = "tdAmber!45"
        for c in coins:
            if c <= target:
                win = best[target - c] + 1 == best[target]
                fill[(0, target - c)] = "tdGreen!35" if win else "tdBlue!14"
                arrows.append(((0, target), (0, target - c),
                               "tdGreen!70!black" if win else "tdBlue!60"))
    tikz_grid([row], top=range(12), left=["best"], fill=fill, arrows=arrows,
              cw=8.2, ch=6.2, size=r"\small")


def lcs_fig(a, b, upto=None, cur=None, trace=False):
    t = lcs_table(a, b)
    n, m = len(a), len(b)
    rows = [[None if (upto is not None and i * (m + 1) + j > upto) else str(t[i][j])
             for j in range(m + 1)] for i in range(n + 1)]
    fill, path = {}, []
    if cur:
        fill[cur] = "tdAmber!45"
        i, j = cur
        if a[i-1] == b[j-1]:
            fill[(i-1, j-1)] = "tdGreen!35"
        else:
            fill[(i-1, j)] = fill[(i, j-1)] = "tdBlue!14"
    if trace:
        i, j = n, m
        path = [(i, j)]
        while i > 0 and j > 0:
            if a[i-1] == b[j-1]:
                fill[(i, j)] = "tdGreen!40"
                i, j = i - 1, j - 1
            elif t[i-1][j] >= t[i][j-1]:
                i -= 1
            else:
                j -= 1
            path.append((i, j))
    tikz_grid(rows, top=[""] + list(b), left=[""] + list(a), fill=fill,
              path=path, cw=6.4, ch=5.2)


def count_calls(n):
    calls = 0

    def f(k):
        nonlocal calls
        calls += 1
        return k if k < 2 else f(k - 1) + f(k - 2)

    f(n)
    return calls


def memo_trace(n):
    seen, log = set(), []

    def f(k, depth):
        hit = k in seen
        log.append("  " * depth + f"fib({k})" + ("  hit" if hit else ""))
        if hit:
            return
        seen.add(k)
        if k >= 2:
            f(k - 1, depth + 1)
            f(k - 2, depth + 1)

    f(n, 0)
    return log


def main() -> None:
    section("version")
    print(f"Python {sys.version.split()[0]}")

    section("fib_calls")
    for n in (10, 20, 30):
        print(f"fib({n}) makes {count_calls(n):>9,} calls")

    section("memo_demo")
    print("fib_memo(30) =", fib_memo(30))
    info = fib_memo.cache_info()
    print("cache hits:", info.hits, "misses:", info.misses)
    print("fib_memo(100) =", fib_memo(100))

    section("memo_trace")
    log = memo_trace(5)
    print(*log, sep="\n")
    print(f"{len(log)} calls, {sum('hit' in x for x in log)} cache hits")

    section("table_demo")
    print("fib_table(100) =", fib_table(100))

    section("fib_timing")
    n = 32
    t_naive = timeit(lambda: fib_naive(n), number=1)
    fib_memo.cache_clear()
    t_memo = timeit(lambda: fib_memo(n), number=1)
    t_table = timeit(lambda: fib_table(n), number=1000) / 1000
    print(f"n = {n}")
    print(f"naive recursion : {t_naive * 1e3:10.2f} ms")
    print(f"memoised        : {t_memo * 1e6:10.1f} us")
    print(f"table           : {t_table * 1e6:10.2f} us")

    section("stairs_demo")
    print("ways:", *[ways(n) for n in range(10)])
    print("ways(50) =", ways(50))

    section("fig_stairs")
    tikz_grid([[str(ways(n)) for n in range(8)]], top=range(8), left=["ways"],
              fill={(0, 7): "tdAmber!45", (0, 6): "tdBlue!14", (0, 5): "tdBlue!14"},
              arrows=[((0, 7), (0, 6), "tdBlue!70"), ((0, 7), (0, 5), "tdBlue!70")],
              cw=9, ch=6.4, size=r"\small")

    section("coin_demo")
    best, choice = min_coins([1, 2, 5], 11)
    print("best  :", *best)
    print("answer:", best[11], "coins:", *coins_used(choice, 11))

    section("fig_coin1")
    coin_fig([1, 2, 5], 3)
    section("fig_coin2")
    coin_fig([1, 2, 5], 5, 6)
    section("fig_coin3")
    coin_fig([1, 2, 5], 11, 11)

    section("coin_greedy")
    coins, amount = [1, 3, 4], 6
    g = greedy_coins(coins, amount)
    best, choice = min_coins(coins, amount)
    d = coins_used(choice, amount)
    print(f"coins {coins}, amount {amount}")
    print(f"greedy: {len(g)} coins", g)
    print(f"DP    : {best[amount]} coins", d)

    a, b = "ABCBDAB", "BDCABA"
    t = lcs_table(a, b)
    section("lcs_demo")
    print("length:", t[len(a)][len(b)])
    print("one LCS:", lcs_string(a, b, t))
    for row in t:
        print(*row)

    section("fig_lcs1")
    lcs_fig(a, b, upto=3 * 7 + 3, cur=(3, 3))
    section("fig_lcs2")
    lcs_fig(a, b, trace=True)

    section("edit_demo")
    for x, y in (("kitten", "sitting"), ("sunday", "saturday"), ("", "abc")):
        d = edit_table(x, y)
        ops, _ = edit_ops(x, y, d)
        print(f"{x}->{y}: {d[-1][-1]}", ",".join(ops))

    section("fig_edit")
    x, y = "kitten", "sitting"
    d = edit_table(x, y)
    _, path = edit_ops(x, y, d)
    tikz_grid([[str(v) for v in r] for r in d], top=[""] + list(y), left=[""] + list(x),
              fill={p: "tdAmber!40" for p in path}, path=path, cw=6.4, ch=5.2)

    section("grid_demo")
    world = ["....#",
             ".#...",
             "...#.",
             "#...."]
    w = grid_paths(world)
    for r in w:
        print(*r)
    print("paths:", w[-1][-1])
    print("no obstacles 4x5:", math.comb(3 + 4, 3))

    section("fig_grid")
    rows = [["#" if world[r][c] == "#" else str(w[r][c]) for c in range(5)] for r in range(4)]
    fill = {(r, c): "tdInk!55" for r in range(4) for c in range(5) if world[r][c] == "#"}
    fill[(0, 0)] = "tdBlue!15"
    fill[(3, 4)] = "tdGreen!35"
    tikz_grid(rows, fill=fill, cw=9, ch=7.2, size=r"\small")

    section("rob_demo")
    houses = [2, 7, 9, 3, 1, 8, 4]
    best, picks = rob_plan(houses)
    print("houses:", houses)
    print("best  :", best[1:])
    print("rob(houses) =", rob(houses))
    print("houses robbed:", picks, [houses[i] for i in picks])

    section("fig_rob")
    tikz_grid([[str(v) for v in houses], [str(v) for v in best[1:]]], top=range(len(houses)),
              left=["money", "best"],
              fill={(0, i): "tdGreen!35" for i in picks} | {(1, i): "tdGreen!35" for i in picks},
              cw=9, ch=6.4, size=r"\small")

    section("lis_demo")
    seq = [10, 9, 2, 5, 3, 7, 101, 18]
    bst, lis = lis_n2(seq)
    print("seq :", seq)
    print("best:", bst)
    print("LIS :", lis, "length", len(lis))
    print("fast:", lis_length(seq))

    section("lis_tails")
    tails = []
    for x in seq:
        k = bisect_left(tails, x)
        tails[k:k + 1] = [x]
        print(f"x={x:>3}  tails={tails}")

    section("fig_lis")
    pos = [seq.index(v) for v in lis]    # values are distinct
    tikz_grid([[str(v) for v in seq], [str(v) for v in bst]], top=range(len(seq)),
              left=["a", "best"],
              fill={(r, i): "tdGreen!35" for r in (0, 1) for i in pos},
              arrows=[((1, pos[k2 + 1]), (1, pos[k2]), "tdGreen!70!black") for k2 in range(len(pos) - 1)],
              cw=9, ch=6.4, size=r"\small")

    section("knap01_demo")
    its = [(1, 1), (3, 4), (4, 5), (5, 7)]
    kt = knap_table(its, 7)
    for r in kt:
        print(*r)
    picks = knap_pick(its, kt)
    print("best value:", kt[-1][-1])
    print("items:", picks, "weights", [its[i - 1][0] for i in picks])

    section("fig_knap")
    c, ipath = 7, [(len(its), 7)]
    fillk = {}
    for i in range(len(its), 0, -1):
        if kt[i][c] != kt[i - 1][c]:
            fillk[(i, c)] = "tdGreen!40"
            c -= its[i - 1][0]
        ipath.append((i - 1, c))
    for p in ipath:
        fillk.setdefault(p, "tdAmber!30")
    tikz_grid([[str(v) for v in r] for r in kt], top=range(8),
              left=["none"] + [f"w{w_}v{v_}" for w_, v_ in its],
              fill=fillk, path=ipath, cw=8, ch=5.6)

    section("part_demo")
    for nums in ([1, 5, 11, 5], [1, 2, 3, 5], [3, 3, 3, 4, 5]):
        print(f"{nums!s:<16}sum {sum(nums):>2} ->", can_partition(nums))

    section("fig_part")
    nums = [1, 5, 11, 5]
    tgt = sum(nums) // 2
    reach, rowsp = 1, [1]
    for x in nums:
        reach |= reach << x
        rowsp.append(reach)
    cells = [[str(rb >> s & 1) for s in range(tgt + 1)] for rb in rowsp]
    fillp = {(r, s): "tdGreen!35" for r in range(len(rowsp)) for s in range(tgt + 1)
             if rowsp[r] >> s & 1}
    fillp[(len(rowsp) - 1, tgt)] = "tdAmber!55"
    tikz_grid(cells, top=range(tgt + 1), left=["start"] + [f"+{x}" for x in nums],
              fill=fillp, cw=7, ch=5.6)

    section("wb_demo")
    words = ["cat", "cats", "and", "sand", "dog"]
    for s in ("catsanddog", "catsandog", "dogcats"):
        print(f"{s:<11}->", word_break(s, words))

    section("fig_wb")
    s = "catsanddog"
    cutd = {0}
    for i in range(1, len(s) + 1):
        if any(i - len(w_) in cutd and s[i - len(w_):i] == w_ for w_ in words):
            cutd.add(i)
    tikz_grid([["T" if i in cutd else "." for i in range(len(s) + 1)]],
              top=[""] + list(s), left=["cut ok"],
              fill={(0, i): "tdGreen!35" for i in cutd}, cw=7.4, ch=6, size=r"\small")


if __name__ == "__main__":
    main()
