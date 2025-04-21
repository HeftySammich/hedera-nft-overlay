/**
 * Wallet Connection Module for Overlayz
 * Uses WalletConnect for cross-wallet compatibility
 * With support for both desktop and mobile environments
 */

// Create event emitter utility
function createEventEmitter() {
    const listeners = [];
    return {
        on: function(callback) {
            listeners.push(callback);
            return function unsubscribe() {
                const index = listeners.indexOf(callback);
                if (index !== -1) {
                    listeners.splice(index, 1);
                }
            };
        },
        emit: function(data) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (err) {
                    console.error("Error in event listener:", err);
                }
            });
        }
    };
}

// Wallet connection state
let walletProvider = null;
let web3 = null;
let accounts = [];
let chainId = null;

// Event emitters
const connectionEvents = {
    connect: createEventEmitter(),
    disconnect: createEventEmitter(),
    chainChanged: createEventEmitter(),
    accountsChanged: createEventEmitter()
};

// Init options for WalletConnect - works on desktop and mobile
const walletConnectOptions = {
    rpc: {
        // Hedera networks - use official RPC nodes (or replace with actual endpoints)
        295: "https://mainnet.hashio.io/api", // Hedera Mainnet
        296: "https://testnet.hashio.io/api"  // Hedera Testnet
    },
    chainId: 296, // Default to Hedera Testnet
    qrcodeModalOptions: {
        // For desktop, show QR but also list of wallet apps
        desktopLinks: [
            "hashpack",
            "kabila",
            "metamask"
        ],
        // For mobile, these are the deep links
        mobileLinks: [
            "hashpack",
            "kabila",
            "metamask"
        ],
    }
};

// Try to load the Hedera WalletConnect library dynamically
function tryLoadHederaWalletConnect() {
    return new Promise((resolve, reject) => {
        if (window.hederaWalletConnectLoaded) {
            resolve(true);
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@hashgraph/hedera-wallet-connect@1.1.0/dist/hedera-wallet-connect.min.js';
        script.async = true;
        
        script.onload = () => {
            console.log("Hedera WalletConnect loaded successfully");
            window.hederaWalletConnectLoaded = true;
            resolve(true);
        };
        
        script.onerror = () => {
            console.warn("Failed to load Hedera WalletConnect, will use regular WalletConnect instead");
            resolve(false);
        };
        
        document.head.appendChild(script);
    });
}

/**
 * Initialize wallet connection
 * @returns {Promise<boolean>}
 */
async function initWallet() {
    try {
        console.log("Initializing wallet connection...");
        
        // First, try to detect or load HashPack extension
        if (typeof window.hashpack === 'undefined' && typeof window.loadHashPack === 'function') {
            try {
                console.log("Attempting to load HashPack SDK...");
                await window.loadHashPack();
                
                if (typeof window.hashpack !== 'undefined') {
                    console.log("Successfully loaded HashPack SDK");
                } else {
                    console.log("HashPack SDK loaded but extension not detected");
                }
            } catch (hashpackLoadError) {
                console.warn("Failed to load HashPack:", hashpackLoadError);
            }
        } else if (typeof window.hashpack !== 'undefined') {
            console.log("HashPack extension already detected");
        }
        
        // Try Hedera specific WalletConnect
        const hederaLoaded = await tryLoadHederaWalletConnect();
        
        if (hederaLoaded && typeof window.HederaWalletConnect !== 'undefined') {
            console.log("Using Hedera WalletConnect...");
            try {
                // Extract needed components from the HederaWalletConnect library
                const { 
                    DAppConnector, 
                    LedgerId, 
                    HederaJsonRpcMethod, 
                    HederaSessionEvent, 
                    HederaChainId,
                    BrowserWalletProvider 
                } = window.HederaWalletConnect;
                
                // Your project metadata - required by the wallet
                const connectionMeta = {
                    name: "Overlayz",
                    description: "NFT Overlay Tool for Hedera",
                    url: window.location.origin,
                    icons: ["https://example.com/icon.png"] // Replace with your actual icon
                };
                
                // WalletConnect project ID - in production, get this from https://cloud.walletconnect.com/
                const projectId = "c1fcf5622e0d41aeda04e793b07d5437"; // Demo project ID - REPLACE IN PRODUCTION
                
                // Create the Hedera WalletConnect connector
                window.dAppConnector = new DAppConnector(
                    connectionMeta,
                    LedgerId.Testnet, // Default to testnet
                    projectId,
                    Object.values(HederaJsonRpcMethod), // Support all methods
                    [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged], // Events to listen for
                    [HederaChainId.Testnet, HederaChainId.Mainnet] // Supported chains
                );
                
                // Add direct HashPack browser extension support
                window.browserWalletProvider = new BrowserWalletProvider({
                    projectId: projectId,
                    metadata: connectionMeta,
                    ledgerId: LedgerId.Testnet // Default to testnet
                });
                
                // Check if HashPack extension is detected by the Hedera library
                window.hasHashPackExtension = await window.browserWalletProvider.isWalletExtensionAvailable('hashpack');
                
                if (window.hasHashPackExtension) {
                    console.log("HashPack extension detected by Hedera library");
                } else {
                    console.log("No HashPack extension detected by Hedera library");
                }
                
                // Set up session event handling
                window.dAppConnector.on(HederaSessionEvent.SessionConnect, (session) => {
                    console.log("Hedera session connected:", session);
                    handleHederaSession(session);
                });
                
                window.dAppConnector.on(HederaSessionEvent.AccountsChanged, (accounts) => {
                    console.log("Hedera accounts changed:", accounts);
                    if (accounts && accounts.length > 0) {
                        window.accounts = accounts;
                        connectionEvents.accountsChanged.emit(accounts);
                    }
                });
                
                window.dAppConnector.on(HederaSessionEvent.ChainChanged, (chainId) => {
                    console.log("Hedera chain changed:", chainId);
                    window.chainId = chainId;
                    connectionEvents.chainChanged.emit(chainId);
                });
                
                window.dAppConnector.on(HederaSessionEvent.SessionDisconnect, () => {
                    console.log("Hedera session disconnected");
                    accounts = [];
                    chainId = null;
                    connectionEvents.disconnect.emit();
                });
            } catch (error) {
                console.error("Error initializing Hedera WalletConnect:", error);
                // Fall back to regular WalletConnect
            }
        }
        
        // Standard WalletConnect - set up even if other methods are available as a fallback
        console.log("Setting up standard WalletConnect...");
        
        // Check if WalletConnect is available
        if (typeof WalletConnectProvider === 'undefined') {
            console.error("WalletConnect not available. Please refresh the page.");
            // Continue anyway - we might still have HashPack
        } else {
            // Create Web3 provider from WalletConnect
            walletProvider = new WalletConnectProvider.default(walletConnectOptions);
            
            // Register event handlers
            setupEventHandlers();
            
            // Create Web3 instance
            web3 = new Web3(walletProvider);
        }
        
        console.log("Wallet connection initialization complete");
        
        // Return true if we have at least one connection method available
        return window.hashpack !== undefined || walletProvider !== null || window.dAppConnector !== null;
    } catch (error) {
        console.error("Failed to initialize wallet:", error);
        return false;
    }
}

/**
 * Set up event handlers for wallet connection
 */
function setupEventHandlers() {
    // Handle connection
    walletProvider.on("connect", (connectInfo) => {
        console.log("Wallet connected:", connectInfo);
        chainId = connectInfo.chainId;
        connectionEvents.connect.emit(connectInfo);
    });
    
    // Handle disconnection
    walletProvider.on("disconnect", (error) => {
        console.log("Wallet disconnected:", error);
        accounts = [];
        chainId = null;
        connectionEvents.disconnect.emit(error);
    });
    
    // Handle chain changes
    walletProvider.on("chainChanged", (newChainId) => {
        console.log("Chain changed:", newChainId);
        chainId = newChainId;
        connectionEvents.chainChanged.emit(newChainId);
    });
    
    // Handle account changes
    walletProvider.on("accountsChanged", (newAccounts) => {
        console.log("Accounts changed:", newAccounts);
        accounts = newAccounts;
        connectionEvents.accountsChanged.emit(newAccounts);
    });
}

/**
 * Handle a Hedera wallet session
 * @param {Object} session - WalletConnect session from Hedera variant
 */
function handleHederaSession(session) {
    try {
        if (!session) return;
        
        console.log("New Hedera session established:", session);
        
        // For Hedera library format - account format changed in newer version
        if (session.namespaces && session.namespaces.hedera) {
            const hederaAccounts = session.namespaces.hedera.accounts || [];
            
            if (hederaAccounts.length > 0) {
                // Parse account format "hedera:testnet:0.0.12345" or similar
                const accountParts = hederaAccounts[0].split(':');
                const accountId = accountParts.length >= 3 ? accountParts[2] : hederaAccounts[0];
                
                accounts = [accountId];
                
                // Get chain from parts or use chainId from session
                const network = accountParts.length >= 2 ? accountParts[1] : 'testnet';
                chainId = network === 'mainnet' ? '295' : '296';
                
                // Store session in local storage if desired
                try {
                    localStorage.setItem('hederaAccountId', accountId);
                    localStorage.setItem('hederaNetwork', network);
                } catch (e) {
                    console.warn("Could not store session in localStorage:", e);
                }
            }
        } 
        // Backward compatibility with older session format
        else {
            // Get account info
            const accountData = session.accountIds?.[0] || session.accounts?.[0];
            accounts = accountData ? [accountData] : [];
            
            // Get network info
            chainId = session.chainId || (session.netId === 'mainnet' ? '295' : '296');
        }
        
        // Emit connection event if we have accounts
        if (accounts.length > 0) {
            connectionEvents.connect.emit({
                chainId,
                accounts
            });
            
            console.log("Connected Hedera accounts:", accounts);
            console.log("Connected to Hedera chain ID:", chainId);
        } else {
            console.warn("No accounts found in Hedera session");
        }
    } catch (error) {
        console.error("Error handling Hedera session:", error);
    }
}

/**
 * Check if HashPack browser extension is available
 * Uses Hedera browser wallet provider for detection when available,
 * falls back to window.hashpack check
 * @returns {boolean}
 */
function detectHashPack() {
    // Preferred: Use the Hedera wallet provider detection
    if (window.hasHashPackExtension !== undefined) {
        return window.hasHashPackExtension;
    }
    
    // Fallback: Check for window.hashpack directly
    return typeof window.hashpack !== 'undefined';
}

/**
 * Connect directly to HashPack wallet
 * @returns {Promise<string[]>} Connected accounts
 */
async function connectToHashPack() {
    try {
        console.log("Connecting to HashPack extension...");
        
        // Use the Hedera browserWalletProvider if available (preferred)
        if (window.browserWalletProvider && window.hasHashPackExtension) {
            console.log("Using Hedera BrowserWalletProvider for HashPack connection...");
            
            try {
                // Connect directly using the extension
                const session = await window.browserWalletProvider.connect({ wallet: 'hashpack' });
                
                if (session) {
                    console.log("HashPack connected via Hedera library:", session);
                    handleHederaSession(session);
                    return accounts;
                } else {
                    throw new Error("Failed to establish HashPack session");
                }
            } catch (error) {
                console.error("Error connecting via BrowserWalletProvider:", error);
                
                // If the above fails, try legacy approach if window.hashpack exists
                if (typeof window.hashpack !== 'undefined') {
                    return await connectWithLegacyHashPack();
                } else {
                    throw error;
                }
            }
        } 
        // Fall back to the legacy connection method
        else if (typeof window.hashpack !== 'undefined') {
            return await connectWithLegacyHashPack();
        } else {
            throw new Error("HashPack extension not detected");
        }
    } catch (error) {
        console.error("Error connecting to HashPack:", error);
        throw error;
    }
}

/**
 * Connect with legacy HashPack extension API
 * @returns {Promise<string[]>} Connected accounts
 */
async function connectWithLegacyHashPack() {
    try {
        console.log("Connecting with legacy HashPack API...");
        
        const hashpackData = {
            network: "testnet",
            metaData: {
                name: "Overlayz",
                description: "NFT Overlay Tool for Hedera",
                icon: "https://example.com/icon.png" // Replace with your actual icon
            }
        };
        
        // Request connection to HashPack
        const response = await window.hashpack.connect(hashpackData);
        
        if (response && response.success) {
            console.log("HashPack connected:", response);
            
            // Get account ID from pairing data
            if (response.pairingData && response.pairingData.accountIds) {
                accounts = response.pairingData.accountIds;
                // Set chain ID based on network
                chainId = response.pairingData.network === 'mainnet' ? '295' : '296';
                
                // Emit connection event
                connectionEvents.connect.emit({
                    chainId,
                    accounts
                });
                
                return accounts;
            }
        } else {
            console.error("HashPack connection failed:", response);
            throw new Error("HashPack connection failed or was rejected");
        }
    } catch (error) {
        console.error("Error in legacy HashPack connection:", error);
        throw error;
    }
}

/**
 * Shows a custom wallet selection modal
 * @returns {Promise<string>} Selected wallet ID
 */
async function showWalletModal() {
    // Load our custom modal script if needed
    if (!window.HederaWalletModal) {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'js/vendor/walletconnect-modal.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    // Initialize our custom modal
    const modal = new window.HederaWalletModal({
        wallets: [
            {
                id: 'hashpack',
                name: 'HashPack',
                logo: 'https://www.hashpack.app/img/logo.svg',
                mobile: true,
                desktop: true
            },
            {
                id: 'kabila',
                name: 'Kabila',
                logo: 'https://kabila.app/img/logo.png', // Replace with actual logo
                mobile: true,
                desktop: false
            }
        ],
        onShowQr: () => {
            // This will be called if the user selects the QR option
            if (walletProvider) {
                walletProvider.enable();
            }
        }
    });
    
    try {
        // Show the modal and wait for user selection
        const selectedWallet = await modal.open();
        return selectedWallet.id;
    } catch (error) {
        console.log("Modal closed or wallet selection cancelled");
        throw error;
    }
}

/**
 * Connect to wallet with improved UX for mobile and desktop
 * @returns {Promise<string[]>} Connected accounts
 */
async function connectWallet() {
    try {
        console.log("Connecting to wallet...");
        
        // First, ensure we've initialized
        if (!walletProvider && !window.dAppConnector && !window.browserWalletProvider) {
            const initialized = await initWallet();
            if (!initialized) {
                throw new Error("Failed to initialize wallet connection");
            }
        }
        
        // Try direct browser extension connection first (preferred)
        if (detectHashPack()) {
            try {
                console.log("HashPack extension detected, connecting directly...");
                return await connectToHashPack();
            } catch (hashpackError) {
                console.warn("HashPack direct connection failed:", hashpackError);
                // Fall through to wallet selection modal
            }
        }
        
        // If we're on desktop, show our custom wallet selection modal
        if (!isMobileDevice()) {
            try {
                console.log("Showing wallet selection modal...");
                const walletId = await showWalletModal();
                
                // Handle selected wallet
                if (walletId === 'hashpack') {
                    if (window.browserWalletProvider) {
                        console.log("Connecting to HashPack via browser wallet provider...");
                        try {
                            const session = await window.browserWalletProvider.connect({ wallet: 'hashpack' });
                            if (session) {
                                handleHederaSession(session);
                                return accounts;
                            }
                        } catch (error) {
                            console.error("BrowserWalletProvider connect error:", error);
                            
                            // Fall back to legacy connect if that fails
                            if (detectHashPack()) {
                                return await connectWithLegacyHashPack();
                            } else {
                                // Offer download option
                                window.open('https://www.hashpack.app/download', '_blank');
                                throw new Error("HashPack not installed");
                            }
                        }
                    } 
                    // Try connecting to HashPack if selected but not auto-detected earlier
                    else if (detectHashPack()) {
                        return await connectToHashPack();
                    } else {
                        // Open download page or try another method
                        window.open('https://www.hashpack.app/download', '_blank');
                        throw new Error("HashPack not installed");
                    }
                } else if (walletId === 'kabila') {
                    // For Kabila wallet, use the Hedera connector if available
                    if (window.browserWalletProvider) {
                        try {
                            console.log("Connecting to Kabila via browser wallet provider...");
                            const session = await window.browserWalletProvider.connect({ wallet: 'kabila' });
                            if (session) {
                                handleHederaSession(session);
                                return accounts;
                            }
                        } catch (error) {
                            console.error("Error connecting to Kabila:", error);
                        }
                    }
                    
                    // Fall back to standard WalletConnect for Kabila
                    if (walletProvider) {
                        console.log("Connecting via WalletConnect for Kabila...");
                        accounts = await walletProvider.enable();
                        return accounts;
                    }
                }
            } catch (modalError) {
                console.warn("Modal selection failed:", modalError);
                // Fall through to Hedera connector
            }
        }
        
        // Try Hedera connector modal if available and we're here (either mobile or modal failed)
        if (window.dAppConnector) {
            try {
                console.log("Opening Hedera wallet connection modal...");
                const session = await window.dAppConnector.openModal();
                
                if (session) {
                    handleHederaSession(session);
                    return accounts;
                }
            } catch (error) {
                console.error("Error connecting via Hedera WalletConnect:", error);
                console.log("Falling back to standard WalletConnect...");
                // Fall through to standard WalletConnect
            }
        }
        
        // Standard WalletConnect as final fallback
        if (walletProvider) {
            console.log("Requesting accounts via standard WalletConnect...");
            accounts = await walletProvider.enable();
            console.log("Connected accounts:", accounts);
            return accounts;
        }
        
        throw new Error("No wallet connection method available");
    } catch (error) {
        console.error("Error connecting wallet:", error);
        throw error;
    }
}

/**
 * Disconnect from wallet
 */
async function disconnectWallet() {
    try {
        console.log("Disconnecting wallet...");
        
        // Try to clear local storage session data if it exists
        try {
            localStorage.removeItem('hederaAccountId');
            localStorage.removeItem('hederaNetwork');
        } catch (e) {
            console.warn("Could not clear localStorage:", e);
        }
        
        // Check for BrowserWalletProvider (Hedera library direct connection)
        if (window.browserWalletProvider) {
            try {
                console.log("Disconnecting from Hedera BrowserWalletProvider...");
                await window.browserWalletProvider.disconnect();
                console.log("BrowserWalletProvider disconnected");
            } catch (error) {
                console.error("Error disconnecting from BrowserWalletProvider:", error);
            }
        }
        
        // Check for direct HashPack legacy connection
        if (window.hashpack) {
            try {
                console.log("Disconnecting from HashPack extension...");
                await window.hashpack.disconnect();
                console.log("HashPack disconnected");
            } catch (hashpackError) {
                console.error("Error disconnecting from HashPack:", hashpackError);
            }
        }
        
        // Try disconnecting from Hedera WalletConnect
        if (window.dAppConnector) {
            try {
                console.log("Disconnecting from Hedera WalletConnect...");
                await window.dAppConnector.disconnect();
                console.log("Hedera wallet disconnected");
            } catch (error) {
                console.error("Error disconnecting from Hedera WalletConnect:", error);
            }
        }
        
        // Fall back to standard WalletConnect
        if (walletProvider) {
            try {
                console.log("Disconnecting from standard WalletConnect...");
                await walletProvider.disconnect();
                console.log("Standard WalletConnect disconnected");
            } catch (error) {
                console.error("Error disconnecting from WalletConnect:", error);
            }
        }
        
        // Reset state regardless of disconnect success/failure
        accounts = [];
        chainId = null;
        
        // Always notify about disconnection
        connectionEvents.disconnect.emit();
        
        console.log("Wallet disconnection complete");
    } catch (error) {
        console.error("Error in disconnectWallet:", error);
        
        // Reset state on error
        accounts = [];
        chainId = null;
        connectionEvents.disconnect.emit(error);
    }
}

/**
 * Check if wallet is connected
 * @returns {boolean}
 */
function isWalletConnected() {
    // If we have accounts, we're connected through some method
    if (accounts.length > 0) {
        return true;
    }
    
    // Standard WalletConnect check
    if (walletProvider && walletProvider.connected) {
        return true;
    }
    
    // Hedera BrowserWalletProvider check
    if (window.browserWalletProvider && window.browserWalletProvider.isConnected()) {
        return true;
    }
    
    // Hedera WalletConnect check
    if (window.dAppConnector && window.dAppConnector.session) {
        return true;
    }
    
    // Also check local storage in case we have a saved session
    try {
        const savedAccount = localStorage.getItem('hederaAccountId');
        if (savedAccount) {
            // Re-establish accounts array from storage if needed
            if (accounts.length === 0) {
                accounts = [savedAccount];
                const network = localStorage.getItem('hederaNetwork') || 'testnet';
                chainId = network === 'mainnet' ? '295' : '296';
            }
            return true;
        }
    } catch (e) {
        console.warn("Could not check localStorage:", e);
    }
    
    return false;
}

/**
 * Get connected account
 * @returns {string|null}
 */
function getAccount() {
    return accounts.length > 0 ? accounts[0] : null;
}

/**
 * Get current chain ID
 * @returns {string|null}
 */
function getChainId() {
    return chainId;
}

/**
 * Register event callback
 * @param {string} event - Event name ('connect', 'disconnect', 'chainChanged', 'accountsChanged')
 * @param {Function} callback - Callback function
 */
function onEvent(event, callback) {
    if (connectionEvents[event]) {
        return connectionEvents[event].on(callback);
    }
    return null;
}

/**
 * Check if the app is running in a mobile environment
 * @returns {boolean}
 */
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Get account or ID display text (trimmed for UI)
 * @returns {string}
 */
function getDisplayAccount() {
    const account = getAccount();
    if (!account) return '';
    
    // For display purposes - abbreviate long IDs
    if (account.length > 16) {
        return `${account.substring(0, 8)}...${account.substring(account.length - 4)}`;
    }
    
    return account;
}

/**
 * Creates a mock wallet connection for testing
 * This function should only be used during development
 */
function createMockConnection() {
    const mockAccount = "0.0.1234567";
    accounts = [mockAccount];
    chainId = "296"; // Testnet
    
    // Emit connect event
    connectionEvents.connect.emit({
        chainId,
        accounts
    });
    
    console.log("MOCK wallet connection created with account:", mockAccount);
    return accounts;
}

// Export wallet functions
window.walletConnector = {
    init: initWallet,
    connect: connectWallet,
    disconnect: disconnectWallet,
    isConnected: isWalletConnected,
    getAccount: getAccount,
    getChainId: getChainId,
    getDisplayAccount: getDisplayAccount,
    isMobileDevice: isMobileDevice,
    onEvent: onEvent,
    // For testing only
    createMockConnection: createMockConnection
};