"""A tiny ELIZA-style chatbot: pattern + template, no understanding."""
# >>> eliza
import re
SWAP = {"i": "you", "my": "your", "am": "are",
        "me": "you", "you": "I", "your": "my"}
RULES = [
  (r"i need (.*)", "Why do you need {}?"),
  (r"i am (.*)", "Why are you {}?"),
  (r"i feel (.*)", "Do you often feel {}?"),
  (r".*\bmother\b.*", "Tell me about your family."),
  (r".*", "Please go on."),
]
def reflect(text):
    words = text.split()
    return " ".join(SWAP.get(w, w) for w in words)
def reply(line):
    line = line.lower().strip(".!? ")
    for pat, resp in RULES:
        m = re.fullmatch(pat, line)
        if m:
            args = [reflect(g) for g in m.groups()]
            return resp.format(*args)
# <<< eliza

if __name__ == "__main__":
    print("=== talk ===")
    # >>> talk
    for s in ["I am sad about my exam",
              "I need a holiday",
              "I feel nobody listens to me",
              "My mother calls every day",
              "Do you understand me?"]:
        print("You:  ", s)
        print("ELIZA:", reply(s))
    # <<< talk
