"""Graphs: representation, BFS, DFS, connected components and Dijkstra.

Run with:  python3.14 graphs.py
"""
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
index = {name: i for i, name in enumerate(names)}
matrix = [[0] * len(names) for _ in names]
for u, neighbours in graph.items():
    for v in neighbours:
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
import heapq

INF = float("inf")


def dijkstra(roads, start):
    dist = {start: 0}
    parent = {start: None}
    heap = [(0, start)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue
        for v, w in roads[u].items():
            if d + w < dist.get(v, INF):
                dist[v] = d + w
                parent[v] = u
                heapq.heappush(heap, (d + w, v))
    return dist, parent
# <<< dijkstra


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


def route_cost(roads, path):
    return sum(roads[a][b] for a, b in zip(path, path[1:]))


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

    section("components_demo")
    islands = {"A": ["B"], "B": ["A", "C"], "C": ["B"],
               "D": ["E"], "E": ["D"], "F": []}
    for comp in components(islands):
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


if __name__ == "__main__":
    main()
