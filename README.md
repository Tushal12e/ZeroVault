# 🔒 ZeroVault

**Zero-Knowledge Secure File Sharing Platform**

A privacy-first file sharing application where files are encrypted in your browser before upload. The server never sees your unencrypted data.

---

## ✨ Features

### 🔐 Security & Privacy
| Feature | Description |
|---------|-------------|
| **Client-Side Encryption** | AES-256-GCM encryption happens in your browser |
| **Zero-Knowledge Architecture** | Server cannot decrypt your files |
| **Password Protection** | Optional password for extra security |
| **Zero-Knowledge Proof** | Verify file integrity without exposing content |
| **Encrypted Metadata** | Filenames are encrypted in the URL |

### 🔥 File Management
| Feature | Description |
|---------|-------------|
| **Burn After Reading** | Files auto-delete after first download |
| **Custom Expiry** | 1 hour, 6 hours, 24 hours, or 7 days |
| **Disposable Links** | One-time use download links |
| **Self-Healing Links** | Regenerate links while invalidating old ones |

### 📱 Sharing Options
| Feature | Description |
|---------|-------------|
| **QR Code** | Scan to download on mobile |
| **Social Share** | WhatsApp, Telegram, Twitter, Email |
| **Short Links** | Compact URLs for easy sharing |

### 🎨 User Experience
| Feature | Description |
|---------|-------------|
| **Dark/Light Theme** | Toggle between themes |
| **Terminal Mode** | Matrix-style hacker theme |
| **Sound Effects** | Audio feedback for actions |
| **Confetti Celebration** | Fun animation on successful upload |
| **Live Countdown** | Real-time expiry countdown |
| **Drag & Drop** | Easy file upload |
| **Keyboard Shortcuts** | Ctrl+V paste, Ctrl+Enter upload |

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Backend:** Node.js, Express.js
- **Encryption:** Web Crypto API (AES-256-GCM, PBKDF2)
- **Storage:** Local filesystem with auto-cleanup

---

## 📊 Project Details

| Property | Value |
|----------|-------|
| **Version** | v5.6 |
| **Author** | Tushal |
| **License** | MIT |

---

## 🔒 How It Works

1. **Select File** → Choose any file to upload
2. **Encrypt** → File is encrypted in your browser using AES-256-GCM
3. **Upload** → Only encrypted data is sent to server
4. **Share** → Get a unique link containing the decryption key
5. **Download** → Recipient decrypts file in their browser

**The server NEVER sees your unencrypted data!**

---

## 📸 Screenshots

*Coming soon...*

---

Made with ❤️ for privacy
