# Maze Solver - Path Finding Visualizer

A DSA project that draws a maze on a grid and shows how **Breadth-First Search (BFS)** and **Depth-First Search (DFS)** find a route from the Start cell (**S**) to the End cell (**E**). Built with plain HTML, CSS and JavaScript - no framework and no build step.

> **Dijkstra and A\* are Coming Soon.** They appear in the algorithm dropdown as disabled entries but are **not implemented yet**.

## Features

- 20 x 30 maze grid with random maze generation (Recursive Backtracking)
- Draw and erase walls by clicking or dragging; drag **S** and **E** to move them
- **Solve Maze** animates the selected algorithm (explored cells, then the final path)
- **Statistics** panel: algorithm, path length, nodes visited, execution time
- **Compare Both** runs BFS and DFS on the same snapshot of the maze and shows the results side by side (see below)
- Clear Path and Reset buttons

### Compare Both

Click **Compare Both** to run BFS and DFS on one snapshot of the current maze. The comparison card shows, for each algorithm:

| Metric | Meaning |
| --- | --- |
| Path Length (steps) | Number of moves from Start to End (`No path` if none exists) |
| Nodes Visited | Number of cells the algorithm explored |
| Execution Time | Milliseconds spent inside the algorithm |

Notes:

- If the End cannot be reached, both columns show **No path** and a message explains it.
- The comparison is cleared whenever the maze changes: drawing or erasing walls, moving Start or End, Generate Maze, and Reset.
- Execution times are tiny on a grid this size and vary slightly between runs. Each algorithm is run once as a warm-up before the measured run so neither pays the JavaScript start-up cost.
- Clicking Compare Both while a Solve animation is running cancels that animation first.

## How to run

The project uses JavaScript modules (`<script type="module">`). Browsers usually block modules when a page is opened directly from disk (`file://`), so run it through a small local web server:

**Option 1 - Python (no install needed if Python is present)**

```bash
cd "Maze Solver"
python3 -m http.server 8000      # on Windows: python -m http.server 8000
```

Then open <http://localhost:8000> in your browser.

**Option 2 - VS Code**

Install the "Live Server" extension, right-click `index.html` and choose **Open with Live Server**.

There is nothing to install or build.

## Folder structure

```
Maze Solver/
|-- index.html              Page layout (controls, statistics, comparison card, legend)
|-- style.css               All styling and CSS design variables
|-- script.js               UI layer: draws the grid, editing, animation, buttons, comparison
|-- README.md               This file
|-- algorithms/
|   |-- bfs.js              Breadth-First Search
|   `-- dfs.js              Depth-First Search (explicit stack)
`-- maze/
    `-- mazeGenerator.js    Maze data, wall editing, Start/End, maze generation, reset
```

Both algorithm modules have the same signature, `algorithm(grid, start, end)`, and return the same result object (`found`, `message`, `visitedOrder`, `path`, `nodesVisited`, `pathLength`, `executionTime`). They only read the grid and never touch the page.

## BFS and DFS

Let **V** be the number of walkable cells (at most rows x columns) and **E** the number of connections between neighbouring cells (at most 4 per cell on this grid, so E = O(V)).

| | BFS | DFS |
| --- | --- | --- |
| Data structure | Queue (FIFO) | Stack (LIFO, explicit stack in this project) |
| Time complexity | O(V + E) | O(V + E) |
| Space complexity | O(V) | O(V) |
| Finds the shortest path (equal step cost)? | **Yes** | **No** - finds *a* path, not necessarily the shortest |
| Explores | Level by level (all cells 1 step away, then 2, ...) | One branch as deep as possible, then backtracks |
| Typical use | Shortest route in an unweighted maze | Checking whether a route exists, exploring all possibilities |

**Key difference:** BFS spreads out evenly from the Start, so the first time it reaches the End it has used the fewest steps. DFS follows one corridor to its end before trying another, so its path can be much longer, and the number of cells it visits depends heavily on the order in which it tries directions (up, right, down, left in this project). On a maze with no loops (a "perfect" maze) both find the same single route; with open areas or loops, BFS is guaranteed shortest and DFS is not.

## Team responsibilities

| Member | Responsibility |
| --- | --- |
| Member 1 | Maze and grid management: `maze/mazeGenerator.js`, wall editing, Start/End movement, maze generation, reset |
| Member 2 | BFS: `algorithms/bfs.js` *(not labelled in the source files - please confirm)* |
| Member 3 | DFS: `algorithms/dfs.js` |
| Member 4 | *(not stated in the project files - please fill in)* |
| Member 5 | BFS vs DFS comparison feature (Compare Both button and card), "Coming Soon" marking of Dijkstra and A*, this README |

## Status

- Implemented: BFS, DFS, maze generation, wall editing, Solve animation, statistics, BFS vs DFS comparison
- Coming Soon: Dijkstra, A*
