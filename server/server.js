const express = require('express');
const session = require('express-session');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

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
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// Handle WebSocket server upgrades
server.on('upgrade', (request, socket, head) => {
  console.log('Parsing session from request...');
  sessionParser(request, {}, () => {
    if (!request.session.userId) {
      // Generate a unique user ID for the session if it doesn't exist
      request.session.userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
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


// Handle WebSocket connections
wss.on('connection', (ws, request) => {
    const userId = request.session.userId;
    console.log(`Client connected: ${userId}`);

    // Store userId with the WebSocket connection if needed
    ws.userId = userId;

    // Example: Send a welcome message
    ws.send(JSON.stringify({ type: 'welcome', message: `Welcome ${userId}!` }));

    ws.on('message', (message) => {
        console.log(`Received message from ${userId}: ${message}`);
        // Handle incoming messages (e.g., player movement, actions)
        // For now, just echo back
        try {
            const data = JSON.parse(message);
            // Broadcast to all clients (or specific clients based on game logic)
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'echo', payload: data, sender: userId }));
                }
            });
        } catch (e) {
            console.error("Failed to parse message or broadcast:", e);
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format.' }));
        }
    });

    ws.on('close', () => {
        console.log(`Client disconnected: ${userId}`);
        // Handle client disconnection (e.g., remove player from game state)
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for ${userId}:`, error);
    });
});

// Start the server
server.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
}); 