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
        this.state.totalTasks = this.definitions.filter(task => task.type !== 'crate').length;
        this.updateTaskProgressUI();
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
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
            ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
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
            case 'bodycheck1': icon = '💊'; break;        }
        
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
            container.style.width = '400px';
            container.style.height = '300px';
            container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            container.style.border = '2px solid #666';
            container.style.borderRadius = '10px';
            container.style.padding = '20px';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
            container.style.zIndex = '1000';
            document.body.appendChild(container);
        }
        
        const container = document.getElementById('task-ui-container');
        container.innerHTML = '';
        container.style.display = 'flex';
        
        // Create task header
        const header = document.createElement('div');
        header.style.fontSize = '20px';
        header.style.fontWeight = 'bold';
        header.style.color = 'white';
        header.style.marginBottom = '20px';
        header.textContent = task.name;
        container.appendChild(header);
        
        // Create task description
        const description = document.createElement('div');
        description.style.fontSize = '14px';
        description.style.color = '#ccc';
        description.style.marginBottom = '20px';
        description.textContent = task.description;
        container.appendChild(description);
        
        // Create task-specific UI based on type
        switch (task.type) {
            case 'wire':
                this.createWireTaskUI(container, task);
                break;
            case 'crate':
                this.createCrateTaskUI(container, task);
                break;
            case 'engine':
                this.createEngineTaskUI(container, task);
                break;
            case 'oxygen':
                this.createOxygenTaskUI(container, task);
                break;
        }
        
        // Create close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Cancel';
        closeButton.style.marginTop = '20px';
        closeButton.style.padding = '5px 10px';
        closeButton.style.backgroundColor = '#333';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '5px';
        closeButton.style.cursor = 'pointer';
        closeButton.onclick = this.closeTaskUI.bind(this);
        container.appendChild(closeButton);
        
        this.state.activeTaskUI = container;
        
        // Notify game that task UI is open
        if (StarScrap && typeof StarScrap.setTaskUIActive === 'function') {
            StarScrap.setTaskUIActive(true);
        }
    },
    
    // Close task UI
    closeTaskUI: function() {
        if (this.state.activeTaskUI) {
            this.state.activeTaskUI.style.display = 'none';
            this.state.activeTaskId = null;
            
            // Clean up wire task event listeners
            if (this.state.wireTaskActive) {
                document.removeEventListener('mousemove', this.wireMouseMoveHandler);
                document.removeEventListener('mouseup', this.wireMouseUpHandler);
                document.removeEventListener('touchmove', this.wireTouchMoveHandler);
                document.removeEventListener('touchend', this.wireTouchEndHandler);
                this.state.wireTaskActive = false;
                this.state.wireConnections = [];
                this.state.wireStartPositions = [];
                this.state.wireEndPositions = [];
                this.state.activeWire = null;
            }
            
            // Notify game that task UI is closed
            if (StarScrap && typeof StarScrap.setTaskUIActive === 'function') {
                StarScrap.setTaskUIActive(false);
            }
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
        const placeholder = document.createElement('div');
        if (task.id === 'crate1') {
            placeholder.textContent = 'Searching crate...';
        } else if (task.id === 'bodycheck1') {
            placeholder.textContent = 'Scanning body...';
        } else if (task.id === 'lecture1') {
            placeholder.textContent = 'Watching lecture...';
        }

        placeholder.style.color = 'white';
        placeholder.style.margin = '20px 0';
        container.appendChild(placeholder);
        
        // Auto-complete after a short delay
        setTimeout(() => {
            this.completeActiveTask();
            
        }, 2000);
    },
    
    // Create placeholder for engine task
    createEngineTaskUI: function(container, task) {
        const placeholder = document.createElement('div');
        placeholder.textContent = 'Engine repair not implemented yet';
        placeholder.style.color = 'white';
        placeholder.style.margin = '20px 0';
        container.appendChild(placeholder);
    },
    
    // Create placeholder for oxygen task
    createOxygenTaskUI: function(container, task) {
        const pipeContainer = document.createElement('div');
        pipeContainer.style.display = 'flex';
        pipeContainer.style.justifyContent = 'space-between';
        pipeContainer.style.width = '100%';
        pipeContainer.style.height = '200px';
        pipeContainer.style.backgroundColor = '#222';
        pipeContainer.style.borderRadius = '5px';
        pipeContainer.style.padding = '10px';
        pipeContainer.style.position = 'relative';
        container.appendChild(pipeContainer);
    },
    
    // Complete the active task
    completeActiveTask: function() {
        if (!this.state.activeTaskId) return;
        
        // Find the task in definitions
        const taskIndex = this.definitions.findIndex(t => t.id === this.state.activeTaskId);
        if (taskIndex === -1) return;
        
        // Mark as completed
        this.definitions[taskIndex].completed = true;
        
        // Update task progress if it's not a crate
        this.state.taskProgress++;
        this.updateTaskProgressUI();
       
        
        // Notify server about task completion
        this.syncTaskCompletion(this.state.activeTaskId);
        
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
            StarScrap.socket.send(JSON.stringify({
                type: 'task_completed',
                taskId: taskId,
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
    }
};