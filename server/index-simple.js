// Cricket Club Website - Simple In-Memory Backend Server (No Database Required)
// Use this for testing when MSSQL is not available

// Load environment variables from .env file
try { require('dotenv').config(); } catch(e) { /* dotenv not installed, using process.env directly */ }

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');

const app = express();

// ============================================
// Security Hardening
// ============================================

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com");
    res.removeHeader('X-Powered-By');
    next();
});

// Simple in-memory rate limiter
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const AUTH_RATE_LIMIT_MAX = 10;

function rateLimit(maxRequests = 100) {
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

// Clean up expired entries
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
        if (now > entry.resetTime) rateLimitMap.delete(key);
    }
}, 5 * 60 * 1000);

// Input validation
function validateEmail(email) {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function validatePassword(password) {
    return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

// Sanitize string input (strip HTML/script tags)
function sanitizeString(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/<[^>]*>/g, '').replace(/javascript:/gi, '').trim();
}

// Sanitize object values recursively
function sanitizeInput(obj) {
    if (typeof obj === 'string') return sanitizeString(obj);
    if (Array.isArray(obj)) return obj.map(sanitizeInput);
    if (obj && typeof obj === 'object') {
        const clean = {};
        for (const [key, value] of Object.entries(obj)) {
            // Skip base64 image data from sanitization
            if (typeof value === 'string' && value.startsWith('data:image/')) {
                clean[key] = value;
            } else {
                clean[key] = sanitizeInput(value);
            }
        }
        return clean;
    }
    return obj;
}
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(64).toString('hex');
if (!process.env.JWT_SECRET) {
    console.warn('⚠️  WARNING: JWT_SECRET not set. Using random secret (tokens will not persist across restarts).');
}
const JWT_EXPIRES_IN = '1h'; // Short-lived access tokens

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Super admin emails (managed via environment variable)
const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || '').split(',').filter(e => e.trim()).map(e => e.trim().toLowerCase());
console.log(`🔑 Super admin emails loaded: [${SUPER_ADMIN_EMAILS.join(', ')}] (${SUPER_ADMIN_EMAILS.length} total)`);

// In-memory data stores
const users = new Map();
const fixtures = [];
const teams = [];
const players = [];
const results = [];
const kvStore = new Map();
const attendanceRecords = [];
let youthTeams = ['Under 7', 'Under 9', 'Under 11', 'Under 13', 'Under 15', 'Under 17', 'Under 19'];

// Board members data
let boardMembers = {
    current: [
        { id: 'board-1', name: 'To Be Announced', position: 'president', bio: 'Leading the club with vision and dedication', since: '2025', email: '', photo: '', order: 0 },
        { id: 'board-2', name: 'To Be Announced', position: 'secretary', bio: 'Managing club administration and correspondence', since: '2025', email: '', photo: '', order: 1 },
        { id: 'board-3', name: 'To Be Announced', position: 'finance_secretary', bio: 'Overseeing club finances and budgets', since: '2025', email: '', photo: '', order: 2 },
        { id: 'board-4', name: 'To Be Announced', position: 'head_coach', bio: 'Developing players and coaching strategies', since: '2025', email: '', photo: '', order: 3 },
        { id: 'board-5', name: 'To Be Announced', position: 'fixture_secretary', bio: 'Organising fixtures and match schedules', since: '2025', email: '', photo: '', order: 4 },
        { id: 'board-6', name: 'To Be Announced', position: 'selection_committee', bio: 'Team selection and player assessment', since: '2025', email: '', photo: '', order: 5 },
        { id: 'board-7', name: 'To Be Announced', position: 'social_media_incharge', bio: 'Managing club social media and communications', since: '2025', email: '', photo: '', order: 6 },
        { id: 'board-8', name: 'To Be Announced', position: 'development_officer', bio: 'Driving club development and growth initiatives', since: '2025', email: '', photo: '', order: 7 },
        { id: 'board-9', name: 'To Be Announced', position: 'youth_secretary', bio: 'Managing youth cricket programmes and development', since: '2025', email: '', photo: '', order: 8 },
        { id: 'board-10', name: 'To Be Announced', position: 'ladies_secretary', bio: 'Promoting and managing ladies cricket in the club', since: '2025', email: '', photo: '', order: 9 },
    ],
    past: [
        { id: 'past-1', name: 'Founding Members', position: 'president', yearsServed: '1950 \u2013 1960', contribution: 'Established Adamstown Cricket Club and laid the foundation for generations to come', photo: '' },
        { id: 'past-2', name: 'Club Pioneers', position: 'secretary', yearsServed: '1960 \u2013 1975', contribution: 'Grew the club membership and established key partnerships within Cricket Leinster', photo: '' },
    ],
};

// Banner photos for hero section
let bannerPhotos = [
    { id: 'banner-1', url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1600&h=700&fit=crop', caption: 'Cricket Ground', order: 0 },
    { id: 'banner-2', url: 'https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?w=1600&h=700&fit=crop', caption: 'Match Day', order: 1 },
];

// Sponsors data
let sponsors = [
    { id: 'sponsor-1', name: 'Cricket Leinster', logo: '', message: 'Proud to support grassroots cricket in Leinster', tier: 'platinum', website: 'https://www.cricketleinster.ie', active: true },
    { id: 'sponsor-2', name: 'Sports Direct Ireland', logo: '', message: 'Equipping our players for success on and off the pitch', tier: 'gold', website: '', active: true },
    { id: 'sponsor-3', name: 'Local Business Partner', logo: '', message: 'Supporting our community through the power of sport', tier: 'silver', website: '', active: true },
];

// Season configuration
let seasonConfig = {
    year: 2026,
    startDate: '2026-04-01',
    endDate: '2026-09-30',
    months: [],
    weeks: []
};

function generateSeasonWeeks(startDate, endDate, year) {
    const weeks = [];
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    let weekNum = 1;
    const current = new Date(start);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    current.setDate(diff);
    while (current <= end && weekNum <= 52) {
        const weekStart = new Date(current);
        const weekEnd = new Date(current);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weeks.push({ weekNumber: weekNum, startDate: weekStart.toISOString().split('T')[0], endDate: weekEnd.toISOString().split('T')[0], year });
        current.setDate(current.getDate() + 7);
        weekNum++;
    }
    return weeks;
}

function generateSeasonMonths(startDate, endDate) {
    const months = [];
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    while (current <= end) {
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
        months.push({
            month: current.toLocaleString('en-US', { month: 'long' }),
            year: current.getFullYear(),
            startDate: current.toISOString().split('T')[0],
            endDate: monthEnd.toISOString().split('T')[0]
        });
        current.setMonth(current.getMonth() + 1);
    }
    return months;
}

seasonConfig.weeks = generateSeasonWeeks(seasonConfig.startDate, seasonConfig.endDate, seasonConfig.year);
seasonConfig.months = generateSeasonMonths(seasonConfig.startDate, seasonConfig.endDate);

// Top performers data
let topPerformers = {
    adults: {
        league: {
            batting: [{ name: 'Mike Johnson', team: '1st XI', runs: 458, avg: 45.8, innings: 12, rank: 1 }, { name: 'John Smith', team: '1st XI', runs: 312, avg: 34.7, innings: 10, rank: 2 }],
            bowling: [{ name: 'Tom Brown', team: '2nd XI', wickets: 22, avg: 15.3, overs: 85, rank: 1 }, { name: 'Robert Taylor', team: '2nd XI', wickets: 18, avg: 18.9, overs: 72, rank: 2 }],
            fielding: [{ name: 'John Smith', team: '1st XI', catches: 12, runOuts: 3, stumpings: 0, rank: 1 }, { name: 'Chris Davis', team: '2nd XI', catches: 9, runOuts: 2, stumpings: 0, rank: 2 }]
        },
        t20: {
            batting: [{ name: 'Mike Johnson', team: '1st XI', runs: 234, avg: 39.0, strikeRate: 145.2, rank: 1 }],
            bowling: [{ name: 'Tom Brown', team: '2nd XI', wickets: 10, avg: 18.2, economy: 6.8, rank: 1 }],
            fielding: [{ name: 'Chris Davis', team: '2nd XI', catches: 8, runOuts: 2, stumpings: 0, rank: 1 }]
        },
        internal: {
            batting: [{ name: 'John Smith', team: 'Team A', runs: 156, avg: 52.0, innings: 4, rank: 1 }],
            bowling: [{ name: 'Robert Taylor', team: 'Team B', wickets: 8, avg: 12.5, overs: 24, rank: 1 }],
            fielding: [{ name: 'Mike Johnson', team: 'Team A', catches: 5, runOuts: 1, stumpings: 0, rank: 1 }]
        }
    },
    youth: {
        adultMatches: {
            batting: [{ name: 'Young Star A', team: '2nd XI', runs: 89, avg: 29.7, innings: 4, rank: 1 }],
            bowling: [{ name: 'Young Star B', team: '2nd XI', wickets: 5, avg: 22.0, overs: 18, rank: 1 }],
            fielding: [{ name: 'Young Star C', team: '2nd XI', catches: 4, runOuts: 1, stumpings: 0, rank: 1 }]
        },
        youthGames: {
            batting: [{ name: 'Junior Talent A', team: 'Under 15', runs: 234, avg: 46.8, innings: 6, rank: 1 }],
            bowling: [{ name: 'Junior Talent B', team: 'Under 13', wickets: 15, avg: 10.5, overs: 30, rank: 1 }],
            fielding: [{ name: 'Junior Talent C', team: 'Under 17', catches: 7, runOuts: 2, stumpings: 0, rank: 1 }]
        }
    },
    ladies: {
        batting: [{ name: 'Sarah Wilson', team: 'Ladies XI', runs: 312, avg: 39.0, innings: 10, rank: 1 }],
        bowling: [{ name: 'Emma Clarke', team: 'Ladies XI', wickets: 18, avg: 14.2, overs: 60, rank: 1 }],
        fielding: [{ name: 'Rachel Murphy', team: 'Ladies XI', catches: 9, runOuts: 3, stumpings: 1, rank: 1 }]
    }
};

// Initialize with sample data
function initializeSampleData() {
    // Sample teams
    teams.push(
        { id: 'team-1', name: 'Adamstown CC 1st XI', division: 'Premier League', captain: 'John Smith', vice_captain: 'Mike Johnson', coach: 'David Wilson' },
        { id: 'team-2', name: 'Adamstown CC 2nd XI', division: 'First Grade', captain: 'Tom Brown', vice_captain: 'Chris Davis', coach: 'Robert Taylor' }
    );

    // Sample fixtures
    fixtures.push(
        { id: 'fixture-1', homeTeam: 'Adamstown CC 1st XI', awayTeam: 'Phoenix CC', date: '2026-04-18', time: '13:00', venue: 'Adamstown Ground', competition: 'Cricket Leinster - Division 2', matchType: 'league', matchCategory: 'cl-division-2', overs: '50', status: 'scheduled' },
        { id: 'fixture-2', homeTeam: 'Adamstown CC 2nd XI', awayTeam: 'Leinster CC', date: '2026-04-18', time: '13:00', venue: 'Tymon Park', competition: 'Cricket Leinster - Division 5', matchType: 'league', matchCategory: 'cl-division-5', overs: '45', status: 'scheduled' },
        { id: 'fixture-3', homeTeam: 'Adamstown CC 1st XI', awayTeam: 'YMCA CC', date: '2026-04-25', time: '10:30', venue: 'Adamstown Ground', competition: 'Cricket Leinster - T20 Cup', matchType: 't20', matchCategory: 'cl-t20-cup', overs: '20', status: 'scheduled' },
        { id: 'fixture-4', homeTeam: 'Adamstown CC A', awayTeam: 'Adamstown CC B', date: '2026-04-12', time: '11:00', venue: 'Adamstown Ground', competition: 'Practice Match', matchType: 'internal', matchCategory: 'practice-match', overs: '20', status: 'scheduled' },
        { id: 'fixture-5', homeTeam: 'Adamstown CC 1st XI', awayTeam: 'Dublin University CC', date: '2026-04-05', time: '13:00', venue: 'College Park', competition: 'Pre-Season Friendly', matchType: 'friendly', matchCategory: 'pre-season-friendly', overs: '40', status: 'scheduled' },
        { id: 'fixture-6', homeTeam: 'Adamstown CC 1st XI', awayTeam: 'Clontarf CC', date: '2026-05-09', time: '11:00', venue: 'Adamstown Ground', competition: 'Cricket Leinster - Senior Cup', matchType: 'cup', matchCategory: 'cl-senior-cup', overs: '50', status: 'scheduled' },
        { id: 'fixture-7', homeTeam: 'Adamstown CC Under 13', awayTeam: 'Phoenix CC Under 13', date: '2026-05-10', time: '10:00', venue: 'Adamstown Ground', competition: 'Youth League', matchType: 'youth', matchCategory: 'youth-league', overs: '20', status: 'scheduled' },
        { id: 'fixture-8', homeTeam: 'Adamstown CC Under 15', awayTeam: 'YMCA CC Under 15', date: '2026-05-10', time: '10:00', venue: 'Tymon Park', competition: 'Youth Cup', matchType: 'youth', matchCategory: 'youth-cup', overs: '20', status: 'scheduled' },
        { id: 'fixture-9', homeTeam: 'Adamstown CC Under 17', awayTeam: 'Leinster CC Under 17', date: '2026-05-17', time: '10:30', venue: 'Adamstown Ground', competition: 'Youth T20', matchType: 'youth', matchCategory: 'youth-t20', overs: '20', status: 'scheduled' }
    );

    // Sample players
    players.push(
        { id: 'player-1', name: 'John Smith', role: 'All-rounder', team: 'Adamstown CC 1st XI', stats: { matches: 45, runs: 1250, wickets: 32, average: '35.7' } },
        { id: 'player-2', name: 'Mike Johnson', role: 'Batsman', team: 'Adamstown CC 1st XI', stats: { matches: 38, runs: 1580, wickets: 2, average: '42.1' } },
        { id: 'player-3', name: 'Tom Brown', role: 'Bowler', team: 'Adamstown CC 2nd XI', stats: { matches: 32, runs: 380, wickets: 48, average: '18.5' } }
    );

    // Sample results
    results.push(
        { id: 'result-1', homeTeam: 'Adamstown CC 1st XI', awayTeam: 'Hamilton CC', homeScore: '245', awayScore: '198', winner: 'Adamstown CC 1st XI', date: '2026-02-08', venue: 'Adamstown Oval', competition: 'Premier League' }
    );

    console.log('✅ Sample data initialized');
}

// Middleware
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:3000,capacitor://localhost,http://localhost').split(',');
app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        // Allow any localhost port in development
        if (origin && origin.match(/^https?:\/\/localhost(:\d+)?$/)) {
            return callback(null, true);
        }
        // Allow any IP-based origin (for Azure VM / remote access)
        if (origin && origin.match(/^https?:\/\/[\d.]+(:\d+)?$/)) {
            return callback(null, true);
        }
        if (origin && origin.startsWith('capacitor://')) {
            return callback(null, true);
        }
        if (ALLOWED_ORIGINS.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Sanitize all incoming request bodies
app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeInput(req.body);
    }
    next();
});

// Request logger (production: disable or use proper logger)
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Authentication Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, error: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = users.get(decoded.email);
        
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

// Generate JWT token
function generateToken(userId, email) {
    return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Admin check middleware
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    next();
}

// ============================================
// Health Check
// ============================================
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), mode: 'in-memory' });
});

app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'test endpoint working',
        timestamp: new Date().toISOString(),
        message: 'In-memory backend is running! (No database required)'
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
        
        const user = users.get(email.toLowerCase());
        
        console.log(`📧 Check email: ${email} - exists: ${!!user}`);
        
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
            gender, dateOfBirth, mobileNumber
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
        
        const lowerEmail = email.toLowerCase();
        
        // Check if user already exists
        if (users.has(lowerEmail)) {
            return res.status(400).json({ success: false, error: 'Email already registered' });
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Determine role (super admins get admin role)
        const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(lowerEmail);
        const role = isSuperAdmin ? 'admin' : 'member';
        
        console.log(`🔍 Signup role check: email="${lowerEmail}", isSuperAdmin=${isSuperAdmin}, role="${role}", SUPER_ADMIN_EMAILS=[${SUPER_ADMIN_EMAILS.join(',')}]`);
        
        // Create user
        const userId = `user-${Date.now()}`;
        const user = {
            id: userId,
            email: lowerEmail,
            passwordHash,
            firstName,
            lastName,
            name: name || `${firstName} ${lastName}`,
            role,
            gender,
            dateOfBirth,
            mobileNumber,
            profilePhoto: null,
            faceDescriptor: null,
            createdAt: new Date().toISOString()
        };
        
        users.set(lowerEmail, user);
        
        // Generate token
        const accessToken = generateToken(userId, lowerEmail);
        
        console.log(`✅ Sign-up successful for: ${email} (role: ${role})`);
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role
            },
            accessToken
        });
    } catch (error) {
        console.error('Error during sign-up:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Login (rate limited)
app.post('/api/auth/login', rateLimit(AUTH_RATE_LIMIT_MAX), async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }
        
        const lowerEmail = email.toLowerCase();
        const user = users.get(lowerEmail);
        
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }
        
        // Verify password
        const isValid = await bcrypt.compare(password, user.passwordHash);
        
        if (!isValid) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
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
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role
            },
            accessToken
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Google OAuth Login (rate limited)
app.post('/api/auth/google', rateLimit(AUTH_RATE_LIMIT_MAX), async (req, res) => {
    try {
        const { credential } = req.body;
        
        if (!credential) {
            return res.status(400).json({ success: false, message: 'Google credential is required' });
        }
        
        // Verify the Google ID token
        let payload;
        try {
            const ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: GOOGLE_CLIENT_ID,
            });
            payload = ticket.getPayload();
        } catch (verifyError) {
            console.error('Google token verification failed:', verifyError);
            return res.status(401).json({ success: false, message: 'Invalid Google token' });
        }
        
        if (!payload || !payload.email) {
            return res.status(400).json({ success: false, message: 'Unable to get email from Google account' });
        }
        
        const email = payload.email.toLowerCase();
        const firstName = payload.given_name || '';
        const lastName = payload.family_name || '';
        const name = payload.name || `${firstName} ${lastName}`.trim();
        const googleId = payload.sub;
        
        console.log(`🔐 Google login attempt for: ${email}`);
        
        // Check if user exists
        let user = users.get(email);
        
        if (user) {
            // User exists - update Google ID if not set
            if (!user.googleId) {
                user.googleId = googleId;
            }
            
            // Generate token
            const token = generateToken(user.id, user.email);
            
            console.log(`✅ Google login successful for existing user: ${email}`);
            
            return res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role
                }
            });
        }
        
        // User doesn't exist - auto-register or require signup
        // Option 1: Auto-register new Google users
        const isAdmin = SUPER_ADMIN_EMAILS.includes(email);
        const userId = `user-${Date.now()}`;
        
        const newUser = {
            id: userId,
            email: email,
            name: name,
            firstName: firstName,
            lastName: lastName,
            role: isAdmin ? 'admin' : 'member',
            googleId: googleId,
            authProvider: 'google',
            profilePhoto: null,
            faceDescriptor: null,
            createdAt: new Date().toISOString()
        };
        
        users.set(email, newUser);
        
        const token = generateToken(newUser.id, newUser.email);
        
        console.log(`✅ New user auto-registered via Google: ${email}`);
        
        res.json({
            success: true,
            token,
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                role: newUser.role
            }
        });
        
        /* Option 2: Require signup completion (uncomment to use)
        return res.status(400).json({ 
            success: false, 
            needsRegistration: true,
            email: email,
            firstName: firstName,
            lastName: lastName,
            message: 'Please complete registration'
        });
        */
        
    } catch (error) {
        console.error('Error during Google login:', error);
        res.status(500).json({ success: false, message: error.message });
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
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            role: req.user.role
        }
    });
});

// Diagnostic: check user role (helps debug admin issues)
app.get('/api/auth/debug-role', (req, res) => {
    const email = (req.query.email || '').toLowerCase().trim();
    const user = users.get(email);
    const isSuperAdminEmail = SUPER_ADMIN_EMAILS.includes(email);
    res.json({
        email,
        userExists: !!user,
        currentRole: user ? user.role : null,
        isSuperAdminEmail,
        superAdminEmails: SUPER_ADMIN_EMAILS,
        totalUsers: users.size
    });
});

// ============================================
// Initialize Club
// ============================================
app.post('/api/init-club', (req, res) => {
    res.json({ success: true, message: 'Club initialized (in-memory mode)' });
});

// ============================================
// Fixtures Routes
// ============================================
app.get('/api/fixtures', (req, res) => {
    // Optional filtering by matchType
    const { matchType } = req.query;
    let result = fixtures;
    if (matchType && matchType !== 'all') {
        result = fixtures.filter(f => f.matchType === matchType);
    }
    res.json({ success: true, data: result });
});

app.post('/api/fixtures', authenticateToken, requireAdmin, (req, res) => {
    const fixture = {
        ...req.body,
        id: req.body.id && !req.body.id.startsWith('import-') ? req.body.id : `fixture-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        matchType: req.body.matchType || 'league',
        matchCategory: req.body.matchCategory || '',
        overs: req.body.overs || '50',
        time: req.body.time || '',
        status: req.body.status || 'scheduled',
    };
    fixtures.push(fixture);
    res.json({ success: true, data: fixture });
});

// Bulk import fixtures
app.post('/api/fixtures/bulk', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { fixtures: importedFixtures } = req.body;
        if (!Array.isArray(importedFixtures) || importedFixtures.length === 0) {
            return res.status(400).json({ success: false, error: 'No fixtures provided' });
        }
        let imported = 0;
        importedFixtures.forEach(f => {
            const fixture = {
                ...f,
                id: `fixture-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                matchType: f.matchType || 'league',
                matchCategory: f.matchCategory || '',
                overs: f.overs || '50',
                time: f.time || '',
                status: f.status || 'scheduled',
            };
            fixtures.push(fixture);
            imported++;
        });
        res.json({ success: true, imported, message: `${imported} fixtures imported successfully` });
    } catch (error) {
        console.error('Error bulk importing fixtures:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update fixture
app.put('/api/fixtures/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const index = fixtures.findIndex(f => f.id === id);
    if (index === -1) {
        return res.status(404).json({ success: false, error: 'Fixture not found' });
    }
    fixtures[index] = { ...fixtures[index], ...req.body, id };
    res.json({ success: true, data: fixtures[index] });
});

// Delete fixture
app.delete('/api/fixtures/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const index = fixtures.findIndex(f => f.id === id);
    if (index === -1) {
        return res.status(404).json({ success: false, error: 'Fixture not found' });
    }
    fixtures.splice(index, 1);
    res.json({ success: true, message: 'Fixture deleted' });
});

// ============================================
// Youth Teams Routes
// ============================================
app.get('/api/youth-teams', (req, res) => {
    res.json({ success: true, data: youthTeams });
});

app.put('/api/youth-teams', authenticateToken, requireAdmin, (req, res) => {
    const { teams: newTeams } = req.body;
    if (!Array.isArray(newTeams)) {
        return res.status(400).json({ success: false, error: 'Invalid teams data' });
    }
    youthTeams = newTeams.filter(t => typeof t === 'string' && t.trim() !== '').map(t => t.trim());
    console.log('✅ Youth teams updated:', youthTeams);
    res.json({ success: true, data: youthTeams });
});

// ============================================
// Board Members Routes
// ============================================
app.get('/api/board-members', (req, res) => {
    res.json({ success: true, data: boardMembers });
});

app.put('/api/board-members', authenticateToken, requireAdmin, (req, res) => {
    const { current, past } = req.body;
    if (current !== undefined) boardMembers.current = current;
    if (past !== undefined) boardMembers.past = past;
    console.log('\u2705 Board members updated:', boardMembers.current.length, 'current,', boardMembers.past.length, 'past');
    res.json({ success: true, data: boardMembers });
});

// ============================================
// Banner Photos Routes
// ============================================
app.get('/api/banner-photos', (req, res) => {
    res.json({ success: true, data: bannerPhotos.sort((a, b) => a.order - b.order) });
});

app.post('/api/banner-photos', authenticateToken, requireAdmin, (req, res) => {
    const { url, caption } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'Image URL or data is required' });
    const photo = {
        id: `banner-${Date.now()}`,
        url,
        caption: caption || '',
        order: bannerPhotos.length,
    };
    bannerPhotos.push(photo);
    console.log('\u2705 Banner photo added:', photo.id);
    res.json({ success: true, data: photo });
});

app.put('/api/banner-photos/reorder', authenticateToken, requireAdmin, (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ success: false, error: 'ids array required' });
    ids.forEach((id, i) => {
        const photo = bannerPhotos.find(p => p.id === id);
        if (photo) photo.order = i;
    });
    res.json({ success: true, data: bannerPhotos.sort((a, b) => a.order - b.order) });
});

app.delete('/api/banner-photos/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const index = bannerPhotos.findIndex(p => p.id === id);
    if (index === -1) return res.status(404).json({ success: false, error: 'Photo not found' });
    bannerPhotos.splice(index, 1);
    console.log('\u2705 Banner photo removed:', id);
    res.json({ success: true, message: 'Photo deleted' });
});

// ============================================
// Sponsors Routes
// ============================================
app.get('/api/sponsors', (req, res) => {
    const activeSponsors = sponsors.filter(s => s.active);
    res.json({ success: true, data: activeSponsors });
});

app.get('/api/sponsors/all', authenticateToken, requireAdmin, (req, res) => {
    res.json({ success: true, data: sponsors });
});

app.post('/api/sponsors', authenticateToken, requireAdmin, (req, res) => {
    const sponsor = {
        ...req.body,
        id: `sponsor-${Date.now()}`,
        active: req.body.active !== undefined ? req.body.active : true
    };
    sponsors.push(sponsor);
    console.log('\u2705 Sponsor added:', sponsor.name);
    res.json({ success: true, data: sponsor });
});

app.put('/api/sponsors/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const index = sponsors.findIndex(s => s.id === id);
    if (index === -1) return res.status(404).json({ success: false, error: 'Sponsor not found' });
    sponsors[index] = { ...sponsors[index], ...req.body, id };
    res.json({ success: true, data: sponsors[index] });
});

app.delete('/api/sponsors/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const index = sponsors.findIndex(s => s.id === id);
    if (index === -1) return res.status(404).json({ success: false, error: 'Sponsor not found' });
    sponsors.splice(index, 1);
    res.json({ success: true, message: 'Sponsor deleted' });
});

// ============================================
// Club Stats Route (auto-aggregated)
// ============================================
app.get('/api/club-stats', (req, res) => {
    const totalMembers = users.size;
    const mensTeams = teams.filter(t => !t.name.toLowerCase().includes('ladies') && !t.name.toLowerCase().includes('women')).length;
    const womensTeams = teams.filter(t => t.name.toLowerCase().includes('ladies') || t.name.toLowerCase().includes('women')).length;
    const youthTeamCount = youthTeams.length;
    const grounds = kvStore.get('home_grounds') || [];
    const upcomingFixtures = fixtures.filter(f => new Date(f.date) >= new Date()).length;

    res.json({
        success: true,
        data: {
            totalMembers: totalMembers || 45,
            adultTeams: { mens: mensTeams || 2, womens: womensTeams || 1, total: (mensTeams + womensTeams) || 3 },
            youthTeams: { count: youthTeamCount, totalKids: youthTeamCount * 12, teams: youthTeams },
            grounds: { count: grounds.length || 1, names: grounds.length > 0 ? grounds.map(g => g.name || g) : ['Adamstown Oval'] },
            totalFixtures: fixtures.length,
            upcomingFixtures
        }
    });
});

// ============================================
// Season Config Routes
// ============================================
app.get('/api/season-config', (req, res) => {
    res.json({ success: true, data: seasonConfig });
});

app.put('/api/season-config', authenticateToken, requireAdmin, (req, res) => {
    const { year, startDate, endDate } = req.body;
    if (year) seasonConfig.year = year;
    if (startDate) seasonConfig.startDate = startDate;
    if (endDate) seasonConfig.endDate = endDate;
    seasonConfig.weeks = generateSeasonWeeks(seasonConfig.startDate, seasonConfig.endDate, seasonConfig.year);
    seasonConfig.months = generateSeasonMonths(seasonConfig.startDate, seasonConfig.endDate);
    console.log('\u2705 Season config updated:', seasonConfig.year, seasonConfig.startDate, 'to', seasonConfig.endDate);
    res.json({ success: true, data: seasonConfig });
});

// ============================================
// Top Performers Routes
// ============================================
app.get('/api/top-performers', (req, res) => {
    res.json({ success: true, data: topPerformers });
});

app.put('/api/top-performers', authenticateToken, requireAdmin, (req, res) => {
    const updates = req.body;
    if (updates.adults) {
        if (updates.adults.league) topPerformers.adults.league = { ...topPerformers.adults.league, ...updates.adults.league };
        if (updates.adults.t20) topPerformers.adults.t20 = { ...topPerformers.adults.t20, ...updates.adults.t20 };
        if (updates.adults.internal) topPerformers.adults.internal = { ...topPerformers.adults.internal, ...updates.adults.internal };
    }
    if (updates.youth) {
        if (updates.youth.adultMatches) topPerformers.youth.adultMatches = { ...topPerformers.youth.adultMatches, ...updates.youth.adultMatches };
        if (updates.youth.youthGames) topPerformers.youth.youthGames = { ...topPerformers.youth.youthGames, ...updates.youth.youthGames };
    }
    if (updates.ladies) topPerformers.ladies = { ...topPerformers.ladies, ...updates.ladies };
    console.log('\u2705 Top performers updated');
    res.json({ success: true, data: topPerformers });
});

// ============================================
// Google Drive Config Routes
// ============================================
app.get('/api/admin/google-drive-config', authenticateToken, requireAdmin, (req, res) => {
    const config = kvStore.get('google_drive_config') || null;
    // Mask sensitive fields
    if (config) {
        res.json({ success: true, data: { ...config, apiKey: config.apiKey ? '****' + config.apiKey.slice(-4) : '' } });
    } else {
        res.json({ success: true, data: null });
    }
});

app.post('/api/admin/google-drive-config', authenticateToken, requireAdmin, (req, res) => {
    const { serviceAccountEmail, folderId, apiKey } = req.body;
    kvStore.set('google_drive_config', {
        serviceAccountEmail: serviceAccountEmail || '',
        folderId: folderId || '',
        apiKey: apiKey || '',
        updatedAt: new Date().toISOString(),
        updatedBy: req.user.email
    });
    console.log('\u2705 Google Drive config saved by:', req.user.email);
    res.json({ success: true, message: 'Google Drive configuration saved' });
});

app.post('/api/flyer/export-drive', authenticateToken, requireAdmin, (req, res) => {
    const config = kvStore.get('google_drive_config');
    if (!config || !config.folderId) {
        return res.status(400).json({ success: false, error: 'Google Drive not configured. Please set up Google Drive in Admin Settings first.' });
    }
    const exportRecord = {
        id: `export-${Date.now()}`,
        exportedAt: new Date().toISOString(),
        exportedBy: req.user.email,
        folderId: config.folderId,
        status: 'success',
        fileName: `ACC_Club_Flyer_${new Date().toISOString().split('T')[0]}.pdf`
    };
    const exports = kvStore.get('flyer_exports') || [];
    exports.push(exportRecord);
    kvStore.set('flyer_exports', exports);
    console.log('\u2705 Flyer exported to Google Drive by:', req.user.email);
    res.json({ success: true, data: exportRecord, message: `Flyer exported as ${exportRecord.fileName}` });
});

// ============================================
// Teams Routes
// ============================================
app.get('/api/teams', (req, res) => {
    res.json({ success: true, data: teams });
});

app.post('/api/teams', authenticateToken, requireAdmin, (req, res) => {
    const team = { ...req.body, id: `team-${Date.now()}` };
    teams.push(team);
    res.json({ success: true, data: team });
});

// ============================================
// Players Routes
// ============================================
app.get('/api/players', (req, res) => {
    res.json({ success: true, data: players });
});

app.post('/api/players', authenticateToken, requireAdmin, (req, res) => {
    const player = { ...req.body, id: `player-${Date.now()}` };
    players.push(player);
    res.json({ success: true, data: player });
});

// ============================================
// Results Routes
// ============================================
app.get('/api/results', (req, res) => {
    res.json({ success: true, data: results });
});

app.post('/api/results', authenticateToken, requireAdmin, (req, res) => {
    const result = { ...req.body, id: `result-${Date.now()}` };
    results.push(result);
    res.json({ success: true, data: result });
});

// ============================================
// Users Routes
// ============================================
app.get('/api/users', authenticateToken, (req, res) => {
    const userList = Array.from(users.values()).map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        createdAt: u.createdAt
    }));
    res.json({ success: true, data: userList });
});

// Admin members endpoint (used by UserManagementPage) - requires admin
app.get('/api/admin/members', authenticateToken, requireAdmin, (req, res) => {
    const userList = Array.from(users.values()).map(u => ({
        id: u.id,
        userId: u.id,
        email: u.email,
        name: u.name,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        createdAt: u.createdAt
    }));
    res.json({ success: true, members: userList });
});

// Update user role - requires admin role
app.put('/api/users/:userId/role', authenticateToken, requireAdmin, (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;

    const validRoles = ['admin', 'member', 'fixture_secretary', 'coach', 'head_coach', 'accountant'];
    if (!role || !validRoles.includes(role)) {
        return res.status(400).json({ success: false, error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    // Find user by id
    let targetUser = null;
    for (const u of users.values()) {
        if (u.id === userId) {
            targetUser = u;
            break;
        }
    }

    if (!targetUser) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }

    const oldRole = targetUser.role;
    targetUser.role = role;
    console.log(`[ROLE UPDATE] User ${targetUser.email} role changed from "${oldRole}" to "${role}" by admin ${req.user.email}`);

    res.json({
        success: true,
        user: {
            id: targetUser.id,
            userId: targetUser.id,
            email: targetUser.email,
            name: targetUser.name,
            role: targetUser.role
        }
    });
});

// Grant admin rights - requires admin role
app.post('/api/admin/grant-admin-rights', authenticateToken, requireAdmin, (req, res) => {
    const { email } = req.body;
    
    if (!email || typeof email !== 'string') {
        return res.status(400).json({ success: false, error: 'Valid email is required' });
    }
    
    const user = users.get(email.toLowerCase());
    if (user) {
        user.role = 'admin';
    }
    
    res.json({ success: true, user: { email, role: 'admin' } });
});

// ============================================
// Settings Routes
// ============================================
app.get('/api/settings/whatsapp', (req, res) => {
    const number = kvStore.get('setting:WHATSAPP_NUMBER');
    res.json({ success: true, number: number || null });
});

app.post('/api/settings', authenticateToken, (req, res) => {
    const { whatsappContactNumber } = req.body;
    if (whatsappContactNumber) {
        kvStore.set('setting:WHATSAPP_NUMBER', whatsappContactNumber);
    }
    res.json({ success: true });
});

// ============================================
// Training Settings Routes
// ============================================
app.get('/api/training-settings', (req, res) => {
    const settings = kvStore.get('training_settings');
    res.json({ success: true, data: settings || null });
});

app.post('/api/training-settings', authenticateToken, (req, res) => {
    kvStore.set('training_settings', req.body);
    res.json({ success: true, data: req.body });
});

// ============================================
// Home Grounds Routes
// ============================================
app.get('/api/admin/grounds', (req, res) => {
    const grounds = kvStore.get('home_grounds') || [];
    res.json({ success: true, data: grounds });
});

app.post('/api/admin/grounds', authenticateToken, (req, res) => {
    try {
        const { grounds } = req.body;
        if (!Array.isArray(grounds)) {
            return res.status(400).json({ success: false, error: 'Grounds must be an array' });
        }
        kvStore.set('home_grounds', grounds);
        console.log(`🏟️ Saved ${grounds.length} home grounds`);
        res.json({ success: true, data: grounds, message: `Saved ${grounds.length} ground(s)` });
    } catch (error) {
        console.error('Error saving grounds:', error);
        res.status(500).json({ success: false, error: 'Failed to save grounds' });
    }
});

// ============================================
// Weather Notification Routes
// ============================================
app.post('/api/notifications/weather-training', authenticateToken, (req, res) => {
    try {
        const { weatherData, season, threshold, isGoodWeather, customMessage } = req.body;
        
        console.log('📧 Sending weather training notification');
        console.log(`Season: ${season}, Threshold: ${threshold}°C, Good weather: ${isGoodWeather}`);
        
        // Get all registered users
        const allUsers = Array.from(users.values());
        const userCount = allUsers.length;
        
        if (userCount === 0) {
            return res.json({ 
                success: false, 
                error: 'No users registered to notify' 
            });
        }
        
        // In production, this would send actual emails
        // For now, we log the notification and simulate success
        const forecast = weatherData?.daily ? weatherData.daily.time.map((date, i) => ({
            date,
            maxTemp: weatherData.daily.temperature_2m_max[i],
            minTemp: weatherData.daily.temperature_2m_min[i],
            rain: weatherData.daily.precipitation_probability_max[i]
        })) : [];
        
        console.log('📨 Weather Notification Details:');
        console.log(`   Recipients: ${userCount} users`);
        console.log(`   Message: ${customMessage}`);
        console.log(`   Forecast:`, forecast);
        
        // Store notification in history
        const notification = {
            id: `notif-${Date.now()}`,
            type: 'weather-training',
            sentAt: new Date().toISOString(),
            recipientCount: userCount,
            recipients: allUsers.map(u => u.email),
            weather: {
                season,
                threshold,
                isGoodWeather,
                forecast
            },
            message: customMessage
        };
        
        const notifications = kvStore.get('notifications') || [];
        notifications.push(notification);
        kvStore.set('notifications', notifications);
        
        // In production, integrate with email service here
        // Example with Resend/SendGrid:
        // await sendEmail({
        //     to: allUsers.map(u => u.email),
        //     subject: `🏏 Great Weather for Training! - ${season} Update`,
        //     html: buildWeatherEmailTemplate(customMessage, forecast)
        // });
        
        res.json({ 
            success: true, 
            notifiedCount: userCount,
            message: `Weather notification queued for ${userCount} users`
        });
    } catch (error) {
        console.error('Error sending weather notification:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get notification history
app.get('/api/notifications/history', authenticateToken, (req, res) => {
    const notifications = kvStore.get('notifications') || [];
    res.json({ success: true, data: notifications });
});

// ============================================
// Profile Photo Routes
// ============================================

// Upload/update profile photo
app.put('/api/users/:userId/profile-photo', authenticateToken, (req, res) => {
    try {
        const { userId } = req.params;
        const { profilePhoto, faceDescriptor } = req.body;
        
        if (!profilePhoto || typeof profilePhoto !== 'string') {
            return res.status(400).json({ success: false, error: 'Profile photo (base64) is required' });
        }
        
        // Validate base64 image format
        if (!profilePhoto.startsWith('data:image/')) {
            return res.status(400).json({ success: false, error: 'Invalid image format. Must be a base64 data URI' });
        }
        
        // Check size (max ~5MB base64)
        if (profilePhoto.length > 7 * 1024 * 1024) {
            return res.status(400).json({ success: false, error: 'Image too large. Maximum size is 5MB' });
        }
        
        // Find user by ID
        let targetUser = null;
        for (const [, u] of users) {
            if (u.id === userId) {
                targetUser = u;
                break;
            }
        }
        
        if (!targetUser) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        // Only allow users to update their own photo, or admins to update any
        if (req.user.id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Not authorized to update this photo' });
        }
        
        targetUser.profilePhoto = profilePhoto;
        if (faceDescriptor) {
            targetUser.faceDescriptor = faceDescriptor;
        }
        
        console.log(`📷 Profile photo updated for user: ${targetUser.email}`);
        
        res.json({ success: true, message: 'Profile photo updated' });
    } catch (error) {
        console.error('Error uploading profile photo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get profile photo for a user
app.get('/api/users/:userId/profile-photo', authenticateToken, (req, res) => {
    try {
        const { userId } = req.params;
        
        let targetUser = null;
        for (const [, u] of users) {
            if (u.id === userId) {
                targetUser = u;
                break;
            }
        }
        
        if (!targetUser) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        res.json({ 
            success: true, 
            profilePhoto: targetUser.profilePhoto || null,
            faceDescriptor: targetUser.faceDescriptor || null
        });
    } catch (error) {
        console.error('Error getting profile photo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all members with photos (for face comparison during attendance)
app.get('/api/members/with-photos', authenticateToken, (req, res) => {
    try {
        // Only coaches, head_coaches, committee, board members, and admins can access
        const allowedRoles = ['admin', 'coach', 'head_coach', 'fixture_secretary', 'accountant'];
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Not authorized. Requires coach, committee, or admin role.' });
        }
        
        const membersWithPhotos = [];
        for (const [, u] of users) {
            if (u.profilePhoto) {
                membersWithPhotos.push({
                    id: u.id,
                    name: u.name,
                    firstName: u.firstName,
                    lastName: u.lastName,
                    email: u.email,
                    profilePhoto: u.profilePhoto,
                    faceDescriptor: u.faceDescriptor || null
                });
            }
        }
        
        res.json({ success: true, members: membersWithPhotos });
    } catch (error) {
        console.error('Error getting members with photos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Attendance Routes
// ============================================

// Record attendance
app.post('/api/attendance', authenticateToken, (req, res) => {
    try {
        const allowedRoles = ['admin', 'coach', 'head_coach', 'fixture_secretary', 'accountant'];
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Not authorized to record attendance' });
        }
        
        const { memberId, memberName, date, sessionType, matchConfidence, markedBy } = req.body;
        
        if (!memberId || !date) {
            return res.status(400).json({ success: false, error: 'memberId and date are required' });
        }
        
        // Check for duplicate attendance record
        const existing = attendanceRecords.find(
            r => r.memberId === memberId && r.date === date && r.sessionType === (sessionType || 'training')
        );
        
        if (existing) {
            return res.status(409).json({ success: false, error: 'Attendance already recorded for this member on this date' });
        }
        
        const record = {
            id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            memberId,
            memberName: memberName || 'Unknown',
            date,
            sessionType: sessionType || 'training',
            matchConfidence: matchConfidence || null,
            markedBy: markedBy || req.user.name || req.user.email,
            markedById: req.user.id,
            createdAt: new Date().toISOString()
        };
        
        attendanceRecords.push(record);
        
        console.log(`✅ Attendance recorded: ${memberName} on ${date} by ${record.markedBy}`);
        
        res.json({ success: true, data: record });
    } catch (error) {
        console.error('Error recording attendance:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get attendance records (filter by date, member, etc.)
app.get('/api/attendance', authenticateToken, (req, res) => {
    try {
        const { date, memberId, sessionType } = req.query;
        
        let filtered = [...attendanceRecords];
        
        if (date) {
            filtered = filtered.filter(r => r.date === date);
        }
        if (memberId) {
            filtered = filtered.filter(r => r.memberId === memberId);
        }
        if (sessionType) {
            filtered = filtered.filter(r => r.sessionType === sessionType);
        }
        
        // Sort by newest first
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        res.json({ success: true, data: filtered });
    } catch (error) {
        console.error('Error getting attendance:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete attendance record
app.delete('/api/attendance/:id', authenticateToken, (req, res) => {
    try {
        const allowedRoles = ['admin', 'coach', 'head_coach'];
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }
        
        const { id } = req.params;
        const index = attendanceRecords.findIndex(r => r.id === id);
        
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Attendance record not found' });
        }
        
        attendanceRecords.splice(index, 1);
        res.json({ success: true, message: 'Attendance record deleted' });
    } catch (error) {
        console.error('Error deleting attendance:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Score Upload / Cricket Leinster Proxy Routes
// ============================================

// Get Cricket Leinster integration status
app.get('/api/admin/cricket-leinster-enabled', authenticateToken, (req, res) => {
    const enabled = kvStore.get('setting:CRICKET_LEINSTER_ENABLED') === true;
    res.json({ success: true, enabled });
});

// Toggle Cricket Leinster integration on/off
app.post('/api/admin/cricket-leinster-enabled', authenticateToken, requireAdmin, (req, res) => {
    const { enabled } = req.body;
    kvStore.set('setting:CRICKET_LEINSTER_ENABLED', enabled === true);
    console.log(`🏏 Cricket Leinster integration ${enabled ? 'ENABLED' : 'DISABLED'}`);
    res.json({ success: true, enabled: enabled === true });
});

// Proxy endpoint to fetch Cricket Leinster results (avoids CORS issues)
app.get('/api/admin/cricket-leinster-results', authenticateToken, async (req, res) => {
    // Check if Cricket Leinster integration is enabled
    const clEnabled = kvStore.get('setting:CRICKET_LEINSTER_ENABLED') === true;
    if (!clEnabled) {
        return res.status(403).json({ success: false, error: 'Cricket Leinster integration is disabled. Enable it from the Score Upload settings to fetch results.' });
    }

    const year = req.query.year || new Date().getFullYear();
    const month = req.query.month || (new Date().getMonth() + 1);
    const club = req.query.club || 'DKJRPSNXOM'; // Adamstown
    const page = req.query.page || 1;

    const url = `https://www.cricketleinster.ie/match-centre/results?category=&competition=&club=${club}&team=&venue=&year=${year}&month=${month}&page=${page}`;

    try {
        const response = await fetch(url);
        const html = await response.text();

        // Parse the HTML table for match results
        const matches = [];
        // Match table rows - each row has: Date, Time, Category, Competition, HomeTeam+Score, V, AwayTeam+Score, Result
        const tableRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        const stripTags = (str) => str.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();

        let tableMatch;
        while ((tableMatch = tableRegex.exec(html)) !== null) {
            const rowHtml = tableMatch[1];
            const cells = [];
            let cellMatch;
            while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
                cells.push(stripTags(cellMatch[1]));
            }

            // We expect cells: Date, Time, Category, Competition, Home+Score, V, Away+Score, Result (+ possible empty)
            if (cells.length >= 7) {
                // Skip header rows
                if (cells[0].toLowerCase().includes('date') || cells[1]?.toLowerCase().includes('time')) continue;
                // Skip empty or non-data rows
                if (!cells[0].match(/\d/)) continue;

                // Parse home team and score (e.g., "Adamstown 2 139/9" -> team: "Adamstown 2", score: "139/9")
                const parseTeamScore = (text) => {
                    if (!text) return { team: '', score: '' };
                    // Match score pattern at end: digits/digits optionally followed by overs
                    const m = text.match(/^(.+?)\s+(\d+\/\d+(?:\s*\([\d.]+\s*ov\))?)$/);
                    if (m) return { team: m[1].trim(), score: m[2].trim() };
                    // Walkover or no score  
                    return { team: text.trim(), score: '' };
                };

                // Find the "V" separator to properly split home vs away
                let homeIdx = 4, vIdx = -1, awayIdx = -1, resultIdx = -1;
                for (let c = 4; c < cells.length; c++) {
                    if (cells[c].trim().toUpperCase() === 'V') { vIdx = c; awayIdx = c + 1; break; }
                }
                if (vIdx === -1) { homeIdx = 4; awayIdx = 5; resultIdx = cells.length - 1; }
                else { resultIdx = awayIdx + 1; }

                const homeInfo = parseTeamScore(cells[homeIdx] || '');
                const awayInfo = parseTeamScore(cells[awayIdx] || '');
                // Result is last non-empty cell
                let resultText = '';
                for (let r = cells.length - 1; r > awayIdx; r--) {
                    if (cells[r] && cells[r].trim()) { resultText = cells[r].trim(); break; }
                }
                if (!resultText && resultIdx < cells.length) resultText = cells[resultIdx] || '';

                matches.push({
                    date: cells[0],
                    time: cells[1],
                    category: cells[2],
                    competition: cells[3],
                    homeTeam: homeInfo.team,
                    homeScore: homeInfo.score,
                    awayTeam: awayInfo.team,
                    awayScore: awayInfo.score,
                    result: resultText,
                    raw: cells.join(' | '),
                });
            }
        }

        // Check for pagination
        const pageCountMatch = html.match(/page=(\d+)[^>]*>\s*(\d+)\s*<\/a>\s*(?:»|&raquo;)/);
        const totalPages = pageCountMatch ? parseInt(pageCountMatch[2]) : 1;

        res.json({
            success: true,
            data: {
                matches,
                year: parseInt(year),
                month: parseInt(month),
                club,
                currentPage: parseInt(page),
                totalPages,
                sourceUrl: url,
            }
        });
    } catch (error) {
        console.error('Error fetching Cricket Leinster results:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch Cricket Leinster results: ' + error.message });
    }
});

// Bulk import results from Cricket Leinster or Live Scoring
app.post('/api/admin/import-results', authenticateToken, requireAdmin, (req, res) => {
    const { matches, source } = req.body; // source: 'cricket-leinster' | 'live-scoring'
    if (!matches || !Array.isArray(matches) || matches.length === 0) {
        return res.status(400).json({ success: false, error: 'No matches provided' });
    }

    const imported = [];
    for (const match of matches) {
        const result = {
            id: `result-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            homeTeam: match.homeTeam || '',
            awayTeam: match.awayTeam || '',
            homeScore: match.homeScore || '',
            awayScore: match.awayScore || '',
            winner: match.winner || match.result || '',
            date: match.date || '',
            summary: match.result || match.summary || '',
            competition: match.competition || '',
            category: match.category || '',
            source: source || 'manual',
            importedAt: new Date().toISOString(),
            venue: match.venue || '',
        };
        results.push(result);
        imported.push(result);
    }

    console.log(`✅ Imported ${imported.length} results from ${source}`);
    res.json({ success: true, data: imported, message: `Successfully imported ${imported.length} match result(s)` });
});

// Get completed live scoring sessions for import
app.get('/api/admin/completed-live-matches', authenticateToken, (req, res) => {
    const completed = [];
    for (const [matchId, state] of liveMatches.entries()) {
        if (state.status === 'completed' || state.status === 'live') {
            const firstInnings = state.innings.first;
            const secondInnings = state.innings.second;
            completed.push({
                matchId,
                homeTeam: firstInnings.battingTeam,
                awayTeam: secondInnings.battingTeam,
                homeScore: `${firstInnings.runs}/${firstInnings.wickets}`,
                awayScore: `${secondInnings.runs}/${secondInnings.wickets}`,
                homeOvers: `${firstInnings.overs}.${firstInnings.balls}`,
                awayOvers: `${secondInnings.overs}.${secondInnings.balls}`,
                status: state.status,
                date: state.fixture?.date || state.startedAt?.split('T')[0] || '',
                competition: state.fixture?.competition || '',
                venue: state.fixture?.venue || '',
                scorerName: state.scorerName,
                startedAt: state.startedAt,
            });
        }
    }
    res.json({ success: true, data: completed });
});

// ============================================
// Live Scoring Routes
// ============================================
const liveMatches = new Map(); // matchId -> scoring state

// Get all active live scoring sessions
app.get('/api/live-scoring', authenticateToken, (req, res) => {
    const sessions = [];
    for (const [matchId, state] of liveMatches.entries()) {
        sessions.push({ matchId, ...state });
    }
    res.json({ success: true, data: sessions });
});

// Get live score for a specific match
app.get('/api/live-scoring/:matchId', (req, res) => {
    const { matchId } = req.params;
    const state = liveMatches.get(matchId);
    if (!state) {
        return res.status(404).json({ success: false, error: 'No live scoring session for this match' });
    }
    res.json({ success: true, data: { matchId, ...state } });
});

// Start a live scoring session for a match
app.post('/api/live-scoring/start', authenticateToken, (req, res) => {
    const { matchId } = req.body;
    if (!matchId) return res.status(400).json({ success: false, error: 'matchId is required' });
    
    const fixture = fixtures.find(f => f.id === matchId);
    if (!fixture) return res.status(404).json({ success: false, error: 'Fixture not found' });

    if (liveMatches.has(matchId)) {
        return res.json({ success: true, data: { matchId, ...liveMatches.get(matchId) }, message: 'Session already active' });
    }

    const state = {
        fixture,
        scorerId: req.user.id,
        scorerName: req.user.name || req.user.email,
        startedAt: new Date().toISOString(),
        status: 'live', // live | completed | paused
        tpiSource: 'manual', // manual | camera | mixed
        innings: {
            first: {
                battingTeam: fixture.homeTeam,
                bowlingTeam: fixture.awayTeam,
                runs: 0, wickets: 0, overs: 0, balls: 0, extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalties: 0, shortRuns: 0 },
                batsmen: [], // { id, name, shirtNumber, runs, ballsFaced, fours, sixes, isOut, dismissalType, isOnStrike, position:'striker'|'nonStriker' }
                bowlers: [], // { id, name, overs, maidens, runs, wickets, currentOverBalls }
                ballLog: [],
                strikerId: null, // current striker batsman id
                nonStrikerId: null, // current non-striker batsman id
                currentBowlerId: null,
            },
            second: {
                battingTeam: fixture.awayTeam,
                bowlingTeam: fixture.homeTeam,
                runs: 0, wickets: 0, overs: 0, balls: 0, extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalties: 0, shortRuns: 0 },
                batsmen: [],
                bowlers: [],
                ballLog: [],
                strikerId: null,
                nonStrikerId: null,
                currentBowlerId: null,
            },
        },
        currentInnings: 'first',
        signalLog: [], // log of detected umpire signals
        batsmanAutoAssign: true, // whether to auto-assign runs to batsman at crease
    };

    liveMatches.set(matchId, state);
    console.log(`\u2705 Live scoring started for: ${fixture.homeTeam} vs ${fixture.awayTeam} by ${state.scorerName}`);
    res.json({ success: true, data: { matchId, ...state } });
});

// Set batsmen at crease (striker/non-striker)
app.post('/api/live-scoring/:matchId/set-batsmen', authenticateToken, (req, res) => {
    const { matchId } = req.params;
    const state = liveMatches.get(matchId);
    if (!state) return res.status(404).json({ success: false, error: 'No active session' });

    const { striker, nonStriker, autoAssign } = req.body;
    const inning = state.innings[state.currentInnings];

    // Add or find striker
    if (striker) {
        let bat = inning.batsmen.find(b => b.name === striker.name);
        if (!bat) {
            bat = { id: `bat-${Date.now()}-${Math.random().toString(36).substr(2,4)}`, name: striker.name, shirtNumber: striker.shirtNumber || '', shirtName: striker.shirtName || '', runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false, dismissalType: null, position: 'striker' };
            inning.batsmen.push(bat);
        }
        bat.position = 'striker';
        inning.strikerId = bat.id;
    }

    // Add or find non-striker
    if (nonStriker) {
        let bat = inning.batsmen.find(b => b.name === nonStriker.name);
        if (!bat) {
            bat = { id: `bat-${Date.now()}-${Math.random().toString(36).substr(2,4)}`, name: nonStriker.name, shirtNumber: nonStriker.shirtNumber || '', shirtName: nonStriker.shirtName || '', runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false, dismissalType: null, position: 'nonStriker' };
            inning.batsmen.push(bat);
        }
        bat.position = 'nonStriker';
        inning.nonStrikerId = bat.id;
    }

    if (autoAssign !== undefined) state.batsmanAutoAssign = autoAssign;

    res.json({ success: true, data: { matchId, batsmen: inning.batsmen, strikerId: inning.strikerId, nonStrikerId: inning.nonStrikerId, batsmanAutoAssign: state.batsmanAutoAssign } });
});

// Set current bowler
app.post('/api/live-scoring/:matchId/set-bowler', authenticateToken, (req, res) => {
    const { matchId } = req.params;
    const state = liveMatches.get(matchId);
    if (!state) return res.status(404).json({ success: false, error: 'No active session' });

    const { name, shirtNumber } = req.body;
    const inning = state.innings[state.currentInnings];
    
    let bowler = inning.bowlers.find(b => b.name === name);
    if (!bowler) {
        bowler = { id: `bowl-${Date.now()}`, name, shirtNumber: shirtNumber || '', overs: 0, maidens: 0, runs: 0, wickets: 0, currentOverBalls: 0, currentOverRuns: 0 };
        inning.bowlers.push(bowler);
    }
    inning.currentBowlerId = bowler.id;
    res.json({ success: true, data: { bowler, bowlers: inning.bowlers } });
});

// Swap strike (after odd runs, end of over, etc.)
app.post('/api/live-scoring/:matchId/swap-strike', authenticateToken, (req, res) => {
    const { matchId } = req.params;
    const state = liveMatches.get(matchId);
    if (!state) return res.status(404).json({ success: false, error: 'No active session' });

    const inning = state.innings[state.currentInnings];
    const temp = inning.strikerId;
    inning.strikerId = inning.nonStrikerId;
    inning.nonStrikerId = temp;
    
    // Update position labels
    inning.batsmen.forEach(b => {
        if (b.id === inning.strikerId) b.position = 'striker';
        else if (b.id === inning.nonStrikerId) b.position = 'nonStriker';
    });
    
    res.json({ success: true, data: { strikerId: inning.strikerId, nonStrikerId: inning.nonStrikerId } });
});

// New batsman (after wicket)
app.post('/api/live-scoring/:matchId/new-batsman', authenticateToken, (req, res) => {
    const { matchId } = req.params;
    const state = liveMatches.get(matchId);
    if (!state) return res.status(404).json({ success: false, error: 'No active session' });

    const { name, shirtNumber, shirtName, position } = req.body;
    const inning = state.innings[state.currentInnings];

    const bat = { id: `bat-${Date.now()}-${Math.random().toString(36).substr(2,4)}`, name, shirtNumber: shirtNumber || '', shirtName: shirtName || '', runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false, dismissalType: null, position: position || 'striker' };
    inning.batsmen.push(bat);
    
    if (position === 'nonStriker') {
        inning.nonStrikerId = bat.id;
    } else {
        inning.strikerId = bat.id;
    }
    bat.position = position || 'striker';
    
    res.json({ success: true, data: { batsman: bat, batsmen: inning.batsmen } });
});

// Record a ball (manual or camera-detected) with batsman tracking
app.post('/api/live-scoring/:matchId/ball', authenticateToken, (req, res) => {
    const { matchId } = req.params;
    const state = liveMatches.get(matchId);
    if (!state) return res.status(404).json({ success: false, error: 'No active session' });

    const { runs, extras, wicket, source, signalDetected, overriddenBy, batsmanName, bowlerName, shortRun, assignToBatsmanId } = req.body;
    const inning = state.innings[state.currentInnings];

    // Determine actual runs (apply short run deduction)
    let actualRuns = runs || 0;
    let shortRunDeduction = 0;
    if (shortRun && actualRuns > 0) {
        shortRunDeduction = 1;
        actualRuns = Math.max(0, actualRuns - 1);
    }

    const ball = {
        id: `ball-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: new Date().toISOString(),
        over: inning.overs,
        ballInOver: inning.balls,
        runs: actualRuns,
        originalRuns: runs || 0,
        shortRun: shortRun || false,
        shortRunDeduction,
        extras: extras || null, // { type: 'wide'|'noBall'|'bye'|'legBye', runs: N }
        wicket: wicket || null, // { type: 'bowled'|'caught'|'lbw'|'runOut'|'stumped', outBatsmanId }
        source: source || 'manual', // 'manual' | 'camera'
        signalDetected: signalDetected || null,
        overriddenBy: overriddenBy || null,
        batsmanName: batsmanName || '',
        bowlerName: bowlerName || '',
        strikerId: inning.strikerId,
        nonStrikerId: inning.nonStrikerId,
        assignedToBatsmanId: null,
    };

    // Determine which batsman to credit runs to
    const striker = inning.batsmen.find(b => b.id === inning.strikerId);
    const nonStriker = inning.batsmen.find(b => b.id === inning.nonStrikerId);
    const assignTarget = assignToBatsmanId ? inning.batsmen.find(b => b.id === assignToBatsmanId) : striker;

    // Update score
    let legalBall = true;
    let runsToTeam = 0;
    let runsToBatsman = 0;
    let isBoundary4 = false;
    let isBoundary6 = false;

    if (ball.extras) {
        if (ball.extras.type === 'wide') {
            const wideRuns = ball.extras.runs || 1;
            inning.extras.wides += wideRuns;
            runsToTeam = wideRuns;
            legalBall = false;
            // Wides: no runs credited to batsman, no ball faced
        } else if (ball.extras.type === 'noBall') {
            inning.extras.noBalls += 1;
            runsToTeam = 1 + actualRuns; // 1 penalty + batsman runs
            runsToBatsman = actualRuns; // Batsman gets credit for runs off bat
            legalBall = false;
            if (actualRuns === 4) isBoundary4 = true;
            if (actualRuns === 6) isBoundary6 = true;
        } else if (ball.extras.type === 'bye') {
            // Byes: runs from batsman running but ball didn't touch bat — team gets runs, batsman doesn't
            const byeRuns = ball.extras.runs || actualRuns || 0;
            ball.extras.runs = byeRuns;
            inning.extras.byes += byeRuns;
            runsToTeam = byeRuns;
            runsToBatsman = 0; // Byes don't count as batsman runs
        } else if (ball.extras.type === 'legBye') {
            // Leg byes: same as byes but off body
            const lbRuns = ball.extras.runs || actualRuns || 0;
            ball.extras.runs = lbRuns;
            inning.extras.legByes += lbRuns;
            runsToTeam = lbRuns;
            runsToBatsman = 0; // Leg byes don't count as batsman runs
        }
    } else {
        runsToTeam = actualRuns;
        runsToBatsman = actualRuns;
        if (actualRuns === 4) isBoundary4 = true;
        if (actualRuns === 6) isBoundary6 = true;
    }

    // Apply short run deduction to extras tracking
    if (shortRunDeduction > 0) {
        inning.extras.shortRuns = (inning.extras.shortRuns || 0) + shortRunDeduction;
    }

    inning.runs += runsToTeam;

    // Credit batsman
    if (assignTarget && runsToBatsman > 0) {
        assignTarget.runs += runsToBatsman;
        if (isBoundary4) assignTarget.fours += 1;
        if (isBoundary6) assignTarget.sixes += 1;
        ball.assignedToBatsmanId = assignTarget.id;
    }

    // Ball faced by striker (not for wides)
    if (striker && ball.extras?.type !== 'wide') {
        striker.ballsFaced += 1;
    }

    // Wicket
    if (ball.wicket) {
        inning.wickets += 1;
        // Mark batsman as out
        const outBatsman = ball.wicket.outBatsmanId 
            ? inning.batsmen.find(b => b.id === ball.wicket.outBatsmanId)
            : striker;
        if (outBatsman) {
            outBatsman.isOut = true;
            outBatsman.dismissalType = ball.wicket.type;
        }
    }

    // Legal ball counting
    if (legalBall) {
        inning.balls += 1;
        if (inning.balls >= 6) {
            inning.overs += 1;
            inning.balls = 0;
            // Auto swap strike at end of over
            const temp = inning.strikerId;
            inning.strikerId = inning.nonStrikerId;
            inning.nonStrikerId = temp;
            inning.batsmen.forEach(b => {
                if (b.id === inning.strikerId) b.position = 'striker';
                else if (b.id === inning.nonStrikerId) b.position = 'nonStriker';
            });
            // Update bowler over count
            const bowler = inning.bowlers.find(b => b.id === inning.currentBowlerId);
            if (bowler) {
                bowler.overs += 1;
                bowler.currentOverBalls = 0;
                if (bowler.currentOverRuns === 0) bowler.maidens += 1;
                bowler.currentOverRuns = 0;
            }
        } else {
            const bowler = inning.bowlers.find(b => b.id === inning.currentBowlerId);
            if (bowler) {
                bowler.currentOverBalls += 1;
                bowler.currentOverRuns += runsToTeam;
            }
        }
    }

    // Update bowler stats for runs
    const bowler = inning.bowlers.find(b => b.id === inning.currentBowlerId);
    if (bowler) {
        bowler.runs += runsToTeam;
        if (ball.wicket && !['run out', 'retired', 'timed out', 'obstructing'].includes(ball.wicket.type)) {
            bowler.wickets += 1;
        }
    }

    // Auto swap strike for odd runs (1, 3, 5)
    if (legalBall && (actualRuns % 2 !== 0) && !ball.extras?.type?.match(/wide/)) {
        const temp = inning.strikerId;
        inning.strikerId = inning.nonStrikerId;
        inning.nonStrikerId = temp;
        inning.batsmen.forEach(b => {
            if (b.id === inning.strikerId) b.position = 'striker';
            else if (b.id === inning.nonStrikerId) b.position = 'nonStriker';
        });
    }

    inning.ballLog.push(ball);
    res.json({ success: true, data: { ball, score: { runs: inning.runs, wickets: inning.wickets, overs: inning.overs, balls: inning.balls, extras: inning.extras }, batsmen: inning.batsmen, strikerId: inning.strikerId, nonStrikerId: inning.nonStrikerId } });
});

// Log an umpire signal detection event from camera
app.post('/api/live-scoring/:matchId/signal', authenticateToken, (req, res) => {
    const { matchId } = req.params;
    const state = liveMatches.get(matchId);
    if (!state) return res.status(404).json({ success: false, error: 'No active session' });

    const { signalType, confidence, accepted, overrideTo } = req.body;
    const entry = {
        id: `sig-${Date.now()}`,
        timestamp: new Date().toISOString(),
        signalType, // wide, noBall, out, six, four, bye, legBye, deadBall
        confidence: confidence || 0,
        accepted: accepted !== undefined ? accepted : true,
        overrideTo: overrideTo || null,
    };
    state.signalLog.push(entry);
    res.json({ success: true, data: entry });
});

// Switch innings
app.post('/api/live-scoring/:matchId/switch-innings', authenticateToken, (req, res) => {
    const { matchId } = req.params;
    const state = liveMatches.get(matchId);
    if (!state) return res.status(404).json({ success: false, error: 'No active session' });
    state.currentInnings = state.currentInnings === 'first' ? 'second' : 'first';
    res.json({ success: true, currentInnings: state.currentInnings, data: state.innings });
});

// Update match status (pause/resume/complete)
app.put('/api/live-scoring/:matchId/status', authenticateToken, (req, res) => {
    const { matchId } = req.params;
    const state = liveMatches.get(matchId);
    if (!state) return res.status(404).json({ success: false, error: 'No active session' });
    const { status } = req.body;
    if (!['live', 'paused', 'completed'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    state.status = status;
    if (status === 'completed') state.completedAt = new Date().toISOString();
    res.json({ success: true, data: { matchId, status: state.status } });
});

// Undo last ball
app.post('/api/live-scoring/:matchId/undo', authenticateToken, (req, res) => {
    const { matchId } = req.params;
    const state = liveMatches.get(matchId);
    if (!state) return res.status(404).json({ success: false, error: 'No active session' });

    const inning = state.innings[state.currentInnings];
    if (inning.ballLog.length === 0) {
        return res.status(400).json({ success: false, error: 'No balls to undo' });
    }

    const lastBall = inning.ballLog.pop();
    // Reverse score changes
    let wasLegal = true;
    if (lastBall.extras) {
        if (lastBall.extras.type === 'wide') {
            inning.extras.wides -= (lastBall.extras.runs || 1);
            inning.runs -= (lastBall.extras.runs || 1);
            wasLegal = false;
        } else if (lastBall.extras.type === 'noBall') {
            inning.extras.noBalls -= 1;
            inning.runs -= 1 + (lastBall.runs || 0);
            wasLegal = false;
        } else if (lastBall.extras.type === 'bye') {
            inning.extras.byes -= (lastBall.extras.runs || 0);
            inning.runs -= (lastBall.extras.runs || 0);
        } else if (lastBall.extras.type === 'legBye') {
            inning.extras.legByes -= (lastBall.extras.runs || 0);
            inning.runs -= (lastBall.extras.runs || 0);
        }
    } else {
        inning.runs -= lastBall.runs;
    }
    if (lastBall.wicket) inning.wickets -= 1;
    if (wasLegal) {
        if (inning.balls === 0) {
            inning.overs = Math.max(0, inning.overs - 1);
            inning.balls = 5;
        } else {
            inning.balls -= 1;
        }
    }

    res.json({ success: true, data: { undone: lastBall, score: { runs: inning.runs, wickets: inning.wickets, overs: inning.overs, balls: inning.balls } } });
});

// ============================================
// Start Server
// ============================================
initializeSampleData();

// In production, serve the built frontend from ../dist
if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, '..', 'dist');
    app.use(express.static(distPath));
    // SPA fallback — serve index.html for all non-API routes
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(distPath, 'index.html'));
        }
    });
    console.log(`📁 Serving static frontend from: ${distPath}`);
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   🏏 Cricket Club Website - In-Memory Server                   ║
║                                                                ║
║   Server running on: http://0.0.0.0:${PORT}                    ║
║   API Base URL:      http://localhost:${PORT}/api               ║
║                                                                ║
║   Mode: IN-MEMORY (No database required)                       ║
║   Note: Data will be lost when server restarts                 ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
