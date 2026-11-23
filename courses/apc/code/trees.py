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


# >>> trav_dfs
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
# <<< trav_dfs


# >>> trav_bfs
def level_order(root):
    out, queue = [], deque([root])
    while queue:
        n = queue.popleft()
        if n is not None:
            out.append(n.key)
            queue.append(n.left)
            queue.append(n.right)
    return out
# <<< trav_bfs


# >>> dfs
def dfs(root):
    """Depth-first with an explicit stack."""
    order, stack = [], [root]
    while stack:
        n = stack.pop()
        if n is not None:
            order.append(n.key)
            stack.append(n.right)
            stack.append(n.left)
    return order
# <<< dfs


# >>> bfs
def bfs(root):
    """Breadth-first with a queue."""
    order, queue = [], deque([root])
    while queue:
        n = queue.popleft()
        if n is not None:
            order.append(n.key)
            queue.append(n.left)
            queue.append(n.right)
    return order
# <<< bfs


# >>> dfs_trace
def dfs_trace(root):
    stack = [root]
    while stack:
        n = stack.pop()
        if n is None:
            continue
        print(f"visit {n.key:2}  stack after:", end=" ")
        stack.append(n.right)
        stack.append(n.left)
        print([m.key for m in reversed(stack) if m])
# <<< dfs_trace


# >>> bfs_trace
def bfs_trace(root):
    queue = deque([root])
    while queue:
        n = queue.popleft()
        if n is None:
            continue
        print(f"visit {n.key:2}  queue after:", end=" ")
        queue.append(n.left)
        queue.append(n.right)
        print([m.key for m in queue if m])
# <<< bfs_trace


# >>> rec_size
def size(n):
    if n is None:
        return 0
    return 1 + size(n.left) + size(n.right)
# <<< rec_size


# >>> rec_total
def total(n):
    if n is None:
        return 0
    return n.key + total(n.left) + total(n.right)
# <<< rec_total


# >>> rec_leaves
def leaves(n):
    if n is None:
        return 0
    if n.left is None and n.right is None:
        return 1
    return leaves(n.left) + leaves(n.right)
# <<< rec_leaves


# >>> rec_mirror
def mirror(n):
    if n is None:
        return None
    return Node(n.key, mirror(n.right), mirror(n.left))
# <<< rec_mirror


# >>> rec_path
def has_path_sum(n, target):
    """Is there a root-to-leaf path adding up to target?"""
    if n is None:
        return False
    target -= n.key
    if n.left is None and n.right is None:
        return target == 0
    return (has_path_sum(n.left, target)
            or has_path_sum(n.right, target))
# <<< rec_path


# >>> rec_all
def all_paths(n, path=()):
    if n is None:
        return
    path = (*path, n.key)
    if n.left is None and n.right is None:
        yield path
    yield from all_paths(n.left, path)
    yield from all_paths(n.right, path)
# <<< rec_all


# >>> bst_wrong
def is_bst_wrong(n):
    """Only compares a node with its children."""
    if n is None:
        return True
    if n.left and n.left.key >= n.key:
        return False
    if n.right and n.right.key <= n.key:
        return False
    return is_bst_wrong(n.left) and is_bst_wrong(n.right)
# <<< bst_wrong


# >>> bst_ok
def is_bst(n, lo=None, hi=None):
    """Every key must stay inside (lo, hi)."""
    if n is None:
        return True
    if lo is not None and n.key <= lo:
        return False
    if hi is not None and n.key >= hi:
        return False
    return (is_bst(n.left, lo, n.key)
            and is_bst(n.right, n.key, hi))
# <<< bst_ok


# >>> is_bst2
def is_bst_inorder(root):
    keys = inorder(root)
    return all(a < b for a, b in zip(keys, keys[1:]))
# <<< is_bst2


# >>> h_diam
def diameter(root):
    """Edges on the longest path between two nodes."""
    best = 0

    def depth(n):
        nonlocal best
        if n is None:
            return 0
        left, right = depth(n.left), depth(n.right)
        best = max(best, left + right)
        return 1 + max(left, right)

    depth(root)
    return best
# <<< h_diam


# >>> h_lca
def lca(root, p, q):
    """Lowest common ancestor in a BST."""
    while root:
        if p < root.key and q < root.key:
            root = root.left
        elif p > root.key and q > root.key:
            root = root.right
        else:
            return root.key
# <<< h_lca


# >>> h_kth
def kth_smallest(root, k):
    stack = []
    while stack or root:
        while root:
            stack.append(root)
            root = root.left
        root = stack.pop()
        k -= 1
        if k == 0:
            return root.key
        root = root.right
# <<< h_kth


# >>> h_levels
def levels(root):
    """Keys grouped by depth."""
    out, row = [], [root]
    while row:
        out.append([n.key for n in row])
        row = [c for n in row
               for c in (n.left, n.right) if c]
    return out
# <<< h_levels


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

    section("dfs_bfs_demo")
    wide = build([50, 30, 70, 20, 40, 60, 80, 35, 45])
    print("dfs", dfs(wide))
    print("bfs", bfs(wide))

    section("dfs_trace_demo")
    small = build([50, 30, 70, 20, 40])
    dfs_trace(small)

    section("bfs_trace_demo")
    bfs_trace(small)

    section("rec_demo")
    print("size   ", size(balanced))
    print("total  ", total(balanced))
    print("leaves ", leaves(balanced))
    print("mirror ", inorder(mirror(balanced)))
    print("path 130?", has_path_sum(balanced, 130))
    print("path 100?", has_path_sum(balanced, 100))
    for path in all_paths(small):
        print(path)

    section("is_bst_demo")
    fake = Node(50, Node(30, Node(20), Node(60)),
                Node(70))
    print("wrong check says:", is_bst_wrong(fake))
    print("bounds check says:", is_bst(fake))
    print("inorder check says:", is_bst_inorder(fake))
    print("real BST:", is_bst(balanced),
          is_bst_inorder(balanced))

    section("hard_demo")
    print("diameter    ", diameter(wide))
    print("lca(35, 45) ", lca(wide, 35, 45))
    print("lca(20, 45) ", lca(wide, 20, 45))
    print("lca(20, 80) ", lca(wide, 20, 80))
    print("3rd smallest", kth_smallest(wide, 3))
    print("levels      ", levels(wide))

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
