// Wallet connection state and config
let dAppConnector = null;
let connectedAccountId = null;
let isInitialized = false;

// App metadata for wallet connection
const appMetadata = {
    name: "Overlayz",
    description: "NFT Overlay Tool for Hedera",
    url: window.location.origin,
    icons: [`${window.location.origin}/assets/icon.png`]
};

// WalletConnect configuration
const WALLET_CONNECT_CONFIG = {
    projectId: "19f08313224ac846097e6a722ab078fc",
    networkId: "testnet",
    metadata: appMetadata
};

// Event handlers for wallet connection
const walletEvents = {
    onConnect: null,
    onDisconnect: null,
    onAccountChanged: null
};

/**
 * Initialize the wallet connection system
 */
async function initWallet() {
    try {
        // Wait for SDK to load
        let attempts = 0;
        while (typeof window.HederaWalletConnect === 'undefined' && attempts < 5) {
            console.log("Waiting for Hedera WalletConnect SDK to load...");
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }

        if (typeof window.HederaWalletConnect === 'undefined') {
            throw new Error("Hedera WalletConnect SDK failed to load");
        }

        const { DAppConnector, LedgerId, HederaSessionEvent } = window.HederaWalletConnect;
        
        // Initialize DAppConnector
        dAppConnector = new DAppConnector(
            appMetadata,
            LedgerId.Testnet,
            WALLET_CONNECT_CONFIG.projectId,
            [], // Methods
            [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
            []
        );

        console.log("DAppConnector initialized successfully");
        
        // Set up event listeners
        setupWalletEvents();
        
        isInitialized = true;
        return true;
    } catch (error) {
        console.error("Failed to initialize wallet:", error);
        isInitialized = false;
        throw error;
    }
}

/**
 * Set up wallet event listeners
 */
function setupWalletEvents() {
    if (!dAppConnector) return;

    dAppConnector.on('connect', (data) => {
        console.log("Wallet connected:", data);
        if (data.accountIds?.[0]) {
            connectedAccountId = data.accountIds[0];
            saveSession(connectedAccountId);
            if (walletEvents.onConnect) {
                walletEvents.onConnect(connectedAccountId);
            }
        }
    });

    dAppConnector.on('disconnect', () => {
        console.log("Wallet disconnected");
        connectedAccountId = null;
        clearSession();
        if (walletEvents.onDisconnect) {
            walletEvents.onDisconnect();
        }
    });

    dAppConnector.on('accountsChanged', (accounts) => {
        console.log("Accounts changed:", accounts);
        if (accounts?.[0]) {
            connectedAccountId = accounts[0];
            saveSession(connectedAccountId);
            if (walletEvents.onAccountChanged) {
                walletEvents.onAccountChanged(connectedAccountId);
            }
        }
    });
}

/**
 * Connect wallet (manual connection attempt)
 */
async function connectWallet() {
    try {
        if (!isInitialized) {
            await initWallet();
        }

        if (!dAppConnector) {
            throw new Error("Wallet connector not initialized");
        }

        console.log("Attempting to connect wallet...");
        await dAppConnector.connectToWallet();
        
        return true;
    } catch (error) {
        console.error("Error connecting wallet:", error);
        throw error;
    }
}

/**
 * Disconnect the current wallet
 */
async function disconnectWallet() {
    try {
        if (dAppConnector && isWalletConnected()) {
            await dAppConnector.disconnect();
            connectedAccountId = null;
            clearSession();
        }
    } catch (error) {
        console.error("Error disconnecting wallet:", error);
        throw error;
    }
}

/**
 * Save wallet session to localStorage
 */
function saveSession(accountId) {
    try {
        localStorage.setItem('walletSession', JSON.stringify({
            accountId: accountId,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.warn("Could not save wallet session:", e);
    }
}

/**
 * Clear wallet session from localStorage
 */
function clearSession() {
    try {
        localStorage.removeItem('walletSession');
    } catch (e) {
        console.warn("Could not clear wallet session:", e);
    }
}

/**
 * Check if a wallet is connected
 */
function isWalletConnected() {
    try {
        return Boolean(connectedAccountId) && Boolean(dAppConnector);
    } catch (error) {
        console.error("Error checking wallet connection:", error);
        return false;
    }
}

/**
 * Get the connected account ID
 */
function getConnectedAccount() {
    return connectedAccountId;
}

/**
 * Register event handlers
 */
function onWalletEvent(event, callback) {
    if (event in walletEvents) {
        walletEvents[event] = callback;
    }
}

// Export wallet interface
window.wallet = {
    init: initWallet,
    connect: connectWallet,
    disconnect: disconnectWallet,
    isConnected: isWalletConnected,
    getAccount: getConnectedAccount,
    onEvent: onWalletEvent
};