# The diagonal argument, in code.
def halts(f, x):        # claimed perfect checker
    ...                 # (any implementation)

def para(f):            # built from halts
    if halts(f, f):     # "f(f) stops"?
        while True: pass    # then loop forever
    return              # else stop at once

# Whatever halts(para, para) answers, para
# does the opposite. Try both answers:
for says in (True, False):
    really = not says   # para flips the verdict
    print(f"says halts={says!s:5}, truth="
          f"{really!s:5} ->",
          "right" if says == really else "WRONG")
