/**
 * Overlayz - NFT Overlay Tool for Hedera
 * Main application logic
 */

// App state
const state = {
    selectedNFT: null,
    selectedOverlay: null,
    appliedOverlays: [],
    connectedAccount: null,
    nftCollections: [],
    currentNFTs: [],
    overlayCategories: {
        hats: [
            { id: 'hat1', name: 'Party Hat', imgSrc: 'assets/overlays/hats/party-hat.png' },
            { id: 'hat2', name: 'Cowboy Hat', imgSrc: 'assets/overlays/hats/cowboy-hat.png' },
            { id: 'hat3', name: 'Crown', imgSrc: 'assets/overlays/hats/crown.png' },
            { id: 'hat4', name: 'Beanie', imgSrc: 'assets/overlays/hats/beanie.png' },
            { id: 'hat5', name: 'Wizard Hat', imgSrc: 'assets/overlays/hats/wizard-hat.png' },
            { id: 'hat6', name: 'Cap', imgSrc: 'assets/overlays/hats/cap.png' }
        ],
        glasses: [
            { id: 'glass1', name: 'Sunglasses', imgSrc: 'assets/overlays/glasses/sunglasses.png' },
            { id: 'glass2', name: 'Nerd Glasses', imgSrc: 'assets/overlays/glasses/nerd-glasses.png' },
            { id: 'glass3', name: 'Cool Shades', imgSrc: 'assets/overlays/glasses/cool-shades.png' },
            { id: 'glass4', name: 'Heart Glasses', imgSrc: 'assets/overlays/glasses/heart-glasses.png' }
        ],
        accessories: [
            { id: 'acc1', name: 'Coffee Cup', imgSrc: 'assets/overlays/accessories/coffee-cup.png' },
            { id: 'acc2', name: 'Microphone', imgSrc: 'assets/overlays/accessories/microphone.png' },
            { id: 'acc3', name: 'Pipe', imgSrc: 'assets/overlays/accessories/pipe.png' },
            { id: 'acc4', name: 'Bow Tie', imgSrc: 'assets/overlays/accessories/bow-tie.png' },
            { id: 'acc5', name: 'Mustache', imgSrc: 'assets/overlays/accessories/mustache.png' }
        ]
    }
};

// DOM Elements
const connectWalletBtn = document.getElementById('connect-wallet-btn');
const accountDisplay = document.getElementById('account-display');
const tokenIdInput = document.getElementById('token-id');
const searchBtn = document.getElementById('search-btn');
const nftGallery = document.getElementById('nft-gallery');
const nftPreview = document.getElementById('nft-preview');
const overlayItems = document.getElementById('overlay-items');
const categoryBtns = document.querySelectorAll('.category-btn');
const saveBtn = document.getElementById('save-btn');
const resetBtn = document.getElementById('reset-btn');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const collectionsListElement = document.getElementById('collections-list');
const positionControls = document.getElementById('position-controls');
const scaleSlider = document.getElementById('scale-slider');
const xPositionSlider = document.getElementById('x-position');
const yPositionSlider = document.getElementById('y-position');

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Export utility functions to window for other modules to use
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showNotification = showNotification;

/**
 * Initialize the application
 */
function initApp() {
    // Set initial overlay category
    displayOverlayItems('hats');
    
    // Initialize HashPack wallet connection
    initializeWallet();
    
    // Initialize the canvas for NFT preview
    window.canvasUtil.init('nft-preview');
    
    // Set up event listeners
    setupEventListeners();
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Connect wallet button
    connectWalletBtn.addEventListener('click', handleWalletConnect);
    
    // Search button
    searchBtn.addEventListener('click', handleSearch);
    
    // Category buttons
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            displayOverlayItems(btn.dataset.category);
        });
    });
    
    // Tab buttons
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Show selected tab content
            tabContents.forEach(content => {
                content.style.display = 'none';
            });
            document.getElementById(`${tabId}-tab`).style.display = 'block';
            
            // Special handling for "my-nfts" tab when connected
            if (tabId === 'my-nfts' && state.connectedAccount) {
                // Refresh collections if needed
                if (state.nftCollections.length === 0) {
                    loadUserCollections(state.connectedAccount);
                }
            }
        });
    });
    
    // Save button
    saveBtn.addEventListener('click', saveImage);
    
    // Reset button
    resetBtn.addEventListener('click', resetOverlays);
    
    // Position sliders
    scaleSlider.addEventListener('input', updateSelectedOverlayPosition);
    xPositionSlider.addEventListener('input', updateSelectedOverlayPosition);
    yPositionSlider.addEventListener('input', updateSelectedOverlayPosition);
    
    // Initialize tabs
    const activateInitialTab = () => {
        // Default to my-nfts tab, but switch to token-search if not connected
        if (!state.connectedAccount) {
            const tokenSearchTab = document.querySelector('.tab-btn[data-tab="token-search"]');
            if (tokenSearchTab) {
                tokenSearchTab.click();
            }
        }
    };
    
    // Activate initial tab after short delay to ensure DOM is ready
    setTimeout(activateInitialTab, 100);
}

/**
 * Initialize HashPack wallet connection
 */
function initializeWallet() {
    // Initialize HashConnect
    window.hashpackWallet.init();
    
    // Register event handlers
    window.hashpackWallet.onEvent('connect', handleWalletConnected);
    window.hashpackWallet.onEvent('disconnect', handleWalletDisconnected);
    
    // Check if already connected
    if (window.hashpackWallet.isConnected()) {
        const accountId = window.hashpackWallet.getAccountId();
        handleWalletConnected(accountId);
    }
}

/**
 * Handle wallet connect button click
 */
function handleWalletConnect() {
    if (window.hashpackWallet.isConnected()) {
        window.hashpackWallet.disconnect();
    } else {
        try {
            window.hashpackWallet.connect();
            
            // Set a timeout to show an error message if connection takes too long
            setTimeout(() => {
                if (!window.hashpackWallet.isConnected()) {
                    const notification = document.createElement('div');
                    notification.className = 'notification error';
                    notification.innerHTML = `<strong>Connection Issue</strong><br>Please check if HashPack wallet is installed and unlocked.`;
                    document.body.appendChild(notification);
                    
                    setTimeout(() => {
                        notification.classList.add('fade-out');
                        setTimeout(() => notification.remove(), 500);
                    }, 5000);
                }
            }, 10000);
        } catch (error) {
            console.error('Error connecting to wallet:', error);
            
            const notification = document.createElement('div');
            notification.className = 'notification error';
            notification.innerHTML = `<strong>Error connecting to wallet</strong><br>${error.message || 'Unknown error'}`;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.add('fade-out');
                setTimeout(() => notification.remove(), 500);
            }, 5000);
        }
    }
}

/**
 * Handle wallet connected event
 * @param {string} accountId - Hedera account ID
 */
function handleWalletConnected(accountId) {
    console.log('Wallet connected:', accountId);
    
    // Show connection notification
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.textContent = `Successfully connected to account: ${accountId}`;
    document.body.appendChild(notification);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 5000);
    
    // Update state
    state.connectedAccount = accountId;
    
    // Update UI
    connectWalletBtn.textContent = 'Connected';
    connectWalletBtn.classList.add('connected');
    accountDisplay.textContent = `Account: ${accountId}`;
    accountDisplay.style.display = 'block';
    
    // Load user's NFT collections
    loadUserCollections(accountId);
}

/**
 * Handle wallet disconnected event
 */
function handleWalletDisconnected() {
    console.log('Wallet disconnected');
    
    // Update state
    state.connectedAccount = null;
    state.nftCollections = [];
    
    // Update UI
    connectWalletBtn.textContent = 'Connect Wallet';
    connectWalletBtn.classList.remove('connected');
    accountDisplay.style.display = 'none';
    
    // Clear collections list
    collectionsListElement.innerHTML = `
        <p class="connect-prompt">Connect your wallet to see your NFTs</p>
    `;
    
    // Clear gallery
    nftGallery.innerHTML = `
        <p class="gallery-placeholder">NFT collection will appear here after connecting wallet or searching</p>
    `;
}

/**
 * Load user's NFT collections
 * @param {string} accountId - Hedera account ID
 */
async function loadUserCollections(accountId) {
    try {
        // Show loading overlay
        showLoading('Fetching your NFT collections...');
        
        // Show loading message in collections list
        collectionsListElement.innerHTML = `<p class="connect-prompt">Loading your NFT collections...</p>`;
        
        // Get collections from API
        const collections = await window.hederaApi.getNFTCollections(accountId);
        
        // Update state
        state.nftCollections = collections;
        
        // Hide loading
        hideLoading();
        
        // Display collections
        displayCollections(collections);
        
        // Show success message if collections were found
        if (collections && collections.length > 0) {
            const notification = document.createElement('div');
            notification.className = 'notification success';
            notification.textContent = `Found ${collections.length} NFT collection${collections.length > 1 ? 's' : ''}`;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.add('fade-out');
                setTimeout(() => notification.remove(), 500);
            }, 3000);
        }
    } catch (error) {
        console.error('Error loading collections:', error);
        hideLoading();
        
        collectionsListElement.innerHTML = `
            <p class="connect-prompt">Error loading NFT collections. Please try again.</p>
        `;
        
        // Show error notification
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.innerHTML = `<strong>Error loading collections</strong><br>${error.message || 'Unknown error'}`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 5000);
    }
}

/**
 * Display NFT collections
 * @param {Array} collections - Array of collection objects
 */
function displayCollections(collections) {
    if (!collections || collections.length === 0) {
        collectionsListElement.innerHTML = `
            <p class="connect-prompt">No NFT collections found for this account</p>
        `;
        return;
    }
    
    // Sort collections by most recent first (we'll use the ID as a proxy for recency)
    const sortedCollections = [...collections].sort((a, b) => {
        // Extract the serial number from the tokenId (assuming 0.0.XXXXX format)
        const aSerial = parseInt(a.id.split('.').pop());
        const bSerial = parseInt(b.id.split('.').pop());
        return bSerial - aSerial;  // Newest first
    });
    
    collectionsListElement.innerHTML = '';
    
    // Create container for collections with initially 3 items
    const collectionGrid = document.createElement('div');
    collectionGrid.className = 'collections-grid';
    collectionsListElement.appendChild(collectionGrid);
    
    // Initially show only the first 3 collections
    const initialCount = Math.min(3, sortedCollections.length);
    
    for (let i = 0; i < initialCount; i++) {
        const collection = sortedCollections[i];
        addCollectionItem(collection, collectionGrid);
    }
    
    // Only add "See More" button if we have more than 3 collections
    if (sortedCollections.length > 3) {
        const seeMoreContainer = document.createElement('div');
        seeMoreContainer.className = 'see-more-container';
        
        const seeMoreBtn = document.createElement('button');
        seeMoreBtn.className = 'see-more-btn';
        seeMoreBtn.textContent = 'See More';
        seeMoreBtn.addEventListener('click', () => {
            expandCollectionsView(sortedCollections);
            seeMoreContainer.style.display = 'none';
        });
        
        seeMoreContainer.appendChild(seeMoreBtn);
        collectionsListElement.appendChild(seeMoreContainer);
    }
}

/**
 * Add a collection item to the grid
 * @param {Object} collection - Collection object
 * @param {HTMLElement} container - Container element
 */
function addCollectionItem(collection, container) {
    const collectionElement = document.createElement('div');
    collectionElement.className = 'collection-item';
    
    collectionElement.innerHTML = `
        <img src="${collection.imageUrl}" alt="${collection.name || collection.id}">
        <p>${collection.name || `Collection #${collection.id}`}</p>
    `;
    
    collectionElement.addEventListener('click', () => {
        loadCollectionNFTs(collection.id);
    });
    
    container.appendChild(collectionElement);
}

/**
 * Expand collections view to show all collections with pagination
 * @param {Array} collections - Array of collection objects
 */
function expandCollectionsView(collections) {
    // Clear existing content
    collectionsListElement.innerHTML = '';
    
    // Create container for expanded view
    const expandedView = document.createElement('div');
    expandedView.className = 'expanded-collections-view';
    
    // Create grid for collections
    const collectionGrid = document.createElement('div');
    collectionGrid.className = 'collections-grid expanded';
    expandedView.appendChild(collectionGrid);
    
    // Calculate total pages (15 items per page)
    const itemsPerPage = 15;
    const totalPages = Math.ceil(collections.length / itemsPerPage);
    
    // State for current page
    let currentPage = 1;
    
    // Function to render a specific page
    function renderPage(page) {
        // Clear the grid
        collectionGrid.innerHTML = '';
        
        // Calculate start and end indices
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, collections.length);
        
        // Add collections for this page
        for (let i = startIndex; i < endIndex; i++) {
            addCollectionItem(collections[i], collectionGrid);
        }
        
        // Update active page in pagination
        document.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.page) === page) {
                btn.classList.add('active');
            }
        });
        
        // Update current page state
        currentPage = page;
    }
    
    // Add pagination controls if we have more than one page
    if (totalPages > 1) {
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination-container';
        
        // Add previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-nav-btn';
        prevBtn.innerHTML = '&laquo;';
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                renderPage(currentPage - 1);
            }
        });
        paginationContainer.appendChild(prevBtn);
        
        // Add page buttons
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = 'pagination-btn';
            pageBtn.textContent = i;
            pageBtn.dataset.page = i;
            
            if (i === 1) {
                pageBtn.classList.add('active');
            }
            
            pageBtn.addEventListener('click', () => {
                renderPage(i);
            });
            
            paginationContainer.appendChild(pageBtn);
        }
        
        // Add next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-nav-btn';
        nextBtn.innerHTML = '&raquo;';
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                renderPage(currentPage + 1);
            }
        });
        paginationContainer.appendChild(nextBtn);
        
        expandedView.appendChild(paginationContainer);
    }
    
    // Add back button
    const backBtnContainer = document.createElement('div');
    backBtnContainer.className = 'back-btn-container';
    
    const backBtn = document.createElement('button');
    backBtn.className = 'back-btn';
    backBtn.textContent = 'Back to Compact View';
    backBtn.addEventListener('click', () => {
        // Go back to compact view
        displayCollections(collections);
    });
    
    backBtnContainer.appendChild(backBtn);
    expandedView.appendChild(backBtnContainer);
    
    // Add the expanded view to the container
    collectionsListElement.appendChild(expandedView);
    
    // Render the first page
    renderPage(1);
}

/**
 * Load NFTs for a specific collection
 * @param {string} tokenId - Token ID
 */
async function loadCollectionNFTs(tokenId) {
    try {
        // Show loading overlay
        showLoading(`Loading NFTs for token ${tokenId}...`);
        
        // Clear gallery and show loading message
        nftGallery.innerHTML = `<p class="gallery-placeholder">Loading NFTs...</p>`;
        
        // Get NFTs for the collection
        let nfts;
        
        if (state.connectedAccount) {
            // If connected to wallet, get owned NFTs
            nfts = await window.hederaApi.getOwnedNFTs(state.connectedAccount, tokenId);
        } else {
            // Otherwise get all NFTs for token
            nfts = await window.hederaApi.getNFTsByTokenId(tokenId);
        }
        
        // Update state
        state.currentNFTs = nfts;
        
        // Hide loading
        hideLoading();
        
        // Display NFTs
        displayNFTGallery(nfts);
        
        // Show success message if NFTs were found
        if (nfts && nfts.length > 0) {
            const notification = document.createElement('div');
            notification.className = 'notification success';
            notification.textContent = `Found ${nfts.length} NFT${nfts.length > 1 ? 's' : ''} for token ${tokenId}`;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.add('fade-out');
                setTimeout(() => notification.remove(), 500);
            }, 3000);
        } else {
            // Show message if no NFTs were found
            const notification = document.createElement('div');
            notification.className = 'notification error';
            notification.textContent = `No NFTs found for token ${tokenId}`;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.add('fade-out');
                setTimeout(() => notification.remove(), 500);
            }, 3000);
        }
    } catch (error) {
        console.error('Error loading NFTs:', error);
        hideLoading();
        
        nftGallery.innerHTML = `
            <p class="gallery-placeholder">Error loading NFTs. Please try again.</p>
        `;
        
        // Show error notification
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.innerHTML = `<strong>Error loading NFTs</strong><br>${error.message || 'Unknown error'}`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 5000);
    }
}

/**
 * Handle search button click
 */
function handleSearch() {
    const tokenId = tokenIdInput.value.trim();
    
    if (!tokenId) {
        // Show error notification instead of alert
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.textContent = 'Please enter a valid Hedera Token ID';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
        return;
    }
    
    // Validate token ID format
    const tokenIdPattern = /^\d+\.\d+\.\d+$/;
    if (!tokenIdPattern.test(tokenId)) {
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.innerHTML = `<strong>Invalid Token ID format</strong><br>Expected format: 0.0.12345`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
        return;
    }
    
    // Load NFTs for the token ID
    loadCollectionNFTs(tokenId);
}

/**
 * Display NFT gallery
 * @param {Array} nfts - Array of NFT objects
 */
function displayNFTGallery(nfts) {
    nftGallery.innerHTML = '';
    
    if (!nfts || nfts.length === 0) {
        nftGallery.innerHTML = `
            <p class="gallery-placeholder">No NFTs found for this collection</p>
        `;
        return;
    }
    
    nfts.forEach(nft => {
        const nftElement = document.createElement('div');
        nftElement.className = 'nft-item';
        nftElement.dataset.id = nft.id;
        
        nftElement.innerHTML = `
            <img src="${nft.imageUrl}" alt="NFT #${nft.serialNumber}">
            <div class="nft-info">
                <p>#${nft.serialNumber}</p>
            </div>
        `;
        
        nftElement.addEventListener('click', () => selectNFT(nft));
        
        nftGallery.appendChild(nftElement);
    });
}

/**
 * Select an NFT for editing
 * @param {Object} nft - NFT object
 */
function selectNFT(nft) {
    // Update state
    state.selectedNFT = nft;
    
    // Update UI to show selected NFT
    document.querySelectorAll('.nft-item').forEach(item => {
        item.classList.remove('selected');
        if (item.dataset.id === String(nft.id)) {
            item.classList.add('selected');
        }
    });
    
    // Reset any applied overlays
    resetOverlays();
    
    // Set NFT image in canvas
    window.canvasUtil.setNFTImage(nft.imageUrl);
    
    // Enable buttons
    saveBtn.disabled = false;
    resetBtn.disabled = false;
}

/**
 * Display overlay items for a category
 * @param {string} category - Category name
 */
function displayOverlayItems(category) {
    const items = state.overlayCategories[category] || [];
    overlayItems.innerHTML = '';
    
    items.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'overlay-item';
        itemElement.dataset.id = item.id;
        
        itemElement.innerHTML = `
            <img src="${item.imgSrc}" alt="${item.name}">
            <p>${item.name}</p>
        `;
        
        itemElement.addEventListener('click', () => {
            selectOverlay(item);
        });
        
        overlayItems.appendChild(itemElement);
    });
}

/**
 * Select an overlay to apply
 * @param {Object} overlay - Overlay object
 */
function selectOverlay(overlay) {
    if (!state.selectedNFT) {
        alert('Please select an NFT first');
        return;
    }
    
    try {
        // Check if this overlay is already selected
        if (state.selectedOverlay && state.selectedOverlay.id === overlay.id) {
            // Deselect it
            deselectOverlay();
            return;
        }
        
        // Deselect any previously selected overlay
        deselectOverlay();
        
        // Check if the overlay is already applied
        const existingIndex = state.appliedOverlays.findIndex(item => item.id === overlay.id);
        
        if (existingIndex !== -1) {
            // If already applied, select it for editing
            state.selectedOverlay = overlay;
            
            // Highlight in the UI
            document.querySelector(`.overlay-item[data-id="${overlay.id}"]`).classList.add('active');
            
            // Show position controls
            showPositionControls(state.appliedOverlays[existingIndex]);
        } else {
            // Add the new overlay
            applyOverlay(overlay);
        }
    } catch (error) {
        console.error('Error selecting overlay:', error);
    }
}

/**
 * Deselect the current overlay
 */
function deselectOverlay() {
    if (!state.selectedOverlay) return;
    
    // Remove highlight from UI
    document.querySelectorAll('.overlay-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Hide position controls
    positionControls.style.display = 'none';
    
    // Clear selected overlay
    state.selectedOverlay = null;
}

/**
 * Show loading overlay with custom message
 * @param {string} message - Message to display
 */
function showLoading(message = 'Loading...') {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingMessage = document.getElementById('loading-message');
    
    if (loadingMessage) {
        loadingMessage.textContent = message;
    }
    
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

/**
 * Show a notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type ('success' or 'error')
 * @param {number} duration - Duration in milliseconds before auto-hiding
 * @param {boolean} isHtml - Whether the message contains HTML
 */
function showNotification(message, type = 'success', duration = 5000, isHtml = false) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    if (isHtml) {
        notification.innerHTML = message;
    } else {
        notification.textContent = message;
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, duration);
    
    return notification;
}

/**
 * Apply an overlay to the NFT
 * @param {Object} overlay - Overlay object
 */
async function applyOverlay(overlay) {
    try {
        // Add overlay to canvas
        await window.canvasUtil.addOverlay(overlay);
        
        // Update state
        state.appliedOverlays.push(overlay);
        state.selectedOverlay = overlay;
        
        // Update UI
        document.querySelector(`.overlay-item[data-id="${overlay.id}"]`).classList.add('active');
        
        // Show position controls
        showPositionControls(overlay);
    } catch (error) {
        console.error('Error applying overlay:', error);
    }
}

/**
 * Show position controls for an overlay
 * @param {Object} overlay - Overlay object
 */
function showPositionControls(overlay) {
    // Reset sliders to default
    scaleSlider.value = 1.0;
    xPositionSlider.value = 0;
    yPositionSlider.value = 0;
    
    // Show controls
    positionControls.style.display = 'block';
}

/**
 * Update the position of the selected overlay
 */
function updateSelectedOverlayPosition() {
    if (!state.selectedOverlay) return;
    
    const scale = parseFloat(scaleSlider.value);
    const x = parseInt(xPositionSlider.value);
    const y = parseInt(yPositionSlider.value);
    
    // Update overlay position on canvas
    window.canvasUtil.updateOverlayPosition(state.selectedOverlay.id, { scale, x, y });
}

/**
 * Save the modified NFT image
 */
function saveImage() {
    if (!state.selectedNFT) return;
    
    try {
        // Generate filename from NFT info
        const fileName = `overlayz-${state.selectedNFT.tokenId}-${state.selectedNFT.serialNumber}`;
        
        // Export canvas as image
        window.canvasUtil.exportImage(fileName)
            .then(() => {
                console.log('Image saved successfully');
            })
            .catch(error => {
                console.error('Error saving image:', error);
                alert('Error saving image. Please try again.');
            });
    } catch (error) {
        console.error('Error in saveImage:', error);
        alert('Error saving image. Please try again.');
    }
}

/**
 * Reset all overlays
 */
function resetOverlays() {
    // Clear applied overlays from state
    state.appliedOverlays = [];
    state.selectedOverlay = null;
    
    // Reset UI
    document.querySelectorAll('.overlay-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Hide position controls
    positionControls.style.display = 'none';
    
    // Clear canvas overlays
    window.canvasUtil.clearOverlays();
}

// Mock data for development (Remove in production)
const mockNFTs = [
    { id: 1, tokenId: '0.0.1234', serialNumber: '1234', imageUrl: 'https://via.placeholder.com/300' },
    { id: 2, tokenId: '0.0.1234', serialNumber: '1235', imageUrl: 'https://via.placeholder.com/300' },
    { id: 3, tokenId: '0.0.1234', serialNumber: '1236', imageUrl: 'https://via.placeholder.com/300' },
    { id: 4, tokenId: '0.0.1234', serialNumber: '1237', imageUrl: 'https://via.placeholder.com/300' },
    { id: 5, tokenId: '0.0.1234', serialNumber: '1238', imageUrl: 'https://via.placeholder.com/300' },
    { id: 6, tokenId: '0.0.1234', serialNumber: '1239', imageUrl: 'https://via.placeholder.com/300' }
];