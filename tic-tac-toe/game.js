'use strict';

// ── Win conditions ────────────────────────────────────────────────────────────
const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],  // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8],  // cols
  [0, 4, 8], [2, 4, 6],              // diagonals
];

// ── Game state ────────────────────────────────────────────────────────────────
const state = {
  board:         Array(9).fill(null),
  currentPlayer: 'X',
  gameOver:      false,
  winner:        null,   // 'X' | 'O' | 'draw' | null
  winLine:       null,   // [i, j, k] | null
  scores:        { X: 0, O: 0, draw: 0 },
};

// ── Pure helpers ──────────────────────────────────────────────────────────────
function checkWinner(board) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  return null;
}

function checkDraw(board) {
  return board.every(cell => cell !== null);
}

// ── DOM refs (populated in DOMContentLoaded) ──────────────────────────────────
let cells, boardEl, statusEl, winsXEl, winsOEl, winsDrawEl, overlay, overlayResultEl;

// ── Rendering ─────────────────────────────────────────────────────────────────
function renderCell(index) {
  const cell = cells[index];
  const player = state.board[index];

  cell.textContent = player;
  cell.classList.add(player === 'X' ? 'cell--x' : 'cell--o');

  // Force reflow so the animation re-triggers even if re-playing same cell area
  void cell.offsetWidth;
  cell.classList.add('cell--played');
}

function renderBoard() {
  cells.forEach(cell => {
    cell.textContent = '';
    cell.className = 'cell';
    delete cell.dataset.player;
  });
  boardEl.classList.remove('board--locked');
}

function updateStatus() {
  if (state.gameOver) {
    if (state.winner === 'draw') {
      statusEl.textContent = "It's a Draw!";
    } else {
      statusEl.textContent = `Player ${state.winner} Wins!`;
    }
  } else {
    statusEl.textContent = `Player ${state.currentPlayer}'s turn`;
  }
}

function updateScoreboard() {
  const bump = el => {
    el.classList.remove('score-value--bump');
    void el.offsetWidth;
    el.classList.add('score-value--bump');
    el.addEventListener('animationend', () => el.classList.remove('score-value--bump'), { once: true });
  };

  winsXEl.textContent    = state.scores.X;
  winsOEl.textContent    = state.scores.O;
  winsDrawEl.textContent = state.scores.draw;

  if (state.winner === 'X')    bump(winsXEl);
  if (state.winner === 'O')    bump(winsOEl);
  if (state.winner === 'draw') bump(winsDrawEl);
}

// ── Overlay ───────────────────────────────────────────────────────────────────
function showOverlay() {
  if (state.winner === 'draw') {
    overlayResultEl.textContent = "It's a Draw!";
    overlayResultEl.style.color = '#f5a623';
  } else {
    overlayResultEl.textContent = `Player ${state.winner} Wins! 🎉`;
    overlayResultEl.style.color = state.winner === 'X' ? '#e94560' : '#4cc9f0';
  }

  // rAF ensures transition fires from the hidden state
  requestAnimationFrame(() => {
    overlay.classList.add('overlay--visible');
    overlay.setAttribute('aria-hidden', 'false');
  });
}

function hideOverlay() {
  overlay.classList.remove('overlay--visible');
  overlay.setAttribute('aria-hidden', 'true');
}

// ── Game logic ────────────────────────────────────────────────────────────────
function highlightWinLine() {
  const player = state.winner.toLowerCase();
  state.winLine.forEach(index => {
    cells[index].classList.add('cell--win');
    cells[index].dataset.player = player;
  });
}

function endGame(type) {
  state.gameOver = true;

  if (type === 'winner') {
    highlightWinLine();
  } else {
    state.winner = 'draw';
  }

  state.scores[state.winner]++;
  boardEl.classList.add('board--locked');
  updateScoreboard();
  updateStatus();

  // Short delay before overlay so the win animation is visible first
  setTimeout(showOverlay, 600);
}

function handleCellClick(index) {
  if (state.gameOver || state.board[index]) return;

  state.board[index] = state.currentPlayer;
  renderCell(index);

  const result = checkWinner(state.board);
  if (result) {
    state.winner  = result.winner;
    state.winLine = result.line;
    endGame('winner');
    return;
  }

  if (checkDraw(state.board)) {
    endGame('draw');
    return;
  }

  state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
  updateStatus();
}

function restartGame() {
  state.board         = Array(9).fill(null);
  state.currentPlayer = 'X';
  state.gameOver      = false;
  state.winner        = null;
  state.winLine       = null;

  hideOverlay();
  renderBoard();
  updateStatus();
}

function resetScores() {
  state.scores = { X: 0, O: 0, draw: 0 };
  state.winner = null;
  updateScoreboard();
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  boardEl          = document.getElementById('board');
  statusEl         = document.getElementById('status-text');
  winsXEl          = document.getElementById('wins-x');
  winsOEl          = document.getElementById('wins-o');
  winsDrawEl       = document.getElementById('wins-draw');
  overlay          = document.getElementById('overlay');
  overlayResultEl  = document.getElementById('overlay-result');
  cells            = [...boardEl.querySelectorAll('.cell')];

  cells.forEach((cell, i) => cell.addEventListener('click', () => handleCellClick(i)));

  document.getElementById('btn-restart').addEventListener('click', restartGame);
  document.getElementById('btn-reset-scores').addEventListener('click', resetScores);
  document.getElementById('btn-play-again').addEventListener('click', restartGame);

  updateStatus();
  updateScoreboard();
});
