/**
 * HashPack Wallet Integration for Overlayz
 * Direct implementation for Chrome extension
 */

// Connection state
let hashConnectInstance = null;
let connectionData = {
    topic: "",
    pairingString: "",
    accountId: null
};

// App metadata
const appMetadata = {
    name: "Overlayz",
    description: "NFT Overlay Tool for Hedera",
    icon: "https://www.hashpack.app/img/logo.svg"
};

// Event callbacks
const eventCallbacks = {
    onConnect: null,
    onDisconnect: null
};

/**
 * Register event callback
 * @param {string} event - Event name ('connect' or 'disconnect')
 * @param {function} callback - Callback function
 */
function setWalletEventCallback(event, callback) {
    if (event === 'connect') {
        eventCallbacks.onConnect = callback;
    } else if (event === 'disconnect') {
        eventCallbacks.onDisconnect = callback;
    }
}

/**
 * Initialize HashConnect
 * @returns {Promise<boolean>}
 */
async function initHashConnect() {
    try {
        console.log("Initializing HashConnect...");

        // Check if HashConnect library is loaded
        if (typeof window.hashconnect === 'undefined') {
            throw new Error("HashConnect library not loaded");
        }

        // Create HashConnect instance
        hashConnectInstance = new window.hashconnect.HashConnect();
        console.log("HashConnect instance created:", hashConnectInstance);

        // Register event handlers
        setupEvents();

        // Initialize with network and debug enabled
        const initData = await hashConnectInstance.init(appMetadata, "testnet", true);
        console.log("HashConnect initialized:", initData);

        // Get state data for pairing
        connectionData.topic = initData.topic;
        connectionData.pairingString = hashConnectInstance.generatePairingString(initData, "testnet", false);
        console.log("Pairing string generated:", connectionData.pairingString);

        // Check for existing session
        const savedData = localStorage.getItem("hashconnectData");
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                console.log("Found saved connection data:", parsedData);
                
                if (parsedData.accountId) {
                    connectionData.accountId = parsedData.accountId;
                    
                    // Trigger connection event
                    if (eventCallbacks.onConnect) {
                        eventCallbacks.onConnect(connectionData.accountId);
                    }
                }
            } catch (e) {
                console.error("Error parsing saved data:", e);
            }
        }

        return true;
    } catch (error) {
        console.error("Failed to initialize HashConnect:", error);
        return false;
    }
}

/**
 * Setup HashConnect event handlers
 */
function setupEvents() {
    // Handle pairing event (when user approves connection)
    hashConnectInstance.pairingEvent.on((data) => {
        console.log("Paired with wallet:", data);
        
        if (data.accountIds && data.accountIds.length > 0) {
            // Save the account ID
            connectionData.accountId = data.accountIds[0];
            
            // Save to local storage
            localStorage.setItem("hashconnectData", JSON.stringify({
                topic: connectionData.topic,
                pairingString: connectionData.pairingString,
                accountId: connectionData.accountId
            }));
            
            // Trigger connection event
            if (eventCallbacks.onConnect) {
                eventCallbacks.onConnect(connectionData.accountId);
            }
        }
    });
    
    // Handle connection status changes
    hashConnectInstance.connectionStatusChange.on((status) => {
        console.log("Connection status changed:", status);
        
        if (status === "Disconnected") {
            // Clear connection data
            connectionData.accountId = null;
            
            // Remove from local storage
            localStorage.removeItem("hashconnectData");
            
            // Trigger disconnect event
            if (eventCallbacks.onDisconnect) {
                eventCallbacks.onDisconnect();
            }
        }
    });
    
    // When wallet extension is found
    hashConnectInstance.foundExtensionEvent.on((data) => {
        console.log("Found wallet extension:", data);
    });
}

/**
 * Connect to HashPack wallet
 * @returns {Promise<void>}
 */
async function connectToWallet() {
    try {
        console.log("Connecting to HashPack wallet...");
        
        if (!hashConnectInstance) {
            await initHashConnect();
        }
        
        // Check if already connected
        if (connectionData.accountId) {
            console.log("Already connected to wallet:", connectionData.accountId);
            return;
        }
        
        // First find local wallet extensions
        console.log("Looking for wallet extensions...");
        await hashConnectInstance.findLocalWallets();
        
        // Connect to the extension with our pairing string
        console.log("Connecting to local wallet with pairing string");
        await hashConnectInstance.connectToLocalWallet(connectionData.pairingString);
        
        console.log("Connection request sent to wallet");
    } catch (error) {
        console.error("Failed to connect to wallet:", error);
        throw error;
    }
}

/**
 * Disconnect from wallet
 */
function disconnectWallet() {
    if (hashConnectInstance && connectionData.topic && connectionData.accountId) {
        try {
            console.log("Disconnecting from wallet:", connectionData.accountId);
            hashConnectInstance.disconnect(connectionData.topic);
            
            // Clear connection data
            connectionData.accountId = null;
            
            // Remove from local storage
            localStorage.removeItem("hashconnectData");
            
            // Trigger disconnect event
            if (eventCallbacks.onDisconnect) {
                eventCallbacks.onDisconnect();
            }
        } catch (error) {
            console.error("Error disconnecting wallet:", error);
        }
    }
}

/**
 * Check if wallet is connected
 * @returns {boolean} True if connected
 */
function isWalletConnected() {
    return connectionData.accountId !== null;
}

/**
 * Get connected account ID
 * @returns {string|null} Account ID or null
 */
function getAccountId() {
    return connectionData.accountId;
}

// Export wallet functions
window.hashpackWallet = {
    init: initHashConnect,
    connect: connectToWallet,
    disconnect: disconnectWallet,
    isConnected: isWalletConnected,
    getAccountId: getAccountId,
    onEvent: setWalletEventCallback
};