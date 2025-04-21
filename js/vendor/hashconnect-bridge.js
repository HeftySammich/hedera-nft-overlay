/**
 * HashConnect Bridge
 * A simple script to ensure HashConnect is properly loaded and available
 */

(function() {
    // Internal loaded flag
    let _isLoaded = false;
    
    // Notify the rest of the app that HashConnect is loaded
    function notifyLoaded() {
        if (!_isLoaded) {
            _isLoaded = true;
            console.log("HashConnect bridge notifying app that library is loaded");
            
            // Create and dispatch a custom event
            const event = new CustomEvent('hashconnect-loaded');
            window.dispatchEvent(event);
        }
    }
    
    // Check if HashConnect is loaded
    function checkLoaded() {
        if (typeof window.hashconnect !== 'undefined') {
            notifyLoaded();
            return true;
        }
        return false;
    }
    
    // Try to load HashConnect
    function loadHashConnect() {
        // Check if already loaded
        if (checkLoaded()) {
            return;
        }
        
        console.log("Attempting to load HashConnect via bridge...");
        
        // Try to load from CDN
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/hashconnect@3.1.0/dist/bundle.min.js";
        script.async = true;
        
        script.onload = function() {
            console.log("HashConnect loaded successfully from bridge");
            checkLoaded();
        };
        
        script.onerror = function() {
            console.error("Failed to load HashConnect from bridge");
            
            // Try backup source
            loadFromBackup();
        };
        
        document.head.appendChild(script);
    }
    
    // Load from backup source
    function loadFromBackup() {
        const backupScript = document.createElement('script');
        backupScript.src = "https://unpkg.com/hashconnect@3.1.0/dist/bundle.min.js";
        backupScript.async = true;
        
        backupScript.onload = function() {
            console.log("HashConnect loaded from bridge backup source");
            checkLoaded();
        };
        
        backupScript.onerror = function() {
            console.error("All attempts to load HashConnect have failed");
        };
        
        document.head.appendChild(backupScript);
    }
    
    // Initialize on page load
    window.addEventListener('load', function() {
        setTimeout(function() {
            if (!checkLoaded()) {
                loadHashConnect();
            }
        }, 1000);
    });
    
    // Public API
    window.hashconnectBridge = {
        isLoaded: function() {
            return _isLoaded || checkLoaded();
        },
        load: loadHashConnect
    };
})();