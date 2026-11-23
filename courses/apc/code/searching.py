"""Searching: linear search, binary search, bisect and binary search on the answer.

Run with:  python3.14 searching.py
"""
import math
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


# >>> lower
def lower_bound(items, target):
    """First i with items[i] >= target."""
    lo, hi = 0, len(items)
    while lo < hi:
        mid = (lo + hi) // 2
        if items[mid] < target:
            lo = mid + 1
        else:
            hi = mid        # mid may be it
    return lo
# <<< lower


# >>> first_last
def first_last(items, target):
    """(first, last) index, or (-1, -1)."""
    first = lower_bound(items, target)
    if (first == len(items)
            or items[first] != target):
        return -1, -1
    last = lower_bound(items, target + 1) - 1
    return first, last
# <<< first_last


# >>> first_true
def first_true(lo, hi, ok):
    """Smallest x in [lo, hi] with ok(x).

    ok is monotone: False..False True..True
    and ok(hi) is True.
    """
    while lo < hi:
        mid = (lo + hi) // 2
        if ok(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo
# <<< first_true


# >>> isqrt
def int_sqrt(n):
    """Largest r with r * r <= n."""
    first = first_true(
        0, n + 1, lambda x: x * x > n)
    return first - 1
# <<< isqrt


# >>> ship
def days_needed(weights, cap):
    days, load = 1, 0
    for w in weights:
        if load + w > cap:   # new day
            days += 1
            load = 0
        load += w
    return days


def min_capacity(weights, days):
    def ok(cap):
        need = days_needed(weights, cap)
        return need <= days
    return first_true(max(weights),
                      sum(weights), ok)
# <<< ship


# >>> rotated
def search_rotated(a, target):
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == target:
            return mid
        if a[lo] <= a[mid]:      # left sorted
            if a[lo] <= target < a[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:                    # right sorted
            if a[mid] < target <= a[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1
# <<< rotated


# >>> peak
def find_peak(a):
    """Index of a peak (>= its neighbours)."""
    lo, hi = 0, len(a) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if a[mid] < a[mid + 1]:
            lo = mid + 1     # uphill: go right
        else:
            hi = mid         # peak at mid or left
    return lo
# <<< peak


# >>> twosum
def two_sum_sorted(a, target):
    """i < j with a[i] + a[j] == target."""
    i, j = 0, len(a) - 1
    while i < j:
        s = a[i] + a[j]
        if s == target:
            return i, j
        if s < target:
            i += 1             # need more
        else:
            j -= 1             # need less
    return None
# <<< twosum


# >>> describe
def describe(pair):
    match pair:
        case (i, j):
            return f"positions {i} and {j}"
        case None:
            return "no pair"
# <<< describe


# ---------------------------------------------------------------- helpers (not shown on slides)
W, A, GREY = "white", "tdAmber!45", "tdLine!55"
GOOD, BAD = "tdGreen!35", "tdRed!25"
STEP = 0.8


def cells(y, vals, cols, x0=0.0, style="cell", step=STEP):
    spec = ",".join(f"{v}/{c}" for v, c in zip(vals, cols))
    print(rf"\cellsx{{{style}}}{{{step}}}{{{x0}}}{{{y}}}{{{spec}}}")


def label(y, text, x=-0.6):
    print(rf"\rl{{{x}}}{{{y}}}{{{text}}}")


def note(x, y, text, color="tdMuted"):
    print(rf"\rn{{{x}}}{{{y}}}{{{text}}}{{{color}}}")


def ptr(i, y, text, above=False, x0=0.0, step=STEP, color="tdBlue"):
    print(rf"\ptr{{{x0 + i * step}}}{{{y}}}{{{text}}}{{{1 if above else -1}}}{{{color}}}")


def bs_steps(items, target):
    lo, hi = 0, len(items) - 1
    steps = []
    while lo <= hi:
        mid = (lo + hi) // 2
        steps.append((lo, hi, mid))
        if items[mid] == target:
            return steps
        if items[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    steps.append((lo, hi, None))
    return steps


def tk_binary(items, target):
    n = len(items)
    steps = bs_steps(items, target)
    for k, (lo, hi, mid) in enumerate(steps):
        y = -1.6 * k
        cols = [W if lo <= t <= hi else GREY for t in range(n)]
        if mid is not None:
            cols[mid] = GOOD if items[mid] == target else A
        cells(y, items, cols)
        label(y, f"step {k + 1}" if mid is not None else "end")
        x = n * STEP - 0.3
        if mid is None:
            note(x, y, f"lo={lo} > hi={hi}: window empty, not found", "tdRed")
            ptr(min(lo, n - 1), y, f"lo={lo}")
            continue
        names = {}
        names.setdefault(lo, []).append("lo")
        names.setdefault(hi, []).append("hi")
        for idx, nm in names.items():
            ptr(idx, y, ",".join(nm))
        ptr(mid, y, "mid", above=True, color="tdAmber!70!black")
        v = items[mid]
        if v == target:
            note(x, y, f"${v}={target}$: found!", "tdGreen!70!black")
        elif v < target:
            note(x, y, f"${v}<{target}$: go right")
        else:
            note(x, y, f"${v}>{target}$: go left")


def lower_steps(items, target):
    lo, hi = 0, len(items)
    steps = []
    while lo < hi:
        mid = (lo + hi) // 2
        steps.append((lo, hi, mid))
        if items[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    steps.append((lo, hi, None))
    return steps


def tk_lower(items, target):
    n = len(items)
    for k, (lo, hi, mid) in enumerate(lower_steps(items, target)):
        y = -1.5 * k
        cols = [W if lo <= t < hi else GREY for t in range(n)]
        if mid is not None:
            cols[mid] = A
        else:
            cols[lo] = GOOD
        cells(y, items, cols)
        label(y, f"step {k + 1}" if mid is not None else "result")
        for xx, color in ((lo, "tdBlue"), (hi, "tdRed")):
            xpos = xx * STEP - STEP / 2
            print(rf"\draw[{color},very thick] ({xpos},{y - 0.42}) -- ({xpos},{y + 0.42});")
        print(rf"\node[font=\tiny,text=tdBlue] at ({lo * STEP - STEP / 2},{y - 0.6}) {{lo}};")
        print(rf"\node[font=\tiny,text=tdRed] at ({hi * STEP - STEP / 2},{y - 0.6}) {{hi}};")
        x = n * STEP + 0.2
        if mid is None:
            note(x, y, f"lo = hi = {lo}: first index with value $\\geq {target}$", "tdGreen!70!black")
        else:
            ptr(mid, y, "mid", above=True, color="tdAmber!70!black")
            if items[mid] < target:
                note(x, y, f"${items[mid]}<{target}$: lo = mid+1")
            else:
                note(x, y, f"${items[mid]}\\geq{target}$: hi = mid")


def spy_first_true(lo, hi, ok):
    """Run first_true and record (lo, hi, mid, result) of every step."""
    log = []
    state = [lo, hi]

    def spy(x):
        r = ok(x)
        log.append((state[0], state[1], x, r))
        if r:
            state[1] = x
        else:
            state[0] = x + 1
        return r

    answer = first_true(lo, hi, spy)
    return answer, log


def tk_answer(lo, hi, ok, unit, mark=None):
    answer, log = spy_first_true(lo, hi, ok)
    for k, (l, h, mid, r) in enumerate(log):
        y = -0.85 * k
        print(rf"\fill[tdBlue!15] ({l * unit - 0.1},{y - 0.17}) rectangle ({h * unit + 0.1},{y + 0.17});")
        print(rf"\fill[{'tdRed' if r else 'tdGreen'}] ({mid * unit},{y}) circle (0.11);")
        label(y, f"step {k + 1}", -0.2)
        note(hi * unit + 0.4, y, f"mid={mid}: {'yes' if r else 'no'}", "tdRed!80!black" if r else "tdGreen!70!black")
    yb = -0.85 * len(log)
    print(rf"\fill[tdAmber] ({answer * unit},{yb}) circle (0.14);")
    label(yb, "answer", -0.2)
    note(hi * unit + 0.4, yb, f"first true: {answer}", "tdAmber!70!black")
    if mark is not None:
        print(rf"\draw[tdInk,dashed] ({mark * unit},0.4) -- ({mark * unit},{yb - 0.3});")
    # axis
    print(rf"\draw[tdMuted] ({lo * unit},{yb - 0.55}) -- ({hi * unit},{yb - 0.55});")
    for v in range(lo, hi + 1, 10):
        print(rf"\node[font=\tiny,text=tdMuted] at ({v * unit},{yb - 0.8}) {{{v}}};")
    return answer


def rotated_steps(a, target):
    lo, hi = 0, len(a) - 1
    steps = []
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == target:
            steps.append((lo, hi, mid, None, "found"))
            return steps
        if a[lo] <= a[mid]:
            if a[lo] <= target < a[mid]:
                steps.append((lo, hi, mid, "L", "left sorted, target inside: go left"))
                hi = mid - 1
            else:
                steps.append((lo, hi, mid, "L", "left sorted, target outside: go right"))
                lo = mid + 1
        else:
            if a[mid] < target <= a[hi]:
                steps.append((lo, hi, mid, "R", "right sorted, target inside: go right"))
                lo = mid + 1
            else:
                steps.append((lo, hi, mid, "R", "right sorted, target outside: go left"))
                hi = mid - 1
    return steps


def tk_rotated(a, target):
    n = len(a)
    for k, (lo, hi, mid, side, text) in enumerate(rotated_steps(a, target)):
        y = -1.5 * k
        cols = [W if lo <= t <= hi else GREY for t in range(n)]
        if side == "L":
            for t in range(lo, mid + 1):
                cols[t] = "tdBlue!18"
        elif side == "R":
            for t in range(mid, hi + 1):
                cols[t] = "tdBlue!18"
        cols[mid] = GOOD if a[mid] == target else A
        cells(y, a, cols)
        label(y, f"step {k + 1}")
        names = {}
        names.setdefault(lo, []).append("lo")
        names.setdefault(hi, []).append("hi")
        for idx, nm in names.items():
            ptr(idx, y, ",".join(nm))
        ptr(mid, y, "mid", above=True, color="tdAmber!70!black")
        note(n * STEP - 0.3, y, f"{a[mid]}: {text}" if side else f"{a[mid]} = {target}: found!",
             "tdGreen!70!black" if not side else "tdMuted")


def peak_steps(a):
    lo, hi = 0, len(a) - 1
    steps = []
    while lo < hi:
        mid = (lo + hi) // 2
        up = a[mid] < a[mid + 1]
        steps.append((lo, hi, mid, up))
        if up:
            lo = mid + 1
        else:
            hi = mid
    steps.append((lo, hi, lo, None))
    return steps


def tk_peak(a):
    u, hs = 0.9, 0.3
    for i, v in enumerate(a):
        print(rf"\fill[tdBlue!35,draw=tdBlue!70] ({i * u - 0.3},0) rectangle ({i * u + 0.3},{v * hs});")
        print(rf"\node[font=\tiny] at ({i * u},-0.25) {{{v}}};")
    for k, (lo, hi, mid, up) in enumerate(peak_steps(a)):
        y = -1.0 - 0.8 * k
        print(rf"\fill[tdBlue!15] ({lo * u - 0.35},{y - 0.17}) rectangle ({hi * u + 0.35},{y + 0.17});")
        if up is None:
            print(rf"\fill[tdGreen] ({lo * u},{y}) circle (0.13);")
            note(len(a) * u, y, f"lo = hi = {lo}: peak {a[lo]}", "tdGreen!70!black")
            label(y, "result", -0.5)
            print(rf"\fill[tdGreen!35,draw=tdGreen!70] ({lo * u - 0.3},0) rectangle ({lo * u + 0.3},{a[lo] * hs});")
            continue
        print(rf"\fill[tdAmber] ({mid * u},{y}) circle (0.11);")
        label(y, f"step {k + 1}", -0.5)
        if up:
            print(rf"\draw[->,thick,tdGreen!70!black] ({mid * u},{y + 0.02}) -- ({(mid + 1) * u},{y + 0.02});")
            note(len(a) * u, y, f"a[{mid}]={a[mid]} < a[{mid + 1}]={a[mid + 1]}: uphill, lo = {mid + 1}")
        else:
            print(rf"\draw[->,thick,tdRed] ({mid * u},{y + 0.02}) -- ({(mid + 1) * u},{y + 0.02});")
            note(len(a) * u, y, f"a[{mid}]={a[mid]} >= a[{mid + 1}]={a[mid + 1]}: downhill, hi = {mid}")


def tk_twosum(a, target):
    i, j = 0, len(a) - 1
    n = len(a)
    k = 0
    while i < j:
        y = -1.3 * k
        s = a[i] + a[j]
        cols = [W] * n
        for t in range(n):
            if t < i or t > j:
                cols[t] = GREY
        cols[i] = cols[j] = GOOD if s == target else A
        cells(y, a, cols)
        label(y, f"step {k + 1}")
        ptr(i, y, "i")
        ptr(j, y, "j")
        x = n * STEP - 0.3
        if s == target:
            note(x, y, f"${a[i]}+{a[j]}={s}$: found!", "tdGreen!70!black")
            return
        if s < target:
            note(x, y, f"${a[i]}+{a[j]}={s}<{target}$: i moves right")
            i += 1
        else:
            note(x, y, f"${a[i]}+{a[j]}={s}>{target}$: j moves left")
            j -= 1
        k += 1


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

    section("tk_found")
    tk_binary(data, 47)
    section("tk_missing")
    tk_binary(data, 20)

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

    # ------------------------------------------------ problems
    dup = [1, 2, 2, 2, 2, 3, 5, 5, 8]
    section("tk_lower")
    tk_lower(dup, 2)

    section("firstlast_demo")
    print("a =", dup)
    for t in (2, 5, 4):
        f, l = first_last(dup, t)
        count = l - f + 1 if f >= 0 else 0
        print(f"target {t}: first={f:2} last={l:2} count={count}")
    print(all(first_last(dup, t) == ((bisect_left(dup, t), bisect_right(dup, t) - 1) if t in dup else (-1, -1))
              for t in range(10)), "(matches bisect)")

    section("isqrt_demo")
    for n in (0, 1, 50, 99, 10 ** 12 + 5):
        print(f"int_sqrt({n}) = {int_sqrt(n)}")
    print(all(int_sqrt(n) == math.isqrt(n) for n in range(2000)), "(matches math.isqrt, n < 2000)")

    section("tk_isqrt")
    tk_answer(0, 51, lambda r: r * r > 50, 0.12, mark=50 ** 0.5 + 1)

    weights = list(range(1, 11))
    section("ship_demo")
    print("weights 1..10, days 5")
    print("min capacity:", min_capacity(weights, 5))
    for cap in (14, 15):
        print(f"capacity {cap}: {days_needed(weights, cap)} days")
    print("another:", min_capacity([3, 2, 2, 4, 1, 4], 3), "(days 3)")
    ans, log = spy_first_true(max(weights), sum(weights), lambda c: days_needed(weights, c) <= 5)
    for lo, hi, mid, ok in log:
        print(f"[{lo:2},{hi:2}] try {mid:2}: {days_needed(weights, mid)} days -> {'ok' if ok else 'too slow'}")

    section("ship_data")
    print("cap days")
    for cap in range(10, 56):
        print(cap, days_needed(weights, cap))

    rot = [15, 18, 22, 27, 3, 5, 9, 12]
    section("tk_rotated")
    tk_rotated(rot, 9)

    section("rotated_demo")
    print("a =", rot)
    for t in (9, 18, 3, 10):
        print(f"search_rotated(a, {t:2}) = {search_rotated(rot, t)}")
    ok = True
    for n in range(1, 12):
        base = list(range(0, 3 * n, 3))
        for r in range(n):
            arr = base[r:] + base[:r]
            for t in range(-1, 3 * n + 1):
                want = arr.index(t) if t in arr else -1
                ok &= search_rotated(arr, t) == want
    print(ok, "(all rotations of sizes 1..11)")

    peaks = [1, 5, 3, 8, 12, 10, 4, 6, 2]
    section("tk_peak")
    tk_peak(peaks)

    section("peak_demo")
    for arr in (peaks, [1, 2, 3, 4], [9, 4, 1], [7]):
        i = find_peak(arr)
        print(f"{arr} -> index {i}")
    ok = True
    random.seed(4)
    for _ in range(1000):
        arr = [random.randint(0, 9) for _ in range(random.randint(1, 12))]
        arr = [v for k, v in enumerate(arr) if k == 0 or v != arr[k - 1]]
        i = find_peak(arr)
        ok &= (i == 0 or arr[i - 1] <= arr[i]) and (i == len(arr) - 1 or arr[i + 1] <= arr[i])
    print(ok, "(1000 random arrays)")

    pairs = [1, 3, 4, 6, 8, 11, 15]
    section("tk_twosum")
    tk_twosum(pairs, 14)

    section("twosum_demo")
    print("a =", pairs)
    for t in (14, 10, 2, 30):
        print(f"target {t:2}: {describe(two_sum_sorted(pairs, t))}")


if __name__ == "__main__":
    main()
