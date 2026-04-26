# claude-demo

Learning project for exploring Claude Code features.

## Project Structure

```
claude-demo/
└── tic-tac-toe/      # Browser-based game (pure HTML/CSS/JS)
    ├── index.html
    ├── style.css
    └── game.js
```

## Tech Stack

- Pure HTML5, CSS3, Vanilla JavaScript
- No frameworks, no build tools, no dependencies
- Open `index.html` directly in any browser to run

## Conventions

- No build step — files run directly in the browser
- JavaScript: ES6+, `'use strict'`, plain state objects (no classes)
- CSS: custom properties (design tokens) on `:root`, BEM-style class names
- No comments unless the "why" is non-obvious

## Git

- Remote: `git@github.com:Clever91/claude-demo.git`
- Default branch: `master`
- Create a new branch for each feature/change, then open a PR
