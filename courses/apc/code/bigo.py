"""Big-O and complexity: counting steps, growth rates, and measuring time.

Run with:  python3.14 bigo.py
"""
import random
import sys
import tracemalloc
from collections import deque
from functools import cache
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
def fib(n, c):
    c[0] += 1
    if n < 2:
        return n
    return fib(n - 1, c) + fib(n - 2, c)
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


# ---------- gallery: which complexity is this snippet? ----------
# >>> g1
def g1(n):
    steps = 0
    for _ in range(10):
        steps += 1
    return steps
# <<< g1


# >>> g2
def g2(n):
    steps = 0
    for i in range(n):
        for j in range(i):
            steps += 1
    return steps
# <<< g2


# >>> g3
def g3(n):
    steps = 0
    while n > 1:
        n //= 3
        steps += 1
    return steps
# <<< g3


# >>> g4
def g4(n):
    steps = 0
    for i in range(n):
        j = 1
        while j < n:
            j *= 2
            steps += 1
    return steps
# <<< g4


# >>> g5
def g5(n):
    steps, i = 0, 1
    while i < n:
        for j in range(i):
            steps += 1
        i *= 2
    return steps
# <<< g5


# >>> g6
def g6(n):
    steps = 0
    for i in range(n):
        for j in range(n):
            for k in range(n):
                steps += 1
    return steps
# <<< g6


# ---------- tricky loops with dependent bounds ----------
# >>> tricky_a
def tri_a(n):
    steps = 0
    for i in range(n):
        for j in range(i):
            steps += 1
    return steps
# <<< tricky_a


# >>> tricky_b
def tri_b(n):
    steps = 0
    for i in range(1, n):
        j = i
        while j < n:
            j += i
            steps += 1
    return steps
# <<< tricky_b


# >>> tricky_c
def tri_c(n):
    steps, i = 0, 1
    while i < n:
        for j in range(i):
            steps += 1
        i *= 2
    return steps
# <<< tricky_c


# >>> tricky_d
def tri_d(n):
    steps = 0
    for i in range(n):
        for j in range(i):
            for k in range(j):
                steps += 1
    return steps
# <<< tricky_d


# ---------- linear search: best, average, worst ----------
# >>> linsearch
def linear_search(items, target):
    comparisons = 0
    for i, x in enumerate(items):
        comparisons += 1
        if x == target:
            return i, comparisons
    return -1, comparisons
# <<< linsearch


# ---------- amortised append ----------
# >>> dynarray
class DynArray:
    """Cost model of a doubling array."""

    def __init__(self):
        self.capacity, self.size = 1, 0
        self.copies = 0

    def append(self):
        moved = 0
        if self.size == self.capacity:
            moved = self.size
            self.capacity *= 2
        self.size += 1
        self.copies += moved
        return 1 + moved
# <<< dynarray


# ---------- recursion trees ----------
# >>> ms_merge
def merge(left, right, stats):
    out, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        stats[0] += 1
        if left[i] <= right[j]:
            out.append(left[i])
            i += 1
        else:
            out.append(right[j])
            j += 1
    return out + left[i:] + right[j:]
# <<< ms_merge


# >>> ms_sort
def merge_sort(a, stats):
    if len(a) <= 1:
        return a
    mid = len(a) // 2
    left = merge_sort(a[:mid], stats)
    right = merge_sort(a[mid:], stats)
    return merge(left, right, stats)
# <<< ms_sort


# >>> fib_cache
@cache
def fib2(n):
    if n < 2:
        return n
    return fib2(n - 1) + fib2(n - 2)
# <<< fib_cache


# ---------- two-sum ----------
# >>> twosum_slow
def two_sum_slow(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return i, j
    return None
# <<< twosum_slow


# >>> twosum_fast
def two_sum_fast(nums, target):
    seen = {}
    for j, x in enumerate(nums):
        if target - x in seen:
            return seen[target - x], j
        seen[x] = j
    return None
# <<< twosum_fast


# ---------- strings and queues ----------
# >>> concat
def concat_append(m):
    s = ""
    for _ in range(m):
        s += "x"
    return s


def concat_prepend(m):
    s = ""
    for _ in range(m):
        s = "x" + s
    return s


def concat_join(m):
    parts = ["x"] * m
    return "".join(parts)
# <<< concat


# >>> drain
def drain_list(m):
    items = list(range(m))
    while items:
        items.pop(0)


def drain_deque(m):
    items = deque(range(m))
    while items:
        items.popleft()
# <<< drain


# ---------- space ----------
# >>> space_sum
def sum_squares_list(n):
    return sum([i * i for i in range(n)])


def sum_squares_gen(n):
    return sum(i * i for i in range(n))
# <<< space_sum


# >>> space_rec
def sum_rec(n):
    if n == 0:
        return 0
    return n + sum_rec(n - 1)
# <<< space_rec


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


def best_of(f, repeat=5):
    """Smallest of several single runs, in milliseconds."""
    return min(timeit(f, number=1) for _ in range(repeat)) * 1e3


def peak_kb(f, *args):
    tracemalloc.start()
    f(*args)
    peak = tracemalloc.get_traced_memory()[1]
    tracemalloc.stop()
    return peak / 1024


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

    # ----- measured timings (data for the plots) -----
    section("timing_lq")
    print("n linear quadratic")
    for n in (500, 1000, 2000, 3000, 4000):
        items = list(range(n))
        t1 = best_of(lambda: total(items))
        t2 = best_of(lambda: has_duplicate(items), repeat=3)
        print(f"{n} {t1:.4f} {t2:.3f}")

    section("doubling")
    print(f"{'n':>6}{'sum ms':>8}{'x':>5}{'dups ms':>9}{'x':>5}")
    prev = None
    for n in (1000, 2000, 4000, 8000):
        items = list(range(n))
        t1 = best_of(lambda: total(items))
        t2 = best_of(lambda: has_duplicate(items), repeat=2)
        r1 = f"{t1 / prev[0]:.1f}" if prev else "-"
        r2 = f"{t2 / prev[1]:.1f}" if prev else "-"
        print(f"{n:>6,}{t1:>8.3f}{r1:>5}{t2:>9.1f}{r2:>5}")
        prev = (t1, t2)

    section("counts_loglog")
    print("n one logn linear nlogn quad")
    for k in range(2, 11):
        n = 2 ** k
        print(f"{n} 1 {halvings(n)} {n} {mystery_d(n)} {mystery_c(n)}")

    section("membership_data")
    print("n list_us set_us")
    for n in (1_000, 10_000, 100_000, 1_000_000):
        as_list = list(range(n))
        as_set = set(as_list)
        t_list = timeit(lambda: n - 1 in as_list, number=20) / 20
        t_set = timeit(lambda: n - 1 in as_set, number=20_000) / 20_000
        print(f"{n} {t_list * 1e6:.2f} {t_set * 1e6:.4f}")

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

    # ----- gallery -----
    section("gallery_demo")
    print(f"{'':>4}{'n=64':>10}{'n=128':>11}{'ratio':>7}")
    for name, g in (("g1", g1), ("g2", g2), ("g3", g3),
                    ("g4", g4), ("g5", g5), ("g6", g6)):
        a, b = g(64), g(128)
        print(f"{name:>4}{a:>10,}{b:>11,}{b / a:>7.2f}")

    # ----- tricky loops -----
    section("tricky_demo")
    print(f"{'':>6}{'n=100':>9}{'n=200':>10}{'n=400':>11}{'x(200)':>8}{'x(400)':>8}")
    for name, f in (("tri_a", tri_a), ("tri_b", tri_b),
                    ("tri_c", tri_c), ("tri_d", tri_d)):
        a, b, c = f(100), f(200), f(400)
        print(f"{name:>6}{a:>9,}{b:>10,}{c:>11,}{b / a:>8.2f}{c / b:>8.2f}")

    # ----- best, average, worst -----
    section("linear_cases")
    items = list(range(1, 21))
    print("position comparisons")
    for target in items:
        print(target, linear_search(items, target)[1])
    section("linear_cases_demo")
    comps = [linear_search(items, t)[1] for t in items]
    print(f"best    (target first)   : {min(comps):>2} comparison")
    print(f"average (all 20 targets) : {sum(comps) / len(comps):>4.1f} comparisons")
    print(f"worst   (last or absent) : {linear_search(items, 99)[1]:>2} comparisons")

    # ----- amortised append -----
    section("amortised_data")
    print("i cost average")
    arr, running = DynArray(), 0
    for i in range(1, 65):
        c = arr.append()
        running += c
        print(i, c, f"{running / i:.3f}")
    section("amortised_demo")
    print(f"{'appends':>9}{'copies':>9}{'copies/n':>9}{'avg cost':>9}")
    for n in (10, 100, 1_000, 1_000_000):
        arr = DynArray()
        cost = sum(arr.append() for _ in range(n))
        print(f"{n:>9,}{arr.copies:>9,}{arr.copies / n:>9.2f}{cost / n:>9.2f}")
    section("getsizeof_demo")
    a, last, rows = [], sys.getsizeof([]), []
    for i in range(1, 101):
        a.append(i)
        size = sys.getsizeof(a)
        if size != last:
            rows.append(f"len {i:>3}: {size:>4} bytes")
            last = size
    print("CPython list resizes while appending 1..100:")
    for k in range(0, len(rows), 2):
        print("   ".join(rows[k:k + 2]))
    print(f"({len(rows)} resizes for 100 appends)")

    # ----- space -----
    section("space_demo")
    n = 100_000
    print(f"list comp. peak: {peak_kb(sum_squares_list, n):>8,.0f} KB")
    print(f"generator peak : {peak_kb(sum_squares_gen, n):>8,.1f} KB")
    for size in (100, 200, 400):
        grid = [[0] * size for _ in range(size)]
        kb = (sys.getsizeof(grid) + sum(sys.getsizeof(r) for r in grid)) / 1024
        print(f"{size}x{size} table: {kb:>8,.0f} KB")
    print("recursion limit:", sys.getrecursionlimit())
    print("sum_rec(500)  =", sum_rec(500))
    try:
        sum_rec(5000)
    except RecursionError:
        print("sum_rec(5000) -> RecursionError")

    # ----- recursion trees -----
    section("recursion_demo")
    print(f"{'n':>6}{'comparisons':>13}{'n log2 n':>10}")
    for k in range(3, 15, 3):
        n = 2 ** k
        stats = [0]
        merge_sort(random.Random(1).sample(range(n), n), stats)
        print(f"{n:>6,}{stats[0]:>13,}{n * k:>10,}")
    fib2(30)
    print(f"fib(30): {fib_call_count(30):,} calls naive, "
          f"{fib2.cache_info().misses} with @cache")

    # ----- two sum -----
    section("twosum_data")
    print("n slow fast")
    for n in (500, 1000, 2000, 4000):
        nums = list(range(n))
        t1 = best_of(lambda: two_sum_slow(nums, -1), repeat=3)
        t2 = best_of(lambda: two_sum_fast(nums, -1))
        print(f"{n} {t1:.3f} {t2:.4f}")
    section("twosum_demo")
    nums = [8, 3, 11, 6, 2, 9]
    print("nums   :", nums, " target: 14")
    print("slow   :", two_sum_slow(nums, 14))
    print("fast   :", two_sum_fast(nums, 14))
    print("missing:", two_sum_slow(nums, 100), two_sum_fast(nums, 100))

    # ----- strings and queues -----
    section("concat_demo")
    print(f"{'m':>8}{'s += c':>10}{'c + s':>10}{'join':>10}   (ms)")
    for m in (50_000, 100_000, 200_000):
        ta = best_of(lambda: concat_append(m), repeat=3)
        tp = best_of(lambda: concat_prepend(m), repeat=3)
        tj = best_of(lambda: concat_join(m), repeat=3)
        print(f"{m:>8,}{ta:>10.2f}{tp:>10.2f}{tj:>10.2f}")
    section("drain_demo")
    rows = []
    for m in (20_000, 40_000, 80_000, 160_000):
        tl = best_of(lambda: drain_list(m), repeat=3)
        td = best_of(lambda: drain_deque(m), repeat=3)
        rows.append((m, tl, td))
    print(f"{'m':>8}{'pop(0)':>10}{'popleft':>10}   (ms)")
    for m, tl, td in rows:
        print(f"{m:>8,}{tl:>10.2f}{td:>10.2f}")
    section("drain_data")
    print("m list deque")
    for m, tl, td in rows:
        print(m, f"{tl:.3f}", f"{td:.3f}")


if __name__ == "__main__":
    main()
