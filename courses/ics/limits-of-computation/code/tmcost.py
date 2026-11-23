# How many TM steps does the palindrome test take?
from tm import run, pal, inc

print("len  palindrome steps  increment steps")
with open("../out/tmcost.dat", "w") as f:
    f.write("n pal inc\n")
    for n in range(1, 31):
        w = "a" * n                     # a palindrome
        s1 = run(pal, w)[1]
        s2 = run(inc, "1" * n)[1]       # worst carry
        f.write(f"{n} {s1} {s2}\n")
        if n in (2, 4, 8, 16, 30):
            print(f"{n:<4d} {s1:>10d} {s2:>17d}")
