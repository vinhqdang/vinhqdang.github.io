"""Dynamic programming: Fibonacci, coin change and longest common subsequence.

Run with:  python3.14 dp.py
"""
import sys
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
        table[i] = table[i - 1] + table[i - 2]
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


def count_calls(n):
    calls = 0

    def f(k):
        nonlocal calls
        calls += 1
        return k if k < 2 else f(k - 1) + f(k - 2)

    f(n)
    return calls


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

    section("coin_demo")
    best, choice = min_coins([1, 2, 5], 11)
    print("best  :", *best)
    print("answer:", best[11], "coins:", *coins_used(choice, 11))

    section("coin_greedy")
    coins, amount = [1, 3, 4], 6
    g = greedy_coins(coins, amount)
    best, choice = min_coins(coins, amount)
    d = coins_used(choice, amount)
    print(f"coins {coins}, amount {amount}")
    print(f"greedy: {len(g)} coins", g)
    print(f"DP    : {best[amount]} coins", d)

    section("lcs_demo")
    a, b = "ABCBDAB", "BDCABA"
    t = lcs_table(a, b)
    print("length:", t[len(a)][len(b)])
    print("one LCS:", lcs_string(a, b, t))
    for row in t:
        print(*row)


if __name__ == "__main__":
    main()
