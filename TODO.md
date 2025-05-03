# TODO for StarScrap (1-Week Development Plan)

## Overview
- **Project**: StarScrap, a 2D multiplayer battle royale with impostors and crewmates.
- **Deadline**: 1 week (May 2, 2025 - May 9, 2025).
- **Tech Stack**: HTML, CSS, JavaScript (frontend), Express with Express-Session and WebSocket (backend).
- **Goal**: Build a functional game with a front page, gameplay, game over page, cheating mechanism, and multiplayer support.

## Daily Tasks

### Day 1 (May 2, 2025): Project Setup & Backend Foundation
- [x] Set up project structure:
  - Create directories: `public/` (for frontend files), `server/` (for backend files).
  - Initialize `package.json` with `npm init -y`.
- [x] Install dependencies:
  - `npm install express express-session ws`.
- [x] Create basic Express server (`server/server.js`):
  - Serve static files from `public/`.
  - Set up Express-Session to manage player sessions (store player IDs, roles).
  - Integrate WebSocket (`ws`) for real-time multiplayer communication.
- [x] Test server:
  - Run server with `node server.js`.
  - Access `http://localhost:8000` to confirm it serves a basic HTML file.

### Front Page & Basic Frontend Setup
- [ ] Create `public/index.html` for the front page:
  - Add title: "StarScrap" in a bold, gritty, pixelated font (find/integrate a suitable font).
  - Add description: "Survive, scavenge, and uncover impostors in a chaotic 2D battle royale!"
  - Add a "Start Game" button.
  - Optional: Display a static map preview (`ship.png`?) with tiny character sprites.
- [ ] Create `public/styles.css`:
  - Style the front page with a retro background (e.g., starry sky) and pixelated font. Center layout.
- [ ] Create `public/game.js`:
  - Set up basic JavaScript to handle page navigation (front page to game page).
  - Add a `<canvas>` for the 2D game arena.
  - Add UI elements for timer, safe zone indicator, task progress.
- [ ] Test front page:
  - Ensure the "Start Game" button switches to a placeholder game page.

### Day 3 (May 4, 2025): Gameplay Page - Core Mechanics
- [ ] Create game page structure in `index.html`:
  - Add a `<canvas>` for the 2D game arena.
  - Add a div for the timer, safe zone indicator, and task progress.
- [ ] Implement basic game mechanics in `game.js`:
  - Draw the 2D top-down arena using `ship.png` as the background map on Canvas.
  - Implement player movement (arrow keys/WASD), constrained by boundaries defined in `mapbound.js`.
  - Display players using sprites from `player.png` (handle animation frames). Assign blue/red tints or overlays based on role (crewmate/impostor).
- [ ] Connect frontend to backend:
  - Use WebSocket to send player movements and actions to the server.
  - Broadcast player positions to all connected clients.
- [ ] Test gameplay:
  - Ensure multiple players can join (via different browser tabs) and move around.

### Day 4 (May 5, 2025): Gameplay Page - Tasks, Traps & Meetings
- [ ] Add scavenging and tasks:
  - Draw interactable crates on the map; clicking gives items (e.g., laser gun, sword, health pack). Update player state via WebSocket.
  - Add task spots (e.g., fix wire, rope horse); crewmates click to "complete" them (increment task counter via WebSocket). Tasks might appear outside the safe zone.
- [ ] Add impostor mechanics:
  - Impostors click near crewmates to attack (send attack action via WebSocket).
  - Impostors press ‘T’ to set a trap (e.g., a fake task that stuns crewmates for ~3 seconds). Send trap placement via WebSocket.
- [ ] Add meeting system:
  - Press ‘M’ to call a meeting (pauses game, shows voting UI). Send meeting request via WebSocket.
  - Players vote to eject someone (send vote via WebSocket). Server processes votes and broadcasts ejection result.
- [ ] Test mechanics:
  - Verify tasks increment, traps stun, and meetings eject players.

### Day 5 (May 6, 2025): Safe Zone, Win/Lose Conditions & Cheating
- [ ] Add shrinking safe zone:
  - Draw a shrinking zone on the canvas (shrinks periodically, e.g., every 30 seconds).
  - Players outside the zone lose health over time (server calculates, updates state via WebSocket).
- [ ] Implement win/lose conditions:
  - Crewmates win: All tasks completed OR all impostors eliminated.
  - Impostors win: Crewmate count <= impostor count OR time runs out (if applicable) OR sabotage succeeds (if added).
  - Individual Lose: Player eliminated (killed), voted out, or dies outside safe zone.
- [ ] Add cheating mechanism:
  - Enable: Press ‘Ctrl + C’ to reveal roles (impostors glow red) for 5 seconds. (Client-side effect).
  - Disable: Automatically disable after 5 seconds or press ‘X’ to disable manually.
- [ ] Test gameplay:
  - Ensure safe zone shrinks, win/lose conditions trigger, and cheating works.

### Day 6 (May 7, 2025): Game Over Page & Polish
- [ ] Create game over page in `index.html` (or dynamically display overlay):
  - Display message: "Crewmates Win!", "Impostors Win!", or "You were Eliminated!".
  - Show recap: List who the impostors were, number of tasks completed.
  - Display player's score (tasks done, eliminations, survival time).
  - Add a "Play Again" button (triggers reset/rejoin logic).
- [ ] Style game over page in `styles.css`:
  - Match the retro theme with pixelated fonts and effects.
- [ ] Polish gameplay:
  - Add player sprite animations (walking using frames from `player.png`).
  - Add visual feedback (e.g., players flash when hit, task progress bar fills).
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
- [ ] Add visual effects for the safe zone shrinking (e.g., border color change, overlay).

## Notes
- **Assets**: Use provided `player.png` (player sprite sheet), `ship.png` (map background), and `mapbound.js` (collision boundaries).
- Focus on core functionality first: front page, gameplay, and multiplayer.
- Use Express-Session to track player IDs and roles (crewmate/impostor) - Assign roles randomly on connection/game start.
- WebSocket (`ws`) will handle real-time updates (player positions, actions, tasks, votes, game state changes).
- Use Canvas for rendering the game state based on data received from the server.
- Test frequently to catch issues early.

Good luck, and let's make **StarScrap** a chaotic blast!
