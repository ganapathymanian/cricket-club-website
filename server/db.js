// Database connection module for MSSQL
const sql = require('mssql');

// Database configuration - ALL values MUST come from environment variables in production
if (!process.env.DB_PASSWORD) {
    console.warn('⚠️  WARNING: DB_PASSWORD not set. Set all DB_* environment variables for production.');
}
const config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'CricketClubDB',
    port: parseInt(process.env.DB_PORT || '1433'),
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true', // Enable encryption in production
        trustServerCertificate: process.env.NODE_ENV !== 'production',
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let pool = null;

// Initialize database connection pool
async function connect() {
    try {
        if (pool) {
            return pool;
        }
        console.log('Connecting to MSSQL database...');
        pool = await sql.connect(config);
        console.log('✅ Connected to MSSQL database');
        return pool;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        throw error;
    }
}

// Get connection pool
function getPool() {
    if (!pool) {
        throw new Error('Database not connected. Call connect() first.');
    }
    return pool;
}

// Close connection pool
async function close() {
    if (pool) {
        await pool.close();
        pool = null;
        console.log('Database connection closed');
    }
}

// ============================================
// Key-Value Store Operations (mimics Supabase kv_store)
// ============================================

const kv = {
    // Set a key-value pair
    async set(key, value) {
        const pool = getPool();
        const jsonValue = JSON.stringify(value);
        
        await pool.request()
            .input('key', sql.NVarChar, key)
            .input('value', sql.NVarChar, jsonValue)
            .query(`
                MERGE kv_store AS target
                USING (SELECT @key AS [key], @value AS [value]) AS source
                ON target.[key] = source.[key]
                WHEN MATCHED THEN
                    UPDATE SET [value] = source.[value], updated_at = GETDATE()
                WHEN NOT MATCHED THEN
                    INSERT ([key], [value]) VALUES (source.[key], source.[value]);
            `);
    },

    // Get a value by key
    async get(key) {
        const pool = getPool();
        const result = await pool.request()
            .input('key', sql.NVarChar, key)
            .query('SELECT [value] FROM kv_store WHERE [key] = @key');
        
        if (result.recordset.length === 0) {
            return null;
        }
        
        try {
            return JSON.parse(result.recordset[0].value);
        } catch {
            return result.recordset[0].value;
        }
    },

    // Delete a key
    async del(key) {
        const pool = getPool();
        await pool.request()
            .input('key', sql.NVarChar, key)
            .query('DELETE FROM kv_store WHERE [key] = @key');
    },

    // Set multiple key-value pairs
    async mset(keys, values) {
        for (let i = 0; i < keys.length; i++) {
            await this.set(keys[i], values[i]);
        }
    },

    // Get multiple values by keys
    async mget(keys) {
        const results = [];
        for (const key of keys) {
            results.push(await this.get(key));
        }
        return results;
    },

    // Delete multiple keys
    async mdel(keys) {
        for (const key of keys) {
            await this.del(key);
        }
    },

    // Get all values by key prefix
    async getByPrefix(prefix) {
        const pool = getPool();
        const result = await pool.request()
            .input('prefix', sql.NVarChar, prefix + '%')
            .query('SELECT [key], [value] FROM kv_store WHERE [key] LIKE @prefix');
        
        return result.recordset.map(row => {
            try {
                return JSON.parse(row.value);
            } catch {
                return row.value;
            }
        });
    },

    // Get all key-value pairs by prefix
    async getByPrefixWithKeys(prefix) {
        const pool = getPool();
        const result = await pool.request()
            .input('prefix', sql.NVarChar, prefix + '%')
            .query('SELECT [key], [value] FROM kv_store WHERE [key] LIKE @prefix');
        
        return result.recordset.map(row => ({
            key: row.key,
            value: JSON.parse(row.value)
        }));
    }
};

// ============================================
// User Operations
// ============================================

const users = {
    // Create a new user
    async create(userData) {
        const pool = getPool();
        const id = userData.id || require('crypto').randomUUID();
        
        const result = await pool.request()
            .input('id', sql.NVarChar, id)
            .input('email', sql.NVarChar, userData.email)
            .input('password_hash', sql.NVarChar, userData.passwordHash || null)
            .input('first_name', sql.NVarChar, userData.firstName || null)
            .input('last_name', sql.NVarChar, userData.lastName || null)
            .input('name', sql.NVarChar, userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim())
            .input('role', sql.NVarChar, userData.role || 'member')
            .input('auth_provider', sql.NVarChar, userData.authProvider || 'local')
            .query(`
                INSERT INTO users (id, email, password_hash, first_name, last_name, name, role, auth_provider)
                OUTPUT INSERTED.*
                VALUES (@id, @email, @password_hash, @first_name, @last_name, @name, @role, @auth_provider)
            `);
        
        return result.recordset[0];
    },

    // Get user by email
    async getByEmail(email) {
        const pool = getPool();
        const result = await pool.request()
            .input('email', sql.NVarChar, email.toLowerCase())
            .query('SELECT * FROM users WHERE LOWER(email) = @email');
        
        return result.recordset[0] || null;
    },

    // Get user by ID
    async getById(id) {
        const pool = getPool();
        const result = await pool.request()
            .input('id', sql.NVarChar, id)
            .query('SELECT * FROM users WHERE id = @id');
        
        return result.recordset[0] || null;
    },

    // Update user
    async update(id, updates) {
        const pool = getPool();
        const setClauses = [];
        const request = pool.request().input('id', sql.NVarChar, id);
        
        const fieldMappings = {
            firstName: 'first_name',
            lastName: 'last_name',
            name: 'name',
            role: 'role',
            gender: 'gender',
            dateOfBirth: 'date_of_birth',
            mobileNumber: 'mobile_number',
            whatsappNumber: 'whatsapp_number',
            address: 'address',
            refreshToken: 'refresh_token'
        };
        
        for (const [key, value] of Object.entries(updates)) {
            const dbField = fieldMappings[key] || key;
            setClauses.push(`${dbField} = @${key}`);
            request.input(key, sql.NVarChar, value);
        }
        
        if (setClauses.length === 0) return null;
        
        setClauses.push('updated_at = GETDATE()');
        
        const result = await request.query(`
            UPDATE users SET ${setClauses.join(', ')}
            OUTPUT INSERTED.*
            WHERE id = @id
        `);
        
        return result.recordset[0] || null;
    },

    // Get all users
    async getAll() {
        const pool = getPool();
        const result = await pool.request()
            .query('SELECT * FROM users ORDER BY created_at DESC');
        
        return result.recordset;
    },

    // Update user role
    async updateRole(id, role) {
        return this.update(id, { role });
    }
};

// ============================================
// Fixtures Operations
// ============================================

const fixtures = {
    async getAll() {
        const pool = getPool();
        const result = await pool.request()
            .query('SELECT * FROM fixtures ORDER BY match_date DESC');
        
        return result.recordset.map(row => ({
            id: row.id,
            homeTeam: row.home_team,
            awayTeam: row.away_team,
            date: row.match_date,
            time: row.match_time,
            venue: row.venue,
            competition: row.competition,
            status: row.status,
            season: row.season,
            notes: row.notes
        }));
    },

    async create(fixture) {
        const pool = getPool();
        const id = fixture.id || require('crypto').randomUUID();
        
        const result = await pool.request()
            .input('id', sql.NVarChar, id)
            .input('home_team', sql.NVarChar, fixture.homeTeam)
            .input('away_team', sql.NVarChar, fixture.awayTeam)
            .input('match_date', sql.Date, new Date(fixture.date))
            .input('venue', sql.NVarChar, fixture.venue)
            .input('competition', sql.NVarChar, fixture.competition)
            .input('status', sql.NVarChar, fixture.status || 'Scheduled')
            .input('season', sql.NVarChar, fixture.season)
            .query(`
                INSERT INTO fixtures (id, home_team, away_team, match_date, venue, competition, status, season)
                OUTPUT INSERTED.*
                VALUES (@id, @home_team, @away_team, @match_date, @venue, @competition, @status, @season)
            `);
        
        return result.recordset[0];
    },

    async update(id, updates) {
        const pool = getPool();
        const request = pool.request().input('id', sql.NVarChar, id);
        const setClauses = [];
        
        const fieldMappings = {
            homeTeam: 'home_team',
            awayTeam: 'away_team',
            date: 'match_date',
            venue: 'venue',
            competition: 'competition',
            status: 'status',
            season: 'season'
        };
        
        for (const [key, value] of Object.entries(updates)) {
            const dbField = fieldMappings[key] || key;
            setClauses.push(`${dbField} = @${key}`);
            request.input(key, sql.NVarChar, value);
        }
        
        if (setClauses.length === 0) return null;
        
        const result = await request.query(`
            UPDATE fixtures SET ${setClauses.join(', ')}, updated_at = GETDATE()
            OUTPUT INSERTED.*
            WHERE id = @id
        `);
        
        return result.recordset[0];
    },

    async delete(id) {
        const pool = getPool();
        await pool.request()
            .input('id', sql.NVarChar, id)
            .query('DELETE FROM fixtures WHERE id = @id');
    }
};

// ============================================
// Teams Operations
// ============================================

const teams = {
    async getAll() {
        const pool = getPool();
        const result = await pool.request()
            .query('SELECT * FROM teams WHERE active = 1 ORDER BY name');
        
        return result.recordset.map(row => ({
            id: row.id,
            name: row.name,
            division: row.division,
            captain: row.captain,
            vice_captain: row.vice_captain,
            coach: row.coach,
            season: row.season
        }));
    },

    async create(team) {
        const pool = getPool();
        const id = team.id || require('crypto').randomUUID();
        
        const result = await pool.request()
            .input('id', sql.NVarChar, id)
            .input('name', sql.NVarChar, team.name)
            .input('division', sql.NVarChar, team.division)
            .input('captain', sql.NVarChar, team.captain)
            .input('vice_captain', sql.NVarChar, team.vice_captain)
            .input('coach', sql.NVarChar, team.coach)
            .input('season', sql.NVarChar, team.season)
            .query(`
                INSERT INTO teams (id, name, division, captain, vice_captain, coach, season)
                OUTPUT INSERTED.*
                VALUES (@id, @name, @division, @captain, @vice_captain, @coach, @season)
            `);
        
        return result.recordset[0];
    }
};

// ============================================
// Players Operations
// ============================================

const players = {
    async getAll() {
        const pool = getPool();
        const result = await pool.request()
            .query(`
                SELECT p.*, t.name as team_name, ps.matches, ps.runs, ps.wickets, ps.batting_average
                FROM players p
                LEFT JOIN teams t ON p.team_id = t.id
                LEFT JOIN player_stats ps ON p.id = ps.player_id
                WHERE p.active = 1
                ORDER BY p.name
            `);
        
        return result.recordset.map(row => ({
            id: row.id,
            name: row.name,
            role: row.role,
            team: row.team_name,
            teamId: row.team_id,
            battingStyle: row.batting_style,
            bowlingStyle: row.bowling_style,
            stats: {
                matches: row.matches || 0,
                runs: row.runs || 0,
                wickets: row.wickets || 0,
                average: row.batting_average ? row.batting_average.toString() : '0'
            }
        }));
    },

    async create(player) {
        const pool = getPool();
        const id = player.id || require('crypto').randomUUID();
        
        const result = await pool.request()
            .input('id', sql.NVarChar, id)
            .input('name', sql.NVarChar, player.name)
            .input('role', sql.NVarChar, player.role)
            .input('team_id', sql.NVarChar, player.teamId)
            .query(`
                INSERT INTO players (id, name, role, team_id)
                OUTPUT INSERTED.*
                VALUES (@id, @name, @role, @team_id)
            `);
        
        return result.recordset[0];
    }
};

// ============================================
// Results Operations
// ============================================

const results = {
    async getAll() {
        const pool = getPool();
        const result = await pool.request()
            .query('SELECT * FROM results ORDER BY match_date DESC');
        
        return result.recordset.map(row => ({
            id: row.id,
            homeTeam: row.home_team,
            awayTeam: row.away_team,
            homeScore: row.home_score,
            awayScore: row.away_score,
            winner: row.winner,
            date: row.match_date,
            venue: row.venue,
            competition: row.competition
        }));
    },

    async create(resultData) {
        const pool = getPool();
        const id = resultData.id || require('crypto').randomUUID();
        
        const result = await pool.request()
            .input('id', sql.NVarChar, id)
            .input('home_team', sql.NVarChar, resultData.homeTeam)
            .input('away_team', sql.NVarChar, resultData.awayTeam)
            .input('home_score', sql.NVarChar, resultData.homeScore)
            .input('away_score', sql.NVarChar, resultData.awayScore)
            .input('winner', sql.NVarChar, resultData.winner)
            .input('match_date', sql.Date, new Date(resultData.date))
            .input('venue', sql.NVarChar, resultData.venue)
            .input('competition', sql.NVarChar, resultData.competition)
            .query(`
                INSERT INTO results (id, home_team, away_team, home_score, away_score, winner, match_date, venue, competition)
                OUTPUT INSERTED.*
                VALUES (@id, @home_team, @away_team, @home_score, @away_score, @winner, @match_date, @venue, @competition)
            `);
        
        return result.recordset[0];
    }
};

module.exports = {
    sql,
    config,
    connect,
    getPool,
    close,
    kv,
    users,
    fixtures,
    teams,
    players,
    results
};
