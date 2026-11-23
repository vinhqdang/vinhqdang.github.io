# Multiplying is easy. Factoring is not (yet).
import time

def factor(n):                    # trial division
    d = 2
    while d * d <= n:
        if n % d == 0: return d
        d += 1
    return n

for p, q in ((1009, 1013), (100003, 100019),
             (10000019, 10000079),
             (100000007, 100000037)):  # primes
    t = time.perf_counter(); n = p * q
    mul = time.perf_counter() - t
    t = time.perf_counter(); d = factor(n)
    fac = time.perf_counter() - t
    print(f"{len(str(n)):>2} digits  multiply "
          f"{mul*1e6:5.1f} us   factor {fac:8.3f} s")
