/**
 * StarScrap - Game JavaScript
 * This file will handle the game logic and initialization
 */


// Main game object
const StarScrap = {
    // Game state
    state: {
        isGameStarted: false,
        players: [],
        currentPlayer: null,
        gameMap: null,
        safeZone: null,
        playerCount: 0,
        sessionId: null,
        canvas: null,
        ctx: null,
        gameLoop: null,
        assets: {
            shipMap: null,
            playerSprite: null
        },
        controls: {
            up: false,
            down: false,
            left: false,
            right: false
        },
        camera: {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        },
        debug: {
            enabled: false,
            showBoundaries: false
        }
    },
    
    // Asset loading
    loader: {
        assetsToLoad: 0,
        assetsLoaded: 0,


        checkAllAssetsLoaded: function() {
            const loadingElement = document.getElementById('loading-progress');
            if (loadingElement) {
                const progress = Math.floor((StarScrap.loader.assetsLoaded / StarScrap.loader.assetsToLoad) * 100);
                loadingElement.textContent = `Loading assets: ${progress}%`;
            }
            
            if (StarScrap.loader.assetsLoaded >= StarScrap.loader.assetsToLoad) {
                console.log('All assets loaded!');
                StarScrap.initializeGame();
            }
        },
        
        loadImage: function(src) {
            StarScrap.loader.assetsToLoad++;
            const img = new Image();
            img.onload = function() {
                StarScrap.loader.assetsLoaded++;
                StarScrap.loader.checkAllAssetsLoaded();
            };
            img.onerror = function() {
                console.error(`Failed to load image: ${src}`);
                StarScrap.loader.assetsLoaded++;
                StarScrap.loader.checkAllAssetsLoaded();
            };
            img.src = src;
            return img;
        }
        
    },
    
    // Create the game canvas
    createGameCanvas: function() {
        console.log('Creating game canvas...');
        const container = document.querySelector('.container');
        if (!container) return false;
        
        // Add game-active class to container for styling
        container.classList.add('game-active');
        
        // Clear container
        container.innerHTML = '';
        
        // Create loading indicator
        const loadingElement = document.createElement('h2');
        loadingElement.className = 'loading';
        loadingElement.id = 'loading-progress';
        loadingElement.textContent = 'Loading assets: 0%';
        container.appendChild(loadingElement);
        
        // Create canvas element
        const canvas = document.createElement('canvas');
        canvas.id = 'game-canvas';
        canvas.width = Math.min(window.innerWidth, 1200);
        canvas.height = Math.min(window.innerHeight, 800);
        canvas.style.display = 'none'; // Hide until loaded
        container.appendChild(canvas);
        
        // Create UI elements
        const uiElement = document.createElement('div');
        uiElement.id = 'game-ui';
        uiElement.innerHTML = `
            <div id="player-info">
                <div id="player-name">Player Name</div>
                <div id="player-role">Crewmate</div>
            </div>
            <div id="timer">05:00</div>
            <div id="task-progress">Tasks: 0/5</div>
            <div id="safe-zone-indicator">Safe Zone: Shrinking in 30s</div>
        `;
        uiElement.style.display = 'none'; // Hide until loaded
        container.appendChild(uiElement);
        
        this.state.canvas = canvas;
        this.state.ctx = canvas.getContext('2d');
        
        // Load assets
        this.state.assets.shipMap = this.loader.loadImage('assets/ship.png');
        this.state.assets.playerSprite = this.loader.loadImage('assets/player.png');
        
        return true;
    },
    
    // Initialize the game
    initializeGame: function() {
        console.log('Initializing game...');
        
        // Show canvas and UI
        this.state.canvas.style.display = 'block';
        document.getElementById('game-ui').style.display = 'block';
        
        // Remove loading indicator
        const loadingElement = document.getElementById('loading-progress');
        if (loadingElement) loadingElement.remove();
        
        // Initialize camera
        this.state.camera = {
            x: 0,
            y: 0,
            width: this.state.canvas.width,
            height: this.state.canvas.height
        };
        
        // Set up input handlers
        this.setupGameControls();
        
        // Start game loop
        this.startGameLoop();
    },
    
    // Set up keyboard controls
    setupGameControls: function() {
        window.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'w': case 'W': case 'ArrowUp':
                    this.state.controls.up = true;
                    break;
                case 's': case 'S': case 'ArrowDown':
                    this.state.controls.down = true;
                    break;
                case 'a': case 'A': case 'ArrowLeft':
                    this.state.controls.left = true;
                    break;
                case 'd': case 'D': case 'ArrowRight':
                    this.state.controls.right = true;
                    break;
                case 'm': case 'M':
                    console.log('Meeting called!'); // Will implement later
                    break;
                case 't': case 'T':
                    console.log('Setting trap!'); // Will implement for impostors later
                    break;
                // Debug controls
                case 'b': case 'B':
                    if (this.state.debug.enabled) {
                        this.state.debug.showBoundaries = !this.state.debug.showBoundaries;
                        console.log(`Debug boundaries: ${this.state.debug.showBoundaries ? 'ON' : 'OFF'}`);
                    }
                    break;
                case '`': // Backtick key
                    this.state.debug.enabled = !this.state.debug.enabled;
                    console.log(`Debug mode: ${this.state.debug.enabled ? 'ENABLED' : 'DISABLED'}`);
                    if (!this.state.debug.enabled) {
                        this.state.debug.showBoundaries = false;
                    }
                    break;
            }
        });
        
        window.addEventListener('keyup', (e) => {
            switch(e.key) {
                case 'w': case 'W': case 'ArrowUp':
                    this.state.controls.up = false;
                    break;
                case 's': case 'S': case 'ArrowDown':
                    this.state.controls.down = false;
                    break;
                case 'a': case 'A': case 'ArrowLeft':
                    this.state.controls.left = false;
                    break;
                case 'd': case 'D': case 'ArrowRight':
                    this.state.controls.right = false;
                    break;
            }
        });
    },
    
    // Update player position based on controls
    updatePlayer: function() {
        // Use the Player module if available
        // Debug log the controls state
        
        // Create a boundary check function that uses MapBound if available
        const boundaryCheck = (currentX, currentY, newX, newY, width, height) => {
            return MapBound.checkCollision(newX, newY, width, height) ? 
                { x: currentX, y: currentY } : 
                { x: newX, y: newY };
        };
        
        // Update the player state and get if we need to sync
        const shouldSync = Player.update(this.state.controls, boundaryCheck);
        
        // Update currentPlayer reference in our state
        this.state.currentPlayer = Player.properties;
        
        // Sync with server if needed
        if (shouldSync && this.socket && this.socket.readyState === WebSocket.OPEN) {
            Player.syncToServer(this.socket);
        }
        
        // Update camera to follow player
        this.updateCamera();
        
        // Debug log player position
        if (this.state.debug.enabled) {
            console.log(`Player: x=${this.state.currentPlayer.x}, y=${this.state.currentPlayer.y}, direction=${this.state.currentPlayer.direction}`);
        }
    },
    
    // Update camera position to follow player
    updateCamera: function() {
        const player = this.state.currentPlayer;
        const camera = this.state.camera;
        
        // Center camera on player
        camera.x = player.x - camera.width / 2 + player.width / 2;
        camera.y = player.y - camera.height / 2 + player.height / 2;
        
        // Ensure camera stays within map bounds
        camera.x = Math.max(0, Math.min(camera.x, SHIP_WIDTH - camera.width));
        camera.y = Math.max(0, Math.min(camera.y, SHIP_HEIGHT - camera.height));
    },
    
    // Render the game
    render: function() {
        const ctx = this.state.ctx;
        const camera = this.state.camera;
        
        // Clear canvas
        ctx.clearRect(0, 0, this.state.canvas.width, this.state.canvas.height);
        
        // Draw map with camera offset
        ctx.drawImage(
            this.state.assets.shipMap,
            camera.x, camera.y, camera.width, camera.height,
            0, 0, camera.width, camera.height
        );
        
        // Debug: Draw map boundaries if enabled
        if (this.state.debug.enabled && this.state.debug.showBoundaries && typeof MapBound !== 'undefined') {
            if (typeof MapBound.drawDebugBoundaries === 'function') {
                MapBound.drawDebugBoundaries(ctx, camera.x, camera.y);
            }
        }
        
        // Draw player using the Player module if available
        Player.render(ctx, this.state.assets.playerSprite, camera.x, camera.y);
    },
    
    // Game loop
    gameLoop: function() {
        StarScrap.updatePlayer();
        StarScrap.render();
        requestAnimationFrame(StarScrap.gameLoop);
    },
    
    // Start the game loop
    startGameLoop: function() {
        console.log('Starting game loop...');
        this.gameLoop();
    },
    
    // WebSocket connection
    socket: null,
    
    validateOldSession: function() {
        fetch(`/validateOldSession?sessionId=${this.state.sessionId}`)
        .then(response => response.json())
        .then(data => {
            console.log('Validation response:', data);
            if (data.success) {
                this.state.sessionId = data.userId;
                this.startGame();
            }
        })
        .catch(error => {
            console.error('Error validating old session:', error);
        });
    },
    
    // Initialize WebSocket connection
    initSocket: function() {
        this.socket = new WebSocket(`ws://${window.location.host}`);
        
        this.socket.onopen = () => {
            console.log('WebSocket connection opened');
            this.socket.send(JSON.stringify({ type: 'player_join', message: 'New player joined!' }));
            
            // Show player count display after connection
            const playerCountDisplay = document.getElementById('player-count');
            if (playerCountDisplay) {
                playerCountDisplay.style.display = 'block';
            }
            
            // Start periodic position sync
            this.startPeriodicSync();
        };
        
        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // Handle different message types
                switch (data.type) {
                    case 'welcome':
                        console.log('Welcome message received:', data);
                        
                        // Initialize player with role and ID from server
                        if (typeof Player !== 'undefined') {
                            // Initialize the player with server-provided role and ID
                            const playerProps = Player.init(data.role, data.playerId);
                            this.state.currentPlayer = playerProps;
                            
                            // Update camera to focus on the player
                            this.updateCamera();
                            
                            // Show player info in UI
                            const playerName = document.getElementById('player-name');
                            if (playerName) {
                                playerName.textContent = data.playerId.substring(24, 30);
                            }
                            
                            const playerRole = document.getElementById('player-role');
                            if (playerRole) {
                                playerRole.textContent = data.role;
                            }
                            
                            // We need to ensure our position is sent to the server multiple times
                            // to overcome potential initial sync issues
                            const sendPosition = () => {
                                if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                                    console.log("Sending position update to server");
                                    Player.syncToServer(this.socket);
                                }
                            };
                            
                            // Send position updates several times with increasing delays
                            // This helps ensure other clients receive our position
                            setTimeout(sendPosition, 200);
                            setTimeout(sendPosition, 1000);
                            setTimeout(sendPosition, 2000);
                            setTimeout(sendPosition, 5000);
                        }
                        break;
                        
                    case 'player_count':
                        // Update player count display
                        this.updatePlayerCount(data.count);
                        break;
                        
                    case 'player_update':
                        // Handle player update from another client
                        Player.handlePlayerUpdate(data.player);
                        break;
                    
                    case 'player_disconnect':
                        // Remove disconnected player
                        if (typeof Player !== 'undefined' && data.playerId) {
                            Player.removePlayer(data.playerId);
                        }
                        break;
                        
                    case 'echo':
                        // Handle echo messages from the server
                        console.log('Echo received:', data.payload);
                        break;
                        
                    default:
                        console.log('Unhandled message type:', data.type);
                }
            } catch (e) {
                console.error('Error parsing WebSocket message:', e);
            }
        };
        
        this.socket.onerror = (error) => {
            console.error('WebSocket error: ', error);
        };
        
        this.socket.onclose = () => {
            console.log('WebSocket connection closed');
            // Hide player count when disconnected
            const playerCountDisplay = document.getElementById('player-count');
            if (playerCountDisplay) {
                playerCountDisplay.style.display = 'none';
            }
        };
        
        // Request player count periodically
        setInterval(() => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({ type: 'get_player_count' }));
            }
        }, 5000); // Every 5 seconds
    },
    
    // Update player count display
    updatePlayerCount: function(count) {
        this.state.playerCount = count;
        const countElement = document.getElementById('count');
        if (countElement) {
            countElement.textContent = count;
        }
    },
    
    // Initialize game
    init: function() {
        console.log('StarScrap game initializing...');
        
        // Set up event listeners
        this.setupEventListeners();
    },
    
    // Set up event listeners
    setupEventListeners: function() {
        this.validateOldSession();
        // Start button click handler
        const startButton = document.getElementById('start-button');
        if (startButton) {
            startButton.addEventListener('click', () => this.startGame());
        }
    },
    
    // Start the game
    startGame: function() {
        console.log('Starting game...');
        this.state.isGameStarted = true;
        
        // Create game canvas and prepare to load assets
        if (this.createGameCanvas()) {
            // WebSocket connection will be established after assets are loaded
            this.initSocket();
            const container = document.querySelector('.container');
            if (container) {
                container.style.backgroundImage = 'none';
            }
        } else {
            console.error('Failed to create game canvas!');
        }
    },
    
    // Start sending periodic position updates
    startPeriodicSync: function() {
        console.log("Starting periodic position sync");
        
        // Clear any existing interval
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        // Set up periodic sync every 200ms regardless of movement
        this.syncInterval = setInterval(() => {
            if (this.socket && 
                this.socket.readyState === WebSocket.OPEN && 
                typeof Player !== 'undefined' &&
                Player.properties && 
                Player.properties.id) {
                
                Player.syncToServer(this.socket);
            }
        }, 200);
    }
};

// Initialize the game when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    StarScrap.init();
}); 