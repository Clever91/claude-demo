'use strict';

// ── Canvas & DOM setup ────────────────────────────────────────────────────────
const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');
let W = 0;
let H = 0;

const scoreEl       = document.getElementById('score');
const levelEl       = document.getElementById('level');
const livesEl       = document.getElementById('lives');
const finalScoreEl  = document.getElementById('final-score');
const overlayStart  = document.getElementById('overlay-start');
const overlayEnd    = document.getElementById('overlay-end');
const btnStart      = document.getElementById('btn-start');
const btnRestart    = document.getElementById('btn-restart');
const levelUpEl     = document.getElementById('level-up');
const levelUpNumEl  = document.getElementById('level-up-num');
const levelUpModeEl = document.getElementById('level-up-mode');

// ── Game configuration ───────────────────────────────────────────────────────
const CONFIG = {
  player:       { width: 40, height: 30, speed: 6, color: '#00f0ff' },
  bullet:       { width: 6,  height: 14, speed: 11, color: '#ff2bd1', pierceColor: '#ffe600' },
  enemy:        { width: 32, height: 28, minSpeed: 1.5, maxSpeed: 3.5, spawnRate: 900 },
  startLives:   3,
  pointsPerHit: 10,
};

// ── Shooter levels (each unlocks a new ability) ──────────────────────────────
const SHOOTER_LEVELS = [
  { name: 'STANDARD',    cooldown: 150, bulletCount: 1, spread: 0,   piercing: false },
  { name: 'RAPID FIRE',  cooldown: 100, bulletCount: 1, spread: 0,   piercing: false },
  { name: 'DOUBLE SHOT', cooldown: 130, bulletCount: 2, spread: 0,   piercing: false },
  { name: 'SPREAD SHOT', cooldown: 140, bulletCount: 3, spread: 1.8, piercing: false },
  { name: 'PIERCING',    cooldown: 130, bulletCount: 3, spread: 1.8, piercing: true  },
  { name: 'OVERDRIVE',   cooldown: 80,  bulletCount: 3, spread: 1.8, piercing: true  },
];

// Score required to REACH each level (index = level - 1). Easier early, harder later.
const LEVEL_THRESHOLDS = [0, 30, 100, 220, 400, 650];

// ── Game state ────────────────────────────────────────────────────────────────
const state = {
  running:    false,
  paused:     false,
  score:      0,
  level:      1,
  lives:      CONFIG.startLives,
  player:     { x: 0, y: 0 },
  bullets:    [],
  enemies:    [],
  stars:      [],
  keys:       {},
  lastShot:   0,
  lastSpawn:  0,
};

// ── Canvas resize ─────────────────────────────────────────────────────────────
function resizeCanvas() {
  W = canvas.offsetWidth  || window.innerWidth;
  H = canvas.offsetHeight || window.innerHeight;
  canvas.width  = W;
  canvas.height = H;
  state.player.x = Math.max(0, Math.min(W - CONFIG.player.width, state.player.x));
  state.player.y = H - 60;
  if (state.stars.length) initStars();
}

// ── Starfield background ─────────────────────────────────────────────────────
function initStars() {
  state.stars = [];
  for (let i = 0; i < 120; i++) {
    state.stars.push({
      x:     Math.random() * W,
      y:     Math.random() * H,
      size:  Math.random() * 1.5 + 0.3,
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

  p.x = Math.max(0, Math.min(W - CONFIG.player.width, p.x));
}

function drawPlayer() {
  const { x, y } = state.player;
  const { width, height, color } = CONFIG.player;

  ctx.shadowBlur = 16;
  ctx.shadowColor = color;
  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.moveTo(x + width / 2, y);
  ctx.lineTo(x,             y + height);
  ctx.lineTo(x + width,     y + height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ff2bd1';
  ctx.shadowColor = '#ff2bd1';
  ctx.fillRect(x + width / 2 - 3, y + height, 6, 6);

  ctx.shadowBlur = 0;
}

// ── Bullets ───────────────────────────────────────────────────────────────────
function getShooterLevel() {
  return SHOOTER_LEVELS[Math.min(state.level - 1, SHOOTER_LEVELS.length - 1)];
}

function shoot() {
  const now = performance.now();
  const lvl = getShooterLevel();
  if (now - state.lastShot < lvl.cooldown) return;
  state.lastShot = now;

  const cx = state.player.x + CONFIG.player.width / 2;
  const py = state.player.y - CONFIG.bullet.height;

  for (let i = 0; i < lvl.bulletCount; i++) {
    const t = lvl.bulletCount === 1 ? 0 : (i - (lvl.bulletCount - 1) / 2);
    state.bullets.push({
      x:        cx - CONFIG.bullet.width / 2 + t * 12,
      y:        py,
      vx:       t * lvl.spread,
      piercing: lvl.piercing,
    });
  }
}

function updateBullets() {
  for (const b of state.bullets) {
    b.y -= CONFIG.bullet.speed;
    b.x += b.vx;
  }
  state.bullets = state.bullets.filter(b =>
    b.y + CONFIG.bullet.height > 0 &&
    b.x > -CONFIG.bullet.width &&
    b.x < W
  );
}

function drawBullets() {
  for (const b of state.bullets) {
    const color = b.piercing ? CONFIG.bullet.pierceColor : CONFIG.bullet.color;
    ctx.shadowBlur = 12;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
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
    x:     Math.random() * (W - CONFIG.enemy.width),
    y:     -CONFIG.enemy.height,
    speed: CONFIG.enemy.minSpeed +
           Math.random() * (CONFIG.enemy.maxSpeed - CONFIG.enemy.minSpeed),
  });
}

function updateEnemies() {
  for (const e of state.enemies) e.y += e.speed;

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

    ctx.beginPath();
    ctx.moveTo(cx,                       e.y);
    ctx.lineTo(e.x + CONFIG.enemy.width, cy);
    ctx.lineTo(cx,                       e.y + CONFIG.enemy.height);
    ctx.lineTo(e.x,                      cy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

// ── Collision detection ──────────────────────────────────────────────────────
function rectsOverlap(a, b) {
  return a.x < b.x + b.width  &&
         a.x + a.width > b.x  &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

function checkCollisions() {
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e     = state.enemies[i];
    const eRect = { x: e.x, y: e.y, width: CONFIG.enemy.width, height: CONFIG.enemy.height };

    for (let j = state.bullets.length - 1; j >= 0; j--) {
      const b     = state.bullets[j];
      const bRect = { x: b.x, y: b.y, width: CONFIG.bullet.width, height: CONFIG.bullet.height };

      if (rectsOverlap(eRect, bRect)) {
        state.enemies.splice(i, 1);
        if (!b.piercing) state.bullets.splice(j, 1);
        state.score += CONFIG.pointsPerHit;
        updateScoreDisplay();
        checkLevelUp();
        break;
      }
    }
  }

  const pRect = {
    x: state.player.x, y: state.player.y,
    width: CONFIG.player.width, height: CONFIG.player.height,
  };
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e     = state.enemies[i];
    const eRect = { x: e.x, y: e.y, width: CONFIG.enemy.width, height: CONFIG.enemy.height };
    if (rectsOverlap(pRect, eRect)) {
      state.enemies.splice(i, 1);
      state.lives--;
      updateLivesDisplay();
      if (state.lives <= 0) endGame();
    }
  }
}

// ── Level system ─────────────────────────────────────────────────────────────
function checkLevelUp() {
  if (state.level >= SHOOTER_LEVELS.length) return;
  if (state.score >= LEVEL_THRESHOLDS[state.level]) {
    state.level++;
    updateLevelDisplay();
    showLevelUp(state.level, getShooterLevel().name);
  }
}

let levelUpTimeout = 0;
function showLevelUp(level, modeName) {
  levelUpNumEl.textContent  = level;
  levelUpModeEl.textContent = modeName;
  levelUpEl.classList.add('show');
  clearTimeout(levelUpTimeout);
  levelUpTimeout = setTimeout(() => levelUpEl.classList.remove('show'), 1600);
}

// ── HUD updates ───────────────────────────────────────────────────────────────
function updateScoreDisplay() { scoreEl.textContent = state.score; }
function updateLevelDisplay() { levelEl.textContent = state.level; }

function updateLivesDisplay() {
  livesEl.textContent = state.lives > 0
    ? '♥ '.repeat(state.lives).trim()
    : '—';
}

// ── Game loop ─────────────────────────────────────────────────────────────────
function loop() {
  if (!state.running || state.paused) return;

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
  state.running   = true;
  state.paused    = false;
  state.score     = 0;
  state.level     = 1;
  state.lives     = CONFIG.startLives;
  state.player    = { x: W / 2 - CONFIG.player.width / 2, y: H - 60 };
  state.bullets   = [];
  state.enemies   = [];
  state.keys      = {};
  state.lastShot  = 0;
  state.lastSpawn = 0;

  initStars();
  updateScoreDisplay();
  updateLevelDisplay();
  updateLivesDisplay();

  overlayStart.classList.add('hidden');
  overlayEnd.classList.add('hidden');
  levelUpEl.classList.remove('show');

  requestAnimationFrame(loop);
}

function endGame() {
  state.running = false;
  finalScoreEl.textContent = state.score;
  overlayEnd.classList.remove('hidden');
}

// ── Input ─────────────────────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  // Start/restart with Enter or Space when game not running.
  // !e.repeat avoids firing on autorepeat (e.g. if Space was held when game ended).
  if (!state.running && !e.repeat && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    startGame();
    return;
  }

  state.keys[e.key] = true;
  if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
    e.preventDefault();
  }
});

window.addEventListener('keyup', e => {
  state.keys[e.key] = false;
});

btnStart.addEventListener('click', startGame);
btnRestart.addEventListener('click', startGame);

// ── Settings panel ─────────────────────────────────────────────────────────────
const settingsPanel    = document.getElementById('settings-panel');
const btnSettings      = document.getElementById('btn-settings');
const btnCloseSettings = document.getElementById('btn-close-settings');
const sliderEnemy      = document.getElementById('enemy-speed');
const enemySpeedVal    = document.getElementById('enemy-speed-val');
const bgColorPicker    = document.getElementById('bg-color');
const screenSizeSelect = document.getElementById('screen-size');
const gameAreaEl       = document.getElementById('game-area');

btnSettings.addEventListener('click', () => {
  settingsPanel.classList.add('open');
  if (state.running) state.paused = true;
});

btnCloseSettings.addEventListener('click', () => {
  settingsPanel.classList.remove('open');
  if (state.running && state.paused) {
    state.paused = false;
    requestAnimationFrame(loop);
  }
});

sliderEnemy.addEventListener('input', e => {
  const val = parseFloat(e.target.value);
  enemySpeedVal.textContent = val;
  CONFIG.enemy.minSpeed = +(val * 0.75).toFixed(2);
  CONFIG.enemy.maxSpeed = +(val * 1.75).toFixed(2);
});

bgColorPicker.addEventListener('input', e => {
  canvas.style.background = e.target.value;
});

screenSizeSelect.addEventListener('change', e => {
  const value = e.target.value;
  if (value === 'full') {
    gameAreaEl.classList.remove('fixed');
    gameAreaEl.style.removeProperty('--game-w');
    gameAreaEl.style.removeProperty('--game-h');
  } else {
    const [w, h] = value.split('x').map(Number);
    gameAreaEl.classList.add('fixed');
    gameAreaEl.style.setProperty('--game-w', w + 'px');
    gameAreaEl.style.setProperty('--game-h', h + 'px');
  }
  // Layout updates synchronously; resize on next frame to read correct offsets.
  requestAnimationFrame(() => {
    resizeCanvas();
    if (!state.running || state.paused) {
      ctx.clearRect(0, 0, W, H);
      drawStars();
    }
  });
});

// ── Initialization ────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  resizeCanvas();
  initStars();
  drawStars();
});

window.addEventListener('resize', () => {
  resizeCanvas();
  if (!state.running || state.paused) {
    ctx.clearRect(0, 0, W, H);
    drawStars();
  }
});
