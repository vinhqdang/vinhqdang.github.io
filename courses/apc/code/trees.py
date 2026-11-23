"""Trees: binary search trees, traversals, expression trees and heaps.

Run with:  python3.14 trees.py
"""
import heapq
import random
import sys
from collections import deque
from dataclasses import dataclass


def section(name: str) -> None:
    print(f"=== {name} ===")


# >>> node
@dataclass(slots=True)
class Node:
    key: int
    left: Node | None = None
    right: Node | None = None
# <<< node


# >>> bst
def insert(root, key):
    if root is None:
        return Node(key)
    if key < root.key:
        root.left = insert(root.left, key)
    elif key > root.key:
        root.right = insert(root.right, key)
    return root


def search(root, key):
    while root is not None:
        if key == root.key:
            return True
        if key < root.key:
            root = root.left
        else:
            root = root.right
    return False
# <<< bst


# >>> build
def build(keys):
    root = None
    for k in keys:
        root = insert(root, k)
    return root
# <<< build


# >>> traversals
def preorder(n):
    if n is None:
        return []
    return [n.key, *preorder(n.left), *preorder(n.right)]


def inorder(n):
    if n is None:
        return []
    return [*inorder(n.left), n.key, *inorder(n.right)]


def postorder(n):
    if n is None:
        return []
    return [*postorder(n.left), *postorder(n.right), n.key]


def level_order(root):
    out, queue = [], deque([root])
    while queue:
        n = queue.popleft()
        if n is not None:
            out.append(n.key)
            queue.append(n.left)
            queue.append(n.right)
    return out
# <<< traversals


# >>> height
def height(n):
    if n is None:
        return 0
    return 1 + max(height(n.left), height(n.right))
# <<< height


# >>> expr
def evaluate(e):
    match e:
        case int() | float():
            return e
        case ("+", a, b):
            return evaluate(a) + evaluate(b)
        case ("-", a, b):
            return evaluate(a) - evaluate(b)
        case ("*", a, b):
            return evaluate(a) * evaluate(b)
# <<< expr


# >>> heap
tasks = []
heapq.heappush(tasks, (3, "write report"))
heapq.heappush(tasks, (1, "fix bug"))
heapq.heappush(tasks, (2, "reply email"))
urgent = heapq.heappop(tasks)
# <<< heap


def steps_to_find(root, key):
    steps = 0
    while root is not None:
        steps += 1
        if key == root.key:
            break
        root = root.left if key < root.key else root.right
    return steps


def main() -> None:
    section("version")
    print(f"Python {sys.version.split()[0]}")

    section("bst_demo")
    balanced = build([50, 30, 70, 20, 40, 60, 80])
    print("search 60:", search(balanced, 60))
    print("search 65:", search(balanced, 65))
    print("sorted:", inorder(balanced))

    section("traversal_demo")
    print("preorder  ", preorder(balanced))
    print("inorder   ", inorder(balanced))
    print("postorder ", postorder(balanced))
    print("level     ", level_order(balanced))

    section("height_demo")
    chain = build([10, 20, 30, 40, 50, 60, 70])
    print(f"balanced: height {height(balanced)}, find 80 in {steps_to_find(balanced, 80)} steps")
    print(f"chain   : height {height(chain)}, find 70 in {steps_to_find(chain, 70)} steps")

    section("height_scale")
    random.seed(3)
    keys = random.sample(range(10**6), 100_000)
    t = build(keys)
    print(f"{len(keys):,} random keys: height {height(t)}")
    print("perfectly balanced: height 17")

    section("expr_demo")
    e = ("*", ("+", 3, 4), ("-", 10, 2))
    print(e)
    print("value:", evaluate(e))

    section("heap_demo")
    print("popped:", urgent)
    print("left  :", [name for _, name in tasks])
    h = [5, 3, 8, 1, 9, 2]
    print("start    ", h)
    heapq.heapify(h)
    print("heapified", h)
    print("pop order", [heapq.heappop(h) for _ in range(len(h))])


if __name__ == "__main__":
    sys.setrecursionlimit(10_000)
    main()
