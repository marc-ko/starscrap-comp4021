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
        assets: {
            shipMap: null,
            playerSprite: null,
            deadBodySprite: null,
            itemSprite: null

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
            <div id="health-indicator">Health: 100</div>
            <div id="tips-container">Tips: </div>
        `;
        uiElement.style.display = 'none'; // Hide until loaded
        container.appendChild(uiElement);

        setTimeout(() => {
            $('#tips-container').fadeOut(1000);
        }, 5000);
        
        this.state.canvas = canvas;
        this.state.ctx = canvas.getContext('2d');
        
        // Load assets
        this.state.assets.shipMap = this.loader.loadImage('assets/ship.png');
        this.state.assets.playerSprite = this.loader.loadImage('assets/player.png');
        this.state.assets.deadBodySprite = this.loader.loadImage('assets/dead.png');
        
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
        
        // Note: Player will be initialized when the welcome message is received from the server
        // We don't initialize the player here anymore to avoid conflicts
        
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
                                    
                                    // Show feedback to player
                                    alert('Trap set on ' + nearbyTask.name + '!');
                                }
                            } else {
                                console.log('No task nearby to set trap on');
                                alert('No task nearby to set trap on. Get closer to a task.');
                            }
                        }
                    } else if (Player.properties && Player.properties.role !== 'impostor') {
                        console.log('Only impostors can set traps');
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
        
        // Draw safe zone circle
        StarScrap.renderSafeZone(ctx, camera);
        
        // Debug: Draw map boundaries if enabled
        if (this.state.debug.enabled && this.state.debug.showBoundaries && typeof MapBound !== 'undefined') {
            if (typeof MapBound.drawDebugBoundaries === 'function') {
                MapBound.drawDebugBoundaries(ctx, camera.x, camera.y);
            }
        }
        
        // Draw tasks on the map
        if (typeof Tasks !== 'undefined' && !this.state.taskUIActive) {
            Tasks.renderTasks(ctx, camera.x, camera.y);
        }
        
        // Draw player using the Player module if available
        Player.render(ctx, this.state.assets.playerSprite, camera.x, camera.y);
    },
    
    // Render the safe zone
    renderSafeZone: function(ctx, camera) {
        // Only render if we have valid data
        if (!StarScrap.state.safeZone || !StarScrap.state.safeZone.radius) return;
        
        const safeZone = StarScrap.state.safeZone;

        console.log('safeZone',safeZone);
        
        // Calculate safe zone position relative to camera
        const screenX = safeZone.centerX - camera.x;
        const screenY = safeZone.centerY - camera.y;
        
        // Draw the gray area outside the safe zone (covering the entire view)
        ctx.save();
        
        // Create a clipping path for the area outside the safe zone
        ctx.beginPath();
        ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height); // Entire canvas
        ctx.arc(screenX, screenY, safeZone.radius, 0, Math.PI * 2, true); // Remove circle
        ctx.clip();
        
        // Fill the outside area with semi-transparent gray
        ctx.fillStyle = 'rgba(50, 50, 70, 0.5)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        ctx.restore();
        
        // Draw the purple border of the safe zone
        ctx.save();
        ctx.strokeStyle = 'rgba(128, 0, 128, 0.8)'; // Purple
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(screenX, screenY, safeZone.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        
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
                console.log('Received socket message:', data.type);
                
                switch (data.type) {
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
                            const playerProps = Player.init(data.role, data.playerId);
                            this.state.currentPlayer = playerProps;
                            
                            // Update camera to focus on the player
                            this.updateCamera();
                            
                            // Show player info in UI
                            const playerName = document.getElementById('player-name');
                            if (playerName) {
                                playerName.textContent = 'Player Name: ' + data.playerId.substring(24, 30);
                            }
                            
                            const playerRole = document.getElementById('player-role');
                            if (playerRole) {
                                playerRole.textContent = 'Your Role is a ' + data.role;
                                console.log('Player role:', data.role);
                                if (data.role.trim() === 'crewmate') {
                                    const tips = document.getElementById('tips-container');
                                    if (tips) {
                                        tips.textContent = 'You are a crewmate, your goal is to finish all the tasks before the impostor kills you.(even try to kill the impostor)';
                                    }
                                } else {
                                    const tips = document.getElementById('tips-container');
                                    if (tips) {
                                        tips.textContent = 'You are an impostor, your goal is to kill all the crewmates before they finish all the tasks.(even try to kill the crewmate who is doing the task)';
                                    }
                                }
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
                        
                    case 'safe_zone_update':
                        // Update safe zone data
                        console.log('Safe zone update received:', data);
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
                            Meeting.showReportAnimation();
                        }
                        break;
                        
                    case 'meeting_start':
                        // Handle meeting start
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
    renderBackground: function() {
        // Draw map with camera offset
        this.state.ctx.drawImage(
            this.state.assets.shipMap,
            this.state.camera.x, this.state.camera.y, 
            this.state.camera.width, this.state.camera.height,
            0, 0, 
            this.state.camera.width, this.state.camera.height
        );
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
                        `${id.substring(24, 30)} (DEAD)`, 
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

};

// Initialize the game when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    StarScrap.init();
}); 