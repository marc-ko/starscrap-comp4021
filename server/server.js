const express = require('express');
const session = require('express-session');
const httpServer = require('http');
const WebSocket = require('ws');
const path = require('path');
const bcrypt = require("bcrypt");
const fs = require("fs");
const { connect } = require('http2');
// Player constants
const PLAYER_HEIGHT = 50;
const PLAYER_WIDTH = 37;
const PLAYER_START_X = 1400;
const PLAYER_START_Y = 580;

const app = express();
const port = 8000;

// Setup session middleware
const sessionParser = session({
    secret: 'supersecretkey', // Replace with a real secret in production!
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
});
app.use(sessionParser);

function containWordCharsOnly(text) {
    return /^\w+$/.test(text);
}

app.use(express.json());
app.post("/register", (req, res) => {
    const { username, password } = req.body;

    let users = fs.readFileSync("data/users.json", "utf8");
    users = JSON.parse(users);
    if (users[username]) {
        res.json({ status: "error", error: "Username already exists." });
        return;
    }
    if (!containWordCharsOnly(username)) {
        res.json({ status: "error", error: "Username can only contain word characters." });
        return;
    }
    if (!username || !password) {
        res.json({ status: "error", error: "Username and password are required." });
        return;
    }
    const hash = bcrypt.hashSync(password, 10);
    const newUser = {
        username: username,
        password: hash

    };
    users[username] = newUser;

    fs.writeFileSync("data/users.json", JSON.stringify(users), (err) => {
        if (err) {
            res.json({ status: "error", error: "Failed to save user data." });
            return;
        }
    });

    return res.json({ status: "success", message: "User registered successfully." });
});

app.post("/signin", (req, res) => {
    const { username, password } = req.body;

    let users = fs.readFileSync("data/users.json", "utf8");
    console.log("users", users);
    users = JSON.parse(users);
    if (!users[username]) {
       
        return  res.json({ status: "error", error: "Username not found." });;
    }
    const hashedPassword = users[username].password;
    if (!bcrypt.compareSync(password, hashedPassword)) {
        
        return res.json({ status: "error", error: "Invalid password." });;
    }
    console.log("User found:", connectedPlayers);
    if(connectedPlayers.has(username)) {
        return res.json({ status: "error", error: "User already connected." });
    }
    else {
        req.session.user = users[username];
        console.log("User signed in:", req.session.user);

        connectedPlayers.set(username,null);
        res.json({ status: "success", user: JSON.stringify(users[username]) });
        
        return;
    }
   
});

app.get("/validate", (req, res) => {
    if (!user) {
        res.json({ status: "error", error: "User not found." });
        return;
    }
    res.json({ status: "success", user: JSON.stringify(user) });
});

app.get("/signout", (req, res) => {
    const user = req.session.user;
    req.session.user = null;
    return res.json({ status: "success", message: "User signed out successfully." });
});
// Serve static files from the 'public' directory
const publicPath = path.join(__dirname, '..', 'public');
console.log(`Serving static files from: ${publicPath}`);
app.use(express.static(publicPath));

// Create HTTP server
const server = httpServer.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// Player tracking
const connectedPlayers = new Map(); // userId -> websocket connection
const playerData = new Map(); // userId -> player data (position, health, etc.)
const connectednames = []; // userId -> player name
let safeZoneTimer = null;

// Game state
const gameState = {
    startTime: null,
    gameInProgress: false,
    countdownStarted: false,
    countdownTimer: null,
    readyToStart: false,
    minPlayers: 3, // Minimum players required to start
    completedTasks: 0,
    totalTasks: 0,
    safeZone: {
        centerX: 1400, // Initial safe zone center (near player start)
        centerY: 580,
        radius: 1250, // Initial radius
        shrinkInterval: 30000, // Shrink every 30 seconds
        minRadius: 100, // Minimum size
        shrinkAmount: 150, // How much to shrink each time
        nextShrinkTime: 0, // When the next shrink will happen
        damageAmount: 1 // Damage percent per tick
    },
    meeting: {
        active: false,
        callerId: null,
        startTime: null,
        duration: 30000, // 30 seconds
        votes: {}, // playerId -> votedForId
        countdown: null, // timer reference
        meetingCenter: {
            x: 1400,
            y: 546,
            radius: 100
        }
    }
};

server.on('upgrade', (request, socket, head) => {
    console.log('Parsing session from request...');
    sessionParser(request, {}, () => {
        if (!request.session.userId) {
            // Generate a unique user ID for the session if it doesn't exist
            if (request.session.user && request.session.user.username) {
        request.session.userId = request.session.user.username;
        console.log(`Set userId to username: ${request.session.userId}`);
        } else {
        // fallback if not signed in
        request.session.userId = `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        console.log(`No username found, generated guest userId: ${request.session.userId}`);
        }
            console.log(`Generated new userId: ${request.session.userId}`);
        } else {
            console.log(`Existing userId found: ${request.session.userId}`);
        }

        console.log('Session parsed, upgrading to WebSocket.');

        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    });
});

// Function to broadcast player count to all clients
function broadcastPlayerCount() {
    const count = connectedPlayers.size;
    console.log(`Broadcasting player count: ${count}`);

    const message = JSON.stringify({
        type: 'player_count',
        count: count
    });
        console.log("sending player count to client", connectedPlayers);
    connectedPlayers.forEach((client) => {
        
        client.send(message);

    });

    // Check if there are no players connected
    if (count === 0) {
        resetServerState();
    }
}

// Function to reset server state when there are no connected players
function resetServerState() {
    console.log('No players connected. Resetting server state...');

    // Clear all player data
    playerData.clear();

    // Reset game state
    gameState.startTime = null;
    gameState.gameInProgress = false;
    gameState.countdownStarted = false;
    gameState.readyToStart = false;
    if (gameState.countdownTimer) {
        clearTimeout(gameState.countdownTimer);
        gameState.countdownTimer = null;
    }
    gameState.completedTasks = 0;
    gameState.totalTasks = 0;
    gameState.safeZone = {
        centerX: 1400, // Initial safe zone center (near player start)
        centerY: 580,
        radius: 1250, // Initial radius
        shrinkInterval: 30000, // Shrink every 30 seconds
        minRadius: 100, // Minimum size
        shrinkAmount: 150, // How much to shrink each time
        nextShrinkTime: 0, // When the next shrink will happen
        damageAmount: 1 // Damage percent per tick
    };

    if (safeZoneTimer) {
        clearInterval(safeZoneTimer);
        safeZoneTimer = null;
    }

    // Reset meeting state
    gameState.meeting = {
        active: false,
        callerId: null,
        startTime: null,
        duration: 30000,
        votes: {},
        countdown: null,
        meetingCenter: {
            x: 1400,
            y: 546,
            radius: 100
        }
    };

    // Reset task state
    // If you have a centralized task tracking system on the server
    if (typeof taskState !== 'undefined') {
        taskState = {
            completedTasks: 0,
            totalTasks: 0,
            taskDefinitions: []
        };
    }

    // Reset any other game-specific state here
    // For example, if you have a match state, sabotages, etc.

    console.log('Server state has been reset. Ready for new players.');
}

// Function to broadcast player data to all clients
function broadcastPlayerData(sourceUserId) {
    // Get the player data that needs to be broadcasted
    const player = playerData.get(sourceUserId);
     const playerWithId = { ...player, id: sourceUserId }; // Add id property
    if (!player) return;

    const message = JSON.stringify({
        type: 'player_update',
        player: playerWithId 
    });

   // console.log("broadcasting player data to all clients", message);

    // Send to all clients
    connectedPlayers.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            //console.log("sending player update to client", client.userId);
            client.send(message);
        } else {
            console.log("Client not ready, skipping update for", client.userId);
        }
    });
}

function sendExistingPlayersTo(targetUserId) {
    console.log(`Sending existing players to new player: ${targetUserId}`);

    const targetClient = connectedPlayers.get(targetUserId);
    if (!targetClient) {
        console.error(`Target client ${targetUserId} not found in connected players!`);
        return;
    }

    if (targetClient.readyState !== WebSocket.OPEN) {
        console.error(`Target client ${targetUserId} connection not open! State: ${targetClient.readyState}`);
        return;
    }

    let existingPlayersSent = 0;

    // Send information about all other players to the new player
    playerData.forEach((player, userId) => {
        if (userId !== targetUserId) {
            try {
                const playerMessage = JSON.stringify({
                    type: 'player_update',
                    player: {
                        ...player,
                        id: userId
                    }
                });

                console.log(`Sending existing player ${userId} data to new player ${targetUserId}`);
                targetClient.send(playerMessage);
                existingPlayersSent++;
            } catch (error) {
                console.error(`Error sending player ${userId} to ${targetUserId}:`, error);
            }
        }
    });

    console.log(`Sent ${existingPlayersSent} existing players to ${targetUserId}`);

    // If no other players exist, let's broadcast this new player to everyone
    if (existingPlayersSent === 0) {
        console.log(`No existing players found. Broadcasting new player ${targetUserId} to everyone.`);
        // Broadcast the new player's data to ensure everyone sees them
        setTimeout(() => broadcastPlayerData(targetUserId), 500); // Delay slightly to ensure client is ready
    }
}

// Function to handle player disconnection
function handlePlayerDisconnect(userId) {
    console.log(`Player disconnected: ${userId}`);

    // Remove player from connected list
    connectedPlayers.delete(userId);

    // Keep player data for now, but mark as disconnected
    if (playerData.has(userId)) {
        const player = playerData.get(userId);
        player.isAlive = false;
        player.disconnected = true;
        playerData.set(userId, player);

        // Check win conditions if game is in progress
        if (gameState.gameInProgress) {
            checkWinConditions();
        }
    }

    // Notify other clients about the disconnection
    connectedPlayers.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'player_disconnect',
                playerId: userId
            }));
        }
    });

    // Update player count
    broadcastPlayerCount();

    // Reset server state if all players have left
    if (connectedPlayers.size === 0) {
        resetServerState();
    }
}

// Start safe zone shrinking process
function startSafeZoneShrinking() {
    // Set interval to check and shrink safe zone
    safeZoneTimer = setInterval(() => {
        const currentTime = Date.now();

        // Check if it's time to shrink the safe zone
        if (currentTime >= gameState.safeZone.nextShrinkTime &&
            gameState.safeZone.radius > gameState.safeZone.minRadius) {

            // Shrink the safe zone
            gameState.safeZone.radius = Math.max(
                gameState.safeZone.minRadius,
                gameState.safeZone.radius - gameState.safeZone.shrinkAmount
            );

            // Set next shrink time
            gameState.safeZone.nextShrinkTime = currentTime + gameState.safeZone.shrinkInterval;

            console.log(`Safe zone shrunk to ${gameState.safeZone.radius}. Next shrink at ${new Date(gameState.safeZone.nextShrinkTime).toISOString()}`);

        }

        // Broadcast safe zone update to all clients
        broadcastSafeZone();

        // Apply damage to players outside safe zone
        applyOutOfBoundsDamage();


    }, 1000); // Check every second
}

// Apply damage to players outside the safe zone
function applyOutOfBoundsDamage() {
    playerData.forEach((player, userId) => {
        // Skip if player is already dead
        if (player.isAlive === false) return;

        // Calculate distance from safe zone center
        const dx = player.x - gameState.safeZone.centerX;
        const dy = player.y - gameState.safeZone.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If player is outside safe zone, apply damage
        if (distance > gameState.safeZone.radius) {
            player.health = Math.max(0, player.health - gameState.safeZone.damageAmount);

            // If player's health drops to 0, mark as dead
            if (player.health <= 0) {
                player.isAlive = false;
                player.deathTime = Date.now();
                player.deathX = player.x;
                player.deathY = player.y;


                // Broadcast death due to safe zone
                const deathMessage = JSON.stringify({
                    type: 'player_kill',
                    victim: userId,
                    killerId: 'safe_zone',
                    x: player.x,
                    y: player.y,
                    cause: 'safe_zone'
                });

                connectedPlayers.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(deathMessage);
                    }
                });
            }

            // Broadcast updated player data
            broadcastPlayerData(userId);
        }
    });
}

// Broadcast safe zone data to all clients
function broadcastSafeZone() {
    const timeUntilNextShrink = Math.max(0, gameState.safeZone.nextShrinkTime - Date.now());
    const safeZoneMessage = JSON.stringify({
        type: 'safe_zone_update',
        centerX: gameState.safeZone.centerX,
        centerY: gameState.safeZone.centerY,
        radius: gameState.safeZone.radius,
        nextShrinkTime: gameState.safeZone.nextShrinkTime,
        timeUntilNextShrink: timeUntilNextShrink
    });

    connectedPlayers.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(safeZoneMessage);
        }
    });
}

// Start a meeting
function startMeeting(callerId) {
    // Check if meeting is already active
    if (gameState.meeting.active) {
        console.log(`Meeting already in progress, ignoring call from ${callerId}`);
        return false;
    }

    console.log(`Starting meeting called by ${callerId}`);

    // Set meeting state
    gameState.meeting.active = true;
    gameState.meeting.callerId = callerId;
    gameState.meeting.startTime = Date.now();
    gameState.meeting.votes = {};

    // Reset all players to starting positions
    teleportAllPlayersToStart();

    // Get players list to send to clients
    const players = [];
    playerData.forEach((player, userId) => {
        players.push({
            id: userId,
            isAlive: player.isAlive !== false,
            role: player.role
        });
    });

    // Broadcast meeting start to all clients
    const meetingMessage = JSON.stringify({
        type: 'meeting_start',
        callerId: callerId,
        players: players,
        duration: gameState.meeting.duration
    });

    connectedPlayers.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(meetingMessage);
        }
    });

    // Set timeout to end meeting after duration
    gameState.meeting.countdown = setTimeout(() => {
        endMeeting();
    }, gameState.meeting.duration);

    return true;
}

// End a meeting and process votes
function endMeeting() {
    if (!gameState.meeting.active) return;

    console.log('Meeting ended. Processing votes...');

    // Clear any existing timeout
    if (gameState.meeting.countdown) {
        clearTimeout(gameState.meeting.countdown);
        gameState.meeting.countdown = null;
    }

    // Count votes
    const voteCounts = {};
    let maxVotes = 0;
    let ejectedPlayer = null;

    // Count votes for each player
    Object.values(gameState.meeting.votes).forEach(targetId => {
        if (!voteCounts[targetId]) {
            voteCounts[targetId] = 0;
        }
        voteCounts[targetId]++;

        // Check if this is the new highest vote count
        if (voteCounts[targetId] > maxVotes) {
            maxVotes = voteCounts[targetId];
            ejectedPlayer = targetId;
        } else if (voteCounts[targetId] === maxVotes) {
            // Tie results in no ejection (represented by 'skip')
            ejectedPlayer = 'skip';
        }
    });

    // If no votes were cast, or ties, no one is ejected
    if (maxVotes === 0) {
        ejectedPlayer = 'skip';
    }

    // If a player was ejected (not skip), mark them as dead
    if (ejectedPlayer && ejectedPlayer !== 'skip' && playerData.has(ejectedPlayer)) {
        const ejectedPlayerData = playerData.get(ejectedPlayer);
        ejectedPlayerData.isAlive = false;
        ejectedPlayerData.deathTime = Date.now();
        ejectedPlayerData.deathX = PLAYER_START_X;
        ejectedPlayerData.deathY = PLAYER_START_Y;

        // Save updated player data
        playerData.set(ejectedPlayer, ejectedPlayerData);

        // Track the ejection - could attribute "kills" to voters
        // For simplicity, we don't count ejections as kills for any specific player

        const ejectionUpdateMessage = JSON.stringify({
            type: 'player_update',
            player: {
                ...ejectedPlayerData,
                id: ejectedPlayer
            }
        });

        connectedPlayers.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(ejectionUpdateMessage);
            }
        });
    }

    // Broadcast meeting results to all clients
    const resultsMessage = JSON.stringify({
        type: 'meeting_results',
        votes: gameState.meeting.votes,
        voteCounts: voteCounts,
        ejected: ejectedPlayer
    });

    connectedPlayers.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(resultsMessage);
        }
    });

    // Reset meeting state
    gameState.meeting.active = false;
    gameState.meeting.callerId = null;
    gameState.meeting.startTime = null;
    gameState.meeting.votes = {};
}

// Teleport all players to start position for meeting
function teleportAllPlayersToStart() {
    playerData.forEach((player, id) => {
        // Skip dead players
        if (player.isAlive === false) return;

        // Update position to start
        player.x = PLAYER_START_X;
        player.y = PLAYER_START_Y;

        // Save updated player data
        playerData.set(id, player);

        // Broadcast player update to ensure everyone sees the new positions
        broadcastPlayerData(id);
    });
}

// Start a meeting triggered by a body report
function startReportMeeting(reporterId, reportedBodyId) {
    // Check if meeting is already active
    if (gameState.meeting.active) {
        console.log(`Meeting already in progress, ignoring report from ${reporterId}`);
        return false;
    }

    console.log(`Starting meeting due to body report by ${reporterId}`);

    // Set meeting state
    gameState.meeting.active = true;
    gameState.meeting.callerId = reporterId;
    gameState.meeting.startTime = Date.now();
    gameState.meeting.votes = {};

    // Reset all players to starting positions
    teleportAllPlayersToStart();

    // Get players list to send to clients
    const players = [];
    playerData.forEach((player, id) => {
        players.push({
            id: id,
            isAlive: player.isAlive !== false,
            role: player.role
        });
    });

    // Broadcast meeting start to all clients
    const meetingMessage = JSON.stringify({
        type: 'meeting_start',
        callerId: reporterId,
        deadPlayerId: reportedBodyId,
        players: players,
        duration: gameState.meeting.duration
    });

    connectedPlayers.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(meetingMessage);
        }
    });

    // Set timeout to end meeting after duration
    gameState.meeting.countdown = setTimeout(() => {
        endMeeting();
    }, gameState.meeting.duration);

    return true;
}

// Function to check if game can start (3+ players)
function checkGameStart() {
    // If game is already in progress or countdown started, don't check
    if (gameState.gameInProgress || gameState.countdownStarted) {
        return;
    }

    const playerCount = connectedPlayers.size;

    // Need minimum 3 players to start
    if (playerCount >= gameState.minPlayers) {
        //console.log(`We have ${playerCount} players, starting game countdown!`);
        //startGameCountdown();
    } else {
        console.log(`Need ${gameState.minPlayers} players to start, currently have ${playerCount}`);
    }
}

// Function to start game countdown
function startGameCountdown() {
    gameState.countdownStarted = true;

    // Send countdown message to all clients
    const countdownMessage = JSON.stringify({
        type: 'game_countdown',
        countdown: 10, // 10 seconds countdown
    });

    connectedPlayers.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(countdownMessage);
        }
    });

    // Set timeout to start game after 5 seconds
    gameState.countdownTimer = setTimeout(() => {
        startGame();
    }, 10000);
}

// Function to start the game
function startGame() {
    gameState.gameInProgress = true;
    gameState.startTime = Date.now();

    console.log('Game starting! Assigning roles...');

    // Assign roles
    assignRoles();

    // Send game start message to all clients
    const startMessage = JSON.stringify({
        type: 'game_start',
        startTime: gameState.startTime
    });

    connectedPlayers.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(startMessage);
        }
    });

    // Start safe zone shrinking
    startSafeZoneShrinking();

    // Inform each player of their role
    playerData.forEach((player, userId) => {
        const client = connectedPlayers.get(userId);
        if (client && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'role_assigned',
                role: player.role,
                gameStartTime: gameState.startTime,
                serverTime: Date.now()
            }));
        }
    });
}

// Function to assign roles (1 impostor per 3 players)
function assignRoles() {
    const players = Array.from(playerData.keys());
    const playerCount = players.length;

    // Calculate number of impostors (1 per 3 players)
    const impostorCount = Math.max(1, Math.floor(playerCount / 3));
    console.log(`Assigning ${impostorCount} impostors for ${playerCount} players`);

    // Shuffle players for random assignment
    for (let i = players.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [players[i], players[j]] = [players[j], players[i]];
    }

    // Assign roles
    players.forEach((userId, index) => {
        const player = playerData.get(userId);
        if (index < impostorCount) {
            player.role = 'impostor';
        } else {
            player.role = 'crewmate';
        }
        playerData.set(userId, player);
    });
}

// Function to check win conditions
function checkWinConditions() {
    if (!gameState.gameInProgress) return false;

    let crewmateCount = 0;
    let impostorCount = 0;
    let alivePlayers = 0;
    let connectedPlayers = 0;

    // Count players by role
    playerData.forEach(player => {
        // Skip disconnected players in the count
        if (player.disconnected) return;

        // Count connected players
        connectedPlayers++;

        if (player.isAlive) {
            alivePlayers++;
            if (player.role === 'crewmate') {
                crewmateCount++;
            } else if (player.role === 'impostor') {
                impostorCount++;
            }
        }
    });

    console.log(`Win check: ${crewmateCount} crewmates, ${impostorCount} impostors alive. ${gameState.completedTasks}/${gameState.totalTasks} tasks completed. ${connectedPlayers} connected players.`);

    // If no one is connected, don't trigger win condition
    if (connectedPlayers === 0) {
        return false;
    }

    if (gameState.totalTasks > 0 && gameState.completedTasks >= gameState.totalTasks) {
        endGame('crewmate', 'All tasks completed');
        return true;
    }

    if (crewmateCount === 0 && impostorCount === 0) {
        endGame('crewmate', 'All players dead but ship is still intact');
        return true;
    }

    if (crewmateCount === 0 && impostorCount > 0) {
        endGame('impostor', 'All crewmates eliminated');
        return true;
    }

    if(impostorCount === 0 && alivePlayers > 0) {
        endGame('crewmate', 'All impostors eliminated, crewmates win!');
        return true;


    }
    // Win condition 3: Only one crewmate left - impostors win (falsely accused)
    if (crewmateCount === 1 && alivePlayers === 1 && impostorCount === 0) {
        endGame('crewmate', 'Last crewmate standing, the ship is intact');
        return true;
    }

    return false;
}

// Function to end the game
function endGame(winnerRole, reason) {
    console.log(`Game over! ${winnerRole} wins. Reason: ${reason}`);

    // Prepare player statistics for the game over message
    const playerStats = Array.from(playerData.entries()).map(([id, player]) => ({
        id: id,
        role: player.role,
        isAlive: player.isAlive,
        kills: player.kills || 0,
        completedTasks: player.completedTasks || 0
    }));

    // Send game over message to all clients
    const gameOverMessage = JSON.stringify({
        type: 'game_over',
        winner: winnerRole,
        reason: reason,
        playerRoles: Array.from(playerData.entries()).map(([id, player]) => ({
            id: id,
            role: player.role,
            isAlive: player.isAlive
        })),
        playerStats: playerStats
    });

    connectedPlayers.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(gameOverMessage);
        }
    });

    // Reset game state but keep players
    gameState.gameInProgress = false;
    gameState.countdownStarted = false;
    if (gameState.countdownTimer) {
        clearTimeout(gameState.countdownTimer);
        gameState.countdownTimer = null;
    }
    gameState.completedTasks = 0;
    gameState.totalTasks = 0;

    // Reset player roles to null for next game
    playerData.forEach((player, userId) => {
        player.role = null;
        // Reset statistics
        player.kills = 0;
        player.completedTasks = 0;
        playerData.set(userId, player);
    });
}


// Handle WebSocket connections
wss.on('connection', (ws, request) => {
    const userId = request.session.userId;
    console.log(`WebSocket connection established for user: ${userId}`);

    // Store the connection
    connectedPlayers.delete(userId); // Remove any existing connection
    connectedPlayers.set(userId, ws);

    // Initialize player data with null role
    playerData.set(userId, {
        Ingame: false,
        x: PLAYER_START_X,
        y: PLAYER_START_Y,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        isAlive: true,
        health: 100,
        role: null, // Initial role is null
        isReported: false,
        lastUpdated: Date.now(),
        // Add statistics tracking
        kills: 0,
        completedTasks: 0,
        killChance: 0 // Initialize kill chance to 0
    });

    // Send welcome message to the new player
    ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Welcome to StarScrap!',
        playerId: userId,
        role: "crewmate", // Initial role is null
        gameStartTime: gameState.startTime,
        serverTime: Date.now()
    }));

    // Send initial player count to the new player
    ws.send(JSON.stringify({
        type: 'player_count',
        count: connectedPlayers.size
    }));

    // Send safe zone data to the new player
    if (gameState.startTime !== null) {
        ws.send(JSON.stringify({
            type: 'safe_zone_update',
            centerX: gameState.safeZone.centerX,
            centerY: gameState.safeZone.centerY,
            radius: gameState.safeZone.radius,
            nextShrinkTime: gameState.safeZone.nextShrinkTime,
            timeUntilNextShrink: Math.max(0, gameState.safeZone.nextShrinkTime - Date.now())
        }));
    }

    // Send existing players to the new player
    sendExistingPlayersTo(userId);

    // Broadcast updated player count to all clients
    broadcastPlayerCount();

    // Check if we can start the game
    checkGameStart();

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            // console.log("received message",data);

            // Handle different message types
            switch (data.type) {
                case 'In_Game':
                    // Update player data to indicate they are in the game
                    if (playerData.has(userId)) {
                        const player = playerData.get(userId);
                        player.Ingame = true;
                        playerData.set(userId, player);
                    }
                    break;
                case 'get_player_count':
                    // Send current player count to the requesting client
                    ws.send(JSON.stringify({
                        type: 'player_count',
                        count: connectedPlayers.size
                    }));
                    break;

                case 'player_join':
                    console.log(`Player join message from ${userId}: ${data.message}`);
                    // Already handled in connection event, but could do more here
                    broadcastPlayerCount();
                    break;

                case 'player_update':
                    // Update the player's data in our map
                    if (data.player && data.player.id === userId) {
                        // Make sure to preserve all required properties
                        const updatedPlayer = {
                            ...playerData.get(userId), // Keep existing data
                            ...data.player, // Update with new data
                            width: data.player.width || PLAYER_WIDTH,
                            height: data.player.height || PLAYER_HEIGHT,
                            lastUpdated: Date.now()
                        };

                        // Store the updated player data
                        playerData.set(userId, updatedPlayer);

                        // Broadcast the update to all clients
                        broadcastPlayerData(userId);
                    }
                    break;

                case 'task_completed':
                    // Handle task completion
                    console.log(`Player ${userId} completed task: ${data.taskId}`);

                    // Update task counter
                    gameState.completedTasks++;

                    // Update player's task completion counter
                    const playerCompleting = playerData.get(userId);
                    if (playerCompleting) {
                        playerCompleting.completedTasks = (playerCompleting.completedTasks || 0) + 1;
                        playerData.set(userId, playerCompleting);
                    }

                    // Check win conditions
                    checkWinConditions();

                    // Broadcast task completion to all clients
                    const taskMessage = JSON.stringify({
                        type: 'task_completed',
                        taskId: data.taskId,
                        playerId: userId,
                        completedTasks: gameState.completedTasks,
                        totalTasks: gameState.totalTasks
                    });

                    connectedPlayers.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(taskMessage);
                        }
                    });
                    break;

                case 'player_kill':
                    // Handle player kill
                    console.log(`Player ${userId} killed player ${data.victim}`);

                    // Update the victim's data to mark as dead
                    if (playerData.has(data.victim)) {
                        const victimData = playerData.get(data.victim);
                        victimData.isAlive = false;
                        victimData.deathTime = Date.now();
                        victimData.deathX = data.x;
                        victimData.deathY = data.y;

                        // Save updated player data
                        playerData.set(data.victim, victimData);

                        // Increment killer's kill counter
                        const killerData = playerData.get(userId);
                        if (killerData) {
                            killerData.kills = (killerData.kills || 0) + 1;
                            playerData.set(userId, killerData);
                        }

                        // Check win conditions
                        checkWinConditions();
                    }

                    // Broadcast the kill to all clients
                    const killMessage = JSON.stringify({
                        type: 'player_kill',
                        victim: data.victim,
                        killerId: userId,
                        x: data.x,
                        y: data.y
                    });

                    connectedPlayers.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(killMessage);
                        }
                    });
                    break;

                case 'set_trap':
                    // Handle trap setting (impostor only)
                    if (playerData.has(userId) && playerData.get(userId).role === 'impostor') {
                        console.log(`Impostor ${userId} set trap on task: ${data.taskId}`);

                        // Broadcast the trap to all clients
                        const trapMessage = JSON.stringify({
                            type: 'task_trapped',
                            taskId: data.taskId,
                            playerId: userId
                        });

                        connectedPlayers.forEach(client => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(trapMessage);
                            }
                        });
                    } else {
                        console.log(`Non-impostor ${userId} tried to set trap, ignored`);
                    }
                    break;
                
                case 'request_game_start':
                // Only allow game start if we have enough players
                let totalPlayers = 0;
                playerData.forEach((player, id) => {
                    if (player.Ingame){
                        totalPlayers++;
                    }
                });
                console.log(`Game start requested by ${userId}. Total players: ${totalPlayers}`);
                if(totalPlayers < gameState.minPlayers) {
                    console.log(`Not enough players to start game: ${totalPlayers}/${gameState.minPlayers}`);
                    ws.send(JSON.stringify({
                        type: 'game_start_response',
                        success: false,
                        message: `Need at least ${gameState.minPlayers} players to start`
                    }));
                    break;
                }
                if (connectedPlayers.size >= gameState.minPlayers) {
                    console.log(`Game start requested by ${userId}`);
                    
                    // Check if game is already in progress or countdown started
                    if (gameState.gameInProgress || gameState.countdownStarted) {
                        console.log('Game already in progress or starting, ignoring request');
                        ws.send(JSON.stringify({
                            type: 'game_start_response',
                            success: false,
                            message: 'Game already in progress'
                        }));
                        break;
                    }
                    
                    // Start the game countdown
                    startGameCountdown();
                    
                    // Send confirmation to the requesting client
                    ws.send(JSON.stringify({
                        type: 'game_start_response',
                        success: true,
                        message: 'Game starting'
                    }));
                } else {
                    // Not enough players
                    ws.send(JSON.stringify({
                        type: 'game_start_response',
                        success: false,
                        message: `Need at least ${gameState.minPlayers} players to start`
                    }));
                }
                break;

                case 'call_meeting':
                    // Handle meeting request
                    console.log(`Meeting called by ${userId}`);

                    // Check if caller is alive
                    const callerData = playerData.get(userId);
                    if (!callerData || callerData.isAlive === false) {
                        console.log(`Ignoring meeting call from dead player ${userId}`);
                        break;
                    }

                    // Check if caller is in meeting area
                    const callerX = callerData.x;
                    const callerY = callerData.y;
                    const meetingX = gameState.meeting.meetingCenter.x;
                    const meetingY = gameState.meeting.meetingCenter.y;
                    const meetingRadius = gameState.meeting.meetingCenter.radius;

                    const distance = Math.sqrt(
                        Math.pow(callerX - meetingX, 2) +
                        Math.pow(callerY - meetingY, 2)
                    );

                    if (distance > meetingRadius) {
                        console.log(`Player ${userId} is not in meeting area, ignoring call`);
                        break;
                    }

                    // Start the meeting
                    startMeeting(userId);
                    break;

                case 'player_vote':
                    // Handle player vote in meeting
                    console.log(`Vote from ${userId} for ${data.voteFor}`);

                    // Validate voting is allowed
                    if (!gameState.meeting.active) {
                        console.log(`Ignoring vote from ${userId}, no meeting active`);
                        break;
                    }

                    // Check if player is alive (only living players can vote)
                    const voterData = playerData.get(userId);
                    if (!voterData || voterData.isAlive === false) {
                        console.log(`Ignoring vote from dead player ${userId}`);
                        break;
                    }

                    // Record the vote
                    gameState.meeting.votes[userId] = data.voteFor;

                    // Broadcast updated votes to all clients
                    const voteUpdateMessage = JSON.stringify({
                        type: 'vote_update',
                        votes: gameState.meeting.votes
                    });

                    connectedPlayers.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(voteUpdateMessage);
                        }
                    });
                    break;

                case 'report_body':
                    // Handle body report
                    console.log(`Body reported by ${userId}: ${data.deadPlayerId}`);

                    // Check if reporter is alive
                    const reporterData = playerData.get(userId);
                    if (!reporterData || reporterData.isAlive === false) {
                        console.log(`Ignoring body report from dead player ${userId}`);
                        break;
                    }

                    // Check if reported player exists and is dead
                    const reportedPlayer = playerData.get(data.deadPlayerId);
                    if (!reportedPlayer || reportedPlayer.isAlive !== false) {
                        console.log(`Invalid dead player report: ${data.deadPlayerId}`);
                        break;
                    }

                    // Check if body was already reported
                    if (reportedPlayer.isReported) {
                        console.log(`Body ${data.deadPlayerId} was already reported, ignoring`);
                        break;
                    }

                    // Mark the body as reported
                    reportedPlayer.isReported = true;
                    playerData.set(data.deadPlayerId, reportedPlayer);

                    // First, notify all clients about the report (for animation)
                    const reportMessage = JSON.stringify({
                        type: 'report_body',
                        reporterId: userId,
                        deadPlayerId: data.deadPlayerId
                    });

                    // Also notify all clients that the body has been reported (to prevent multiple reports)
                    const bodyReportedMessage = JSON.stringify({
                        type: 'body_reported',
                        deadPlayerId: data.deadPlayerId
                    });

                    connectedPlayers.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(reportMessage);
                            client.send(bodyReportedMessage);
                        }
                    });

                    // Start meeting after a short delay (to allow for report animation)
                    setTimeout(() => {
                        startReportMeeting(userId, data.deadPlayerId);
                    }, 3000);
                    break;

                case 'set_total_tasks':
                    // Set the total number of tasks that need to be completed
                    console.log(`Setting total tasks: ${data.count}`);
                    gameState.totalTasks = data.count;
                    break;

                case 'item_pickup':
                    // Handle item pickup
                    console.log(`Player ${userId} picked up item ${data.itemId}`);

                    // Update player's kill chance
                    if (playerData.has(userId)) {
                        const player = playerData.get(userId);
                        player.killChance = data.killChance || player.killChance || 0;
                        playerData.set(userId, player);

                        // Broadcast the item pickup to all players
                        const pickupMessage = JSON.stringify({
                            type: 'item_pickup',
                            playerId: userId,
                            itemId: data.itemId,
                            killChance: player.killChance
                        });

                        connectedPlayers.forEach(client => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(pickupMessage);
                            }
                        });

                        // Broadcast updated player data
                        broadcastPlayerData(userId);
                    }
                    break;

                default:
                    // For other message types, broadcast to all clients
                    console.log(`Received unknown message type: ${data.type} from ${userId}`);
                    connectedPlayers.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'echo',
                                payload: data,
                                sender: userId
                            }));
                        }
                    });
            }
        } catch (e) {
            console.error("Failed to parse message or broadcast:", e);
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format.' }));
        }
    });

    ws.on('close', () => {
        console.log(`Client disconnected: ${userId}`);
        handlePlayerDisconnect(userId);
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for ${userId}:`, error);
        handlePlayerDisconnect(userId);
    });
});

app.get('/validateOldSession', (req, res) => {
    const sessionId = req.session.userId;

    if (!sessionId) {
        return res.json({
            success: false,
            userId: null
        });
    } else {
        return res.json({
            success: true,
            userId: sessionId
        });
    }
});

// Start the server
server.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
}); 