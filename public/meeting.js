/**
 * StarScrap - Meeting Module
 * Handles emergency meeting functionality: calling, voting, and results
 */

const Meeting = {
    // Meeting state
    state: {
        isMeetingActive: false,
        meetingCaller: null,
        meetingStartTime: null,
        meetingDuration: 30000, // 30 seconds
        votes: new Map(), // playerId -> votedForId
        playersList: [], // List of all players for UI
        votingEnabled: true,
        votingResults: null,
        selectedPlayer: null,
        meetingCenter: {
            x: 1400,
            y: 546,
            radius: 100
        }
    },

    // Initialize meeting module
    init: function() {
        console.log('Meeting module initialized');
        // Create meeting UI container (hidden initially)
        this.createMeetingUI();
    },

    // Check if player is near meeting center
    isNearMeetingCenter: function() {
        if (!Player || !Player.properties) return false;

        const playerX = Player.properties.x;
        const playerY = Player.properties.y;
        const meetingX = this.state.meetingCenter.x;
        const meetingY = this.state.meetingCenter.y;
        const radius = this.state.meetingCenter.radius;

        // Calculate distance from meeting center
        const distance = Math.sqrt(
            Math.pow(playerX - meetingX, 2) + 
            Math.pow(playerY - meetingY, 2)
        );

        return distance <= radius;
    },

    // Call a meeting
    callMeeting: function() {
        // Only living players can call meetings
        if (!Player.properties.isAlive) {
            alert('Dead players cannot call meetings');
            return false;
        }

        // Check if player is near meeting center
        if (!this.isNearMeetingCenter()) {
            alert('You need to be in the central area to call a meeting');
            return false;
        }

        // Check if meeting is already active
        if (this.state.isMeetingActive) {
            alert('A meeting is already in progress');
            return false;
        }

        // Send meeting request to server
        if (StarScrap.socket && StarScrap.socket.readyState === WebSocket.OPEN) {
            StarScrap.socket.send(JSON.stringify({
                type: 'call_meeting',
                playerId: Player.properties.id
            }));
            console.log('Meeting request sent to server');
            return true;
        } else {
            console.error('WebSocket not connected, cannot call meeting');
            return false;
        }
    },

    // Start meeting based on server message
    startMeeting: function(data) {
        console.log('Starting meeting called by:', data.callerId);
        
        // Update meeting state
        this.state.isMeetingActive = true;
        this.state.meetingCaller = data.callerId;
        this.state.meetingStartTime = Date.now();
        this.state.votes = new Map();
        this.state.votingEnabled = true;
        this.state.votingResults = null;
        this.state.selectedPlayer = null;
        
        // Disable player controls
        StarScrap.disablePlayerControls();
        
        // Show meeting UI
        this.showMeetingUI(data);
        
        // Start timer
        this.startMeetingTimer(data.duration);
    },

    // Create the meeting UI elements
    createMeetingUI: function() {
        const meetingContainer = document.createElement('div');
        meetingContainer.id = 'meeting-container';
        meetingContainer.style.display = 'none';
        meetingContainer.style.position = 'fixed';
        meetingContainer.style.top = '0';
        meetingContainer.style.left = '0';
        meetingContainer.style.width = '100%';
        meetingContainer.style.height = '100%';
        meetingContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        meetingContainer.style.zIndex = '1000';
        meetingContainer.style.display = 'none';
        meetingContainer.style.flexDirection = 'column';
        meetingContainer.style.alignItems = 'center';
        meetingContainer.style.justifyContent = 'center';
        meetingContainer.style.fontFamily = 'Arial, sans-serif';
        meetingContainer.style.color = 'white';
        
        // Create header
        const header = document.createElement('h2');
        header.id = 'meeting-header';
        header.textContent = 'EMERGENCY MEETING';
        header.style.color = 'red';
        header.style.marginBottom = '10px';
        
        // Create timer
        const timer = document.createElement('div');
        timer.id = 'meeting-timer';
        timer.textContent = '30';
        timer.style.fontSize = '24px';
        timer.style.marginBottom = '20px';
        
        // Create caller info
        const callerInfo = document.createElement('div');
        callerInfo.id = 'meeting-caller';
        callerInfo.textContent = 'Meeting called by:';
        callerInfo.style.marginBottom = '20px';
        
        // Create players list container
        const playersContainer = document.createElement('div');
        playersContainer.id = 'meeting-players';
        playersContainer.style.display = 'flex';
        playersContainer.style.flexWrap = 'wrap';
        playersContainer.style.justifyContent = 'center';
        playersContainer.style.width = '80%';
        playersContainer.style.maxHeight = '60%';
        playersContainer.style.overflow = 'auto';
        playersContainer.style.marginBottom = '20px';
        
        // Create vote skip button
        const skipButton = document.createElement('button');
        skipButton.id = 'meeting-skip';
        skipButton.textContent = 'Skip Vote';
        skipButton.style.padding = '10px 20px';
        skipButton.style.backgroundColor = '#333';
        skipButton.style.color = 'white';
        skipButton.style.border = '2px solid #666';
        skipButton.style.borderRadius = '5px';
        skipButton.style.cursor = 'pointer';
        skipButton.onclick = () => this.voteFor('skip');
        
        // Create results container (hidden until voting ends)
        const resultsContainer = document.createElement('div');
        resultsContainer.id = 'meeting-results';
        resultsContainer.style.display = 'none';
        resultsContainer.style.marginTop = '20px';
        resultsContainer.style.fontSize = '20px';
        resultsContainer.style.fontWeight = 'bold';
        
        // Add elements to meeting container
        meetingContainer.appendChild(header);
        meetingContainer.appendChild(timer);
        meetingContainer.appendChild(callerInfo);
        meetingContainer.appendChild(playersContainer);
        meetingContainer.appendChild(skipButton);
        meetingContainer.appendChild(resultsContainer);
        
        // Add to document
        document.body.appendChild(meetingContainer);
    },

    // Show the meeting UI with updated player list
    showMeetingUI: function(data) {
        // Update player list from data
        this.state.playersList = data.players || [];

        // Get UI elements
        const meetingContainer = document.getElementById('meeting-container');
        const callerInfo = document.getElementById('meeting-caller');
        const playersContainer = document.getElementById('meeting-players');
        const resultsContainer = document.getElementById('meeting-results');
        
        // Clear previous results
        if (resultsContainer) resultsContainer.style.display = 'none';
        
        // Update caller info
        if (callerInfo) {
            const callerName = this.state.meetingCaller;
            callerInfo.textContent = `Meeting called by: ${callerName}`;
        }
        
        // Clear and populate players list
        if (playersContainer) {
            playersContainer.innerHTML = '';
            
            this.state.playersList.forEach(player => {
                // Skip dead players in voting list
                if (!player.isAlive) return;
                
                const playerButton = document.createElement('div');
                playerButton.classList.add('player-vote-button');
                playerButton.dataset.playerId = player.id;
                playerButton.style.width = '150px';
                playerButton.style.height = '100px';
                playerButton.style.margin = '10px';
                playerButton.style.padding = '10px';
                playerButton.style.backgroundColor = player.role === 'impostor' && !Player.properties.isAlive ? '#aa0000' : '#444';
                playerButton.style.border = '2px solid #666';
                playerButton.style.borderRadius = '5px';
                playerButton.style.display = 'flex';
                playerButton.style.flexDirection = 'column';
                playerButton.style.alignItems = 'center';
                playerButton.style.justifyContent = 'center';
                playerButton.style.cursor = 'pointer';
                
                // Player name
                const playerName = document.createElement('div');
                playerName.textContent = player.id.substring(24, 30);
                playerName.style.fontWeight = 'bold';
                playerName.style.marginBottom = '5px';
                
                // Vote count (initially 0)
                const voteCount = document.createElement('div');
                voteCount.classList.add('vote-count');
                voteCount.textContent = '0 votes';
                
                // Add event listener for voting
                playerButton.onclick = () => this.voteFor(player.id);
                
                // Add elements to player button
                playerButton.appendChild(playerName);
                playerButton.appendChild(voteCount);
                
                // Add to container
                playersContainer.appendChild(playerButton);
            });
        }
        
        // Show the meeting UI
        if (meetingContainer) meetingContainer.style.display = 'flex';
    },

    // Start the meeting timer
    startMeetingTimer: function(duration) {
        const timerDisplay = document.getElementById('meeting-timer');
        const timerDuration = duration || this.state.meetingDuration;
        const endTime = Date.now() + timerDuration;
        
        // Update timer display every second
        const timerInterval = setInterval(() => {
            const timeLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
            
            if (timerDisplay) {
                timerDisplay.textContent = timeLeft;
                
                // Change color as time runs out
                if (timeLeft <= 5) {
                    timerDisplay.style.color = 'red';
                }
            }
            
            // End the timer when time runs out
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                
                // Disable voting after timer ends
                this.state.votingEnabled = false;
                
                // Server will send meeting_results message
            }
        }, 1000);
    },

    // Vote for a player
    voteFor: function(targetId) {
        // Can't vote if voting is disabled
        if (!this.state.votingEnabled) {
            alert('Voting has ended');
            return;
        }
        
        // Can't vote if dead
        if (!Player.properties.isAlive) {
            alert('Dead players cannot vote');
            return;
        }
        
        // Update selected player
        this.state.selectedPlayer = targetId;
        
        // Highlight selected player in UI
        document.querySelectorAll('.player-vote-button').forEach(button => {
            if (button.dataset.playerId === targetId) {
                button.style.border = '2px solid yellow';
            } else {
                button.style.border = '2px solid #666';
            }
        });
        
        // Highlight skip button if selected
        const skipButton = document.getElementById('meeting-skip');
        if (skipButton) {
            skipButton.style.border = targetId === 'skip' ? '2px solid yellow' : '2px solid #666';
        }
        
        // Send vote to server
        if (StarScrap.socket && StarScrap.socket.readyState === WebSocket.OPEN) {
            StarScrap.socket.send(JSON.stringify({
                type: 'player_vote',
                playerId: Player.properties.id,
                voteFor: targetId
            }));
            console.log(`Voted for: ${targetId}`);
        }
    },

    // Update votes based on server message
    updateVotes: function(voteData) {
        this.state.votes = new Map(Object.entries(voteData.votes));
        
        // Update vote counts in UI
        this.updateVoteCounts();
    },

    // Update vote counts in the UI
    updateVoteCounts: function() {
        // Count votes for each player
        const voteCounts = new Map();
        let skipCount = 0;
        
        this.state.votes.forEach((targetId) => {
            if (targetId === 'skip') {
                skipCount++;
            } else {
                voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + 1);
            }
        });
        
        // Update player vote counts
        document.querySelectorAll('.player-vote-button').forEach(button => {
            const playerId = button.dataset.playerId;
            const voteCount = button.querySelector('.vote-count');
            
            if (voteCount) {
                const count = voteCounts.get(playerId) || 0;
                voteCount.textContent = `${count} vote${count !== 1 ? 's' : ''}`;
            }
        });
        
        // Update skip vote count
        const skipButton = document.getElementById('meeting-skip');
        if (skipButton) {
            skipButton.textContent = `Skip Vote (${skipCount})`;
        }
    },

    // Show meeting results
    showResults: function(results) {
        this.state.votingResults = results;
        
        // Get results container
        const resultsContainer = document.getElementById('meeting-results');
        if (!resultsContainer) return;
        
        // Display appropriate message based on results
        if (results.ejected === 'skip' || !results.ejected) {
            resultsContainer.textContent = 'No one was ejected.';
            resultsContainer.style.color = 'yellow';
        } else {
            // Find ejected player's name
            const ejectedPlayer = this.state.playersList.find(p => p.id === results.ejected);
            const ejectedName = ejectedPlayer ? ejectedPlayer.id.substring(24, 30) : 'Unknown';
            
            resultsContainer.textContent = `${ejectedName} was ejected!`;
            resultsContainer.style.color = 'red';
        }
        
        // Show results
        resultsContainer.style.display = 'block';
        
        // Automatically end meeting after showing results for a few seconds
        setTimeout(() => this.endMeeting(), 5000);
    },

    // End the meeting
    endMeeting: function() {
        // Hide meeting UI
        const meetingContainer = document.getElementById('meeting-container');
        if (meetingContainer) meetingContainer.style.display = 'none';
        
        // Update meeting state
        this.state.isMeetingActive = false;
        this.state.votingEnabled = false;
        
        // Re-enable player controls
        StarScrap.enablePlayerControls();
    },

    // Reset all players to start positions
    teleportPlayersToStart: function() {
        // Reset local player position
        if (Player && Player.properties) {
            Player.properties.x = PLAYER_START_X;
            Player.properties.y = PLAYER_START_Y;
            
            // Sync to server
            if (StarScrap.socket && StarScrap.socket.readyState === WebSocket.OPEN) {
                Player.syncToServer(StarScrap.socket);
            }
        }
    }
};