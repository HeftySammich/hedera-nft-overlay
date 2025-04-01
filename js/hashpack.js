/**
 * HashPack Wallet Integration for Overlayz
 * Handles all wallet connection and Hedera interactions
 */

// HashConnect initialization
let hashConnect;
let topic;
let pairingString;
let pairingData;
let accountId = null;

// App metadata for HashConnect
const appMetadata = {
    name: "Overlayz",
    description: "NFT Overlay Tool for Hedera",
    icon: "https://www.hashpack.app/img/logo.svg" // TODO: Replace with your own icon
};

// Network to use (testnet or mainnet)
const network = "mainnet";

// Event callbacks
const eventCallbacks = {
    onConnect: null,
    onDisconnect: null
};

/**
 * Set callback for wallet connection events
 * @param {string} event - Event name ('connect' or 'disconnect')
 * @param {function} callback - Function to call when event occurs
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
 * @returns {Promise<void>}
 */
async function initHashConnect() {
    try {
        // Check if HashConnect is available
        if (typeof HashConnect === 'undefined') {
            console.error("HashConnect is not available. Please make sure it's properly loaded.");
            return;
        }

        // Create a new instance
        hashConnect = new HashConnect();
        
        // Set debug to false in production
        const initData = await hashConnect.init(appMetadata, network, false);
        
        // Save private key and topic
        const privateKey = initData.privKey;
        topic = initData.topic;
        
        // Generate pairing string
        pairingString = hashConnect.generatePairingString(topic, network, false);
        
        // Register for pairing events
        setupHashConnectEvents();
        
        // Check for saved pairing
        const savedPairing = getSavedPairing();
        if (savedPairing) {
            pairingData = savedPairing;
            accountId = pairingData.accountIds[0];
            
            // Trigger connection event
            if (eventCallbacks.onConnect) {
                eventCallbacks.onConnect(accountId);
            }
        }
        
        console.log("HashConnect initialized");
    } catch (error) {
        console.error("Error initializing HashConnect:", error);
    }
}

/**
 * Set up HashConnect event handlers
 */
function setupHashConnectEvents() {
    // Handle wallet found events
    hashConnect.foundExtensionEvent.on((data) => {
        console.log("HashPack wallet found", data);
    });
    
    // Handle pairing events (when user approves connection)
    hashConnect.pairingEvent.on((data) => {
        console.log("Paired with wallet", data);
        
        // Save pairing data
        pairingData = data;
        accountId = data.accountIds[0];
        
        // Save to local storage
        localStorage.setItem('hashconnectData', JSON.stringify({
            topic: topic,
            pairingData: pairingData
        }));
        
        // Trigger connection event
        if (eventCallbacks.onConnect) {
            eventCallbacks.onConnect(accountId);
        }
    });
    
    // Handle connection status changes
    hashConnect.connectionStatusChange.on((status) => {
        console.log("Connection status changed:", status);
        
        if (status === "Disconnected") {
            clearConnectionData();
            
            // Trigger disconnect event
            if (eventCallbacks.onDisconnect) {
                eventCallbacks.onDisconnect();
            }
        }
    });
}

/**
 * Connect to HashPack wallet
 * @returns {Promise<void>}
 */
async function connectToWallet() {
    try {
        if (!hashConnect) {
            await initHashConnect();
        }
        
        // First look for extensions
        hashConnect.findLocalWallets();
        
        // Connect to the found wallet
        hashConnect.connectToLocalWallet(pairingString);
    } catch (error) {
        console.error("Error connecting to wallet:", error);
    }
}

/**
 * Disconnect from HashPack wallet
 */
function disconnectWallet() {
    if (hashConnect && topic && pairingData) {
        try {
            // Disconnect from paired wallet
            hashConnect.disconnect(topic, pairingData.accountIds[0]);
            clearConnectionData();
            
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
 * Clear connection data
 */
function clearConnectionData() {
    pairingData = null;
    accountId = null;
    localStorage.removeItem('hashconnectData');
}

/**
 * Get saved pairing data from local storage
 * @returns {object|null} Pairing data or null
 */
function getSavedPairing() {
    try {
        const savedData = localStorage.getItem('hashconnectData');
        if (savedData) {
            const parsed = JSON.parse(savedData);
            if (parsed.pairingData) {
                return parsed.pairingData;
            }
        }
        return null;
    } catch (error) {
        console.error("Error getting saved pairing:", error);
        return null;
    }
}

/**
 * Check if wallet is connected
 * @returns {boolean} True if connected
 */
function isWalletConnected() {
    return !!accountId;
}

/**
 * Get connected account ID
 * @returns {string|null} Account ID or null if not connected
 */
function getAccountId() {
    return accountId;
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