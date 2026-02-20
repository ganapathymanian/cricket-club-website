
# Cricket Club Website

A full-featured cricket club management website with fixture management, team sheets, player statistics, training administration, and member management.

## 🏏 Features

- **Fixture Management** - Create, edit, and publish match fixtures
- **Fixture Generator** - Auto-generate season fixtures with ground allocation
- **Team Sheets** - Configure teams, players, and ground information
- **Training Administration** - Weather-based training notifications
- **User Management** - Role-based access (Admin, Coach, Player, Fan)
- **Admin Settings** - Configure email, WhatsApp, and home grounds
- **� Photo Attendance** - Scan member photos to mark training/match attendance with face comparison
- **�📱 Mobile Apps** - Native iOS & Android apps via Capacitor
- **💾 Offline Support** - PWA with offline caching
- **🔒 Security Hardened** - Rate limiting, secure headers, JWT auth, RBAC, input validation

---

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js v18+ (Download from https://nodejs.org)

### Install & Run

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..

# Start backend server (Terminal 1)
cd server
node index-simple.js

# Start frontend dev server (Terminal 2)
npm run dev
```

Open http://localhost:5173 in your browser.

### First-Time Setup

1. Copy `server/.env.example` to `server/.env` and fill in the required values
2. Register a new account via the Sign Up page
3. To make a user an admin, set `SUPER_ADMIN_EMAILS` in your `.env` file:
   ```env
   SUPER_ADMIN_EMAILS=your-email@example.com
   ```

---

## 📱 Mobile App Development (iOS & Android)

This project supports building native mobile apps using **Capacitor**. You can also install it as a **Progressive Web App (PWA)** directly from the browser.

### Option 1: Progressive Web App (PWA) - Easiest

The website is a PWA that can be installed on any device directly from the browser.

**iOS (Safari):**
1. Open the website in Safari
2. Tap the Share button (square with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"**

**Android (Chrome):**
1. Open the website in Chrome
2. Tap the three-dot menu
3. Tap **"Add to Home Screen"** or **"Install App"**
4. Tap **"Install"**

**Desktop (Chrome/Edge):**
1. Open the website
2. Click the install icon in the address bar (or three-dot menu → Install)

### Option 2: Native Apps with Capacitor

Build true native iOS and Android apps that can be published to the App Store and Google Play.

#### Prerequisites

| Platform | Requirements |
|----------|--------------|
| **iOS** | macOS with Xcode 14+ (free from App Store) |
| **Android** | Android Studio (Windows/macOS/Linux) |
| **Both** | Node.js 18+, npm |

#### Step 1: Build the Web App

```bash
cd "Cricket Club Website"
npm run build
```

This creates the `dist/` folder with optimized production files.

#### Step 2: Add Platforms

```bash
# Add iOS platform (macOS only)
npx cap add ios

# Add Android platform
npx cap add android
```

#### Step 3: Sync Changes

Run this whenever you update the web app:

```bash
npm run build
npx cap sync
```

#### Step 4: Open in Native IDE

```bash
# Open in Xcode (iOS)
npx cap open ios

# Open in Android Studio
npx cap open android
```

#### Step 5: Run on Device/Emulator

**iOS:**
1. In Xcode, select your target device or simulator
2. Click the Play button (▶) or press `Cmd + R`

**Android:**
1. In Android Studio, select a device/emulator
2. Click Run (▶) or press `Shift + F10`

### API Configuration for Mobile Apps

The mobile app needs to connect to your backend server. Update `utils/config.ts`:

```typescript
const CONFIG = {
    // For development on same machine
    apiUrl: 'http://localhost:3001/api',
    
    // For testing on physical devices (use your computer's local IP)
    // apiUrl: 'http://192.168.1.100:3001/api',
    
    // For production (use your server URL)
    // apiUrl: 'https://api.yourclub.com/api',
};
```

**Finding your local IP:**
```bash
# Windows
ipconfig

# macOS/Linux
ifconfig
```

### Building for Release

#### iOS App Store

1. In Xcode, go to **Product → Archive**
2. Once archived, click **Distribute App**
3. Follow the prompts to upload to App Store Connect

**Requirements:**
- Apple Developer Account ($99/year)
- App icons (1024x1024)
- Screenshots for each device size
- Privacy policy URL

#### Google Play Store

1. In Android Studio, go to **Build → Generate Signed Bundle / APK**
2. Create or select a keystore
3. Choose **Android App Bundle (AAB)**
4. Upload to Google Play Console

**Requirements:**
- Google Play Developer Account ($25 one-time)
- App icons (512x512)
- Feature graphic (1024x500)
- Screenshots
- Privacy policy URL

### App Icons and Splash Screens

#### Generate App Icons

Use online tools or npm packages:

```bash
# Install icon generator
npm install -g cordova-res

# Create source icons in resources/
# icon.png (1024x1024)
# splash.png (2732x2732)

# Generate all sizes
cordova-res ios --skip-config --copy
cordova-res android --skip-config --copy
```

Or manually create icons:

| Platform | Size | File |
|----------|------|------|
| iOS | 1024x1024 | `ios/App/App/Assets.xcassets/AppIcon.appiconset/` |
| Android | 512x512 | `android/app/src/main/res/mipmap-xxxhdpi/` |
| PWA | 192x192, 512x512 | `public/pwa-192x192.png`, `public/pwa-512x512.png` |

### Capacitor Commands Reference

```bash
# Initialize Capacitor
npx cap init "App Name" "com.example.app"

# Add platforms
npx cap add ios
npx cap add android

# Sync web app to native projects
npx cap sync

# Open in IDE
npx cap open ios
npx cap open android

# Run on device (requires platform CLI)
npx cap run ios
npx cap run android

# Update Capacitor
npm install @capacitor/core@latest @capacitor/cli@latest
npx cap sync
```

### Useful Capacitor Plugins

```bash
# Push Notifications
npm install @capacitor/push-notifications
npx cap sync

# Camera
npm install @capacitor/camera
npx cap sync

# Geolocation
npm install @capacitor/geolocation
npx cap sync

# Share
npm install @capacitor/share
npx cap sync

# Status Bar
npm install @capacitor/status-bar
npx cap sync

# Splash Screen
npm install @capacitor/splash-screen
npx cap sync
```

### Troubleshooting Mobile Apps

#### "Unable to load webpage"
- Ensure backend server is running and accessible
- Check API URL in config matches your server
- For physical devices, use your computer's IP, not `localhost`

#### iOS: "App Transport Security" errors
Add to `ios/App/App/Info.plist`:
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

#### Android: "Cleartext traffic not permitted"
`allowMixedContent` is set to `false` in `capacitor.config.json` for security. For local development only, you may temporarily set it to `true`, but **never deploy to production with mixed content enabled**.

#### Changes not appearing in app
```bash
npm run build
npx cap sync
```
Then rebuild in Xcode/Android Studio

---

## � Photo Attendance Scanner

The Photo Attendance Scanner allows coaches, board members, and committee members to record member attendance at training sessions and matches by scanning a photo of the member and comparing it against their stored profile photo.

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Coach opens "Photo Attendance" from Training menu           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Selects date & session type (Training / Match / Nets)       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Starts camera and captures member's photo                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. System compares captured photo against all stored profile    │
│     photos using color histogram matching                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. Displays ranked match results with confidence %              │
│     Coach taps "Mark" to confirm attendance                      │
└─────────────────────────────────────────────────────────────────┘
```

### Who Can Use It

| Role | Access Level |
|------|-------------|
| **Admin** | Full access — scan, mark, delete attendance |
| **Head Coach** | Full access — scan, mark, delete attendance |
| **Coach** | Full access — scan, mark, delete attendance |
| **Fixture Secretary** | Can scan and mark attendance |
| **Accountant** | Can scan and mark attendance |
| **Member** | No access to attendance scanner |

### Navigation

- **Desktop**: Click **Training** dropdown → **📷 Photo Attendance**
- **Mobile**: Open the hamburger menu → expand **Training** → tap **📷 Photo Attendance**

### Features

- **Camera Scanning**: Use front or rear camera to capture member photos on-site
- **Photo Comparison**: Automatic matching against stored profile photos with confidence scores
- **Match Results**: Ranked results showing top 5 potential matches with percentage confidence
- **Manual Fallback**: Search and mark members manually when photo scanning isn't practical
- **Session Types**: Training, Match, Nets Practice, Club Meeting
- **Duplicate Prevention**: Cannot mark the same member twice for the same date/session
- **Attendance History**: Full table view of who is present, marked by whom, and when
- **Delete Records**: Coaches and admins can remove incorrect attendance entries

### Profile Photos (Required for Scanning)

For photo scanning to work, members must have a profile photo uploaded. Photos can be added:

1. **During Sign-Up**: The registration form includes a "Profile Photo" section where new members can take or upload a photo
2. **By Admin**: Admins can upload/update a member's photo from **Admin** → **Members** → **View Details** → **Profile Photo**
3. **Camera or File Upload**: Both options are available — take a photo with the device camera or upload an existing image

> **Photo Requirements:**
> - Clear, well-lit face photo
> - Photos are automatically cropped to a square (400×400px) and compressed to JPEG
> - Maximum file size: 5MB (before compression)
> - Photos are stored as base64 in the backend

### API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `PUT` | `/api/users/:userId/profile-photo` | Upload/update profile photo | Yes (own photo or admin) |
| `GET` | `/api/users/:userId/profile-photo` | Get a member's profile photo | Yes |
| `GET` | `/api/members/with-photos` | Get all members with photos | Yes (coach/admin/committee) |
| `POST` | `/api/attendance` | Record attendance | Yes (coach/admin/committee) |
| `GET` | `/api/attendance?date=&memberId=&sessionType=` | Query attendance records | Yes |
| `DELETE` | `/api/attendance/:id` | Delete an attendance record | Yes (coach/admin) |

### Troubleshooting

#### "Could not access camera"
- Ensure the browser has camera permission granted (check the address bar for camera icon)
- On iOS Safari, go to **Settings → Safari → Camera** and set to **Allow**
- On Android Chrome, go to **Settings → Site Settings → Camera** and allow the site
- If using Nginx, ensure the `Permissions-Policy` header allows `camera=(self)` (not `camera=()`)

#### "No member photos found" warning
- Members need to upload profile photos first
- Admins can bulk-upload photos via the **Admin → Members** page
- Use the **Manual Mark** button as a fallback

#### Low match confidence scores
- Ensure profile photos are clear, well-lit face shots
- Captured scan photos should have similar lighting to the profile photo
- The system uses color histogram comparison — photos taken in very different lighting conditions may score lower
- When in doubt, use the **Manual Mark** fallback

---

## �📦 Backup & Deployment Guide

### Creating a Backup

**Windows (PowerShell):**
```powershell
Compress-Archive -Path "C:\path\to\Cricket Club Website" -DestinationPath "C:\Backups\CricketClubWebsite.zip"
```

**Linux/macOS:**
```bash
zip -r CricketClubWebsite.zip "Cricket Club Website"
```

---

## 🖥️ Server Requirements

### Option A: Simple Hosting (In-Memory Server)
| Requirement | Minimum |
|-------------|---------|
| OS | Windows, Linux, or macOS |
| Node.js | v18+ LTS |
| RAM | 512MB |
| Disk | 1GB |

### Option B: Full Production (With MSSQL Database)
| Requirement | Minimum |
|-------------|---------|
| OS | Windows Server 2019+ or Linux |
| Node.js | v18+ LTS |
| SQL Server | 2019+ (Express edition is free) |
| RAM | 2GB+ |
| Disk | 5GB+ |

---

## 📋 Software Installation

### 1. Node.js (Required)

**Windows:**
Download and run the installer from https://nodejs.org/en/download/

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**RHEL/CentOS:**
```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
```

### 2. Git (Optional but recommended)

**Windows:** Download from https://git-scm.com/download/win

**Linux:**
```bash
sudo apt-get install git
```

### 3. PM2 - Process Manager (Recommended for production)
```bash
npm install -g pm2
```

### 4. SQL Server (Only for MSSQL mode)
- **Windows:** Download SQL Server Express from Microsoft
- **Linux:** Follow [Microsoft's SQL Server on Linux guide](https://docs.microsoft.com/en-us/sql/linux/sql-server-linux-setup)

---

## 🚀 Production Deployment Steps

### Step 1: Transfer Files
Copy the project folder to your server via:
- USB drive
- FTP/SFTP
- SCP: `scp -r "Cricket Club Website" user@server:/var/www/`
- Git clone

### Step 2: Install Dependencies
```bash
cd "Cricket Club Website"

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
```

### Step 3: Build Frontend for Production
```bash
cd "Cricket Club Website"
npm run build
```
This creates an optimized `dist/` folder with static files.

### Step 4: Configure Server URL
Edit `utils/config.ts` and update the API URL:
```typescript
const CONFIG = {
    apiUrl: 'http://YOUR_SERVER_IP:3001/api',  // ← Change this
    authMode: 'jwt' as const,
};
```

Then rebuild: `npm run build`

> ⚠️ **Important:** Never hardcode secrets, API keys, or passwords in source code. Use environment variables via `server/.env`.

### Step 5: Start Backend Server

**Development (manual):**
```bash
cd server
node index-simple.js
```

**Production (with PM2 - auto-restart):**
```bash
cd server
pm2 start index-simple.js --name "cricket-api"
pm2 save
pm2 startup  # Makes it start on server boot
```

### Step 6: Serve Frontend

**Option A: Simple static server**
```bash
npm install -g serve
cd "Cricket Club Website"
serve -s dist -l 80
```

**Option B: Nginx (Recommended)**

Install Nginx:
```bash
sudo apt-get install nginx
```

Create config `/etc/nginx/sites-available/cricket-club`:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS (uncomment when SSL is configured)
    # return 301 https://$host$request_uri;
    
    root /var/www/cricket-club/dist;
    index index.html;
    
    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(self), microphone=(), geolocation=()" always;
    
    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/cricket-club /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔐 Firewall Configuration

Open these ports on your server:

| Port | Service | Required |
|------|---------|----------|
| 80 | HTTP (Frontend) | Yes |
| 443 | HTTPS (Frontend) | Yes (recommended) |
| 3001 | Backend API | ⚠️ **No** — use Nginx reverse proxy instead |

> ⚠️ **Do not expose port 3001 to the internet.** Use Nginx as a reverse proxy so all traffic goes through port 80/443 with proper security headers and TLS.

**Ubuntu/Debian:**
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# Do NOT open port 3001 publicly — Nginx proxies API traffic internally
```

**Windows:**
```powershell
New-NetFirewallRule -DisplayName "Cricket Club Frontend" -Direction Inbound -Port 80 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Cricket Club HTTPS" -Direction Inbound -Port 443 -Protocol TCP -Action Allow
```

---

## 📁 Project Structure

```
Cricket Club Website/
├── src/                    # Frontend React source
│   ├── vite-env.d.ts       # Vite environment type declarations
│   └── app/
│       └── components/     # React components
│           ├── AttendanceScannerPage.tsx  # Photo attendance scanner
│           ├── ProfilePhotoUpload.tsx     # Reusable photo upload/camera component
│           └── ...                       # Other page components
├── server/                 # Backend Express server
│   ├── index-simple.js     # In-memory server (no DB required)
│   ├── index.js            # MSSQL server
│   ├── db.js               # Database connection module
│   ├── .env.example        # Environment variable template
│   └── database/
│       └── schema.sql      # Database schema
├── utils/
│   └── config.ts           # Frontend API configuration
├── dist/                   # Production build output
├── .gitignore              # Git ignore rules (protects .env files)
├── package.json            # Frontend dependencies
└── README.md               # This file
```

---

## 🔄 Backend Modes

### In-Memory Mode (Default)
- Uses `server/index-simple.js`
- No database required
- Data resets on server restart
- Perfect for development and demos

### MSSQL Mode
- Uses `server/index.js`
- Requires SQL Server
- Persistent data storage
- For production use

To switch modes, update `utils/config.ts`:
```typescript
export const BACKEND_MODE: BackendMode = 'local';  // 'local' or 'supabase'
```

---

## � Google OAuth Authentication Setup

Enable "Sign in with Google" for your cricket club website. This allows members to log in using their Google accounts.

### Prerequisites
- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown (top-left, next to "Google Cloud")
3. Click **"New Project"**
4. Enter project details:
   - **Project name**: `Cricket Club Website` (or your preferred name)
   - **Organization**: Leave as default or select your organization
5. Click **"Create"**
6. Wait for the project to be created, then select it from the dropdown

### Step 2: Configure OAuth Consent Screen

Before creating credentials, you must configure how users see the login screen.

1. In the left sidebar, go to **APIs & Services** → **OAuth consent screen**
2. Select **User Type**:
   - **External** - Anyone with a Google account can sign in (recommended for clubs)
   - **Internal** - Only users in your Google Workspace organization
3. Click **"Create"**

4. Fill in **App Information**:
   | Field | Value |
   |-------|-------|
   | App name | `Adamstown Cricket Club` (your club name) |
   | User support email | Your email address |
   | App logo | Upload your club logo (optional, 120x120px) |

5. Fill in **App Domain** (optional for development):
   | Field | Value |
   |-------|-------|
   | Application home page | `https://yourclub.com` |
   | Application privacy policy | `https://yourclub.com/privacy` |
   | Application terms of service | `https://yourclub.com/terms` |

6. Fill in **Developer contact information**:
   - Add your email address

7. Click **"Save and Continue"**

8. **Scopes** - Click **"Add or Remove Scopes"**:
   - Select these scopes:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `openid`
   - Click **"Update"**
   - Click **"Save and Continue"**

9. **Test Users** (for External apps in testing):
   - Click **"Add Users"**
   - Add email addresses of people who can test before publishing
   - Click **"Save and Continue"**

10. Review the summary and click **"Back to Dashboard"**

### Step 3: Create OAuth 2.0 Credentials

1. In the left sidebar, go to **APIs & Services** → **Credentials**
2. Click **"+ Create Credentials"** → **"OAuth client ID"**

3. Configure the OAuth client:
   | Field | Value |
   |-------|-------|
   | Application type | **Web application** |
   | Name | `Cricket Club Web Client` |

4. Add **Authorized JavaScript origins** (where the login button appears):

   **For Development:**
   ```
   http://localhost:5173
   http://localhost:5174
   http://localhost:3000
   ```

   **For Production:**
   ```
   https://yourclub.com
   https://www.yourclub.com
   ```

5. Add **Authorized redirect URIs** (where Google sends users after login):
   
   > **Note:** For `@react-oauth/google` library, you typically don't need redirect URIs 
   > as it uses popup/redirect handled client-side. But add these if needed:

   **For Development:**
   ```
   http://localhost:5173
   http://localhost:5174
   ```

   **For Production:**
   ```
   https://yourclub.com
   https://www.yourclub.com
   ```

6. Click **"Create"**

7. **Copy Your Credentials** - A dialog will show:
   - **Client ID**: `123456789-abcdefg.apps.googleusercontent.com` ← Copy this!
   - **Client Secret**: (Not needed for frontend-only OAuth)

   > ⚠️ **Important**: Save your Client ID securely. You'll need it for configuration.

### Step 4: Configure Your Application

#### Frontend Configuration

Create a `.env` file in the project root (`Cricket Club Website/.env`):

```env
# Google OAuth Client ID
VITE_GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
```

Or edit `utils/config.ts` directly:

```typescript
const CONFIG = {
    apiUrl: 'http://localhost:3001/api',
    authMode: 'jwt' as const,
    googleClientId: '123456789-abcdefg.apps.googleusercontent.com',
};
```

#### Backend Configuration

Create a `.env` file in the server folder (`Cricket Club Website/server/.env`). See `server/.env.example` for the full template:

```env
# Google OAuth Client ID (same as frontend)
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com

# REQUIRED: JWT Secret for token signing (generate a strong random string)
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your-secure-random-string-here

# Super admin emails (comma-separated)
SUPER_ADMIN_EMAILS=admin@yourclub.com

# CORS allowed origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:5173,https://yourclub.com
```

Or set environment variables before starting the server:

**Windows PowerShell:**
```powershell
$env:GOOGLE_CLIENT_ID = "123456789-abcdefg.apps.googleusercontent.com"
node index-simple.js
```

**Linux/macOS:**
```bash
GOOGLE_CLIENT_ID="123456789-abcdefg.apps.googleusercontent.com" node index-simple.js
```

### Step 5: Restart and Test

1. **Restart the backend server:**
   ```bash
   cd server
   node index-simple.js
   ```

2. **Restart the frontend:**
   ```bash
   npm run dev
   ```

3. **Test Google Sign-In:**
   - Open http://localhost:5173
   - Click **"Continue with Google"** button
   - Select your Google account
   - You should be logged in!

### Step 6: Publish for Production (Optional)

While in "Testing" mode, only users you added as test users can sign in. To allow anyone:

1. Go to **APIs & Services** → **OAuth consent screen**
2. Click **"Publish App"**
3. Confirm the warnings
4. Your app is now in production mode

> **Note**: Google may require app verification for certain scopes. Basic email/profile scopes usually don't require verification.

### Troubleshooting Google OAuth

#### "Sign in with Google button not showing"
- Check that `VITE_GOOGLE_CLIENT_ID` is set correctly
- Ensure the Client ID doesn't have extra spaces
- Restart the frontend dev server after changing `.env`

#### "Error 400: redirect_uri_mismatch"
- Go to Google Cloud Console → Credentials
- Edit your OAuth client
- Add your exact URL to **Authorized JavaScript origins**
- Example: If accessing via `http://localhost:5173`, add exactly `http://localhost:5173`

#### "Error 403: access_denied" or "App not verified"
- For testing: Add your email to test users in OAuth consent screen
- For production: Publish your app

#### "idpiframe_initialization_failed"
- This usually means cookies are blocked
- Try in an incognito window
- Disable browser extensions that block third-party cookies

#### "Google token verification failed" (Backend)
- Ensure `GOOGLE_CLIENT_ID` on backend matches frontend
- Check server logs for detailed error messages

### Google OAuth Flow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                     User clicks "Sign in with Google"            │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              Google OAuth popup opens                            │
│              User selects Google account                         │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              Google returns ID Token (JWT)                       │
│              Contains: email, name, picture, etc.                │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              Frontend sends token to /api/auth/google            │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              Backend verifies token with Google                  │
│              Creates/finds user in database                      │
│              Returns session JWT token                           │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              User is logged in! 🎉                               │
└─────────────────────────────────────────────────────────────────┘
```

---
## 🔐 Security

### Overview

This application implements multiple layers of security for both web and mobile:

| Layer | Protection |
|-------|-----------|
| **Authentication** | JWT tokens with 1-hour expiry, bcrypt password hashing (10 rounds) |
| **Authorization** | Role-based access control (RBAC) enforced server-side via `requireAdmin` middleware |
| **Rate Limiting** | Per-IP rate limiting — 10 requests/15 min for auth endpoints, 100/15 min general |
| **CORS** | Restricted to explicit allowed origins (no wildcard `*`) |
| **Security Headers** | X-Frame-Options, X-Content-Type-Options, XSS-Protection, Referrer-Policy, Permissions-Policy (`camera=(self)`) |
| **Input Validation** | Email format validation, password length enforcement (8–128 chars), string sanitization |
| **Request Limits** | Request body size limited to 10 MB (supports base64 photo uploads) |
| **Secrets Management** | All secrets via environment variables — no hardcoded credentials in source code |

### Environment Variables (Required for Production)

All sensitive configuration is managed via `server/.env`. Copy from `server/.env.example`:

```bash
cd server
cp .env.example .env
# Edit .env and fill in all required values
```

**Generate a strong JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

> ⚠️ If `JWT_SECRET` is not set, the server generates a random one at startup. This means **all user sessions are invalidated on every server restart**. Always set `JWT_SECRET` in production.

### Security Best Practices

1. **Always use HTTPS in production** — use a reverse proxy (Nginx) with TLS/SSL certificates (Let's Encrypt is free)
2. **Never expose port 3001 publicly** — proxy API requests through Nginx on port 443
3. **Never commit `.env` files** — the `.gitignore` file is configured to exclude them
4. **Rotate JWT secrets periodically** — update `JWT_SECRET` and restart the server
5. **Monitor rate limit hits** — 429 responses in server logs indicate potential attacks
6. **Keep dependencies updated** — run `npm audit` regularly

### Mobile App Security

- **Android**: `allowMixedContent` is set to `false` — only HTTPS connections are allowed
- **iOS/Android**: Capacitor uses `https` scheme by default
- **Token Storage**: JWTs are stored in the app's local storage (sandboxed per app on mobile)

---
## �🛠️ Troubleshooting

### "node is not recognized"
Add Node.js to your PATH or use full path:
```powershell
& "C:\Program Files\nodejs\node.exe" server/index-simple.js
```

### "Port 3001 already in use"
Kill existing process:
```bash
# Linux/macOS
lsof -ti:3001 | xargs kill -9

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### "CORS errors"
- Ensure the backend URL in `config.ts` matches your server address
- Check that your frontend origin is listed in `ALLOWED_ORIGINS` in `server/.env`
- CORS is restricted to specific origins — wildcard `*` is not allowed

---

## 📝 Quick Deployment Checklist

- [ ] Node.js v18+ installed
- [ ] Project files transferred to server
- [ ] `npm install` run in root folder
- [ ] `npm install` run in server folder
- [ ] `server/.env` created from `server/.env.example` with all secrets set
- [ ] `JWT_SECRET` set to a strong random value (64+ hex characters)
- [ ] `DB_PASSWORD` set (if using MSSQL mode)
- [ ] `SUPER_ADMIN_EMAILS` configured
- [ ] `ALLOWED_ORIGINS` set to your production domain(s)
- [ ] `npm run build` completed
- [ ] `config.ts` updated with server URL
- [ ] Backend started (PM2 recommended)
- [ ] Frontend served (Nginx recommended)
- [ ] HTTPS/TLS configured (use Let's Encrypt or reverse proxy)
- [ ] Firewall ports opened (only 80/443 — **do not expose port 3001**)
- [ ] `.env` file is NOT committed to git
- [ ] Test login via Sign Up → set admin via `SUPER_ADMIN_EMAILS`

---

## 📄 License

MIT License
