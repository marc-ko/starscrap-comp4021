// mapBound.js - Handles collision detection using the pre-generated map boundaries
const MapBound = {
    // Check if a position collides with map boundaries
    checkCollision: function(x, y, width, height) {
        // Convert position to integer to ensure correct array indexing
        const left = Math.floor(x + 10);
        const right = Math.floor(x + width - 10);
        const top = Math.floor(y + 25);
        const bottom = Math.floor(y + height - 10);
        // Check each row within the player's bounds
        for (let row = top; row <= bottom; row++) {
            // Skip if no data for this row
            if (!mapBoundData[row]) continue;
            
            // Check each column in this row's data
            for (let i = 0; i < mapBoundData[row].length; i++) {
                const col = mapBoundData[row][i];
                // If the column is within the player's bounds, collision detected
                if (col >= left && col <= right) {
                    return true;
                }
            }
        }
        
        return false;
    },
    
    // Draw the collision boundaries for debugging
    drawDebugBoundaries: function(ctx, cameraX, cameraY) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'; // Semi-transparent red
        
        // Only draw boundaries that are visible on screen
        const screenWidth = ctx.canvas.width;
        const screenHeight = ctx.canvas.height;
        
        // Determine which rows are visible
        const startRow = Math.max(0, Math.floor(cameraY));
        const endRow = Math.min(Object.keys(mapBoundData).length, Math.ceil(cameraY + screenHeight));
        
        // For each visible row
        for (let row = startRow; row <= endRow; row++) {
            if (!mapBoundData[row]) continue;
            
            // Draw each collision point in the row
            for (let i = 0; i < mapBoundData[row].length; i++) {
                const col = mapBoundData[row][i];
                // Skip if not visible on screen
                if (col < cameraX || col > cameraX + screenWidth) continue;
                
                // Draw a small rectangle at the collision point
                ctx.fillRect(col - cameraX, row - cameraY, 1, 1);
            }
        }
        
        ctx.restore();
    }
};
