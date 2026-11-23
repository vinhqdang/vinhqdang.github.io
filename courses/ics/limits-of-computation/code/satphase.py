# Random 3-SAT: where is the hard region?
import random
from sat import dpll, rand3

rng = random.Random(11)
N, TRIALS = 50, 20
print(f"n={N}, {TRIALS} formulas per ratio")
print("m/n   solved   mean DPLL calls")
with open("../out/satphase.dat", "w") as f:
    f.write("ratio calls sat\n")
    for k in range(8, 29):
        ratio = k / 4
        calls = sats = 0
        for _ in range(TRIALS):
            st = {"calls": 0}
            r = dpll(rand3(N, int(ratio * N), rng),
                     {}, st)
            calls += st["calls"]
            sats += bool(r)
        f.write(f"{ratio} {calls/TRIALS} "
                f"{sats/TRIALS}\n")
        if k % 4 == 0 or k == 17:
            print(f"{ratio:<5} {sats/TRIALS:>5.0%}"
                  f"   {calls/TRIALS:>10.1f}")
