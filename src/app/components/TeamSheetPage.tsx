import { useState, useEffect } from "react";
import { Shield, Plus, Edit2, Save, X, Trash2, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import { Badge } from "./ui/badge";

interface TeamSheetPageProps {
  apiUrl: string;
  apiKey: string;
}

interface TeamConfig {
  teamNumber: number;
  teamName: string;
  division: string;
}

interface GroundConfig {
  groundNumber: number;
  groundName: string;
}

interface YearConfig {
  year: number;
  teams: TeamConfig[];
  grounds: GroundConfig[];
}

export function TeamSheetPage({ apiUrl, apiKey }: TeamSheetPageProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
  
  const [numTeams, setNumTeams] = useState<number>(0);
  const [teams, setTeams] = useState<TeamConfig[]>([]);
  
  const [numGrounds, setNumGrounds] = useState<number>(0);
  const [grounds, setGrounds] = useState<GroundConfig[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    fetchAvailableYears();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchYearConfiguration(selectedYear);
    }
  }, [selectedYear]);

  const fetchAvailableYears = async () => {
    try {
      const response = await fetch(`${apiUrl}/team-config/years`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        setAvailableYears(data.data);
      }
    } catch (error) {
      console.error("Error fetching available years:", error);
    }
  };

  const fetchYearConfiguration = async (year: number) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/team-config/${year}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const data = await response.json();
      
      if (data.success && data.data) {
        const config = data.data;
        setNumTeams(config.teams.length);
        setTeams(config.teams);
        setNumGrounds(config.grounds.length);
        setGrounds(config.grounds);
        setHasUnsavedChanges(false);
      } else {
        // No configuration found for this year, start fresh
        setNumTeams(0);
        setTeams([]);
        setNumGrounds(0);
        setGrounds([]);
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error("Error fetching year configuration:", error);
      toast.error("Failed to load configuration");
    } finally {
      setLoading(false);
    }
  };

  const initializeTeams = () => {
    if (numTeams <= 0) {
      toast.error("Please enter a valid number of teams");
      return;
    }

    const newTeams: TeamConfig[] = [];
    for (let i = 1; i <= numTeams; i++) {
      newTeams.push({
        teamNumber: i,
        teamName: `Team ${i}`,
        division: "1",
      });
    }
    setTeams(newTeams);
    setHasUnsavedChanges(true);
  };

  const initializeGrounds = () => {
    if (numGrounds <= 0) {
      toast.error("Please enter a valid number of grounds");
      return;
    }

    const newGrounds: GroundConfig[] = [];
    for (let i = 1; i <= numGrounds; i++) {
      newGrounds.push({
        groundNumber: i,
        groundName: `Ground ${String.fromCharCode(64 + i)}`,
      });
    }
    setGrounds(newGrounds);
    setHasUnsavedChanges(true);
  };

  const updateTeam = (teamNumber: number, field: keyof TeamConfig, value: string) => {
    setTeams(teams.map(team => 
      team.teamNumber === teamNumber 
        ? { ...team, [field]: value }
        : team
    ));
    setHasUnsavedChanges(true);
  };

  const updateGround = (groundNumber: number, value: string) => {
    setGrounds(grounds.map(ground => 
      ground.groundNumber === groundNumber 
        ? { ...ground, groundName: value }
        : ground
    ));
    setHasUnsavedChanges(true);
  };

  const removeTeam = (teamNumber: number) => {
    setTeams(teams.filter(team => team.teamNumber !== teamNumber));
    setNumTeams(numTeams - 1);
    setHasUnsavedChanges(true);
  };

  const addTeam = () => {
    const newTeamNumber = teams.length > 0 
      ? Math.max(...teams.map(t => t.teamNumber)) + 1 
      : 1;
    
    setTeams([...teams, {
      teamNumber: newTeamNumber,
      teamName: `Team ${newTeamNumber}`,
      division: "1",
    }]);
    setNumTeams(numTeams + 1);
    setHasUnsavedChanges(true);
  };

  const removeGround = (groundNumber: number) => {
    setGrounds(grounds.filter(ground => ground.groundNumber !== groundNumber));
    setNumGrounds(numGrounds - 1);
    setHasUnsavedChanges(true);
  };

  const addGround = () => {
    const newGroundNumber = grounds.length > 0 
      ? Math.max(...grounds.map(g => g.groundNumber)) + 1 
      : 1;
    
    setGrounds([...grounds, {
      groundNumber: newGroundNumber,
      groundName: `Ground ${String.fromCharCode(64 + newGroundNumber)}`,
    }]);
    setNumGrounds(numGrounds + 1);
    setHasUnsavedChanges(true);
  };

  const saveConfiguration = async () => {
    if (teams.length === 0 && grounds.length === 0) {
      toast.error("Please configure at least teams or grounds");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${apiUrl}/team-config/${selectedYear}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          year: selectedYear,
          teams: teams,
          grounds: grounds,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Configuration saved for ${selectedYear}`);
        setHasUnsavedChanges(false);
        
        // Add year to available years if not already there
        if (!availableYears.includes(selectedYear)) {
          setAvailableYears([...availableYears, selectedYear].sort());
        }
      } else {
        toast.error(`Failed to save: ${data.error}`);
      }
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const createNewYear = () => {
    const newYear = currentYear + 1;
    
    // Check if configuration already exists
    if (availableYears.includes(newYear)) {
      setSelectedYear(newYear);
      return;
    }

    // Copy current year's configuration to new year
    if (confirm(`Create configuration for ${newYear} based on ${selectedYear}?`)) {
      setSelectedYear(newYear);
      setHasUnsavedChanges(true);
      toast.info(`Configure ${newYear} and click Save`);
    }
  };

  const divisions = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-red-900">Team Sheet Configuration</h2>
          <p className="text-gray-600 mt-2">
            Configure teams and grounds for each cricket season
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fetchYearConfiguration(selectedYear)}
            disabled={loading}
          >
            <RefreshCw className={`size-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={createNewYear}
            variant="outline"
            className="border-red-900 text-red-900 hover:bg-red-50"
          >
            <Plus className="size-4 mr-2" />
            New Year
          </Button>
        </div>
      </div>

      {/* Year Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Year</CardTitle>
          <CardDescription>Choose which year to configure</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>Year</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => {
                  if (hasUnsavedChanges) {
                    if (confirm("You have unsaved changes. Do you want to discard them?")) {
                      setSelectedYear(parseInt(value));
                    }
                  } else {
                    setSelectedYear(parseInt(value));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year} {year === currentYear ? "(Current)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasUnsavedChanges && (
              <Badge variant="outline" className="border-orange-500 text-orange-700 bg-orange-50">
                Unsaved Changes
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="size-8 mx-auto animate-spin text-red-900 mb-4" />
          <p className="text-gray-500">Loading configuration...</p>
        </div>
      ) : (
        <>
          {/* Teams Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Teams Configuration for {selectedYear}</span>
                <Button onClick={addTeam} size="sm" variant="outline">
                  <Plus className="size-4 mr-2" />
                  Add Team
                </Button>
              </CardTitle>
              <CardDescription>
                Configure teams and their Cricket Leinster divisions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Number of Teams</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={numTeams || ""}
                      onChange={(e) => setNumTeams(parseInt(e.target.value) || 0)}
                      placeholder="Enter number of teams"
                    />
                    <Button onClick={initializeTeams} variant="outline">
                      Initialize
                    </Button>
                  </div>
                </div>
              </div>

              {teams.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Team Details</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-red-900 text-white">
                        <tr>
                          <th className="p-3 text-left">Team #</th>
                          <th className="p-3 text-left">Team Name</th>
                          <th className="p-3 text-left">Division</th>
                          <th className="p-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teams.map(team => (
                          <tr key={team.teamNumber} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-medium">Team {team.teamNumber}</td>
                            <td className="p-3">
                              <Input
                                value={team.teamName}
                                onChange={(e) => updateTeam(team.teamNumber, "teamName", e.target.value)}
                                placeholder="Team name"
                              />
                            </td>
                            <td className="p-3">
                              <Select
                                value={team.division}
                                onValueChange={(value) => updateTeam(team.teamNumber, "division", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {divisions.map(div => (
                                    <SelectItem key={div} value={div}>
                                      Division {div}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-3 text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeTeam(team.teamNumber)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Grounds Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Grounds Configuration for {selectedYear}</span>
                <Button onClick={addGround} size="sm" variant="outline">
                  <Plus className="size-4 mr-2" />
                  Add Ground
                </Button>
              </CardTitle>
              <CardDescription>
                Configure grounds available for the season
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Number of Grounds</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={numGrounds || ""}
                      onChange={(e) => setNumGrounds(parseInt(e.target.value) || 0)}
                      placeholder="Enter number of grounds"
                    />
                    <Button onClick={initializeGrounds} variant="outline">
                      Initialize
                    </Button>
                  </div>
                </div>
              </div>

              {grounds.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Ground Details</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-red-900 text-white">
                        <tr>
                          <th className="p-3 text-left">Ground #</th>
                          <th className="p-3 text-left">Ground Name</th>
                          <th className="p-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grounds.map(ground => (
                          <tr key={ground.groundNumber} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-medium">Ground {ground.groundNumber}</td>
                            <td className="p-3">
                              <Input
                                value={ground.groundName}
                                onChange={(e) => updateGround(ground.groundNumber, e.target.value)}
                                placeholder="Ground name"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeGround(ground.groundNumber)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-2">
            <Button
              onClick={saveConfiguration}
              disabled={saving || !hasUnsavedChanges}
              className="bg-red-900 hover:bg-red-800"
            >
              <Save className="size-4 mr-2" />
              {saving ? "Saving..." : "Save Configuration"}
            </Button>
          </div>

          {/* Summary */}
          {teams.length > 0 && (
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-lg">Configuration Summary for {selectedYear}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2">Teams</h4>
                    <p className="text-sm text-gray-600">Total Teams: {teams.length}</p>
                    <div className="mt-2 space-y-1">
                      {Array.from(new Set(teams.map(t => t.division))).sort().map(div => (
                        <p key={div} className="text-sm">
                          Division {div}: {teams.filter(t => t.division === div).length} team(s)
                        </p>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Grounds</h4>
                    <p className="text-sm text-gray-600">Total Grounds: {grounds.length}</p>
                    <div className="mt-2 space-y-1">
                      {grounds.map(ground => (
                        <p key={ground.groundNumber} className="text-sm">
                          {ground.groundName}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
