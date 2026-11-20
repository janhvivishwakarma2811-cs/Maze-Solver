/* =========================================================
   maze/mazeGenerator.js
   Member 1 - Maze & Grid Management

   This module OWNS the maze data. Nothing else should modify
   the grid directly - always go through the functions below.

   --------------------------------------------------------
   HOW OTHER MEMBERS CAN READ THE MAZE (BFS, DFS, ...):

     import { CELL, getGrid, getStart, getEnd, isWalkable }
       from "./maze/mazeGenerator.js";

     const grid  = getGrid();    // 2D array, grid[row][col]
     const start = getStart();   // { row, col }
     const end   = getEnd();     // { row, col }

     // A cell can be walked on if it is NOT a wall:
     isWalkable(row, col);       // true for EMPTY, START and END
   --------------------------------------------------------

   DATA STRUCTURE
   The maze is a 2D array (matrix) of numbers:

       grid[row][col]  ->  one of the CELL values below

   Row 0 is the top row, column 0 is the left column.
   Example (3 x 4 grid, S = start, E = end, # = wall, . = empty):

       S . # .          [[2, 0, 1, 0],
       . # . .    =>     [0, 1, 0, 0],
       . . . E           [0, 0, 0, 3]]
   ========================================================= */


/* ---------- 1. CELL STATES ---------- */

// Every cell of the matrix holds exactly one of these values.
export const CELL = Object.freeze({
  EMPTY: 0, // free cell, can be walked on
  WALL: 1,  // blocked cell, cannot be walked on
  START: 2, // the single starting cell (walkable)
  END: 3,   // the single target cell (walkable)
});

// Default grid size (must match what the UI shows)
export const DEFAULT_ROWS = 20;
export const DEFAULT_COLS = 30;


/* ---------- 2. PRIVATE MODULE STATE ---------- */

let rows = DEFAULT_ROWS;
let cols = DEFAULT_COLS;
let grid = [];                       // the 2D matrix
let startPos = { row: 0, col: 0 };   // current START position
let endPos = { row: 0, col: 0 };     // current END position


/* ---------- 3. SMALL HELPERS ---------- */

// Is (row, col) inside the grid?
export function isInBounds(row, col) {
  return Number.isInteger(row) && Number.isInteger(col) &&
         row >= 0 && row < rows && col >= 0 && col < cols;
}

// The 4 side-neighbours (up, down, left, right) that are inside the grid
function neighborsOf(row, col) {
  return [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]]
    .filter(([r, c]) => isInBounds(r, c));
}

// Fisher-Yates shuffle (returns the same array, shuffled in place)
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}


/* ---------- 4. GRID INITIALIZATION ---------- */

/**
 * Creates a fresh grid full of EMPTY cells and puts START and END
 * at their default positions (middle row, near the left / right edge).
 * Called automatically once when the module loads.
 */
export function initializeGrid(rowCount = DEFAULT_ROWS, colCount = DEFAULT_COLS) {
  rows = Math.max(5, rowCount);   // keep the grid big enough to hold a maze
  cols = Math.max(8, colCount);

  grid = Array.from({ length: rows }, () => new Array(cols).fill(CELL.EMPTY));

  const middle = Math.floor(rows / 2);
  startPos = { row: middle, col: 3 };
  endPos = { row: middle, col: cols - 4 };
  grid[startPos.row][startPos.col] = CELL.START;
  grid[endPos.row][endPos.col] = CELL.END;

  return getGrid();
}


/* ---------- 5. READING THE MAZE (for the UI and other members) ---------- */

// Returns a COPY of the matrix, so callers cannot corrupt the real maze.
export function getGrid() {
  return grid.map((row) => row.slice());
}

// { rows, cols }
export function getDimensions() {
  return { rows, cols };
}

// State of one cell (a CELL value) or null if out of bounds
export function getCell(row, col) {
  return isInBounds(row, col) ? grid[row][col] : null;
}

// true for EMPTY / START / END, false for WALL or out of bounds
export function isWalkable(row, col) {
  return isInBounds(row, col) && grid[row][col] !== CELL.WALL;
}

// Copies of the start / end positions: { row, col }
export function getStart() {
  return { ...startPos };
}
export function getEnd() {
  return { ...endPos };
}


/* ---------- 6. MANUAL WALL EDITING ---------- */

/**
 * Forces one cell to be a wall (true) or empty (false).
 * START and END cells are protected and never changed.
 * Returns true if the cell is a valid target, false otherwise.
 */
export function setCellWall(row, col, isWall) {
  if (!isInBounds(row, col)) return false;
  const state = grid[row][col];
  if (state === CELL.START || state === CELL.END) return false;
  grid[row][col] = isWall ? CELL.WALL : CELL.EMPTY;
  return true;
}

/**
 * Flips a cell between WALL and EMPTY.
 * Returns the new state (CELL.WALL / CELL.EMPTY), or null if the
 * cell is out of bounds or is the START / END cell.
 */
export function toggleWall(row, col) {
  if (!isInBounds(row, col)) return null;
  const state = grid[row][col];
  if (state === CELL.START || state === CELL.END) return null;
  grid[row][col] = state === CELL.WALL ? CELL.EMPTY : CELL.WALL;
  return grid[row][col];
}


/* ---------- 7. START / END POSITION MANAGEMENT ---------- */

// Moves the START (or END) marker. Rules:
//  - the target must be inside the grid
//  - the target must be an EMPTY cell (not a wall, not the other marker)
function moveMarker(marker, row, col) {
  const current = marker === CELL.START ? startPos : endPos;

  if (!isInBounds(row, col)) return false;
  if (row === current.row && col === current.col) return true; // already there
  if (grid[row][col] !== CELL.EMPTY) return false;

  grid[current.row][current.col] = CELL.EMPTY;   // free the old cell
  grid[row][col] = marker;                       // occupy the new cell

  if (marker === CELL.START) startPos = { row, col };
  else endPos = { row, col };
  return true;
}

// Moves START to (row, col). Returns true on success.
export function setStart(row, col) {
  return moveMarker(CELL.START, row, col);
}

// Moves END to (row, col). Returns true on success.
export function setEnd(row, col) {
  return moveMarker(CELL.END, row, col);
}


/* ---------- 8. MAZE GENERATION: RECURSIVE BACKTRACKING ---------- */

/*
   Recursive Backtracking (a randomized Depth-First Search):

   Think of the grid as rooms (cells at odd row AND odd column)
   separated by wall cells. Starting from one room we:

     1. Mark the current room as visited (turn it into a path).
     2. Look at the 4 directions in RANDOM order.
     3. If the room 2 steps away is still unvisited (still a wall):
          - knock down the wall between the two rooms,
          - RECURSE into the new room.
     4. When no unvisited neighbour is left, return. The recursion
        "backtracks" to the previous room and tries its other directions.

   Every room ends up visited exactly once, so all rooms are connected
   by exactly one route (a "perfect maze") - there are no closed-off areas.
*/
function carve(row, col) {
  grid[row][col] = CELL.EMPTY;                        // step 1: visit this room

  const directions = shuffle([[-2, 0], [2, 0], [0, -2], [0, 2]]);   // step 2

  for (const [dRow, dCol] of directions) {
    const nextRow = row + dRow;
    const nextCol = col + dCol;

    const insideMaze = nextRow > 0 && nextRow < rows && nextCol > 0 && nextCol < cols;

    // A neighbour room that is still a WALL has not been visited yet
    if (insideMaze && grid[nextRow][nextCol] === CELL.WALL) {
      grid[row + dRow / 2][col + dCol / 2] = CELL.EMPTY;   // step 3: open the wall between
      carve(nextRow, nextCol);                             //         and recurse
    }
  }
  // step 4: nothing left to visit -> return (backtrack)
}

/*
   START / END can sit on any cell, including cells that are walls in
   the maze pattern. This makes sure such a marker touches the maze,
   so a route to it always exists.
*/
function connectToMaze(pos) {
  const around = neighborsOf(pos.row, pos.col);

  // Already touching an open cell? Then it is connected.
  if (around.some(([r, c]) => grid[r][c] !== CELL.WALL)) return;

  // Otherwise open one wall neighbour that itself touches an open cell.
  for (const [r, c] of around) {
    const touchesMaze = neighborsOf(r, c).some(
      ([nr, nc]) => (nr !== pos.row || nc !== pos.col) && grid[nr][nc] !== CELL.WALL
    );
    if (touchesMaze) {
      grid[r][c] = CELL.EMPTY;
      return;
    }
  }

  // Safety net (not reachable with normal grid sizes)
  const [r, c] = around[0];
  grid[r][c] = CELL.EMPTY;
}

/**
 * Replaces the whole grid with a new random maze.
 * The START and END cells keep their current positions and every
 * START -> END route is guaranteed to exist (BFS/DFS/Dijkstra/A* friendly).
 */
export function generateMaze() {
  // 1. Start from a grid that is completely walls
  for (let r = 0; r < rows; r++) {
    grid[r].fill(CELL.WALL);
  }

  // 2. Carve the maze, beginning at room (1, 1)
  carve(1, 1);

  // 3. Put START and END back (they are never overwritten by walls)
  grid[startPos.row][startPos.col] = CELL.START;
  grid[endPos.row][endPos.col] = CELL.END;

  // 4. Make sure both markers are attached to the maze
  connectToMaze(startPos);
  connectToMaze(endPos);

  return getGrid();
}


/* ---------- 9. RESET ---------- */

/**
 * Removes every wall and puts START / END back to their defaults
 * (keeps the current grid size).
 */
export function resetMaze() {
  return initializeGrid(rows, cols);
}


/* ---------- 10. AUTO-INITIALIZE ---------- */

// The grid is ready to use as soon as the module is imported.
initializeGrid();