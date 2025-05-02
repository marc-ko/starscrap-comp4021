# TODO for StarScrap (1-Week Development Plan)

## Overview
- **Project**: StarScrap, a 2D multiplayer battle royale with impostors and crewmates.
- **Deadline**: 1 week (May 2, 2025 - May 9, 2025).
- **Tech Stack**: HTML, CSS, JavaScript (frontend), Express with Express-Session and WebSocket (backend).
- **Goal**: Build a functional game with a front page, gameplay, game over page, cheating mechanism, and multiplayer support.

## Daily Tasks

### Day 1 (May 2, 2025): Project Setup & Backend Foundation
- [ ] Set up project structure:
  - Create directories: `public/` (for frontend files), `server/` (for backend files).
  - Initialize `package.json` with `npm init -y`.
- [ ] Install dependencies:
  - `npm install express express-session ws`.
- [ ] Create basic Express server (`server/server.js`):
  - Serve static files from `public/`.
  - Set up Express-Session to manage player sessions (store player IDs, roles).
  - Integrate WebSocket (`ws`) for real-time multiplayer communication.
- [ ] Test server:
  - Run server with `node server.js`.
  - Access `http://localhost:8000` to confirm it serves a basic HTML file.

### Front Page & Basic Frontend Setup
- [ ] Create `public/index.html` for the front page:
  - Add title: "StarScrap" in a pixelated font (e.g., via Google Fonts).
  - Add description: "Survive, scavenge, and uncover impostors in a chaotic 2D battle royale!"
  - Add a "Start Game" button.
  - Style with basic CSS (retro background, centered layout).
- [ ] Create `public/styles.css`:
  - Style the front page with a starry sky background and pixelated font.
- [ ] Create `public/game.js`:
  - Set up basic JavaScript to handle page navigation (front page to game page).
- [ ] Test front page:
  - Ensure the "Start Game" button switches to a placeholder game page.

### Day 3 (May 4, 2025): Gameplay Page - Core Mechanics
- [ ] Create game page structure in `index.html`:
  - Add a `<canvas>` for the 2D game arena.
  - Add a div for the timer, safe zone indicator, and task progress.
- [ ] Implement basic game mechanics in `game.js`:
  - Draw a 2D top-down arena using Canvas (e.g., a simple spaceship layout).
  - Add player movement with arrow keys/WASD.
  - Display players as colored circles (e.g., blue for crewmates, red for impostors).
- [ ] Connect frontend to backend:
  - Use WebSocket to send player movements to the server.
  - Broadcast player positions to all connected clients.
- [ ] Test gameplay:
  - Ensure multiple players can join (via different browser tabs) and move around.

### Day 4 (May 5, 2025): Gameplay Page - Tasks, Traps & Meetings
- [ ] Add scavenging and tasks:
  - Draw crates on the map; clicking them gives weapons/health (update player state via WebSocket).
  - Add task spots (e.g., squares); crewmates click to "complete" them (increment task counter).
- [ ] Add impostor mechanics:
  - Impostors can attack nearby crewmates (click to reduce health).
  - Impostors press ‘T’ to set a trap (e.g., a fake task that stuns crewmates for 3 seconds).
- [ ] Add meeting system:
  - Press ‘M’ to call a meeting (pauses game, shows a voting screen).
  - Players vote to eject someone (send vote via WebSocket, eject if majority).
- [ ] Test mechanics:
  - Verify tasks increment, traps stun, and meetings eject players.

### Day 5 (May 6, 2025): Safe Zone, Win/Lose Conditions & Cheating
- [ ] Add shrinking safe zone:
  - Draw a shrinking rectangle on the canvas (shrinks every 30 seconds).
  - Players outside lose health over time (update via WebSocket).
- [ ] Implement win/lose conditions:
  - Crewmates win: All tasks completed (e.g., 5 tasks).
  - Impostors win: Crewmates are outnumbered or eliminated.
  - Lose: Player is eliminated, voted out, or dies outside the safe zone.
- [ ] Add cheating mechanism:
  - Press ‘Ctrl + C’ to reveal roles (impostors glow red) for 5 seconds.
  - Auto-disable after 5 seconds or press ‘X’ to disable manually.
- [ ] Test gameplay:
  - Ensure safe zone shrinks, win/lose conditions trigger, and cheating works.

### Day 6 (May 7, 2025): Game Over Page & Polish
- [ ] Create game over page in `index.html`:
  - Add a message: "Crewmates Win!", "Impostors Win!", or "Last Survivor!".
  - Show a recap: List impostors and tasks completed.
  - Display player’s score (tasks done, eliminations, survival time).
  - Add a "Play Again" button.
- [ ] Style game over page in `styles.css`:
  - Match the retro theme with pixelated fonts and effects.
- [ ] Polish gameplay:
  - Add simple animations (e.g., players flash when hit).
  - Add sound effects (e.g., task completion, attack) using `<audio>` tags.
- [ ] Test game over:
  - Ensure game over page displays correctly and "Play Again" resets the game.

### Day 7 (May 8, 2025): Final Testing & Submission Prep
- [ ] Test multiplayer:
  - Open multiple browser tabs to simulate players.
  - Verify session management, role assignment, and real-time updates via WebSocket.
- [ ] Fix bugs:
  - Debug any issues with movement, tasks, or win/lose conditions.
- [ ] Create `README.md`:
  - Add instructions to run: `npm install`, `node server.js`, access `http://localhost:8000`.
- [ ] Final test:
  - Play a full game to ensure all features (front page, gameplay, game over, cheating) work.
- [ ] Prepare submission:
  - Zip the project folder and double-check all files are included.

## Stretch Goals (If Time Permits, May 9, 2025)
- [ ] Add a map preview on the front page.
- [ ] Add more task types (e.g., click-and-hold to "repair").
- [ ] Add visual effects for the safe zone shrinking.

## Notes
- Focus on core functionality first: front page, gameplay, and multiplayer.
- Use Express-Session to track player IDs and roles (crewmate/impostor).
- WebSocket (`ws`) will handle real-time updates (player positions, tasks, votes).
- Keep graphics simple: Use Canvas shapes (circles for players, squares for tasks/crates).
- Test frequently to catch issues early.

Good luck, and let’s make **StarScrap** a chaotic blast!
