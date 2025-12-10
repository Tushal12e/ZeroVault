const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
            mediaSrc: ["'self'", "data:"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// Compression
app.use(compression());

// Enable CORS
app.use(cors());

// Rate Limiting
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { error: 'Too many uploads, please try again later.' }
});

const downloadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many download requests, please try again later.' }
});

// Serve static files
app.use(express.static('public', {
    maxAge: '1d',
    etag: true
}));

app.use(express.json());

// Metadata store
const META_FILE = 'metadata.json';
let fileMetadata = {};

// Disposable tokens store
const TOKENS_FILE = 'tokens.json';
let disposableTokens = {};

// Load data from disk
function loadData() {
    if (fs.existsSync(META_FILE)) {
        try {
            fileMetadata = JSON.parse(fs.readFileSync(META_FILE));
        } catch (e) {
            console.error("Error reading metadata:", e);
            fileMetadata = {};
        }
    }
    if (fs.existsSync(TOKENS_FILE)) {
        try {
            disposableTokens = JSON.parse(fs.readFileSync(TOKENS_FILE));
        } catch (e) {
            console.error("Error reading tokens:", e);
            disposableTokens = {};
        }
    }
}
loadData();

function saveMetadata() {
    try {
        fs.writeFileSync(META_FILE, JSON.stringify(fileMetadata, null, 2));
    } catch (e) {
        console.error("Error saving metadata:", e);
    }
}

function saveTokens() {
    try {
        fs.writeFileSync(TOKENS_FILE, JSON.stringify(disposableTokens, null, 2));
    } catch (e) {
        console.error("Error saving tokens:", e);
    }
}

// Generate random token
function generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

// Configure Multer
const MAX_FILE_SIZE = 100 * 1024 * 1024;

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const randomId = crypto.randomBytes(16).toString('hex');
        cb(null, randomId);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: MAX_FILE_SIZE }
});

// Expiry times
const EXPIRY_TIMES = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000
};

// ============ UPLOAD ROUTE ============
app.post('/upload', uploadLimiter, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    const burn = req.query.burn === 'true';
    const expiryOption = req.query.expiry || '24h';
    const expiryMs = EXPIRY_TIMES[expiryOption] || EXPIRY_TIMES['24h'];
    const enableDecoy = req.query.decoy === 'true';
    const fileHash = req.query.hash || null; // Zero-knowledge proof hash

    // Generate master token for self-healing links
    const masterToken = generateToken();

    fileMetadata[req.file.filename] = {
        burn: burn,
        timestamp: Date.now(),
        expiresAt: Date.now() + expiryMs,
        expiryOption: expiryOption,
        downloads: 0,
        size: req.file.size,
        masterToken: masterToken,
        fileHash: fileHash, // Store hash for zero-knowledge verification
        hasDecoy: enableDecoy,
        linkVersion: 1 // For self-healing links
    };

    // Generate decoy file if enabled
    if (enableDecoy) {
        const decoyId = crypto.randomBytes(16).toString('hex');
        const decoyPath = path.join(__dirname, 'uploads', decoyId);
        const decoySize = Math.floor(Math.random() * 50000) + 10000;
        fs.writeFileSync(decoyPath, crypto.randomBytes(decoySize));
        fileMetadata[req.file.filename].decoyId = decoyId;
    }

    saveMetadata();

    console.log(`File uploaded: ${req.file.filename} [Burn: ${burn}, Expiry: ${expiryOption}, Decoy: ${enableDecoy}]`);

    res.json({
        filename: req.file.filename,
        masterToken: masterToken,
        expiresAt: fileMetadata[req.file.filename].expiresAt,
        hasDecoy: enableDecoy
    });
});

// ============ GENERATE DISPOSABLE LINK ============
app.post('/generate-link/:id', (req, res) => {
    const fileId = req.params.id;
    const { masterToken } = req.body;
    const meta = fileMetadata[fileId];

    if (!meta) {
        return res.status(404).json({ error: 'File not found' });
    }

    if (meta.masterToken !== masterToken) {
        return res.status(403).json({ error: 'Invalid token' });
    }

    // Generate disposable one-time token
    const disposableToken = generateToken(16);

    disposableTokens[disposableToken] = {
        fileId: fileId,
        createdAt: Date.now(),
        used: false,
        expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour validity
    };

    saveTokens();

    res.json({
        disposableToken: disposableToken,
        expiresIn: '1 hour'
    });
});

// ============ SELF-HEALING LINK - ROTATE TOKEN ============
app.post('/heal-link/:id', (req, res) => {
    const fileId = req.params.id;
    const { masterToken } = req.body;
    const meta = fileMetadata[fileId];

    if (!meta) {
        return res.status(404).json({ error: 'File not found' });
    }

    if (meta.masterToken !== masterToken) {
        return res.status(403).json({ error: 'Invalid token' });
    }

    // Generate new master token (self-healing)
    const newMasterToken = generateToken();
    meta.masterToken = newMasterToken;
    meta.linkVersion = (meta.linkVersion || 1) + 1;
    saveMetadata();

    res.json({
        newMasterToken: newMasterToken,
        linkVersion: meta.linkVersion,
        message: 'Link healed - old links are now invalid'
    });
});

// ============ ZERO-KNOWLEDGE VERIFICATION ============
app.post('/verify-ownership/:id', (req, res) => {
    const fileId = req.params.id;
    const { hash } = req.body;
    const meta = fileMetadata[fileId];

    if (!meta) {
        return res.status(404).json({ error: 'File not found' });
    }

    if (!meta.fileHash) {
        return res.status(400).json({ error: 'No hash stored for this file' });
    }

    const verified = meta.fileHash === hash;

    res.json({
        verified: verified,
        message: verified ? 'Ownership verified' : 'Hash mismatch'
    });
});

// ============ FILE INFO ROUTE ============
app.get('/info/:id', (req, res) => {
    const fileId = req.params.id;
    const meta = fileMetadata[fileId];

    if (!meta) {
        return res.status(404).json({ error: 'File not found' });
    }

    // Return minimal info (encrypted metadata - server knows nothing useful)
    res.json({
        expiresAt: meta.expiresAt,
        expiryOption: meta.expiryOption,
        downloads: meta.downloads,
        burn: meta.burn,
        hasDecoy: meta.hasDecoy || false,
        linkVersion: meta.linkVersion || 1
    });
});

// ============ DOWNLOAD WITH DISPOSABLE TOKEN ============
app.get('/d/:token', downloadLimiter, (req, res) => {
    const token = req.params.token;
    const tokenData = disposableTokens[token];

    if (!tokenData) {
        return res.status(404).json({ error: 'Invalid or expired download link' });
    }

    if (tokenData.used) {
        return res.status(410).json({ error: 'This link has already been used' });
    }

    if (Date.now() > tokenData.expiresAt) {
        delete disposableTokens[token];
        saveTokens();
        return res.status(410).json({ error: 'This link has expired' });
    }

    const fileId = tokenData.fileId;
    const filePath = path.join(__dirname, 'uploads', fileId);
    const meta = fileMetadata[fileId];

    if (!fs.existsSync(filePath) || !meta) {
        return res.status(404).json({ error: 'File not found' });
    }

    // Mark token as used (disposable)
    tokenData.used = true;
    saveTokens();

    // Increment download counter
    meta.downloads = (meta.downloads || 0) + 1;
    saveMetadata();

    res.download(filePath, (err) => {
        if (!err && meta.burn) {
            setTimeout(() => {
                fs.unlink(filePath, () => {
                    delete fileMetadata[fileId];
                    saveMetadata();
                });
            }, 1000);
        }
    });
});

// ============ REGULAR DOWNLOAD ROUTE ============
app.get('/files/:id', downloadLimiter, (req, res) => {
    const fileId = req.params.id;
    const filePath = path.join(__dirname, 'uploads', fileId);
    const meta = fileMetadata[fileId];

    if (!fs.existsSync(filePath)) {
        if (meta) {
            delete fileMetadata[fileId];
            saveMetadata();
        }
        return res.status(404).json({ error: 'File not found (or already burnt/expired).' });
    }

    if (meta && meta.expiresAt && Date.now() > meta.expiresAt) {
        fs.unlinkSync(filePath);
        delete fileMetadata[fileId];
        saveMetadata();
        return res.status(410).json({ error: 'File has expired.' });
    }

    if (meta) {
        meta.downloads = (meta.downloads || 0) + 1;
        saveMetadata();
    }

    res.download(filePath, (err) => {
        if (!err && meta && meta.burn) {
            setTimeout(() => {
                fs.unlink(filePath, (unlinkErr) => {
                    if (!unlinkErr || unlinkErr.code === 'ENOENT') {
                        // Also delete decoy if exists
                        if (meta.decoyId) {
                            const decoyPath = path.join(__dirname, 'uploads', meta.decoyId);
                            fs.unlink(decoyPath, () => { });
                        }
                        delete fileMetadata[fileId];
                        saveMetadata();
                    }
                });
            }, 1000);
        }
    });
});

// ============ PLAUSIBLE DENIABILITY - DUAL PASSWORD ============
app.post('/upload-dual', uploadLimiter, upload.fields([
    { name: 'realFile', maxCount: 1 },
    { name: 'decoyFile', maxCount: 1 }
]), (req, res) => {
    if (!req.files || !req.files.realFile || !req.files.decoyFile) {
        return res.status(400).json({ error: 'Both real and decoy files required' });
    }

    const realFile = req.files.realFile[0];
    const decoyFile = req.files.decoyFile[0];
    const expiryOption = req.query.expiry || '24h';
    const expiryMs = EXPIRY_TIMES[expiryOption] || EXPIRY_TIMES['24h'];

    const masterToken = generateToken();

    fileMetadata[realFile.filename] = {
        timestamp: Date.now(),
        expiresAt: Date.now() + expiryMs,
        expiryOption: expiryOption,
        downloads: 0,
        size: realFile.size,
        masterToken: masterToken,
        isDualMode: true,
        decoyFileId: decoyFile.filename
    };

    fileMetadata[decoyFile.filename] = {
        timestamp: Date.now(),
        expiresAt: Date.now() + expiryMs,
        isDecoyPart: true,
        parentId: realFile.filename
    };

    saveMetadata();

    res.json({
        realFileId: realFile.filename,
        decoyFileId: decoyFile.filename,
        masterToken: masterToken,
        message: 'Dual files uploaded - use different passwords for each'
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// Cleanup Job (every 5 minutes)
setInterval(() => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) return;

    const files = fs.readdirSync(uploadDir);
    const now = Date.now();
    let changed = false;

    files.forEach(file => {
        const filePath = path.join(uploadDir, file);
        const meta = fileMetadata[file];

        if (meta && meta.expiresAt && now > meta.expiresAt) {
            try {
                fs.unlinkSync(filePath);
                delete fileMetadata[file];
                changed = true;
            } catch (e) {
                console.error(`Error deleting ${file}:`, e);
            }
        } else if (!meta) {
            try {
                const stats = fs.statSync(filePath);
                if (now - stats.mtimeMs > 24 * 60 * 60 * 1000) {
                    fs.unlinkSync(filePath);
                    changed = true;
                }
            } catch (e) { }
        }
    });

    // Clean up expired disposable tokens
    Object.keys(disposableTokens).forEach(token => {
        if (now > disposableTokens[token].expiresAt) {
            delete disposableTokens[token];
            changed = true;
        }
    });

    if (changed) {
        saveMetadata();
        saveTokens();
    }
}, 5 * 60 * 1000);

// Error handling
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'File too large. Maximum size is 100MB.' });
        }
    }
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`ZeroVault server running at http://localhost:${PORT}`);
});
