# Fixture Generator Guide

## Overview
The Fixture Generator is a powerful tool for Adamstown Cricket Club fixture secretaries and admins to automatically generate season fixtures based on configurable parameters.

## Access
- **Available to:** Fixture Secretaries and Admins only
- **Location:** Navigation menu → "Fixture Generator" tab

## How It Works

### Step 1: Season Configuration

1. **Season Year**: Automatically set to current year (read-only)

2. **Number of Teams**: Enter the total number of teams participating
   - Accepts: 2-20 teams
   - Teams will be named automatically: Team 1, Team 2, etc.

3. **Season Dates**:
   - **Start Date**: First day of the cricket season
   - **End Date**: Last day of the cricket season
   - System will only schedule matches on weekends and Irish public holidays

4. **Number of Grounds**: Select how many grounds will be used
   - Options: 1-6 grounds
   - Default names: Ground A, Ground B, Ground C, etc.
   - You can customize ground names after selection

### Step 2: Match Configuration Matrix

Configure how many matches each team will play at each ground.

**Example Configuration:**
```
Team      | Ground A | Ground B | Ground C | Total
----------|----------|----------|----------|------
Team 1    |    5     |    3     |    2     |  10
Team 2    |    4     |    4     |    2     |  10
Team 3    |    3     |    5     |    2     |  10
```

**Tips:**
- Ensure fair distribution across grounds
- Consider ground availability
- Total matches = sum of all ground allocations

### Step 3: Generate & Review

Click **"Generate Fixtures"** to create the season schedule.

## The Algorithm

The fixture generation algorithm:

1. **Available Dates**: Identifies all weekends and public holidays in the date range
2. **Match Distribution**: Distributes matches according to your team-ground matrix
3. **Constraints Applied**:
   - Minimum 2-day gap between team matches (no back-to-back games)
   - Maximum 3 matches per team per month
   - One match per ground per day
   - Fair opponent rotation

## Generated Fixtures

Each fixture includes:
- **Date**: Match date (weekends/holidays only)
- **Venue**: Ground assignment
- **Home Team**: Your club team
- **Away Team**: Opposition team (auto-generated)
- **Match Type**: Randomly assigned (35/40/45/50 overs)
- **Competition**: Season league
- **Status**: Scheduled

## Conflict Detection

The system automatically detects conflicts:

**Conflict Rule**: A ground can only host ONE match per day (regardless of over format)

If conflicts are detected, you'll see an alert showing:
- Date of conflict
- Ground with conflict
- All matches scheduled at that time

### Example Conflict Alert:
```
⚠️ Fixture Conflicts Detected!
9 February 2026 at Ground A:
• Team 1 vs Opposition A1 (45 overs)
• Team 3 vs Opposition C1 (40 overs)
```

## Manual Editing

You can manually edit any fixture:

1. Click the **Edit** button on any fixture
2. Modify:
   - Date
   - Venue (select from your grounds)
   - Match Type (35/40/45/50 overs)
3. Click **Save** to apply changes
4. System automatically re-checks for conflicts

## Saving Fixtures

### Option 1: Save to Database
Click **"Save to Database"** to store all fixtures in the system.
- Fixtures become visible on the public Fixtures page
- Can be managed via "Manage Fixtures" tab
- If conflicts exist, you'll be prompted to confirm

### Option 2: Export to CSV
Click **"Export CSV"** to download fixtures as a spreadsheet.
- Opens in Excel/Google Sheets
- Includes all fixture details
- Can be shared with stakeholders

## Best Practices

### Planning
1. **Start Early**: Generate fixtures at least 2 months before season
2. **Buffer Time**: Add extra days at end of season for rain-outs
3. **Ground Availability**: Verify ground access before generating
4. **Team Commitments**: Consider player availability patterns

### Configuration
1. **Balanced Distribution**: Distribute matches evenly across grounds
2. **Realistic Totals**: 10-15 matches per team per season is typical
3. **Peak Months**: More matches in summer months (May-August)
4. **Holiday Awareness**: System auto-includes Irish holidays

### Review
1. **Check Conflicts**: Always resolve conflicts before saving
2. **Verify Dates**: Ensure key dates (finals, etc.) are available
3. **Opposition Names**: Edit auto-generated names to real teams
4. **Match Types**: Adjust over formats based on competition rules

## Troubleshooting

### "No available dates found"
- Check your date range includes weekends
- Extend end date if season is too short
- Verify dates are in correct format

### "Too few fixtures generated"
- Increase date range
- Reduce matches per ground per team
- Check if constraints are too restrictive

### "Multiple conflicts detected"
- Increase number of grounds
- Reduce matches per team
- Extend season duration
- Manually edit conflicting fixtures

### "Export not working"
- Check browser pop-up blocker settings
- Ensure browser allows CSV downloads
- Try different browser if issues persist

## Irish Public Holidays (Auto-Included)

The system automatically schedules matches on:
- New Year's Day (1 January)
- St. Patrick's Day (17 March)
- Easter Monday
- May Bank Holiday (first Monday in May)
- June Bank Holiday (first Monday in June)
- August Bank Holiday (first Monday in August)
- October Bank Holiday (last Monday in October)
- Christmas Day (25 December)
- St. Stephen's Day (26 December)

Plus all Saturdays and Sundays in your date range.

## Match Over Formats

**35 Overs**: Shorter format, ideal for midweek or evening matches
**40 Overs**: Standard one-day format
**45 Overs**: Extended format for important matches
**50 Overs**: Full ODI-style format for league/cup finals

You can adjust these after generation based on:
- Ground lighting availability
- Competition requirements
- Historical preferences

## Support

If you encounter issues:
1. Check this guide first
2. Contact the admin via User Management
3. Try "Start Over" to reconfigure
4. Export your current fixtures before making major changes

## Version History

- **v1.0** (2026-02-09): Initial release with full fixture generation
  - Team-ground matrix configuration
  - Auto-conflict detection
  - CSV export functionality
  - Manual editing support
