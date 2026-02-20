// Cricket Club Website - Local Express.js Server with MSSQL
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// Security Hardening
// ============================================

// Security headers (inline helmet alternative - no extra dependency needed)
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.removeHeader('X-Powered-By');
    next();
});

// Simple in-memory rate limiter (per IP)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100; // max requests per window
const AUTH_RATE_LIMIT_MAX = 10; // stricter for auth endpoints

function rateLimit(maxRequests = RATE_LIMIT_MAX) {
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const key = `${ip}:${req.path}`;
        const now = Date.now();
        
        if (!rateLimitMap.has(key)) {
            rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
            return next();
        }
        
        const entry = rateLimitMap.get(key);
        if (now > entry.resetTime) {
            entry.count = 1;
            entry.resetTime = now + RATE_LIMIT_WINDOW;
            return next();
        }
        
        entry.count++;
        if (entry.count > maxRequests) {
            return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
        }
        next();
    };
}

// Clean up expired rate limit entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
        if (now > entry.resetTime) rateLimitMap.delete(key);
    }
}, 5 * 60 * 1000);

// Input validation helper
function validateEmail(email) {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function sanitizeString(str, maxLength = 500) {
    if (typeof str !== 'string') return '';
    return str.trim().substring(0, maxLength);
}

function validatePassword(password) {
    return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}
const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(64).toString('hex');
if (!process.env.JWT_SECRET) {
    console.warn('⚠️  WARNING: JWT_SECRET not set in environment. Using random secret (tokens will not persist across restarts).');
    console.warn('   Set JWT_SECRET environment variable for production use.');
}
const JWT_EXPIRES_IN = '1h'; // Short-lived access tokens

// Super admin emails (should be managed via environment variable in production)
const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || '').split(',').filter(e => e.trim()).map(e => e.trim().toLowerCase());

// Middleware
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000,capacitor://localhost,http://localhost').split(',');
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json({ limit: '1mb' })); // Limit request body size

// Request logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ============================================
// Authentication Middleware
// ============================================
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, error: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await db.users.getById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ success: false, error: 'User not found' });
        }
        
        req.user = user;
        req.userId = decoded.userId;
        next();
    } catch (error) {
        console.error('Token verification failed:', error.message);
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }
}

// Optional authentication (doesn't fail if no token)
async function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await db.users.getById(decoded.userId);
            req.user = user;
            req.userId = decoded.userId;
        } catch (error) {
            // Ignore invalid tokens for optional auth
        }
    }
    next();
}

// Admin check middleware
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    next();
}

// Generate JWT token
function generateToken(userId, email) {
    return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// ============================================
// Health Check
// ============================================
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'test endpoint working',
        timestamp: new Date().toISOString(),
        message: 'Local MSSQL backend is running!'
    });
});

// ============================================
// Authentication Routes
// ============================================

// Check if email exists (rate limited)
app.post('/api/auth/check-email', rateLimit(AUTH_RATE_LIMIT_MAX), async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }
        
        const user = await db.users.getByEmail(email);
        
        res.json({ 
            success: true, 
            exists: !!user,
            user: user ? { email: user.email, name: user.name, role: user.role } : null
        });
    } catch (error) {
        console.error('Error checking email:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Sign up (rate limited)
app.post('/api/auth/signup', rateLimit(AUTH_RATE_LIMIT_MAX), async (req, res) => {
    try {
        const { 
            firstName, lastName, email, password, name,
            gender, dateOfBirth, isMinor, mobileNumber, whatsappNumber,
            facebookId, address, emergencyContactName, emergencyContactPhone,
            emergencyContactRelationship, oldAdamstownUserId, playedInIreland,
            cricketIrelandId, dataConsent
        } = req.body;
        
        if (!email || !validateEmail(email)) {
            return res.status(400).json({ success: false, error: 'Valid email is required' });
        }
        
        if (!password || !validatePassword(password)) {
            return res.status(400).json({ success: false, error: 'Password must be between 8 and 128 characters' });
        }
        
        if (!firstName || !lastName) {
            return res.status(400).json({ success: false, error: 'First name and last name are required' });
        }
        
        // Check if user already exists
        const existingUser = await db.users.getByEmail(email);
        if (existingUser) {
            return res.status(400).json({ success: false, error: 'Email already registered' });
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Determine role (super admins get admin role)
        const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
        const role = isSuperAdmin ? 'admin' : 'member';
        
        // Create user
        const user = await db.users.create({
            email: email.toLowerCase(),
            passwordHash,
            firstName,
            lastName,
            name: name || `${firstName} ${lastName}`,
            role,
            authProvider: 'local'
        });
        
        // Generate token
        const accessToken = generateToken(user.id, user.email);
        
        console.log(`✅ Sign-up successful for: ${email}`);
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            },
            accessToken
        });
    } catch (error) {
        console.error('Error during sign-up:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Login (rate limited - stricter to prevent brute force)
app.post('/api/auth/login', rateLimit(AUTH_RATE_LIMIT_MAX), async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }
        
        // Get user
        const user = await db.users.getByEmail(email);
        
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }
        
        // Check if user has a password (local auth)
        if (!user.password_hash) {
            return res.status(401).json({ 
                success: false, 
                error: 'This account uses social login. Please use Google or Facebook to sign in.' 
            });
        }
        
        // Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);
        
        if (!isValid) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }
        
        // Check for super admin upgrade
        if (SUPER_ADMIN_EMAILS.includes(email.toLowerCase()) && user.role !== 'admin') {
            await db.users.updateRole(user.id, 'admin');
            user.role = 'admin';
        }
        
        // Generate token
        const accessToken = generateToken(user.id, user.email);
        
        console.log(`✅ Login successful for: ${email}`);
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            },
            accessToken
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user.id,
            email: req.user.email,
            name: req.user.name,
            firstName: req.user.first_name,
            lastName: req.user.last_name,
            role: req.user.role
        }
    });
});

// Create OAuth user (for local OAuth simulation) - requires authentication
app.post('/api/auth/create-oauth-user', authenticateToken, async (req, res) => {
    try {
        const { email, name, userId, role } = req.body;
        
        if (!email || !name) {
            return res.status(400).json({ success: false, error: 'Email and name are required' });
        }
        
        const lowerEmail = email.toLowerCase();
        const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(lowerEmail);
        const finalRole = isSuperAdmin ? 'admin' : (role || 'member');
        
        // Check if user exists
        let user = await db.users.getByEmail(lowerEmail);
        
        if (user) {
            // Update to admin if needed
            if (isSuperAdmin && user.role !== 'admin') {
                await db.users.updateRole(user.id, 'admin');
                user.role = 'admin';
            }
            
            const accessToken = generateToken(user.id, user.email);
            
            return res.json({ 
                success: true, 
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                },
                accessToken,
                message: 'User already exists'
            });
        }
        
        // Create new user
        const nameParts = name.split(' ');
        user = await db.users.create({
            id: userId,
            email: lowerEmail,
            firstName: nameParts[0],
            lastName: nameParts.slice(1).join(' '),
            name,
            role: finalRole,
            authProvider: 'oauth'
        });
        
        const accessToken = generateToken(user.id, user.email);
        
        console.log(`✅ OAuth user created: ${email}`);
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            },
            accessToken
        });
    } catch (error) {
        console.error('Error creating OAuth user:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Initialize Club Data
// ============================================
app.post('/api/init-club', authenticateToken, async (req, res) => {
    try {
        // Check if already initialized
        const existing = await db.kv.get('club_initialized');
        if (existing) {
            return res.json({ success: true, message: 'Club already initialized' });
        }
        
        // Mark as initialized
        await db.kv.set('club_initialized', 'true');
        
        res.json({ success: true, message: 'Club initialized successfully' });
    } catch (error) {
        console.error('Error initializing club:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Fixtures Routes
// ============================================
app.get('/api/fixtures', async (req, res) => {
    try {
        const fixtures = await db.fixtures.getAll();
        res.json({ success: true, data: fixtures });
    } catch (error) {
        console.error('Error fetching fixtures:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/fixtures', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const fixture = await db.fixtures.create(req.body);
        res.json({ success: true, data: fixture });
    } catch (error) {
        console.error('Error creating fixture:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/fixtures/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const fixture = await db.fixtures.update(req.params.id, req.body);
        res.json({ success: true, data: fixture });
    } catch (error) {
        console.error('Error updating fixture:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/fixtures/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await db.fixtures.delete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting fixture:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Teams Routes
// ============================================
app.get('/api/teams', async (req, res) => {
    try {
        const teams = await db.teams.getAll();
        res.json({ success: true, data: teams });
    } catch (error) {
        console.error('Error fetching teams:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/teams', authenticateToken, async (req, res) => {
    try {
        const team = await db.teams.create(req.body);
        res.json({ success: true, data: team });
    } catch (error) {
        console.error('Error creating team:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Players Routes
// ============================================
app.get('/api/players', async (req, res) => {
    try {
        const players = await db.players.getAll();
        res.json({ success: true, data: players });
    } catch (error) {
        console.error('Error fetching players:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/players', authenticateToken, async (req, res) => {
    try {
        const player = await db.players.create(req.body);
        res.json({ success: true, data: player });
    } catch (error) {
        console.error('Error creating player:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Results Routes
// ============================================
app.get('/api/results', async (req, res) => {
    try {
        const results = await db.results.getAll();
        res.json({ success: true, data: results });
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/results', authenticateToken, async (req, res) => {
    try {
        const result = await db.results.create(req.body);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error creating result:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Users Routes (Admin)
// ============================================
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const users = await db.users.getAll();
        res.json({ 
            success: true, 
            data: users.map(u => ({
                id: u.id,
                email: u.email,
                name: u.name,
                firstName: u.first_name,
                lastName: u.last_name,
                role: u.role,
                createdAt: u.created_at
            }))
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/users/:userId', authenticateToken, async (req, res) => {
    try {
        const user = await db.users.getById(req.params.userId);
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        res.json({ 
            success: true, 
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/users/:userId/role', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { role } = req.body;
        const validRoles = ['admin', 'member', 'fixture_secretary', 'accountant', 'media_admin', 'coach', 'head_coach'];
        
        if (!validRoles.includes(role)) {
            return res.status(400).json({ success: false, error: 'Invalid role' });
        }
        
        const user = await db.users.updateRole(req.params.userId, role);
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        res.json({ success: true, data: { userId: req.params.userId, role } });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Grant admin rights - requires admin role
app.post('/api/admin/grant-admin-rights', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ success: false, error: 'Valid email is required' });
        }
        
        const user = await db.users.getByEmail(email);
        
        if (user && user.role !== 'admin') {
            await db.users.updateRole(user.id, 'admin');
        }
        
        res.json({ success: true, user: { email, role: 'admin' } });
    } catch (error) {
        console.error('Error granting admin rights:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Settings Routes
// ============================================
app.get('/api/settings/whatsapp', async (req, res) => {
    try {
        const number = await db.kv.get('setting:WHATSAPP_NUMBER');
        res.json({ success: true, number: number || null });
    } catch (error) {
        console.error('Error fetching WhatsApp number:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/settings', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { emailApiKey, emailServiceUrl, fromEmail, appUrl, whatsappContactNumber } = req.body;
        
        const settings = {
            emailApiKey: emailApiKey || '',
            emailServiceUrl: emailServiceUrl || 'https://api.resend.com/emails',
            fromEmail: fromEmail || '',
            appUrl: appUrl || '',
            whatsappContactNumber: whatsappContactNumber || '',
            updatedAt: new Date().toISOString()
        };
        
        await db.kv.set('app_settings', settings);
        
        if (whatsappContactNumber) {
            await db.kv.set('setting:WHATSAPP_NUMBER', whatsappContactNumber);
        }
        
        res.json({ success: true, settings });
    } catch (error) {
        console.error('Error saving settings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Team Configuration Routes
// ============================================
app.get('/api/team-config/years', async (req, res) => {
    try {
        const configs = await db.kv.getByPrefix('team_config:');
        const years = [...new Set(configs.map(c => c.year))].sort((a, b) => b - a);
        res.json({ success: true, data: years });
    } catch (error) {
        console.error('Error fetching team config years:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/team-config/:year', async (req, res) => {
    try {
        const config = await db.kv.get(`team_config:${req.params.year}`);
        res.json({ success: true, data: config || null });
    } catch (error) {
        console.error('Error fetching team config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/team-config/:year', authenticateToken, async (req, res) => {
    try {
        const config = { ...req.body, year: parseInt(req.params.year) };
        await db.kv.set(`team_config:${req.params.year}`, config);
        res.json({ success: true, data: config });
    } catch (error) {
        console.error('Error saving team config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Availability Routes
// ============================================
app.get('/api/availability', authenticateToken, async (req, res) => {
    try {
        const availability = await db.kv.get('availability') || [];
        res.json({ success: true, data: availability });
    } catch (error) {
        console.error('Error fetching availability:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/availability', authenticateToken, async (req, res) => {
    try {
        const availability = await db.kv.get('availability') || [];
        const newEntry = { ...req.body, id: Date.now().toString(), userId: req.userId };
        availability.push(newEntry);
        await db.kv.set('availability', availability);
        res.json({ success: true, data: newEntry });
    } catch (error) {
        console.error('Error saving availability:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Stats Routes
// ============================================
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await db.kv.get('stats') || {};
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/stats/players', async (req, res) => {
    try {
        const players = await db.players.getAll();
        res.json({ success: true, data: players });
    } catch (error) {
        console.error('Error fetching player stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Start Server
// ============================================
async function startServer() {
    try {
        // Connect to database
        await db.connect();
        
        // Start Express server
        app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   🏏 Cricket Club Website - Local Server                       ║
║                                                                ║
║   Server running on: http://localhost:${PORT}                   ║
║   API Base URL:      http://localhost:${PORT}/api               ║
║                                                                ║
║   Database: MSSQL (Local)                                      ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
            `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle shutdown gracefully
process.on('SIGINT', async () => {
    console.log('\nShutting down server...');
    await db.close();
    process.exit(0);
});

startServer();

module.exports = app;
