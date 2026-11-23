# Growth table + data for the plots.
import math
rate = 1e9   # operations per second

def fmt(s):
    for u, k in (("yr", 3.15e7), ("day", 86400),
                 ("h", 3600), ("s", 1)):
        if s >= k: return f"{s/k:.3g} {u}"
    return f"{s:.1g} s"

print(f"{'n':>3}{'n^2':>10}{'n^3':>10}"
      f"{'2^n':>12}{'n!':>14}")
for n in (10, 20, 30, 50, 70):
    print(f"{n:3d}{fmt(n**2/rate):>10}"
          f"{fmt(n**3/rate):>10}"
          f"{fmt(2.0**n/rate):>12}"
          f"{fmt(math.factorial(n)/rate):>14}")
print("(1e9 operations per second)")
with open("../out/growth.dat", "w") as f:
    f.write("n lin nlogn sq cube exp\n")
    for n in range(1, 31):
        f.write(f"{n} {n} {n*math.log2(n):.4g} "
                f"{n*n} {n**3} {2**n}\n")
