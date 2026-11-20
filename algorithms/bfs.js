/* =========================================================
   algorithms/bfs.js
   Breadth-First Search (BFS) path finder.

   BFS explores the maze in "rings" around the START cell:
   first all cells 1 step away, then 2 steps away, and so on.
   Because every step costs the same, the first time BFS
   reaches the END cell it has found a SHORTEST path.

   --------------------------------------------------------
   HOW TO USE (later, from script.js):

     import { getGrid, getStart, getEnd } from "./maze/mazeGenerator.js";
     import { bfs } from "./algorithms/bfs.js";

     const result = bfs(getGrid(), getStart(), getEnd());

     if (result.found) {
       // result.visitedOrder -> animate the explored cells (blue)
       // result.path         -> animate the final route (yellow)
     } else {
       // no route between START and END (see result.message)
     }
   --------------------------------------------------------

   INPUT
     grid  : 2D array, grid[row][col], holding CELL values
             (EMPTY 0, WALL 1, START 2, END 3) exactly like
             the array returned by getGrid().
     start : { row, col }   (same shape as getStart())
     end   : { row, col }   (same shape as getEnd())

   OUTPUT  (always an object with these 7 fields - the SAME
            field names and meaning as algorithms/dfs.js)
     {
       found:         boolean,  // true if a route START -> END exists
       message:       string,   // short human-readable result for the UI
       visitedOrder:  [{row, col}, ...],
                      // every cell BFS explored, in the order it
                      // explored it (START first). If a path was
                      // found, END is the last item.
       path:          [{row, col}, ...],
                      // shortest route from START to END, both
                      // included, in walking order. Empty [] when
                      // no path exists.
       nodesVisited:  number,   // visitedOrder.length
       pathLength:    number,   // number of steps (moves) in the path;
                                // path.length - 1, or 0 if not found
       executionTime: number    // milliseconds spent inside the algorithm
     }

   This module only READS the grid it receives. It never changes
   the grid and never touches the DOM.
   ========================================================= */

import { CELL } from "../maze/mazeGenerator.js";

// The 4 side-neighbours, in the same order mazeGenerator.js uses:
// up, down, left, right (no diagonal moves).
const DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/**
 * Finds the shortest path from `start` to `end` using Breadth-First Search.
 *
 * @param {number[][]} grid  maze matrix, grid[row][col] is a CELL value
 * @param {{row:number, col:number}} start  starting cell
 * @param {{row:number, col:number}} end    target cell
 * @returns {{
 *   found: boolean,
 *   message: string,
 *   visitedOrder: {row:number, col:number}[],
 *   path: {row:number, col:number}[],
 *   nodesVisited: number,
 *   pathLength: number,
 *   executionTime: number
 * }}
 */
export function bfs(grid, start, end) {
  const startTime = performance.now();

  const result = {
    found: false,
    message: "",
    visitedOrder: [],
    path: [],
    nodesVisited: 0,
    pathLength: 0,
    executionTime: 0,
  };

  // Fills in the fields that depend on how the search ended, then
  // returns the result. Every exit from this function goes through it,
  // so message / nodesVisited / executionTime are always set.
  function finish(message) {
    result.message = message;
    result.nodesVisited = result.visitedOrder.length;
    result.executionTime = performance.now() - startTime;
    return result;
  }

  /* ---------- 1. Check the input ---------- */

  // An empty / missing grid cannot be solved.
  if (!Array.isArray(grid) || grid.length === 0 || !Array.isArray(grid[0])) {
    return finish("Invalid grid");
  }

  const rows = grid.length;
  const cols = grid[0].length;

  // Is (row, col) inside the grid?
  function inBounds(row, col) {
    return Number.isInteger(row) && Number.isInteger(col) &&
           row >= 0 && row < rows && col >= 0 && col < cols;
  }

  // A cell is walkable when it is inside the grid and NOT a wall
  // (EMPTY, START and END are all walkable).
  function walkable(row, col) {
    return inBounds(row, col) && grid[row][col] !== CELL.WALL;
  }

  // START and END must both be valid, walkable cells.
  if (!start || !end ||
      !inBounds(start.row, start.col) || !inBounds(end.row, end.col)) {
    return finish("Start or End is outside the grid");
  }
  if (!walkable(start.row, start.col) || !walkable(end.row, end.col)) {
    return finish("Start or End is blocked by a wall");
  }

  /* ---------- 2. Set up BFS data structures ---------- */

  // Each cell gets one number: index = row * cols + col.
  const toIndex = (row, col) => row * cols + col;

  // visited[i]  -> has cell i already been put in the queue?
  const visited = new Array(rows * cols).fill(false);

  // parent[i]   -> the cell we came from when we first reached cell i
  //                (-1 = none). Used to rebuild the path at the end.
  const parent = new Array(rows * cols).fill(-1);

  // The queue holds cell indexes. Instead of using array.shift()
  // (slow, because it moves every item), we keep a `head` pointer that
  // moves forward: queue[head] is always the "front" of the queue.
  const queue = [];
  let head = 0;

  const startIndex = toIndex(start.row, start.col);
  const endIndex = toIndex(end.row, end.col);

  // Begin: mark START as visited and put it in the queue.
  visited[startIndex] = true;
  queue.push(startIndex);

  /* ---------- 3. Main BFS loop ---------- */

  let reachedEnd = false;

  while (head < queue.length) {
    // Take the cell at the front of the queue.
    const current = queue[head++];
    const row = Math.floor(current / cols);
    const col = current % cols;

    // Record that BFS explored this cell (used for the animation).
    result.visitedOrder.push({ row, col });

    // Reached the target: the first arrival is a shortest path, so stop.
    if (current === endIndex) {
      reachedEnd = true;
      break;
    }

    // Look at the 4 neighbours.
    for (const [dRow, dCol] of DIRECTIONS) {
      const nextRow = row + dRow;
      const nextCol = col + dCol;

      if (!walkable(nextRow, nextCol)) continue;     // wall or outside grid

      const next = toIndex(nextRow, nextCol);
      if (visited[next]) continue;                   // already queued before

      visited[next] = true;                          // mark when queued, so a
      parent[next] = current;                        // cell is never queued twice
      queue.push(next);
    }
  }

  /* ---------- 4. Build the result ---------- */

  // Queue ran empty without reaching END -> no path exists.
  if (!reachedEnd) {
    return finish("No path exists");
  }

  // Walk backwards from END to START using `parent`, then reverse.
  const path = [];
  for (let i = endIndex; i !== -1; i = parent[i]) {
    path.push({ row: Math.floor(i / cols), col: i % cols });
  }
  path.reverse();

  result.found = true;
  result.path = path;
  result.pathLength = path.length - 1;   // steps, not cells
  return finish("Path found");
}