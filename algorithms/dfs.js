/* =========================================================
   algorithms/dfs.js
   Member 3 - Depth-First Search (DFS)

   A pure algorithm module: it only READS the data it is given
   and returns a result object. It does not touch the DOM, the
   animation, or maze/mazeGenerator.js's internal state.

   --------------------------------------------------------
   HOW TO USE (from script.js or any other module):

     import { getGrid, getStart, getEnd } from "./maze/mazeGenerator.js";
     import { dfs } from "./algorithms/dfs.js";

     const result = dfs(getGrid(), getStart(), getEnd());

   INPUT
     grid  : 2D array, grid[row][col], values from CELL
             (0 = EMPTY, 1 = WALL, 2 = START, 3 = END).
             This is exactly what getGrid() returns.
     start : { row, col }   (what getStart() returns)
     end   : { row, col }   (what getEnd() returns)

   OUTPUT  (always an object, never throws for bad input)
     {
       found        : true if a Start -> End route exists,
       message      : short human-readable result for the UI,
       visitedOrder : [{ row, col }, ...]  cells in the exact order
                      DFS explored them (includes Start, and includes
                      End when it was reached). Use it for animation.
       path         : [{ row, col }, ...]  Start -> End, both included.
                      Empty array [] when no path exists.
       nodesVisited : visitedOrder.length
       pathLength   : number of MOVES (steps) in the path, i.e.
                      path.length - 1. It is 0 when Start === End
                      or when no path exists (check `found`).
       executionTime: milliseconds spent inside the algorithm
     }

   NOTE: DFS finds A route, not necessarily the SHORTEST one.
   ========================================================= */

import { CELL } from "../maze/mazeGenerator.js";


/* ---------- 1. DIRECTIONS ---------- */

// Order in which neighbours are explored: up, right, down, left.
// Keeping this fixed makes the visiting order predictable.
const DIRECTIONS = [
  [-1, 0], // up
  [0, 1],  // right
  [1, 0],  // down
  [0, -1], // left
];


/* ---------- 2. SMALL HELPERS ---------- */

// Is (row, col) a position inside the grid?
function inBounds(row, col, rows, cols) {
  return Number.isInteger(row) && Number.isInteger(col) &&
         row >= 0 && row < rows && col >= 0 && col < cols;
}

// Builds the "nothing found" result so every failure looks the same.
function emptyResult(message, visitedOrder, startTime) {
  return {
    found: false,
    message,
    visitedOrder,
    path: [],
    nodesVisited: visitedOrder.length,
    pathLength: 0,
    executionTime: performance.now() - startTime,
  };
}


/* ---------- 3. DEPTH-FIRST SEARCH (explicit stack) ---------- */

/**
 * Runs DFS from `start` to `end` on `grid`.
 * Uses an explicit stack (an array with push/pop) - NO recursion,
 * so large grids can never cause a call-stack overflow.
 *
 * Does NOT modify `grid`, `start` or `end`.
 */
export function dfs(grid, start, end) {
  const startTime = performance.now();

  /* ----- Validate the input (fail safely instead of crashing) ----- */
  if (!Array.isArray(grid) || grid.length === 0 || !Array.isArray(grid[0])) {
    return emptyResult("Invalid grid", [], startTime);
  }
  const rows = grid.length;
  const cols = grid[0].length;

  if (!start || !end ||
      !inBounds(start.row, start.col, rows, cols) ||
      !inBounds(end.row, end.col, rows, cols)) {
    return emptyResult("Start or End is outside the grid", [], startTime);
  }
  if (grid[start.row][start.col] === CELL.WALL ||
      grid[end.row][end.col] === CELL.WALL) {
    return emptyResult("Start or End is blocked by a wall", [], startTime);
  }

  /* ----- Data structures -----
     Each cell (row, col) is given one number: id = row * cols + col.
       visited[id] : 1 once the cell has been explored
       parent[id]  : id of the cell we came from (-1 = none)        */
  const visited = new Uint8Array(rows * cols);
  const parent = new Int32Array(rows * cols).fill(-1);
  const visitedOrder = [];

  const startId = start.row * cols + start.col;
  const endId = end.row * cols + end.col;

  // Each stack entry is [cellId, idOfTheCellThatPushedIt].
  // The parent travels with the entry, so when a cell is finally
  // popped we know exactly which cell discovered it first.
  const stack = [[startId, -1]];

  /* ----- Main loop ----- */
  while (stack.length > 0) {
    const [id, fromId] = stack.pop();         // take the most recent entry (LIFO)

    if (visited[id]) continue;                // already explored via another route
    visited[id] = 1;
    parent[id] = fromId;

    const row = Math.floor(id / cols);
    const col = id % cols;
    visitedOrder.push({ row, col });          // record the exploration order

    // Reached the target? Stop and rebuild the path.
    if (id === endId) {
      const path = reconstructPath(parent, startId, endId, cols);
      return {
        found: true,
        message: "Path found",
        visitedOrder,
        path,
        nodesVisited: visitedOrder.length,
        pathLength: path.length - 1,
        executionTime: performance.now() - startTime,
      };
    }

    // Push valid, unvisited neighbours. They are pushed in REVERSE order
    // so that the first direction in DIRECTIONS is popped (explored) first.
    for (let d = DIRECTIONS.length - 1; d >= 0; d--) {
      const nextRow = row + DIRECTIONS[d][0];
      const nextCol = col + DIRECTIONS[d][1];

      if (!inBounds(nextRow, nextCol, rows, cols)) continue;   // grid boundary
      if (grid[nextRow][nextCol] === CELL.WALL) continue;      // wall

      const nextId = nextRow * cols + nextCol;
      if (!visited[nextId]) stack.push([nextId, id]);
    }
  }

  // Stack ran empty without reaching End -> no route exists.
  return emptyResult("No path exists", visitedOrder, startTime);
}


/* ---------- 4. PATH RECONSTRUCTION ---------- */

// Walks backwards from End to Start using the parent links,
// then reverses the list so it reads Start -> End.
function reconstructPath(parent, startId, endId, cols) {
  const path = [];
  let id = endId;

  while (id !== -1) {
    path.push({ row: Math.floor(id / cols), col: id % cols });
    if (id === startId) break;
    id = parent[id];
  }

  return path.reverse();
}