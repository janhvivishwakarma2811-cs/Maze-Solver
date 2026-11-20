/* =========================================================
   Maze Solver - UI layer
   The maze DATA lives in maze/mazeGenerator.js (Member 1).
   This file only DRAWS that data and forwards user actions to it.
   ========================================================= */

import {
  CELL,
  getGrid,
  getDimensions,
  getStart,
  getEnd,
  generateMaze,
  resetMaze,
  setCellWall,
  setStart,
  setEnd,
} from "./maze/mazeGenerator.js";
import { bfs } from "./algorithms/bfs.js";
import { dfs } from "./algorithms/dfs.js";

/* ---------- 1. DOM references ---------- */
const gridEl = document.getElementById("grid");
const algorithmSelect = document.getElementById("algorithm");
const generateBtn = document.getElementById("generateBtn");
const solveBtn = document.getElementById("solveBtn");
const clearBtn = document.getElementById("clearBtn");
const resetBtn = document.getElementById("resetBtn");
const compareBtn = document.getElementById("compareBtn");
const toastEl = document.getElementById("toast");

const statAlgorithm = document.getElementById("statAlgorithm");
const statPath = document.getElementById("statPath");
const statVisited = document.getElementById("statVisited");
const statTime = document.getElementById("statTime");

// BFS vs DFS comparison card (Member 5)
const compareEmptyEl = document.getElementById("compareEmpty");
const compareResultsEl = document.getElementById("compareResults");
const compareNoticeEl = document.getElementById("compareNotice");
const cmp = {
  BFS: {
    result: document.getElementById("cmpBfsResult"),
    path: document.getElementById("cmpBfsPath"),
    visited: document.getElementById("cmpBfsVisited"),
    time: document.getElementById("cmpBfsTime"),
  },
  DFS: {
    result: document.getElementById("cmpDfsResult"),
    path: document.getElementById("cmpDfsPath"),
    visited: document.getElementById("cmpDfsVisited"),
    time: document.getElementById("cmpDfsTime"),
  },
};

/* ---------- 2. Build the grid (DOM cells, created once) ---------- */

// cellEls[row][col] -> the <div> that shows that matrix cell
let cellEls = [];

function buildCells() {
  const { rows, cols } = getDimensions();
  gridEl.innerHTML = "";
  gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  cellEls = [];

  for (let r = 0; r < rows; r++) {
    const rowEls = [];
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("div");
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.setAttribute("role", "gridcell");
      gridEl.appendChild(cell);
      rowEls.push(cell);
    }
    cellEls.push(rowEls);
  }
}

/* ---------- 3. Draw the matrix on screen ---------- */

// Copies the state of the maze matrix onto the cell elements.
// mazeChanged is false only for redraws that do not touch the maze data
// (Solve and Clear Path just wipe the old colours); every other redraw
// follows a real change, so old comparison results must be dropped.
function renderGrid(mazeChanged = true) {
  const grid = getGrid();

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const el = cellEls[r][c];
      const state = grid[r][c];

      el.className = "cell";
      el.textContent = "";
      el.removeAttribute("title");

      if (state === CELL.WALL) {
        el.classList.add("cell--wall");
      } else if (state === CELL.START) {
        el.classList.add("cell--start");
        el.textContent = "S";
        el.title = "Start";
      } else if (state === CELL.END) {
        el.classList.add("cell--end");
        el.textContent = "E";
        el.title = "End";
      }
    }
  }

  // Lets other modules know the maze changed (e.g. to drop an old path).
  document.dispatchEvent(new CustomEvent("maze:changed", { detail: { mazeChanged } }));
}

/* ---------- 3b. Solvers and animation ---------- */

// Algorithms that are implemented. Dijkstra and A* are shown in the dropdown
// as disabled "Coming Soon" entries and have no module yet, so they are
// intentionally not listed here.
const SOLVERS = { BFS: bfs, DFS: dfs };

// Animation speed (milliseconds between steps)
const VISIT_DELAY_MS = 15; // explored cells
const PATH_DELAY_MS = 30;  // final path cells
// Long searches are painted a few cells per step, so each stage lasts
// at most (MAX_STEPS x delay) milliseconds.
const MAX_VISIT_STEPS = 200;
const MAX_PATH_STEPS = 100;

let animationTimer = null; // id of the pending setTimeout (null = none)
let isAnimating = false;   // true while a solve animation is running
let hasResult = false;     // true while the statistics of a finished solve are shown
// Incremented every time an animation is stopped. A running animation
// remembers the value it started with and stops painting (and never calls
// onDone) if the value has changed, so an old animation can never draw over
// or report results after a newer action.
let animationRunId = 0;

// Stops any pending animation step and unlocks the Solve button.
// Used both when an animation finishes and when it is cancelled.
function stopAnimation() {
  clearTimeout(animationTimer);
  animationTimer = null;
  animationRunId++;
  isAnimating = false;
  solveBtn.disabled = false;
}

// Adds a visualization class to one cell. START and END are skipped so
// their colour and "S" / "E" marker are never covered.
function paintCell({ row, col }, className) {
  const el = cellEls[row][col];
  if (el.classList.contains("cell--start") || el.classList.contains("cell--end")) return;
  el.classList.add(className);
}

// Paints `cells` one step at a time, then calls onDone().
// Only one timer is ever pending, so stopAnimation() can cancel it.
function animateCells(cells, className, delayMs, maxSteps, onDone) {
  const perStep = Math.max(1, Math.ceil(cells.length / maxSteps));
  const runId = animationRunId; // this animation's token (see stopAnimation)
  let index = 0;

  function step() {
    if (runId !== animationRunId) return; // cancelled: paint nothing more

    const stop = Math.min(index + perStep, cells.length);
    for (; index < stop; index++) paintCell(cells[index], className);

    if (index < cells.length) {
      animationTimer = setTimeout(step, delayMs);
    } else {
      animationTimer = null;
      onDone();
    }
  }

  step();
}

// Called when the whole animation has finished: shows the statistics.
function showResult(algorithmName, result) {
  stopAnimation();
  statAlgorithm.textContent = algorithmName;
  statPath.textContent = result.found ? result.pathLength : "--";
  statVisited.textContent = result.nodesVisited;
  statTime.textContent = `${result.executionTime.toFixed(2)} ms`;
  hasResult = true;
  showToast(result.message);
}

/* ---------- 3c. BFS vs DFS comparison (Member 5) ---------- */

// Hides the comparison results and shows the "click Compare Both" hint.
function clearComparison() {
  compareResultsEl.hidden = true;
  compareEmptyEl.hidden = false;
  compareNoticeEl.hidden = true;
  compareNoticeEl.textContent = "";
}

// Copies the maze into a frozen snapshot (own copy of the matrix + start/end).
// Both algorithms receive this one object, so they are guaranteed to see
// exactly the same maze, and neither can change it (frozen).
function takeMazeSnapshot() {
  const grid = getGrid().map((row) => Object.freeze(row));
  return Object.freeze({
    grid: Object.freeze(grid),
    start: Object.freeze(getStart()),
    end: Object.freeze(getEnd()),
  });
}

// Fills one column (BFS or DFS) of the comparison card.
function fillComparisonColumn(column, result) {
  column.result.textContent = result.found ? "Found" : "No path";
  column.path.textContent = result.found ? result.pathLength : "No path";
  column.visited.textContent = result.nodesVisited;
  column.time.textContent = `${result.executionTime.toFixed(3)} ms`;

  // Red text for the "no path" case, normal colour otherwise
  column.result.classList.toggle("compare__value--nopath", !result.found);
  column.path.classList.toggle("compare__value--nopath", !result.found);
}

// Shows both results side by side, including the no-path message.
function showComparison(bfsResult, dfsResult) {
  fillComparisonColumn(cmp.BFS, bfsResult);
  fillComparisonColumn(cmp.DFS, dfsResult);

  let notice = "";
  if (!bfsResult.found && !dfsResult.found) {
    notice = bfsResult.message === dfsResult.message
      ? `${bfsResult.message}. Neither BFS nor DFS can reach the End.`
      : `BFS: ${bfsResult.message}. DFS: ${dfsResult.message}.`;
  } else if (bfsResult.found !== dfsResult.found) {
    // Cannot happen for a valid maze (both find a path or neither does),
    // but if it ever does, show it instead of hiding it.
    notice = `Results differ - BFS: ${bfsResult.message}. DFS: ${dfsResult.message}.`;
  }
  compareNoticeEl.textContent = notice;
  compareNoticeEl.hidden = notice === "";

  compareEmptyEl.hidden = true;
  compareResultsEl.hidden = false;
}

/* ---------- 4. Statistics helpers ---------- */
function resetStats() {
  statAlgorithm.textContent = algorithmSelect.value;
  statPath.textContent = "--";
  statVisited.textContent = "--";
  statTime.textContent = "-- ms";
  hasResult = false;
}

/* ---------- 5. Toast message ---------- */
let toastTimer;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

/* ---------- 6. Manual editing: click, drag walls, move START / END ---------- */

/*
   Drag modes (decided on pointer-down):
     "draw"   - pressed an empty cell  -> dragging paints walls
     "erase"  - pressed a wall cell    -> dragging removes walls
     "start"  - pressed the START cell -> dragging moves START
     "end"    - pressed the END cell   -> dragging moves END
*/
let dragMode = null;
let lastCell = null; // "row,col" of the last cell handled, avoids repeat work

// Reads the matrix position from a cell element (or null if it is not a cell)
function cellPosition(el) {
  if (!el || !el.classList || !el.classList.contains("cell")) return null;
  return { row: Number(el.dataset.row), col: Number(el.dataset.col) };
}

// Applies the current drag mode to one cell
function applyDrag(row, col) {
  const key = `${row},${col}`;
  if (key === lastCell) return;
  lastCell = key;

  if (dragMode === "draw") setCellWall(row, col, true);
  else if (dragMode === "erase") setCellWall(row, col, false);
  else if (dragMode === "start") setStart(row, col);
  else if (dragMode === "end") setEnd(row, col);

  renderGrid();
}

function stopDrag() {
  dragMode = null;
  lastCell = null;
  gridEl.classList.remove("is-dragging-marker");
}

gridEl.addEventListener("pointerdown", (e) => {
  // Touch screens use the tap handler below so the grid can still scroll
  if (e.pointerType === "touch") return;

  const pos = cellPosition(e.target);
  if (!pos) return;
  e.preventDefault();

  const start = getStart();
  const end = getEnd();

  if (pos.row === start.row && pos.col === start.col) dragMode = "start";
  else if (pos.row === end.row && pos.col === end.col) dragMode = "end";
  else dragMode = e.target.classList.contains("cell--wall") ? "erase" : "draw";

  if (dragMode === "start" || dragMode === "end") {
    gridEl.classList.add("is-dragging-marker");
  }

  // Note: lastCell is reset so the first cell is always handled
  lastCell = null;
  if (dragMode === "draw" || dragMode === "erase") applyDrag(pos.row, pos.col);
});

gridEl.addEventListener("pointermove", (e) => {
  if (!dragMode || e.pointerType === "touch") return;
  const pos = cellPosition(document.elementFromPoint(e.clientX, e.clientY));
  if (pos) applyDrag(pos.row, pos.col);
});

// Stop dragging even if the mouse is released outside the grid
window.addEventListener("pointerup", stopDrag);
window.addEventListener("pointercancel", stopDrag);

// Touch: a single tap toggles a wall
gridEl.addEventListener("click", (e) => {
  if (e.pointerType !== "touch") return;
  const pos = cellPosition(e.target);
  if (!pos) return;
  const isWall = e.target.classList.contains("cell--wall");
  setCellWall(pos.row, pos.col, !isWall);
  renderGrid();
});

/* ---------- 7. Button listeners ---------- */

// Update the "Algorithm" statistic when the dropdown changes, but only
// when no finished result is displayed (so old numbers are never relabelled)
algorithmSelect.addEventListener("change", () => {
  if (!hasResult) statAlgorithm.textContent = algorithmSelect.value;
});

// Any change to the maze (wall edit, moving START / END, Generate, Reset,
// Clear Path) cancels a running animation and clears the old statistics.
// renderGrid() already removed the old visited / path colours.
// The BFS vs DFS comparison is dropped too, unless the redraw did not touch
// the maze data (Solve / Clear Path): then the comparison is still correct.
document.addEventListener("maze:changed", (e) => {
  stopAnimation();
  resetStats();
  if (!e.detail || e.detail.mazeChanged !== false) clearComparison();
});

// Generate Maze: Recursive Backtracking (see maze/mazeGenerator.js)
generateBtn.addEventListener("click", () => {
  generateMaze();
  renderGrid();
  showToast("New maze generated");
});

// Solve Maze: run the selected algorithm, then animate it
solveBtn.addEventListener("click", () => {
  if (isAnimating) return; // never run two animations at once

  const algorithmName = algorithmSelect.value;
  const solver = SOLVERS[algorithmName];

  // Dijkstra and A* are not implemented yet
  if (!solver) {
    showToast(`${algorithmName} solver coming soon`);
    return;
  }

  // Remove any previous visualization and statistics (this also fires
  // "maze:changed", which is why the lock below is set afterwards).
  // false = the maze itself is unchanged, so a comparison stays valid.
  renderGrid(false);

  const result = solver(getGrid(), getStart(), getEnd());

  isAnimating = true;
  solveBtn.disabled = true;

  // 1) explored cells, 2) final path, 3) statistics
  animateCells(result.visitedOrder, "cell--visited", VISIT_DELAY_MS, MAX_VISIT_STEPS, () => {
    if (!result.found) {
      showResult(algorithmName, result); // no path: nothing more to draw
      return;
    }
    animateCells(result.path, "cell--path", PATH_DELAY_MS, MAX_PATH_STEPS, () => {
      showResult(algorithmName, result);
    });
  });
});

// Compare Both: run BFS and DFS on ONE snapshot of the current maze and show
// the results side by side. It runs synchronously (no timers), so the result
// can never be overwritten later by an older, slower action.
compareBtn.addEventListener("click", () => {
  // 1) Cancel any running Solve animation first. Its cells are only half
  //    painted, so redraw the grid to drop them (this also resets the
  //    statistics, exactly like Clear Path does).
  if (isAnimating) {
    stopAnimation();
    renderGrid(false);
  }

  // 2) One frozen snapshot of the maze, shared by both algorithms
  const { grid, start, end } = takeMazeSnapshot();

  // 3) Warm-up run of each algorithm (result discarded) so that neither one
  //    pays the one-time JavaScript start-up cost inside the timing we show.
  bfs(grid, start, end);
  dfs(grid, start, end);

  // 4) The measured runs, both on the same snapshot
  const bfsResult = bfs(grid, start, end);
  const dfsResult = dfs(grid, start, end);

  showComparison(bfsResult, dfsResult);
  showToast("Comparison complete");
});

// Clear Path: renderGrid() redraws every cell from the maze matrix, so the
// visited / path colours disappear while walls, START and END stay.
// The "maze:changed" listener above then resets the statistics.
clearBtn.addEventListener("click", () => {
  renderGrid(false);
  showToast("Path cleared");
});

// Reset: remove all walls, put START / END back, restore placeholder stats
resetBtn.addEventListener("click", () => {
  resetMaze();
  renderGrid();
  resetStats();
  showToast("Grid reset");
});

/* ---------- 8. Initialise ---------- */
buildCells();
renderGrid();
resetStats();