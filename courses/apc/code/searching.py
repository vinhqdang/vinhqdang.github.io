"""Searching: linear search, binary search and the bisect module.

Run with:  python3.14 searching.py
"""
import random
import sys
from bisect import bisect_left, bisect_right
from timeit import timeit


def section(name: str) -> None:
    print(f"=== {name} ===")


# >>> linear
def linear_search(items, target):
    """Index of target, or -1 if absent."""
    for i, value in enumerate(items):
        if value == target:
            return i
    return -1
# <<< linear


# >>> binary
def binary_search(items, target):
    """items must be sorted."""
    lo, hi = 0, len(items) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if items[mid] == target:
            return mid
        elif items[mid] < target:
            lo = mid + 1      # go right
        else:
            hi = mid - 1      # go left
    return -1
# <<< binary


# >>> trace
def binary_trace(items, target):
    """binary_search that prints each step."""
    lo, hi = 0, len(items) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        print(f"lo={lo:2} hi={hi:2} mid={mid:2} -> {items[mid]}")
        if items[mid] == target:
            return mid
        if items[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
# <<< trace


# >>> counting
def linear_steps(items, target):
    steps = 0
    for value in items:
        steps += 1
        if value == target:
            break
    return steps


def binary_steps(items, target):
    lo, hi, steps = 0, len(items) - 1, 0
    while lo <= hi:
        steps += 1
        mid = (lo + hi) // 2
        if items[mid] == target:
            break
        if items[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return steps
# <<< counting


# >>> bisect_demo
def contains(sorted_items, target):
    """Membership test in O(log n)."""
    i = bisect_left(sorted_items, target)
    in_range = i < len(sorted_items)
    return in_range and sorted_items[i] == target


scores = [50, 60, 60, 60, 70, 90]
first = bisect_left(scores, 60)    # first 60
after = bisect_right(scores, 60)   # after last 60
# <<< bisect_demo


def main() -> None:
    section("version")
    print(f"Python {sys.version.split()[0]}")

    section("linear_demo")
    names = ["Mai", "Nam", "Lan", "Binh", "Hoa"]
    print(linear_search(names, "Lan"))
    print(linear_search(names, "Zed"))

    section("binary_demo")
    primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31]
    print(binary_search(primes, 19))
    print(binary_search(primes, 20))

    section("trace_demo")
    data = [3, 8, 12, 15, 19, 23, 27, 31, 36, 42, 47, 53, 58, 64, 71, 79]
    binary_trace(data, 47)

    section("counting_demo")
    print(f"{'n':>13} {'linear':>13} {'binary':>6}")
    for n in (10, 1_000, 1_000_000):
        items = list(range(n))
        print(f"{n:>13,} {linear_steps(items, n - 1):>13,} {binary_steps(items, n - 1):>6,}")
    for n in (1_000_000_000, 8_000_000_000):
        print(f"{n:>13,} {n:>13,} {n.bit_length():>6,} *")
    print("* by formula, n.bit_length()")

    section("counting_data")
    print("n linear binary")
    for k in range(1, 11):
        n = 2 ** k
        items = list(range(n))
        print(n, linear_steps(items, n - 1), binary_steps(items, n - 1))

    section("bisect_demo")
    print(contains(primes, 13), contains(primes, 14))
    print(first, after, "-> 60 appears", after - first, "times")
    print(bisect_left([10, 20, 30, 40], 25), "<- where 25 would be inserted")

    section("timing")
    random.seed(1)
    big = list(range(0, 2_000_000, 2))          # one million sorted even numbers
    target = big[-1]                            # worst case: the last element
    t_lin = timeit(lambda: linear_search(big, target), number=3) / 3
    t_bin = timeit(lambda: binary_search(big, target), number=2000) / 2000
    shuffled = random.sample(range(1_000_000), 1_000_000)
    t_sort = timeit(lambda: sorted(shuffled), number=1)
    print(f"linear search : {t_lin * 1e3:9.3f} ms")
    print(f"binary search : {t_bin * 1e6:9.3f} us")
    print(f"sorting 1e6   : {t_sort * 1e3:9.1f} ms (once)")
    print(f"sorting pays off after about {t_sort / t_lin:.0f} searches")


if __name__ == "__main__":
    main()
