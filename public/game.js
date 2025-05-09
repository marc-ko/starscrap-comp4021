/**
 * StarScrap - Game JavaScript
 * This file will handle the game logic and initialization
 */


// Main game object
const StarScrap = {
    // Game state
    state: {
        isGameStarted: false,
        gameStartTime: null,
        isCheating: false,
        gameCountdown: 0,
        players: [],
        currentPlayer: null,
        gameMap: null,
        safeZone: {
            centerX: 1400,
            centerY: 580,
            radius: 1250,
            nextShrinkTime: 0,
            timeUntilNextShrink: 0
        },
        playerCount: 0,
        sessionId: null,
        canvas: null,
        ctx: null,
        gameLoop: null,
        taskUIActive: false,
        meetingActive: false,
        controlsDisabled: false,
        completedTasks: 0,
        totalTasks: 0,
        isGameOver: false,
        winner: null,
        assets: {
            shipMap: null,
            playerSprite: null,
            deadBodySprite: null,
            itemSprite: null,

            roleRevealSound: null,
            meetingSound: null,
            killSound: null,
            trapSetSound: null,
            stunSound: null,
            damageSound: null,
            winningSound: null,
            losingSound: null,
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
        },

        loadSound: function(src) {
            StarScrap.loader.assetsToLoad++;
            const audio = new Audio(src);
            audio.oncanplaythrough = function() {
                StarScrap.loader.assetsLoaded++;
                StarScrap.loader.checkAllAssetsLoaded();
            };
            audio.onerror = function() {
                console.error(`Failed to load sound: ${src}`);
                StarScrap.loader.checkAllAssetsLoaded();
            };
            audio.src = src;
            return audio;
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
        
        // Create waiting screen container first (will be shown before game starts)
        const waitingScreen = document.createElement('div');
        waitingScreen.id = 'waiting-screen';
        waitingScreen.style.position = 'absolute';
        waitingScreen.style.top = '0';
        waitingScreen.style.left = '0';
        waitingScreen.style.width = '100%';
        waitingScreen.style.height = '100%';
        waitingScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        waitingScreen.style.color = 'white';
        waitingScreen.style.display = 'flex';
        waitingScreen.style.flexDirection = 'column';
        waitingScreen.style.alignItems = 'center';
        waitingScreen.style.justifyContent = 'center';
        waitingScreen.style.zIndex = '100';
        
        // Create waiting screen content
        const waitingTitle = document.createElement('h1');
        waitingTitle.textContent = 'Waiting for Players...';
        waitingTitle.style.marginBottom = '30px';
        waitingTitle.style.fontSize = '32px';
        waitingScreen.appendChild(waitingTitle);
        
        const playerCountInfo = document.createElement('div');
        playerCountInfo.id = 'waiting-player-count';
        playerCountInfo.style.fontSize = '24px';
        playerCountInfo.style.marginBottom = '20px';
        playerCountInfo.textContent = 'Players: 1/3 (Need at least 3)';
        waitingScreen.appendChild(playerCountInfo);
        
        const playersList = document.createElement('div');
        playersList.id = 'waiting-players-list';
        playersList.style.width = '80%';
        playersList.style.maxWidth = '500px';
        playersList.style.marginBottom = '30px';
        playersList.style.padding = '15px';
        playersList.style.backgroundColor = 'rgba(50, 50, 50, 0.7)';
        playersList.style.borderRadius = '10px';
        playersList.style.maxHeight = '200px';
        playersList.style.overflowY = 'auto';
        waitingScreen.appendChild(playersList);
        
        container.appendChild(waitingScreen);
        
        const startGameButton = document.createElement('button');
        startGameButton.id = 'start-game-button';
        startGameButton.textContent = 'Start Game';
        startGameButton.style.padding = '12px 24px';
        startGameButton.style.backgroundColor = '#00FFFF';
        startGameButton.style.color = '#000';
        startGameButton.style.border = 'none';
        startGameButton.style.borderRadius = '5px';
        startGameButton.style.fontSize = '18px';
        startGameButton.style.fontWeight = 'bold';
        startGameButton.style.cursor = 'pointer';
        startGameButton.style.marginTop = '20px';
        startGameButton.style.boxShadow = '0 0 10px #00FFFF';
        startGameButton.style.transition = 'all 0.2s';

        startGameButton.onmouseover = function() {
            this.style.backgroundColor = '#4FF2F2';
            this.style.boxShadow = '0 0 15px #00FFFF';
        };

        startGameButton.onmouseout = function() {
            this.style.backgroundColor = '#00FFFF';
            this.style.boxShadow = '0 0 10px #00FFFF';
        };

        startGameButton.onclick = () => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    type: 'request_game_start'
                }));
                startGameButton.disabled = true;
                startGameButton.textContent = 'Starting...';
            }
        };

        waitingScreen.appendChild(startGameButton);
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
            <div id="timer">Waiting for players</div>
            <div id="task-progress">Tasks: 0/5</div>
            <div id="safe-zone-indicator">Safe Zone: Shrinking in 30s</div>
            <div id="health-indicator">Health: 100</div>
            <div id="kill-chance-indicator">Weapon Count: 0</div>
            <div id="tips-container">Tips: Waiting for players</div>
        `;
        uiElement.style.display = 'none'; // Hide until loaded
        container.appendChild(uiElement);

        
        
        this.state.canvas = canvas;
        this.state.ctx = canvas.getContext('2d');
        
        // Load assets
        this.state.assets.shipMap = this.loader.loadImage('assets/ship.png');
        this.state.assets.playerSprite = this.loader.loadImage('assets/player.png');
        this.state.assets.itemSprite = this.loader.loadImage('assets/items.png');
        this.state.assets.deadBodySprite = this.loader.loadImage('assets/dead.png');
        // Sounds
        this.state.assets.roleRevealSound = this.loader.loadSound('assets/role_reveal.mp3');
        this.state.assets.meetingSound = this.loader.loadSound('assets/meetingSound.mp3');
        this.state.assets.killSound = this.loader.loadSound('assets/kill.mp3');
        this.state.assets.trapSetSound = this.loader.loadSound('assets/setTrap.mp3');
        this.state.assets.stunSound = this.loader.loadSound('assets/stunned.mp3');
        this.state.assets.winningSound = this.loader.loadSound('assets/winning.mp3');
        this.state.assets.losingSound = this.loader.loadSound('assets/losing.mp3');
        this.state.assets.damageSound = this.loader.loadSound('assets/damage.mp3');

        return true;
    },
    
    // Initialize the game
    initializeGame: function() {
        console.log('Initializing game...');
        
        // Show canvas and UI - but keep waiting screen visible
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
        
        // Note: Player will be initialized when the welcome message is received from the server
        // We don't initialize the player here anymore to avoid conflicts
        
        // Initialize item system
        if (typeof Item !== 'undefined') {
            Item.init();
        }
        
        // Initialize task system
        if (typeof Tasks !== 'undefined') {
            Tasks.init();
        }
        
        // Initialize meeting system
        if (typeof Meeting !== 'undefined') {
            Meeting.init();
        }
        
        // Set up input handlers
        this.setupGameControls();
        
        // Start game loop
        this.startGameLoop();
    },
    
    // Set up keyboard controls
    setupGameControls: function() {
        let isControlPressed = false;
        let isCPressed = false;
        window.addEventListener('keydown', (e) => {
            // If controls are disabled, only allow chat and UI interactions
            if (this.state.controlsDisabled && !['Enter', 'Escape'].includes(e.key)) {
                return;
            }
            
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
                case 'e': case 'E':
                    // Try to interact with a nearby task
                    if (typeof Tasks !== 'undefined' && !this.state.taskUIActive) {
                        Tasks.interactWithNearbyTask();
                    }
                    break;
                case 'f': case 'F':
                    // Try to pick up a nearby item
                    if (typeof Player !== 'undefined' && !this.state.taskUIActive && 
                        Player.properties && Player.tryPickupItem) {
                        Player.tryPickupItem();
                    }
                    break;
                case 'k': case 'K':
                    // Try to kill a nearby player (impostor only)
                    if (typeof Player !== 'undefined' && !this.state.taskUIActive && 
                        Player.properties) {
                        
                        const killed = Player.tryKill();
                        if (killed) {
                            console.log('Player killed successfully!');
                        }
                    }
                    break;
                case 'r': case 'R':
                    // Try to report a dead body
                    if (typeof Player !== 'undefined' && 
                        typeof Meeting !== 'undefined' && 
                        !this.state.taskUIActive && 
                        !this.state.meetingActive) {
                        
                        // Check if near a dead body
                        const nearBody = Player.isNearDeadBody();
                        if (nearBody) {
                            console.log('Reporting dead body:', nearBody.playerId);
                            Meeting.reportBody(nearBody.playerId);
                        } else {
                            console.log('No dead body nearby to report');
                        }
                    }
                    break;
                case 'x': case 'X':
                    this.state.isCheating = false;
                    break;
                case 'Control':
                    isControlPressed = true;
                    break;
                case 'c':
                case 'C':
                    isCPressed = true;
                    break;
                case 'm': case 'M':
                    // Try to call a meeting
                    if (typeof Meeting !== 'undefined' && 
                        !this.state.taskUIActive && 
                        !this.state.meetingActive) {
                        
                        const meetingCalled = Meeting.callMeeting();
                        if (meetingCalled) {
                            console.log('Meeting called!');
                        }
                    } else if (this.state.meetingActive) {
                        console.log('Meeting is already active');
                    }
                    break;
                case 't': case 'T':
                    // Try to set trap (impostor only)
                    if (typeof Player !== 'undefined' && !this.state.taskUIActive && 
                        Player.properties && Player.properties.role === 'impostor') {
                        
                        // Check if near a task
                        if (typeof Tasks !== 'undefined') {
                            const nearbyTask = Tasks.findNearbyTask();
                            if (nearbyTask) {
                                console.log('Setting trap on task:', nearbyTask.id);
                                
                                // Send trap message to server
                                if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                                    this.socket.send(JSON.stringify({
                                        type: 'set_trap',
                                        taskId: nearbyTask.id,
                                        playerId: Player.properties.id
                                    }));
                                    this.state.assets.trapSetSound.play();
                                    // Show feedback to player
                                    this.showGameMessage('Trap set on ' + nearbyTask.name + '!', 'success');
                                }
                            } else {
                                console.log('No task nearby to set trap on');
                                this.showGameMessage('No task nearby to set trap on. Get closer to a task.', 'error');
                            }
                        }
                    } else if (Player.properties && Player.properties.role !== 'impostor') {
                        console.log('Only impostors can set traps');
                        this.showGameMessage('Only impostors can set traps.', 'error');
                    }
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
            if(isControlPressed && isCPressed){
                this.state.isCheating = true;
                setTimeout(() => {
                    this.state.isCheating = false;
                    isControlPressed = false;
                    isCPressed = false;
                }, 5000);
            }
        });
        
        window.addEventListener('keyup', (e) => {
            switch(e.key) {
                case 'Control':
                    isControlPressed = false;
                    break;
                case 'C':
                    isCPressed = false;
                    break;
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
        // If controls are disabled (during meeting), don't update movement
        if (this.state.controlsDisabled || (Player && Player.properties && !Player.properties.isAlive)) {
            return false;
        }
        
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
            Player.updateHealthUI();
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
        if (!this.state.canvas || !this.state.ctx) return;
        
        // Clear canvas
        this.state.ctx.clearRect(0, 0, this.state.canvas.width, this.state.canvas.height);
        
        // Draw map background
        this.renderWorld();
        
        // Render safe zone circle
        this.renderSafeZone();
        
        // Render debug information if enabled
        if (this.state.debug.enabled && this.state.debug.showBoundaries) {
            this.renderDebugBoundaries();
        }
        
        // Render items if Item module is initialized
        if (typeof Item !== 'undefined') {
            Item.render(
                this.state.ctx, 
                this.state.assets.itemSprite, 
                this.state.camera.x, 
                this.state.camera.y
            );
        }
        
        // Render player and tasks if initialized
        if (typeof Player !== 'undefined') {
            Player.render(
                this.state.ctx, 
                this.state.assets.playerSprite, 
                this.state.camera.x, 
                this.state.camera.y,
                this.state.isCheating
            );
        }
        
        if (typeof Tasks !== 'undefined') {
            Tasks.renderTasks(this.state.ctx, this.state.camera.x, this.state.camera.y);
        }
        
        // Display report indicator if near a dead body
        this.renderReportIndicator();
        
        // Display item pickup indicator if near an item
        this.renderItemPickupIndicator();
    },
    
    // Render the safe zone
    renderSafeZone: function() {
        // Only render if we have valid data
        if (!StarScrap.state.safeZone || !StarScrap.state.safeZone.radius) return;
        
        const safeZone = StarScrap.state.safeZone;

        // Calculate safe zone position relative to camera
        const screenX = safeZone.centerX - StarScrap.state.camera.x;
        const screenY = safeZone.centerY - StarScrap.state.camera.y;
        
        // Draw the gray area outside the safe zone (covering the entire view)
        StarScrap.state.ctx.save();
        
        // Create a clipping path for the area outside the safe zone
        StarScrap.state.ctx.beginPath();
        StarScrap.state.ctx.rect(0, 0, StarScrap.state.ctx.canvas.width, StarScrap.state.ctx.canvas.height); // Entire canvas
        StarScrap.state.ctx.arc(screenX, screenY, safeZone.radius, 0, Math.PI * 2, true); // Remove circle
        StarScrap.state.ctx.clip();
        
        // Fill the outside area with semi-transparent gray
        StarScrap.state.ctx.fillStyle = 'rgba(50, 50, 70, 0.5)';
        StarScrap.state.ctx.fillRect(0, 0, StarScrap.state.ctx.canvas.width, StarScrap.state.ctx.canvas.height);
        
        StarScrap.state.ctx.restore();
        
        // Draw the purple border of the safe zone
        StarScrap.state.ctx.save();
        StarScrap.state.ctx.strokeStyle = 'rgba(128, 0, 128, 0.8)'; // Purple
        StarScrap.state.ctx.lineWidth = 3;
        StarScrap.state.ctx.beginPath();
        StarScrap.state.ctx.arc(screenX, screenY, safeZone.radius, 0, Math.PI * 2);
        StarScrap.state.ctx.stroke();
        StarScrap.state.ctx.restore();
        
        // Update safe zone countdown indicator
        if (StarScrap.state.gameStartTime) {
            // Update the countdown based on real-time
            const safeZoneIndicator = document.getElementById('safe-zone-indicator');
            if (safeZoneIndicator) {
                const timeLeftInSeconds = Math.max(0, Math.floor((safeZone.nextShrinkTime - Date.now()) / 1000));
                safeZoneIndicator.textContent = `Safe Zone: Shrinking in ${timeLeftInSeconds}s`;
            }
        }
    },
    
    // Game loop
    gameLoop: function() {
        StarScrap.updatePlayer();
        
        // Update game timer display
        if (StarScrap.state.gameStartTime) {
            const gameElapsedTime = Date.now() - StarScrap.state.gameStartTime;
            const minutes = String(Math.floor(gameElapsedTime / 60000)).padStart(2, '0');
            const seconds = String(Math.floor((gameElapsedTime % 60000) / 1000)).padStart(2, '0');
            $('#timer').text(`${minutes}:${seconds}`);
        }
        StarScrap.render();
        requestAnimationFrame(StarScrap.gameLoop);
    },
    // Start the game loop
    startGameLoop: function() {
        console.log('Starting game loop');
        
        StarScrap.gameLoop();
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
            this.socket.send(JSON.stringify({ type: 'player_join', message: 'Player joined' }));
           
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
                console.log('Received socket message:', data);
                
                switch (data.type) {
                
                    case 'game_start_response':
                    // Handle response to game start request
                    if (data.success) {
                        console.log('Game starting by player request');
                    } else {
                        console.log('Game start request failed:', data.message);
                        // Re-enable the button
                        const startButton = document.getElementById('start-game-button');
                        if (startButton) {
                            startButton.disabled = false;
                            startButton.textContent = 'Start Game';
                            
                            // Show error message
                            const waitingPlayerCount = document.getElementById('waiting-player-count');
                            if (waitingPlayerCount) {
                                waitingPlayerCount.textContent = data.message;
                                setTimeout(() => {
                                    waitingPlayerCount.textContent = `Players: ${this.state.playerCount}/${gameState.minPlayers} (Need at least ${gameState.minPlayers})`;
                                }, 3000);
                            }
                        }
                    }
                    break;
                    case 'welcome':
                        console.log('Welcome message received:', data);
                        
                        // Set game start time from server
                        if (data.gameStartTime) {
                            // Calculate time offset between server and client
                            const serverTimeOffset = Date.now() - data.serverTime;
                            console.log(`Server time offset: ${serverTimeOffset}ms`);
                            
                            // Adjust game start time based on server time
                            this.state.gameStartTime = data.gameStartTime + serverTimeOffset;
                            console.log(`Game started at: ${new Date(this.state.gameStartTime).toISOString()}`);
                        } else {
                            // Fallback to local time if server doesn't provide start time
                            this.state.gameStartTime = Date.now();
                        }
                        
                        // Initialize player with role and ID from server
                        if (typeof Player !== 'undefined') {
                            // Initialize the player with server-provided role and ID
                            const playerProps = Player.init(data.role??"crewmate", data.playerId);
                            this.state.currentPlayer = playerProps;
                            
                            // Update camera to focus on the player
                            this.updateCamera();
                            
                            // Show player info in UI
                            const playerName = document.getElementById('player-name');
                            if (playerName) {
                                playerName.textContent = 'Player Name: ' + data.playerId;
                            }
                            
                            const playerRole = document.getElementById('player-role');
                            if (playerRole) {
                                playerRole.textContent = 'Your Role is a ' + data.role;
                                console.log('Player role:', data.role);
                                if (data.role && data.role.trim() === 'crewmate') {
                                    const tips = document.getElementById('tips-container');
                                    if (tips) {
                                        tips.textContent = 'You are a crewmate, your goal is to finish all the tasks before the impostor kills you.(even try to kill the impostor)';
                                    }
                                } else if (data.role && data.role.trim() === 'impostor') {
                                    const tips = document.getElementById('tips-container');
                                    if (tips) {
                                        tips.textContent = 'You are an impostor, your goal is to kill all the crewmates before they finish all the tasks.(even try to kill the crewmate who is doing the task)';
                                    }
                                }
                            }
                            
                            // Add this player to the waiting players list
                            this.updateWaitingPlayersList(data.playerId, 'You');
                            
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
                        if (Player && Player.handlePlayerUpdate) {
                            Player.handlePlayerUpdate(data.player);
                            
                            // Add player to waiting list if not already there
                            if (data.player && data.player.id) {
                                this.updateWaitingPlayersList(data.player.id);
                            }
                        }
                        break;
                    case 'player_disconnect':
                        // Remove disconnected player
                        if (typeof Player !== 'undefined' && data.playerId) {
                            Player.removePlayer(data.playerId);
                            
                            // Remove from waiting players list
                            this.removeFromWaitingPlayersList(data.playerId);
                        }
                        break;
                        
                    case 'safe_zone_update':
                        // Update safe zone data
                        this.state.safeZone.centerX = data.centerX;
                        this.state.safeZone.centerY = data.centerY;
                        this.state.safeZone.radius = data.radius;
                        this.state.safeZone.nextShrinkTime = data.nextShrinkTime;
                        this.state.safeZone.timeUntilNextShrink = data.timeUntilNextShrink;
                        
                        // Update safe zone indicator in UI
                        const safeZoneIndicator = document.getElementById('safe-zone-indicator');
                        if (safeZoneIndicator) {
                            const timeLeftInSeconds = Math.floor(this.state.safeZone.timeUntilNextShrink / 1000);
                            safeZoneIndicator.textContent = `Safe Zone: Shrinking in ${timeLeftInSeconds}s`;
                        }
                        break;
                        
                    case 'player_kill':
                        // Handle player kill
                        console.log('Player kill message received:', data);
                        
                        // If I am the victim, handle being killed
                        if (data.victim === Player.properties.id) {
                            Player.handleBeingKilled();
                            
                            // Show death message
                            const deathMessage = document.createElement('div');
                            deathMessage.id = 'death-message';
                            deathMessage.style.position = 'absolute';
                            deathMessage.style.top = '50%';
                            deathMessage.style.left = '50%';
                            deathMessage.style.transform = 'translate(-50%, -50%)';
                            deathMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                            deathMessage.style.color = 'red';
                            deathMessage.style.padding = '20px';
                            deathMessage.style.borderRadius = '10px';
                            deathMessage.style.fontSize = '24px';
                            deathMessage.style.fontWeight = 'bold';
                            deathMessage.style.zIndex = '1000';
                            
                            // Different message based on death cause
                            if (data.killerId === 'safe_zone') {
                                deathMessage.textContent = 'You died outside the safe zone!';
                            } else {
                                deathMessage.textContent = 'You were killed by a mate!';
                            }
                            
                            document.body.appendChild(deathMessage);
                            
                            // // Remove death message after 3 seconds
                            setTimeout(() => {
                                if (deathMessage && deathMessage.parentNode) {
                                    deathMessage.parentNode.removeChild(deathMessage);
                                }
                            }, 3000);
                        }
                        
                        // If another player died, update their state
                        else if (Player.otherPlayers.has(data.victim)) {
                            const killedPlayer = Player.otherPlayers.get(data.victim);
                            if (killedPlayer) {
                                killedPlayer.isAlive = false;
                                killedPlayer.deathTime = Date.now();
                                killedPlayer.deathX = data.x || killedPlayer.x;
                                killedPlayer.deathY = data.y || killedPlayer.y;
                            }
                        }
                        break;
                        
                    case 'echo':
                        // Handle echo messages from the server
                        console.log('Echo received:', data.payload);
                        break;
                        
                    case 'task_trapped':
                        // Handle task trapped from server
                        console.log('Task trapped message received:', data);
                        if (typeof Tasks !== 'undefined') {
                            Tasks.handleTaskTrapped(data);
                            
                            // Visual feedback for impostor
                            if (Player.properties.role === 'impostor') {
                                // Flash visual feedback for impostor
                                const flashOverlay = document.createElement('div');
                                flashOverlay.style.position = 'absolute';
                                flashOverlay.style.top = '0';
                                flashOverlay.style.left = '0';
                                flashOverlay.style.width = '100%';
                                flashOverlay.style.height = '100%';
                                flashOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
                                flashOverlay.style.pointerEvents = 'none';
                                flashOverlay.style.zIndex = '999';
                                document.body.appendChild(flashOverlay);
                                
                                // Remove after short flash
                                setTimeout(() => {
                                    if (flashOverlay.parentNode) {
                                        flashOverlay.parentNode.removeChild(flashOverlay);
                                    }
                                }, 300);
                            }
                        }
                        break;
                        
                    case 'report_body':
                        // Handle when someone reported a body
                        console.log('Body reported by:', data.reporterId);
                        // Set meeting flag to prevent movement
                        this.state.meetingActive = true;
                        this.state.controlsDisabled = true;
                        
                        if (typeof Meeting !== 'undefined' && Meeting.showReportAnimation) {
                            this.state.assets.meetingSound.play();
                            Meeting.showReportAnimation();
                        }
                        break;
                        
                    case 'meeting_start':
                        // Handle meeting start
                        this.state.assets.meetingSound.play();
                        console.log('Meeting start message received:', data);
                        // Ensure controls are disabled
                        this.state.meetingActive = true;
                        this.state.controlsDisabled = true;
                        
                        if (typeof Meeting !== 'undefined' && Meeting.startMeeting) {
                            Meeting.startMeeting(data);
                        }
                        break;
                        
                    case 'meeting_results':
                        // Handle meeting results
                        console.log('Meeting results received:', data);
                        
                        // Store ejected player info
                        if (data.ejected && data.ejected !== 'skip') {
                            // Update PlayerData if this is us or another player
                            if (typeof Player !== 'undefined' && Player.handleEjection) {
                                Player.handleEjection(data.ejected);
                            }
                        }
                        
                        // Show meeting results UI
                        if (typeof Meeting !== 'undefined' && Meeting.showResults) {
                            Meeting.showResults(data);
                        }
                        
                        // Broadcast player update to make sure all clients have the latest state
                        if (Player && Player.properties && StarScrap.socket && 
                            StarScrap.socket.readyState === WebSocket.OPEN) {
                            Player.syncToServer(this.socket);
                        }
                        break;
                    
                    case 'vote_update':
                        // Handle vote update message
                        console.log('Vote update message received:', data);
                        if (typeof Meeting !== 'undefined') {
                            Meeting.updateVotes(data);
                        }
                        break;
                    
                    case 'body_reported':
                        // Handle when a body is marked as reported
                        console.log('Body marked as reported:', data.deadPlayerId);
                        if (typeof Player !== 'undefined' && Player.markBodyAsReported) {
                            Player.markBodyAsReported(data.deadPlayerId);
                        }
                        break;
                    
                    case 'game_countdown':
                        // Handle game countdown
                        console.log('Game countdown received:', data.countdown);
                        this.state.gameCountdown = data.countdown;
                        
                        // Update waiting screen to show countdown
                        const waitingTitle = document.querySelector('#waiting-screen h1');
                        if (waitingTitle) {
                            waitingTitle.textContent = 'Game Starting!';
                        }
                        
                        const waitingPlayerCount = document.getElementById('waiting-player-count');
                        if (waitingPlayerCount) {
                            waitingPlayerCount.textContent = `Starting in ${data.countdown} seconds!`;
                        }
                        
                        // Show countdown UI
                        this.showCountdownUI(data.countdown);
                        break;
                        
                    case 'game_start':
                        // Handle game start
                        console.log('Game starting!');
                        this.state.isGameStarted = true;
                        this.state.gameStartTime = data.startTime;
                        
                        // Hide waiting screen
                        const waitingScreen = document.getElementById('waiting-screen');
                        if (waitingScreen) {
                            waitingScreen.style.display = 'none';
                        }
                        break;
                        
                    case 'role_assigned':
                        // Handle role assignment
                        console.log('Role assigned:', data.role);
                        
                        // Update player's role
                        if (typeof Player !== 'undefined') {
                            Player.properties.role = data.role;
                            
                            // Show role reveal UI with sound
                            this.showRoleRevealUI(data.role);
                            
                            // Update UI
                            const playerRole = document.getElementById('player-role');
                            if (playerRole) {
                                playerRole.textContent = 'Role: ' + data.role;
                            }
                            
                            // Update tips based on role
                            const tips = document.getElementById('tips-container');
                            if (tips) {
                                if (data.role === 'crewmate') {
                                    tips.textContent = 'You are a crewmate, your goal is to finish all the tasks before the impostor kills you.';
                                } else {
                                    tips.textContent = 'You are an impostor, your goal is to kill all the crewmates before they finish all the tasks.';
                                }
                                tips.style.display = 'block';
                                
                                // Fade out tips after 5 seconds
                                setTimeout(() => {
                                    $(tips).fadeOut(1000);
                                }, 5000);
                            }
                        }
                        break;
                        
                    case 'task_completed':
                        // Update task progress
                        this.state.completedTasks = data.completedTasks;
                        this.state.totalTasks = data.totalTasks;
                        
                        // Update task progress UI
                        const taskProgress = document.getElementById('task-progress');
                        if (taskProgress) {
                            taskProgress.textContent = `Tasks: ${this.state.completedTasks}/${this.state.totalTasks}`;
                        }
                        break;
                        
                    case 'game_over':
                        // Handle game over
                        console.log('Game over! Winner:', data.winner);
                        this.state.isGameOver = true;
                        this.state.winner = data.winner;
                        
                        // Show game over UI
                        this.showGameOverUI(data);
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
        
        // Update player count in the waiting screen
        const waitingPlayerCount = document.getElementById('waiting-player-count');
        if (waitingPlayerCount) {
            waitingPlayerCount.textContent = `Players: ${count}/3 (Need at least 3)`;
            
            // If we have 3 or more players, update the message
            if (count >= 3) {
                waitingPlayerCount.textContent = 'Enough players to start! Waiting for game to begin...';
            }
        }
        
        // Update player count in the standard UI if it exists
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

           // this.initSocket();
           this.socket.send(JSON.stringify({ type: 'In_Game', message: 'Player joined' }));
           
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
        // console.log("Starting periodic position sync");
        
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
    },
    
    // Set task UI active state
    setTaskUIActive: function(active) {
        this.state.taskUIActive = active;
        
        // Disable controls when task UI is active
        if (active) {
            this.state.controls.up = false;
            this.state.controls.down = false;
            this.state.controls.left = false;
            this.state.controls.right = false;
        }
    },
    
    // Disable player controls during meeting/task
    disablePlayerControls: function() {
        this.state.controlsDisabled = true;
        this.state.controls.up = false;
        this.state.controls.down = false;
        this.state.controls.left = false;
        this.state.controls.right = false;
    },
    
    // Re-enable player controls after meeting/task
    enablePlayerControls: function() {
        this.state.controlsDisabled = false;
    },

    // Display report indicator if near a dead body
    renderReportIndicator: function() {
        // Skip if player is dead or game is in a meeting/task
        if (!Player.properties.isAlive || this.state.meetingActive || this.state.taskUIActive) {
            return;
        }
        
        // Check if near any dead body
        const nearBody = Player.isNearDeadBody();
        if (nearBody) {
            // Get dead player's position
            const deadPlayer = Player.otherPlayers.get(nearBody.playerId);
            if (!deadPlayer) return;
            
            // Skip if the body is already reported
            if (deadPlayer.isReported) return;
            
            // Calculate screen position
            const screenX = deadPlayer.x - this.state.camera.x;
            const screenY = deadPlayer.y - this.state.camera.y - 30; // Position above the dead body
            
            // Draw "Press R to Report" text
            this.state.ctx.save();
            this.state.ctx.font = 'bold 16px Arial';
            this.state.ctx.textAlign = 'center';
            this.state.ctx.fillStyle = 'red';
            this.state.ctx.strokeStyle = 'black';
            this.state.ctx.lineWidth = 3;
            this.state.ctx.strokeText('Press R to Report', screenX, screenY);
            this.state.ctx.fillText('Press R to Report', screenX, screenY);
            this.state.ctx.restore();
        }
    },

    // Render functions for game elements

    // Render the game background (map)
    renderWorld: function() {
        // Draw map with camera offset
        if (this.state.assets.shipMap && this.state.assets.shipMap.complete) {
            this.state.ctx.drawImage(
                this.state.assets.shipMap,
                this.state.camera.x, this.state.camera.y, 
                this.state.camera.width, this.state.camera.height,
                0, 0, this.state.camera.width, this.state.camera.height
            );
        }
    },
    
    // Render debug boundaries
    renderDebugBoundaries: function() {
        // Draw map boundaries if enabled
        if (typeof MapBound !== 'undefined' && typeof MapBound.drawDebugBoundaries === 'function') {
            MapBound.drawDebugBoundaries(
                this.state.ctx, 
                this.state.camera.x, 
                this.state.camera.y
            );
        }
    },

    // Render other players and dead bodies
    renderOtherPlayers: function() {
        if (Player && Player.otherPlayers) {
            Player.otherPlayers.forEach((player, id) => {
                // Skip if player data is invalid
                if (!player || typeof player.x !== 'number') return;
                
                // If player is dead, render dead body sprite
                if (player.isAlive === false) {
                    // Position of dead body
                    const deadX = player.deathX || player.x;
                    const deadY = player.deathY || player.y;
                    
                    // Calculate screen position
                    const screenX = deadX - this.state.camera.x;
                    const screenY = deadY - this.state.camera.y;
                    
                    // Draw dead body sprite if available, otherwise draw a placeholder
                    if (this.state.assets.deadBodySprite && this.state.assets.deadBodySprite.complete) {
                        this.state.ctx.drawImage(
                            this.state.assets.deadBodySprite,
                            0, 0,
                            this.state.assets.deadBodySprite.width, this.state.assets.deadBodySprite.height,
                            screenX, screenY,
                            40, 40
                        );
                    } else {
                        // Placeholder for dead body
                        this.state.ctx.save();
                        this.state.ctx.fillStyle = 'red';
                        this.state.ctx.beginPath();
                        this.state.ctx.arc(screenX + 20, screenY + 20, 20, 0, Math.PI * 2);
                        this.state.ctx.fill();
                        this.state.ctx.restore();
                    }
                    
                    // Draw player ID above the dead body
                    this.state.ctx.save();
                    this.state.ctx.font = '12px Arial';
                    this.state.ctx.textAlign = 'center';
                    this.state.ctx.fillStyle = 'red';
                    this.state.ctx.fillText(
                        `${id} (DEAD)`, 
                        screenX + 20, 
                        screenY - 5
                    );
                    this.state.ctx.restore();
                } else {
                    // Render living player using Player.renderPlayer method
                    Player.renderPlayer(
                        this.state.ctx, 
                        this.state.assets.playerSprite, 
                        player, 
                        this.state.camera.x, 
                        this.state.camera.y
                    );
                }
            });
        }
    },

    // Render tasks
    renderTasks: function() {
        // If Tasks module exists and has a render method, call it
            Tasks.renderTasks(this.state.ctx, this.state.camera.x, this.state.camera.y);
    },

    // Render local player
    renderPlayer: function() {
        // Skip if player is not initialized or not alive
        if (!Player || !Player.properties) return;
        
        // If player is alive, render using Player module
        if (Player.properties.isAlive) {
            Player.renderPlayer(
                this.state.ctx, 
                this.state.assets.playerSprite, 
                Player.properties, 
                this.state.camera.x, 
                this.state.camera.y
            );
        }
    },

    // Show countdown UI
    showCountdownUI: function(countdown) {
        // Create countdown overlay
        const overlay = document.createElement('div');
        overlay.id = 'countdown-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        overlay.style.color = 'white';
        overlay.style.fontSize = '72px';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '1000';
        overlay.style.fontFamily = 'Arial, sans-serif';
        overlay.textContent = countdown;
        document.body.appendChild(overlay);
        
        // Update countdown every second
        let count = countdown;
        const countdownInterval = setInterval(() => {
            count--;
            if (count <= 0) {
                clearInterval(countdownInterval);
                overlay.textContent = 'GO!';
                
                // Remove overlay after a brief moment
                setTimeout(() => {
                    if (overlay.parentNode) {
                        overlay.parentNode.removeChild(overlay);
                    }
                }, 1000);
            } else {
                overlay.textContent = count;
            }
        }, 1000);
    },

    // Show role reveal UI with sound
    showRoleRevealUI: function(role) {
        // Create role reveal overlay
        const overlay = document.createElement('div');
        overlay.id = 'role-reveal-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = role === 'impostor' ? 'rgba(255, 0, 0, 0.7)' : 'rgba(0, 0, 255, 0.7)';
        overlay.style.color = 'white';
        overlay.style.fontSize = '48px';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '1000';
        overlay.style.fontFamily = 'Arial, sans-serif';
        
        const roleText = document.createElement('div');
        roleText.textContent = `You are ${role === 'impostor' ? 'an' : 'a'} ${role.toUpperCase()}`;
        roleText.style.marginBottom = '20px';
        
        const roleDescription = document.createElement('div');
        roleDescription.style.fontSize = '24px';
        roleDescription.style.maxWidth = '600px';
        roleDescription.style.textAlign = 'center';
        
        if (role === 'impostor') {
            roleDescription.textContent = 'Kill the crewmates before they complete all tasks. Press K near a crewmate to kill them.';
        } else {
            roleDescription.textContent = 'Complete all tasks to win. Watch out for impostors!';
        }
        
        overlay.appendChild(roleText);
        overlay.appendChild(roleDescription);
        document.body.appendChild(overlay);
        
        // Play role reveal sound
        if (this.state.assets.roleRevealSound) {
            this.state.assets.roleRevealSound.play();
        }
        
        // Remove overlay after a few seconds
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 4000);
    },

    // Show game over UI
    showGameOverUI: function(data) {
        // Create game over overlay
        const overlay = document.createElement('div');
        overlay.id = 'game-over-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        overlay.style.color = 'white';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '1000';
        overlay.style.fontFamily = 'Arial, sans-serif';
        overlay.style.overflowY = 'auto'; // Allow scrolling if content is large
        overlay.style.padding = '20px 0';
        
        // Create header
        const header = document.createElement('h1');
        header.textContent = data.winner === 'crewmate' ? 'CREWMATES WIN!' : 'IMPOSTOR WINS!';
        header.style.color = data.winner === 'crewmate' ? '#2196F3' : '#F44336';
        header.style.fontSize = '48px';
        header.style.marginBottom = '20px';
        header.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
        
        // Create reason
        const reason = document.createElement('div');
        reason.textContent = data.reason;
        reason.style.fontSize = '24px';
        reason.style.marginBottom = '30px';
        
        // Create leaderboard container
        const leaderboardContainer = document.createElement('div');
        leaderboardContainer.style.width = '80%';
        leaderboardContainer.style.maxWidth = '800px';
        leaderboardContainer.style.marginBottom = '30px';
        leaderboardContainer.style.display = 'flex';
        leaderboardContainer.style.flexDirection = 'column';
        leaderboardContainer.style.gap = '20px';
        
        // Create leaderboard header
        const leaderboardHeader = document.createElement('h2');
        leaderboardHeader.textContent = 'LEADERBOARD';
        leaderboardHeader.style.textAlign = 'center';
        leaderboardHeader.style.fontSize = '32px';
        leaderboardHeader.style.margin = '0 0 10px 0';
        leaderboardHeader.style.borderBottom = '2px solid #666';
        leaderboardHeader.style.paddingBottom = '10px';
        
        leaderboardContainer.appendChild(leaderboardHeader);
        
        // Add MVPs section
        const mvpSection = document.createElement('div');
        mvpSection.style.display = 'flex';
        mvpSection.style.justifyContent = 'space-around';
        mvpSection.style.margin = '0 0 20px 0';
        mvpSection.style.padding = '15px';
        mvpSection.style.backgroundColor = 'rgba(50, 50, 50, 0.7)';
        mvpSection.style.borderRadius = '10px';
        
        // Determine MVPs if data is available
        let topKiller = { id: 'None', kills: 0 };
        let topTaskCompleter = { id: 'None', tasks: 0 };
        
        if (data.playerStats) {
            // Find top killer (impostor MVP)
            data.playerStats.forEach(player => {
                if (player.kills > topKiller.kills) {
                    topKiller = { id: player.id, kills: player.kills };
                }
            });
            
            // Find top task completer (crewmate MVP)
            data.playerStats.forEach(player => {
                if (player.completedTasks > topTaskCompleter.tasks) {
                    topTaskCompleter = { id: player.id, tasks: player.completedTasks };
                }
            });
        }
        
        // Create Impostor MVP display
        const impostorMVP = document.createElement('div');
        impostorMVP.style.textAlign = 'center';
        impostorMVP.style.padding = '15px';
        impostorMVP.style.borderRadius = '8px';
        impostorMVP.style.backgroundColor = 'rgba(244, 67, 54, 0.3)';
        impostorMVP.style.width = '45%';
        
        const impostorMVPTitle = document.createElement('h3');
        impostorMVPTitle.textContent = 'IMPOSTOR MVP';
        impostorMVPTitle.style.margin = '0 0 10px 0';
        impostorMVPTitle.style.color = '#F44336';
        
        const impostorMVPName = document.createElement('div');
        impostorMVPName.style.fontSize = '20px';
        impostorMVPName.style.fontWeight = 'bold';
        impostorMVPName.textContent = topKiller.id !== 'None' ? topKiller.id : 'None';
        
        const impostorMVPKills = document.createElement('div');
        impostorMVPKills.textContent = `Kills: ${topKiller.kills}`;
        impostorMVPKills.style.fontSize = '18px';
        
        impostorMVP.appendChild(impostorMVPTitle);
        impostorMVP.appendChild(impostorMVPName);
        impostorMVP.appendChild(impostorMVPKills);
        
        // Create Crewmate MVP display
        const crewmateMVP = document.createElement('div');
        crewmateMVP.style.textAlign = 'center';
        crewmateMVP.style.padding = '15px';
        crewmateMVP.style.borderRadius = '8px';
        crewmateMVP.style.backgroundColor = 'rgba(33, 150, 243, 0.3)';
        crewmateMVP.style.width = '45%';
        
        const crewmateMVPTitle = document.createElement('h3');
        crewmateMVPTitle.textContent = 'CREWMATE MVP';
        crewmateMVPTitle.style.margin = '0 0 10px 0';
        crewmateMVPTitle.style.color = '#2196F3';
        
        const crewmateMVPName = document.createElement('div');
        crewmateMVPName.style.fontSize = '20px';
        crewmateMVPName.style.fontWeight = 'bold';
        crewmateMVPName.textContent = topTaskCompleter.id !== 'None' ? topTaskCompleter.id : 'None';
        
        const crewmateMVPTasks = document.createElement('div');
        crewmateMVPTasks.textContent = `Tasks: ${topTaskCompleter.tasks}`;
        crewmateMVPTasks.style.fontSize = '18px';
        
        crewmateMVP.appendChild(crewmateMVPTitle);
        crewmateMVP.appendChild(crewmateMVPName);
        crewmateMVP.appendChild(crewmateMVPTasks);
        
        mvpSection.appendChild(impostorMVP);
        mvpSection.appendChild(crewmateMVP);
        leaderboardContainer.appendChild(mvpSection);
        
        // Create detailed stats table
        const statsTable = document.createElement('table');
        statsTable.style.width = '100%';
        statsTable.style.borderCollapse = 'collapse';
        statsTable.style.textAlign = 'left';
        statsTable.style.backgroundColor = 'rgba(50, 50, 50, 0.7)';
        statsTable.style.borderRadius = '10px';
        statsTable.style.overflow = 'hidden';
        
        // Create header row
        const headerRow = document.createElement('tr');
        headerRow.style.backgroundColor = 'rgba(80, 80, 80, 0.8)';
        
        const headers = ['Player', 'Role', 'Status', 'Kills', 'Tasks Completed'];
        headers.forEach(headerText => {
            const header = document.createElement('th');
            header.textContent = headerText;
            header.style.padding = '12px';
            header.style.borderBottom = '2px solid #666';
            headerRow.appendChild(header);
        });
        
        statsTable.appendChild(headerRow);
        
        // Add player rows with stats
        if (data.playerStats) {
            data.playerStats.forEach(player => {
                const row = document.createElement('tr');
                row.style.borderBottom = '1px solid #333';
                
                // Player name
                const playerCell = document.createElement('td');
                playerCell.textContent = player.id;
                playerCell.style.padding = '12px';
                
                // Highlight current player
                if (Player && Player.properties && player.id === Player.properties.id) {
                    playerCell.style.fontWeight = 'bold';
                    playerCell.textContent += ' (You)';
                }
                
                // Highlight MVPs
                if (player.id === topKiller.id && topKiller.kills > 0) {
                    playerCell.style.color = '#F44336';
                    playerCell.textContent += ' 👑';
                } else if (player.id === topTaskCompleter.id && topTaskCompleter.tasks > 0) {
                    playerCell.style.color = '#2196F3';
                    playerCell.textContent += ' 🏆';
                }
                
                // Role
                const roleCell = document.createElement('td');
                roleCell.textContent = player.role;
                roleCell.style.padding = '12px';
                roleCell.style.color = player.role === 'impostor' ? '#F44336' : '#2196F3';
                
                // Status
                const statusCell = document.createElement('td');
                statusCell.textContent = player.isAlive ? 'Alive' : 'Dead';
                statusCell.style.padding = '12px';
                statusCell.style.color = player.isAlive ? '#4CAF50' : '#F44336';
                
                // Kills
                const killsCell = document.createElement('td');
                killsCell.textContent = player.kills || 0;
                killsCell.style.padding = '12px';
                
                // Tasks
                const tasksCell = document.createElement('td');
                tasksCell.textContent = player.completedTasks || 0;
                tasksCell.style.padding = '12px';
                
                row.appendChild(playerCell);
                row.appendChild(roleCell);
                row.appendChild(statusCell);
                row.appendChild(killsCell);
                row.appendChild(tasksCell);
                
                statsTable.appendChild(row);
            });
        } else {
            // Fallback to use playerRoles if playerStats is not available
            data.playerRoles.forEach(player => {
                const row = document.createElement('tr');
                row.style.borderBottom = '1px solid #333';
                
                // Player name
                const playerCell = document.createElement('td');
                playerCell.textContent = player.id;
                playerCell.style.padding = '12px';
                
                // Role
                const roleCell = document.createElement('td');
                roleCell.textContent = player.role;
                roleCell.style.padding = '12px';
                roleCell.style.color = player.role === 'impostor' ? '#F44336' : '#2196F3';
                
                // Status
                const statusCell = document.createElement('td');
                statusCell.textContent = player.isAlive ? 'Alive' : 'Dead';
                statusCell.style.padding = '12px';
                statusCell.style.color = player.isAlive ? '#4CAF50' : '#F44336';
                
                // Kills and Tasks (unknown)
                const killsCell = document.createElement('td');
                killsCell.textContent = '?';
                killsCell.style.padding = '12px';
                
                const tasksCell = document.createElement('td');
                tasksCell.textContent = '?';
                tasksCell.style.padding = '12px';
                
                row.appendChild(playerCell);
                row.appendChild(roleCell);
                row.appendChild(statusCell);
                row.appendChild(killsCell);
                row.appendChild(tasksCell);
                
                statsTable.appendChild(row);
            });
        }
        
        leaderboardContainer.appendChild(statsTable);
        
        // Create play again button
        const playAgainButton = document.createElement('button');
        playAgainButton.textContent = 'Play Again';
        playAgainButton.style.padding = '15px 30px';
        playAgainButton.style.fontSize = '20px';
        playAgainButton.style.backgroundColor = '#4CAF50';
        playAgainButton.style.color = 'white';
        playAgainButton.style.border = 'none';
        playAgainButton.style.borderRadius = '8px';
        playAgainButton.style.cursor = 'pointer';
        playAgainButton.style.marginTop = '20px';
        playAgainButton.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
        playAgainButton.style.transition = 'all 0.2s ease';
        
        playAgainButton.onmouseover = function() {
            this.style.backgroundColor = '#45a049';
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 6px 8px rgba(0, 0, 0, 0.4)';
        };
        
        playAgainButton.onmouseout = function() {
            this.style.backgroundColor = '#4CAF50';
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
        };
        
        playAgainButton.onclick = () => {
            // Reload the page to start a new game
            window.location.reload();
        };
        
        // Play appropriate sound
        if (Player && Player.properties) {
            const isPlayerWinner = 
                (data.winner === 'crewmate' && Player.properties.role === 'crewmate') ||
                (data.winner === 'impostor' && Player.properties.role === 'impostor');
            
            if (isPlayerWinner) {
                this.state.assets.winningSound.play();
            } else {
                this.state.assets.losingSound.play();
            }
        }
        
        // Add elements to overlay
        overlay.appendChild(header);
        overlay.appendChild(reason);
        overlay.appendChild(leaderboardContainer);
        overlay.appendChild(playAgainButton);
        
        // Add to document
        document.body.appendChild(overlay);
        
        // Disable controls
        this.disablePlayerControls();
    },

    // Add method to update the waiting players list
    updateWaitingPlayersList: function(playerIdShort, label) {
        const playersList = document.getElementById('waiting-players-list');
        if (!playersList) return;
        
        // Check if player is already in the list
        const existingPlayer = document.getElementById(`waiting-player-${playerIdShort}`);
        if (existingPlayer) return;
        
        // Create player entry
        const playerEntry = document.createElement('div');
        playerEntry.id = `waiting-player-${playerIdShort}`;
        playerEntry.style.padding = '5px 10px';
        playerEntry.style.marginBottom = '5px';
        playerEntry.style.backgroundColor = 'rgba(70, 70, 70, 0.7)';
        playerEntry.style.borderRadius = '5px';
        playerEntry.style.display = 'flex';
        playerEntry.style.justifyContent = 'space-between';
        
        // Player name/id
        const playerName = document.createElement('span');
        playerName.textContent = playerIdShort;
        playerEntry.appendChild(playerName);
        
        // If this is the current player, add label
        if (label) {
            const playerLabel = document.createElement('span');
            playerLabel.textContent = label;
            playerLabel.style.color = '#4CAF50';
            playerLabel.style.fontWeight = 'bold';
            playerEntry.appendChild(playerLabel);
        }
        
        // Add to list
        playersList.appendChild(playerEntry);
    },
    
    showGameMessage: function(message, type = 'info') {
    const messageContainer = document.createElement('div');
    messageContainer.className = `game-message ${type}`;
    messageContainer.textContent = message;

    // Style the message
    messageContainer.style.position = 'absolute';
    messageContainer.style.bottom = '20px';
    messageContainer.style.left = '50%';
    messageContainer.style.transform = 'translateX(-50%)';
    messageContainer.style.backgroundColor = type === 'success' ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)';
    messageContainer.style.color = 'white';
    messageContainer.style.padding = '10px 20px';
    messageContainer.style.borderRadius = '5px';
    messageContainer.style.fontWeight = 'bold';
    messageContainer.style.zIndex = '1000';
    messageContainer.style.textAlign = 'center';
    messageContainer.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
    messageContainer.style.transition = 'opacity 0.5s ease';

    // Add to the document
    document.body.appendChild(messageContainer);

    // Remove after 3 seconds
    setTimeout(() => {
        messageContainer.style.opacity = '0';
        setTimeout(() => {
            if (messageContainer.parentNode) {
                messageContainer.parentNode.removeChild(messageContainer);
            }
        }, 500);
    }, 3000);
    },

    // Remove player from waiting list
    removeFromWaitingPlayersList: function(playerIdShort) {
        const playerEntry = document.getElementById(`waiting-player-${playerIdShort}`);
        if (playerEntry && playerEntry.parentNode) {
            playerEntry.parentNode.removeChild(playerEntry);
        }
    },

    // Display pickup indicator if near an item
    renderItemPickupIndicator: function() {
        // Skip if player is dead or game is in a meeting/task
        if (!Player.properties.isAlive || this.state.meetingActive || this.state.taskUIActive) {
            return;
        }
        
        // Check if near any item
        if (typeof Item !== 'undefined') {
            const nearbyItem = Item.findNearbyItem(Player.properties.x, Player.properties.y);
            if (nearbyItem) {
                // Calculate screen position
                const screenX = nearbyItem.x - this.state.camera.x + (nearbyItem.width / 2);
                const screenY = nearbyItem.y - this.state.camera.y - 30; // Position above the item
                
                // Draw "Press F to Pickup" text
                this.state.ctx.save();
                this.state.ctx.font = 'bold 16px Arial';
                this.state.ctx.textAlign = 'center';
                this.state.ctx.fillStyle = 'white';
                this.state.ctx.strokeStyle = 'black';
                this.state.ctx.lineWidth = 3;
                this.state.ctx.strokeText('Press F to Pickup', screenX, screenY);
                this.state.ctx.fillText('Press F to Pickup', screenX, screenY);
                this.state.ctx.restore();
            }
        }
    }
};

// Initialize the game when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    StarScrap.init();
}); 
 