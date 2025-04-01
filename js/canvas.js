/**
 * Canvas Utility for Overlayz
 * Handles drawing NFTs and overlays on canvas
 */

// Canvas state
const canvasState = {
    nftImage: null,
    overlays: [],
    canvas: null,
    ctx: null,
    initialized: false
};

/**
 * Initialize canvas
 * @param {string} containerId - ID of the container element
 * @returns {HTMLCanvasElement} The canvas element
 */
function initCanvas(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container element with ID '${containerId}' not found`);
        return null;
    }

    // Remove any existing canvas
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    // Create new canvas
    const canvas = document.createElement('canvas');
    canvas.width = 600;  // Default size, will be updated when image loads
    canvas.height = 600;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.objectFit = 'contain';
    
    container.appendChild(canvas);
    
    canvasState.canvas = canvas;
    canvasState.ctx = canvas.getContext('2d');
    canvasState.initialized = true;
    
    return canvas;
}

/**
 * Set the NFT image
 * @param {string} imageUrl - URL of the NFT image
 * @returns {Promise<void>}
 */
function setNFTImage(imageUrl) {
    return new Promise((resolve, reject) => {
        if (!canvasState.initialized) {
            reject(new Error('Canvas not initialized'));
            return;
        }
        
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Enable CORS
        
        img.onload = function() {
            canvasState.nftImage = img;
            
            // Update canvas size to match image aspect ratio
            updateCanvasSize();
            
            // Draw the image
            drawCanvas();
            resolve();
        };
        
        img.onerror = function() {
            console.error('Error loading NFT image:', imageUrl);
            reject(new Error('Failed to load image'));
        };
        
        img.src = imageUrl;
    });
}

/**
 * Update canvas size to match NFT image aspect ratio
 */
function updateCanvasSize() {
    if (!canvasState.nftImage) return;
    
    const img = canvasState.nftImage;
    const canvas = canvasState.canvas;
    
    // Determine the appropriate canvas size based on the image aspect ratio
    const containerWidth = canvas.parentElement.clientWidth;
    const containerHeight = canvas.parentElement.clientHeight;
    
    // Use the container's aspect ratio as a constraint
    const containerRatio = containerWidth / containerHeight;
    const imageRatio = img.width / img.height;
    
    let canvasWidth, canvasHeight;
    
    if (imageRatio > containerRatio) {
        // Image is wider than container
        canvasWidth = Math.min(containerWidth, 800); // Cap at 800px
        canvasHeight = canvasWidth / imageRatio;
    } else {
        // Image is taller than container
        canvasHeight = Math.min(containerHeight, 800); // Cap at 800px
        canvasWidth = canvasHeight * imageRatio;
    }
    
    // Set canvas size
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
}

/**
 * Add an overlay to the canvas
 * @param {Object} overlay - Overlay object with id, name, and imgSrc
 * @returns {Promise<void>}
 */
function addOverlay(overlay) {
    return new Promise((resolve, reject) => {
        if (!canvasState.initialized) {
            reject(new Error('Canvas not initialized'));
            return;
        }
        
        // Check if the overlay already exists
        const existingIndex = canvasState.overlays.findIndex(o => o.id === overlay.id);
        if (existingIndex !== -1) {
            // Remove the overlay if it exists
            removeOverlay(overlay.id);
            resolve();
            return;
        }
        
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Enable CORS
        
        img.onload = function() {
            const newOverlay = {
                id: overlay.id,
                name: overlay.name,
                image: img,
                x: 0,
                y: 0,
                scale: 1.0,
                zIndex: canvasState.overlays.length + 1
            };
            
            canvasState.overlays.push(newOverlay);
            drawCanvas();
            resolve(newOverlay);
        };
        
        img.onerror = function() {
            console.error('Error loading overlay image:', overlay.imgSrc);
            reject(new Error('Failed to load overlay image'));
        };
        
        img.src = overlay.imgSrc;
    });
}

/**
 * Remove an overlay from the canvas
 * @param {string} overlayId - ID of the overlay to remove
 * @returns {boolean} True if successful
 */
function removeOverlay(overlayId) {
    if (!canvasState.initialized) {
        return false;
    }
    
    const index = canvasState.overlays.findIndex(o => o.id === overlayId);
    if (index === -1) {
        return false;
    }
    
    canvasState.overlays.splice(index, 1);
    drawCanvas();
    return true;
}

/**
 * Clear all overlays
 */
function clearOverlays() {
    if (!canvasState.initialized) {
        return;
    }
    
    canvasState.overlays = [];
    drawCanvas();
}

/**
 * Update overlay position
 * @param {string} overlayId - ID of the overlay
 * @param {Object} position - Position object with x, y, and scale
 */
function updateOverlayPosition(overlayId, position) {
    if (!canvasState.initialized) {
        return;
    }
    
    const overlay = canvasState.overlays.find(o => o.id === overlayId);
    if (!overlay) {
        return;
    }
    
    if (position.x !== undefined) {
        overlay.x = position.x;
    }
    
    if (position.y !== undefined) {
        overlay.y = position.y;
    }
    
    if (position.scale !== undefined) {
        overlay.scale = position.scale;
    }
    
    drawCanvas();
}

/**
 * Draw the canvas with NFT and overlays
 */
function drawCanvas() {
    if (!canvasState.initialized || !canvasState.ctx) {
        return;
    }
    
    const ctx = canvasState.ctx;
    const canvas = canvasState.canvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw NFT image
    if (canvasState.nftImage) {
        ctx.drawImage(
            canvasState.nftImage,
            0, 0,
            canvas.width,
            canvas.height
        );
    }
    
    // Draw overlays in order of z-index
    canvasState.overlays
        .sort((a, b) => a.zIndex - b.zIndex)
        .forEach(overlay => {
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            
            const overlayWidth = canvas.width * overlay.scale;
            const overlayHeight = canvas.height * overlay.scale;
            
            const x = centerX - (overlayWidth / 2) + overlay.x;
            const y = centerY - (overlayHeight / 2) + overlay.y;
            
            ctx.drawImage(
                overlay.image,
                x, y,
                overlayWidth,
                overlayHeight
            );
        });
}

/**
 * Export the canvas as an image
 * @param {string} fileName - Name for the download file
 * @returns {Promise<string>} Data URL of the image
 */
function exportCanvasImage(fileName = 'overlayz-nft') {
    return new Promise((resolve, reject) => {
        if (!canvasState.initialized || !canvasState.canvas) {
            reject(new Error('Canvas not initialized'));
            return;
        }
        
        try {
            const dataUrl = canvasState.canvas.toDataURL('image/png');
            
            // Create download link
            const link = document.createElement('a');
            link.download = `${fileName}.png`;
            link.href = dataUrl;
            link.click();
            
            resolve(dataUrl);
        } catch (error) {
            console.error('Error exporting canvas:', error);
            reject(error);
        }
    });
}

/**
 * Get all current overlays
 * @returns {Array} Array of overlay objects
 */
function getOverlays() {
    return [...canvasState.overlays];
}

// Export canvas functions
window.canvasUtil = {
    init: initCanvas,
    setNFTImage,
    addOverlay,
    removeOverlay,
    clearOverlays,
    updateOverlayPosition,
    exportImage: exportCanvasImage,
    getOverlays
};