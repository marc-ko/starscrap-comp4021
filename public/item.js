/**
 * Item System for StarScrap
 * Handles weapon items that can be picked up by crewmates to increase their kill chance
 */

const ITEM_SPRITE_FULL_WIDTH = 248
const ITEM_SPRITE_FULL_HEIGHT = 48


const Item = {
    // Collection of items in the game
    items: [
        {
            id: 1,
            name: 'diamond_axe',
            description: 'A powerful diamond axe',
            frameX: 0, // X position in the sprite sheet
            width: 50,
            height: 50,
            killChanceBonus: 1,
            isPickedUp: false,
            respawnTime: 30000, // 30 seconds
            lastPickupTime: 0,
            x: 1286,
            y: 486
        },
        {
            id: 2,
            name: 'space_knife',
            description: 'A sharp space knife',
            frameX: 2, // X position in the sprite sheet
            width: 50,
            height: 50,
            killChanceBonus: 2,
            isPickedUp: false,
            respawnTime: 30000, // 30 seconds
            lastPickupTime: 0,
            x: 1600,
            y: 700
        },
        {
            id: 3,
            name: 'hulk_potion',
            description: 'A potion that can make you stronger than a hulk',
            frameX: 3, // X position in the sprite sheet
            width: 50,
            height: 50,
            killChanceBonus: 1,
            isPickedUp: false,
            respawnTime: 30000, // 30 seconds
            lastPickupTime: 0,
            x: 1000,
            y: 800
        },
        {
            id: 4,
            name: 'rabbit_leg',
            description: 'Useless',
            frameX: 4, // X position in the sprite shee
            width: 50,
            height: 50,
            killChanceBonus: 1,
            isPickedUp: false,
            respawnTime: 30000, // 30 seconds
            lastPickupTime: 0,
            x: 1000,
            y: 800
        },
        {
            id: 5,
            name: 'heal_potion',
            description: 'A potion that can heal you',
            frameX: 5, // X position in the sprite sheet
            width: 50,
            height: 50,
            killChanceBonus: 0,
            isPickedUp: false,
            respawnTime: 30000, // 30 seconds
            lastPickupTime: 0,
            x: 1000,
            y: 800
        },
        {
            id: 6,
            name: 'coal',
            description: 'A useless item',
            frameX: 6, // X position in the sprite sheet
            width: 50,
            height: 50,
            killChanceBonus: 0,
            isPickedUp: false,
            respawnTime: 30000, // 30 seconds
            lastPickupTime: 0,
            x: 1000,
            y: 800
        },
        {
            id: 7,
            name: 'crazy_potion',
            description: 'A potion that can make you crazy killing chance',
            frameX: 7, // X position in the sprite sheet
            width: 50,
            height: 50,
            killChanceBonus: 3,
            isPickedUp: false,
            respawnTime: 30000, // 30 seconds
            lastPickupTime: 0,
            x: 1000,
            y: 800
        }
        
    ],
    
    // Initialize the item system
    init: function() {
        console.log('Initializing Item system...');
        
        // Apply random offset to item positions
        this.randomizeItemPositions();
        
        // Check for item respawns periodically
        setInterval(() => this.checkItemRespawns(), 1000);
        
        return this;
    },
    
    // Apply random offsets to item positions
    randomizeItemPositions: function() {
        this.items.forEach(item => {
            // Add random offset of ±50 pixels
            item.x += Math.floor(Math.random() * 100) - 50;
            item.y += Math.floor(Math.random() * 100) - 50;
        });
    },
    
    // Check if an item is visible in the current camera view
    isItemVisible: function(item, cameraX, cameraY, viewWidth, viewHeight) {
        return (
            item.x + item.width > cameraX &&
            item.x < cameraX + viewWidth &&
            item.y + item.height > cameraY &&
            item.y < cameraY + viewHeight
        );
    },
    
    // Render all visible items
    render: function(ctx, itemSprite, cameraX, cameraY) {
        if (!itemSprite || !itemSprite.complete) return;
        
        ctx.save();
        
        this.items.forEach(item => {
            // Skip if item is picked up
            if (item.isPickedUp) return;
            
            // Check if item is visible in camera view
            if (this.isItemVisible(item, cameraX, cameraY, ctx.canvas.width, ctx.canvas.height)) {
                // Calculate position on screen
                const screenX = item.x - cameraX;
                const screenY = item.y - cameraY;
                
                // Draw item with correct frame from sprite sheet
                ctx.drawImage(
                    itemSprite,
                    item.frameX * ITEM_SPRITE_FULL_WIDTH/8, 0,
                    ITEM_SPRITE_FULL_WIDTH/8, (item.frameX===2)?ITEM_SPRITE_FULL_HEIGHT:32,
                    screenX, screenY,
                    item.width, item.height
                );
                
                // Draw item name below
                ctx.font = '12px Arial';
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.fillText(item.name.replace('_', ' '), screenX + (item.width / 2), screenY + item.height + 15);
            }
        });
        
        ctx.restore();
    },
    
    // Find an item near the player
    findNearbyItem: function(playerX, playerY, pickupRange = 50) {
        // Find the first item that's close enough to the player
        return this.items.find(item => {
            if (item.isPickedUp) return false;
            
            // Calculate distance between player and item
            const dx = item.x - playerX;
            const dy = item.y - playerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Return true if within pickup range
            return distance <= pickupRange;
        });
    },
    
    // Handle player picking up an item
    pickupItem: function(itemId, playerId) {
        const item = this.items.find(item => item.id === itemId);
        if (!item) return null;
        
        // Mark as picked up
        item.isPickedUp = true;
        item.lastPickupTime = Date.now();
        
        console.log(`Player ${playerId} picked up ${item.name}`);
        
        // Return the item that was picked up
        return item;
    },
    
    // Check for item respawns
    checkItemRespawns: function() {
        const now = Date.now();
        
        this.items.forEach(item => {
            if (item.isPickedUp && now - item.lastPickupTime >= item.respawnTime) {
                item.isPickedUp = false;
                
                // Apply a small random position offset when respawning
                item.x += Math.floor(Math.random() * 60) - 30;
                item.y += Math.floor(Math.random() * 60) - 30;
            }
        });
    },
    
    // Check if player can pick up a nearby item
    tryPickupNearbyItem: function(playerX, playerY, playerId) {
        const nearbyItem = this.findNearbyItem(playerX, playerY);
        if (!nearbyItem) return null;
        
        return this.pickupItem(nearbyItem.id, playerId);
    }
};
