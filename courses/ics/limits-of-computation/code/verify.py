# Finding is hard, checking is easy.
import random, time, itertools
random.seed(3)
N = 24
nums = [random.randrange(10**6, 10**7)
        for _ in range(N)]
ans = random.sample(range(N), N // 2)
target = sum(nums[i] for i in ans)

def check(sub):             # polynomial time
    return sum(nums[i] for i in sub) == target

t = time.perf_counter(); ok = check(ans)
us = (time.perf_counter() - t) * 1e6
print("check a given answer:", ok,
      f"({us:.0f} microseconds)")

target += 1                 # make it unsolvable
t = time.perf_counter()
for c in itertools.combinations(range(N), 12):
    check(c)
print("search all 2,704,156 subsets:",
      f"{time.perf_counter() - t:.1f} s")
