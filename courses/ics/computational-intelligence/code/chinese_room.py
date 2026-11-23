"""A Chinese Room in a dozen lines: look up symbols, never read them."""
# >>> room
BOOK = {
  "ni hao": "ni hao, ni hao ma",
  "ni hao ma": "wo hen hao, xie xie",
  "ni jiao shenme": "wo jiao Lao Wang",
  "zai jian": "zai jian",
}
DEFAULT = "qing zai shuo yi bian"

def room(slip):
    # the operator only matches shapes
    return BOOK.get(slip, DEFAULT)
# <<< room

if __name__ == "__main__":
    print("=== run ===")
    # >>> run
    slips = ["ni hao ma", "ni jiao shenme",
             "zai jian", "jintian tianqi zenme yang"]
    for slip in slips:
        print(f"in : {slip}")
        print(f"out: {room(slip)}")
    # <<< run
    print("=== stats ===")
    # >>> stats
    print("rules in the book:", len(BOOK))
    print("meaning used by room():", 0)
    # <<< stats
