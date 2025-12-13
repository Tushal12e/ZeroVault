document.addEventListener('DOMContentLoaded', async () => {
    // ============ DOM Elements ============
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadStatus = document.getElementById('upload-status');
    const resultArea = document.getElementById('result-area');
    const shareLinkInput = document.getElementById('share-link');
    const copyBtn = document.getElementById('copy-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const uploadSection = document.getElementById('upload-section');
    const downloadSection = document.getElementById('download-section');
    const decryptBtn = document.getElementById('decrypt-btn');
    const downloadStatus = document.getElementById('download-status');
    const themeToggle = document.getElementById('theme-toggle');
    const terminalToggle = document.getElementById('terminal-toggle');
    const soundToggle = document.getElementById('sound-toggle');
    const progressContainer = document.getElementById('progress-container');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const fileInfo = document.getElementById('file-info');
    const selectedFileName = document.getElementById('selected-file-name');
    const selectedFileSize = document.getElementById('selected-file-size');
    const fileTypeIcon = document.getElementById('file-type-icon');
    const removeFileBtn = document.getElementById('remove-file');
    const uploadAnother = document.getElementById('upload-another');
    const expirySelect = document.getElementById('expiry-select');
    const expiryText = document.getElementById('expiry-text');
    const advancedToggle = document.getElementById('advanced-toggle');
    const advancedOptions = document.getElementById('advanced-options');
    const matrixCanvas = document.getElementById('matrix-canvas');

    let selectedFile = null;
    let soundEnabled = true;
    let currentMasterToken = null;
    let currentFileId = null;

    // ============ Initialize ============
    initTheme();
    initTerminalTheme();
    initSounds();
    initKeyboardShortcuts();

    // Check Download Mode
    if (window.location.hash.length > 1) {
        uploadSection.classList.add('hidden');
        downloadSection.classList.remove('hidden');
        handleDownloadMode();
    }

    // ============ Theme Toggle ============
    function initTheme() {
        const savedTheme = localStorage.getItem('zerovault-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    themeToggle?.addEventListener('click', () => {
        playSound('click');
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('zerovault-theme', newTheme);
    });

    // ============ Terminal Theme Toggle ============
    function initTerminalTheme() {
        const terminalEnabled = localStorage.getItem('zerovault-terminal') === 'true';
        document.documentElement.setAttribute('data-terminal', terminalEnabled);
        if (terminalEnabled) {
            startMatrixRain();
        }
    }

    terminalToggle?.addEventListener('click', () => {
        playSound('click');
        const current = document.documentElement.getAttribute('data-terminal') === 'true';
        document.documentElement.setAttribute('data-terminal', !current);
        localStorage.setItem('zerovault-terminal', !current);

        if (!current) {
            startMatrixRain();
        } else {
            stopMatrixRain();
        }
    });

    // ============ Matrix Rain Effect ============
    let matrixInterval = null;

    function startMatrixRain() {
        if (!matrixCanvas) return;
        matrixCanvas.classList.remove('hidden');

        const ctx = matrixCanvas.getContext('2d');
        matrixCanvas.width = window.innerWidth;
        matrixCanvas.height = window.innerHeight;

        const chars = 'ZEROVAULT01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
        const charArray = chars.split('');
        const fontSize = 14;
        const columns = matrixCanvas.width / fontSize;
        const drops = Array(Math.floor(columns)).fill(1);

        function draw() {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
            ctx.fillStyle = '#0f0';
            ctx.font = fontSize + 'px monospace';

            for (let i = 0; i < drops.length; i++) {
                const text = charArray[Math.floor(Math.random() * charArray.length)];
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > matrixCanvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        }

        matrixInterval = setInterval(draw, 50);
    }

    function stopMatrixRain() {
        if (matrixInterval) {
            clearInterval(matrixInterval);
            matrixInterval = null;
        }
        if (matrixCanvas) {
            matrixCanvas.classList.add('hidden');
            const ctx = matrixCanvas.getContext('2d');
            ctx.clearRect(0, 0, matrixCanvas.width, matrixCanvas.height);
        }
    }

    // ============ Sound Effects ============
    function initSounds() {
        soundEnabled = localStorage.getItem('zerovault-sounds') !== 'false';
        updateSoundIcon();
    }

    soundToggle?.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        localStorage.setItem('zerovault-sounds', soundEnabled);
        updateSoundIcon();
        if (soundEnabled) playSound('click');
    });

    function updateSoundIcon() {
        const onIcon = soundToggle?.querySelector('.sound-icon.on');
        const offIcon = soundToggle?.querySelector('.sound-icon.off');
        if (onIcon && offIcon) {
            onIcon.classList.toggle('hidden', !soundEnabled);
            offIcon.classList.toggle('hidden', soundEnabled);
        }
    }

    function playSound(type) {
        if (!soundEnabled) return;

        try {
            // Create audio context for better sound generation
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            switch (type) {
                case 'click':
                    oscillator.frequency.value = 800;
                    gainNode.gain.value = 0.1;
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 0.05);
                    break;
                case 'encrypt':
                    oscillator.frequency.value = 400;
                    gainNode.gain.value = 0.1;
                    oscillator.start();
                    oscillator.frequency.linearRampToValueAtTime(800, audioContext.currentTime + 0.2);
                    oscillator.stop(audioContext.currentTime + 0.2);
                    break;
                case 'success':
                    oscillator.frequency.value = 523.25; // C5
                    gainNode.gain.value = 0.1;
                    oscillator.start();
                    setTimeout(() => {
                        const osc2 = audioContext.createOscillator();
                        const gain2 = audioContext.createGain();
                        osc2.connect(gain2);
                        gain2.connect(audioContext.destination);
                        osc2.frequency.value = 659.25; // E5
                        gain2.gain.value = 0.1;
                        osc2.start();
                        osc2.stop(audioContext.currentTime + 0.15);
                    }, 100);
                    setTimeout(() => {
                        const osc3 = audioContext.createOscillator();
                        const gain3 = audioContext.createGain();
                        osc3.connect(gain3);
                        gain3.connect(audioContext.destination);
                        osc3.frequency.value = 783.99; // G5
                        gain3.gain.value = 0.1;
                        osc3.start();
                        osc3.stop(audioContext.currentTime + 0.2);
                    }, 200);
                    oscillator.stop(audioContext.currentTime + 0.15);
                    break;
                case 'error':
                    oscillator.frequency.value = 200;
                    gainNode.gain.value = 0.15;
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 0.3);
                    break;
            }
        } catch (e) {
            console.log('Audio not supported');
        }
    }

    // ============ Confetti Effect ============
    function triggerConfetti() {
        if (typeof confetti !== 'function') return;

        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#00d4ff', '#7c3aed', '#10b981', '#f59e0b']
        });
    }

    // ============ Keyboard Shortcuts ============
    function initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+V - Paste file from clipboard
            if (e.ctrlKey && e.key === 'v') {
                handlePaste();
            }

            // Ctrl+Enter - Upload
            if (e.ctrlKey && e.key === 'Enter') {
                if (selectedFile && !uploadBtn.disabled) {
                    e.preventDefault();
                    uploadBtn.click();
                }
            }

            // Escape - Clear selection
            if (e.key === 'Escape') {
                if (selectedFile) {
                    removeFileBtn?.click();
                }
            }
        });

        // Paste event for clipboard files
        document.addEventListener('paste', handlePaste);
    }

    async function handlePaste(e) {
        if (e) e.preventDefault();

        try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                for (const type of item.types) {
                    if (type.startsWith('image/') || type === 'application/octet-stream') {
                        const blob = await item.getType(type);
                        const file = new File([blob], `pasted-${Date.now()}.${type.split('/')[1] || 'bin'}`, { type });
                        selectFile(file);
                        playSound('click');
                        return;
                    }
                }
            }
        } catch (err) {
            // Fallback for older browsers
            if (e && e.clipboardData) {
                const files = e.clipboardData.files;
                if (files.length > 0) {
                    selectFile(files[0]);
                    playSound('click');
                }
            }
        }
    }

    // ============ Password Toggle ============
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            playSound('click');
            const input = btn.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                btn.textContent = '🙈';
            } else {
                input.type = 'password';
                btn.textContent = '👁️';
            }
        });
    });

    // ============ Advanced Options Toggle ============
    if (advancedToggle && advancedOptions) {
        advancedToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            playSound('click');
            advancedToggle.classList.toggle('open');
            advancedOptions.classList.toggle('hidden');
        });
    }


    // ============ File Helpers ============
    function getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'webp': '🖼️', 'svg': '🖼️',
            'pdf': '📕', 'doc': '📄', 'docx': '📄', 'txt': '📝', 'rtf': '📝',
            'xls': '📊', 'xlsx': '📊', 'csv': '📊',
            'ppt': '📽️', 'pptx': '📽️',
            'js': '💻', 'ts': '💻', 'py': '🐍', 'html': '🌐', 'css': '🎨', 'json': '📋',
            'zip': '📦', 'rar': '📦', '7z': '📦', 'tar': '📦', 'gz': '📦',
            'mp4': '🎬', 'avi': '🎬', 'mov': '🎬', 'mkv': '🎬', 'webm': '🎬',
            'mp3': '🎵', 'wav': '🎵', 'flac': '🎵', 'ogg': '🎵',
            'exe': '⚙️', 'msi': '⚙️', 'dmg': '⚙️', 'apk': '📱',
        };
        return icons[ext] || '📁';
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // ============ Upload Mode Logic ============
    dropZone.addEventListener('click', () => {
        playSound('click');
        fileInput.click();
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');

        // Handle dropped files (including from browser - images dragged from web)
        if (e.dataTransfer.files.length) {
            selectFile(e.dataTransfer.files[0]);
            playSound('click');
        } else if (e.dataTransfer.items) {
            // Handle dragged images from browser
            for (const item of e.dataTransfer.items) {
                if (item.kind === 'string' && item.type === 'text/uri-list') {
                    item.getAsString(async (url) => {
                        try {
                            const response = await fetch(url);
                            const blob = await response.blob();
                            const filename = url.split('/').pop().split('?')[0] || 'dragged-image.png';
                            const file = new File([blob], filename, { type: blob.type });
                            selectFile(file);
                            playSound('click');
                        } catch (err) {
                            console.error('Failed to fetch dragged image:', err);
                        }
                    });
                }
            }
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            selectFile(fileInput.files[0]);
            playSound('click');
        }
    });

    function selectFile(file) {
        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
            uploadStatus.textContent = '❌ File too large. Maximum size is 100MB.';
            uploadStatus.classList.add('error');
            playSound('error');
            return;
        }

        selectedFile = file;
        fileInfo.classList.remove('hidden');
        selectedFileName.textContent = file.name;
        selectedFileSize.textContent = formatFileSize(file.size);
        fileTypeIcon.textContent = getFileIcon(file.name);

        uploadBtn.disabled = false;
        uploadBtn.querySelector('.btn-text').textContent = 'ENCRYPT & UPLOAD';
        uploadStatus.textContent = '';
        uploadStatus.classList.remove('error');
    }

    removeFileBtn?.addEventListener('click', () => {
        playSound('click');
        selectedFile = null;
        fileInfo.classList.add('hidden');
        fileInput.value = '';
        uploadBtn.disabled = true;
        uploadBtn.querySelector('.btn-text').textContent = 'SELECT FILE TO UPLOAD';
    });

    uploadBtn?.addEventListener('click', () => {
        if (selectedFile) {
            playSound('encrypt');
            handleFileUpload(selectedFile);
        }
    });

    async function handleFileUpload(file) {
        uploadStatus.textContent = '🔐 Generating encryption keys...';
        uploadStatus.classList.remove('error');

        const password = document.getElementById('password-input')?.value.trim() || '';
        const burn = document.getElementById('burn-checkbox')?.checked || false;
        const expiry = expirySelect?.value || '24h';
        const enableDecoy = document.getElementById('decoy-checkbox')?.checked || false;
        const enableDisposable = document.getElementById('disposable-checkbox')?.checked || true;
        const enableZKP = document.getElementById('zkp-checkbox')?.checked || true;

        uploadBtn.disabled = true;

        try {
            let key, keyString, salt, fileHash;

            // Zero-Knowledge Proof - Generate hash
            if (enableZKP) {
                uploadStatus.textContent = '🛡️ Generating zero-knowledge proof...';
                const arrayBuffer = await file.arrayBuffer();
                const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
                fileHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
            }

            // Generate Key
            if (password) {
                salt = window.crypto.getRandomValues(new Uint8Array(16));
                key = await ZeroCrypto.deriveKeyFromPassword(password, salt);
                keyString = 'PASSWORD';
            } else {
                key = await ZeroCrypto.generateKey();
                keyString = await ZeroCrypto.exportKey(key);
            }

            // Encrypt File
            uploadStatus.textContent = '🔒 Encrypting file...';
            const encryptedBlob = await ZeroCrypto.encrypt(file, key, salt);

            // Upload with progress
            uploadStatus.textContent = '⬆️ Uploading encrypted file...';
            progressContainer.classList.remove('hidden');

            const formData = new FormData();
            const randomId = Math.random().toString(36).substring(2, 15);
            formData.append('file', encryptedBlob, randomId);

            const result = await uploadWithProgress(formData, burn, expiry, enableDecoy, fileHash);

            if (result.success) {
                currentFileId = result.data.filename;
                currentMasterToken = result.data.masterToken;

                // Generate share link
                const finalKeyPart = password ? 'PASSWORD' : keyString;
                // Encrypted metadata - filename is in URL, not on server
                const encodedFileName = btoa(unescape(encodeURIComponent(file.name)));
                const fullLink = `${window.location.origin}/#${currentFileId}:${finalKeyPart}:${encodedFileName}`;

                shareLinkInput.value = fullLink;

                // Generate QR Code
                generateQRCode(fullLink);

                // Update privacy badges
                updatePrivacyBadges(enableZKP, enableDecoy, enableDisposable);

                // Update expiry text
                updateExpiryText(expiry);

                // Show result
                resultArea.classList.remove('hidden');
                uploadStatus.textContent = '✅ File encrypted and uploaded successfully!';
                uploadStatus.classList.add('success');
                progressContainer.classList.add('hidden');

                // Celebrate!
                playSound('success');
                triggerConfetti();

                // Start countdown timer
                if (window.startCountdown) {
                    window.startCountdown(expiry);
                }

                // Show self-healing button if applicable
                document.getElementById('heal-link-btn')?.classList.remove('hidden');

            } else {
                throw new Error(result.error || 'Upload failed');
            }

        } catch (err) {
            console.error(err);
            uploadStatus.textContent = '❌ Error: ' + err.message;
            uploadStatus.classList.add('error');
            progressContainer.classList.add('hidden');
            playSound('error');
        }

        uploadBtn.disabled = false;
    }

    function uploadWithProgress(formData, burn, expiry, decoy, hash) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    progressFill.style.width = percent + '%';
                    progressText.textContent = percent + '%';
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        resolve({ success: true, data: JSON.parse(xhr.responseText) });
                    } catch (e) {
                        reject(new Error('Invalid server response'));
                    }
                } else {
                    try {
                        resolve({ success: false, error: JSON.parse(xhr.responseText).error });
                    } catch (e) {
                        resolve({ success: false, error: 'Upload failed' });
                    }
                }
            });

            xhr.addEventListener('error', () => reject(new Error('Network error')));

            let url = `/upload?burn=${burn}&expiry=${expiry}&decoy=${decoy}`;
            if (hash) url += `&hash=${hash}`;

            xhr.open('POST', url);
            xhr.send(formData);
        });
    }

    function generateQRCode(text) {
        const container = document.querySelector('.qr-container');
        console.log('Generating QR code for:', text);
        console.log('Container element:', container);
        console.log('QRCode library:', typeof QRCode);

        if (container && typeof QRCode !== 'undefined') {
            // Clear previous content
            container.innerHTML = '';

            // Try toDataURL method first (creates an image)
            QRCode.toDataURL(text, {
                width: 150,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' }
            }).then(url => {
                const img = document.createElement('img');
                img.src = url;
                img.alt = 'QR Code';
                img.style.width = '150px';
                img.style.height = '150px';
                container.appendChild(img);
                console.log('QR Code image generated successfully');
            }).catch(err => {
                console.error('QR Code toDataURL error:', err);
                // Fallback to canvas method
                const canvas = document.createElement('canvas');
                canvas.id = 'qr-code';
                container.appendChild(canvas);
                QRCode.toCanvas(canvas, text, {
                    width: 150,
                    margin: 2,
                    color: { dark: '#000000', light: '#ffffff' }
                }, (error) => {
                    if (error) {
                        console.error('QR Code canvas error:', error);
                    } else {
                        console.log('QR Code canvas generated successfully');
                    }
                });
            });
        } else {
            console.error('QR Code generation failed: container or library not available');
        }
    }


    function updatePrivacyBadges(zkp, decoy, disposable) {
        document.getElementById('badge-zkp')?.classList.toggle('hidden', !zkp);
        document.getElementById('badge-decoy')?.classList.toggle('hidden', !decoy);
        document.getElementById('badge-disposable')?.classList.toggle('hidden', !disposable);
    }

    function updateExpiryText(expiry) {
        const times = { '1h': '1 hour', '6h': '6 hours', '24h': '24 hours', '7d': '7 days' };
        if (expiryText) {
            expiryText.textContent = `Expires in ${times[expiry] || '24 hours'}`;
        }
    }

    // Self-Healing Link
    document.getElementById('heal-link-btn')?.addEventListener('click', async () => {
        if (!currentFileId || !currentMasterToken) return;

        playSound('click');
        try {
            const response = await fetch(`/heal-link/${currentFileId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ masterToken: currentMasterToken })
            });

            if (response.ok) {
                const data = await response.json();
                currentMasterToken = data.newMasterToken;
                uploadStatus.textContent = `🔄 Link regenerated! Old links are now invalid. Version: ${data.linkVersion}`;
                playSound('success');
            } else {
                throw new Error('Failed to heal link');
            }
        } catch (err) {
            uploadStatus.textContent = '❌ ' + err.message;
            playSound('error');
        }
    });

    // Copy button
    copyBtn?.addEventListener('click', () => {
        playSound('click');
        shareLinkInput.select();

        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareLinkInput.value).then(showCopied).catch(() => {
                document.execCommand('copy');
                showCopied();
            });
        } else {
            document.execCommand('copy');
            showCopied();
        }
    });

    function showCopied() {
        copyBtn.classList.add('copied');
        copyBtn.querySelector('.copy-text').textContent = 'COPIED!';
        playSound('success');
        setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.querySelector('.copy-text').textContent = 'COPY';
        }, 2000);
    }

    // Upload another
    uploadAnother?.addEventListener('click', () => {
        playSound('click');
        resultArea.classList.add('hidden');
        fileInfo.classList.add('hidden');
        selectedFile = null;
        fileInput.value = '';
        uploadBtn.disabled = true;
        uploadBtn.querySelector('.btn-text').textContent = 'SELECT FILE TO UPLOAD';
        uploadStatus.textContent = '';
        uploadStatus.classList.remove('success', 'error');
        document.getElementById('password-input').value = '';
        document.getElementById('burn-checkbox').checked = false;
        expirySelect.value = '24h';
        currentFileId = null;
        currentMasterToken = null;
    });

    // ============ Download Mode Logic ============
    function handleDownloadMode() {
        const hash = window.location.hash.substring(1);
        const parts = hash.split(':');

        if (parts.length < 3) {
            downloadStatus.textContent = '❌ Invalid link format.';
            downloadStatus.classList.add('error');
            return;
        }

        const [fileId, keyString, encodedFileName] = parts;

        // Decode filename (encrypted metadata)
        let decodedFileName = 'downloaded_file';
        try {
            decodedFileName = decodeURIComponent(escape(atob(encodedFileName)));
        } catch (e) {
            try {
                decodedFileName = atob(encodedFileName);
            } catch (e2) {
                decodedFileName = decodeURIComponent(encodedFileName);
            }
        }

        // Update preview
        const previewFilename = document.getElementById('preview-filename');
        const previewIcon = document.getElementById('preview-icon');
        if (previewFilename) previewFilename.textContent = decodedFileName;
        if (previewIcon) previewIcon.textContent = getFileIcon(decodedFileName);

        const isPasswordProtected = keyString === 'PASSWORD';

        if (isPasswordProtected) {
            document.getElementById('password-prompt').classList.remove('hidden');
        }

        fetchFileInfo(fileId);

        decryptBtn.addEventListener('click', async () => {
            playSound('encrypt');
            await handleDecrypt(fileId, keyString, decodedFileName, isPasswordProtected);
        });
    }

    async function fetchFileInfo(fileId) {
        try {
            const response = await fetch(`/info/${fileId}`);
            if (response.ok) {
                const info = await response.json();
                const previewMeta = document.getElementById('preview-meta');
                if (previewMeta && info.expiryOption) {
                    const times = { '1h': '1 hour', '6h': '6 hours', '24h': '24 hours', '7d': '7 days' };
                    previewMeta.textContent = `Expires: ${times[info.expiryOption] || 'Soon'}`;
                    if (info.burn) previewMeta.textContent += ' • Burns after download';
                    if (info.hasDecoy) previewMeta.textContent += ' • 🎭 Decoy protected';
                }
            }
        } catch (e) {
            console.error('Could not fetch file info:', e);
        }
    }

    async function handleDecrypt(fileId, keyString, decodedFileName, isPasswordProtected) {
        downloadStatus.textContent = '⬇️ Downloading encrypted file...';
        downloadStatus.classList.remove('error');
        decryptBtn.disabled = true;

        const downloadProgress = document.getElementById('download-progress');
        const downloadProgressFill = document.getElementById('download-progress-fill');
        const downloadProgressText = document.getElementById('download-progress-text');

        try {
            const response = await fetch(`/files/${fileId}`);

            if (!response.ok) {
                if (response.status === 404) throw new Error('File not found (may have been deleted or burned)');
                else if (response.status === 410) throw new Error('File has expired');
                else throw new Error('Failed to download file');
            }

            const encryptedBlob = await response.blob();

            downloadStatus.textContent = '🔓 Decrypting file...';
            if (downloadProgress) downloadProgress.classList.remove('hidden');

            let key;
            if (isPasswordProtected) {
                const password = document.getElementById('decrypt-password').value;
                if (!password) {
                    alert('Please enter the password');
                    decryptBtn.disabled = false;
                    downloadStatus.textContent = '';
                    return;
                }
                const buffer = await encryptedBlob.arrayBuffer();
                const salt = new Uint8Array(buffer.slice(0, 16));
                key = await ZeroCrypto.deriveKeyFromPassword(password, salt);
            } else {
                key = await ZeroCrypto.importKey(keyString);
            }

            if (downloadProgressFill) downloadProgressFill.style.width = '50%';
            if (downloadProgressText) downloadProgressText.textContent = 'Decrypting...';

            const decryptedBuffer = await ZeroCrypto.decrypt(encryptedBlob, key, isPasswordProtected);

            if (downloadProgressFill) downloadProgressFill.style.width = '100%';
            if (downloadProgressText) downloadProgressText.textContent = 'Complete!';

            downloadStatus.textContent = '✅ File decrypted successfully!';
            downloadStatus.classList.add('success');

            const blob = new Blob([decryptedBuffer]);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = decodedFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            playSound('success');
            triggerConfetti();

            decryptBtn.querySelector('.btn-text').textContent = 'DOWNLOADED';
            decryptBtn.querySelector('.btn-icon').textContent = '✅';

        } catch (err) {
            console.error(err);
            downloadStatus.textContent = '❌ ' + err.message;
            downloadStatus.classList.add('error');
            if (downloadProgress) downloadProgress.classList.add('hidden');
            decryptBtn.disabled = false;
            playSound('error');
        }
    }

    // ============ Social Share Buttons ============
    const shareWhatsapp = document.getElementById('share-whatsapp');
    const shareTelegram = document.getElementById('share-telegram');
    const shareTwitter = document.getElementById('share-twitter');
    const shareEmail = document.getElementById('share-email');

    if (shareWhatsapp) {
        shareWhatsapp.addEventListener('click', (e) => {
            e.preventDefault();
            const linkElement = document.getElementById('share-link');
            const link = linkElement ? linkElement.value : '';
            console.log('WhatsApp share clicked, link:', link);
            if (!link) {
                alert('Please upload a file first to get a share link.');
                return;
            }
            const text = encodeURIComponent(`🔒 Secure encrypted file: ${link}`);
            const url = `https://wa.me/?text=${text}`;
            window.open(url, '_blank');
            playSound('click');
        });
    }

    if (shareTelegram) {
        shareTelegram.addEventListener('click', (e) => {
            e.preventDefault();
            const linkElement = document.getElementById('share-link');
            const link = linkElement ? linkElement.value : '';
            console.log('Telegram share clicked, link:', link);
            if (!link) {
                alert('Please upload a file first to get a share link.');
                return;
            }
            const text = encodeURIComponent('🔒 Secure encrypted file');
            const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${text}`;
            window.open(url, '_blank');
            playSound('click');
        });
    }

    if (shareTwitter) {
        shareTwitter.addEventListener('click', (e) => {
            e.preventDefault();
            const linkElement = document.getElementById('share-link');
            const link = linkElement ? linkElement.value : '';
            console.log('Twitter share clicked, link:', link);
            if (!link) {
                alert('Please upload a file first to get a share link.');
                return;
            }
            const text = encodeURIComponent(`🔒 Sharing a secure encrypted file via ZeroVault! ${link}`);
            const url = `https://twitter.com/intent/tweet?text=${text}`;
            window.open(url, '_blank');
            playSound('click');
        });
    }

    if (shareEmail) {
        shareEmail.addEventListener('click', (e) => {
            e.preventDefault();
            const linkElement = document.getElementById('share-link');
            const link = linkElement ? linkElement.value : '';
            console.log('Email share clicked, link:', link);
            if (!link) {
                alert('Please upload a file first to get a share link.');
                return;
            }
            const subject = encodeURIComponent('Secure Encrypted File - ZeroVault');
            const body = encodeURIComponent(`Hi,\n\nI've shared a secure encrypted file with you.\n\nDownload Link: ${link}\n\n🔒 This file is end-to-end encrypted. Only you can decrypt it.\n\nBest regards`);
            window.location.href = `mailto:?subject=${subject}&body=${body}`;
            playSound('click');
        });
    }


    // ============ Short Link ============
    const shortLinkInput = document.getElementById('short-link');
    const generateShortBtn = document.getElementById('generate-short-btn');
    const copyShortBtn = document.getElementById('copy-short-btn');

    if (generateShortBtn) {
        generateShortBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const linkElement = document.getElementById('share-link');
            const fullLink = linkElement ? linkElement.value : '';
            console.log('Short link clicked, full link:', fullLink);

            if (!fullLink) {
                alert('Please upload a file first to get a share link.');
                return;
            }

            playSound('click');
            generateShortBtn.disabled = true;
            generateShortBtn.innerHTML = '<span>⏳</span><span>...</span>';

            // Extract fileId from the share link (format: domain/#fileId:key:filename)
            const hashIndex = fullLink.indexOf('#');
            if (hashIndex === -1) {
                alert('Invalid share link format.');
                generateShortBtn.disabled = false;
                generateShortBtn.innerHTML = '<span>✂️</span><span class="short-text">SHORT</span>';
                return;
            }

            const hashPart = fullLink.substring(hashIndex + 1);
            const parts = hashPart.split(':');
            const fileId = parts[0] || '';
            const shortCode = fileId.substring(0, 8);

            if (!shortCode) {
                alert('Could not generate short link.');
                generateShortBtn.disabled = false;
                generateShortBtn.innerHTML = '<span>✂️</span><span class="short-text">SHORT</span>';
                return;
            }

            // Create short link format
            const origin = window.location.origin;
            const shortLink = `${origin}/s/${shortCode}`;

            if (shortLinkInput) {
                shortLinkInput.value = shortLink;
            }
            generateShortBtn.classList.add('hidden');
            if (copyShortBtn) {
                copyShortBtn.classList.remove('hidden');
            }

            playSound('success');
        });
    }

    if (copyShortBtn) {
        copyShortBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const shortLink = shortLinkInput ? shortLinkInput.value : '';
            if (shortLink) {
                navigator.clipboard.writeText(shortLink);
                copyShortBtn.innerHTML = '<span>✅</span><span>COPIED</span>';
                playSound('success');
                setTimeout(() => {
                    copyShortBtn.innerHTML = '<span>📋</span><span>COPY</span>';
                }, 2000);
            }
        });
    }


    // ============ Countdown Timer ============
    let countdownInterval = null;
    let expiryTimestamp = null;

    function startCountdown(expiryValue) {
        if (countdownInterval) clearInterval(countdownInterval);

        const hoursElement = document.getElementById('countdown-hours');
        const minutesElement = document.getElementById('countdown-minutes');
        const secondsElement = document.getElementById('countdown-seconds');
        const expiryTextElement = document.getElementById('expiry-text');

        if (!hoursElement || !minutesElement || !secondsElement) return;

        // Calculate expiry time based on selection
        let milliseconds;
        switch (expiryValue) {
            case '1h': milliseconds = 1 * 60 * 60 * 1000; break;
            case '6h': milliseconds = 6 * 60 * 60 * 1000; break;
            case '24h': milliseconds = 24 * 60 * 60 * 1000; break;
            case '7d': milliseconds = 7 * 24 * 60 * 60 * 1000; break;
            default: milliseconds = 24 * 60 * 60 * 1000;
        }

        expiryTimestamp = Date.now() + milliseconds;

        function updateCountdown() {
            const now = Date.now();
            const remaining = expiryTimestamp - now;

            if (remaining <= 0) {
                clearInterval(countdownInterval);
                hoursElement.textContent = '00';
                minutesElement.textContent = '00';
                secondsElement.textContent = '00';
                if (expiryTextElement) expiryTextElement.textContent = 'Expired!';
                return;
            }

            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

            hoursElement.textContent = hours.toString().padStart(2, '0');
            minutesElement.textContent = minutes.toString().padStart(2, '0');
            secondsElement.textContent = seconds.toString().padStart(2, '0');
        }

        updateCountdown();
        countdownInterval = setInterval(updateCountdown, 1000);
    }

    // Expose startCountdown globally for use after upload
    window.startCountdown = startCountdown;
});
