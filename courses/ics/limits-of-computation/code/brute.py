# Brute force: cost doubles with each new item.
import itertools, random, time

def subset_sum(nums, target):
    for r in range(len(nums) + 1):
        for c in itertools.combinations(nums, r):
            if sum(c) == target: return c

def lit(bits, l):
    return (bits[abs(l) - 1] == 1) == (l > 0)

def sat_brute(n, clauses):
    for bits in itertools.product([0, 1], repeat=n):
        if all(any(lit(bits, l) for l in cl)
               for cl in clauses):
            return bits

def tsp(d):
    best = 1e18
    for p in itertools.permutations(range(1, len(d))):
        t = [0, *p, 0]
        best = min(best, sum(d[a][b]
                   for a, b in zip(t, t[1:])))
    return best

def clock(f, *a):
    t0 = time.perf_counter(); f(*a)
    return time.perf_counter() - t0

if __name__ == "__main__":
    random.seed(1)
    ss, sat, tp = [], [], []
    for n in range(8, 23, 2):      # worst case:
        v = [random.randrange(10, 9999)
             for _ in range(n)]    # no answer
        ss.append((n, clock(subset_sum, v,
                            sum(v) + 1)))
    for n in range(8, 21, 2):      # unsatisfiable
        sat.append((n, clock(sat_brute, n,
                             [[1], [-1]])))
    for m in range(5, 11):         # m cities
        d = [[random.randint(1, 99)
              for _ in range(m)] for _ in range(m)]
        tp.append((m, clock(tsp, d)))
    print("n   subset-sum   SAT      cities  TSP")
    for i in range(8):
        a = ss[i]
        b = f"{sat[i][1]:8.4f} s" if i < len(sat) else " " * 10
        c = (f"{tp[i][0]:<4d}{tp[i][1]:8.4f} s"
             if i < len(tp) else "")
        print(f"{a[0]:<3d}{a[1]:8.4f} s {b}  {c}")
    for name, rows in (("ss", ss), ("sat", sat),
                       ("tsp", tp)):
        with open(f"../out/{name}.dat", "w") as f:
            f.write("n t\n")
            for n, t in rows:
                f.write(f"{n} {t:.6g}\n")
