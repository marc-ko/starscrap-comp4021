/**
 * StarScrap - Player Module
 * Handles player functionality: rendering, movement, actions
 */
const SHIP_WIDTH = 2160;
const SHIP_HEIGHT = 1166;
const PLAYER_SPRITE_WIDTH = 84;
const PLAYER_SPRITE_HEIGHT = 128;
const PLAYER_HEIGHT = 50;
const PLAYER_WIDTH = 37;
const PLAYER_START_X = 1400;
const PLAYER_START_Y = 580;
const PLAYER_SPEED = 2;



const Player = {
    // Player properties
    properties: {
        x: 0,
        y: 0,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        speed: PLAYER_SPEED,
        health: 100,
        maxHealth: 100,
        role: 'crewmate', // 'crewmate' or 'impostor'
        frameX: 0,
        frameCount: 8,
        frameTimer: 0,
        frameInterval: 1.5,
        direction: 'down',
        isMoving: false,
        isAlive: true,
        lastUpdated: Date.now(),
        id: null, // Will store the server-assigned player ID
        isDead: false,
        deathTime: null,
        deathX: 0,
        deathY: 0,
        lastKillTime: 0
    },
    
    // Other players in the game (for multiplayer)
    otherPlayers: new Map(), // Map of id -> player properties
    
    // Initialize player
    init: function(role = 'crewmate', id = null) {
        console.log("init player",role,id);
        this.properties.x = PLAYER_START_X;
        this.properties.y = PLAYER_START_Y;
        this.properties.role = role;
        this.properties.id = id;
        this.properties.lastUpdated = Date.now();
        this.properties.width = PLAYER_WIDTH;
        this.properties.height = PLAYER_HEIGHT;
        this.properties.frameX = 10; // Default standing frame
        
        console.log("Initialized player:", {
            id: this.properties.id,
            role: this.properties.role,
            x: this.properties.x,
            y: this.properties.y
        });

        const playerName = document.getElementById("player-name");
        playerName.textContent = id;

        const playerRole = document.getElementById("player-role");
        playerRole.textContent = role;
        
        // Force an immediate sync to server if we have an ID
        if (id) {
            setTimeout(() => {
                console.log("Sending initial position to server");
                if (typeof StarScrap !== 'undefined' && StarScrap.socket && 
                    StarScrap.socket.readyState === WebSocket.OPEN) {
                    this.syncToServer(StarScrap.socket);
                }
            }, 500); // Give time for WebSocket to fully establish
        }
        
        return this.properties;
    },

     // Update the health UI
    updateHealthUI: function() {
        const healthElement = document.getElementById('health-indicator');
        if (healthElement) {
            healthElement.textContent = `Health: ${this.properties.health}`;
        }
    },
    
    
    // Update player position based on controls
    update: function(controls, boundaryCheck) {
        // If player is dead, they can't move
        if (!this.properties.isAlive) {
            return false;
        }
        
        let isMoving = false;
        let newX = this.properties.x;
        let newY = this.properties.y;
        let direction = this.properties.direction;
        
        // Handle movement controls
        if (controls.up) {
            newY -= this.properties.speed;
            direction = 'up';
            isMoving = true;
        } else if (controls.down) {
            newY += this.properties.speed;
            direction = 'down';
            isMoving = true;
        }
        
        if (controls.left) {
            newX -= this.properties.speed;
            direction = 'left';
            isMoving = true;
        } else if (controls.right) {
            newX += this.properties.speed;
            direction = 'right';
            isMoving = true;
        }
        
        // Check boundaries and update position if valid
        if (isMoving && typeof boundaryCheck === 'function') {
            const pos = boundaryCheck(
                this.properties.x, 
                this.properties.y, 
                newX, 
                newY, 
                this.properties.width, 
                this.properties.height
            );
            
            this.properties.x = pos.x;
            this.properties.y = pos.y;
        }
        
        // Update animation state
        this.properties.isMoving = isMoving;
        this.properties.direction = direction;
        
        // Update animation frame
        if (isMoving) {
            this.properties.frameTimer++;
            if (this.properties.frameTimer >= this.properties.frameInterval) {
                this.properties.frameTimer = 0;
                this.properties.frameX = (this.properties.frameX + 1) % this.properties.frameCount;
            }
        } else {
            // For standing, use a specific frame
            this.properties.frameX = 10;
        }
        
        // Calculate time since last update for syncing
        const currentTime = Date.now();
        if (currentTime - this.properties.lastUpdated > 100) { // Sync every 100ms regardless of movement
            this.properties.lastUpdated = currentTime;
            return true; // Signal that we should sync with server
        }
        
        return false; // No need to sync
    },
    
    // Render player
    render: function(ctx, playerSprite, cameraX, cameraY) {
        try {
            // ** LOCAL PLAYER **
            if (this.properties && typeof this.properties.x === 'number') {
                this.renderPlayer(ctx, playerSprite, this.properties, cameraX, cameraY);
            } else {
                console.error("Local player properties invalid:", this.properties);
            }
            
            // ** OTHER PLAYERS **
            if (this.otherPlayers && this.otherPlayers.size > 0) {
                // console.log(`Rendering ${this.otherPlayers.size} other players`);
                this.otherPlayers.forEach((player, id) => {
                    if (player && typeof player.x === 'number') {
                        this.renderPlayer(ctx, playerSprite, player, cameraX, cameraY);
                    } else {
                        console.error(`Invalid player data for ${id}:`, player);
                    }
                });
            }
        } catch (error) {
            console.error("Error in render function:", error);
        }
    },
    
    // Render a specific player (local or remote)
    renderPlayer: function(ctx, playerSprite, player, cameraX, cameraY) {
        // Only render if the sprite is loaded
        if (!playerSprite || !playerSprite.complete) return;
        
        // Ensure player has all required properties
        if (!player || typeof player.x !== 'number' || typeof player.y !== 'number') {
            console.error("Invalid player data for rendering:", player);
            return;
        }
        
        // Ensure player has all the properties needed for rendering
        const safePlayer = {
            x: player.x || 0,
            y: player.y || 0,
            width: player.width || PLAYER_WIDTH,
            height: player.height || PLAYER_HEIGHT,
            frameX: player.frameX || 10,
            direction: player.direction || 'down',
            role: player.role || 'crewmate',
            id: player.id || null,
            isAlive: player.isAlive !== false, // Default to alive unless explicitly set to false
            deathX: player.deathX || 0,
            deathY: player.deathY || 0
        };
        
        ctx.save();
        
        // If player is dead, render the dead body sprite instead
        if (!safePlayer.isAlive) {
            if (StarScrap && StarScrap.state && StarScrap.state.assets && StarScrap.state.assets.deadBodySprite && StarScrap.state.assets.deadBodySprite.complete) {
                // Draw dead body sprite
                const deadBodySprite = StarScrap.state.assets.deadBodySprite;
                
                // For dead bodies, use the death position
                const deadX = safePlayer.deathX || safePlayer.x;
                const deadY = safePlayer.deathY || safePlayer.y;
                
                // Calculate animation frame based on time since death
                let deadFrameX = 0;
                if (player.deathTime) {
                    const timeSinceDeath = Date.now() - player.deathTime;
                    // Animation cycle: 8 frames at 200ms per frame
                    deadFrameX = Math.min(7, Math.floor(timeSinceDeath / 200) % 8);
                }
                
                // Determine if we should draw the final frame (dead body) or animation
                const isAnimationComplete = player.deathTime && (Date.now() - player.deathTime) > 1600; // 8 frames * 200ms
                const frameX = isAnimationComplete ? 7 : deadFrameX; // Use last frame if animation complete
                
                // Draw dead body
                ctx.drawImage(
                    deadBodySprite,
                    frameX * PLAYER_SPRITE_WIDTH, 0,
                    PLAYER_SPRITE_WIDTH, PLAYER_SPRITE_HEIGHT,
                    deadX - cameraX, deadY - cameraY,
                    safePlayer.width, safePlayer.height
                );
                
                // Draw player ID above the dead body
                if (safePlayer.id) {
                    ctx.font = '10px Arial';
                    ctx.fillStyle = 'red';
                    ctx.fillText(`${safePlayer.id.substring(24, 30)} (DEAD)`, 
                        deadX - cameraX, 
                        deadY - cameraY - 3);
                }
                
                ctx.restore();
                return;
            }
        }
        
        // Apply tint for impostors (red) or crewmates (blue) ONLY for the local player
        if (safePlayer.id === this.properties.id) {
            if (safePlayer.role === 'impostor') {
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = 'red';
                ctx.fillRect(
                    safePlayer.x - cameraX - 5,
                    safePlayer.y - cameraY - 5,
                    safePlayer.width + 10,
                    safePlayer.height + 10
                );
                ctx.globalAlpha = 1.0;
            } else {
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = 'blue';
                ctx.fillRect(
                    safePlayer.x - cameraX - 5,
                    safePlayer.y - cameraY - 5,
                    safePlayer.width + 10,
                    safePlayer.height + 10
                );
                ctx.globalAlpha = 1.0;
            }
        } 
        
        try {
            // Draw player sprite with flip for left direction
            if (safePlayer.direction === 'left') {
                // Save context state
                ctx.save();
                
                // Translate to player position
                ctx.translate(safePlayer.x - cameraX + safePlayer.width, safePlayer.y - cameraY);
                
                // Scale to flip horizontally (negative X)
                ctx.scale(-1, 1);
                
                // Draw the player sprite at origin (after transform)
                ctx.drawImage(
                    playerSprite,
                    safePlayer.frameX * PLAYER_SPRITE_WIDTH, 0, 
                    PLAYER_SPRITE_WIDTH, PLAYER_SPRITE_HEIGHT,
                    0, 0, 
                    safePlayer.width, safePlayer.height
                );
                
                // Restore context state
                ctx.restore();
            } else {
                // Draw without flipping
                ctx.drawImage(
                    playerSprite,
                    safePlayer.frameX * PLAYER_SPRITE_WIDTH, 0,
                    PLAYER_SPRITE_WIDTH, PLAYER_SPRITE_HEIGHT,
                    safePlayer.x - cameraX, safePlayer.y - cameraY,
                    safePlayer.width, safePlayer.height
                );
            }

            
            // Draw player ID above the player if not local player
            if (safePlayer.id && safePlayer.id !== this.properties.id) {
                ctx.font = '10px Arial';
                ctx.fillStyle = 'white';
                ctx.fillText(safePlayer.id.substring(24, 30), 
                    safePlayer.x - cameraX, 
                    safePlayer.y - cameraY - 3);
            }
        } catch (error) {
            console.error("Error rendering player:", error, safePlayer);
        }
        
        ctx.restore();
    },
    
    // Handle player interaction with objects in the game world
    interact: function(object) {
        // Calculate distance between player center and object center
        const playerCenterX = this.properties.x + this.properties.width / 2;
        const playerCenterY = this.properties.y + this.properties.height / 2;
        const objectCenterX = object.x + object.width / 2;
        const objectCenterY = object.y + object.height / 2;
        
        const distance = Math.sqrt(
            Math.pow(playerCenterX - objectCenterX, 2) + 
            Math.pow(playerCenterY - objectCenterY, 2)
        );
        
        // Check if within interaction distance (e.g., 50 pixels)
        return distance < 50;
    },
    
    // Apply damage to player's health
    takeDamage: function(amount) {
        this.properties.health = Math.max(0, this.properties.health - amount);
        return this.properties.health;
    },
    
    // Heal player's health
    heal: function(amount) {
        this.properties.health = Math.min(this.properties.maxHealth, this.properties.health + amount);
        return this.properties.health;
    },
    
    // Complete a task
    completeTask: function(taskId) {
        // Logic for task completion would go here
        console.log(`Task ${taskId} completed`);
        return true;
    },
    
    // Sync player data to server
    syncToServer: function(socket) {
        if (socket && socket.readyState === WebSocket.OPEN) {
            // console.log("syncing to server");
            socket.send(JSON.stringify({
                type: 'player_update',
                player: {
                    id: this.properties.id,
                    x: this.properties.x,
                    y: this.properties.y,
                    width: this.properties.width,
                    height: this.properties.height,
                    direction: this.properties.direction,
                    frameX: this.properties.frameX,
                    isMoving: this.properties.isMoving,
                    health: this.properties.health,
                    role: this.properties.role,
                    isAlive: this.properties.isAlive,
                    deathTime: this.properties.deathTime,
                    deathX: this.properties.deathX,
                    deathY: this.properties.deathY
                }
            }));
        }
    },
    
    // Handle player update from server
    handlePlayerUpdate: function(playerData) {
        // console.log("Handling player update:", playerData);
        
        // Make sure we have valid data with an ID
        if (!playerData || !playerData.id) {
            console.error("Received invalid player data:", playerData);
            return;
        }
        
        // If this is for the local player, ignore
        if (playerData.id === this.properties.id) {
            this.properties.health = playerData.health;
            this.properties.isAlive = playerData.isAlive;
            this.properties.deathTime = playerData.deathTime;
            return;
        }

        
        // console.log("playerData",playerData);
        
        // Ensure required properties
        const updatedPlayer = {
            ...playerData,
            width: playerData.width || PLAYER_WIDTH,
            height: playerData.height || PLAYER_HEIGHT,
            frameX: typeof playerData.frameX === 'number' ? playerData.frameX : 10, // Default to standing frame
            lastUpdated: Date.now()
        };
        
        // Update or add the other player
        if (this.otherPlayers.has(playerData.id)) {
            // Update existing player
            // console.log("Updating existing player:", playerData.id);
            const existingPlayer = this.otherPlayers.get(playerData.id);
            Object.assign(existingPlayer, updatedPlayer);
        } else {
            // Add new player
            console.log("Adding new player:", playerData.id, "at position", updatedPlayer.x, updatedPlayer.y);
            this.otherPlayers.set(playerData.id, updatedPlayer);
        }
        
        // console.log("Current other players count:", this.otherPlayers.size);
        // this.otherPlayers.forEach((player, id) => {
        //     console.log(`- Player ${id} at position ${player.x},${player.y}`);
        // });
    },
    
    // Remove disconnected player
    removePlayer: function(playerId) {
        if (this.otherPlayers.has(playerId)) {
            this.otherPlayers.delete(playerId);
            return true;
        }
        return false;
    },
    
    // Try to kill another player
    tryKill: function() {
        // Check if player is impostor
        // if (this.properties.role !== 'impostor') {
        //     console.log('Only impostors can kill');
        //     return false;
        // }

        if(this.properties.lastKillTime && Date.now() - this.properties.lastKillTime < 30000){
            alert('You must wait 30 seconds before you can kill again');
            return false;
        }
        
        // Check if 1 minute has passed since game start
        if (StarScrap && StarScrap.state && StarScrap.state.gameStartTime) {
            const gameTimeElapsed = Date.now() - StarScrap.state.gameStartTime;
            if (gameTimeElapsed < 60000) { // 60000ms = 1 minute
                alert('Killing is not available yet. Wait for 1 minute after game start.');
                return false;
            }
        }
        
        // Check for nearby players to kill
        let nearestVictim = null;
        let nearestDistance = 100; // Maximum kill distance (100 pixels)
        
        const killerX = this.properties.x + this.properties.width / 2;
        const killerY = this.properties.y + this.properties.height / 2;
        
        this.otherPlayers.forEach((player, id) => {
            // Skip if player is already dead
            if (!player.isAlive) return;
            
            const victimX = player.x + player.width / 2;
            const victimY = player.y + player.height / 2;
            
            const distance = Math.sqrt(
                Math.pow(killerX - victimX, 2) + 
                Math.pow(killerY - victimY, 2)
            );
            
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestVictim = { id, player };
            }
        });
        
        if (nearestVictim) {
            // Perform the kill
            console.log(`Killing player ${nearestVictim.id}`);
            
            // Update the player's state locally
            nearestVictim.player.isAlive = false;
            nearestVictim.player.deathTime = Date.now();
            nearestVictim.player.deathX = nearestVictim.player.x;
            nearestVictim.player.deathY = nearestVictim.player.y;
            
            // Record the kill time
            this.properties.lastKillTime = Date.now();
            
            // Send kill event to server
            if (StarScrap && StarScrap.socket && StarScrap.socket.readyState === WebSocket.OPEN) {
                StarScrap.socket.send(JSON.stringify({
                    type: 'player_kill',
                    victim: nearestVictim.id,
                    killerId: this.properties.id,
                    x: nearestVictim.player.x,
                    y: nearestVictim.player.y
                }));
            }
            
            return true;
        }
        
        console.log('No players within kill range');
        return false;
    },
    
    // Handle player being killed
    handleBeingKilled: function() {
        this.properties.isAlive = false;
        this.properties.deathTime = Date.now();
        this.properties.deathX = this.properties.x;
        this.properties.deathY = this.properties.y;
        
        // Disable movement
        this.properties.speed = 0;
    }
};
