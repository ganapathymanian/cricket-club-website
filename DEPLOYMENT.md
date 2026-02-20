# 🏏 Cricket Club Website — Deployment Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Option 1: Docker Container (Recommended)](#option-1-docker-container-recommended)
- [Option 2: Linux Server (Ubuntu/Debian)](#option-2-linux-server-ubuntudebian)
- [Option 3: Windows Server (IIS + Node)](#option-3-windows-server-iis--node)
- [SSL/HTTPS Setup](#sslhttps-setup)
- [Environment Variables](#environment-variables)
- [Security Checklist](#security-checklist)
- [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 20.x LTS or later |
| npm | 10.x or later |
| Docker (for container) | 24.x or later |
| Docker Compose (for container) | 2.x or later |

---

## Option 1: Docker Container (Recommended)

The simplest and most secure deployment — everything runs in isolated containers.

### Step 1: Prepare Environment File

```bash
cp .env.example .env
```

Edit `.env` with production values:
```env
VITE_API_URL=https://yourdomain.com/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id
JWT_SECRET=<generate with: openssl rand -hex 64>
GOOGLE_CLIENT_ID=your-google-client-id
SUPER_ADMIN_EMAILS=admin@yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Step 2: Add SSL Certificates

Place your SSL certificates in `nginx/ssl/`:
```bash
mkdir -p nginx/ssl
cp /path/to/fullchain.pem nginx/ssl/
cp /path/to/privkey.pem nginx/ssl/
```

For free SSL with Let's Encrypt:
```bash
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
```

### Step 3: Update nginx.conf

Edit `nginx/nginx.conf` — replace `yourdomain.com` with your actual domain in all `server_name` directives.

### Step 4: Build & Deploy

```bash
# Build and start all containers
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f app
docker compose logs -f nginx

# Stop
docker compose down
```

### Step 5: Auto-restart on System Boot

Docker Compose services are configured with `restart: unless-stopped`, so they'll automatically restart after a server reboot if Docker itself is enabled:

```bash
sudo systemctl enable docker
```

---

## Option 2: Linux Server (Ubuntu/Debian)

### Step 1: Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx
```

### Step 2: Clone & Build

```bash
# Create app directory
sudo mkdir -p /var/www/cricket-club
sudo chown $USER:$USER /var/www/cricket-club

# Copy project files (or git clone)
cp -r . /var/www/cricket-club/
cd /var/www/cricket-club

# Install frontend dependencies & build
npm ci
npm run build

# Install server dependencies
cd server
npm ci --production
cd ..
```

### Step 3: Create Environment File

```bash
cp .env.example .env
nano .env
# Fill in production values (JWT_SECRET, GOOGLE_CLIENT_ID, etc.)
chmod 600 .env
```

### Step 4: Create systemd Service

```bash
sudo tee /etc/systemd/system/cricket-club.service > /dev/null <<EOF
[Unit]
Description=Cricket Club Website Backend
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/cricket-club/server
EnvironmentFile=/var/www/cricket-club/.env
ExecStart=/usr/bin/node index-simple.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=cricket-club
Environment=NODE_ENV=production
Environment=PORT=3001

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/www/cricket-club
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable cricket-club
sudo systemctl start cricket-club
sudo systemctl status cricket-club
```

### Step 5: Configure NGINX

```bash
sudo tee /etc/nginx/sites-available/cricket-club > /dev/null <<'EOF'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Static frontend
    root /var/www/cricket-club/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 10M;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/cricket-club /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### Step 6: SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (already set up by certbot, verify with):
sudo certbot renew --dry-run
```

---

## Option 3: Windows Server (IIS + Node)

### Step 1: Install Prerequisites

1. Install **Node.js 20 LTS** from https://nodejs.org
2. Install **iisnode** from https://github.com/Azure/iisnode/releases
3. Enable IIS via **Server Manager → Add Roles → Web Server (IIS)**
4. Install **URL Rewrite** module from https://www.iis.net/downloads/microsoft/url-rewrite

### Step 2: Build the Project

```powershell
cd C:\inetpub\wwwroot\cricket-club
npm ci
npm run build

cd server
npm ci --production
```

### Step 3: Create web.config

Create `C:\inetpub\wwwroot\cricket-club\web.config`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="iisnode" path="server/index-simple.js" verb="*" modules="iisnode" />
    </handlers>
    <rewrite>
      <rules>
        <!-- API requests → Node.js -->
        <rule name="API" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="server/index-simple.js" />
        </rule>
        <!-- Static files -->
        <rule name="StaticContent" stopProcessing="true">
          <match url="([\S]+[.](html|htm|svg|js|css|png|gif|jpg|jpeg|ico|woff|woff2))" />
          <action type="Rewrite" url="dist/{R:1}" />
        </rule>
        <!-- SPA fallback -->
        <rule name="SPA" stopProcessing="true">
          <match url=".*" />
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
          </conditions>
          <action type="Rewrite" url="dist/index.html" />
        </rule>
      </rules>
    </rewrite>
    <iisnode node_env="production"
             nodeProcessCountPerApplication="1"
             maxConcurrentRequestsPerProcess="1024"
             watchedFiles="web.config;server\*.js" />
    <httpProtocol>
      <customHeaders>
        <add name="X-Frame-Options" value="DENY" />
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-XSS-Protection" value="1; mode=block" />
        <add name="Strict-Transport-Security" value="max-age=31536000; includeSubDomains" />
        <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
        <remove name="X-Powered-By" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>
```

### Step 4: Set Environment Variables

```powershell
# System-level env vars (persist across restarts)
[System.Environment]::SetEnvironmentVariable("NODE_ENV", "production", "Machine")
[System.Environment]::SetEnvironmentVariable("JWT_SECRET", "<your-64-byte-hex>", "Machine")
[System.Environment]::SetEnvironmentVariable("GOOGLE_CLIENT_ID", "<your-id>", "Machine")
[System.Environment]::SetEnvironmentVariable("SUPER_ADMIN_EMAILS", "admin@yourdomain.com", "Machine")
[System.Environment]::SetEnvironmentVariable("ALLOWED_ORIGINS", "https://yourdomain.com", "Machine")
```

### Step 5: Configure IIS Site

1. Open **IIS Manager**
2. Right-click **Sites → Add Website**
   - Site name: `CricketClub`
   - Physical path: `C:\inetpub\wwwroot\cricket-club`
   - Binding: HTTPS, port 443, select SSL certificate
3. Ensure the Application Pool uses **.NET CLR Version: No Managed Code**

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | Set to `production` |
| `PORT` | No | Backend port (default: 3001) |
| `JWT_SECRET` | **Yes** | 64+ byte random hex string |
| `GOOGLE_CLIENT_ID` | For OAuth | Google Cloud Console client ID |
| `SUPER_ADMIN_EMAILS` | Yes | Comma-separated admin emails |
| `ALLOWED_ORIGINS` | Yes | Comma-separated allowed CORS origins |
| `VITE_API_URL` | Build-time | Full API URL (e.g., `https://yourdomain.com/api`) |
| `VITE_GOOGLE_CLIENT_ID` | Build-time | Same as GOOGLE_CLIENT_ID |

### Generate JWT Secret
```bash
# Linux/macOS
openssl rand -hex 64

# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# PowerShell
[System.Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64)).ToLower()
```

---

## Security Checklist

### ✅ Already Implemented
- [x] JWT authentication with 1-hour expiry
- [x] bcrypt password hashing (10 rounds)
- [x] Rate limiting on auth endpoints (10 req/15 min)
- [x] Rate limiting on general API (100 req/15 min)
- [x] Security headers (X-Frame-Options, X-Content-Type-Options, HSTS, CSP, Referrer-Policy)
- [x] CORS whitelist (configurable via env)
- [x] Input validation (email format, password length)
- [x] Request body sanitization (HTML/script tag stripping)
- [x] Request body size limit (10MB)
- [x] Admin role-based access control on server routes
- [x] Frontend admin route guards
- [x] No hardcoded secrets in source code
- [x] `.gitignore` excludes `.env`, keys, certificates
- [x] Debug page removed from codebase
- [x] Console.log sanitized (no tokens/credentials logged)
- [x] Google OAuth token verification
- [x] Content Security Policy meta tag
- [x] Profile photo size validation (5MB max)
- [x] Base64 image format validation
- [x] Non-root Docker user

### 🔶 Recommended for Production
- [ ] **Move JWT to httpOnly cookies** — prevents XSS token theft (requires server-side cookie setting)
- [ ] **Add CSRF protection** — needed when using cookies (use `csurf` or custom token)
- [ ] **Use a persistent database** — in-memory data is lost on restart (PostgreSQL, MySQL, or MSSQL)
- [ ] **Add request logging** — use `morgan` or `winston` with log rotation
- [ ] **Add API versioning** — prefix routes with `/api/v1/`
- [ ] **Implement refresh tokens** — separate short-lived access token + long-lived refresh token
- [ ] **Add account lockout** — lock after N failed login attempts
- [ ] **Add password complexity rules** — require uppercase, number, special char
- [ ] **Enable 2FA** — TOTP-based two-factor for admin accounts
- [ ] **Run `npm audit`** — check for vulnerable dependencies
- [ ] **Set up WAF** — Web Application Firewall (Cloudflare, AWS WAF)
- [ ] **Add backup automation** — database dumps + file backups on schedule

---

## Monitoring & Maintenance

### Health Check
```bash
curl https://yourdomain.com/api/health
# Expected: {"status":"ok","timestamp":"...","mode":"in-memory"}
```

### Docker Logs
```bash
docker compose logs -f --tail 100 app
docker compose logs -f --tail 100 nginx
```

### Linux Service Logs
```bash
sudo journalctl -u cricket-club -f --lines=100
```

### Update & Redeploy

**Docker:**
```bash
git pull
docker compose down
docker compose up -d --build
```

**Linux (direct):**
```bash
cd /var/www/cricket-club
git pull
npm ci && npm run build
cd server && npm ci --production
sudo systemctl restart cricket-club
```

**Windows (IIS):**
```powershell
cd C:\inetpub\wwwroot\cricket-club
git pull
npm ci; npm run build
cd server; npm ci --production
iisreset /restart
```

### SSL Certificate Renewal (Let's Encrypt)
```bash
# Auto-renewal is configured, but test with:
sudo certbot renew --dry-run

# Force renewal:
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```
