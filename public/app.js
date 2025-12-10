document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
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

    let selectedFile = null;

    // Initialize theme
    initTheme();

    // Check if we are in Download Mode (URL has hash)
    if (window.location.hash.length > 1) {
        uploadSection.classList.add('hidden');
        downloadSection.classList.remove('hidden');
        handleDownloadMode();
    }

    // --- Theme Toggle ---
    function initTheme() {
        const savedTheme = localStorage.getItem('zerovault-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    themeToggle?.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('zerovault-theme', newTheme);
    });

    // --- Password Toggle ---
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
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

    // --- File Type Icon Helper ---
    function getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            // Images
            'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'webp': '🖼️', 'svg': '🖼️',
            // Documents
            'pdf': '📕', 'doc': '📄', 'docx': '📄', 'txt': '📝', 'rtf': '📝',
            // Spreadsheets
            'xls': '📊', 'xlsx': '📊', 'csv': '📊',
            // Presentations
            'ppt': '📽️', 'pptx': '📽️',
            // Code
            'js': '💻', 'ts': '💻', 'py': '🐍', 'html': '🌐', 'css': '🎨', 'json': '📋',
            // Archives
            'zip': '📦', 'rar': '📦', '7z': '📦', 'tar': '📦', 'gz': '📦',
            // Video
            'mp4': '🎬', 'avi': '🎬', 'mov': '🎬', 'mkv': '🎬', 'webm': '🎬',
            // Audio
            'mp3': '🎵', 'wav': '🎵', 'flac': '🎵', 'ogg': '🎵',
            // Executables
            'exe': '⚙️', 'msi': '⚙️', 'dmg': '⚙️', 'apk': '📱',
        };
        return icons[ext] || '📁';
    }

    // --- Format File Size ---
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // --- Upload Mode Logic ---
    dropZone.addEventListener('click', () => fileInput.click());

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
        if (e.dataTransfer.files.length) {
            selectFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            selectFile(fileInput.files[0]);
        }
    });

    function selectFile(file) {
        // Validate file size (100MB max)
        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
            uploadStatus.textContent = '❌ File too large. Maximum size is 100MB.';
            uploadStatus.classList.add('error');
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
        selectedFile = null;
        fileInfo.classList.add('hidden');
        fileInput.value = '';
        uploadBtn.disabled = true;
        uploadBtn.querySelector('.btn-text').textContent = 'SELECT FILE TO UPLOAD';
    });

    uploadBtn?.addEventListener('click', () => {
        if (selectedFile) {
            handleFileUpload(selectedFile);
        }
    });

    async function handleFileUpload(file) {
        uploadStatus.textContent = '🔐 Generating encryption keys...';
        uploadStatus.classList.remove('error');
        const passwordInput = document.getElementById('password-input');
        const password = passwordInput ? passwordInput.value.trim() : '';
        const burnCheckbox = document.getElementById('burn-checkbox');
        const burn = burnCheckbox ? burnCheckbox.checked : false;
        const expiry = expirySelect ? expirySelect.value : '24h';

        // Disable button during upload
        uploadBtn.disabled = true;

        try {
            let key, keyString, salt;

            // 1. Generate Key
            if (password) {
                salt = window.crypto.getRandomValues(new Uint8Array(16));
                key = await ZeroCrypto.deriveKeyFromPassword(password, salt);
                keyString = 'PASSWORD';
            } else {
                key = await ZeroCrypto.generateKey();
                keyString = await ZeroCrypto.exportKey(key);
            }

            // 2. Encrypt File
            uploadStatus.textContent = '🔒 Encrypting file...';
            const encryptedBlob = await ZeroCrypto.encrypt(file, key, salt);

            // 3. Upload with progress
            uploadStatus.textContent = '⬆️ Uploading encrypted file...';
            progressContainer.classList.remove('hidden');

            const formData = new FormData();
            const randomId = Math.random().toString(36).substring(2, 15);
            formData.append('file', encryptedBlob, randomId);

            // Use XMLHttpRequest for progress tracking
            const result = await uploadWithProgress(formData, burn, expiry);

            if (result.success) {
                const fileId = result.data.filename;

                // 4. Generate share link
                const finalKeyPart = password ? 'PASSWORD' : keyString;
                const encodedFileName = btoa(unescape(encodeURIComponent(file.name)));
                const fullLink = `${window.location.origin}/#${fileId}:${finalKeyPart}:${encodedFileName}`;

                shareLinkInput.value = fullLink;

                // 5. Generate QR Code
                generateQRCode(fullLink);

                // 6. Update expiry text
                updateExpiryText(expiry);

                // 7. Show result
                resultArea.classList.remove('hidden');
                uploadStatus.textContent = '✅ File encrypted and uploaded successfully!';
                uploadStatus.classList.add('success');
                progressContainer.classList.add('hidden');
            } else {
                throw new Error(result.error || 'Upload failed');
            }

        } catch (err) {
            console.error(err);
            uploadStatus.textContent = '❌ Error: ' + err.message;
            uploadStatus.classList.add('error');
            progressContainer.classList.add('hidden');
        }

        uploadBtn.disabled = false;
    }

    function uploadWithProgress(formData, burn, expiry) {
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
                        const data = JSON.parse(xhr.responseText);
                        resolve({ success: true, data });
                    } catch (e) {
                        reject(new Error('Invalid server response'));
                    }
                } else {
                    try {
                        const error = JSON.parse(xhr.responseText);
                        resolve({ success: false, error: error.error });
                    } catch (e) {
                        resolve({ success: false, error: 'Upload failed' });
                    }
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Network error'));
            });

            xhr.open('POST', `/upload?burn=${burn}&expiry=${expiry}`);
            xhr.send(formData);
        });
    }

    function generateQRCode(text) {
        const canvas = document.getElementById('qr-code');
        if (canvas && typeof QRCode !== 'undefined') {
            QRCode.toCanvas(canvas, text, {
                width: 150,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            }, (error) => {
                if (error) console.error('QR Code error:', error);
            });
        }
    }

    function updateExpiryText(expiry) {
        const times = {
            '1h': '1 hour',
            '6h': '6 hours',
            '24h': '24 hours',
            '7d': '7 days'
        };
        if (expiryText) {
            expiryText.textContent = `Expires in ${times[expiry] || '24 hours'}`;
        }
    }

    // Copy button
    copyBtn?.addEventListener('click', () => {
        shareLinkInput.select();

        // Try modern clipboard API first
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareLinkInput.value).then(() => {
                showCopied();
            }).catch(() => {
                // Fallback
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
        setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.querySelector('.copy-text').textContent = 'COPY';
        }, 2000);
    }

    // Upload another
    uploadAnother?.addEventListener('click', () => {
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
    });

    // --- Download Mode Logic ---
    function handleDownloadMode() {
        const hash = window.location.hash.substring(1);
        const parts = hash.split(':');

        if (parts.length < 3) {
            downloadStatus.textContent = '❌ Invalid link format.';
            downloadStatus.classList.add('error');
            return;
        }

        const [fileId, keyString, encodedFileName] = parts;

        // Decode filename
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

        // Fetch file info
        fetchFileInfo(fileId);

        decryptBtn.addEventListener('click', async () => {
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
                    if (info.burn) {
                        previewMeta.textContent += ' • Burns after download';
                    }
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
            // 1. Download Encrypted Blob
            const response = await fetch(`/files/${fileId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('File not found (may have been deleted or burned)');
                } else if (response.status === 410) {
                    throw new Error('File has expired');
                } else {
                    throw new Error('Failed to download file');
                }
            }

            const encryptedBlob = await response.blob();

            // 2. Decrypt
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

            // 3. Trigger Download
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

            // Update button
            decryptBtn.querySelector('.btn-text').textContent = 'DOWNLOADED';
            decryptBtn.querySelector('.btn-icon').textContent = '✅';

        } catch (err) {
            console.error(err);
            downloadStatus.textContent = '❌ ' + err.message;
            downloadStatus.classList.add('error');
            if (downloadProgress) downloadProgress.classList.add('hidden');
            decryptBtn.disabled = false;
        }
    }
});
