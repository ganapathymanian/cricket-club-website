import { useState, useEffect } from "react";
import { Calendar, AlertTriangle, Download, RefreshCw, Edit2, Save, X, Upload, MapPin, Settings } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { toast } from "sonner";

interface FixtureGeneratorPageProps {
  apiUrl: string;
  apiKey: string;
}

interface GeneratedFixture {
  id: string;
  date: string;
  venue: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  status: string;
  matchType: "league" | "t20" | "cup" | "friendly" | "internal";
  matchCategory: string;
  overs: string;
  time: string;
}

interface Conflict {
  date: string;
  venue: string;
  fixtures: string[];
}

export function FixtureGeneratorPage({ apiUrl, apiKey }: FixtureGeneratorPageProps) {
  // Step 1: Season Configuration
  const [currentYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [numTeams, setNumTeams] = useState<number>(0);
  const [numGrounds, setNumGrounds] = useState<number>(0);
  const [groundNames, setGroundNames] = useState<string[]>([]);
  const [adminGrounds, setAdminGrounds] = useState<{ id: string; name: string; address: string }[]>([]);
  const [groundsLoaded, setGroundsLoaded] = useState(false);

  // Step 2: Team-Ground Matrix
  const [teamGroundMatrix, setTeamGroundMatrix] = useState<{ [team: string]: { [ground: string]: number } }>({});
  
  // Step 3: Generated Fixtures
  const [generatedFixtures, setGeneratedFixtures] = useState<GeneratedFixture[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [editingFixture, setEditingFixture] = useState<string | null>(null);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Load grounds from Admin Settings and team configuration on mount
  useEffect(() => {
    loadAdminGrounds();
    loadTeamConfiguration();
  }, []);

  const loadAdminGrounds = async () => {
    try {
      const response = await fetch(`${apiUrl}/admin/grounds`);
      const data = await response.json();
      
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setAdminGrounds(data.data);
        // Auto-populate grounds from admin settings
        const groundsList = data.data.filter((g: any) => g.name && g.name.trim());
        if (groundsList.length > 0) {
          setNumGrounds(groundsList.length);
          setGroundNames(groundsList.map((g: any) => g.name));
          setGroundsLoaded(true);
          toast.success(`🏟️ ${groundsList.length} home ground(s) loaded from Admin Settings`);
        }
      }
    } catch (error) {
      console.log("No admin grounds configured or error loading:", error);
    }
  };

  const loadTeamConfiguration = async () => {
    setLoadingConfig(true);
    try {
      const response = await fetch(`${apiUrl}/team-config/${currentYear}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const data = await response.json();
      
      if (data.success && data.data) {
        const config = data.data;
        
        // Auto-populate from team sheet configuration
        setNumTeams(config.teams.length);
        setNumGrounds(config.grounds.length);
        setGroundNames(config.grounds.map((g: any) => g.groundName));
        
        toast.success("Team configuration loaded from Team Sheet");
      } else {
        toast.info("No team configuration found. Please configure in Team Sheet first.");
      }
    } catch (error) {
      console.error("Error loading team configuration:", error);
    } finally {
      setLoadingConfig(false);
    }
  };

  // Initialize grounds
  const handleGroundsChange = (value: number) => {
    setNumGrounds(value);
    const defaultGrounds = Array.from({ length: value }, (_, i) => `Ground ${String.fromCharCode(65 + i)}`);
    setGroundNames(defaultGrounds);
  };

  // Initialize team-ground matrix
  const initializeMatrix = () => {
    if (numTeams <= 0 || numGrounds <= 0) {
      toast.error("Please enter valid number of teams and grounds");
      return;
    }

    const matrix: { [team: string]: { [ground: string]: number } } = {};
    for (let i = 1; i <= numTeams; i++) {
      const teamName = `Team ${i}`;
      matrix[teamName] = {};
      groundNames.forEach(ground => {
        matrix[teamName][ground] = 0;
      });
    }
    setTeamGroundMatrix(matrix);
    setCurrentStep(2);
  };

  // Update matrix value
  const updateMatrixValue = (team: string, ground: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setTeamGroundMatrix(prev => ({
      ...prev,
      [team]: {
        ...prev[team],
        [ground]: numValue
      }
    }));
  };

  // Get available dates (weekends and holidays)
  const getAvailableDates = (start: Date, end: Date): Date[] => {
    const dates: Date[] = [];
    const current = new Date(start);
    
    // Irish public holidays 2024-2026 (simplified)
    const irishHolidays = [
      '2024-01-01', '2024-03-17', '2024-03-29', '2024-04-01', '2024-05-06', 
      '2024-06-03', '2024-08-05', '2024-10-28', '2024-12-25', '2024-12-26',
      '2025-01-01', '2025-03-17', '2025-04-18', '2025-04-21', '2025-05-05',
      '2025-06-02', '2025-08-04', '2025-10-27', '2025-12-25', '2025-12-26',
      '2026-01-01', '2026-03-17', '2026-04-03', '2026-04-06', '2026-05-04',
      '2026-06-01', '2026-08-03', '2026-10-26', '2026-12-25', '2026-12-26',
    ];

    while (current <= end) {
      const dayOfWeek = current.getDay();
      const dateStr = current.toISOString().split('T')[0];
      
      // Weekend (Saturday=6, Sunday=0) or holiday
      if (dayOfWeek === 0 || dayOfWeek === 6 || irishHolidays.includes(dateStr)) {
        dates.push(new Date(current));
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  // Generate fixtures using the algorithm
  const generateFixtures = () => {
    if (!startDate || !endDate) {
      toast.error("Please select start and end dates");
      return;
    }

    setGenerating(true);

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const availableDates = getAvailableDates(start, end);

      if (availableDates.length === 0) {
        toast.error("No available dates found in the selected range");
        setGenerating(false);
        return;
      }

      const fixtures: GeneratedFixture[] = [];
      const teams = Object.keys(teamGroundMatrix);
      const matchCount: { [team: string]: { [ground: string]: number } } = {};
      const lastMatchDate: { [team: string]: Date | null } = {};
      const groundUsage: { [ground: string]: { [date: string]: boolean } } = {};
      const teamUsage: { [team: string]: { [date: string]: boolean } } = {};

      // Initialize counters
      teams.forEach(team => {
        matchCount[team] = {};
        groundNames.forEach(ground => {
          matchCount[team][ground] = 0;
        });
        lastMatchDate[team] = null;
        teamUsage[team] = {};
      });

      groundNames.forEach(ground => {
        groundUsage[ground] = {};
      });

      // Generate opponents pool for each team
      const opponents: { [team: string]: string[] } = {};
      teams.forEach((team, index) => {
        opponents[team] = [];
        for (let i = 0; i < 30; i++) {
          opponents[team].push(`Opposition ${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26) + 1}`);
        }
      });

      // Generate fixtures
      for (const date of availableDates) {
        const dateStr = date.toISOString().split('T')[0];
        
        // Shuffle grounds for variety
        const shuffledGrounds = [...groundNames].sort(() => Math.random() - 0.5);
        
        for (const ground of shuffledGrounds) {
          // Skip if ground already used on this date
          if (groundUsage[ground][dateStr]) continue;

          // Try to assign a team to this ground
          for (const team of teams) {
            const requiredMatches = teamGroundMatrix[team][ground];
            
            // Check if team needs more matches at this ground
            if (matchCount[team][ground] >= requiredMatches) continue;

            // Check if team already playing on this date
            if (teamUsage[team][dateStr]) continue;

            // Check minimum gap between matches (at least 2 days)
            if (lastMatchDate[team]) {
              const daysDiff = Math.floor((date.getTime() - lastMatchDate[team]!.getTime()) / (1000 * 60 * 60 * 24));
              if (daysDiff < 2) continue;
            }

            // Assign fixture
            const opponent = opponents[team].shift() || "TBD";
            const matchTypes: Array<"league" | "t20" | "cup" | "friendly" | "internal"> = ["league"];
            const matchType = matchTypes[Math.floor(Math.random() * matchTypes.length)];
            const oversMap: Record<string, string> = { league: "50", t20: "20", cup: "50", friendly: "40", internal: "20" };

            fixtures.push({
              id: `fixture-${fixtures.length + 1}`,
              date: dateStr,
              venue: ground,
              homeTeam: team,
              awayTeam: opponent,
              competition: `${currentYear} League`,
              status: "scheduled",
              matchType: matchType,
              matchCategory: "",
              overs: oversMap[matchType] || "50",
              time: "13:00",
            });

            matchCount[team][ground]++;
            lastMatchDate[team] = date;
            groundUsage[ground][dateStr] = true;
            teamUsage[team][dateStr] = true;
            break; // Move to next ground
          }
        }
      }

      setGeneratedFixtures(fixtures);
      checkConflicts(fixtures);
      setCurrentStep(3);
      toast.success(`Generated ${fixtures.length} fixtures successfully!`);
      
      // Show publish dialog after generation
      setTimeout(() => {
        setShowPublishDialog(true);
      }, 500);
    } catch (error) {
      console.error("Error generating fixtures:", error);
      toast.error("Failed to generate fixtures");
    } finally {
      setGenerating(false);
    }
  };

  // Check for conflicts (multiple matches at same ground on same day)
  const checkConflicts = (fixtures: GeneratedFixture[]) => {
    const groundDateMap: { [key: string]: GeneratedFixture[] } = {};
    
    fixtures.forEach(fixture => {
      const key = `${fixture.date}-${fixture.venue}`;
      if (!groundDateMap[key]) {
        groundDateMap[key] = [];
      }
      groundDateMap[key].push(fixture);
    });

    const foundConflicts: Conflict[] = [];
    Object.entries(groundDateMap).forEach(([key, fixturesAtVenue]) => {
      if (fixturesAtVenue.length > 1) {
        const [date, venue] = key.split('-');
        foundConflicts.push({
          date: new Date(date).toLocaleDateString('en-IE'),
          venue: venue,
          fixtures: fixturesAtVenue.map(f => `${f.homeTeam} vs ${f.awayTeam} (${f.overs} overs)`)
        });
      }
    });

    setConflicts(foundConflicts);
  };

  // Update fixture
  const updateFixture = (id: string, field: keyof GeneratedFixture, value: string) => {
    const updated = generatedFixtures.map(fixture => 
      fixture.id === id ? { ...fixture, [field]: value } : fixture
    );
    setGeneratedFixtures(updated);
    checkConflicts(updated);
  };

  // Save fixtures to database
  const saveFixturesToDatabase = async () => {
    if (conflicts.length > 0) {
      if (!confirm("There are conflicts in the fixtures. Do you want to save anyway?")) {
        return;
      }
    }

    try {
      const promises = generatedFixtures.map(fixture =>
        fetch(`${apiUrl}/fixtures`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            homeTeam: fixture.homeTeam,
            awayTeam: fixture.awayTeam,
            date: fixture.date,
            time: fixture.time,
            venue: fixture.venue,
            competition: fixture.competition,
            matchType: fixture.matchType,
            matchCategory: fixture.matchCategory,
            overs: fixture.overs,
            status: fixture.status,
          }),
        })
      );

      await Promise.all(promises);
      toast.success("All fixtures saved to database!");
    } catch (error) {
      console.error("Error saving fixtures:", error);
      toast.error("Failed to save fixtures to database");
    }
  };

  // Export to Excel (download as CSV)
  const exportToCSV = () => {
    const headers = ["Date", "Time", "Venue", "Home Team", "Away Team", "Competition", "Match Type", "Overs", "Status"];
    const rows = generatedFixtures.map(f => [
      new Date(f.date).toLocaleDateString('en-IE'),
      f.time || '',
      f.venue,
      f.homeTeam,
      f.awayTeam,
      f.competition,
      f.matchType,
      f.overs,
      f.status
    ]);

    let csv = headers.join(",") + "\n";
    rows.forEach(row => {
      csv += row.join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fixtures_${currentYear}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IE", {
      weekday: "short",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-red-900">Fixture Generator</h2>
        <p className="text-gray-600 mt-2">
          Generate fixtures for {currentYear} season
        </p>
      </div>

      {/* Step 1: Season Configuration */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Season Configuration</CardTitle>
            <CardDescription>Configure the season parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Season Year</Label>
                <Input value={currentYear} disabled className="bg-gray-100" />
              </div>
              <div className="space-y-2">
                <Label>Number of Teams</Label>
                <Input
                  type="number"
                  min="2"
                  max="20"
                  value={numTeams || ""}
                  onChange={(e) => setNumTeams(parseInt(e.target.value) || 0)}
                  placeholder="Enter number of teams"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Season Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Season End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Home Grounds</Label>
                {groundsLoaded && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                    <MapPin className="size-3" />
                    Loaded from Admin Settings
                  </span>
                )}
              </div>
              
              {!groundsLoaded && (
                <Alert className="bg-amber-50 border-amber-200">
                  <Settings className="size-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">No grounds configured</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    Home grounds can be configured in <strong>Admin → Admin Settings → Home Grounds</strong>. 
                    Once configured, they will auto-populate here!
                  </AlertDescription>
                </Alert>
              )}
              
              {groundsLoaded && adminGrounds.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800 mb-2">
                    <strong>🏟️ Home Grounds ({adminGrounds.length}):</strong>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {adminGrounds.filter(g => g.name).map((ground) => (
                      <span 
                        key={ground.id}
                        className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-green-300 text-sm"
                      >
                        <MapPin className="size-3 text-green-600" />
                        <span className="font-medium">{ground.name}</span>
                        {ground.address && (
                          <span className="text-gray-500">• {ground.address}</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {!groundsLoaded && (
                <Select
                  value={numGrounds.toString()}
                  onValueChange={(value) => handleGroundsChange(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select number of grounds" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} Ground{num > 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {numGrounds > 0 && !groundsLoaded && (
              <div className="space-y-3">
                <Label>Ground Names (Manual Entry)</Label>
                {groundNames.map((ground, index) => (
                  <Input
                    key={index}
                    value={ground}
                    onChange={(e) => {
                      const updated = [...groundNames];
                      updated[index] = e.target.value;
                      setGroundNames(updated);
                    }}
                    placeholder={`Ground ${index + 1} name`}
                  />
                ))}
              </div>
            )}

            <Button
              onClick={initializeMatrix}
              className="bg-red-900 hover:bg-red-800 w-full"
              disabled={!numTeams || !numGrounds || !startDate || !endDate}
            >
              Next: Configure Team Matches
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Team-Ground Matrix */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Configure Matches per Team per Ground</CardTitle>
            <CardDescription>
              Enter how many matches each team will play at each ground
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-red-900 text-white">
                    <th className="border p-2 text-left">Team</th>
                    {groundNames.map(ground => (
                      <th key={ground} className="border p-2 text-center">{ground}</th>
                    ))}
                    <th className="border p-2 text-center">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(teamGroundMatrix).map(team => (
                    <tr key={team} className="hover:bg-gray-50">
                      <td className="border p-2 font-medium">{team}</td>
                      {groundNames.map(ground => (
                        <td key={ground} className="border p-2">
                          <Input
                            type="number"
                            min="0"
                            max="20"
                            value={teamGroundMatrix[team][ground] || ""}
                            onChange={(e) => updateMatrixValue(team, ground, e.target.value)}
                            className="text-center"
                          />
                        </td>
                      ))}
                      <td className="border p-2 text-center font-semibold">
                        {Object.values(teamGroundMatrix[team]).reduce((a, b) => a + b, 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
              >
                Back
              </Button>
              <Button
                onClick={generateFixtures}
                disabled={generating}
                className="bg-red-900 hover:bg-red-800 flex-1"
              >
                {generating ? (
                  <>
                    <RefreshCw className="size-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Calendar className="size-4 mr-2" />
                    Generate Fixtures
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review and Edit Fixtures */}
      {currentStep === 3 && (
        <>
          {/* Conflicts Alert */}
          {conflicts.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Fixture Conflicts Detected!</AlertTitle>
              <AlertDescription>
                <div className="space-y-2 mt-2">
                  {conflicts.map((conflict, index) => (
                    <div key={index} className="text-sm">
                      <strong>{conflict.date} at {conflict.venue}:</strong>
                      <ul className="list-disc ml-5 mt-1">
                        {conflict.fixtures.map((fixture, i) => (
                          <li key={i}>{fixture}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              Start Over
            </Button>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="size-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={saveFixturesToDatabase}
              className="bg-red-900 hover:bg-red-800 flex-1"
            >
              <Save className="size-4 mr-2" />
              Save to Database
            </Button>
          </div>

          {/* Fixtures List */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Fixtures ({generatedFixtures.length})</CardTitle>
              <CardDescription>Review and edit fixtures as needed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {generatedFixtures.map(fixture => (
                  <div
                    key={fixture.id}
                    className="border rounded-lg p-4 hover:bg-gray-50"
                  >
                    {editingFixture === fixture.id ? (
                      <div className="space-y-3">
                        <div className="grid md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Date</Label>
                            <Input
                              type="date"
                              value={fixture.date}
                              onChange={(e) => updateFixture(fixture.id, "date", e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Venue</Label>
                            <Select
                              value={fixture.venue}
                              onValueChange={(value) => updateFixture(fixture.id, "venue", value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {groundNames.map(ground => (
                                  <SelectItem key={ground} value={ground}>{ground}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Match Type</Label>
                            <Select
                              value={fixture.matchType}
                              onValueChange={(value) => updateFixture(fixture.id, "matchType", value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="league">League</SelectItem>
                                <SelectItem value="t20">T20</SelectItem>
                                <SelectItem value="cup">Cup</SelectItem>
                                <SelectItem value="friendly">Friendly</SelectItem>
                                <SelectItem value="internal">Internal</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => setEditingFixture(null)}
                            className="bg-red-900 hover:bg-red-800"
                          >
                            <Save className="size-3 mr-1" /> Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingFixture(null)}
                          >
                            <X className="size-3 mr-1" /> Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="size-4 text-red-900" />
                            <span className="font-semibold">
                              {formatDate(fixture.date)}
                            </span>
                            <span className="text-gray-500">|</span>
                            <span className="text-sm text-gray-600">{fixture.venue}</span>
                          </div>
                          <div className="text-sm">
                            <strong>{fixture.homeTeam}</strong> vs <strong>{fixture.awayTeam}</strong>
                            <span className="ml-2 text-gray-500">({fixture.matchType} • {fixture.overs} overs)</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingFixture(fixture.id)}
                        >
                          <Edit2 className="size-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Publish Fixtures Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="size-5 text-red-900" />
              Publish Fixtures
            </DialogTitle>
            <DialogDescription>
              Would you like to publish these {generatedFixtures.length} fixtures to the main Fixtures page?
              {conflicts.length > 0 && (
                <span className="block mt-2 text-amber-600 font-semibold">
                  ⚠️ Warning: There are {conflicts.length} conflict(s) in the fixtures.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Fixtures:</span>
                <span className="font-semibold">{generatedFixtures.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Season:</span>
                <span className="font-semibold">{currentYear}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Date Range:</span>
                <span className="font-semibold">
                  {startDate && endDate && `${new Date(startDate).toLocaleDateString('en-IE')} - ${new Date(endDate).toLocaleDateString('en-IE')}`}
                </span>
              </div>
              {conflicts.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-amber-600">Conflicts:</span>
                  <span className="font-semibold text-amber-600">{conflicts.length}</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPublishDialog(false)}
              className="w-full sm:w-auto"
            >
              Review Later
            </Button>
            <Button
              onClick={async () => {
                await saveFixturesToDatabase();
                setShowPublishDialog(false);
              }}
              className="bg-red-900 hover:bg-red-800 w-full sm:w-auto"
            >
              <Upload className="size-4 mr-2" />
              Publish to Fixtures
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}