-- Cricket Club Website - MSSQL Database Schema
-- Run this script in your local SQL Server to create the database

-- Create Database (run separately if needed)
-- CREATE DATABASE CricketClubDB;
-- GO
-- USE CricketClubDB;
-- GO

-- ============================================
-- Key-Value Store Table (replicates Supabase kv_store)
-- ============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='kv_store' AND xtype='U')
CREATE TABLE kv_store (
    [key] NVARCHAR(255) NOT NULL PRIMARY KEY,
    [value] NVARCHAR(MAX) NOT NULL,  -- JSON stored as string
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

-- ============================================
-- Users Table
-- ============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
CREATE TABLE users (
    id NVARCHAR(50) PRIMARY KEY DEFAULT NEWID(),
    email NVARCHAR(255) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NULL,  -- NULL for OAuth users
    first_name NVARCHAR(100),
    last_name NVARCHAR(100),
    name NVARCHAR(255),
    role NVARCHAR(50) DEFAULT 'member',
    gender NVARCHAR(20),
    date_of_birth DATE NULL,
    is_minor BIT DEFAULT 0,
    mobile_number NVARCHAR(50),
    whatsapp_number NVARCHAR(50),
    facebook_id NVARCHAR(100),
    address NVARCHAR(500),
    emergency_contact_name NVARCHAR(100),
    emergency_contact_phone NVARCHAR(50),
    emergency_contact_relationship NVARCHAR(50),
    old_adamstown_user_id NVARCHAR(50),
    played_in_ireland BIT DEFAULT 0,
    cricket_ireland_id NVARCHAR(50),
    data_consent BIT DEFAULT 0,
    auth_provider NVARCHAR(50) DEFAULT 'local',
    refresh_token NVARCHAR(500),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

-- ============================================
-- Access Tokens Table (for JWT session management)
-- ============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='access_tokens' AND xtype='U')
CREATE TABLE access_tokens (
    token NVARCHAR(500) PRIMARY KEY,
    user_id NVARCHAR(50) NOT NULL,
    expires_at DATETIME2 NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
GO

-- ============================================
-- Fixtures Table
-- ============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='fixtures' AND xtype='U')
CREATE TABLE fixtures (
    id NVARCHAR(50) PRIMARY KEY DEFAULT NEWID(),
    home_team NVARCHAR(255) NOT NULL,
    away_team NVARCHAR(255) NOT NULL,
    match_date DATE NOT NULL,
    match_time TIME NULL,
    venue NVARCHAR(255),
    competition NVARCHAR(255),
    status NVARCHAR(50) DEFAULT 'Scheduled',
    season NVARCHAR(20),
    notes NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

-- ============================================
-- Teams Table
-- ============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='teams' AND xtype='U')
CREATE TABLE teams (
    id NVARCHAR(50) PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    division NVARCHAR(100),
    captain NVARCHAR(255),
    vice_captain NVARCHAR(255),
    coach NVARCHAR(255),
    season NVARCHAR(20),
    active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

-- ============================================
-- Players Table
-- ============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='players' AND xtype='U')
CREATE TABLE players (
    id NVARCHAR(50) PRIMARY KEY DEFAULT NEWID(),
    user_id NVARCHAR(50) NULL,  -- Link to users table
    name NVARCHAR(255) NOT NULL,
    role NVARCHAR(100),  -- Batsman, Bowler, All-rounder, Wicket-keeper
    team_id NVARCHAR(50),
    batting_style NVARCHAR(50),
    bowling_style NVARCHAR(50),
    jersey_number INT,
    active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (team_id) REFERENCES teams(id)
);
GO

-- ============================================
-- Player Stats Table
-- ============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='player_stats' AND xtype='U')
CREATE TABLE player_stats (
    id NVARCHAR(50) PRIMARY KEY DEFAULT NEWID(),
    player_id NVARCHAR(50) NOT NULL,
    season NVARCHAR(20),
    matches INT DEFAULT 0,
    runs INT DEFAULT 0,
    wickets INT DEFAULT 0,
    catches INT DEFAULT 0,
    stumpings INT DEFAULT 0,
    batting_average DECIMAL(10,2),
    bowling_average DECIMAL(10,2),
    strike_rate DECIMAL(10,2),
    economy_rate DECIMAL(10,2),
    highest_score INT DEFAULT 0,
    best_bowling NVARCHAR(20),
    fifties INT DEFAULT 0,
    hundreds INT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (player_id) REFERENCES players(id)
);
GO

-- ============================================
-- Results Table
-- ============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='results' AND xtype='U')
CREATE TABLE results (
    id NVARCHAR(50) PRIMARY KEY DEFAULT NEWID(),
    fixture_id NVARCHAR(50),
    home_team NVARCHAR(255) NOT NULL,
    away_team NVARCHAR(255) NOT NULL,
    home_score NVARCHAR(50),
    away_score NVARCHAR(50),
    winner NVARCHAR(255),
    result_type NVARCHAR(50),  -- Won, Lost, Draw, Tie, No Result
    match_date DATE NOT NULL,
    venue NVARCHAR(255),
    competition NVARCHAR(255),
    man_of_match NVARCHAR(255),
    summary NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (fixture_id) REFERENCES fixtures(id)
);
GO

-- ============================================
-- Availability Table
-- ============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='availability' AND xtype='U')
CREATE TABLE availability (
    id NVARCHAR(50) PRIMARY KEY DEFAULT NEWID(),
    user_id NVARCHAR(50) NOT NULL,
    fixture_id NVARCHAR(50),
    available_date DATE NOT NULL,
    status NVARCHAR(50) DEFAULT 'Available',  -- Available, Unavailable, Maybe
    notes NVARCHAR(500),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (fixture_id) REFERENCES fixtures(id)
);
GO

-- ============================================
-- Team Configuration Table (per season/year)
-- ============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='team_config' AND xtype='U')
CREATE TABLE team_config (
    id NVARCHAR(50) PRIMARY KEY DEFAULT NEWID(),
    year INT NOT NULL,
    config_data NVARCHAR(MAX),  -- JSON configuration
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

-- ============================================
-- App Settings Table
-- ============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='app_settings' AND xtype='U')
CREATE TABLE app_settings (
    [key] NVARCHAR(100) PRIMARY KEY,
    [value] NVARCHAR(MAX),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

-- ============================================
-- Coach Availability Table
-- ============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='coach_availability' AND xtype='U')
CREATE TABLE coach_availability (
    id NVARCHAR(50) PRIMARY KEY DEFAULT NEWID(),
    coach_id NVARCHAR(50) NOT NULL,
    available_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    session_type NVARCHAR(50),  -- 1-to-1, 1-to-2, 1-to-3
    is_booked BIT DEFAULT 0,
    booked_by NVARCHAR(50),
    notes NVARCHAR(500),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (coach_id) REFERENCES users(id),
    FOREIGN KEY (booked_by) REFERENCES users(id)
);
GO

-- ============================================
-- Trigger to update updated_at timestamp
-- ============================================
CREATE OR ALTER TRIGGER trg_users_updated
ON users
AFTER UPDATE
AS
BEGIN
    UPDATE users
    SET updated_at = GETDATE()
    FROM users u
    INNER JOIN inserted i ON u.id = i.id;
END;
GO

-- ============================================
-- Insert default admin user
-- ============================================
IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'ganapathy.manian@gmail.com')
BEGIN
    INSERT INTO users (id, email, first_name, last_name, name, role, auth_provider)
    VALUES (NEWID(), 'ganapathy.manian@gmail.com', 'Ganapathy', 'Manian', 'Ganapathy Manian', 'admin', 'local');
END
GO

IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'inbioz@gmail.com')
BEGIN
    INSERT INTO users (id, email, first_name, last_name, name, role, auth_provider)
    VALUES (NEWID(), 'inbioz@gmail.com', 'Admin', 'User', 'Admin User', 'admin', 'local');
END
GO

-- ============================================
-- Insert sample data
-- ============================================

-- Sample Teams
IF NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Adamstown CC 1st XI')
BEGIN
    INSERT INTO teams (id, name, division, captain, vice_captain, coach, season, active)
    VALUES 
        ('team-1', 'Adamstown CC 1st XI', 'Premier League', 'John Smith', 'Mike Johnson', 'David Wilson', '2026', 1),
        ('team-2', 'Adamstown CC 2nd XI', 'First Grade', 'Tom Brown', 'Chris Davis', 'Robert Taylor', '2026', 1);
END
GO

-- Sample Fixtures
IF NOT EXISTS (SELECT 1 FROM fixtures WHERE id = 'fixture-1')
BEGIN
    INSERT INTO fixtures (id, home_team, away_team, match_date, venue, competition, status, season)
    VALUES 
        ('fixture-1', 'Adamstown CC 1st XI', 'Newcastle CC', '2026-02-15', 'Adamstown Oval', 'Premier League', 'Scheduled', '2026'),
        ('fixture-2', 'Merewether CC', 'Adamstown CC 1st XI', '2026-02-22', 'Merewether Beach Oval', 'Premier League', 'Scheduled', '2026');
END
GO

-- Sample Players
IF NOT EXISTS (SELECT 1 FROM players WHERE id = 'player-1')
BEGIN
    INSERT INTO players (id, name, role, team_id, batting_style, bowling_style, active)
    VALUES 
        ('player-1', 'John Smith', 'All-rounder', 'team-1', 'Right-handed', 'Right-arm medium', 1),
        ('player-2', 'Mike Johnson', 'Batsman', 'team-1', 'Left-handed', NULL, 1),
        ('player-3', 'Tom Brown', 'Bowler', 'team-2', 'Right-handed', 'Right-arm fast', 1);
END
GO

-- Sample Player Stats
IF NOT EXISTS (SELECT 1 FROM player_stats WHERE player_id = 'player-1')
BEGIN
    INSERT INTO player_stats (player_id, season, matches, runs, wickets, batting_average, bowling_average)
    VALUES 
        ('player-1', '2026', 45, 1250, 32, 35.7, 22.5),
        ('player-2', '2026', 38, 1580, 2, 42.1, NULL),
        ('player-3', '2026', 32, 380, 48, 12.6, 18.5);
END
GO

-- Sample Results
IF NOT EXISTS (SELECT 1 FROM results WHERE id = 'result-1')
BEGIN
    INSERT INTO results (id, home_team, away_team, home_score, away_score, winner, match_date, venue, competition)
    VALUES 
        ('result-1', 'Adamstown CC 1st XI', 'Hamilton CC', '245', '198', 'Adamstown CC 1st XI', '2026-02-08', 'Adamstown Oval', 'Premier League');
END
GO

PRINT 'Cricket Club Database schema created successfully!';
GO
