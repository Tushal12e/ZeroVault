const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

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
            connectSrc: ["'self'"]
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
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 uploads per 15 minutes
    message: { error: 'Too many uploads, please try again later.' }
});

const downloadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // 100 downloads per 15 minutes
    message: { error: 'Too many download requests, please try again later.' }
});

// Serve static files from 'public' directory with caching
app.use(express.static('public', {
    maxAge: '1d',
    etag: true
}));

// Metadata store (Persistent JSON)
const META_FILE = 'metadata.json';
let fileMetadata = {};

// Load metadata from disk
if (fs.existsSync(META_FILE)) {
    try {
        fileMetadata = JSON.parse(fs.readFileSync(META_FILE));
    } catch (e) {
        console.error("Error reading metadata:", e);
        fileMetadata = {};
    }
}

function saveMetadata() {
    try {
        fs.writeFileSync(META_FILE, JSON.stringify(fileMetadata, null, 2));
    } catch (e) {
        console.error("Error saving metadata:", e);
    }
}

// Configure Multer with file size limit
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate random filename for security
        const randomId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        cb(null, randomId);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: MAX_FILE_SIZE
    }
});

// Expiry time options (in milliseconds)
const EXPIRY_TIMES = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000
};

// Upload Route
app.post('/upload', uploadLimiter, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    // Read options from query params
    const burn = req.query.burn === 'true';
    const expiryOption = req.query.expiry || '24h';
    const expiryMs = EXPIRY_TIMES[expiryOption] || EXPIRY_TIMES['24h'];

    fileMetadata[req.file.filename] = {
        burn: burn,
        timestamp: Date.now(),
        expiresAt: Date.now() + expiryMs,
        expiryOption: expiryOption,
        downloads: 0,
        originalName: req.file.originalname,
        size: req.file.size
    };
    saveMetadata();

    console.log(`File uploaded: ${req.file.filename} [Burn: ${burn}, Expiry: ${expiryOption}]`);
    res.json({ 
        filename: req.file.filename,
        expiresAt: fileMetadata[req.file.filename].expiresAt
    });
});

// File Info Route (for showing expiry info)
app.get('/info/:id', (req, res) => {
    const fileId = req.params.id;
    const meta = fileMetadata[fileId];
    
    if (!meta) {
        return res.status(404).json({ error: 'File not found' });
    }

    res.json({
        expiresAt: meta.expiresAt,
        expiryOption: meta.expiryOption,
        downloads: meta.downloads,
        burn: meta.burn,
        size: meta.size
    });
});

// File Retrieval Route
app.get('/files/:id', downloadLimiter, (req, res) => {
    const fileId = req.params.id;
    const filePath = path.join(__dirname, 'uploads', fileId);
    const meta = fileMetadata[fileId];

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        if (meta) {
            delete fileMetadata[fileId];
            saveMetadata();
        }
        return res.status(404).json({ error: 'File not found (or already burnt/expired).' });
    }

    // Check if expired
    if (meta && meta.expiresAt && Date.now() > meta.expiresAt) {
        console.log(`File expired: ${fileId}`);
        fs.unlinkSync(filePath);
        delete fileMetadata[fileId];
        saveMetadata();
        return res.status(410).json({ error: 'File has expired.' });
    }

    // Increment download counter
    if (meta) {
        meta.downloads = (meta.downloads || 0) + 1;
        saveMetadata();
    }

    res.download(filePath, (err) => {
        if (err && !res.headersSent) {
            console.error('Download error:', err);
            return;
        }
        
        // Check metadata for Burn-After-Reading (only after successful download)
        if (!err && meta && meta.burn) {
            console.log(`Burning file: ${fileId}`);
            // Use setTimeout to ensure file is released
            setTimeout(() => {
                fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr && unlinkErr.code !== 'ENOENT') {
                        console.error('Error burning file:', unlinkErr);
                    } else {
                        delete fileMetadata[fileId];
                        saveMetadata();
                    }
                });
            }, 1000);
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// Cleanup Job (Runs every 5 minutes)
setInterval(() => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) return;

    const files = fs.readdirSync(uploadDir);
    const now = Date.now();

    let changed = false;
    files.forEach(file => {
        const filePath = path.join(uploadDir, file);
        const meta = fileMetadata[file];

        // Delete if expired
        if (meta && meta.expiresAt && now > meta.expiresAt) {
            console.log(`Auto-expiring file: ${file}`);
            try {
                fs.unlinkSync(filePath);
                delete fileMetadata[file];
                changed = true;
            } catch (e) {
                console.error(`Error deleting ${file}:`, e);
            }
        } 
        // Also delete orphaned files (no metadata, older than 24 hours)
        else if (!meta) {
            try {
                const stats = fs.statSync(filePath);
                if (now - stats.mtimeMs > 24 * 60 * 60 * 1000) {
                    console.log(`Deleting orphaned file: ${file}`);
                    fs.unlinkSync(filePath);
                    changed = true;
                }
            } catch (e) {
                console.error(`Error checking ${file}:`, e);
            }
        }
    });

    if (changed) saveMetadata();
}, 5 * 60 * 1000); // Check every 5 minutes

// Error handling middleware
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
