/**
 * Custom WalletConnect Modal for Hedera wallets
 * Shows wallet options instead of just QR codes
 */

class HederaWalletModal {
    constructor(options = {}) {
        this.options = {
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
                    name: 'Kabila Wallet',
                    logo: 'https://kabila.app/img/logo.png',
                    mobile: true,
                    desktop: false
                }
            ],
            ...options
        };
        
        this.modalContainer = null;
        this.selectedWallet = null;
        this.modalCallbacks = {
            onSelect: null,
            onClose: null
        };
    }
    
    /**
     * Opens the wallet selection modal
     * @param {Object} callbacks - Callback functions
     * @returns {Promise} Resolves when wallet is selected
     */
    open(callbacks = {}) {
        return new Promise((resolve, reject) => {
            // Set callbacks
            this.modalCallbacks.onSelect = callbacks.onSelect || ((wallet) => resolve(wallet));
            this.modalCallbacks.onClose = callbacks.onClose || (() => reject(new Error('User closed modal')));
            
            // Create modal
            this.createModal();
            
            // Show modal
            this.showModal();
        });
    }
    
    /**
     * Closes the wallet selection modal
     */
    close() {
        if (this.modalContainer) {
            document.body.removeChild(this.modalContainer);
            this.modalContainer = null;
        }
        
        if (this.modalCallbacks.onClose) {
            this.modalCallbacks.onClose();
        }
    }
    
    /**
     * Creates the modal HTML
     */
    createModal() {
        // Create container
        this.modalContainer = document.createElement('div');
        this.modalContainer.className = 'wallet-modal-container';
        this.modalContainer.style.position = 'fixed';
        this.modalContainer.style.top = '0';
        this.modalContainer.style.left = '0';
        this.modalContainer.style.right = '0';
        this.modalContainer.style.bottom = '0';
        this.modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.modalContainer.style.display = 'flex';
        this.modalContainer.style.alignItems = 'center';
        this.modalContainer.style.justifyContent = 'center';
        this.modalContainer.style.zIndex = '9999';
        
        // Create modal box
        const modalBox = document.createElement('div');
        modalBox.className = 'wallet-modal-box';
        modalBox.style.backgroundColor = '#2C2D30';
        modalBox.style.color = 'white';
        modalBox.style.borderRadius = '12px';
        modalBox.style.padding = '24px';
        modalBox.style.width = '90%';
        modalBox.style.maxWidth = '400px';
        modalBox.style.maxHeight = '85vh';
        modalBox.style.overflowY = 'auto';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'wallet-modal-header';
        header.style.marginBottom = '20px';
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.justifyContent = 'space-between';
        
        const title = document.createElement('h3');
        title.textContent = 'Connect your wallet';
        title.style.margin = '0';
        title.style.fontSize = '20px';
        
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.style.backgroundColor = 'transparent';
        closeButton.style.border = 'none';
        closeButton.style.color = 'white';
        closeButton.style.fontSize = '24px';
        closeButton.style.cursor = 'pointer';
        closeButton.onclick = () => this.close();
        
        header.appendChild(title);
        header.appendChild(closeButton);
        
        // Create wallet list
        const walletList = document.createElement('div');
        walletList.className = 'wallet-modal-list';
        
        // Filter wallets based on device
        let availableWallets = this.options.wallets;
        if (this.isMobile()) {
            availableWallets = availableWallets.filter(wallet => wallet.mobile);
        } else {
            availableWallets = availableWallets.filter(wallet => wallet.desktop);
        }
        
        // No wallets message
        if (availableWallets.length === 0) {
            const noWallets = document.createElement('p');
            noWallets.textContent = 'No compatible wallets found for your device.';
            noWallets.style.textAlign = 'center';
            noWallets.style.padding = '20px';
            walletList.appendChild(noWallets);
        } else {
            // Add wallet options
            availableWallets.forEach(wallet => {
                const walletItem = document.createElement('div');
                walletItem.className = 'wallet-modal-item';
                walletItem.style.display = 'flex';
                walletItem.style.alignItems = 'center';
                walletItem.style.padding = '12px 16px';
                walletItem.style.margin = '8px 0';
                walletItem.style.backgroundColor = '#3A3B3F';
                walletItem.style.borderRadius = '8px';
                walletItem.style.cursor = 'pointer';
                walletItem.style.transition = 'all 0.2s ease';
                
                // Add hover effect
                walletItem.onmouseover = () => {
                    walletItem.style.backgroundColor = '#4A4B4F';
                    walletItem.style.transform = 'translateY(-2px)';
                };
                walletItem.onmouseout = () => {
                    walletItem.style.backgroundColor = '#3A3B3F';
                    walletItem.style.transform = 'translateY(0)';
                };
                
                // Handle click
                walletItem.onclick = () => {
                    this.selectedWallet = wallet;
                    if (this.modalCallbacks.onSelect) {
                        this.modalCallbacks.onSelect(wallet);
                    }
                    this.close();
                };
                
                // Wallet logo
                const logo = document.createElement('img');
                logo.src = wallet.logo;
                logo.alt = `${wallet.name} logo`;
                logo.style.width = '32px';
                logo.style.height = '32px';
                logo.style.marginRight = '12px';
                logo.style.borderRadius = '4px';
                
                // Wallet name
                const name = document.createElement('span');
                name.textContent = wallet.name;
                name.style.fontSize = '16px';
                name.style.fontWeight = '500';
                
                walletItem.appendChild(logo);
                walletItem.appendChild(name);
                walletList.appendChild(walletItem);
            });
        }
        
        // Add QR code option for desktop (when needed)
        if (!this.isMobile() && this.options.showQrOption !== false) {
            const qrOption = document.createElement('div');
            qrOption.className = 'wallet-modal-item';
            qrOption.style.display = 'flex';
            qrOption.style.alignItems = 'center';
            qrOption.style.padding = '12px 16px';
            qrOption.style.margin = '8px 0';
            qrOption.style.backgroundColor = '#3A3B3F';
            qrOption.style.borderRadius = '8px';
            qrOption.style.cursor = 'pointer';
            qrOption.style.transition = 'all 0.2s ease';
            
            // Add hover effect
            qrOption.onmouseover = () => {
                qrOption.style.backgroundColor = '#4A4B4F';
                qrOption.style.transform = 'translateY(-2px)';
            };
            qrOption.onmouseout = () => {
                qrOption.style.backgroundColor = '#3A3B3F';
                qrOption.style.transform = 'translateY(0)';
            };
            
            // QR code icon (simple placeholder)
            const qrIcon = document.createElement('div');
            qrIcon.style.width = '32px';
            qrIcon.style.height = '32px';
            qrIcon.style.backgroundColor = '#ddd';
            qrIcon.style.marginRight = '12px';
            qrIcon.style.borderRadius = '4px';
            qrIcon.style.display = 'flex';
            qrIcon.style.alignItems = 'center';
            qrIcon.style.justifyContent = 'center';
            qrIcon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3H9V9H3V3Z" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 3H21V9H15V3Z" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 15H9V21H3V15Z" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 15H21V21H15V15Z" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            
            // Option name
            const name = document.createElement('span');
            name.textContent = 'Scan with Mobile Wallet';
            name.style.fontSize = '16px';
            name.style.fontWeight = '500';
            
            qrOption.appendChild(qrIcon);
            qrOption.appendChild(name);
            
            // Handle click - trigger QR code display
            qrOption.onclick = () => {
                if (this.options.onShowQr) {
                    this.options.onShowQr();
                }
                this.close();
            };
            
            walletList.appendChild(qrOption);
        }
        
        // Create footer with install info
        const footer = document.createElement('div');
        footer.className = 'wallet-modal-footer';
        footer.style.marginTop = '20px';
        footer.style.textAlign = 'center';
        footer.style.fontSize = '14px';
        footer.style.color = '#aaa';
        footer.innerHTML = `Don't have a wallet? <a href="https://www.hashpack.app/download" target="_blank" style="color:#7d4cdb; text-decoration:none;">Install HashPack</a>`;
        
        // Assemble modal
        modalBox.appendChild(header);
        modalBox.appendChild(walletList);
        modalBox.appendChild(footer);
        this.modalContainer.appendChild(modalBox);
    }
    
    /**
     * Shows the modal
     */
    showModal() {
        document.body.appendChild(this.modalContainer);
    }
    
    /**
     * Checks if the device is mobile
     * @returns {boolean}
     */
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
}

// Export for use in wallet.js
window.HederaWalletModal = HederaWalletModal;