# Structures

An interactive visualization tool for Abstract Data Types, data structures, and algorithms — covering all topics from CPSC 221.

## Data Structures

### Linear Structures

| ADT | Implementations | Operations |
|-----|----------------|------------|
| **Linked List** | Singly linked, doubly linked | Insert, delete, search, traverse |
| **Stack** | Array-based, linked-list | Push, pop, peek |
| **Queue** | Circular array, linked-list | Enqueue, dequeue, peek |
| **Heap / Priority Queue** | Array-based binary heap | Insert, extract-min/max, peek |
### Trees

| ADT | Implementations | Operations |
|-----|----------------|------------|
| **Binary Tree** | Node-based | Insert, traversals (in/pre/post-order) |
| **BST** | Binary search tree | Insert, remove, search |
| **AVL Tree** | Self-balancing BST | Insert, remove (auto-rotations) |
| **B-Tree** | Balanced multi-way tree | Insert, remove, search |


### Hashing

| ADT | Implementations | Operations |
|-----|----------------|------------|
| **Hash Table / Hash Map** | Separate chaining, open addressing | Put, get, remove |
| **Dictionary** | BST-backed, hash map-backed | Insert, lookup, delete |

### Sets

| ADT | Implementations | Operations |
|-----|----------------|------------|
| **Disjoint Set (Union-Find)** | Array with union by rank, path compression | Make-set, find, union |

### Graphs

| ADT | Implementations | Operations |
|-----|----------------|------------|
| **Graph** | Adjacency list, adjacency matrix | Add node/edge, BFS, DFS, topological sort |

## Algorithms

### Sorting

| Algorithm | Visualization | Key Concepts |
|-----------|--------------|--------------|
| **Selection Sort** | Array with comparisons/swaps highlighted | O(n²), in-place |
| **Insertion Sort** | Array with shifting elements | O(n²), stable, in-place |
| **Merge Sort** | Recursive split/merge with subarrays | O(n log n), divide & conquer |

### Tree Traversals

| Algorithm | Visualization | Key Concepts |
|-----------|--------------|--------------|
| **Inorder** | Node highlighting on BST | Left-Root-Right |
| **Preorder** | Node highlighting on BST | Root-Left-Right |
| **Postorder** | Node highlighting on BST | Left-Right-Root |
| **Level Order (BFS)** | Level-by-level highlighting | Queue-based |

### Graph Algorithms

| Algorithm | Visualization | Key Concepts |
|-----------|--------------|--------------|
| **BFS** | Graph with frontier/visited coloring | Queue-based, shortest path (unweighted) |
| **DFS** | Graph with stack-based exploration | Stack-based, backtracking |
| **Topological Sort** | DAG with ordering revealed | Prerequisites/dependencies |
| **MST (Kruskal's / Prim's)** | Edge selection on weighted graph | Greedy, spanning tree |
| **Dijkstra's Shortest Path** | Weighted graph with relaxation | Priority queue, greedy |

## License

[GNU GPL v3.0](LICENSE)

---

*Built during CPSC 221 lectures*
