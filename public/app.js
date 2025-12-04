document.addEventListener('DOMContentLoaded', async () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadStatus = document.getElementById('upload-status');
    const resultArea = document.getElementById('result-area');
    const shareLinkInput = document.getElementById('share-link');
    const copyBtn = document.getElementById('copy-btn');

    const uploadSection = document.getElementById('upload-section');
    const downloadSection = document.getElementById('download-section');
    const decryptBtn = document.getElementById('decrypt-btn');
    const downloadStatus = document.getElementById('download-status');

    // Check if we are in Download Mode (URL has hash)
    if (window.location.hash.length > 1) {
        uploadSection.classList.add('hidden');
        downloadSection.classList.remove('hidden');
        handleDownloadMode();
    }

    // --- Upload Mode Logic ---

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#0f0';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = '#333';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#333';
        if (e.dataTransfer.files.length) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            handleFileUpload(fileInput.files[0]);
        }
    });

    async function handleFileUpload(file) {
        uploadStatus.textContent = 'Generating Keys...';
        const passwordInput = document.getElementById('password-input');
        const password = passwordInput ? passwordInput.value.trim() : '';
        const burnCheckbox = document.getElementById('burn-checkbox');
        const burn = burnCheckbox ? burnCheckbox.checked : false;

        try {
            let key, keyString, salt;

            // 1. Generate Key
            if (password) {
                salt = window.crypto.getRandomValues(new Uint8Array(16));
                key = await ZeroCrypto.deriveKeyFromPassword(password, salt);
                keyString = 'PASSWORD'; // Key is not in URL for password protected files
            } else {
                key = await ZeroCrypto.generateKey();
                keyString = await ZeroCrypto.exportKey(key);
            }

            // 2. Encrypt File
            uploadStatus.textContent = 'Encrypting...';
            const encryptedBlob = await ZeroCrypto.encrypt(file, key, salt);

            // 3. Upload Encrypted Blob
            uploadStatus.textContent = 'Uploading...';
            const formData = new FormData();
            // Use a random ID for the filename on server
            const randomId = Math.random().toString(36).substring(2, 15);
            formData.append('file', encryptedBlob, randomId);

            // Add burn flag to URL
            const response = await fetch(`/upload?burn=${burn}`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                const fileId = data.filename;

                // 4. Show Result
                // Link Format: #fileId:keyString:base64FileName
                const finalKeyPart = password ? 'PASSWORD' : keyString;
                const encodedFileName = btoa(file.name); // Hide filename
                const fullLink = `${window.location.origin}/#${fileId}:${finalKeyPart}:${encodedFileName}`;

                shareLinkInput.value = fullLink;
                resultArea.classList.remove('hidden');
                uploadStatus.textContent = 'Done.';
            } else {
                uploadStatus.textContent = 'Upload Failed.';
            }

        } catch (err) {
            console.error(err);
            uploadStatus.textContent = 'Error: ' + err.message;
        }
    }

    copyBtn.addEventListener('click', () => {
        shareLinkInput.select();
        document.execCommand('copy');
        copyBtn.textContent = 'COPIED';
        setTimeout(() => copyBtn.textContent = 'COPY', 2000);
    });


    // --- Download Mode Logic ---

    function handleDownloadMode() {
        // Hash format: #fileId:keyString:base64FileName
        const hash = window.location.hash.substring(1); // Remove #
        const parts = hash.split(':');

        if (parts.length < 3) {
            downloadStatus.textContent = 'Invalid Link.';
            return;
        }

        const [fileId, keyString, encodedFileName] = parts;

        // Decode filename (Base64)
        let decodedFileName = 'downloaded_file';
        try {
            decodedFileName = atob(encodedFileName);
        } catch (e) {
            console.error('Filename decode error', e);
            decodedFileName = decodeURIComponent(encodedFileName); // Fallback
        }

        const isPasswordProtected = keyString === 'PASSWORD';

        if (isPasswordProtected) {
            document.getElementById('password-prompt').classList.remove('hidden');
        }

        decryptBtn.addEventListener('click', async () => {
            downloadStatus.textContent = 'Downloading Encrypted File...';

            let key;
            try {
                // 1. Download Encrypted Blob
                const response = await fetch(`/files/${fileId}`);
                if (!response.ok) throw new Error('File not found (or burnt)');
                const encryptedBlob = await response.blob();

                // 2. Decrypt
                downloadStatus.textContent = 'Decrypting...';

                if (isPasswordProtected) {
                    const password = document.getElementById('decrypt-password').value;
                    if (!password) {
                        alert('Please enter password');
                        return;
                    }
                    // Extract salt from first 16 bytes
                    const buffer = await encryptedBlob.arrayBuffer();
                    const salt = new Uint8Array(buffer.slice(0, 16));
                    key = await ZeroCrypto.deriveKeyFromPassword(password, salt);
                } else {
                    key = await ZeroCrypto.importKey(keyString);
                }

                const decryptedBuffer = await ZeroCrypto.decrypt(encryptedBlob, key, isPasswordProtected);

                // 3. Trigger Download
                downloadStatus.textContent = 'Done.';
                const blob = new Blob([decryptedBuffer]);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = decodedFileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

            } catch (err) {
                console.error(err);
                downloadStatus.textContent = 'Error: ' + err.message;
            }
        });
    }
});
