const express = require('express');
const session = require('express-session');
const httpServer = require('http');
const WebSocket = require('ws');
const path = require('path');

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

server.on('upgrade', (request, socket, head) => {
  console.log('Parsing session from request...');
  sessionParser(request, {}, () => {
    if (!request.session.userId) {
      // Generate a unique user ID for the session if it doesn't exist
      request.session.userId = `nicolelam_${Date.now()}_${Math.random().toString(36).substring(7)}`;
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
    
    connectedPlayers.forEach((client) => {
        client.send(message);
    });
}

// Function to broadcast player data to all clients
function broadcastPlayerData(sourceUserId) {
    // Get the player data that needs to be broadcasted
    const player = playerData.get(sourceUserId);
    if (!player) return;
    
    const message = JSON.stringify({
        type: 'player_update',
        player: {
            ...player,
            id: sourceUserId
        }
    });

    // Send to all clients
    connectedPlayers.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            console.log("sending player update to client", client.userId);
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
    // Remove from tracking maps
    connectedPlayers.delete(userId);
    playerData.delete(userId);
    
    // Notify all clients about the disconnection
    const message = JSON.stringify({
        type: 'player_disconnect',
        playerId: userId
    });
    
    connectedPlayers.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
    
    // Update player count
    broadcastPlayerCount();
}

// Handle WebSocket connections
wss.on('connection', (ws, request) => {
    const userId = request.session.userId;
    console.log(`Client connected: ${userId}`);

    // Store userId with the WebSocket connection
    ws.userId = userId;
    
    // Add player to our tracking map
    connectedPlayers.set(userId, ws);
    
    // Initialize player data with default values
    playerData.set(userId, {
        x: PLAYER_START_X, // Use constant
        y: PLAYER_START_Y, // Use constant
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        direction: 'down',
        frameX: 0,
        isMoving: false,
        health: 100,
        role: Math.random() < 0.2 ? 'impostor' : 'crewmate' // 20% chance to be impostor
    });
    
    // Send welcome message with player's assigned role
    ws.send(JSON.stringify({ 
        type: 'welcome', 
        message: `Welcome ${userId}!`,
        playerId: userId,
        role: playerData.get(userId).role
    }));
    
    // Send initial player count to the new player
    ws.send(JSON.stringify({ 
        type: 'player_count', 
        count: connectedPlayers.size 
    }));
    
    // Send existing players to the new player
    sendExistingPlayersTo(userId);
    
    // Broadcast updated player count to all clients
    broadcastPlayerCount();

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            console.log("received message",data);
            
            // Handle different message types
            switch (data.type) {
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