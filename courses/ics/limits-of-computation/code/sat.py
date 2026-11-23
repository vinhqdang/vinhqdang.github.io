# A tiny SAT solver (DPLL) on random 3-SAT.
import random

def sat_by(a, l):
    return a.get(abs(l)) == (l > 0)

def dpll(clauses, a, st):
    st["calls"] += 1
    a = dict(a)
    changed = True
    while changed:                    # unit rule
        changed = False
        for cl in clauses:
            if any(sat_by(a, l) for l in cl):
                continue
            free = [l for l in cl if abs(l) not in a]
            if not free: return None  # conflict
            if len(free) == 1:
                a[abs(free[0])] = free[0] > 0
                changed = True
    left = [c for c in clauses
            if not any(sat_by(a, l) for l in c)]
    if not left: return a
    v = next(abs(l) for l in left[0]
             if abs(l) not in a)
    for val in (True, False):         # branch
        r = dpll(clauses, {**a, v: val}, st)
        if r: return r
    return None

def rand3(n, m, rng):
    return [[rng.choice((-1, 1)) * v
             for v in rng.sample(range(1, n+1), 3)]
            for _ in range(m)]

if __name__ == "__main__":
    rng = random.Random(7)
    ex = [[1, 2], [-1, 3], [-2, -3], [2, 3]]
    print("tiny example:", dpll(ex, {}, {"calls": 0}))
    print("n   m/n  sat?  DPLL calls   2^n")
    for n in (20, 40, 60, 80):
        for ratio in (3.0, 4.3, 6.0):
            st = {"calls": 0}
            f = rand3(n, int(ratio * n), rng)
            r = dpll(f, {}, st)
            print(f"{n:<3d} {ratio:<4} "
                  f"{'yes' if r else 'no':<5}"
                  f"{st['calls']:>9}   {2**n:.0e}")
