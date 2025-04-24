// wallet.js

class Wallet {
    constructor() {
        this.dAppConnector = new WalletConnector({
            metadata: {
                name: "Overlayz - NFT Overlay Tool for Hedera",
                description: "Overlayz allows you to customize your Hedera NFTs with unique overlays.",
                url: window.location.origin,
                icons: []
            },
            network: "testnet" // Use Testnet for MVP
        });
        this.accountId = null;
        this.eventListeners = {};
    }

    onEvent(event, callback) {
        this.eventListeners[event] = this.eventListeners[event] || [];
        this.eventListeners[event].push(callback);
    }

    emitEvent(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => callback(data));
        }
    }

    async init() {
        try {
            console.log('Initializing WalletConnector...');
            await this.dAppConnector.init();
            console.log('WalletConnector initialized');
            
            // Listen for connection status changes
            this.dAppConnector.on('session_update', (session) => {
                console.log('Session updated:', session);
                if (session.accounts && session.accounts.length > 0) {
                    this.accountId = session.accounts[0];
                    this.emitEvent('connect', this.accountId);
                } else {
                    this.accountId = null;
                    this.emitEvent('disconnect');
                }
            });

            this.dAppConnector.on('session_delete', () => {
                console.log('Session deleted');
                this.accountId = null;
                this.emitEvent('disconnect');
            });

            // Check for existing session
            const currentSession = this.dAppConnector.getActiveSession();
            if (currentSession && currentSession.accounts && currentSession.accounts.length > 0) {
                this.accountId = currentSession.accounts[0];
                this.emitEvent('connect', this.accountId);
            }
        } catch (error) {
            console.error('Failed to initialize WalletConnector:', error);
            throw error;
        }
    }

    async connect() {
        if (!this.dAppConnector) {
            throw new Error('WalletConnector not initialized');
        }

        try {
            console.log('Attempting to connect to wallet...');
            const accounts = await this.dAppConnector.connect();
            console.log('Connected to wallet:', accounts);
            this.accountId = accounts[0];
            this.emitEvent('connect', this.accountId);
        } catch (error) {
            console.error('Failed to connect to wallet:', error);
            throw error;
        }
    }

    async disconnect() {
        if (!this.dAppConnector) {
            throw new Error('WalletConnector not initialized');
        }

        try {
            console.log('Disconnecting wallet...');
            await this.dAppConnector.disconnect();
            this.accountId = null;
            this.emitEvent('disconnect');
        } catch (error) {
            console.error('Failed to disconnect wallet:', error);
            throw error;
        }
    }

    isConnected() {
        return !!this.accountId;
    }

    getAccountId() {
        return this.accountId;
    }
}

// Expose wallet instance globally
window.wallet = new Wallet();
