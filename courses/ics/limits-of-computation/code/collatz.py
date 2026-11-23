# Does this loop always stop? Nobody knows.
def steps(n):
    c = 0
    while n != 1:
        n = n//2 if n % 2 == 0 else 3*n + 1
        c += 1
    return c

for n in (6, 27, 97, 871):
    print(f"n={n:4d} stops after {steps(n):3d} steps")
best = max(range(1, 100000), key=steps)
print("slowest below 100000:", best,
      steps(best), "steps")
