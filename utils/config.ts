// API Configuration for Cricket Club Website
// Local Express.js + In-Memory/MSSQL Backend

// ============================================
// Backend Configuration
// ============================================
const CONFIG = {
    apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
    authMode: 'jwt' as const,
    // Google OAuth Configuration
    googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
};

// ============================================
// Export Configuration
// ============================================
export const config = CONFIG;
export const apiUrl = config.apiUrl;
export const authMode = config.authMode;
export const googleClientId = config.googleClientId;

// ============================================
// Helper Functions
// ============================================

// Check if using local backend (always true now)
export const isLocalBackend = () => true;

// Get auth header for API requests
export const getAuthHeader = (token: string) => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
});

// Local storage keys for JWT tokens
export const TOKEN_STORAGE_KEY = 'cricket_club_token';
export const USER_STORAGE_KEY = 'cricket_club_user';

// Store token locally (for JWT auth)
export const storeLocalToken = (token: string) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

// Get stored token
export const getLocalToken = (): string | null => {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
};

// Remove stored token
export const removeLocalToken = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
};

// Store user data locally
export const storeLocalUser = (user: any) => {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
};

// Get stored user data
export const getLocalUser = (): any | null => {
    const user = localStorage.getItem(USER_STORAGE_KEY);
    return user ? JSON.parse(user) : null;
};

// API configuration loaded

