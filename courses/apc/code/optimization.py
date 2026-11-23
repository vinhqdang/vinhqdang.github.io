"""Optimization: knapsack (brute force, greedy, DP), hill climbing, gradient descent, TSP.

Run with:  python3.14 optimization.py
"""
import math
import random
import sys
from itertools import combinations, permutations
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
            best[c] = max(best[c], best[c - w] + v)
    return best[capacity]
# <<< knap_dp


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


# >>> tsp_nn
def tour_length(cities, order):
    legs = zip(order, order[1:] + order[:1])
    return sum(math.dist(cities[a], cities[b])
               for a, b in legs)


def nearest_neighbour(cities):
    order, left = [0], set(range(1, len(cities)))
    while left:
        here = cities[order[-1]]
        nxt = min(left,
                  key=lambda c: math.dist(here, cities[c]))
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


CITIES = [(0, 0), (2, 7), (5, 2), (6, 6), (8, 1), (9, 8), (3, 4), (7, 4)]


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

    section("hill_demo")
    for start in (1.0, 6.0):
        x = hill_climb(f, start)
        print(f"start x={start}: stops at x={x:.2f}, f={f(x):.2f}")
    random.seed(2)
    best = with_restarts(f, 10)
    print(f"10 restarts : best x={best:.2f}, f={f(best):.2f}")

    section("gd_demo")
    for lr in (0.1, 1.0, 1.1):
        path = gradient_descent(grad, 10.0, lr, 30)
        print(f"lr={lr:<3}: " + " ".join(f"{x:.1f}" for x in path[:5]) + f" ... {path[-1]:.2f}")

    section("gd_data")
    paths = [gradient_descent(grad, 10.0, lr, 12) for lr in (0.1, 1.0, 1.1)]
    print("step lr01 lr10 lr11")
    for k in range(13):
        print(k, *(f"{p[k]:.3f}" for p in paths))

    section("tsp_demo")
    nn = nearest_neighbour(CITIES)
    opt = brute_force_tour(CITIES)
    ln, lo = tour_length(CITIES, nn), tour_length(CITIES, opt)
    print(f"nearest neighbour: {ln:5.2f}")
    print(f"brute force      : {lo:5.2f}")
    print(f"heuristic is {100 * (ln / lo - 1):.0f}% longer")

    section("tsp_growth")
    print(f"{'cities':>7}{'tours to check':>26}")
    for n in (8, 10, 15, 20):
        print(f"{n:>7}{math.factorial(n - 1):>26,}")


if __name__ == "__main__":
    main()
