/**
 * StarScrap - Tasks Module
 * Handles task functionality: rendering, interaction, completion
 */

const Tasks = {
    // Task definitions - positions and types
    definitions: [
        {
            id: 'wire1',
            type: 'wire',
            x: 764,
            y: 638,
            width: 100,
            height: 100,
            name: 'Fix Wires #1',
            isStunDeployed: false,
            completed: false,
            description: 'Connect the colored wires to fix the electrical system.'
        },
        {
            id: 'wire2',
            type: 'wire',
            x: 1500,
            y: 700,
            width: 100,
            height: 100,
            name: 'Fix Wires #2',
            isStunDeployed: false,
            completed: false,
            description: 'Connect the colored wires to fix the electrical system.'
        },
        {
            id: 'crate1',
            type: 'crate',
            x: 874,
            y: 1004,
            width: 60,
            height: 60,
            name: 'Open Crate',
            isStunDeployed: false,
            completed: false,
            description: 'Search the crate for supplies.'
        },
        {
            id: 'engine1',
            type: 'engine',
            x: 432,
            y: 150,
            width: 120,
            height: 120,
            name: 'Fix Engine',
            isStunDeployed: false,
            completed: false,
            description: 'Repair the engine by aligning the components.'
        },{
            id: 'engine2',
            type: 'engine',
            x: 504,
            y: 1030,
            width: 120,
            height: 120,
            name: 'Fix Engine',
            isStunDeployed: false,
            completed: false,
            description: 'Repair the engine by aligning the components.'
        },
        {
            id: 'oxygen1',
            type: 'oxygen',
            x: 268,
            y: 518,
            width: 80,
            height: 80,
            name: 'Restore Oxygen',
            isStunDeployed: false,
            completed: false,
            description: 'Enter the correct code to restore oxygen flow.'
        },
        {
            id: 'lecture1',
            type: 'crate',
            x: 630,
            y: 530,
            width: 100,
            height: 100,
            name: 'Watch the lecture',
            isStunDeployed: false,
            completed: false,
            description: 'Watch the COMP4021 lecture to get the knowledge.'
        },
        {
            id: 'bodycheck1',
            type: 'crate',
            x: 850,
            y: 238,
            width: 100,
            height: 100,
            name: 'Body Check',
            isStunDeployed: false,
            completed: false,
            description: 'Check the body of the ship to find the key.'
        },
        {
            id: 'swipe1',
            type: 'swipe',
            x: 2020,
            y: 516,
            width: 100,
            height: 100,
            name: 'Swipe Card',
            isStunDeployed: false,
            completed: false,
            description: 'Swipe the card to unlock the ship.'
        },{
            id: 'biometric_lock',
            type: 'swipe',
            x: 1006,
            y: 794,
            width: 100,
            height: 100,
            name: 'Biometric Lock',
            isStunDeployed: false,
            completed: false,
            description: 'Swipe the card to unlock the ship.'
        }
    ],
    
    // Current task state
    state: {
        activeTaskId: null,
        activeTaskUI: null,
        taskProgress: 0,
        totalTasks: 0,
        wireTaskActive: false,
        wireConnections: [],
        wireColors: ['red', 'blue', 'green', 'yellow'],
        wireStartPositions: [],
        wireEndPositions: []
    },
    
    // Initialize tasks
    init: function() {
        // Count total tasks (including crates)
        this.state.totalTasks = this.definitions.length;
        this.updateTaskProgressUI();
        
        // Send total task count to server
        if (StarScrap && StarScrap.socket && StarScrap.socket.readyState === WebSocket.OPEN) {
            StarScrap.socket.send(JSON.stringify({
                type: 'set_total_tasks',
                count: this.state.totalTasks
            }));
        }
        
        console.log('Tasks initialized. Total tasks:', this.state.totalTasks);
    },
    
    // Render task markers on the map
    renderTasks: function(ctx, cameraX, cameraY) {
        this.definitions.forEach(task => {
            // Only render if within camera view (with some padding)
            if (this.isTaskVisible(task, cameraX, cameraY, ctx.canvas.width, ctx.canvas.height)) {
                this.renderTaskMarker(ctx, task, cameraX, cameraY);
            }
        });
    },
    
    // Check if task is within camera view
    isTaskVisible: function(task, cameraX, cameraY, viewWidth, viewHeight) {
        return (
            task.x + task.width > cameraX &&
            task.x < cameraX + viewWidth &&
            task.y + task.height > cameraY &&
            task.y < cameraY + viewHeight
        );
    },
    
    // Render a single task marker
    renderTaskMarker: function(ctx, task, cameraX, cameraY) {
        const screenX = task.x - cameraX;
        const screenY = task.y - cameraY;
        
        ctx.save();
        
        // Different rendering based on task type
        if (task.completed) {
            // Completed task marker
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.0)';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.0)';
        } else if (task.type === 'wire') {
            // Wire task marker
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)';
            ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        } else if (task.type === 'crate') {
            // Crate marker
            ctx.strokeStyle = 'rgba(0, 0, 255, 0.7)';
            ctx.fillStyle = 'rgba(0, 0, 255, 0.3)';
        } else {
            // Other task types
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        }
        
        // Draw task marker
        ctx.fillRect(screenX, screenY, task.width, task.height);
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX, screenY, task.width, task.height);
        
        // If this task has a trap and player is impostor, show special indicator
        if (task.isStunDeployed && Player && Player.properties && Player.properties.role === 'impostor') {
            // Draw trap indicator (red pulsing border)
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
            ctx.lineWidth = 4;
            ctx.strokeRect(screenX, screenY, task.width, task.height);
            
            // Draw trap icon
            ctx.fillStyle = 'red';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText('⚡', screenX + task.width / 2, screenY - 20);
        }
        
        // Add task icon/symbol
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let icon = '?';
        switch (task.id) {
            case 'wire1': icon = '⚡'; break;
            case 'wire2': icon = '⚡'; break;
            case 'crate1': icon = '📦'; break;
            case 'engine1': icon = '⚙️'; break;
            case 'engine2': icon = '⚙️'; break;
            case 'oxygen1': icon = '💨'; break;
            case 'lecture1': icon = '📺'; break;
            case 'bodycheck1': icon = '💊'; break;
            case 'swipe1': icon = '💳'; break;
            case 'biometric_lock': icon = '🔑'; break;
        }
        
        ctx.fillText(icon, screenX + task.width / 2, screenY + task.height / 2);
        
        // If player is close, show "Press E" prompt
        if (this.isPlayerNearTask(task)) {
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.fillText('Press E', screenX + task.width / 2, screenY - 10);
        }
        
        ctx.restore();
    },
    
    // Check if player is close enough to interact with task
    isPlayerNearTask: function(task) {
        if (!Player || !Player.properties) return false;
        
        const player = Player.properties;
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        const taskCenterX = task.x + task.width / 2;
        const taskCenterY = task.y + task.height / 2;
        
        const distance = Math.sqrt(
            Math.pow(playerCenterX - taskCenterX, 2) + 
            Math.pow(playerCenterY - taskCenterY, 2)
        );
        
        // Interaction range: 100 pixels
        return distance < 100;
    },
    
    // Find task near player that can be interacted with
    findNearbyTask: function() {
        return this.definitions.find(task => this.isPlayerNearTask(task) && !task.completed);
    },
    
    // Player attempts to interact with a nearby task
    interactWithNearbyTask: function() {
        // Check if player is impostor - impostors cannot complete tasks
        if (Player && Player.properties && Player.properties.role === 'impostor') {
            StarScrap.showGameMessage('Impostors cannot complete tasks!','error');
            return false;
        }

        const task = this.findNearbyTask();
        if (!task) return false;
        
        console.log('Interacting with task:', task.name);
        this.openTaskUI(task);
        return true;
    },
    
    // Open task UI
    openTaskUI: function(task) {
        this.state.activeTaskId = task.id;
        
        // Create task UI container if it doesn't exist
        if (!document.getElementById('task-ui-container')) {
            const container = document.createElement('div');
            container.id = 'task-ui-container';
            container.style.position = 'absolute';
            container.style.top = '50%';
            container.style.left = '50%';
            container.style.transform = 'translate(-50%, -50%)';
            container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            container.style.padding = '20px';
            container.style.borderRadius = '10px';
            container.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.3)';
            container.style.zIndex = '1000';
            container.style.minWidth = '600px';
            container.style.maxWidth = '800px';
            
            document.body.appendChild(container);
        }
        
        const container = document.getElementById('task-ui-container');
        container.innerHTML = ''; // Clear previous content
        
        // Create task header
        const header = document.createElement('div');
        header.style.color = 'white';
        header.style.fontSize = '24px';
        header.style.textAlign = 'center';
        header.style.marginBottom = '15px';
        header.style.borderBottom = '1px solid #555';
        header.style.paddingBottom = '10px';
        header.innerText = task.name;
        container.appendChild(header);
        
        // Create task description
        const description = document.createElement('div');
        description.style.color = '#aaa';
        description.style.fontSize = '16px';
        description.style.marginBottom = '20px';
        description.style.textAlign = 'center';
        description.innerText = task.description;
        container.appendChild(description);
        
        // Create task-specific UI
        if (task.type === 'wire') {
            this.createWireTaskUI(container, task);
        } else if (task.type === 'oxygen') {
            this.createOxygenTaskUI(container, task);
        } else if (task.type === 'engine') {
            this.createEngineTaskUI(container, task);
        } else if (task.type === 'crate') {
            this.createCrateTaskUI(container, task);
        } else if (task.type === 'swipe') {
            this.createSwipeTaskUI(container, task);
        } else {
            // Generic task UI for other types
            const genericTask = document.createElement('div');
            genericTask.style.backgroundColor = '#333';
            genericTask.style.padding = '40px';
            genericTask.style.color = 'white';
            genericTask.style.textAlign = 'center';
            genericTask.style.borderRadius = '8px';
            genericTask.innerText = 'Press the button to complete this task.';
            
            const button = document.createElement('button');
            button.style.display = 'block';
            button.style.margin = '20px auto 0';
            button.style.padding = '10px 20px';
            button.style.backgroundColor = '#4CAF50';
            button.style.border = 'none';
            button.style.borderRadius = '5px';
            button.style.color = 'white';
            button.style.fontSize = '16px';
            button.style.cursor = 'pointer';
            button.innerText = 'Complete Task';
            button.onclick = () => this.completeActiveTask();
            
            genericTask.appendChild(button);
            container.appendChild(genericTask);
        }
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '10px';
        closeButton.style.backgroundColor = 'transparent';
        closeButton.style.border = 'none';
        closeButton.style.color = 'white';
        closeButton.style.fontSize = '20px';
        closeButton.style.cursor = 'pointer';
        closeButton.innerText = '✕';
        closeButton.onclick = () => this.closeTaskUI();
        container.appendChild(closeButton);
        
        this.state.activeTaskUI = container;
        
        // Block game input while task UI is open
        if (window.StarScrap) {
            window.StarScrap.setTaskUIActive(true);
        }
    },
    
    // Close the active task UI
    closeTaskUI: function() {
        if (this.state.activeTaskUI) {
            document.body.removeChild(this.state.activeTaskUI);
            this.state.activeTaskUI = null;
            this.state.activeTaskId = null;
        }
        
        // Unblock game input
        if (window.StarScrap) {
            window.StarScrap.setTaskUIActive(false);
        }
    },
    
    // Create wire fixing task UI
    createWireTaskUI: function(container, task) {
        const wireContainer = document.createElement('div');
        wireContainer.style.display = 'flex';
        wireContainer.style.justifyContent = 'space-between';
        wireContainer.style.width = '100%';
        wireContainer.style.height = '200px';
        wireContainer.style.backgroundColor = '#222';
        wireContainer.style.borderRadius = '5px';
        wireContainer.style.padding = '10px';
        wireContainer.style.position = 'relative';
        container.appendChild(wireContainer);
        
        // Create left side wires (starting points)
        const leftSide = document.createElement('div');
        leftSide.style.display = 'flex';
        leftSide.style.flexDirection = 'column';
        leftSide.style.justifyContent = 'space-between';
        leftSide.style.height = '100%';
        wireContainer.appendChild(leftSide);
        
        // Create right side connectors (ending points)
        const rightSide = document.createElement('div');
        rightSide.style.display = 'flex';
        rightSide.style.flexDirection = 'column';
        rightSide.style.justifyContent = 'space-between';
        rightSide.style.height = '100%';
        wireContainer.appendChild(rightSide);
        
        // Create SVG for wire connections
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.pointerEvents = 'none';
        wireContainer.appendChild(svg);
        
        // Reset wire connections
        this.state.wireConnections = [];
        this.state.wireStartPositions = [];
        this.state.wireEndPositions = [];
        
        // Create wires with random colors
        const wireColors = [...this.state.wireColors];
        const shuffledColors = [...wireColors].sort(() => Math.random() - 0.5);
        
        const self = this; // Store reference to 'this' for event handlers
        
        wireColors.forEach((color, index) => {
            // Left side wire connector
            const leftWire = document.createElement('div');
            leftWire.className = 'wire-start';
            leftWire.dataset.color = color;
            leftWire.dataset.index = index;
            leftWire.style.width = '30px';
            leftWire.style.height = '30px';
            leftWire.style.backgroundColor = color;
            leftWire.style.borderRadius = '50%';
            leftWire.style.cursor = 'pointer';
            leftWire.style.border = '2px solid #444';
            
            // Add mouse/touch event listeners directly with function
            leftWire.addEventListener('mousedown', function(e) {
                self.startWireConnection(e);
            });
            leftWire.addEventListener('touchstart', function(e) {
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousedown', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                self.startWireConnection(mouseEvent);
                e.preventDefault(); // Prevent scrolling
            });
            
            leftSide.appendChild(leftWire);
            this.state.wireStartPositions.push(leftWire);
            
            // Right side wire connector (shuffled color order)
            const rightWire = document.createElement('div');
            rightWire.className = 'wire-end';
            rightWire.dataset.color = shuffledColors[index];
            rightWire.dataset.index = index;
            rightWire.style.width = '30px';
            rightWire.style.height = '30px';
            rightWire.style.backgroundColor = shuffledColors[index];
            rightWire.style.borderRadius = '50%';
            rightWire.style.border = '2px solid #444';
            rightSide.appendChild(rightWire);
            
            this.state.wireEndPositions.push(rightWire);
        });
        
        // Add global event listeners for wire dragging
        this.wireMouseMoveHandler = function(e) {
            self.updateWireConnection(e);
        };
        
        this.wireMouseUpHandler = function(e) {
            self.endWireConnection(e);
        };
        
        this.wireTouchMoveHandler = function(e) {
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            self.updateWireConnection(mouseEvent);
            e.preventDefault();
        };
        
        this.wireTouchEndHandler = function(e) {
            let touch;
            if (e.changedTouches && e.changedTouches.length > 0) {
                touch = e.changedTouches[0];
            } else {
                touch = { clientX: 0, clientY: 0 };
            }
            
            const mouseEvent = new MouseEvent('mouseup', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            self.endWireConnection(mouseEvent);
            e.preventDefault();
        };
        
        // Add the event listeners
        document.addEventListener('mousemove', this.wireMouseMoveHandler);
        document.addEventListener('mouseup', this.wireMouseUpHandler);
        document.addEventListener('touchmove', this.wireTouchMoveHandler, { passive: false });
        document.addEventListener('touchend', this.wireTouchEndHandler, { passive: false });
        
        this.state.wireTaskActive = true;
        
        // Add instructions
        const instructions = document.createElement('div');
        instructions.textContent = 'Drag wires from left to matching colors on right';
        instructions.style.position = 'absolute';
        instructions.style.bottom = '-30px';
        instructions.style.left = '0';
        instructions.style.width = '100%';
        instructions.style.textAlign = 'center';
        instructions.style.color = '#aaa';
        instructions.style.fontSize = '12px';
        wireContainer.appendChild(instructions);
    },
    
    // Start wire connection
    startWireConnection: function(event) {
        if (!this.state.wireTaskActive) return;
        
        const wireStart = event.target;
        if (!wireStart.classList.contains('wire-start')) return;
        
        // Get SVG element relative position
        const svg = document.querySelector('#task-ui-container svg');
        const svgRect = svg.getBoundingClientRect();
        
        const color = wireStart.dataset.color;
        const index = parseInt(wireStart.dataset.index);
        const wireRect = wireStart.getBoundingClientRect();
        
        // Calculate wire center position relative to SVG
        const startX = wireRect.left + wireRect.width/2 - svgRect.left;
        const startY = wireRect.top + wireRect.height/2 - svgRect.top;
        
        // Store active wire data
        this.state.activeWire = {
            color: color,
            index: index,
            startElement: wireStart,
            startX: startX,
            startY: startY,
            endX: event.clientX - svgRect.left,
            endY: event.clientY - svgRect.top,
            svgRect: svgRect,
            line: null
        };
        
        // Create SVG line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', startX);
        line.setAttribute('y1', startY);
        line.setAttribute('x2', event.clientX - svgRect.left);
        line.setAttribute('y2', event.clientY - svgRect.top);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', '3');
        svg.appendChild(line);
        
        this.state.activeWire.line = line;
        
        console.log("Started wire connection", color, index);
    },
    
    // Update wire connection during drag
    updateWireConnection: function(event) {
        if (!this.state.wireTaskActive || !this.state.activeWire) return;
        
        const svgRect = this.state.activeWire.svgRect;
        
        // Update line end position relative to SVG
        const endX = event.clientX - svgRect.left;
        const endY = event.clientY - svgRect.top;
        
        this.state.activeWire.line.setAttribute('x2', endX);
        this.state.activeWire.line.setAttribute('y2', endY);
        this.state.activeWire.endX = endX;
        this.state.activeWire.endY = endY;
    },
    
    // End wire connection
    endWireConnection: function(event) {
        if (!this.state.wireTaskActive || !this.state.activeWire) return;
        
        const svgRect = this.state.activeWire.svgRect;
        
        // Check if wire is dropped on a connector
        const endConnectors = document.querySelectorAll('.wire-end');
        let connected = false;
        
        endConnectors.forEach(connector => {
            const rect = connector.getBoundingClientRect();
            
            // Check if mouse is over connector
            if (
                event.clientX >= rect.left && 
                event.clientX <= rect.right && 
                event.clientY >= rect.top && 
                event.clientY <= rect.bottom
            ) {
                // Connect to this end point
                const connectorColor = connector.dataset.color;
                const connectorIndex = parseInt(connector.dataset.index);
                
                // Calculate connector center position relative to SVG
                const endX = rect.left + rect.width/2 - svgRect.left;
                const endY = rect.top + rect.height/2 - svgRect.top;
                
                // Update line end position to center of connector
                this.state.activeWire.line.setAttribute('x2', endX);
                this.state.activeWire.line.setAttribute('y2', endY);
                
                // Store connection
                this.state.wireConnections.push({
                    startIndex: this.state.activeWire.index,
                    endIndex: connectorIndex,
                    startColor: this.state.activeWire.color,
                    endColor: connectorColor,
                    line: this.state.activeWire.line,
                    correct: this.state.activeWire.color === connectorColor
                });
                
                connected = true;
                
                console.log("Connected wire", this.state.activeWire.color, "to", connectorColor, 
                           "Correct:", this.state.activeWire.color === connectorColor);
                
                // Check if task is complete
                this.checkWireTaskCompletion();
            }
        });
        
        // If not connected to any endpoint, remove the line
        if (!connected && this.state.activeWire.line) {
            this.state.activeWire.line.remove();
        }
        
        this.state.activeWire = null;
    },
    
    // Check if wire task is completed successfully
    checkWireTaskCompletion: function() {
        // Check if all wires are connected correctly
        const allConnected = this.state.wireStartPositions.every((startWire, index) => {
            return this.state.wireConnections.some(conn => 
                conn.startIndex === index && conn.correct
            );
        });
        
        if (allConnected) {
            console.log('Wire task completed!');
            setTimeout(() => {
                this.completeActiveTask();
            }, 500);
        }
    },
    
    // Create placeholder for crate task
    createCrateTaskUI: function(container, task) {
        const crateContainer = document.createElement('div');
        crateContainer.style.backgroundColor = '#333';
        crateContainer.style.padding = '20px';
        crateContainer.style.borderRadius = '8px';
        crateContainer.style.color = 'white';
        crateContainer.style.textAlign = 'center';
        
        // Task title and description
        let taskTitle = '';
        if (task.id === 'crate1') {
            taskTitle = 'Searching crate...';
        } else if (task.id === 'bodycheck1') {
            taskTitle = 'Scanning body...';
        } else if (task.id === 'lecture1') {
            taskTitle = 'Watching lecture...';
        }
        
        const titleElement = document.createElement('div');
        titleElement.textContent = taskTitle;
        titleElement.style.fontSize = '18px';
        titleElement.style.marginBottom = '20px';
        crateContainer.appendChild(titleElement);
        
        // Search button
        const searchButton = document.createElement('button');
        searchButton.textContent = 'Start Search';
        searchButton.style.padding = '10px 20px';
        searchButton.style.backgroundColor = '#4CAF50';
        searchButton.style.border = 'none';
        searchButton.style.borderRadius = '5px';
        searchButton.style.color = 'white';
        searchButton.style.fontSize = '16px';
        searchButton.style.cursor = 'pointer';
        searchButton.style.marginBottom = '20px';
        
        // Progress container (initially hidden)
        const progressContainer = document.createElement('div');
        progressContainer.style.display = 'none';
        progressContainer.style.width = '100%';
        progressContainer.style.marginTop = '15px';
        
        // Progress bar background
        const progressBackground = document.createElement('div');
        progressBackground.style.width = '100%';
        progressBackground.style.backgroundColor = '#444';
        progressBackground.style.height = '20px';
        progressBackground.style.borderRadius = '10px';
        progressBackground.style.overflow = 'hidden';
        progressContainer.appendChild(progressBackground);
        
        // Progress bar fill
        const progressFill = document.createElement('div');
        progressFill.style.width = '0%';
        progressFill.style.backgroundColor = '#4CAF50';
        progressFill.style.height = '100%';
        progressFill.style.transition = 'width 0.1s linear';
        progressBackground.appendChild(progressFill);
        
        // Progress status text
        const progressStatus = document.createElement('div');
        progressStatus.textContent = 'Searching...';
        progressStatus.style.marginTop = '10px';
        progressStatus.style.fontSize = '14px';
        progressStatus.style.color = '#aaa';
        progressContainer.appendChild(progressStatus);
        
        searchButton.onclick = () => {
            // Hide search button
            searchButton.style.display = 'none';
            
            // Show progress container
            progressContainer.style.display = 'block';
            
            // Setup a more realistic search process
            let progress = 0;
            const searchInterval = setInterval(() => {
                if(task.id === 'lecture1') {
                    progress += (Math.random() * 1 < 0.5) ? 5 : -2;
                } else {
                    progress += 5; // 5% increment
                }
                progressFill.style.width = `${progress}%`;
                
                if (progress < 30) {
                    progressStatus.textContent = 'Scanning contents...';
                } else if (progress < 60) {
                    progressStatus.textContent = 'Analyzing items...';
                } else if (progress < 90) {
                    progressStatus.textContent = 'Gathering resources...';
                } else {
                    progressStatus.textContent = 'Search complete!';
                }
                
                // When progress reaches 100%, clear interval and complete task
                if (progress >= 100) {
                    clearInterval(searchInterval);
                    setTimeout(() => {
                        this.completeActiveTask();
                    }, 500); // Short delay after reaching 100%
                }
            }, 150); // Update every 150ms (total time ~3 seconds)
        };
        
        crateContainer.appendChild(searchButton);
        crateContainer.appendChild(progressContainer);
        container.appendChild(crateContainer);
    },
    
    // Create placeholder for engine task
    createEngineTaskUI: function(container, task) {
        const engineContainer = document.createElement('div');
        engineContainer.style.backgroundColor = '#333';
        engineContainer.style.padding = '20px';
        engineContainer.style.borderRadius = '8px';
        engineContainer.style.color = 'white';
        engineContainer.style.textAlign = 'center';
        
        // Title
        const title = document.createElement('div');
        title.textContent = 'Align the gears to repair the engine';
        title.style.fontSize = '18px';
        title.style.marginBottom = '20px';
        engineContainer.appendChild(title);
        
        // Instructions
        const instructions = document.createElement('div');
        instructions.textContent = 'Click and drag each gear to rotate it. Align all gears with the markers.';
        instructions.style.fontSize = '14px';
        instructions.style.color = '#aaa';
        instructions.style.marginBottom = '20px';
        engineContainer.appendChild(instructions);
        
        // Gears container
        const gearsContainer = document.createElement('div');
        gearsContainer.style.display = 'flex';
        gearsContainer.style.justifyContent = 'space-around';
        gearsContainer.style.alignItems = 'center';
        gearsContainer.style.marginBottom = '20px';
        gearsContainer.style.height = '220px';
        gearsContainer.style.position = 'relative';
        engineContainer.appendChild(gearsContainer);
        
        // Generate target angles for each gear (between 0-360)
        const targetAngles = [
            Math.floor(Math.random() * 12) * 30, // 30-degree increments (0, 30, 60, ...)
            Math.floor(Math.random() * 12) * 30,
            Math.floor(Math.random() * 12) * 30
        ];
        
        // Track current angles and completion status
        const currentAngles = [0, 0, 0];
        const gearCompleted = [false, false, false];
        const angleThreshold = 15; // Threshold in degrees for correct alignment
        
        // Function to check if all gears are correctly aligned
        const checkAllGearsAligned = () => {
            if (gearCompleted[0] && gearCompleted[1] && gearCompleted[2]) {
                // All gears are aligned, complete the task after a short delay
                setTimeout(() => {
                    this.completeActiveTask();
                }, 1000);
            }
        };
        
        // Function to check if a gear is correctly aligned
        const checkGearAlignment = (gearIndex) => {
            const diff = Math.abs(currentAngles[gearIndex] - targetAngles[gearIndex]);
            const isAligned = diff <= angleThreshold || diff >= (360 - angleThreshold);
            
            gearCompleted[gearIndex] = isAligned;
            
            // Update gear marker color
            const marker = document.getElementById(`gear-marker-${gearIndex}`);
            if (marker) {
                marker.style.backgroundColor = isAligned ? '#4CAF50' : '#ff5722';
            }
            
            checkAllGearsAligned();
        };
        
        // Create gears with different sizes
        const gearSizes = [120, 150, 120]; // Diameter in pixels
        const gearColors = ['#777', '#555', '#999']; // Different metal colors
        const gearTeeth = [8, 12, 10]; // Number of gear teeth
        
        for (let i = 0; i < 3; i++) {
            // Gear container
            const gearBox = document.createElement('div');
            gearBox.style.position = 'relative';
            gearBox.style.width = `${gearSizes[i]}px`;
            gearBox.style.height = `${gearSizes[i]}px`;
            gearBox.style.margin = '0 10px';
            gearsContainer.appendChild(gearBox);
            
            // Gear circle
            const gear = document.createElement('div');
            gear.id = `gear-${i}`;
            gear.style.width = '100%';
            gear.style.height = '100%';
            gear.style.borderRadius = '50%';
            gear.style.backgroundColor = gearColors[i];
            gear.style.position = 'relative';
            gear.style.transformOrigin = 'center';
            gear.style.transform = 'rotate(0deg)';
            gear.style.cursor = 'grab';
            gear.style.boxShadow = 'inset 0 0 15px rgba(0, 0, 0, 0.5)';
            gear.style.transition = 'box-shadow 0.3s ease';
            gearBox.appendChild(gear);
            
            // Add gear teeth
            for (let t = 0; t < gearTeeth[i]; t++) {
                const angle = (t / gearTeeth[i]) * 360;
                const tooth = document.createElement('div');
                tooth.style.position = 'absolute';
                tooth.style.width = '20px';
                tooth.style.height = '20px';
                tooth.style.backgroundColor = gearColors[i];
                tooth.style.top = '50%';
                tooth.style.left = '50%';
                tooth.style.marginLeft = '-10px';
                tooth.style.marginTop = '-10px';
                tooth.style.borderRadius = '5px';
                tooth.style.transformOrigin = '10px 10px';
                tooth.style.transform = `rotate(${angle}deg) translateX(${gearSizes[i]/2 - 5}px)`;
                tooth.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.3)';
                gear.appendChild(tooth);
            }
            
            // Add center hole
            const centerHole = document.createElement('div');
            centerHole.style.position = 'absolute';
            centerHole.style.width = '20px';
            centerHole.style.height = '20px';
            centerHole.style.backgroundColor = '#222';
            centerHole.style.borderRadius = '50%';
            centerHole.style.top = '50%';
            centerHole.style.left = '50%';
            centerHole.style.transform = 'translate(-50%, -50%)';
            centerHole.style.boxShadow = 'inset 0 0 5px rgba(0, 0, 0, 0.8)';
            gear.appendChild(centerHole);
            
            // Add rotation marker (handle)
            const rotationMarker = document.createElement('div');
            rotationMarker.style.position = 'absolute';
            rotationMarker.style.width = '8px';
            rotationMarker.style.height = '30px';
            rotationMarker.style.backgroundColor = '#222';
            rotationMarker.style.top = '50%';
            rotationMarker.style.left = '50%';
            rotationMarker.style.transformOrigin = 'center bottom';
            rotationMarker.style.transform = 'translate(-50%, -100%)';
            gear.appendChild(rotationMarker);
            
            // Add target marker outside the gear
            const targetMarker = document.createElement('div');
            targetMarker.id = `gear-marker-${i}`;
            targetMarker.style.position = 'absolute';
            targetMarker.style.width = '12px';
            targetMarker.style.height = '12px';
            targetMarker.style.backgroundColor = '#ff5722'; // Orange until aligned
            targetMarker.style.borderRadius = '50%';
            targetMarker.style.top = '0';
            targetMarker.style.left = '50%';
            targetMarker.style.transform = 'translate(-50%, -15px)';
            gearBox.appendChild(targetMarker);
            
            // Make gear interactive for dragging rotation
            let isDragging = false;
            let startAngle = 0;
            let startRotation = 0;
            
            // Function to calculate angle from center
            const calculateAngle = (element, event) => {
                const rect = element.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const x = event.clientX - centerX;
                const y = event.clientY - centerY;
                return Math.atan2(y, x) * (180 / Math.PI);
            };
            
            // Mouse event handlers
            gear.addEventListener('mousedown', (e) => {
                isDragging = true;
                gear.style.cursor = 'grabbing';
                gear.style.boxShadow = 'inset 0 0 20px rgba(0, 0, 0, 0.7)';
                startAngle = calculateAngle(gear, e);
                startRotation = currentAngles[i];
                e.preventDefault();
            });
            
            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                
                const currentAngle = calculateAngle(gear, e);
                const angleDelta = currentAngle - startAngle;
                
                // Update current angle, normalize to 0-360 range
                let newAngle = (startRotation + angleDelta) % 360;
                if (newAngle < 0) newAngle += 360;
                currentAngles[i] = newAngle;
                
                gear.style.transform = `rotate(${newAngle}deg)`;
                checkGearAlignment(i);
            });
            
            document.addEventListener('mouseup', () => {
                if (!isDragging) return;
                isDragging = false;
                gear.style.cursor = 'grab';
                gear.style.boxShadow = 'inset 0 0 15px rgba(0, 0, 0, 0.5)';
            });
            
            // Set initial rotation to make task interesting
            const initialRotation = Math.floor(Math.random() * 360);
            gear.style.transform = `rotate(${initialRotation}deg)`;
            currentAngles[i] = initialRotation;
        }
        
        // Add debugger info for target angles (helps during development/testing)
        const debugInfo = document.createElement('div');
        debugInfo.style.fontSize = '12px';
        debugInfo.style.color = '#666';
        debugInfo.style.marginTop = '10px';
        debugInfo.textContent = `Target angles: ${targetAngles[0]}°, ${targetAngles[1]}°, ${targetAngles[2]}° (±${angleThreshold}°)`;
        engineContainer.appendChild(debugInfo);
        
        container.appendChild(engineContainer);
    },
    
    // Create the oxygen task UI with paper and numpad
    createOxygenTaskUI: function(container, task) {
        // Task container
        const taskContainer = document.createElement('div');
        taskContainer.style.display = 'flex';
        taskContainer.style.justifyContent = 'space-between';
        taskContainer.style.marginTop = '20px';
        container.appendChild(taskContainer);
        
        // Left side - Paper with code
        const paperSide = document.createElement('div');
        paperSide.style.width = '45%';
        paperSide.style.backgroundColor = '#f5f5dc'; // Beige paper color
        paperSide.style.padding = '20px';
        paperSide.style.borderRadius = '5px';
        paperSide.style.boxShadow = '2px 2px 10px rgba(0, 0, 0, 0.3)';
        paperSide.style.transform = 'rotate(-2deg)';
        paperSide.style.position = 'relative';
        taskContainer.appendChild(paperSide);
        
        // Generate a random 4-digit code
        const correctCode = Math.floor(1000 + Math.random() * 9000).toString();
        
        // Store code in task data (for verification later)
        task.oxygenCode = correctCode;
        
        // Paper title
        const paperTitle = document.createElement('h3');
        paperTitle.style.color = '#333';
        paperTitle.style.textAlign = 'center';
        paperTitle.style.borderBottom = '1px solid #999';
        paperTitle.style.paddingBottom = '10px';
        paperTitle.style.marginTop = '0';
        paperTitle.innerText = 'EMERGENCY OXYGEN CODE';
        paperSide.appendChild(paperTitle);
        
        // Code display
        const codeDisplay = document.createElement('div');
        codeDisplay.style.fontSize = '32px';
        codeDisplay.style.fontFamily = 'monospace';
        codeDisplay.style.color = '#333';
        codeDisplay.style.textAlign = 'center';
        codeDisplay.style.padding = '20px 0';
        codeDisplay.style.letterSpacing = '5px';
        codeDisplay.innerText = correctCode;
        paperSide.appendChild(codeDisplay);
        
        // Paper instructions
        const paperInstr = document.createElement('p');
        paperInstr.style.fontSize = '14px';
        paperInstr.style.color = '#666';
        paperInstr.style.textAlign = 'center';
        paperInstr.innerText = 'Enter this code on the keypad to restore oxygen supply.';
        paperSide.appendChild(paperInstr);
        
        // Paper tape effect
        const tape = document.createElement('div');
        tape.style.width = '80px';
        tape.style.height = '20px';
        tape.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
        tape.style.position = 'absolute';
        tape.style.top = '-10px';
        tape.style.left = '50%';
        tape.style.transform = 'translateX(-50%) rotate(5deg)';
        tape.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.1)';
        paperSide.appendChild(tape);
        
        // Right side - Numpad
        const numpadSide = document.createElement('div');
        numpadSide.style.width = '45%';
        numpadSide.style.backgroundColor = '#333';
        numpadSide.style.borderRadius = '10px';
        numpadSide.style.padding = '15px';
        numpadSide.style.boxShadow = '0 0 15px rgba(0, 0, 0, 0.5)';
        taskContainer.appendChild(numpadSide);
        
        // Code display screen
        const screen = document.createElement('div');
        screen.id = 'oxygen-code-screen';
        screen.style.backgroundColor = '#222';
        screen.style.color = '#0f0';
        screen.style.fontFamily = 'monospace';
        screen.style.fontSize = '24px';
        screen.style.textAlign = 'center';
        screen.style.padding = '10px';
        screen.style.marginBottom = '15px';
        screen.style.borderRadius = '5px';
        screen.style.letterSpacing = '5px';
        screen.innerText = '____';
        numpadSide.appendChild(screen);
        
        // Numpad grid
        const numpad = document.createElement('div');
        numpad.style.display = 'grid';
        numpad.style.gridTemplateColumns = 'repeat(3, 1fr)';
        numpad.style.gridGap = '10px';
        numpadSide.appendChild(numpad);
        
        // Current input code
        let currentCode = '';
        
        // Update display function
        const updateDisplay = () => {
            const display = document.getElementById('oxygen-code-screen');
            if (currentCode.length === 0) {
                display.innerText = '____';
            } else {
                let displayText = currentCode;
                while (displayText.length < 4) {
                    displayText += '_';
                }
                display.innerText = displayText;
            }
        };
        
        // Create numpad buttons
        for (let i = 1; i <= 9; i++) {
            const button = document.createElement('button');
            button.style.backgroundColor = '#444';
            button.style.color = 'white';
            button.style.border = 'none';
            button.style.borderRadius = '5px';
            button.style.padding = '15px 0';
            button.style.fontSize = '20px';
            button.style.cursor = 'pointer';
            button.innerText = i.toString();
            
            button.onmouseover = () => {
                button.style.backgroundColor = '#555';
            };
            
            button.onmouseout = () => {
                button.style.backgroundColor = '#444';
            };
            
            button.onclick = () => {
                if (currentCode.length < 4) {
                    currentCode += i.toString();
                    updateDisplay();
                }
            };
            
            numpad.appendChild(button);
        }
        
        // Add 0 button
        const zeroButton = document.createElement('button');
        zeroButton.style.backgroundColor = '#444';
        zeroButton.style.color = 'white';
        zeroButton.style.border = 'none';
        zeroButton.style.borderRadius = '5px';
        zeroButton.style.padding = '15px 0';
        zeroButton.style.fontSize = '20px';
        zeroButton.style.cursor = 'pointer';
        zeroButton.style.gridColumn = '2';
        zeroButton.innerText = '0';
        
        zeroButton.onmouseover = () => {
            zeroButton.style.backgroundColor = '#555';
        };
        
        zeroButton.onmouseout = () => {
            zeroButton.style.backgroundColor = '#444';
        };
        
        zeroButton.onclick = () => {
            if (currentCode.length < 4) {
                currentCode += '0';
                updateDisplay();
            }
        };
        
        numpad.appendChild(zeroButton);
        
        // Clear and Submit buttons
        const buttonRow = document.createElement('div');
        buttonRow.style.display = 'grid';
        buttonRow.style.gridTemplateColumns = '1fr 1fr';
        buttonRow.style.gridGap = '10px';
        buttonRow.style.marginTop = '15px';
        numpadSide.appendChild(buttonRow);
        
        // Clear button
        const clearButton = document.createElement('button');
        clearButton.style.backgroundColor = '#f44336';
        clearButton.style.color = 'white';
        clearButton.style.border = 'none';
        clearButton.style.borderRadius = '5px';
        clearButton.style.padding = '10px 0';
        clearButton.style.fontSize = '16px';
        clearButton.style.cursor = 'pointer';
        clearButton.innerText = 'Clear';
        
        clearButton.onmouseover = () => {
            clearButton.style.backgroundColor = '#d32f2f';
        };
        
        clearButton.onmouseout = () => {
            clearButton.style.backgroundColor = '#f44336';
        };
        
        clearButton.onclick = () => {
            currentCode = '';
            updateDisplay();
        };
        
        buttonRow.appendChild(clearButton);
        
        // Submit button
        const submitButton = document.createElement('button');
        submitButton.style.backgroundColor = '#4CAF50';
        submitButton.style.color = 'white';
        submitButton.style.border = 'none';
        submitButton.style.borderRadius = '5px';
        submitButton.style.padding = '10px 0';
        submitButton.style.fontSize = '16px';
        submitButton.style.cursor = 'pointer';
        submitButton.innerText = 'Submit';
        
        submitButton.onmouseover = () => {
            submitButton.style.backgroundColor = '#388E3C';
        };
        
        submitButton.onmouseout = () => {
            submitButton.style.backgroundColor = '#4CAF50';
        };
        
        submitButton.onclick = () => {
            if (currentCode.length === 4) {
                if (currentCode === task.oxygenCode) {
                    // Correct code
                    this.completeActiveTask();
                } else {
                    // Wrong code - reduce health
                    Player.properties.health -= 15;
                    
                    // Update health in player data
                    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
                        window.socket.send(JSON.stringify({
                            type: 'player_update',
                            x: Player.properties.x,
                            y: Player.properties.y,
                            health: Player.properties.health,
                            direction: Player.properties.direction,
                            isMoving: Player.properties.isMoving
                        }));
                    }
                    
                    // Show alert
                StarScrap.showGameMessage('Wrong code! ARE YOU Dyslexia? Oxygen levels dangerously low. You have been damaged!','error');
                    
                    // Clear the input
                    currentCode = '';
                    updateDisplay();
                }
            }
        };
        
        buttonRow.appendChild(submitButton);
    },
    
    // Create swipe card task UI
    createSwipeTaskUI: function(container, task) {
        const swipeContainer = document.createElement('div');
        swipeContainer.style.backgroundColor = '#333';
        swipeContainer.style.padding = '20px';
        swipeContainer.style.borderRadius = '8px';
        swipeContainer.style.color = 'white';
        swipeContainer.style.textAlign = 'center';
        
        // Title
        const title = document.createElement('div');
        title.textContent = 'Swipe Card to Unlock';
        title.style.fontSize = '18px';
        title.style.marginBottom = '20px';
        swipeContainer.appendChild(title);
        
        // Instructions
        const instructions = document.createElement('div');
        instructions.textContent = 'Drag the card from left to right through the card reader';
        instructions.style.fontSize = '14px';
        instructions.style.color = '#aaa';
        instructions.style.marginBottom = '30px';
        swipeContainer.appendChild(instructions);
        
        // Interactive area container
        const interactiveArea = document.createElement('div');
        interactiveArea.style.display = 'flex';
        interactiveArea.style.justifyContent = 'space-between';
        interactiveArea.style.alignItems = 'center';
        interactiveArea.style.position = 'relative';
        interactiveArea.style.height = '150px';
        interactiveArea.style.marginBottom = '20px';
        swipeContainer.appendChild(interactiveArea);
        
        // Card area (left side)
        const cardArea = document.createElement('div');
        cardArea.style.width = '40%';
        cardArea.style.height = '100%';
        cardArea.style.display = 'flex';
        cardArea.style.alignItems = 'center';
        cardArea.style.justifyContent = 'center';
        interactiveArea.appendChild(cardArea);
        
        // Card reader area (right side)
        const readerArea = document.createElement('div');
        readerArea.style.width = '40%';
        readerArea.style.height = '100%';
        readerArea.style.display = 'flex';
        readerArea.style.alignItems = 'center';
        readerArea.style.justifyContent = 'center';
        interactiveArea.appendChild(readerArea);
        
        // Create card reader
        const cardReader = document.createElement('div');
        cardReader.style.width = '80px';
        cardReader.style.height = '120px';
        cardReader.style.backgroundColor = '#222';
        cardReader.style.borderRadius = '5px';
        cardReader.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        cardReader.style.position = 'relative';
        cardReader.style.overflow = 'hidden';
        readerArea.appendChild(cardReader);
        
        // Card reader slot
        const readerSlot = document.createElement('div');
        readerSlot.style.width = '85%';
        readerSlot.style.height = '8px';
        readerSlot.style.backgroundColor = '#111';
        readerSlot.style.position = 'absolute';
        readerSlot.style.top = '20px';
        readerSlot.style.left = '50%';
        readerSlot.style.transform = 'translateX(-50%)';
        readerSlot.style.borderRadius = '4px';
        cardReader.appendChild(readerSlot);
        
        // Card reader indicator light
        const indicatorLight = document.createElement('div');
        indicatorLight.style.width = '15px';
        indicatorLight.style.height = '15px';
        indicatorLight.style.backgroundColor = '#f44336'; // Red light (initially)
        indicatorLight.style.borderRadius = '50%';
        indicatorLight.style.position = 'absolute';
        indicatorLight.style.bottom = '20px';
        indicatorLight.style.left = '50%';
        indicatorLight.style.transform = 'translateX(-50%)';
        indicatorLight.style.boxShadow = '0 0 5px #f44336';
        cardReader.appendChild(indicatorLight);
        
        // Create card
        const card = document.createElement('div');
        card.id = 'swipe-card';
        card.style.width = '80px';
        card.style.height = '50px';
        card.style.backgroundColor = '#1976d2'; // Blue card
        card.style.borderRadius = '5px';
        card.style.position = 'relative';
        card.style.cursor = 'grab';
        card.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
        card.style.transition = 'box-shadow 0.2s ease';
        card.style.zIndex = '10';
        cardArea.appendChild(card);
        
        // Card magnetic stripe
        const magneticStripe = document.createElement('div');
        magneticStripe.style.width = '100%';
        magneticStripe.style.height = '10px';
        magneticStripe.style.backgroundColor = '#111';
        magneticStripe.style.position = 'absolute';
        magneticStripe.style.top = '10px';
        magneticStripe.style.left = '0';
        card.appendChild(magneticStripe);
        
        // Card chip
        const cardChip = document.createElement('div');
        cardChip.style.width = '20px';
        cardChip.style.height = '20px';
        cardChip.style.backgroundColor = 'gold';
        cardChip.style.position = 'absolute';
        cardChip.style.bottom = '10px';
        cardChip.style.left = '10px';
        cardChip.style.borderRadius = '2px';
        card.appendChild(cardChip);
        
        // Status message
        const statusMessage = document.createElement('div');
        statusMessage.id = 'swipe-status';
        statusMessage.style.marginTop = '10px';
        statusMessage.style.fontSize = '16px';
        statusMessage.style.color = '#aaa';
        statusMessage.textContent = 'Ready to swipe...';
        swipeContainer.appendChild(statusMessage);
        
        // Dragging functionality
        let isDragging = false;
        let startX = 0;
        let originalX = 0;
        let originalParent = cardArea;
        let hasReachedReader = false;
        let swipeSuccessful = false;
        
        // Function to update card position
        const updateCardPosition = (e) => {
            const x = (e.clientX || e.touches[0].clientX) - startX;
            card.style.left = `${x}px`;
            
            // Check if card is over reader
            const cardRect = card.getBoundingClientRect();
            const slotRect = readerSlot.getBoundingClientRect();

            console.log('cardRect.right', cardRect.right, 'slotRect.left', slotRect.left, 'cardRect.left', cardRect.left, 'slotRect.right', slotRect.right, 'cardRect.top', cardRect.top, 'slotRect.bottom', slotRect.bottom, 'cardRect.bottom', cardRect.bottom, 'slotRect.top', slotRect.top, );
            
            if (cardRect.right > slotRect.left && cardRect.left < slotRect.right) {
                hasReachedReader = true;
                indicatorLight.style.backgroundColor = '#ffeb3b'; // Yellow while swiping
                indicatorLight.style.boxShadow = '0 0 5px #ffeb3b';
                statusMessage.textContent = 'Swiping...';
            }
            
            // Check if card has gone through the reader completely
            if (hasReachedReader && cardRect.left > slotRect.right) {
                swipeSuccessful = true;
                indicatorLight.style.backgroundColor = '#4CAF50'; // Green on success
                indicatorLight.style.boxShadow = '0 0 5px #4CAF50';
                statusMessage.textContent = 'Access granted!';
                
                // Complete the task after a short delay
                setTimeout(() => {
                    this.completeActiveTask();
                }, 1000);
            }
        };
        
        // Mouse events
        card.addEventListener('mousedown', (e) => {
            if (swipeSuccessful) return; // Prevent swiping if already successful
            
            isDragging = true;
            startX = e.clientX - card.offsetLeft;
            originalX = card.offsetLeft;
            card.style.cursor = 'grabbing';
            card.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.4)';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            updateCardPosition(e);
        });
        
        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            card.style.cursor = 'grab';
            card.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
            
            // Reset if not successful and not currently in progress
            if (!swipeSuccessful && !hasReachedReader) {
                card.style.left = '0px';
                indicatorLight.style.backgroundColor = '#f44336'; // Back to red
                indicatorLight.style.boxShadow = '0 0 5px #f44336';
                statusMessage.textContent = 'Try again. Swipe from left to right.';
            } else if (hasReachedReader && !swipeSuccessful) {
                // Reset if started swiping but didn't complete
                card.style.left = '0px';
                hasReachedReader = false;
                indicatorLight.style.backgroundColor = '#f44336'; // Back to red
                indicatorLight.style.boxShadow = '0 0 5px #f44336';
                statusMessage.textContent = 'Swipe too slow. Try again.';
            }
        });
        
        // Touch events for mobile
        card.addEventListener('touchstart', (e) => {
            if (swipeSuccessful) return;
            
            isDragging = true;
            startX = e.touches[0].clientX - card.offsetLeft;
            originalX = card.offsetLeft;
            card.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.4)';
            e.preventDefault();
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            updateCardPosition(e);
            e.preventDefault();
        });
        
        document.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            card.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
            
            // Reset if not successful
            if (!swipeSuccessful && !hasReachedReader) {
                card.style.left = '0px';
                indicatorLight.style.backgroundColor = '#f44336';
                indicatorLight.style.boxShadow = '0 0 5px #f44336';
                statusMessage.textContent = 'Try again. Swipe from left to right.';
            } else if (hasReachedReader && !swipeSuccessful) {
                card.style.left = '0px';
                hasReachedReader = false;
                indicatorLight.style.backgroundColor = '#f44336';
                indicatorLight.style.boxShadow = '0 0 5px #f44336';
                statusMessage.textContent = 'Swipe too slow. Try again.';
            }
        });
        
        container.appendChild(swipeContainer);
    },
    
    // Complete the active task
    completeActiveTask: function() {
        if (!this.state.activeTaskId) return;
        
        // Find the task in definitions
        const taskIndex = this.definitions.findIndex(t => t.id === this.state.activeTaskId);
        if (taskIndex === -1) return;
        
        // Check if task has a trap deployed
        if (this.definitions[taskIndex].isStunDeployed) {
            console.log('Trap triggered on task:', this.definitions[taskIndex].name);
            
            // Close the task UI
            this.closeTaskUI();
            
            // Trigger the trap effect
            this.triggerTrapEffect();
            
            // Reset trap status
            this.definitions[taskIndex].isStunDeployed = false;
            
            return;
        }
        
        // Use the new completeTask function
        this.completeTask(this.state.activeTaskId);
        
        // Close the task UI
        this.closeTaskUI();
    },
    
    // Update the task progress UI
    updateTaskProgressUI: function() {
        const taskProgressElement = document.getElementById('task-progress');
        if (taskProgressElement) {
            taskProgressElement.textContent = `Tasks: ${this.state.taskProgress}/${this.state.totalTasks}`;
        }
    },
    
    // Sync task completion with server
    syncTaskCompletion: function(taskId) {
        if (StarScrap && StarScrap.socket && StarScrap.socket.readyState === WebSocket.OPEN) {
            // Find the task to get its type
            const taskIndex = this.definitions.findIndex(t => t.id === taskId);
            if (taskIndex === -1) return;
            
            const taskType = this.definitions[taskIndex].type;
            
            StarScrap.socket.send(JSON.stringify({
                type: 'task_completed',
                taskId: taskId,
                taskType: taskType,
                playerId: Player ? Player.properties.id : null
            }));
        }
    },
    
    // Handle task completed message from server
    handleTaskCompleted: function(data) {
        // Update local task state for other players' completions
        if (data.playerId !== (Player ? Player.properties.id : null)) {
            const taskIndex = this.definitions.findIndex(t => t.id === data.taskId);
            if (taskIndex !== -1) {
                this.definitions[taskIndex].completed = true;
            }
        }
    },
    
    // Handle task trapped message from server
    handleTaskTrapped: function(data) {
        const taskIndex = this.definitions.findIndex(t => t.id === data.taskId);
        if (taskIndex !== -1) {
            this.definitions[taskIndex].isStunDeployed = true;
            
            // Add visual indicator to the task if it's an impostor setting the trap
            if (Player && Player.properties && Player.properties.role === 'impostor') {
                console.log('Trap set on task:', this.definitions[taskIndex].name);
            }
        }
    },
    
    // Check if a task has a trap set
    checkTaskTrap: function(taskId) {
        const taskIndex = this.definitions.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            return this.definitions[taskIndex].isStunDeployed;
        }
        return false;
    },
    
    // Trigger trap effect (stun player)
    triggerTrapEffect: function() {
        if (!Player || !Player.properties) return;
        
        // Only crewmates can be trapped
        if (Player.properties.role !== 'crewmate') return;
        
        // Calculate random stun duration between 1-6 seconds
        const stunDuration = Math.floor(Math.random() * 6) + 1;
        StarScrap.state.assets.stunSound.play();
        
        // Set player as stunned
        Player.properties.isStunned = true;
        const originalSpeed = Player.properties.speed;
        Player.properties.speed = 0;
        
        // Create stun overlay
        const stunOverlay = document.createElement('div');
        stunOverlay.id = 'stun-overlay';
        stunOverlay.style.position = 'absolute';
        stunOverlay.style.top = '0';
        stunOverlay.style.left = '0';
        stunOverlay.style.width = '100%';
        stunOverlay.style.height = '100%';
        stunOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        stunOverlay.style.pointerEvents = 'none';
        stunOverlay.style.zIndex = '1000';
        stunOverlay.style.display = 'flex';
        stunOverlay.style.alignItems = 'center';
        stunOverlay.style.justifyContent = 'center';
        
        // Add message
        const stunMessage = document.createElement('div');
        stunMessage.style.color = 'white';
        stunMessage.style.fontSize = '24px';
        stunMessage.style.fontWeight = 'bold';
        stunMessage.style.textShadow = '0 0 10px black';
        stunMessage.textContent = `STUNNED! (${stunDuration}s)`;
        stunOverlay.appendChild(stunMessage);
        
        document.body.appendChild(stunOverlay);
        
        // Send stun status to server
        if (window.socket && window.socket.readyState === WebSocket.OPEN) {
            window.socket.send(JSON.stringify({
                type: 'player_update',
                player: {
                    id: Player.properties.id,
                    x: Player.properties.x,
                    y: Player.properties.y,
                    isStunned: true,
                    speed: 0
                }
            }));
        }
        
        // Countdown timer
        let timeLeft = stunDuration;
        const countdownInterval = setInterval(() => {
            timeLeft--;
            if (stunMessage) {
                stunMessage.textContent = `STUNNED! (${timeLeft}s)`;
            }
            
            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                
                // Remove stun effect
                if (stunOverlay && stunOverlay.parentNode) {
                    stunOverlay.parentNode.removeChild(stunOverlay);
                }
                
                // Restore player movement
                if (Player && Player.properties) {
                    Player.properties.isStunned = false;
                    Player.properties.speed = originalSpeed;
                    
                    // Update server
                    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
                        window.socket.send(JSON.stringify({
                            type: 'player_update',
                            player: {
                                id: Player.properties.id,
                                x: Player.properties.x,
                                y: Player.properties.y,
                                isStunned: false,
                                speed: originalSpeed
                            }
                        }));
                    }
                }
            }
        }, 1000);
    },
    
    // Complete a task
    completeTask: function(taskId) {
        // Find the task
        const taskIndex = this.definitions.findIndex(task => task.id === taskId);
        if (taskIndex === -1) return false;
        
        // If already completed, do nothing
        if (this.definitions[taskIndex].completed) return false;
        
        // Mark as completed
        this.definitions[taskIndex].completed = true;
        
        // Increment progress (for all tasks including crates)
        this.state.taskProgress++;
        
        // Update UI
        this.updateTaskProgressUI();
        
        // Send completion to server
        if (StarScrap && StarScrap.socket && StarScrap.socket.readyState === WebSocket.OPEN) {
            StarScrap.socket.send(JSON.stringify({
                type: 'task_completed',
                taskId: taskId,
                taskType: this.definitions[taskIndex].type
            }));
        }
        
        console.log(`Task ${taskId} completed! Progress: ${this.state.taskProgress}/${this.state.totalTasks}`);
        
        // Check if all tasks complete
        if (this.state.taskProgress >= this.state.totalTasks) {
            console.log('All tasks completed!');
        }
        
        return true;
    }
};