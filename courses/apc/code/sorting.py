"""Sorting: bubble, insertion, merge and quick sort, Python's sorted(), and classic problems.

Run with:  python3.14 sorting.py
"""
import heapq
import math
import random
import sys
from collections import Counter
from operator import attrgetter
from dataclasses import dataclass
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


# >>> merge_sort
def merge_sort(a):
    if len(a) <= 1:
        return list(a)
    mid = len(a) // 2
    left = merge_sort(a[:mid])
    right = merge_sort(a[mid:])
    return merge(left, right)
# <<< merge_sort


# >>> merge
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


# >>> partition
def partition(a, lo, hi):
    """Pivot a[hi]; returns its index."""
    pivot = a[hi]
    i = lo      # a[lo:i] <= pivot
    for j in range(lo, hi):
        if a[j] <= pivot:
            a[i], a[j] = a[j], a[i]
            i += 1
    a[i], a[hi] = a[hi], a[i]
    return i
# <<< partition


# >>> quickselect
def quickselect(a, k, part=partition):
    """k-th smallest, 0-based."""
    a = list(a)
    lo, hi = 0, len(a) - 1
    while lo < hi:
        r = random.randint(lo, hi)
        a[r], a[hi] = a[hi], a[r]
        p = part(a, lo, hi)
        if p == k:
            return a[p]
        if p < k:
            lo = p + 1
        else:
            hi = p - 1
    return a[lo]
# <<< quickselect


# >>> inversions
def count_inversions(a):
    """Return (sorted copy, inversions)."""
    if len(a) <= 1:
        return list(a), 0
    mid = len(a) // 2
    left, x = count_inversions(a[:mid])
    right, y = count_inversions(a[mid:])
    out, i, j, cross = [], 0, 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            out.append(left[i])
            i += 1
        else:
            out.append(right[j])
            j += 1
            cross += len(left) - i
    out += left[i:] + right[j:]
    return out, x + y + cross
# <<< inversions


# >>> kth
def kth_largest(a, k):
    """Heap of the k largest so far."""
    heap = list(a[:k])
    heapq.heapify(heap)
    for x in a[k:]:
        if x > heap[0]:
            heapq.heapreplace(heap, x)
    return heap[0]
# <<< kth


# >>> multikey
@dataclass(frozen=True, slots=True)
class Student:
    name: str
    group: str
    grade: float


def one_call(people):
    key = lambda s: (s.group, -s.grade, s.name)
    return sorted(people, key=key)


def three_passes(people):
    passes = [("name", False), ("grade", True),
              ("group", False)]
    for field, rev in passes:
        people = sorted(people, reverse=rev,
                        key=attrgetter(field))
    return people
# <<< multikey


# >>> mergek
def merge_k(lists):
    heap = [(lst[0], i, 0)
            for i, lst in enumerate(lists)
            if lst]
    heapq.heapify(heap)
    out = []
    while heap:
        value, i, j = heapq.heappop(heap)
        out.append(value)
        if j + 1 < len(lists[i]):
            nxt = lists[i][j + 1]
            heapq.heappush(heap,
                           (nxt, i, j + 1))
    return out
# <<< mergek


# >>> dutch
def sort_colours(a):
    """0, 1, 2 in one pass, O(1) space."""
    lo, mid, hi = 0, 0, len(a) - 1
    while mid <= hi:
        match a[mid]:
            case 0:
                a[lo], a[mid] = a[mid], a[lo]
                lo += 1
                mid += 1
            case 1:
                mid += 1
            case 2:
                a[mid], a[hi] = a[hi], a[mid]
                hi -= 1
    return a
# <<< dutch


# >>> topk
def top_k_words(text, k):
    counts = Counter(text.lower().split())
    ranked = sorted(
        counts.items(),
        key=lambda kv: (-kv[1], kv[0]))
    return ranked[:k]
# <<< topk


# ---------------------------------------------------------------- helpers (not shown on slides)
W, G, A, R, B = "white", "tdGreen!24", "tdAmber!45", "tdRed!25", "tdBlue!18"
GREY = "tdLine!55"
STYLES = {"std": ("cell", 0.8), "small": ("mcell", 0.62), "wide": ("wcell", 1.3)}


def cells(y, vals, cols, x0=0.0, size="std"):
    style, step = STYLES[size]
    spec = ",".join(f"{v}/{c}" for v, c in zip(vals, cols))
    print(rf"\cellsx{{{style}}}{{{step}}}{{{x0}}}{{{y}}}{{{spec}}}")


def label(y, text, x=-0.6):
    print(rf"\rl{{{x}}}{{{y}}}{{{text}}}")


def note(x, y, text, color="tdMuted"):
    print(rf"\rn{{{x}}}{{{y}}}{{{text}}}{{{color}}}")


def tk_bubble(data):
    a = list(data)
    n = len(a)
    cells(0, a, [W] * n)
    label(0, "start")
    for k, end in enumerate(range(n - 1, 0, -1), 1):
        swaps = 0
        for i in range(end):
            if a[i] > a[i + 1]:
                a[i], a[i + 1] = a[i + 1], a[i]
                swaps += 1
        y = -1.2 * k
        cells(y, a, [W] * (n - k) + [G] * k)
        label(y, f"pass {k}")
        note(n * 0.8 - 0.3, y, f"{swaps} swaps" if swaps else "no swaps: stop", "tdMuted" if swaps else "tdRed")
        if not swaps:
            break


def tk_bubble_pass(data):
    a = list(data)
    n = len(a)
    for i in range(n - 1):
        y = -0.95 * i
        swap = a[i] > a[i + 1]
        cols = [W] * n
        cols[i] = cols[i + 1] = R if swap else A
        cells(y, a, cols)
        label(y, f"compare {i + 1}")
        note(n * 0.8 - 0.3, y, f"${a[i]}>{a[i + 1]}$: swap" if swap else f"${a[i]}\\le{a[i + 1]}$: keep",
             "tdRed" if swap else "tdMuted")
        if swap:
            a[i], a[i + 1] = a[i + 1], a[i]
    y = -0.95 * (n - 1)
    cells(y, a, [W] * (n - 1) + [G])
    label(y, "after pass 1")
    note(n * 0.8 - 0.3, y, "largest item is home", "tdGreen!70!black")


def tk_insertion(data):
    a = list(data)
    n = len(a)
    for i in range(1, n):
        y = -1.0 * (i - 1)
        cells(y, a, [G] * i + [A] + [W] * (n - i - 1))
        label(y, f"insert {a[i]}")
        x, j, shifts = a[i], i - 1, 0
        while j >= 0 and a[j] > x:
            a[j + 1] = a[j]
            j -= 1
            shifts += 1
        a[j + 1] = x
        note(n * 0.8 - 0.3, y, f"{shifts} shift" + ("" if shifts == 1 else "s"))
    y = -1.0 * (n - 1)
    cells(y, a, [G] * n)
    label(y, "sorted")


def split_nodes(data):
    out = []

    def rec(lo, hi, d, parent):
        me = len(out)
        out.append((d, lo, hi, parent))
        if hi - lo > 1:
            mid = (lo + hi) // 2
            rec(lo, mid, d + 1, me)
            rec(mid, hi, d + 1, me)

    rec(0, len(data), 0, None)
    return out


def tk_merge_tree(data, merged):
    nodes = split_nodes(data)
    u, dy = 1.45, 1.25
    pos = [((lo + hi - 1) / 2 * u, -dy * d) for d, lo, hi, _ in nodes]
    depth = max(d for d, *_ in nodes)
    for me, (d, lo, hi, parent) in enumerate(nodes):
        x, y = pos[me]
        vals = sorted(data[lo:hi]) if merged else data[lo:hi]
        text = "~".join(map(str, vals))
        fill = (G if hi - lo > 1 else W) if merged else W
        if merged and hi - lo == len(data):
            fill = "tdGreen!40"
        print(rf"\mt{{{x:.2f}}}{{{y:.2f}}}{{{text}}}{{{fill}}}")
        if parent is not None:
            px, py = pos[parent]
            if merged:
                print(rf"\draw[arr] ({x:.2f},{y + 0.22:.2f}) -- ({px:.2f},{py - 0.22:.2f});")
            else:
                print(rf"\draw[arr] ({px:.2f},{py - 0.22:.2f}) -- ({x:.2f},{y + 0.22:.2f});")
    for d in range(depth + 1):
        size = len(data) >> d
        label(-dy * d, f"size {size}" if not merged else f"runs of {size}", -0.9)


def tk_merge_steps(left, right):
    i = j = 0
    out = []
    nl, nr = len(left), len(right)
    k = 0
    xl, xr, xo = 0, nl * 0.62 + 0.5, (nl + nr) * 0.62 + 1.0
    total = nl + nr
    while i < nl and j < nr:
        y = -0.66 * k
        lc = [GREY if t < i else W for t in range(nl)]
        rc = [GREY if t < j else W for t in range(nr)]
        lc[i] = rc[j] = A
        take_left = left[i] <= right[j]
        if take_left:
            lc[i] = "tdGreen!40"
        else:
            rc[j] = "tdGreen!40"
        cells(y, left, lc, xl, "small")
        cells(y, right, rc, xr, "small")
        cells(y, out + [""] * (total - len(out)), [G] * len(out) + [W] * (total - len(out)), xo, "small")
        note(xo + total * 0.62 + 0.1, y, f"${left[i]}\\le{right[j]}$? take {left[i]}" if take_left
             else f"${left[i]}\\le{right[j]}$? no: take {right[j]}")
        out.append(left[i] if take_left else right[j])
        if take_left:
            i += 1
        else:
            j += 1
        k += 1
    y = -0.66 * k
    cells(y, left, [GREY] * nl, xl, "small")
    cells(y, right, [GREY if t < j else W for t in range(nr)], xr, "small")
    out += left[i:] + right[j:]
    cells(y, out, [G] * total, xo, "small")
    note(xo + total * 0.62 + 0.1, y, "copy the rest", "tdGreen!70!black")
    for x, t in ((xl, "left"), (xr, "right"), (xo, "output")):
        note(x - 0.3, 0.65, f"\\textbf{{{t}}}")


def quick_nodes(data):
    ranks = {v: i for i, v in enumerate(sorted(data))}
    out = []

    def rec(lst, d, parent):
        if not lst:
            return
        pivot = lst[len(lst) // 2]
        me = len(out)
        out.append((d, lst, pivot, ranks[pivot], parent))
        rec([x for x in lst if x < pivot], d + 1, me)
        rec([x for x in lst if x > pivot], d + 1, me)

    rec(list(data), 0, None)
    return out


def tk_quick_tree(data):
    nodes = quick_nodes(data)
    u, dy = 1.45, 1.2
    pos = [(r * u, -dy * d) for d, _, _, r, _ in nodes]
    for me, (d, lst, pivot, r, parent) in enumerate(nodes):
        x, y = pos[me]
        text = "~".join(rf"\textcolor{{tdAmber!70!black}}{{\textbf{{{v}}}}}" if v == pivot else str(v) for v in lst)
        print(rf"\mt{{{x:.2f}}}{{{y:.2f}}}{{{text}}}{{{W if len(lst) > 1 else 'tdGreen!24'}}}")
        if parent is not None:
            px, py = pos[parent]
            print(rf"\draw[arr] ({px:.2f},{py - 0.22:.2f}) -- ({x:.2f},{y + 0.22:.2f});")


def tk_partition(data):
    a = list(data)
    n = len(a)
    hi = n - 1
    pivot = a[hi]
    i = 0

    def colors(j, i):
        return ["tdAmber!60" if t == hi else B if t < i else R if t < j else W for t in range(n)]

    y = 0.0
    cells(y, a, colors(0, 0))
    label(y, "start")
    note(n * 0.8 - 0.3, y, f"pivot = {pivot} (last)")
    for j in range(hi):
        y -= 0.85
        cols = colors(j, i)
        cols[j] = "tdAmber!25"
        cells(y, a, cols)
        label(y, f"j={j}")
        if a[j] <= pivot:
            note(n * 0.8 - 0.3, y, f"${a[j]}\\le{pivot}$: swap with a[{i}]", "tdBlue")
            a[i], a[j] = a[j], a[i]
            i += 1
        else:
            note(n * 0.8 - 0.3, y, f"${a[j]}>{pivot}$: leave", "tdRed")
    a[i], a[hi] = a[hi], a[i]
    y -= 0.85
    cells(y, a, [B] * i + ["tdGreen!45"] + [R] * (n - i - 1))
    label(y, "finish")
    note(n * 0.8 - 0.3, y, f"pivot lands at index {i}", "tdGreen!70!black")


def tk_inversions(data):
    n = len(data)
    cells(0, data, [W] * n)
    pairs = [(i, j) for i in range(n) for j in range(i + 1, n) if data[i] > data[j]]
    for i, j in pairs:
        x1, x2 = i * 0.8, j * 0.8
        h = 0.45 + 0.28 * (j - i)
        print(rf"\draw[tdRed!75,thick] ({x1},0.4) .. controls ({x1},{0.4 + h}) and ({x2},{0.4 + h}) .. ({x2},0.4);")
    return len(pairs)


def tk_stability(people):
    colour = {"A": "tdBlue!22", "B": "tdAmber!35"}
    rows = [("start", people)]
    cur = sorted(people, key=lambda s: s.name)
    rows.append(("1. by name", cur))
    cur = sorted(cur, key=lambda s: s.grade, reverse=True)
    rows.append(("2. by grade", cur))
    cur = sorted(cur, key=lambda s: s.group)
    rows.append(("3. by group", cur))
    for k, (name, lst) in enumerate(rows):
        y = -1.2 * k
        spec = ",".join(f"{s.name}\\\\[-2pt]{{\\tiny {s.grade}}}/{colour[s.group]}" for s in lst)
        print(rf"\cellsx{{wcell}}{{1.3}}{{0}}{{{y}}}{{{spec}}}")
        label(y, name, -0.8)


def tk_kway(lists):
    cols = ["tdBlue!22", "tdAmber!35", "tdGreen!28", "tdPurple!22"]
    for i, lst in enumerate(lists):
        y = -0.9 * i
        cells(y, lst, [cols[i]] * len(lst))
        label(y, f"list {i}")
    y = -0.9 * len(lists) - 0.4
    flat = sorted((v, i) for i, lst in enumerate(lists) for v in lst)
    for start in range(0, len(flat), 10):
        chunk = flat[start:start + 10]
        yy = y - 0.9 * (start // 10)
        cells(yy, [v for v, _ in chunk], [cols[i] for _, i in chunk])
        if start == 0:
            label(yy, "merged")


def dutch_steps(data):
    a = list(data)
    lo, mid, hi = 0, 0, len(a) - 1
    steps = []
    while mid <= hi:
        steps.append((list(a), lo, mid, hi))
        match a[mid]:
            case 0:
                a[lo], a[mid] = a[mid], a[lo]
                lo += 1
                mid += 1
            case 1:
                mid += 1
            case 2:
                a[mid], a[hi] = a[hi], a[mid]
                hi -= 1
    steps.append((list(a), lo, mid, hi))
    return steps


def tk_dutch(data):
    shade = {0: R, 1: W, 2: "tdBlue!28"}
    steps = dutch_steps(data)
    for k, (a, lo, mid, hi) in enumerate(steps):
        y = -1.0 * k
        last = k == len(steps) - 1
        cols = [shade[v] for v in a]
        cells(y, a, cols)
        label(y, "done" if last else f"step {k}")
        tags = {}
        for name, idx in (("lo", lo), ("mid", mid), ("hi", hi)):
            if 0 <= idx < len(a) and not last:
                tags.setdefault(idx, []).append(name)
        for idx, names in tags.items():
            print(rf"\ptr{{{idx * 0.8}}}{{{y}}}{{{','.join(names)}}}")
        if not last:
            what = {0: "0: swap lo,mid; lo++ mid++", 1: "1: mid++", 2: "2: swap mid,hi; hi--"}[a[mid]]
            note(len(a) * 0.8 - 0.3, y, f"a[mid]={what}")


# ---------------------------------------------------------------- counting comparisons
class Counted:
    n = 0

    def __init__(self, v):
        self.v = v

    def __lt__(self, o):
        Counted.n += 1
        return self.v < o.v

    def __le__(self, o):
        Counted.n += 1
        return self.v <= o.v

    def __gt__(self, o):
        Counted.n += 1
        return self.v > o.v

    def __eq__(self, o):
        Counted.n += 1
        return self.v == o.v


def comparisons(fn, data):
    Counted.n = 0
    fn([Counted(v) for v in data])
    return Counted.n


def best_time(fn, data, repeat=3):
    return min(timeit(lambda: fn(data), number=1) for _ in range(repeat))


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


def main() -> None:
    section("version")
    print(f"Python {sys.version.split()[0]}")

    section("bubble_trace")
    data = [5, 2, 9, 1, 7, 3]
    print(data, "<- start")
    bubble_trace(data)

    section("tk_bubble")
    tk_bubble(data)
    section("tk_bpass")
    tk_bubble_pass(data)
    section("tk_insert")
    tk_insertion(data)
    section("tk_msplit")
    eight = [38, 27, 43, 3, 9, 82, 10, 5]
    tk_merge_tree(eight, False)
    section("tk_mmerge")
    tk_merge_tree(eight, True)
    section("tk_mstep")
    tk_merge_steps([3, 27, 38, 43], [5, 9, 10, 82])
    section("tk_qtree")
    qdata = [7, 2, 9, 4, 5, 1, 8, 6]
    tk_quick_tree(qdata)
    section("tk_part")
    tk_partition(qdata)

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

    section("cmp_data")
    print("n bubble insertion merge quick half_n2 nlogn")
    for n in (50, 100, 200, 400, 800):
        arr = random.sample(range(10 * n), n)
        c = [comparisons(f, arr) for f in (bubble_sort, insertion_sort, merge_sort, quick_sort)]
        print(n, *c, n * (n - 1) // 2, round(n * math.log2(n)))

    section("cmp_demo")
    arr = random.sample(range(4000), 400)
    print("400 random items, comparisons counted:")
    for fn in (bubble_sort, insertion_sort, merge_sort, quick_sort):
        print(f"{fn.__name__:<15}{comparisons(fn, arr):>8,}")
    print(f"{'n*log2(n)':<15}{round(400 * math.log2(400)):>8,}")

    section("big_data")
    print("n merge quick builtin")
    for n in (20_000, 40_000, 60_000, 80_000, 100_000):
        arr = random.sample(range(10 * n), n)
        t = [best_time(f, arr) * 1e3 for f in (merge_sort, quick_sort, sorted)]
        print(n, *(f"{x:.1f}" for x in t))

    section("timsort")
    big = random.sample(range(1_000_000), 1_000_000)
    already = sorted(big)
    t_random = best_time(sorted, big, 2)
    t_sorted = best_time(sorted, already, 2)
    print(f"1e6 random numbers : {t_random * 1e3:7.1f} ms")
    print(f"1e6 already sorted : {t_sorted * 1e3:7.1f} ms")

    # ---- problems
    section("qselect_demo")
    nums = [7, 2, 9, 4, 5, 1, 8, 6, 3]
    random.seed(3)
    print("a      =", nums)
    p = []

    def spy(a, lo, hi):
        q = partition(a, lo, hi)
        p.append((lo, hi, q))
        return q

    print("median =", quickselect(nums, 4, spy), "(5th smallest)")
    for lo, hi, q in p:
        print(f"window [{lo},{hi}] -> pivot at {q}")
    print("check  =", sorted(nums)[4])

    section("tk_qsel")
    for k, (lo, hi, q) in enumerate(p):
        y = -0.8 * k
        print(rf"\interval{{{y}}}{{{lo}}}{{{hi}}}{{{q}}}{{0.8}}")
        label(y, f"step {k + 1}", -0.5)
    print(rf"\interval{{{-0.8 * len(p)}}}{{4}}{{4}}{{4}}{{0.8}}")
    label(-0.8 * len(p), "answer", -0.5)

    section("inversions_demo")
    print(count_inversions([2, 4, 1, 3, 5]))
    print(count_inversions(list(range(1000, 0, -1)))[1], "for 1000..1 reversed")
    big = random.sample(range(10_000), 2000)
    brute = sum(big[i] > big[j] for i in range(len(big)) for j in range(i + 1, len(big)))
    print(count_inversions(big)[1] == brute, "(matches brute force, n=2000)")

    section("tk_inv")
    inv = tk_inversions([2, 4, 1, 3, 5])
    print(rf"\node[font=\small] at (1.6,-0.9) {{{inv} inversions}};")

    section("kth_demo")
    scores = [31, 77, 45, 12, 88, 64, 50, 93, 27, 70]
    print(kth_largest(scores, 3), kth_largest(scores, 1))
    print(heapq.nlargest(3, scores))
    print(sorted(scores)[-3])

    section("multikey_demo")
    people = [Student("Mai", "B", 8.5), Student("Nam", "A", 7.0), Student("Lan", "B", 8.5),
              Student("Binh", "A", 9.0), Student("Hoa", "B", 7.0), Student("Tuan", "A", 7.0)]
    print(*(s.name for s in one_call(people)))
    print(*(s.name for s in three_passes(people)))
    print(one_call(people) == three_passes(people))

    section("tk_stab")
    tk_stability(people)

    section("mergek_demo")
    lists = [[1, 4, 9, 15], [2, 3, 10], [5, 6, 7, 8, 20]]
    print(merge_k(lists))
    print(merge_k(lists) == list(heapq.merge(*lists)))
    print(merge_k([[], [3], []]))

    section("tk_kway")
    tk_kway(lists)

    section("dutch_demo")
    cs = [2, 0, 2, 1, 1, 0]
    print(sort_colours(list(cs)), "<-", cs)
    random.seed(5)
    ok = all(sort_colours(t := [random.randint(0, 2) for _ in range(30)]) == sorted(t) for _ in range(1000))
    print(ok, "(1000 random tests)")

    section("tk_dutch")
    tk_dutch(cs)

    section("topk_demo")
    text = "to be or not to be that is the question to be is to do"
    print(top_k_words(text, 3))
    print(top_k_words(text, 6)[3:])

    section("topk_data")
    print("word count")
    for w, c in top_k_words(text, 6)[::-1]:
        print(w, c)


if __name__ == "__main__":
    main()
