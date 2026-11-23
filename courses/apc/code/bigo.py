"""Big-O and complexity: counting steps, growth rates, and measuring time.

Run with:  python3.14 bigo.py
"""
import sys
from timeit import timeit


def section(name: str) -> None:
    print(f"=== {name} ===")


# >>> constant
def first_item(items):
    return items[0]
# <<< constant


# >>> linear
def total(items):
    s = 0
    for x in items:
        s += x
    return s
# <<< linear


# >>> quadratic
def has_duplicate(items):
    n = len(items)
    for i in range(n):
        for j in range(i + 1, n):
            if items[i] == items[j]:
                return True
    return False
# <<< quadratic


# >>> logarithmic
def halvings(n):
    steps = 0
    while n > 1:
        n //= 2
        steps += 1
    return steps
# <<< logarithmic


# >>> fib_calls
def fib(n, counter):
    counter[0] += 1
    if n < 2:
        return n
    return fib(n - 1, counter) + fib(n - 2, counter)
# <<< fib_calls


# >>> quiz_a
def mystery_a(n):
    count = 0
    for i in range(n):
        for j in range(5):
            count += 1
    return count
# <<< quiz_a


# >>> quiz_b
def mystery_b(n):
    count, i = 0, 1
    while i < n:
        i *= 2
        count += 1
    return count
# <<< quiz_b


# >>> quiz_c
def mystery_c(n):
    count = 0
    for i in range(n):
        for j in range(n):
            count += 1
    return count
# <<< quiz_c


# >>> quiz_d
def mystery_d(n):
    count = 0
    for i in range(n):
        j = n
        while j > 1:
            j //= 2
            count += 1
    return count
# <<< quiz_d


def human(seconds):
    units = (("years", 31_557_600), ("days", 86_400), ("hours", 3_600), ("minutes", 60),
             ("s", 1), ("ms", 1e-3), ("us", 1e-6))
    for unit, size in units:
        if seconds >= size:
            x = seconds / size
            return f"{x:.1e} {unit}" if x >= 1e6 else f"{x:,.1f} {unit}"
    return f"{seconds * 1e9:.1f} ns"


def count_total(n):
    return n


def count_pairs(n):
    return n * (n - 1) // 2


def fib_call_count(n):
    c = [0]
    fib(n, c)
    return c[0]


def main() -> None:
    section("version")
    print(f"Python {sys.version.split()[0]}")

    section("steps")
    print(f"{'n':>7}{'log2 n':>8}{'n':>9}{'n log n':>10}{'n^2':>15}")
    for n in (10, 100, 1_000, 10_000, 100_000):
        print(f"{n:>7,}{halvings(n):>8}{count_total(n):>9,}{n * halvings(n):>10,}{n * n:>15,}")

    section("quiz")
    print(f"{'':>10}{'n=100':>10}{'n=1000':>11}{'n=2000':>11}")
    for name, f in (("mystery_a", mystery_a), ("mystery_b", mystery_b),
                    ("mystery_c", mystery_c), ("mystery_d", mystery_d)):
        print(f"{name:>10}{f(100):>10,}{f(1000):>11,}{f(2000):>11,}")

    section("pairs")
    print("pairs compared when there is no duplicate")
    for n in (10, 100, 1000):
        print(f"n={n:>4}: {count_pairs(n):>7,} = n(n-1)/2")

    section("fib_data")
    print("n calls")
    for n in range(5, 26, 2):
        print(n, fib_call_count(n))

    section("fib_demo")
    for n in (10, 20, 25, 30):
        print(f"fib({n}) makes {fib_call_count(n):>9,} calls")

    section("growth")
    print("if one step takes 1 nanosecond:")
    for n in (20, 50, 100):
        print(f"n={n:>3}:  n^2 = {human(n * n * 1e-9):>12}   2^n = {human(2.0 ** n * 1e-9):>16}")

    section("membership")
    n = 100_000
    as_list = list(range(n))
    as_set = set(as_list)
    t_list = timeit(lambda: n - 1 in as_list, number=200) / 200
    t_set = timeit(lambda: n - 1 in as_set, number=200_000) / 200_000
    print(f"x in list : {t_list * 1e6:9.1f} us   O(n)")
    print(f"x in set  : {t_set * 1e6:9.3f} us   O(1) on average")
    print(f"ratio     : {t_list / t_set:9,.0f}x")

    section("append_insert")
    def build_append(m):
        a = []
        for i in range(m):
            a.append(i)
    def build_front(m):
        a = []
        for i in range(m):
            a.insert(0, i)
    print(f"{'m':>8}{'append (ms)':>14}{'insert(0) (ms)':>17}")
    for m in (10_000, 20_000, 40_000):
        ta = timeit(lambda: build_append(m), number=1) * 1e3
        tf = timeit(lambda: build_front(m), number=1) * 1e3
        print(f"{m:>8,}{ta:>14.2f}{tf:>17.2f}")


if __name__ == "__main__":
    main()
