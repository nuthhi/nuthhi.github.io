class Cell {
  constructor(row, col) {
    this.row = row;
    this.col = col;
    this.isMine = false;
    this.isFlagged = false;
    this.isRevealed = false;
    this.touchingCount = 0;
    this.hitMine = false;
  }

  setMine() { this.isMine = true; }

  flag() { this.isFlagged = !this.isFlagged; }

  reveal() { this.isRevealed = true; }
}

class Minesweeper {
  constructor(r, c, m) {
    this.rows = r;
    this.cols = c;
    this.mineCount = m;
    this.flagCount = m;
    this.isFirstTurn = true;
    this.gameOver = false;
    this.won = false;
    // generate empty field for now
    this.field = [];
    for (let r = 0; r < this.rows; r++) {
      this.field[r] = [];
      for (let c = 0; c < this.cols; c++)
        this.field[r][c] = new Cell(r, c);
    }
  }

  generateField(safeRow,safeCol) {
    // fisher-yates shuffle
    const flat = this.field.flat();
    for (let i = flat.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [flat[i], flat[j]] = [flat[j], flat[i]];
    }

    const totalCells = this.rows*this.cols;
    const allMines = this.mineCount >= totalCells;
    let placed = 0;
    for(const cell of flat) {
      if(placed >= this.mineCount) break;
      if(!allMines && cell.row === safeRow && cell.col === safeCol) continue;
      cell.setMine();
      placed++;
    }
    // set touchingCount
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++)
        if (this.field[r][c].isMine)
          for (const adj of this.getAdjacentCells(r, c))
            adj.touchingCount++;
  }

  getAdjacentCells(row, col) {
    const adjacent = [];
    for (let r = row - 1; r <= row + 1; r++)
      for (let c = col - 1; c <= col + 1; c++) {
        if (r === row && c === col) continue;
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols)
          adjacent.push(this.field[r][c]);
      }
    return adjacent;
  }

  flag(row, col) {
    const cell = this.field[row][col];
    if (this.gameOver || cell.isRevealed) return false;
    if (cell.isFlagged) this.flagCount++;
    else this.flagCount--;
    cell.flag();
    return true;
  }

  select(row, col) {
    if (this.gameOver) return;
    const cell = this.field[row][col];

    // cant select if flagged
    if (cell.isFlagged) return;

    const wasFirst = this.isFirstTurn;
    this.isFirstTurn = false;

    // first turn reveal cell and open all safe neighbors
    if (wasFirst) {
      this.generateField(row,col);
      cell.reveal();
      for (const adjCell of this.getAdjacentCells(row, col))
        if (!adjCell.isFlagged && !adjCell.isMine)
          this.select(adjCell.row, adjCell.col);
      return;
    }

    // hit mine
    if (cell.isMine) {
      cell.reveal();
      cell.hitMine = true;
      this._revealAllMines();
      this.gameOver = true;
      return;
    }

    // select revealed
    // if all adjacent mines are flagged, reveal all unrevealed non-flagged neighbors
    if (cell.isRevealed) {
      // check if any wrong flags (game over)
      let wrongFlag = false;
      for (const adjCell of this.getAdjacentCells(row, col))
        if (adjCell.isFlagged && !adjCell.isMine) { wrongFlag = true; break; }
      if (wrongFlag) {
        for (const adjCell of this.getAdjacentCells(row, col))
          if (adjCell.isMine && !adjCell.isFlagged) { this.select(adjCell.row, adjCell.col); return; }
        return;
      }
      // chord if no unflagged mines
      let anyUnflagged = false;
      for (const adjCell of this.getAdjacentCells(row, col))
        if (adjCell.isMine && !adjCell.isFlagged) { anyUnflagged = true; break; }
      if (!anyUnflagged) {
        for (const adjCell of this.getAdjacentCells(row, col))
          if (!adjCell.isFlagged && !adjCell.isMine && !adjCell.isRevealed)
            this.select(adjCell.row, adjCell.col);
      }
    } else {
      // select unrevealed
      // if no adjacent mines, cascade
      cell.reveal();
      let anyMines = false;
      for (const adjCell of this.getAdjacentCells(row, col))
        if (adjCell.isMine) { anyMines = true; break; }
      if (!anyMines)
        for (const adjCell of this.getAdjacentCells(row, col))
          if (!adjCell.isRevealed && !adjCell.isMine && !adjCell.isFlagged)
            this.select(adjCell.row, adjCell.col);
    }
  }

  _revealAllMines() {
    for (const row of this.field)
      for (const cell of row)
        if (cell.isMine || cell.isFlagged)
          cell.reveal();
  }

  _flagAllMines() {
    for (const row of this.field)
      for (const cell of row)
        if (cell.isMine && !cell.isFlagged)
          cell.flag();
  }

  isGameOver() {
    for (const row of this.field)
      for (const cell of row)
        if (cell.isMine && cell.hitMine) return 'lose';
    for (const row of this.field)
      for (const cell of row)
        if (!cell.isRevealed && !cell.isMine) return false;
    return 'win';
  }
}

// ui
let game          = null;
let timerInterval = null;
let seconds       = 0;
let hoveredRow    = -1;
let hoveredCol    = -1;

let currentRows  = 9;
let currentCols  = 9;
let currentMines = 10;

const board    = document.getElementById('board');
const hudMines = document.getElementById('hud-mines');
const hudTimer = document.getElementById('hud-timer');
const smiley   = document.getElementById('btn-smiley');

// difficulty buttons (maybe move into a menu)
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentRows  = parseInt(btn.dataset.rows);
    currentCols  = parseInt(btn.dataset.cols);
    currentMines = parseInt(btn.dataset.mines);
    startGame();
  });
});

smiley.addEventListener('click', startGame);

// smiley press effect
smiley.addEventListener('mousedown', () => smiley.classList.add('pressed'));
document.addEventListener('mouseup',  () => smiley.classList.remove('pressed'));

function startGame() {
  game = new Minesweeper(currentRows, currentCols, currentMines);
  stopTimer();
  seconds = 0;
  renderTimer();
  smiley.textContent = '🙂';
  hoveredRow = -1;
  hoveredCol = -1;
  renderBoard();
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    seconds = Math.min(999, seconds + 1);
    renderTimer();
  }, 1000);
}

function renderTimer() {
  hudTimer.textContent = String(seconds).padStart(3, '0');
}

function renderBoard() {
  if (!game) return;
  board.style.gridTemplateColumns = `repeat(${game.cols}, 16px)`;
  board.innerHTML = '';

  for (let r = 0; r < game.rows; r++) {
    for (let c = 0; c < game.cols; c++) {
      const cellDiv = document.createElement('div');
      cellDiv.dataset.r = r;
      cellDiv.dataset.c = c;

      applyCell(cellDiv, game.field[r][c]);

      cellDiv.addEventListener('click',       () => handleSelect(r, c));
      cellDiv.addEventListener('contextmenu', e  => { e.preventDefault(); handleFlag(r, c); });
      cellDiv.addEventListener('mouseenter',  () => { hoveredRow = r; hoveredCol = c; });
      cellDiv.addEventListener('mouseleave',  () => { hoveredRow = -1; hoveredCol = -1; });

      board.appendChild(cellDiv);
    }
  }

  hudMines.textContent = String(game.flagCount).padStart(3, '0');
}

function applyCell(cellDiv, cell) {
  cellDiv.className = 'cell';
  cellDiv.textContent = '';
  delete cellDiv.dataset.n;

  if (cell.isRevealed) {
    if (cell.isMine) {
      cellDiv.classList.add(cell.hitMine ? 'mine-hit' : 'mine-revealed');
    } else if (cell.isFlagged) {
      cellDiv.classList.add('wrong-flag');
    } else {
      cellDiv.classList.add('revealed');
      if (cell.touchingCount > 0) {
        cellDiv.textContent = cell.touchingCount;
        cellDiv.dataset.n = cell.touchingCount;
      }
    }
  } else if (cell.isFlagged) {
    cellDiv.classList.add('hidden', 'flagged');
  } else {
    cellDiv.classList.add('hidden');
  }
}

function renderCell(r, c) {
  if (!game) return;
  const cellDiv = board.children[r * game.cols + c];
  if (cellDiv) applyCell(cellDiv, game.field[r][c]);
}

function renderBoardFull() {
  if (!game) return;
  for (let r = 0; r < game.rows; r++)
    for (let c = 0; c < game.cols; c++)
      renderCell(r, c);
  hudMines.textContent = String(game.flagCount).padStart(3, '0');
}

function handleSelect(r, c) {
  if (!game || game.gameOver) return;
  const wasFirstTurn = game.isFirstTurn;
  game.select(r, c);
  if (wasFirstTurn && !game.isFirstTurn) startTimer();
  renderBoardFull();
  checkGameEnd();
}

function handleFlag(r, c) {
  if (!game || game.gameOver) return;
  game.flag(r, c);
  renderCell(r, c);
  hudMines.textContent = String(game.flagCount).padStart(3, '0');
}

function checkGameEnd() {
  if (!game) return;
  const result = game.isGameOver();
  if (result === 'lose') {
    stopTimer();
    game.gameOver = true;
    renderBoardFull();
    smiley.textContent = '😵';
  } else if (result === 'win') {
    stopTimer();
    game.gameOver = true;
    game.won = true;
    game._flagAllMines();
    game.flagCount = 0;
    renderBoardFull();
    smiley.textContent = '😎';
  }
}

// keyboard
document.addEventListener('keydown', e => {
  if (e.key === ' ') e.preventDefault();
  
  if (e.key === 'F2') {
    e.preventDefault();
    startGame();
  }
  if (e.key !== ' ') return;
  if (!game || game.gameOver) return;
  if (hoveredRow < 0 || hoveredCol < 0) return;
  const cell = game.field[hoveredRow][hoveredCol];
  if (cell.isRevealed) {
    handleSelect(hoveredRow, hoveredCol);
  } else {
    handleFlag(hoveredRow, hoveredCol);
  }
});

// init
startGame();