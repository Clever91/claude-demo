'use strict';

// ── Canvas & DOM setup ────────────────────────────────────────────────────────
const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');
const W      = canvas.width;
const H      = canvas.height;

const scoreEl       = document.getElementById('score');
const livesEl       = document.getElementById('lives');
const finalScoreEl  = document.getElementById('final-score');
const overlayStart  = document.getElementById('overlay-start');
const overlayEnd    = document.getElementById('overlay-end');
const btnStart      = document.getElementById('btn-start');
const btnRestart    = document.getElementById('btn-restart');

// ── Game configuration ───────────────────────────────────────────────────────
const CONFIG = {
  player:       { width: 40, height: 30, speed: 6, color: '#00f0ff' },
  bullet:       { width: 4,  height: 12, speed: 9, color: '#ff2bd1', cooldown: 180 },
  enemy:        { width: 32, height: 28, minSpeed: 1.5, maxSpeed: 3.5, spawnRate: 900 },
  startLives:   3,
  pointsPerHit: 10,
};

// ── Game state ────────────────────────────────────────────────────────────────
const state = {
  running:    false,
  score:      0,
  lives:      CONFIG.startLives,
  player:     { x: W / 2 - 20, y: H - 60 },
  bullets:    [],
  enemies:    [],
  stars:      [],
  keys:       {},
  lastShot:   0,
  lastSpawn:  0,
};

// ── Starfield background ─────────────────────────────────────────────────────
function initStars() {
  state.stars = [];
  for (let i = 0; i < 80; i++) {
    state.stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      size: Math.random() * 1.5 + 0.3,
      speed: Math.random() * 0.6 + 0.2,
    });
  }
}

function updateStars() {
  for (const star of state.stars) {
    star.y += star.speed;
    if (star.y > H) {
      star.y = 0;
      star.x = Math.random() * W;
    }
  }
}

function drawStars() {
  ctx.fillStyle = '#ffffff';
  for (const star of state.stars) {
    ctx.globalAlpha = 0.4 + star.speed * 0.5;
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }
  ctx.globalAlpha = 1;
}

// ── Player ────────────────────────────────────────────────────────────────────
function updatePlayer() {
  const p = state.player;
  const s = CONFIG.player.speed;

  if (state.keys['ArrowLeft']  || state.keys['a']) p.x -= s;
  if (state.keys['ArrowRight'] || state.keys['d']) p.x += s;

  // clamp to screen
  p.x = Math.max(0, Math.min(W - CONFIG.player.width, p.x));
}

function drawPlayer() {
  const { x, y } = state.player;
  const { width, height, color } = CONFIG.player;

  ctx.shadowBlur = 16;
  ctx.shadowColor = color;
  ctx.fillStyle = color;

  // Triangle ship
  ctx.beginPath();
  ctx.moveTo(x + width / 2, y);             // top
  ctx.lineTo(x,             y + height);    // bottom-left
  ctx.lineTo(x + width,     y + height);    // bottom-right
  ctx.closePath();
  ctx.fill();

  // Engine glow
  ctx.fillStyle = '#ff2bd1';
  ctx.shadowColor = '#ff2bd1';
  ctx.fillRect(x + width / 2 - 3, y + height, 6, 6);

  ctx.shadowBlur = 0;
}

// ── Bullets ───────────────────────────────────────────────────────────────────
function shoot() {
  const now = performance.now();
  if (now - state.lastShot < CONFIG.bullet.cooldown) return;
  state.lastShot = now;

  state.bullets.push({
    x: state.player.x + CONFIG.player.width / 2 - CONFIG.bullet.width / 2,
    y: state.player.y - CONFIG.bullet.height,
  });
}

function updateBullets() {
  for (const b of state.bullets) b.y -= CONFIG.bullet.speed;
  state.bullets = state.bullets.filter(b => b.y + CONFIG.bullet.height > 0);
}

function drawBullets() {
  ctx.shadowBlur = 12;
  ctx.shadowColor = CONFIG.bullet.color;
  ctx.fillStyle = CONFIG.bullet.color;
  for (const b of state.bullets) {
    ctx.fillRect(b.x, b.y, CONFIG.bullet.width, CONFIG.bullet.height);
  }
  ctx.shadowBlur = 0;
}

// ── Enemies ───────────────────────────────────────────────────────────────────
function spawnEnemy() {
  const now = performance.now();
  if (now - state.lastSpawn < CONFIG.enemy.spawnRate) return;
  state.lastSpawn = now;

  state.enemies.push({
    x: Math.random() * (W - CONFIG.enemy.width),
    y: -CONFIG.enemy.height,
    speed: CONFIG.enemy.minSpeed +
           Math.random() * (CONFIG.enemy.maxSpeed - CONFIG.enemy.minSpeed),
  });
}

function updateEnemies() {
  for (const e of state.enemies) e.y += e.speed;

  // Enemies that escaped off bottom cost a life
  const escaped = state.enemies.filter(e => e.y > H);
  if (escaped.length) {
    state.lives -= escaped.length;
    updateLivesDisplay();
    if (state.lives <= 0) endGame();
  }

  state.enemies = state.enemies.filter(e => e.y <= H);
}

function drawEnemies() {
  for (const e of state.enemies) {
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ff2bd1';
    ctx.fillStyle = '#ff2bd1';

    const cx = e.x + CONFIG.enemy.width / 2;
    const cy = e.y + CONFIG.enemy.height / 2;

    // Diamond enemy shape
    ctx.beginPath();
    ctx.moveTo(cx,                          e.y);
    ctx.lineTo(e.x + CONFIG.enemy.width,    cy);
    ctx.lineTo(cx,                          e.y + CONFIG.enemy.height);
    ctx.lineTo(e.x,                         cy);
    ctx.closePath();
    ctx.fill();

    // Inner core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

// ── Collision detection ──────────────────────────────────────────────────────
function rectsOverlap(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

function checkCollisions() {
  // Bullet ↔ enemy
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    const eRect = { x: e.x, y: e.y, width: CONFIG.enemy.width, height: CONFIG.enemy.height };

    for (let j = state.bullets.length - 1; j >= 0; j--) {
      const b = state.bullets[j];
      const bRect = { x: b.x, y: b.y, width: CONFIG.bullet.width, height: CONFIG.bullet.height };

      if (rectsOverlap(eRect, bRect)) {
        state.enemies.splice(i, 1);
        state.bullets.splice(j, 1);
        state.score += CONFIG.pointsPerHit;
        updateScoreDisplay();
        break;
      }
    }
  }

  // Enemy ↔ player
  const pRect = {
    x: state.player.x, y: state.player.y,
    width: CONFIG.player.width, height: CONFIG.player.height,
  };
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    const eRect = { x: e.x, y: e.y, width: CONFIG.enemy.width, height: CONFIG.enemy.height };
    if (rectsOverlap(pRect, eRect)) {
      state.enemies.splice(i, 1);
      state.lives--;
      updateLivesDisplay();
      if (state.lives <= 0) endGame();
    }
  }
}

// ── HUD updates ───────────────────────────────────────────────────────────────
function updateScoreDisplay() {
  scoreEl.textContent = state.score;
}

function updateLivesDisplay() {
  livesEl.textContent = state.lives > 0
    ? '♥ '.repeat(state.lives).trim()
    : '—';
}

// ── Game loop ─────────────────────────────────────────────────────────────────
function loop() {
  if (!state.running) return;

  ctx.clearRect(0, 0, W, H);

  updateStars();
  updatePlayer();
  if (state.keys[' ']) shoot();
  updateBullets();
  spawnEnemy();
  updateEnemies();
  checkCollisions();

  drawStars();
  drawPlayer();
  drawBullets();
  drawEnemies();

  requestAnimationFrame(loop);
}

// ── Game lifecycle ───────────────────────────────────────────────────────────
function startGame() {
  state.running = true;
  state.score = 0;
  state.lives = CONFIG.startLives;
  state.player = { x: W / 2 - 20, y: H - 60 };
  state.bullets = [];
  state.enemies = [];
  state.lastShot = 0;
  state.lastSpawn = 0;

  initStars();
  updateScoreDisplay();
  updateLivesDisplay();

  overlayStart.classList.add('hidden');
  overlayEnd.classList.add('hidden');

  requestAnimationFrame(loop);
}

function endGame() {
  state.running = false;
  finalScoreEl.textContent = state.score;
  overlayEnd.classList.remove('hidden');
}

// ── Input ─────────────────────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  state.keys[e.key] = true;
  // Prevent scrolling on space/arrows
  if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
    e.preventDefault();
  }
});

window.addEventListener('keyup', e => {
  state.keys[e.key] = false;
});

btnStart.addEventListener('click', startGame);
btnRestart.addEventListener('click', startGame);

// Draw initial starfield behind the start overlay
initStars();
drawStars();
