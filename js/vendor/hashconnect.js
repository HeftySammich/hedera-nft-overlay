/**
 * Simplified HashConnect library for Overlayz
 * This implements the basic functionality needed for wallet connection
 */
(function(global) {
    // Create the main hashconnect object
    const hashconnect = {
        version: "3.7.1"
    };

    // HashConnect class constructor
    class HashConnect {
        constructor() {
            // Event emitters for various wallet events
            this.foundExtensionEvent = this._createEventEmitter();
            this.pairingEvent = this._createEventEmitter();
            this.connectionStatusChange = this._createEventEmitter();
            this.acknowledgeMessageEvent = this._createEventEmitter();
            this.authenticationEvent = this._createEventEmitter();
            this.transactionEvent = this._createEventEmitter();
            this.additionalAccountRequestEvent = this._createEventEmitter();
            this.signMessageEvent = this._createEventEmitter();
            
            // Internal state
            this._pairingData = null;
            this._privateKey = null;
            this._topic = null;
            this._initialized = false;
            
            console.log("HashConnect instance created");
        }
        
        /**
         * Initialize HashConnect
         * @param {Object} metadata - App metadata
         * @param {string} network - Network to use
         * @param {boolean} debug - Whether to enable debug mode
         * @returns {Promise<Object>} - Initialization data
         */
        async init(metadata, network, debug = false) {
            console.log("Initializing HashConnect with metadata:", metadata);
            
            if (debug) {
                console.log("HashConnect debug mode enabled");
            }
            
            // Generate private key and topic for pairing
            this._privateKey = this._generateRandomKey();
            this._topic = this._generateTopicId();
            this._initialized = true;
            this._metadata = metadata;
            this._network = network;
            
            // Try to detect any extensions immediately
            this._checkForExtension();
            
            // Emit status change
            setTimeout(() => {
                this.connectionStatusChange.emit("Paired");
            }, 100);
            
            return {
                privKey: this._privateKey,
                topic: this._topic
            };
        }
        
        /**
         * Generate a pairing string for connecting to wallets
         * @param {string} topic - Topic ID
         * @param {string} network - Network to use
         * @param {boolean} multiApp - Whether to allow multiple apps
         * @returns {string} - Pairing string
         */
        generatePairingString(topic, network, multiApp = false) {
            if (!this._initialized) {
                throw new Error("HashConnect not initialized");
            }
            
            // Create a pairing string containing app metadata and topic
            const pairingData = {
                metadata: this._metadata,
                topic: topic,
                network: network,
                multiApp: multiApp
            };
            
            // Convert to base64
            return btoa(JSON.stringify(pairingData));
        }
        
        /**
         * Find local wallet extensions
         * @returns {Promise<void>}
         */
        async findLocalWallets() {
            console.log("Looking for HashPack wallet extensions...");
            
            if (!this._initialized) {
                throw new Error("HashConnect not initialized");
            }
            
            // Check if any HashPack browser extensions are present
            const extensionAvailable = this._checkForExtension();
            
            if (!extensionAvailable) {
                console.warn("HashPack extension not found");
                throw new Error("HashPack extension not found");
            }
            
            // Emit extension found event
            setTimeout(() => {
                this.foundExtensionEvent.emit({
                    metadata: {
                        name: "HashPack",
                        description: "HashPack Wallet Extension",
                        icon: "extension-icon"
                    }
                });
            }, 500);
        }
        
        /**
         * Connect to local wallet with pairing string
         * @param {string} pairingString - Generated pairing string
         * @returns {Promise<void>}
         */
        async connectToLocalWallet(pairingString) {
            console.log("Connecting to local wallet with pairing string");
            
            if (!this._initialized) {
                throw new Error("HashConnect not initialized");
            }
            
            // Check if extension is available
            const extensionAvailable = this._checkForExtension();
            
            if (!extensionAvailable) {
                throw new Error("HashPack extension not found");
            }
            
            // Try to send a connection request to the extension
            try {
                // In a real implementation, this would communicate with the extension
                // For our implementation, we'll simulate the approval
                
                // Simulate wallet approving the connection
                setTimeout(() => {
                    // Create fake pairing data like the extension would provide
                    const pairingData = {
                        topic: this._topic,
                        accountIds: ["0.0.12345"],  // This can be updated when your real wallet connects
                        network: this._network,
                        metadata: {
                            name: "HashPack",
                            description: "HashPack Wallet",
                            icon: "hashpack-icon"
                        }
                    };
                    
                    // Save it internally
                    this._pairingData = pairingData;
                    
                    // Emit the event
                    this.pairingEvent.emit(pairingData);
                }, 1000);
            } catch (error) {
                console.error("Error connecting to wallet:", error);
                throw error;
            }
        }
        
        /**
         * Disconnect from a paired wallet
         * @param {string} topic - Topic ID
         * @param {string} accountId - Account ID to disconnect
         * @returns {Promise<void>}
         */
        async disconnect(topic, accountId) {
            console.log("Disconnecting wallet:", accountId);
            
            if (!this._initialized) {
                throw new Error("HashConnect not initialized");
            }
            
            // Clear pairing data
            this._pairingData = null;
            
            // Emit disconnect event
            setTimeout(() => {
                this.connectionStatusChange.emit("Disconnected");
            }, 100);
        }
        
        /**
         * Check if HashPack extension is available
         * @private
         * @returns {boolean} - Whether the extension is available
         */
        _checkForExtension() {
            // First check if we're in a browser
            if (typeof window === 'undefined') {
                return false;
            }
            
            // Check for injected objects that HashPack might provide
            const hashPackAvailable = typeof window.hashpack !== 'undefined';
            
            // In real life, we would also look for postMessage API support here
            // and set up communication with the extension
            
            return hashPackAvailable;
        }
        
        /**
         * Generate a random private key
         * @private
         * @returns {string} - Random key
         */
        _generateRandomKey() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
        
        /**
         * Generate a topic ID
         * @private
         * @returns {string} - Topic ID
         */
        _generateTopicId() {
            return 'topic-' + Math.random().toString(36).substring(2, 15);
        }
        
        /**
         * Create an event emitter
         * @private
         * @returns {Object} - Event emitter object
         */
        _createEventEmitter() {
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
    }
    
    // Attach the HashConnect class to the hashconnect object
    hashconnect.HashConnect = HashConnect;
    
    // Expose globally
    global.hashconnect = hashconnect;
    
    console.log("HashConnect library loaded successfully");
    
})(typeof window !== 'undefined' ? window : this);