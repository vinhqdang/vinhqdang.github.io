"""Graphs: representation, BFS, DFS, connected components and Dijkstra.

Run with:  python3.14 graphs.py
"""
import heapq
import sys


def section(name: str) -> None:
    print(f"=== {name} ===")


# >>> representation
graph = {
    "Gate": ["Lib", "Cafe"],
    "Lib":  ["Gate", "Lab", "Dorm"],
    "Cafe": ["Gate", "Dorm"],
    "Lab":  ["Lib", "Gym"],
    "Dorm": ["Lib", "Cafe", "Gym"],
    "Gym":  ["Lab", "Dorm"],
}
# <<< representation


# >>> matrix
names = list(graph)
index = {n: i for i, n in enumerate(names)}
matrix = [[0] * len(names) for _ in names]
for u, nbrs in graph.items():
    for v in nbrs:
        matrix[index[u]][index[v]] = 1
# <<< matrix


# >>> bfs
from collections import deque


def bfs(graph, start):
    parent = {start: None}
    queue = deque([start])
    order = []
    while queue:
        u = queue.popleft()
        order.append(u)
        for v in graph[u]:
            if v not in parent:
                parent[v] = u
                queue.append(v)
    return order, parent
# <<< bfs


# >>> path
def path_to(parent, target):
    path = []
    while target is not None:
        path.append(target)
        target = parent[target]
    return path[::-1]
# <<< path


# >>> dfs
def dfs(graph, u, seen=None):
    if seen is None:
        seen = []
    seen.append(u)
    for v in graph[u]:
        if v not in seen:
            dfs(graph, v, seen)
    return seen
# <<< dfs


# >>> components
def components(graph):
    seen, result = set(), []
    for start in graph:
        if start not in seen:
            comp = dfs(graph, start)
            seen.update(comp)
            result.append(comp)
    return result
# <<< components


# >>> weighted
roads = {
    "Gate": {"Lib": 4, "Cafe": 2},
    "Lib":  {"Gate": 4, "Lab": 5, "Dorm": 6},
    "Cafe": {"Gate": 2, "Dorm": 3},
    "Lab":  {"Lib": 5, "Gym": 6},
    "Dorm": {"Lib": 6, "Cafe": 3, "Gym": 2},
    "Gym":  {"Lab": 6, "Dorm": 2},
}
# <<< weighted


# >>> dijkstra
from heapq import heappop, heappush

INF = float("inf")

def dijkstra(roads, start):
    dist = {start: 0}
    parent = {start: None}
    heap = [(0, start)]
    while heap:
        d, u = heappop(heap)
        if d > dist[u]:
            continue
        for v, w in roads[u].items():
            nd = d + w
            if nd < dist.get(v, INF):
                dist[v] = nd
                parent[v] = u
                heappush(heap, (nd, v))
    return dist, parent
# <<< dijkstra


# >>> dfs_iter
def dfs_iter(graph, start):
    seen, order, stack = set(), [], [start]
    while stack:
        u = stack.pop()
        if u in seen:
            continue
        seen.add(u)
        order.append(u)
        stack.extend(reversed(graph[u]))
    return order
# <<< dfs_iter


# >>> dfs_times
def dfs_times(graph, start):
    clock = 0
    found, done = {}, {}

    def visit(u):
        nonlocal clock
        clock += 1
        found[u] = clock
        for v in graph[u]:
            if v not in found:
                visit(v)
        clock += 1
        done[u] = clock

    visit(start)
    return found, done
# <<< dfs_times


# >>> cycle
def find_cycle(graph):
    state, path = {}, []   # 1 = on path, 2 = finished

    def visit(u):
        state[u] = 1
        path.append(u)
        for v in graph[u]:
            if state.get(v) == 1:
                return path[path.index(v):] + [v]
            if v not in state and (c := visit(v)):
                return c
        state[u] = 2
        path.pop()

    for u in graph:
        if u not in state and (c := visit(u)):
            return c
    return None
# <<< cycle


# >>> kahn
def topo_sort(graph):
    indeg = {u: 0 for u in graph}
    for u in graph:
        for v in graph[u]:
            indeg[v] += 1
    ready = deque(u for u, d in indeg.items()
                  if d == 0)
    order = []
    while ready:
        u = ready.popleft()
        order.append(u)
        for v in graph[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                ready.append(v)
    if len(order) < len(graph):
        return None
    return order
# <<< kahn


# >>> grid4
def grid_neighbours(grid, r, c):
    for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nr, nc = r + dr, c + dc
        if 0 <= nr < len(grid) and 0 <= nc < len(grid[0]):
            yield nr, nc
# <<< grid4


# >>> islands
def islands(grid):
    label = {}
    for r0, row in enumerate(grid):
        for c0, ch in enumerate(row):
            if ch != "1" or (r0, c0) in label:
                continue
            tag = len(set(label.values())) + 1
            label[r0, c0] = tag
            stack = [(r0, c0)]
            while stack:
                r, c = stack.pop()
                for nr, nc in grid_neighbours(grid, r, c):
                    if grid[nr][nc] == "1" and (nr, nc) not in label:
                        label[nr, nc] = tag
                        stack.append((nr, nc))
    return label
# <<< islands


# >>> maze_bfs
def maze_bfs(maze, start, goal):
    parent = {start: None}
    queue = deque([start])
    while queue:
        r, c = queue.popleft()
        if (r, c) == goal:
            break
        for nr, nc in grid_neighbours(maze, r, c):
            if maze[nr][nc] != "#" and (nr, nc) not in parent:
                parent[nr, nc] = (r, c)
                queue.append((nr, nc))
    return parent
# <<< maze_bfs


# >>> maze
def solve_maze(maze):
    cells = {(r, c): ch for r, row in enumerate(maze)
             for c, ch in enumerate(row)}
    start = next(p for p, ch in cells.items() if ch == "S")
    goal = next(p for p, ch in cells.items() if ch == "E")
    parent = maze_bfs(maze, start, goal)
    if goal not in parent:
        return None, parent
    path = []
    while goal is not None:
        path.append(goal)
        goal = parent[goal]
    return path[::-1], parent
# <<< maze


# >>> patterns
def patterns(word):
    return [word[:i] + "*" + word[i+1:]
            for i in range(len(word))]
# <<< patterns


# >>> ladder
def ladder(start, goal, words):
    buckets = {}
    for w in [start, *words]:
        for p in patterns(w):
            buckets.setdefault(p, []).append(w)
    parent = {start: None}
    queue = deque([start])
    while queue:
        w = queue.popleft()
        if w == goal:
            return path_to(parent, goal)
        for p in patterns(w):
            for nxt in buckets[p]:
                if nxt not in parent:
                    parent[nxt] = w
                    queue.append(nxt)
    return None
# <<< ladder


# >>> bipartite
def two_colour(graph):
    colour = {}
    for s in graph:
        if s in colour:
            continue
        colour[s] = 0
        queue = deque([s])
        while queue:
            u = queue.popleft()
            for v in graph[u]:
                if v not in colour:
                    colour[v] = 1 - colour[u]
                    queue.append(v)
                elif colour[v] == colour[u]:
                    return None
    return colour
# <<< bipartite


# >>> union_find
def find(parent, x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]
        x = parent[x]
    return x
# <<< union_find


# >>> kruskal
def kruskal(nodes, edges):
    parent = {u: u for u in nodes}
    tree, total = [], 0
    for w, u, v in sorted(edges):
        ru, rv = find(parent, u), find(parent, v)
        if ru != rv:
            parent[ru] = rv
            tree.append((u, v, w))
            total += w
    return tree, total
# <<< kruskal


# >>> undirected
def undirected(edges):
    g = {}
    for u, v, w in edges:
        g.setdefault(u, {})[v] = w
        g.setdefault(v, {})[u] = w
    return g
# <<< undirected


# >>> network
highways = undirected([
    ("Hanoi", "HaiPhong", 2), ("Hanoi", "NinhBinh", 2),
    ("Hanoi", "Vinh", 6), ("NinhBinh", "Vinh", 3),
    ("HaiPhong", "Vinh", 6), ("Vinh", "Hue", 6),
    ("Vinh", "DaNang", 9), ("Hue", "DaNang", 2),
    ("Hue", "NhaTrang", 9), ("DaNang", "NhaTrang", 8),
    ("DaNang", "Saigon", 16), ("NhaTrang", "Saigon", 7),
])
# <<< network


def dijkstra_trace(roads, start):
    dist = {start: 0}
    heap = [(0, start)]
    done = set()
    while heap:
        d, u = heapq.heappop(heap)
        if u in done:
            continue
        done.add(u)
        print(f"settle {u:<5} at {d:>2}")
        for v, w in roads[u].items():
            if d + w < dist.get(v, float("inf")):
                dist[v] = d + w
                heapq.heappush(heap, (d + w, v))


def topo_trace(graph):
    indeg = {u: 0 for u in graph}
    for u in graph:
        for v in graph[u]:
            indeg[v] += 1
    items = [f"{u}={d}" for u, d in indeg.items()]
    print("in-degrees:", *items[:4])
    print("           ", *items[4:])
    ready = deque(u for u in graph if indeg[u] == 0)
    while ready:
        u = ready.popleft()
        freed = []
        for v in graph[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                ready.append(v)
                freed.append(v)
        print(f"take {u:<5} freed: {' '.join(freed) or '-'}")


def route_cost(roads, path):
    return sum(roads[a][b] for a, b in zip(path, path[1:]))


def bfs_trace(graph, start):
    seen, queue = {start}, deque([start])
    while queue:
        u = queue.popleft()
        for v in graph[u]:
            if v not in seen:
                seen.add(v)
                queue.append(v)
        print(f"pop {u:<5} queue: {' '.join(queue) or '(empty)'}")


def dfs_trace(graph, start):
    seen, stack = set(), []

    def visit(u):
        seen.add(u)
        stack.append(u)
        print(f"enter {u:<5} stack: {' '.join(stack)}")
        for v in graph[u]:
            if v not in seen:
                visit(v)
        stack.pop()
        print(f"leave {u:<5} stack: {' '.join(stack) or '(empty)'}")

    visit(start)


# ---------- LaTeX panels for the step-by-step slides ----------
NODES = ["Gate", "Lib", "Cafe", "Lab", "Dorm", "Gym"]
WHITE, QUEUE, CUR, DONE = "white", "tdAmber!40", "tdRed!35", "tdBlue!22"
ABOVE = {"Gate": "pg", "Lib": "pl", "Lab": "pb", "Gym": "py"}
BELOW = {"Cafe": "pc", "Dorm": "pd"}


def labels(texts, colour="tdGreen!60!black"):
    out = []
    for n, t in texts.items():
        if n in ABOVE:
            out.append(f"\\node[font=\\tiny\\bfseries,text={colour},anchor=south] "
                       f"at ($({ABOVE[n]})+(0,0.36)$) {{{t}}};")
        else:
            out.append(f"\\node[font=\\tiny\\bfseries,text={colour},anchor=north] "
                       f"at ($({BELOW[n]})+(0,-0.36)$) {{{t}}};")
    return "".join(out)


def panel(weighted, colours, title, info, extra=""):
    cs = "".join("{%s}" % colours.get(n, WHITE) for n in NODES)
    return f"\\gcols{cs}\\gpanel{{{weighted}}}{{{title}}}{{{info}}}{{{extra}}}"


def grid_layout(panels):
    out = []
    for i, p in enumerate(panels):
        out.append(p)
        out.append("\\hfill" if i % 2 == 0 else "\\par\\vspace{1mm}")
    if len(panels) % 2:
        out.append("\\glegend")
    return "\n".join(out)


def bfs_panels(graph, start):
    seen, queue = {start}, deque([start])
    cols = {start: QUEUE}
    pans = [panel(0, dict(cols), "start: queue the source", f"queue: {start}")]
    while queue:
        u = queue.popleft()
        for v in graph[u]:
            if v not in seen:
                seen.add(v)
                queue.append(v)
                cols[v] = QUEUE
        cols[u] = DONE
        shown = dict(cols)
        shown[u] = CUR
        pans.append(panel(0, shown, f"{len(pans)}. pop {u}",
                          f"queue: {' '.join(queue) or '(empty)'}"))
    return pans


def dfs_panels(graph, start):
    found, done = dfs_times(graph, start)
    events = sorted([(t, "d", u) for u, t in found.items()] +
                    [(t, "f", u) for u, t in done.items()])
    pans, stack = [], []
    for t, kind, u in events:
        if kind == "d":
            stack.append(u)
            cols = {n: DONE if (n in done and done[n] < t) else QUEUE
                    for n in found if found[n] <= t}
            cols[u] = CUR
            lab = labels({n: f"d={found[n]}" for n in cols}, "tdPurple")
            pans.append(panel(0, cols, f"{len(pans)+1}. discover {u}",
                              f"stack: {' '.join(stack)}", lab))
        else:
            stack.pop()
    return pans, found, done


def dfs_final_panel(found, done):
    cols = {n: DONE for n in found}
    lab = labels({n: f"{found[n]}/{done[n]}" for n in found}, "tdPurple")
    return panel(0, cols, "backtrack: found/done times",
                 "done order: " + " ".join(sorted(done, key=done.get)), lab)


def dijkstra_panels(roads, start):
    INF = float("inf")
    dist = {start: 0}
    heap = [(0, start)]
    settled, rows, pans = [], [], []

    def snap(cur, title):
        cols = {n: QUEUE for n in dist}
        for n in settled:
            cols[n] = DONE
        if cur:
            cols[cur] = CUR
        lab = labels({n: str(d) for n, d in dist.items()})
        hp = " ".join(f"({d},{n})" for d, n in sorted(heap)) or "(empty)"
        pans.append(panel(1, cols, title, f"heap: {hp}", lab))
        rows.append({n: dist.get(n, INF) for n in NODES} | {"_set": cur or "-"})

    snap(None, "start: dist[Gate] = 0")
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue
        settled.append(u)
        for v, w in roads[u].items():
            if d + w < dist.get(v, INF):
                dist[v] = d + w
                heapq.heappush(heap, (d + w, v))
        snap(u, f"{len(pans)}. settle {u} ({d})")
    return pans, rows


def dijkstra_table(rows):
    out = ["\\begin{tabular}{@{}r" + "r" * 6 + "l@{}}\\toprule",
           "step & " + " & ".join(NODES) + " & settled\\\\\\midrule"]
    settled = set()
    for i, row in enumerate(rows):
        cells = []
        for n in NODES:
            d = row[n]
            txt = "$\\infty$" if d == float("inf") else str(d)
            cells.append(f"\\textbf{{{txt}}}" if n in settled else txt)
        if row["_set"] != "-":
            settled.add(row["_set"])
        last = row["_set"] if row["_set"] != "-" else "--"
        out.append(f"{i} & " + " & ".join(cells) + f" & {last}\\\\")
    out.append("\\bottomrule\\end{tabular}")
    return "\n".join(out)


COLOURS = ["tdBlue", "tdGreen", "tdAmber", "tdPurple", "tdRed", "tdMuted"]


def grid_tikz(rows, cols, fill, text, size=0.52):
    out = []
    for r in range(rows):
        for c in range(cols):
            out.append(f"\\node[draw=tdInk!35,fill={fill(r, c)},minimum size={size}cm,"
                       f"inner sep=0,font=\\scriptsize\\bfseries] "
                       f"at ({c*size:.2f},{-r*size:.2f}) {{{text(r, c)}}};")
    return "\n".join(out)


GRID = ["1100010",
        "1100010",
        "0001000",
        "0011001",
        "1000001",
        "1000111"]

MAZE = ["S.#.....",
        ".##.###.",
        "....#...",
        ".####.#.",
        "......#E"]

COURSES = {
    "Maths": ["Algo"], "Prog": ["DS", "Web"], "DS": ["Algo", "DB"],
    "Algo": ["AI"], "DB": ["AI"], "Web": [], "AI": [],
}


def main() -> None:
    section("version")
    print(f"Python {sys.version.split()[0]}")

    section("representation_demo")
    for u, nbrs in graph.items():
        print(f"{u:<5} -> {nbrs}")

    section("matrix_demo")
    print("      " + " ".join(f"{n[:4]:>4}" for n in names))
    for n, row in zip(names, matrix):
        print(f"{n[:4]:<5} " + " ".join(f"{x:>4}" for x in row))

    section("bfs_demo")
    order, parent = bfs(graph, "Gate")
    print("visit order:", *order)
    print("path to Gym:", "-".join(path_to(parent, "Gym")))
    levels = {}
    for u in order:
        levels[u] = 0 if parent[u] is None else levels[parent[u]] + 1
    by_hops = {}
    for u in order:
        by_hops.setdefault(levels[u], []).append(u)
    for hops, group in by_hops.items():
        print(f"{hops} hops:", *group)

    section("dfs_demo")
    print("DFS order  :", *dfs(graph, "Gate"))
    print("iterative  :", *dfs_iter(graph, "Gate"))

    section("components_demo")
    islands_g = {"A": ["B"], "B": ["A", "C"], "C": ["B"],
                 "D": ["E"], "E": ["D"], "F": []}
    for comp in components(islands_g):
        print(*comp)

    section("dijkstra_trace")
    dijkstra_trace(roads, "Gate")

    section("dijkstra_demo")
    dist, dparent = dijkstra(roads, "Gate")
    print("minutes from Gate:")
    print(*[f"{u}={d}" for u, d in sorted(dist.items(), key=lambda kv: kv[1])])
    best = path_to(dparent, "Gym")
    fewest = path_to(parent, "Gym")
    print("fewest hops:", "-".join(fewest), f"({route_cost(roads, fewest)} min)")
    print("cheapest   :", "-".join(best), f"({route_cost(roads, best)} min)")

    # ----- queue versus stack -----
    section("bfs_trace_demo")
    bfs_trace(graph, "Gate")
    section("dfs_trace_demo")
    dfs_trace(graph, "Gate")

    section("bfs_p1")
    bp = bfs_panels(graph, "Gate")
    print(grid_layout(bp[:4]))
    section("bfs_p2")
    print(grid_layout(bp[4:]))

    section("dfs_p1")
    dp, found, done = dfs_panels(graph, "Gate")
    print(grid_layout(dp[:4]))
    section("dfs_p2")
    print(grid_layout(dp[4:] + [dfs_final_panel(found, done)]))
    section("dfs_times_demo")
    print("node  found  done")
    for u in found:
        print(f"{u:<5} {found[u]:>5} {done[u]:>5}")
    print("done order:", *sorted(done, key=done.get))

    section("dij_p1")
    dpan, drows = dijkstra_panels(roads, "Gate")
    print(grid_layout(dpan[:4]))
    section("dij_p2")
    print(grid_layout(dpan[4:]))
    section("dij_table")
    print(dijkstra_table(drows))

    # ----- cycle detection and topological sort -----
    section("cycle_demo")
    deps = {"A": ["B"], "B": ["C"], "C": ["D"], "D": ["B", "E"], "E": []}
    print("with D->B :", find_cycle(deps))
    deps["D"] = ["E"]
    print("after fix :", find_cycle(deps))

    section("topo_demo")
    topo_trace(COURSES)
    print("order:", *topo_sort(COURSES))
    bad = {**COURSES, "AI": ["Maths"]}
    print("with AI -> Maths:", topo_sort(bad))

    # ----- islands -----
    section("islands_demo")
    lab = islands(GRID)
    print("\n".join(GRID))
    print("islands:", len(set(lab.values())))
    sizes = {}
    for t in lab.values():
        sizes[t] = sizes.get(t, 0) + 1
    print("sizes  :", *[f"#{t}:{n}" for t, n in sizes.items()])
    section("islands_tikz")
    print(grid_tikz(len(GRID), len(GRID[0]),
                    lambda r, c: f"{COLOURS[(lab[r, c]-1) % 6]}!35" if (r, c) in lab else "white",
                    lambda r, c: str(lab[r, c]) if (r, c) in lab else ""))

    # ----- maze -----
    section("maze_demo")
    route, par = solve_maze(MAZE)
    print("\n".join(MAZE))
    print("steps:", len(route) - 1)
    moves = {(1, 0): "D", (-1, 0): "U", (0, 1): "R", (0, -1): "L"}
    print("moves:", "".join(moves[b[0] - a[0], b[1] - a[1]]
                            for a, b in zip(route, route[1:])))
    section("maze_tikz")
    dmap = {}
    for p in par:
        k, cur = 0, p
        while par[cur] is not None:
            cur = par[cur]
            k += 1
        dmap[p] = k
    on = set(route)

    def mfill(r, c):
        if MAZE[r][c] == "#":
            return "tdInk!75"
        if (r, c) in on:
            return "tdAmber!55"
        if (r, c) in dmap:
            return f"tdBlue!{min(40, 6 + 3 * dmap[r, c])}"
        return "white"

    def mtext(r, c):
        if (r, c) not in dmap:
            return ""
        return MAZE[r][c] if MAZE[r][c] in "SE" else str(dmap[r, c])

    print(grid_tikz(len(MAZE), len(MAZE[0]), mfill, mtext))

    # ----- word ladder -----
    section("ladder_demo")
    words = ["hot", "dot", "dog", "lot", "log", "cog"]
    print("hit -> cog :", *ladder("hit", "cog", words))
    print("hit -> cat :", ladder("hit", "cat", words))

    # ----- bipartite -----
    section("bipartite_demo")
    ring6 = {"a": ["b", "f"], "b": ["a", "c"], "c": ["b", "d"],
             "d": ["c", "e"], "e": ["d", "f"], "f": ["e", "a"]}
    tri = {"a": ["b", "c"], "b": ["a", "c"], "c": ["a", "b", "d"], "d": ["c"]}
    col = two_colour(ring6)
    print("6-cycle :", *[f"{n}={c}" for n, c in sorted(col.items())])
    print("triangle:", two_colour(tri))

    # ----- Kruskal -----
    section("kruskal_demo")
    edges = sorted((w, u, v) for u in roads for v, w in roads[u].items() if u < v)
    leader = {u: u for u in roads}
    for w, u, v in edges:
        ru, rv = find(leader, u), find(leader, v)
        print(f"{u + '-' + v:<10} {w}: {'take' if ru != rv else 'skip (cycle)'}")
        leader[ru] = rv
    tree, total = kruskal(list(roads), edges)
    print("total weight:", total, f"(all paths: {sum(w for w, _, _ in edges)})")

    # ----- road network -----
    section("network_demo")
    dist, par = dijkstra(highways, "Hanoi")
    for city, d in sorted(dist.items(), key=lambda kv: kv[1]):
        print(f"{city:<9}{d:>3} h via {'-'.join(path_to(par, city))}")


if __name__ == "__main__":
    main()
