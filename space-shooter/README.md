# Neon Space Shooter

A retro arcade-style space shooter built with HTML5 Canvas + Vanilla JavaScript.

## How to Play

1. Open `index.html` in any modern browser
2. Click **START GAME**
3. Controls:
   - **← →** or **A / D** — move ship
   - **Space** — shoot
4. Shoot enemies before they reach the bottom
5. You have **3 lives** — you lose one when an enemy escapes or hits you
6. Each enemy destroyed = **+10 points**

## Features

- Smooth 60fps animation via `requestAnimationFrame`
- Parallax starfield background
- Neon-glow visual style with scanline overlay
- Live score & lives HUD
- Game over screen with restart
- Responsive layout (works on mobile screens)

## Project Structure

```
space-shooter/
├── index.html   # Canvas + HUD + overlays
├── style.css    # Neon arcade theme
├── game.js      # Game loop, entities, collision, input
└── README.md
```

## Tech

- HTML5 Canvas 2D
- Vanilla JavaScript (ES6+, no frameworks)
- Pure CSS (custom properties, grid, animations)
