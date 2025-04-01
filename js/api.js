/**
 * API Service for Overlayz
 * Handles all interactions with Hedera Mirror Node API
 */

// Hedera Mirror Node API base URLs
const MAINNET_API_BASE = 'https://mainnet-public.mirrornode.hedera.com/api/v1';
const TESTNET_API_BASE = 'https://testnet.mirrornode.hedera.com/api/v1';

// Default to mainnet
const API_BASE = MAINNET_API_BASE;

/**
 * Get all NFT collections (token IDs) owned by an account
 * @param {string} accountId - Hedera account ID
 * @returns {Promise<Array>} Collections list
 */
async function getNFTCollections(accountId) {
    try {
        // Show loading state
        showLoading();
        
        // Get the account's token balances
        const endpoint = `${API_BASE}/accounts/${accountId}/tokens`;
        const response = await fetch(endpoint);
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        // Filter to only include NFT tokens (non-fungible)
        const collections = [];
        
        if (data.tokens && data.tokens.length > 0) {
            // For each token, check if it's an NFT by querying token info
            const nftPromises = data.tokens.map(async (token) => {
                try {
                    const tokenInfo = await getTokenInfo(token.token_id);
                    if (tokenInfo.type === 'NON_FUNGIBLE_UNIQUE') {
                        // This is an NFT collection (token)
                        collections.push({
                            id: token.token_id,
                            name: tokenInfo.name,
                            symbol: tokenInfo.symbol,
                            totalSupply: tokenInfo.total_supply,
                            imageUrl: await getCollectionImageUrl(token.token_id)
                        });
                    }
                } catch (err) {
                    console.error(`Error fetching token info for ${token.token_id}:`, err);
                }
            });
            
            await Promise.all(nftPromises);
        }
        
        // Hide loading
        hideLoading();
        
        return collections;
    } catch (error) {
        hideLoading();
        console.error('Error fetching NFT collections:', error);
        return [];
    }
}

/**
 * Get info about a token
 * @param {string} tokenId - Token ID
 * @returns {Promise<Object>} Token info
 */
async function getTokenInfo(tokenId) {
    try {
        const endpoint = `${API_BASE}/tokens/${tokenId}`;
        const response = await fetch(endpoint);
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Error fetching token info for ${tokenId}:`, error);
        throw error;
    }
}

/**
 * Get the collection image URL using the first NFT in the collection
 * @param {string} tokenId - Token ID
 * @returns {Promise<string>} Image URL
 */
async function getCollectionImageUrl(tokenId) {
    try {
        // Get the first NFT in the collection
        const nfts = await getNFTsByTokenId(tokenId, 1);
        
        if (nfts.length > 0 && nfts[0].metadata?.image) {
            // Return the image URL from metadata
            return getIPFSGatewayUrl(nfts[0].metadata.image);
        }
        
        // Default placeholder image
        return 'https://via.placeholder.com/150?text=NFT';
    } catch (error) {
        console.error(`Error fetching collection image for ${tokenId}:`, error);
        return 'https://via.placeholder.com/150?text=NFT';
    }
}

/**
 * Convert IPFS URL to public gateway URL
 * @param {string} ipfsUrl - IPFS URL
 * @returns {string} Gateway URL
 */
function getIPFSGatewayUrl(ipfsUrl) {
    if (!ipfsUrl) {
        return 'https://via.placeholder.com/150?text=NFT';
    }
    
    if (ipfsUrl.startsWith('ipfs://')) {
        // Convert IPFS URL to use a public gateway
        const cid = ipfsUrl.replace('ipfs://', '');
        return `https://ipfs.io/ipfs/${cid}`;
    }
    
    return ipfsUrl;
}

/**
 * Get NFTs for a specific token ID (collection)
 * @param {string} tokenId - Token ID
 * @param {number} limit - Max number of NFTs to return
 * @returns {Promise<Array>} NFTs list
 */
async function getNFTsByTokenId(tokenId, limit = 100) {
    try {
        // Show loading state
        showLoading();
        
        const endpoint = `${API_BASE}/tokens/${tokenId}/nfts?limit=${limit}`;
        const response = await fetch(endpoint);
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        const nfts = [];
        
        if (data.nfts && data.nfts.length > 0) {
            // Process each NFT
            const nftPromises = data.nfts.map(async (nft) => {
                try {
                    // Get metadata from the token URI
                    const metadata = await fetchNFTMetadata(nft.metadata);
                    
                    nfts.push({
                        id: nft.serial_number,
                        tokenId: tokenId,
                        serialNumber: nft.serial_number,
                        metadata: metadata,
                        imageUrl: metadata.image ? getIPFSGatewayUrl(metadata.image) : 'https://via.placeholder.com/300?text=NFT'
                    });
                } catch (err) {
                    console.error(`Error fetching metadata for NFT ${nft.serial_number}:`, err);
                    
                    // Add NFT with placeholder data
                    nfts.push({
                        id: nft.serial_number,
                        tokenId: tokenId,
                        serialNumber: nft.serial_number,
                        metadata: {},
                        imageUrl: 'https://via.placeholder.com/300?text=NFT'
                    });
                }
            });
            
            await Promise.all(nftPromises);
        }
        
        // Hide loading
        hideLoading();
        
        return nfts;
    } catch (error) {
        hideLoading();
        console.error('Error fetching NFTs:', error);
        return [];
    }
}

/**
 * Fetch NFT metadata from metadata URL
 * @param {string} metadataBytes - Metadata bytes from Hedera API
 * @returns {Promise<Object>} Metadata
 */
async function fetchNFTMetadata(metadataBytes) {
    try {
        if (!metadataBytes) {
            return {};
        }
        
        // Convert hex string to UTF-8
        let metadataString = '';
        
        try {
            // Try to decode hex metadata to string
            metadataString = hexToUtf8(metadataBytes);
        } catch (error) {
            console.error('Error decoding metadata bytes:', error);
            return {};
        }
        
        // Check if it's a URL
        if (metadataString.startsWith('http') || metadataString.startsWith('ipfs://')) {
            // Convert IPFS URL if needed
            const metadataUrl = metadataString.startsWith('ipfs://') 
                ? getIPFSGatewayUrl(metadataString)
                : metadataString;
                
            // Fetch metadata from URL
            try {
                const response = await fetch(metadataUrl);
                if (!response.ok) {
                    throw new Error(`Metadata fetch failed: ${response.status}`);
                }
                return await response.json();
            } catch (error) {
                console.error('Error fetching metadata from URL:', error);
                return {};
            }
        } else {
            // Try parsing as JSON
            try {
                return JSON.parse(metadataString);
            } catch (error) {
                console.error('Error parsing metadata as JSON:', error);
                return {};
            }
        }
    } catch (error) {
        console.error('Error processing metadata:', error);
        return {};
    }
}

/**
 * Convert hex string to UTF-8 string
 * @param {string} hex - Hex string
 * @returns {string} UTF-8 string
 */
function hexToUtf8(hex) {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
}

/**
 * Get NFTs owned by an account for a specific token ID
 * @param {string} accountId - Account ID
 * @param {string} tokenId - Token ID
 * @returns {Promise<Array>} NFTs list
 */
async function getOwnedNFTs(accountId, tokenId) {
    try {
        // Show loading state
        showLoading();
        
        const endpoint = `${API_BASE}/accounts/${accountId}/tokens/${tokenId}/nfts`;
        const response = await fetch(endpoint);
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        const nfts = [];
        
        if (data.nfts && data.nfts.length > 0) {
            // Process each NFT
            const nftPromises = data.nfts.map(async (nft) => {
                try {
                    // Get metadata from the token URI
                    const metadata = await fetchNFTMetadata(nft.metadata);
                    
                    nfts.push({
                        id: nft.serial_number,
                        tokenId: tokenId,
                        serialNumber: nft.serial_number,
                        metadata: metadata,
                        imageUrl: metadata.image ? getIPFSGatewayUrl(metadata.image) : 'https://via.placeholder.com/300?text=NFT'
                    });
                } catch (err) {
                    console.error(`Error fetching metadata for NFT ${nft.serial_number}:`, err);
                    
                    // Add NFT with placeholder data
                    nfts.push({
                        id: nft.serial_number,
                        tokenId: tokenId,
                        serialNumber: nft.serial_number,
                        metadata: {},
                        imageUrl: 'https://via.placeholder.com/300?text=NFT'
                    });
                }
            });
            
            await Promise.all(nftPromises);
        }
        
        // Hide loading
        hideLoading();
        
        return nfts;
    } catch (error) {
        hideLoading();
        console.error('Error fetching owned NFTs:', error);
        return [];
    }
}

/**
 * Show loading overlay
 * @param {string} message - Optional message to display
 */
function showLoading(message) {
    if (window.showLoading) {
        window.showLoading(message);
    } else {
        const loadingOverlay = document.getElementById('loading-overlay');
        const loadingMessage = document.getElementById('loading-message');
        
        if (message && loadingMessage) {
            loadingMessage.textContent = message;
        }
        
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }
    }
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    if (window.hideLoading) {
        window.hideLoading();
    } else {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
}

// Export API functions
window.hederaApi = {
    getNFTCollections,
    getNFTsByTokenId,
    getOwnedNFTs
};