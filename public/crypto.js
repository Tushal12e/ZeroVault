const ZeroCrypto = {
    // Generate a random AES-GCM key
    generateKey: async () => {
        return await window.crypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: 256
            },
            true,
            ["encrypt", "decrypt"]
        );
    },

    // Derive key from password (PBKDF2)
    deriveKeyFromPassword: async (password, salt) => {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            enc.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );

        return await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
    },

    // Export key to raw format (for URL)
    exportKey: async (key) => {
        const exported = await window.crypto.subtle.exportKey("raw", key);
        return Array.from(new Uint8Array(exported))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    },

    // Import key from raw format (from URL)
    importKey: async (hexString) => {
        const keyBytes = new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        return await window.crypto.subtle.importKey(
            "raw",
            keyBytes,
            "AES-GCM",
            true,
            ["encrypt", "decrypt"]
        );
    },

    // Encrypt file content
    encrypt: async (file, key, salt = null) => {
        const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12 bytes IV for AES-GCM
        const fileBuffer = await file.arrayBuffer();

        const encryptedContent = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            fileBuffer
        );

        // Combine Salt (if any) + IV + Encrypted Data
        let combinedBuffer;
        if (salt) {
            // Format: [Salt (16 bytes)] + [IV (12 bytes)] + [Data]
            combinedBuffer = new Uint8Array(salt.length + iv.length + encryptedContent.byteLength);
            combinedBuffer.set(salt);
            combinedBuffer.set(iv, salt.length);
            combinedBuffer.set(new Uint8Array(encryptedContent), salt.length + iv.length);
        } else {
            // Format: [IV (12 bytes)] + [Data]
            combinedBuffer = new Uint8Array(iv.length + encryptedContent.byteLength);
            combinedBuffer.set(iv);
            combinedBuffer.set(new Uint8Array(encryptedContent), iv.length);
        }

        return new Blob([combinedBuffer]);
    },

    // Decrypt file content
    decrypt: async (encryptedBlob, key, hasPassword = false) => {
        const buffer = await encryptedBlob.arrayBuffer();

        let iv, data;

        if (hasPassword) {
            // Format: [Salt (16)] [IV (12)] [Data]
            // Salt is skipped (0-16) as it was used for key derivation
            iv = buffer.slice(16, 16 + 12);
            data = buffer.slice(16 + 12);
        } else {
            // Format: [IV (12)] [Data]
            iv = buffer.slice(0, 12);
            data = buffer.slice(12);
        }

        const decryptedContent = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: new Uint8Array(iv)
            },
            key,
            data
        );

        return decryptedContent;
    }
};
