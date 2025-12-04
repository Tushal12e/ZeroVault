const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Serve static files from 'public' directory
app.use(express.static('public'));

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
    fs.writeFileSync(META_FILE, JSON.stringify(fileMetadata, null, 2));
}

// Configure Multer for file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Upload Route
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    // Read options from query params
    const burn = req.query.burn === 'true';

    fileMetadata[req.file.filename] = {
        burn: burn,
        timestamp: Date.now()
    };
    saveMetadata(); // Save to disk

    console.log(`File uploaded: ${req.file.filename} [Burn: ${burn}]`);
    res.json({ filename: req.file.filename });
});

// File Retrieval Route
app.get('/files/:id', (req, res) => {
    const fileId = req.params.id;
    const filePath = path.join(__dirname, 'uploads', fileId);

    if (fs.existsSync(filePath)) {
        res.download(filePath, (err) => {
            if (!err) {
                // Check metadata for Burn-After-Reading
                const meta = fileMetadata[fileId];
                if (meta && meta.burn) {
                    console.log(`Burning file: ${fileId}`);
                    fs.unlink(filePath, (unlinkErr) => {
                        if (unlinkErr) console.error('Error burning file:', unlinkErr);
                        else {
                            delete fileMetadata[fileId];
                            saveMetadata(); // Save changes
                        }
                    });
                }
            }
        });
    } else {
        res.status(404).send('File not found (or already burnt).');
    }
});

// Cleanup Job (Runs every minute)
setInterval(() => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) return;

    const files = fs.readdirSync(uploadDir);
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;

    let changed = false;
    files.forEach(file => {
        const filePath = path.join(uploadDir, file);
        const stats = fs.statSync(filePath);

        // Delete if older than 24 hours
        if (now - stats.mtimeMs > ONE_DAY) {
            console.log(`Auto-expiring file: ${file}`);
            fs.unlinkSync(filePath);
            if (fileMetadata[file]) {
                delete fileMetadata[file];
                changed = true;
            }
        }
    });

    if (changed) saveMetadata();
}, 60 * 1000); // Check every minute

app.listen(PORT, () => {
    console.log(`ZeroVault server running at http://localhost:${PORT}`);
});
