"""A bigram 'parrot': next word depends only on the previous word."""
import random
# >>> parrot
TEXT = """the machine can learn from data . the
machine can play chess . the model can write
text . the model can learn to play games . a
machine can think about data . people can
learn to write ."""
words = TEXT.split()
nxt = {}
for a, b in zip(words, words[1:]):
    nxt.setdefault(a, []).append(b)

def babble(start, n, seed):
    rng = random.Random(seed)
    out = [start]
    for _ in range(n):
        out.append(rng.choice(nxt[out[-1]]))
    return " ".join(out)
# <<< parrot

if __name__ == "__main__":
    print("=== run ===")
    # >>> run
    print("table size:", len(nxt), "words")
    print("after 'can':", sorted(set(nxt["can"])))
    for seed in (3, 4, 5):
        print(babble("the", 8, seed))
    # <<< run
