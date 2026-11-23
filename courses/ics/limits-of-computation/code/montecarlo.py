# Coin flips as a tool: estimate pi by darts.
import random
random.seed(5)
print("darts      estimate   error")
with open("../out/mc.dat", "w") as f:
    f.write("n err\n")
    for k in range(1, 7):
        n = 10 ** k
        hit = sum(random.random() ** 2 +
                  random.random() ** 2 < 1
                  for _ in range(n))
        est = 4 * hit / n
        err = abs(est - 3.141592653589793)
        f.write(f"{n} {err:.6g}\n")
        print(f"{n:<9d} {est:.5f}   {err:.5f}")
