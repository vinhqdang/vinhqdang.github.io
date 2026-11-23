"""Optimization: knapsack, scheduling, LP, hill climbing, annealing, genetic
algorithms, gradient descent, TSP and hyper-parameter search.

Run with:  python3.14 optimization.py
"""
import math
import random
import sys
from bisect import bisect_right
from itertools import combinations, pairwise, permutations
from timeit import timeit


def section(name: str) -> None:
    print(f"=== {name} ===")


# >>> knap_items
# (name, weight, value)
items = [("A", 10, 60), ("B", 20, 100),
         ("C", 30, 120)]
capacity = 50
# <<< knap_items


# >>> knap_brute
def knapsack_brute(items, capacity):
    best, pick = 0, ()
    for r in range(len(items) + 1):
        for combo in combinations(items, r):
            weight = sum(w for _, w, _ in combo)
            value = sum(v for _, _, v in combo)
            if weight <= capacity and value > best:
                best, pick = value, combo
    return best, [name for name, _, _ in pick]
# <<< knap_brute


# >>> knap_greedy
def ratio(item):
    return item[2] / item[1]


def knapsack_greedy(items, capacity):
    best, pick, room = 0, [], capacity
    ranked = sorted(items, key=ratio,
                    reverse=True)
    for name, w, v in ranked:
        if w <= room:
            room -= w
            best += v
            pick.append(name)
    return best, pick
# <<< knap_greedy


# >>> knap_dp
def knapsack_dp(items, capacity):
    best = [0] * (capacity + 1)
    for _, w, v in items:
        for c in range(capacity, w - 1, -1):
            best[c] = max(best[c],
                          best[c - w] + v)
    return best[capacity]
# <<< knap_dp


# >>> knap_table
def knapsack_items(items, cap):
    n = len(items)
    t = [[0] * (cap + 1) for _ in range(n + 1)]
    for i, (_, w, v) in enumerate(items, 1):
        for c in range(cap + 1):
            t[i][c] = t[i - 1][c]
            if w <= c:
                t[i][c] = max(t[i][c],
                              t[i-1][c-w] + v)
    return t
# <<< knap_table


# >>> knap_recover
def chosen_items(items, t):
    c, chosen = len(t[0]) - 1, []
    for i in range(len(items), 0, -1):
        if t[i][c] != t[i - 1][c]:
            name, w, _ = items[i - 1]
            chosen.append(name)
            c -= w
    return chosen[::-1]
# <<< knap_recover


# >>> act_greedy
def pick_by_finish(jobs):
    chosen, free_at = [], 0
    for s, e in sorted(jobs, key=lambda j: j[1]):
        if s >= free_at:
            chosen.append((s, e))
            free_at = e
    return chosen
# <<< act_greedy


# >>> act_exact
def disjoint(combo):
    ordered = sorted(combo)
    return all(a[1] <= b[0]
               for a, b in pairwise(ordered))


def best_exact(jobs):
    top = 0
    for r in range(len(jobs) + 1):
        for combo in combinations(jobs, r):
            if disjoint(combo):
                total = sum(j[2] for j in combo)
                top = max(top, total)
    return top
# <<< act_exact


# >>> act_weight
def pick_by_weight(jobs):
    chosen = []
    for job in sorted(jobs, key=lambda j: -j[2]):
        if disjoint(chosen + [job]):
            chosen.append(job)
    return chosen
# <<< act_weight


# >>> act_dp
def best_weight(jobs):
    jobs = sorted(jobs, key=lambda j: j[1])
    ends = [e for _, e, _ in jobs]
    best = [0]
    for k, (s, e, w) in enumerate(jobs):
        j = bisect_right(ends, s, 0, k)
        best.append(max(best[-1], best[j] + w))
    return best[-1]
# <<< act_dp


# >>> lp
# rules (a, b, c) mean: a*x + b*y <= c
rules = [(1, 1, 4), (1, 3, 7), (1, 0, 3),
         (-1, 0, 0), (0, -1, 0)]


def corner(r1, r2):
    (a1, b1, c1), (a2, b2, c2) = r1, r2
    det = a1 * b2 - a2 * b1
    if det == 0:
        return None
    return ((c1 * b2 - c2 * b1) / det,
            (a1 * c2 - a2 * c1) / det)


def allowed(p):
    return all(a * p[0] + b * p[1] <= c + 1e-9
               for a, b, c in rules)
# <<< lp


# >>> lp_solve
def solve_lp(profit):
    corners = [p for r1, r2 in combinations(rules, 2)
               if (p := corner(r1, r2)) and allowed(p)]
    best = max(corners, key=lambda p:
               profit[0] * p[0] + profit[1] * p[1])
    return best, corners
# <<< lp_solve


# >>> hill
def f(x):
    return x * math.sin(x)


def hill_climb(f, x, step=0.01):
    while True:
        moves = [x - step, x + step]
        moves = [m for m in moves if 0 <= m <= 10]
        best = max(moves, key=f)
        if f(best) <= f(x):
            return x
        x = best
# <<< hill


# >>> restarts
def with_restarts(f, tries):
    top = None
    for _ in range(tries):
        x = hill_climb(f, random.uniform(0, 10))
        if top is None or f(x) > f(top):
            top = x
    return top
# <<< restarts


# >>> anneal
def anneal(f, x, t=5.0, cool=0.997, steps=3000,
           trace=None):
    best = x
    for _ in range(steps):
        y = x + random.gauss(0, 0.5)
        y = min(10, max(0, y))
        d = f(y) - f(x)
        if d > 0 or random.random() < math.exp(d / t):
            x = y
        if f(x) > f(best):
            best = x
        t *= cool
        if trace is not None:
            trace.append(x)
    return best
# <<< anneal


# >>> genetic
def genetic(f, size=8, rounds=30, seed=8):
    rng = random.Random(seed)
    people = [rng.uniform(0, 10) for _ in range(size)]
    for _ in range(rounds):
        def pick():
            a, b = rng.sample(people, 2)
            return max(a, b, key=f)
        kids = [max(people, key=f)]
        while len(kids) < size:
            kid = (pick() + pick()) / 2
            kid += rng.gauss(0, 0.4)
            kids.append(min(10, max(0, kid)))
        people = kids
    return max(people, key=f)
# <<< genetic


# >>> gradient
def gradient_descent(grad, x, lr, steps):
    path = [x]
    for _ in range(steps):
        x = x - lr * grad(x)
        path.append(x)
    return path


def grad(x):
    # derivative of (x - 3)**2 + 1
    return 2 * (x - 3)
# <<< gradient


# >>> gradient2d
def grad2(p):
    # f(x, y) = x**2 + 3 * y**2
    return 2 * p[0], 6 * p[1]


def descend(p, lr, steps):
    path = [p]
    for _ in range(steps):
        gx, gy = grad2(p)
        p = (p[0] - lr*gx, p[1] - lr*gy)
        path.append(p)
    return path
# <<< gradient2d


# >>> tsp_nn
def tour_length(cities, order):
    legs = zip(order, order[1:] + order[:1])
    return sum(math.dist(cities[a], cities[b])
               for a, b in legs)


def nearest_neighbour(cities):
    order, left = [0], set(range(1, len(cities)))
    while left:
        here = cities[order[-1]]
        nxt = min(left, key=lambda c:
                  math.dist(here, cities[c]))
        order.append(nxt)
        left.remove(nxt)
    return order
# <<< tsp_nn


# >>> tsp_brute
def brute_force_tour(cities):
    rest = range(1, len(cities))
    tours = ([0, *p] for p in permutations(rest))
    return min(tours,
               key=lambda t: tour_length(cities, t))
# <<< tsp_brute


# >>> two_opt
def two_opt(cities, order):
    best = tour_length(cities, order)
    improved = True
    while improved:
        improved = False
        for i in range(1, len(order) - 1):
            for j in range(i + 1, len(order)):
                new = (order[:i]
                       + order[i:j + 1][::-1]
                       + order[j + 1:])
                d = tour_length(cities, new)
                if d < best - 1e-9:
                    order, best = new, d
                    improved = True
    return order
# <<< two_opt


# >>> anneal_tsp
def anneal_tsp(cities, t=3.0, cool=0.9995,
               steps=40000, seed=1):
    rng = random.Random(seed)
    order = nearest_neighbour(cities)
    cur = tour_length(cities, order)
    best, best_len = order, cur
    for _ in range(steps):
        i, j = sorted(rng.sample(range(1, len(order)), 2))
        new = order[:i] + order[i:j + 1][::-1] + order[j + 1:]
        d = tour_length(cities, new) - cur
        if d < 0 or rng.random() < math.exp(-d / t):
            order, cur = new, cur + d
            if cur < best_len:
                best, best_len = order, cur
        t *= cool
    return best
# <<< anneal_tsp


# >>> search
def score(lr, reg):
    peak = math.exp(-((lr - 0.37) / 0.05) ** 2)
    return peak + 0.3 * math.exp(-((reg - 0.5) / 0.5) ** 2)


def grid_points(n):
    axis = [(i + 0.5) / n for i in range(n)]
    return [(a, b) for a in axis for b in axis]


def random_points(k, rng):
    return [(rng.random(), rng.random()) for _ in range(k)]
# <<< search


CITIES = [(0, 0), (2, 7), (5, 2), (6, 6), (8, 1), (9, 8), (3, 4), (7, 4)]


# ---------- figure helpers (not shown on slides) ----------
def tikz_grid(rows, top=None, left=None, fill=None, path=(),
              cw=6.6, ch=5.4, size=r"\scriptsize"):
    fill = fill or {}
    print(r"\begin{tikzpicture}")
    for j, t in enumerate(top or []):
        print(rf"\node[font=\tiny\bfseries,text=tdBlue] at ({j*cw:.1f}mm,{ch*0.95:.1f}mm) {{{t}}};")
    for i, t in enumerate(left or []):
        print(rf"\node[font=\tiny\bfseries,text=tdBlue,anchor=east] at ({-cw*0.6:.1f}mm,{-i*ch:.1f}mm) {{{t}}};")
    for i, row in enumerate(rows):
        for j, v in enumerate(row):
            col = fill.get((i, j), "white")
            print(rf"\node[cell,minimum width={cw:.1f}mm,minimum height={ch:.1f}mm,font={size}\ttfamily,fill={col}] (c{i}x{j}) at ({j*cw:.1f}mm,{-i*ch:.1f}mm) {{{v}}};")
    for a, b in zip(path, path[1:]):
        print(rf"\draw[tdAmber!80!black,very thick,->,shorten >=1.5pt,shorten <=1.5pt] (c{a[0]}x{a[1]}) -- (c{b[0]}x{b[1]});")
    print(r"\end{tikzpicture}")


def table(header, rows):
    print(header)
    for r in rows:
        print(*r)


def tour_fig(cities, order, sc=0.55, color="tdBlue", label=""):
    print(rf"\begin{{tikzpicture}}[x={sc}cm,y={sc}cm]")
    n = len(order)
    for k in range(n):
        a, b = cities[order[k]], cities[order[(k + 1) % n]]
        print(rf"\draw[{color},thick,->,shorten >=2.2pt,shorten <=2.2pt] ({a[0]},{a[1]}) -- ({b[0]},{b[1]});")
    for i, (x, y) in enumerate(cities):
        fillc = "tdAmber!50" if i == order[0] else "white"
        print(rf"\node[circle,draw=tdInk!70,fill={fillc},inner sep=0pt,minimum size=4mm,font=\tiny\bfseries] at ({x},{y}) {{{i}}};")
    if label:
        w = max(c[0] for c in cities)
        print(rf"\node[font=\scriptsize\bfseries,anchor=north west] at (0,-1) {{{label}}};")
    print(r"\end{tikzpicture}")


def climb_path(f, x, step=0.01):
    path = [x]
    while True:
        moves = [m for m in (x - step, x + step) if 0 <= m <= 10]
        best = max(moves, key=f)
        if f(best) <= f(x):
            return path
        x = best
        path.append(x)


def gantt(jobs, chosen, scale=0.5):
    print(rf"\begin{{tikzpicture}}[x={scale}cm]")
    order = sorted(jobs, key=lambda j: (j[0], j[1]))
    for row, (s, e) in enumerate(order):
        y = -row * 0.42
        col = "tdGreen!55" if (s, e) in chosen else "tdBlue!15"
        print(rf"\fill[{col},draw=tdInk!50] ({s},{y}) rectangle ({e},{y - 0.32});")
        print(rf"\node[font=\scriptsize] at ({(s + e) / 2},{y - 0.16}) {{{s}--{e}}};")
    top = max(e for _, e in jobs)
    for t in range(top + 1):
        print(rf"\node[font=\scriptsize,text=tdMuted] at ({t},0.2) {{{t}}};")
        print(rf"\draw[tdLine] ({t},0.05) -- ({t},{-len(jobs) * 0.42});")
    print(r"\end{tikzpicture}")


def main() -> None:
    section("version")
    print(f"Python {sys.version.split()[0]}")

    section("knap_demo")
    print("brute force:", *knapsack_brute(items, capacity))
    print("greedy     :", *knapsack_greedy(items, capacity))
    print("dynamic    :", knapsack_dp(items, capacity))

    section("knap_growth")
    random.seed(5)
    print(f"{'items':>6}{'subsets':>12}{'brute (ms)':>12}{'DP (ms)':>10}")
    for n in (10, 14, 18):
        many = [(i, random.randint(1, 30), random.randint(1, 100)) for i in range(n)]
        cap = 150
        tb = timeit(lambda: knapsack_brute(many, cap), number=1) * 1e3
        td = timeit(lambda: knapsack_dp(many, cap), number=1) * 1e3
        assert knapsack_brute(many, cap)[0] == knapsack_dp(many, cap)
        print(f"{n:>6}{2 ** n:>12,}{tb:>12.1f}{td:>10.3f}")

    section("knap_recover_demo")
    t = knapsack_items(items, capacity)
    print("value :", t[-1][-1])
    print("items :", chosen_items(items, t))
    small = [(n, w // 10, v) for n, w, v in items]
    ts = knapsack_items(small, 5)
    for row in ts:
        print(*row)
    print("small items:", chosen_items(small, ts))

    section("fig_knap")
    c, path, fill = 5, [(3, 5)], {}
    for i in range(3, 0, -1):
        if ts[i][c] != ts[i - 1][c]:
            fill[(i, c)] = "tdGreen!40"
            c -= small[i - 1][1]
        path.append((i - 1, c))
    for p in path:
        fill.setdefault(p, "tdAmber!30")
    tikz_grid([[str(v) for v in r] for r in ts], top=range(6),
              left=["none", "A w1", "B w2", "C w3"], fill=fill, path=path,
              cw=9, ch=6.4, size=r"\small")

    random.seed(1)
    jobs = [(1, 4), (3, 5), (0, 6), (5, 7), (3, 9), (5, 9), (6, 10), (8, 11), (8, 12), (2, 14), (12, 16)]
    wjobs = [(0, 5, 6), (5, 10, 6), (0, 10, 11), (10, 14, 5), (8, 13, 7), (2, 7, 5), (11, 15, 9)]
    section("act_demo")
    g = pick_by_finish(jobs)
    ex = max((len(c) for r in range(len(jobs) + 1) for c in combinations(jobs, r)
              if disjoint([(a, b, 0) for a, b in c])), default=0)
    print("jobs   :", len(jobs))
    print("greedy :", len(g), g)
    print("exact  :", ex)

    section("act_weighted")
    print("weights :", [w for *_, w in wjobs])
    gw = pick_by_weight(wjobs)
    gf = pick_by_finish([(s, e) for s, e, _ in wjobs])
    wf = [j for j in wjobs if (j[0], j[1]) in gf]
    print("heaviest first :", sum(j[2] for j in gw))
    print("earliest finish:", sum(j[2] for j in wf))
    print("DP             :", best_weight(wjobs))
    print("exact          :", best_exact(wjobs))

    section("fig_act")
    gantt(jobs, g)

    section("lp_demo")
    best, corners = solve_lp((2, 3))
    print("corners:")
    for p in sorted(corners):
        print(f"  ({p[0] + 0:.2f}, {p[1] + 0:.2f})  profit {2 * p[0] + 3 * p[1]:.2f}")
    print(f"best: x={best[0]:.2f}, y={best[1]:.2f}, profit {2 * best[0] + 3 * best[1]:.2f}")

    section("fig_lp")
    cx = sum(p[0] for p in corners) / len(corners)
    cy = sum(p[1] for p in corners) / len(corners)
    poly = sorted(corners, key=lambda p: math.atan2(p[1] - cy, p[0] - cx))
    s = 1.3
    print(rf"\begin{{tikzpicture}}[x={s}cm,y={s}cm]")
    print(r"\draw[->,tdMuted] (0,0) -- (4.6,0) node[right,font=\scriptsize]{$x$};")
    print(r"\draw[->,tdMuted] (0,0) -- (0,3.4) node[above,font=\scriptsize]{$y$};")
    print(r"\fill[tdBlue!15,draw=tdBlue,thick] " + " -- ".join(f"({p[0]:.3f},{p[1]:.3f})" for p in poly) + " -- cycle;")
    print(r"\draw[tdRed,thick] (0,4) -- (4,0) node[pos=0.97,right,font=\scriptsize]{$x+y=4$};")
    print(r"\draw[tdPurple,thick] (0,2.3333) -- (4.4,0.9333) node[right,font=\scriptsize]{$x+3y=7$};")
    print(r"\draw[tdAmber!80!black,thick] (3,0) -- (3,3.2) node[above,font=\scriptsize]{$x=3$};")
    for p in poly:
        print(rf"\fill[tdInk] ({p[0]:.3f},{p[1]:.3f}) circle (1.6pt);")
    ox, oy = best
    k = 2 * ox + 3 * oy
    print(rf"\draw[tdGreen!70!black,dashed,very thick] ({(k - 3 * 3.2) / 2:.3f},3.2) -- ({k / 2:.3f},0) node[below right,font=\scriptsize]{{$2x+3y={k:.1f}$}};")
    print(rf"\fill[tdGreen!70!black] ({ox:.3f},{oy:.3f}) circle (2.6pt) node[above,font=\scriptsize,yshift=3pt]{{best ({ox:.1f},{oy:.1f})}};")
    print(r"\end{tikzpicture}")

    section("hill_demo")
    for start in (1.0, 6.0):
        x = hill_climb(f, start)
        print(f"start x={start}: stops at x={x:.2f}, f={f(x):.2f}")
    random.seed(2)
    best = with_restarts(f, 10)
    print(f"10 restarts : best x={best:.2f}, f={f(best):.2f}")

    for name, start in (("hc_a", 1.0), ("hc_b", 6.0)):
        section(name)
        pth = climb_path(f, start)
        pts = pth[::10] + [pth[-1]]
        table("x y", [(f"{x:.3f}", f"{f(x):.3f}") for x in pts])

    section("restart_demo")
    random.seed(11)
    starts = [random.uniform(0, 10) for _ in range(20)]
    hits = sum(f(hill_climb(f, s0)) > 7.5 for s0 in starts)
    print(f"{hits} of 20 random starts reach the global peak")

    section("sa_demo")
    reach_sa = 0
    for k in range(20):
        random.seed(k)
        reach_sa += f(anneal(f, 1.0)) > 7.5
    print("start at x=1.0 (a hill climber stays at f=1.82)")
    print(f"annealing reaches the global peak in {reach_sa} of 20 runs")
    random.seed(4)
    tr = []
    b = anneal(f, 1.0, trace=tr)
    print(f"example run: best x={b:.2f}, f={f(b):.2f}")

    section("fig_sa_trace")
    table("it x", [(i, f"{tr[i]:.3f}") for i in range(0, len(tr), 25)])

    section("ga_demo")
    for rounds in (0, 1, 3, 8, 30):
        x = genetic(f, rounds=rounds)
        print(f"after {rounds:>2} generations: best x={x:.2f}, f={f(x):.2f}")

    section("gd_demo")
    for lr in (0.1, 1.0, 1.1):
        path = gradient_descent(grad, 10.0, lr, 30)
        print(f"lr={lr:<3}: " + " ".join(f"{x:.1f}" for x in path[:5]) + f" ... {path[-1]:.2f}")

    section("gd_data")
    paths = [gradient_descent(grad, 10.0, lr, 12) for lr in (0.1, 1.0, 1.1)]
    print("step lr01 lr10 lr11")
    for k in range(13):
        print(k, *(f"{p[k]:.3f}" for p in paths))

    for name, lr in (("gd_curve_a", 0.1), ("gd_curve_b", 0.9)):
        section(name)
        p = gradient_descent(grad, 10.0, lr, 12)
        table("x y", [(f"{x:.3f}", f"{(x - 3) ** 2 + 1:.3f}") for x in p])

    section("gd_sweep")
    print("lr loss")
    for lr in (0.01, 0.05, 0.1, 0.2, 0.4, 0.6, 0.8, 0.9, 0.95, 1.0, 1.05, 1.1):
        x = gradient_descent(grad, 10.0, lr, 20)[-1]
        print(lr, f"{(x - 3) ** 2:.6g}" if (x - 3) ** 2 > 1e-12 else "1e-12")

    section("gd2_demo")
    for lr in (0.05, 0.3):
        pth = descend((-4.0, 2.0), lr, 20)
        x, y = pth[-1]
        print(f"lr={lr:<4}: after 20 steps ({x:.3f}, {y:.3f})")
    for name, lr in (("gd2_slow", 0.05), ("gd2_fast", 0.3)):
        section(name)
        table("x y", [(f"{x:.3f}", f"{y:.3f}") for x, y in descend((-4.0, 2.0), lr, 20)])

    section("tsp_demo")
    nn = nearest_neighbour(CITIES)
    opt = brute_force_tour(CITIES)
    ln, lo = tour_length(CITIES, nn), tour_length(CITIES, opt)
    print(f"nearest neighbour: {ln:5.2f}")
    print(f"brute force      : {lo:5.2f}")
    print(f"heuristic is {100 * (ln / lo - 1):.0f}% longer")

    section("tsp_opt_demo")
    better = two_opt(CITIES, nn)
    lb = tour_length(CITIES, better)
    print(f"nearest neighbour: {ln:5.2f}")
    print(f"after 2-opt      : {lb:5.2f}")
    print(f"brute force      : {lo:5.2f}")

    section("fig_tsp_nn")
    tour_fig(CITIES, nn, color="tdRed", label=f"nearest neighbour: {ln:.2f}")
    section("fig_tsp_opt")
    tour_fig(CITIES, opt, color="tdGreen!70!black", label=f"optimal: {lo:.2f}")
    section("fig_tsp_2opt")
    tour_fig(CITIES, better, color="tdBlue", label=f"after 2-opt: {lb:.2f}")

    section("tsp_growth")
    print(f"{'cities':>7}{'tours to check':>26}")
    for n in (8, 10, 15, 20):
        print(f"{n:>7}{math.factorial(n - 1):>26,}")

    rng = random.Random(7)
    big = [(rng.randint(0, 20), rng.randint(0, 16)) for _ in range(30)]
    section("tsp_big")
    order_nn = nearest_neighbour(big)
    order_2 = two_opt(big, order_nn)
    order_sa = anneal_tsp(big)
    print(f"{'method':<20}{'length':>8}")
    for name, o in (("nearest neighbour", order_nn), ("2-opt on top", order_2), ("simulated annealing", order_sa)):
        print(f"{name:<20}{tour_length(big, o):>8.1f}")
    section("fig_big_nn")
    tour_fig(big, order_nn, sc=0.3, color="tdRed", label=f"nearest neighbour: {tour_length(big, order_nn):.1f}")
    section("fig_big_sa")
    tour_fig(big, order_sa, sc=0.3, color="tdGreen!70!black", label=f"annealing: {tour_length(big, order_sa):.1f}")

    section("search_demo")
    print(f"{'budget':>7}{'grid':>8}{'random (mean of 300)':>24}")
    for n in (3, 4, 5, 6):
        g_best = max(score(*p) for p in grid_points(n))
        tot = 0.0
        for s in range(300):
            r = random.Random(s)
            tot += max(score(*p) for p in random_points(n * n, r))
        print(f"{n * n:>7}{g_best:>8.2f}{tot / 300:>24.2f}")

    section("fig_search")
    gp = grid_points(3)
    rp = random_points(9, random.Random(5))
    print(r"\begin{tikzpicture}[x=3.2cm,y=3.2cm]")
    for ox, pts, ttl, col in ((0, gp, "grid search, 9 trials", "tdBlue"), (1.45, rp, "random search, 9 trials", "tdRed")):
        print(rf"\begin{{scope}}[shift={{({ox},0)}}]")
        print(r"\draw[tdInk!60] (0,0) rectangle (1,1);")
        print(r"\fill[tdGreen!35] (0.32,0) rectangle (0.42,1);")
        print(rf"\node[font=\scriptsize\bfseries] at (0.5,1.1) {{{ttl}}};")
        for a, b in pts:
            print(rf"\fill[{col}] ({a:.3f},{b:.3f}) circle (1.8pt);")
        print(r"\node[font=\tiny,text=tdMuted] at (0.5,-0.08) {learning rate};")
        print(r"\node[font=\tiny,text=tdMuted,rotate=90] at (-0.08,0.5) {regularisation};")
        print(r"\end{scope}")
    print(r"\end{tikzpicture}")


if __name__ == "__main__":
    main()
