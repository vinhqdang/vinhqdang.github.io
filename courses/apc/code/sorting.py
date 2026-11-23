"""Sorting: bubble, insertion, merge and quick sort, and Python's sorted().

Run with:  python3.14 sorting.py
"""
import random
import sys
from timeit import timeit


def section(name: str) -> None:
    print(f"=== {name} ===")


# >>> bubble
def bubble_sort(a):
    a = list(a)
    for end in range(len(a) - 1, 0, -1):
        for i in range(end):
            if a[i] > a[i + 1]:
                a[i], a[i + 1] = a[i + 1], a[i]
    return a
# <<< bubble


# >>> insertion
def insertion_sort(a):
    a = list(a)
    for i in range(1, len(a)):
        x = a[i]
        j = i - 1
        while j >= 0 and a[j] > x:
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = x
    return a
# <<< insertion


# >>> merge
def merge_sort(a):
    if len(a) <= 1:
        return list(a)
    mid = len(a) // 2
    left = merge_sort(a[:mid])
    right = merge_sort(a[mid:])
    return merge(left, right)


def merge(left, right):
    out, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            out.append(left[i])
            i += 1
        else:
            out.append(right[j])
            j += 1
    return out + left[i:] + right[j:]
# <<< merge


# >>> quick
def quick_sort(a):
    if len(a) <= 1:
        return list(a)
    pivot = a[len(a) // 2]
    less = [x for x in a if x < pivot]
    same = [x for x in a if x == pivot]
    more = [x for x in a if x > pivot]
    left = quick_sort(less)
    right = quick_sort(more)
    return left + same + right
# <<< quick


# >>> builtin
students = [("Mai", 8.5), ("Nam", 7.0),
            ("Lan", 8.5), ("Binh", 9.0)]
by_grade = sorted(students, key=lambda s: s[1],
                  reverse=True)
by_name = sorted(students, key=lambda s: s[0])
# <<< builtin


def bubble_trace(a):
    a = list(a)
    for end in range(len(a) - 1, 0, -1):
        swapped = False
        for i in range(end):
            if a[i] > a[i + 1]:
                a[i], a[i + 1] = a[i + 1], a[i]
                swapped = True
        print(a)
        if not swapped:
            break


def best_time(fn, data, repeat=3):
    return min(timeit(lambda: fn(data), number=1) for _ in range(repeat))


def main() -> None:
    section("version")
    print(f"Python {sys.version.split()[0]}")

    section("bubble_trace")
    data = [5, 2, 9, 1, 7, 3]
    print(data, "<- start")
    bubble_trace(data)

    section("check")
    random.seed(7)
    sample = random.sample(range(100), 12)
    print("input    ", sample)
    for fn in (bubble_sort, insertion_sort, merge_sort, quick_sort):
        assert fn(sample) == sorted(sample), fn.__name__
    print("all four algorithms agree with sorted():")
    print("output   ", merge_sort(sample))

    section("builtin")
    print([name for name, _ in by_grade])
    print([name for name, _ in by_name])

    section("timing_data")
    print("n bubble insertion merge quick builtin")
    rows = []
    for n in (250, 500, 1000, 2000, 4000):
        arr = random.sample(range(10 * n), n)
        t = [best_time(f, arr) * 1e3 for f in (bubble_sort, insertion_sort, merge_sort, quick_sort, sorted)]
        rows.append((n, t))
        print(n, *(f"{x:.3f}" for x in t))

    section("timing")
    print("milliseconds")
    print(f"{'n':>5}{'bubble':>8}{'insert':>8}{'merge':>8}{'quick':>8}{'sorted':>8}")
    for n, t in rows:
        print(f"{n:>5}" + "".join(f"{x:>8.2f}" for x in t))

    section("timsort")
    big = random.sample(range(1_000_000), 1_000_000)
    already = sorted(big)
    t_random = best_time(sorted, big, 2)
    t_sorted = best_time(sorted, already, 2)
    print(f"1e6 random numbers : {t_random * 1e3:7.1f} ms")
    print(f"1e6 already sorted : {t_sorted * 1e3:7.1f} ms")


if __name__ == "__main__":
    main()
