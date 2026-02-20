import { useState, useEffect, useRef } from "react";
import { Plus, Mail, MessageCircle, Save, Settings, Trash2, AlertTriangle, Database, MapPin, Image, Upload, X, Download, Globe, Radio, Check, Loader2, RefreshCw, ExternalLink, Trophy } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";
import { getLocalToken, isLocalBackend } from "../../../utils/config";

interface AdminPageProps {
  apiUrl: string;
  apiKey: string;
}

export function AdminPage({ apiUrl, apiKey }: AdminPageProps) {
  // Fixture form state
  const [fixtureForm, setFixtureForm] = useState({
    homeTeam: "",
    awayTeam: "",
    date: "",
    venue: "",
    competition: "",
  });

  // Team form state
  const [teamForm, setTeamForm] = useState({
    name: "",
    division: "",
    captain: "",
  });

  // Player form state
  const [playerForm, setPlayerForm] = useState({
    name: "",
    role: "",
    battingStyle: "",
    bowlingStyle: "",
    team: "",
  });

  // Result form state
  const [resultForm, setResultForm] = useState({
    homeTeam: "",
    awayTeam: "",
    homeScore: "",
    awayScore: "",
    winner: "",
    date: "",
    summary: "",
  });

  const [loading, setLoading] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    emailApiKey: "",
    emailServiceUrl: "",
    fromEmail: "",
    appUrl: "",
    whatsappContactNumber: "",
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Ground configuration state
  const [grounds, setGrounds] = useState<{ id: string; name: string; address: string }[]>([]);
  const [loadingGrounds, setLoadingGrounds] = useState(false);
  const [savingGrounds, setSavingGrounds] = useState(false);

  // Banner photos state
  const [bannerPhotos, setBannerPhotos] = useState<Array<{ id: string; url: string; caption: string; order: number }>>([]);
  const [loadingBannerPhotos, setLoadingBannerPhotos] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerUrlInput, setBannerUrlInput] = useState('');
  const [bannerCaptionInput, setBannerCaptionInput] = useState('');
  const bannerFileRef = useRef<HTMLInputElement>(null);

  // Score Upload state
  const [clEnabled, setClEnabled] = useState(false);
  const [clEnabledLoading, setClEnabledLoading] = useState(true);
  const [scoreUploadTab, setScoreUploadTab] = useState<'cricket-leinster' | 'live-scoring'>('cricket-leinster');
  const [clYear, setClYear] = useState(new Date().getFullYear());
  const [clMonth, setClMonth] = useState(new Date().getMonth() + 1);
  const [clMatches, setClMatches] = useState<any[]>([]);
  const [clLoading, setClLoading] = useState(false);
  const [clError, setClError] = useState('');
  const [clSelectedIds, setClSelectedIds] = useState<Set<number>>(new Set());
  const [clImporting, setClImporting] = useState(false);
  const [clTotalPages, setClTotalPages] = useState(1);
  const [clCurrentPage, setClCurrentPage] = useState(1);
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveSelectedIds, setLiveSelectedIds] = useState<Set<string>>(new Set());
  const [liveImporting, setLiveImporting] = useState(false);

  // Load grounds and CL setting on mount
  useEffect(() => {
    loadGrounds();
    loadBannerPhotos();
    loadCLEnabledSetting();
  }, []);

  const loadCLEnabledSetting = async () => {
    try {
      const authToken = isLocalBackend() ? getLocalToken() : apiKey;
      const response = await fetch(`${apiUrl}/admin/cricket-leinster-enabled`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await response.json();
      if (data.success) setClEnabled(data.enabled);
    } catch (error) {
      console.error('Error loading CL setting:', error);
    } finally {
      setClEnabledLoading(false);
    }
  };

  const toggleCLEnabled = async () => {
    const newValue = !clEnabled;
    try {
      const authToken = isLocalBackend() ? getLocalToken() : apiKey;
      const response = await fetch(`${apiUrl}/admin/cricket-leinster-enabled`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ enabled: newValue }),
      });
      const data = await response.json();
      if (data.success) {
        setClEnabled(newValue);
        toast.success(newValue ? '✅ Cricket Leinster integration enabled!' : '🔴 Cricket Leinster integration disabled.');
      }
    } catch (error) {
      console.error('Error toggling CL setting:', error);
      toast.error('Failed to update setting');
    }
  };

  const loadGrounds = async () => {
    setLoadingGrounds(true);
    try {
      const response = await fetch(`${apiUrl}/admin/grounds`);
      const data = await response.json();
      if (data.success && data.data) {
        setGrounds(data.data);
      }
    } catch (error) {
      console.error("Error loading grounds:", error);
    } finally {
      setLoadingGrounds(false);
    }
  };

  // Banner photo management
  const loadBannerPhotos = async () => {
    setLoadingBannerPhotos(true);
    try {
      const res = await fetch(`${apiUrl}/banner-photos`);
      const data = await res.json();
      if (data.success) setBannerPhotos(data.data);
    } catch (error) {
      console.error('Error loading banner photos:', error);
    } finally {
      setLoadingBannerPhotos(false);
    }
  };

  const handleBannerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setBannerUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const authToken = isLocalBackend() ? getLocalToken() : apiKey;
        const res = await fetch(`${apiUrl}/banner-photos`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: reader.result as string, caption: file.name.replace(/\.[^.]+$/, '') }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Banner photo added!');
          loadBannerPhotos();
        }
      } catch { toast.error('Failed to upload photo'); }
      setBannerUploading(false);
    };
    reader.onerror = () => { toast.error('Failed to read file'); setBannerUploading(false); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const addBannerByUrl = async () => {
    if (!bannerUrlInput.trim()) { toast.error('Please enter an image URL'); return; }
    setBannerUploading(true);
    try {
      const authToken = isLocalBackend() ? getLocalToken() : apiKey;
      const res = await fetch(`${apiUrl}/banner-photos`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: bannerUrlInput.trim(), caption: bannerCaptionInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Banner photo added!');
        setBannerUrlInput('');
        setBannerCaptionInput('');
        loadBannerPhotos();
      }
    } catch { toast.error('Failed to add photo'); }
    setBannerUploading(false);
  };

  const deleteBannerPhoto = async (id: string) => {
    if (!confirm('Remove this banner photo?')) return;
    try {
      const authToken = isLocalBackend() ? getLocalToken() : apiKey;
      await fetch(`${apiUrl}/banner-photos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      toast.success('Photo removed');
      loadBannerPhotos();
    } catch { toast.error('Failed to delete'); }
  };

  const addGround = () => {
    const newGround = {
      id: `ground-${Date.now()}`,
      name: "",
      address: ""
    };
    setGrounds([...grounds, newGround]);
  };

  const updateGround = (id: string, field: "name" | "address", value: string) => {
    setGrounds(grounds.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const removeGround = (id: string) => {
    setGrounds(grounds.filter(g => g.id !== id));
  };

  const saveGrounds = async () => {
    // Validate at least one ground with a name
    const validGrounds = grounds.filter(g => g.name.trim() !== "");
    if (validGrounds.length === 0) {
      toast.error("Please add at least one ground with a name");
      return;
    }

    setSavingGrounds(true);
    try {
      // Use JWT token from localStorage for local backend, otherwise use apiKey
      const authToken = isLocalBackend() ? getLocalToken() : apiKey;
      
      if (!authToken) {
        toast.error("Please log in to save grounds");
        setSavingGrounds(false);
        return;
      }

      const response = await fetch(`${apiUrl}/admin/grounds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ grounds: validGrounds }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`${validGrounds.length} ground(s) saved successfully!`);
        setGrounds(validGrounds);
      } else {
        toast.error(data.error || "Failed to save grounds");
      }
    } catch (error) {
      console.error("Error saving grounds:", error);
      toast.error("Failed to save grounds");
    } finally {
      setSavingGrounds(false);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const authToken = isLocalBackend() ? getLocalToken() : apiKey;
      
      const response = await fetch(`${apiUrl}/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(settingsForm),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Settings saved successfully!");
      } else {
        toast.error(`Failed to save settings: ${data.error}`);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const addFixture = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const authToken = isLocalBackend() ? getLocalToken() : apiKey;
      const response = await fetch(`${apiUrl}/fixtures`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ ...fixtureForm, status: "scheduled" }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success("Fixture added successfully!");
        setFixtureForm({
          homeTeam: "",
          awayTeam: "",
          date: "",
          venue: "",
          competition: "",
        });
      } else {
        toast.error(`Failed to add fixture: ${data.error}`);
      }
    } catch (error) {
      console.error("Error adding fixture:", error);
      toast.error("Failed to add fixture");
    } finally {
      setLoading(false);
    }
  };

  const addTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const authToken = isLocalBackend() ? getLocalToken() : apiKey;
      const response = await fetch(`${apiUrl}/teams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(teamForm),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success("Team added successfully!");
        setTeamForm({ name: "", division: "", captain: "" });
      } else {
        toast.error(`Failed to add team: ${data.error}`);
      }
    } catch (error) {
      console.error("Error adding team:", error);
      toast.error("Failed to add team");
    } finally {
      setLoading(false);
    }
  };

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const authToken = isLocalBackend() ? getLocalToken() : apiKey;
      const response = await fetch(`${apiUrl}/players`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(playerForm),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success("Player added successfully!");
        setPlayerForm({
          name: "",
          role: "",
          battingStyle: "",
          bowlingStyle: "",
          team: "",
        });
      } else {
        toast.error(`Failed to add player: ${data.error}`);
      }
    } catch (error) {
      console.error("Error adding player:", error);
      toast.error("Failed to add player");
    } finally {
      setLoading(false);
    }
  };

  const addResult = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const authToken = isLocalBackend() ? getLocalToken() : apiKey;
      const response = await fetch(`${apiUrl}/results`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(resultForm),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success("Result added successfully!");
        setResultForm({
          homeTeam: "",
          awayTeam: "",
          homeScore: "",
          awayScore: "",
          winner: "",
          date: "",
          summary: "",
        });
      } else {
        toast.error(`Failed to add result: ${data.error}`);
      }
    } catch (error) {
      console.error("Error adding result:", error);
      toast.error("Failed to add result");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // Score Upload Functions
  // ============================================

  const fetchCricketLeinsterResults = async (page = 1) => {
    setClLoading(true);
    setClError('');
    try {
      const authToken = isLocalBackend() ? getLocalToken() : apiKey;
      const response = await fetch(
        `${apiUrl}/admin/cricket-leinster-results?year=${clYear}&month=${clMonth}&page=${page}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const data = await response.json();
      if (data.success) {
        setClMatches(data.data.matches);
        setClTotalPages(data.data.totalPages);
        setClCurrentPage(data.data.currentPage);
        setClSelectedIds(new Set());
        if (data.data.matches.length === 0) {
          setClError('No results found for the selected month. Cricket Leinster may not have data for this period.');
        }
      } else {
        setClError(data.error || 'Failed to fetch results');
      }
    } catch (error) {
      console.error("Error fetching Cricket Leinster results:", error);
      setClError('Failed to connect to server. Make sure the backend is running.');
    } finally {
      setClLoading(false);
    }
  };

  const importSelectedCLMatches = async () => {
    if (clSelectedIds.size === 0) {
      toast.error("Please select at least one match to import");
      return;
    }
    setClImporting(true);
    try {
      const authToken = isLocalBackend() ? getLocalToken() : apiKey;
      const selectedMatches = clMatches.filter((_, i) => clSelectedIds.has(i));
      const response = await fetch(`${apiUrl}/admin/import-results`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ matches: selectedMatches, source: 'cricket-leinster' }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`✅ Successfully imported ${data.data.length} match result(s) from Cricket Leinster!`);
        setClSelectedIds(new Set());
      } else {
        toast.error(`Failed to import: ${data.error}`);
      }
    } catch (error) {
      console.error("Error importing results:", error);
      toast.error("Failed to import results");
    } finally {
      setClImporting(false);
    }
  };

  const fetchCompletedLiveMatches = async () => {
    setLiveLoading(true);
    try {
      const authToken = isLocalBackend() ? getLocalToken() : apiKey;
      const response = await fetch(`${apiUrl}/admin/completed-live-matches`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await response.json();
      if (data.success) {
        setLiveMatches(data.data);
        setLiveSelectedIds(new Set());
      }
    } catch (error) {
      console.error("Error fetching live matches:", error);
      toast.error("Failed to fetch live scoring sessions");
    } finally {
      setLiveLoading(false);
    }
  };

  const importSelectedLiveMatches = async () => {
    if (liveSelectedIds.size === 0) {
      toast.error("Please select at least one match to import");
      return;
    }
    setLiveImporting(true);
    try {
      const authToken = isLocalBackend() ? getLocalToken() : apiKey;
      const selectedMatches = liveMatches
        .filter(m => liveSelectedIds.has(m.matchId))
        .map(m => ({
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          date: m.date,
          competition: m.competition,
          venue: m.venue,
          result: `${m.homeTeam} ${m.homeScore} vs ${m.awayTeam} ${m.awayScore}`,
          summary: `Scored live by ${m.scorerName}`,
        }));
      const response = await fetch(`${apiUrl}/admin/import-results`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ matches: selectedMatches, source: 'live-scoring' }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`✅ Successfully imported ${data.data.length} match result(s) from Live Scoring!`);
        setLiveSelectedIds(new Set());
      } else {
        toast.error(`Failed to import: ${data.error}`);
      }
    } catch (error) {
      console.error("Error importing live results:", error);
      toast.error("Failed to import live scoring results");
    } finally {
      setLiveImporting(false);
    }
  };

  const toggleCLSelect = (index: number) => {
    setClSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAllCL = () => {
    if (clSelectedIds.size === clMatches.length) {
      setClSelectedIds(new Set());
    } else {
      setClSelectedIds(new Set(clMatches.map((_, i) => i)));
    }
  };

  const toggleLiveSelect = (matchId: string) => {
    setLiveSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  };

  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-red-900">Administration</h2>
      
      {/* Quick Admin Actions */}
      <Card className="border-maroon-200 bg-maroon-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-maroon-900">
            <AlertTriangle className="size-5" />
            Quick Admin Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label>Grant Admin Rights to User</Label>
            <div className="flex gap-2">
              <Input
                placeholder="user@example.com"
                id="grant-admin-email"
                className="flex-1"
              />
              <Button
                onClick={async () => {
                  const emailInput = document.getElementById("grant-admin-email") as HTMLInputElement;
                  const email = emailInput?.value;
                  if (!email) {
                    toast.error("Please enter an email address");
                    return;
                  }
                  
                  try {
                    const response = await fetch(`${apiUrl}/admin/grant-admin-rights`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey}`,
                      },
                      body: JSON.stringify({ email }),
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                      toast.success(`✅ Admin rights granted to ${email}! User needs to log out and log back in.`);
                    } else {
                      toast.error(`Failed: ${data.error}`);
                    }
                  } catch (error) {
                    toast.error("Error granting admin rights");
                    console.error(error);
                  }
                }}
                className="bg-maroon-800 hover:bg-maroon-700"
              >
                Grant Admin Rights
              </Button>
            </div>
            <p className="text-sm text-maroon-600">
              ⚠️ This will immediately grant admin privileges to the specified email address. The user must log out and log back in to see the changes.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="fixtures" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="fixtures">Fixtures</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="score-upload" className="text-orange-700">
            <Trophy className="size-4 mr-1 hidden sm:inline" />
            Score Upload
          </TabsTrigger>
          <TabsTrigger value="banner">Banner</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="fixtures">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="size-5" />
                Add New Fixture
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addFixture} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="homeTeam">Home Team</Label>
                    <Input
                      id="homeTeam"
                      value={fixtureForm.homeTeam}
                      onChange={(e) => setFixtureForm({ ...fixtureForm, homeTeam: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="awayTeam">Away Team</Label>
                    <Input
                      id="awayTeam"
                      value={fixtureForm.awayTeam}
                      onChange={(e) => setFixtureForm({ ...fixtureForm, awayTeam: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={fixtureForm.date}
                      onChange={(e) => setFixtureForm({ ...fixtureForm, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="venue">Venue</Label>
                    <Input
                      id="venue"
                      value={fixtureForm.venue}
                      onChange={(e) => setFixtureForm({ ...fixtureForm, venue: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="competition">Competition</Label>
                  <Input
                    id="competition"
                    value={fixtureForm.competition}
                    onChange={(e) => setFixtureForm({ ...fixtureForm, competition: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="bg-red-900 hover:bg-red-800" disabled={loading}>
                  {loading ? "Adding..." : "Add Fixture"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="size-5" />
                Add New Team
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addTeam} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teamName">Team Name</Label>
                  <Input
                    id="teamName"
                    value={teamForm.name}
                    onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="division">Division</Label>
                    <Input
                      id="division"
                      value={teamForm.division}
                      onChange={(e) => setTeamForm({ ...teamForm, division: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="captain">Captain</Label>
                    <Input
                      id="captain"
                      value={teamForm.captain}
                      onChange={(e) => setTeamForm({ ...teamForm, captain: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="bg-red-900 hover:bg-red-800" disabled={loading}>
                  {loading ? "Adding..." : "Add Team"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="players">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="size-5" />
                Add New Player
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addPlayer} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="playerName">Player Name</Label>
                    <Input
                      id="playerName"
                      value={playerForm.name}
                      onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      placeholder="e.g., Batsman, Bowler, All-rounder"
                      value={playerForm.role}
                      onChange={(e) => setPlayerForm({ ...playerForm, role: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="battingStyle">Batting Style</Label>
                    <Input
                      id="battingStyle"
                      placeholder="e.g., Right-hand bat"
                      value={playerForm.battingStyle}
                      onChange={(e) => setPlayerForm({ ...playerForm, battingStyle: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bowlingStyle">Bowling Style</Label>
                    <Input
                      id="bowlingStyle"
                      placeholder="e.g., Right-arm fast"
                      value={playerForm.bowlingStyle}
                      onChange={(e) => setPlayerForm({ ...playerForm, bowlingStyle: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="playerTeam">Team</Label>
                  <Input
                    id="playerTeam"
                    value={playerForm.team}
                    onChange={(e) => setPlayerForm({ ...playerForm, team: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="bg-red-900 hover:bg-red-800" disabled={loading}>
                  {loading ? "Adding..." : "Add Player"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="size-5" />
                Add Match Result
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addResult} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="resultHomeTeam">Home Team</Label>
                    <Input
                      id="resultHomeTeam"
                      value={resultForm.homeTeam}
                      onChange={(e) => setResultForm({ ...resultForm, homeTeam: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resultAwayTeam">Away Team</Label>
                    <Input
                      id="resultAwayTeam"
                      value={resultForm.awayTeam}
                      onChange={(e) => setResultForm({ ...resultForm, awayTeam: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="homeScore">Home Score</Label>
                    <Input
                      id="homeScore"
                      placeholder="e.g., 250/8"
                      value={resultForm.homeScore}
                      onChange={(e) => setResultForm({ ...resultForm, homeScore: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="awayScore">Away Score</Label>
                    <Input
                      id="awayScore"
                      placeholder="e.g., 230/10"
                      value={resultForm.awayScore}
                      onChange={(e) => setResultForm({ ...resultForm, awayScore: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="winner">Winner</Label>
                    <Input
                      id="winner"
                      value={resultForm.winner}
                      onChange={(e) => setResultForm({ ...resultForm, winner: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resultDate">Match Date</Label>
                    <Input
                      id="resultDate"
                      type="date"
                      value={resultForm.date}
                      onChange={(e) => setResultForm({ ...resultForm, date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="summary">Match Summary</Label>
                  <Input
                    id="summary"
                    placeholder="e.g., Home team won by 20 runs"
                    value={resultForm.summary}
                    onChange={(e) => setResultForm({ ...resultForm, summary: e.target.value })}
                  />
                </div>
                <Button type="submit" className="bg-red-900 hover:bg-red-800" disabled={loading}>
                  {loading ? "Adding..." : "Add Result"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================ */}
        {/* Score Upload Tab */}
        {/* ============================================ */}
        <TabsContent value="score-upload">
          <div className="space-y-6">
            {/* Info Banner */}
            <Card className="border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Trophy className="size-6 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-orange-900 text-lg">Score Upload</h3>
                    <p className="text-sm text-orange-800 mt-1">
                      Import match scores automatically from <strong>Cricket Leinster</strong> website or from <strong>Live Scoring</strong> sessions. 
                      No more manual data entry — just select the matches and import!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cricket Leinster Enable/Disable Toggle */}
            <Card className={`border-2 transition-colors ${clEnabled ? 'border-green-300 bg-green-50/30' : 'border-gray-200 bg-gray-50/30'}`}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Globe className={`size-5 ${clEnabled ? 'text-green-600' : 'text-gray-400'}`} />
                    <div>
                      <h4 className="font-semibold text-gray-900">Cricket Leinster Integration</h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {clEnabled ? 'Enabled — Fetching match results from Cricket Leinster is active' : 'Disabled — Enable to fetch Adamstown match results from Cricket Leinster website'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={toggleCLEnabled}
                    disabled={clEnabledLoading}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      clEnabled ? 'bg-green-500 focus:ring-green-500' : 'bg-gray-300 focus:ring-gray-400'
                    } ${clEnabledLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    role="switch"
                    aria-checked={clEnabled}
                    aria-label="Toggle Cricket Leinster integration"
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                      clEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Source Toggle */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
              <button
                onClick={() => setScoreUploadTab('cricket-leinster')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                  scoreUploadTab === 'cricket-leinster'
                    ? 'bg-white text-orange-700 shadow-sm border border-orange-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Globe className="size-4" />
                Cricket Leinster
                {!clEnabled && <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">OFF</span>}
              </button>
              <button
                onClick={() => { setScoreUploadTab('live-scoring'); fetchCompletedLiveMatches(); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                  scoreUploadTab === 'live-scoring'
                    ? 'bg-white text-orange-700 shadow-sm border border-orange-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Radio className="size-4" />
                Live Scoring
              </button>
            </div>

            {/* ---- Cricket Leinster Source ---- */}
            {scoreUploadTab === 'cricket-leinster' && !clEnabled && (
              <Card className="border-gray-200">
                <CardContent className="py-12">
                  <div className="text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <Globe className="size-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Cricket Leinster Integration is Disabled</h3>
                    <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                      Turn on the toggle above to enable fetching match results from the Cricket Leinster website.
                      Your cricket club website will continue to run normally without this integration.
                    </p>
                    <Button
                      onClick={toggleCLEnabled}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Globe className="size-4 mr-2" />
                      Enable Cricket Leinster Integration
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {scoreUploadTab === 'cricket-leinster' && clEnabled && (
              <Card>
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Globe className="size-5 text-blue-600" />
                    Fetch from Cricket Leinster
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {/* Filters */}
                  <div className="flex flex-wrap gap-3 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Year</Label>
                      <select
                        value={clYear}
                        onChange={(e) => setClYear(parseInt(e.target.value))}
                        className="h-10 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {[2024, 2025, 2026, 2027].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Month</Label>
                      <select
                        value={clMonth}
                        onChange={(e) => setClMonth(parseInt(e.target.value))}
                        className="h-10 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {monthNames.slice(1).map((name, i) => (
                          <option key={i + 1} value={i + 1}>{name}</option>
                        ))}
                      </select>
                    </div>
                    <Button
                      onClick={() => fetchCricketLeinsterResults(1)}
                      disabled={clLoading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {clLoading ? (
                        <><Loader2 className="size-4 mr-2 animate-spin" />Fetching...</>
                      ) : (
                        <><RefreshCw className="size-4 mr-2" />Fetch Results</>
                      )}
                    </Button>
                    <a
                      href={`https://www.cricketleinster.ie/match-centre/results?category=&competition=&club=DKJRPSNXOM&team=&venue=&year=${clYear}&month=${clMonth}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
                    >
                      <ExternalLink className="size-3" />
                      View on Cricket Leinster
                    </a>
                  </div>

                  {/* Error */}
                  {clError && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                      ⚠️ {clError}
                    </div>
                  )}

                  {/* Results Table */}
                  {clMatches.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          Found <strong>{clMatches.length}</strong> Adamstown match(es) for {monthNames[clMonth]} {clYear}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={toggleAllCL}>
                            {clSelectedIds.size === clMatches.length ? 'Deselect All' : 'Select All'}
                          </Button>
                          <span className="text-xs text-gray-500">
                            {clSelectedIds.size} selected
                          </span>
                        </div>
                      </div>

                      <div className="border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-left">
                              <tr>
                                <th className="p-3 w-10">
                                  <input
                                    type="checkbox"
                                    checked={clSelectedIds.size === clMatches.length && clMatches.length > 0}
                                    onChange={toggleAllCL}
                                    className="rounded border-gray-300"
                                  />
                                </th>
                                <th className="p-3">Date</th>
                                <th className="p-3">Competition</th>
                                <th className="p-3">Home Team</th>
                                <th className="p-3 text-center">Score</th>
                                <th className="p-3">Away Team</th>
                                <th className="p-3 text-center">Score</th>
                                <th className="p-3">Result</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {clMatches.map((match, index) => {
                                const isAdamstownHome = match.homeTeam.toLowerCase().includes('adamstown');
                                const isAdamstownAway = match.awayTeam.toLowerCase().includes('adamstown');
                                const isWin = match.result.toLowerCase().includes('adamstown') && 
                                  (match.result.toLowerCase().includes('won') || match.result.toLowerCase().includes('win'));
                                const isLoss = !isWin && match.result.toLowerCase().includes('won');

                                return (
                                  <tr
                                    key={index}
                                    className={`hover:bg-blue-50 cursor-pointer transition-colors ${
                                      clSelectedIds.has(index) ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                                    }`}
                                    onClick={() => toggleCLSelect(index)}
                                  >
                                    <td className="p-3">
                                      <input
                                        type="checkbox"
                                        checked={clSelectedIds.has(index)}
                                        onChange={() => toggleCLSelect(index)}
                                        className="rounded border-gray-300"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </td>
                                    <td className="p-3 text-xs whitespace-nowrap">{match.date}</td>
                                    <td className="p-3">
                                      <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">
                                        {match.competition}
                                      </span>
                                    </td>
                                    <td className={`p-3 font-medium ${isAdamstownHome ? 'text-red-800' : ''}`}>
                                      {match.homeTeam}
                                    </td>
                                    <td className="p-3 text-center font-mono text-sm font-bold">
                                      {match.homeScore || '—'}
                                    </td>
                                    <td className={`p-3 font-medium ${isAdamstownAway ? 'text-red-800' : ''}`}>
                                      {match.awayTeam}
                                    </td>
                                    <td className="p-3 text-center font-mono text-sm font-bold">
                                      {match.awayScore || '—'}
                                    </td>
                                    <td className="p-3">
                                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                        isWin ? 'bg-green-100 text-green-800' :
                                        isLoss ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-700'
                                      }`}>
                                        {match.result}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Pagination */}
                      {clTotalPages > 1 && (
                        <div className="flex justify-center gap-2">
                          {Array.from({ length: clTotalPages }, (_, i) => i + 1).map(page => (
                            <Button
                              key={page}
                              variant={page === clCurrentPage ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => fetchCricketLeinsterResults(page)}
                              disabled={clLoading}
                            >
                              {page}
                            </Button>
                          ))}
                        </div>
                      )}

                      {/* Import Button */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <p className="text-sm text-gray-500">
                          Selected matches will be imported as results and appear on the Results page.
                        </p>
                        <Button
                          onClick={importSelectedCLMatches}
                          disabled={clImporting || clSelectedIds.size === 0}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {clImporting ? (
                            <><Loader2 className="size-4 mr-2 animate-spin" />Importing...</>
                          ) : (
                            <><Download className="size-4 mr-2" />Import {clSelectedIds.size} Match{clSelectedIds.size !== 1 ? 'es' : ''}</>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Empty state when no search yet */}
                  {!clLoading && clMatches.length === 0 && !clError && (
                    <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      <Globe className="size-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">Select a month and year, then click "Fetch Results"</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Results for Adamstown CC will be fetched from Cricket Leinster
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ---- Live Scoring Source ---- */}
            {scoreUploadTab === 'live-scoring' && (
              <Card>
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                  <CardTitle className="flex items-center gap-2 text-green-900">
                    <Radio className="size-5 text-green-600" />
                    Import from Live Scoring Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Import scores from completed or active live scoring sessions.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchCompletedLiveMatches}
                      disabled={liveLoading}
                    >
                      {liveLoading ? (
                        <><Loader2 className="size-4 mr-1 animate-spin" />Loading...</>
                      ) : (
                        <><RefreshCw className="size-4 mr-1" />Refresh</>
                      )}
                    </Button>
                  </div>

                  {liveLoading ? (
                    <div className="text-center py-10">
                      <Loader2 className="size-8 animate-spin text-green-500 mx-auto mb-2" />
                      <p className="text-gray-500">Loading live scoring sessions...</p>
                    </div>
                  ) : liveMatches.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      <Radio className="size-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">No live scoring sessions found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Start a live scoring session from the Live Scoring page first
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-left">
                              <tr>
                                <th className="p-3 w-10">
                                  <input
                                    type="checkbox"
                                    checked={liveSelectedIds.size === liveMatches.length && liveMatches.length > 0}
                                    onChange={() => {
                                      if (liveSelectedIds.size === liveMatches.length) {
                                        setLiveSelectedIds(new Set());
                                      } else {
                                        setLiveSelectedIds(new Set(liveMatches.map(m => m.matchId)));
                                      }
                                    }}
                                    className="rounded border-gray-300"
                                  />
                                </th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Home Team</th>
                                <th className="p-3 text-center">Score</th>
                                <th className="p-3 text-center">vs</th>
                                <th className="p-3">Away Team</th>
                                <th className="p-3 text-center">Score</th>
                                <th className="p-3">Scorer</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {liveMatches.map(match => (
                                <tr
                                  key={match.matchId}
                                  className={`hover:bg-green-50 cursor-pointer transition-colors ${
                                    liveSelectedIds.has(match.matchId) ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                                  }`}
                                  onClick={() => toggleLiveSelect(match.matchId)}
                                >
                                  <td className="p-3">
                                    <input
                                      type="checkbox"
                                      checked={liveSelectedIds.has(match.matchId)}
                                      onChange={() => toggleLiveSelect(match.matchId)}
                                      className="rounded border-gray-300"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </td>
                                  <td className="p-3">
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                      match.status === 'completed'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-orange-100 text-orange-800 animate-pulse'
                                    }`}>
                                      {match.status === 'completed' ? '✅ Complete' : '🔴 Live'}
                                    </span>
                                  </td>
                                  <td className="p-3 font-medium">{match.homeTeam}</td>
                                  <td className="p-3 text-center font-mono font-bold">{match.homeScore}</td>
                                  <td className="p-3 text-center text-gray-400">vs</td>
                                  <td className="p-3 font-medium">{match.awayTeam}</td>
                                  <td className="p-3 text-center font-mono font-bold">{match.awayScore}</td>
                                  <td className="p-3 text-xs text-gray-500">{match.scorerName}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Import Button */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <p className="text-sm text-gray-500">
                          {liveSelectedIds.size} match(es) selected for import
                        </p>
                        <Button
                          onClick={importSelectedLiveMatches}
                          disabled={liveImporting || liveSelectedIds.size === 0}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {liveImporting ? (
                            <><Loader2 className="size-4 mr-2 animate-spin" />Importing...</>
                          ) : (
                            <><Download className="size-4 mr-2" />Import {liveSelectedIds.size} Match{liveSelectedIds.size !== 1 ? 'es' : ''}</>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="banner">
          <div className="space-y-6">
            {/* Banner Photos Management */}
            <Card className="border-purple-300">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
                <CardTitle className="flex items-center gap-2">
                  <Image className="size-5 text-purple-600" />
                  Home Page Banner Photos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg mb-4">
                  <h4 className="font-semibold text-purple-900 mb-2">📷 Banner Photo Slideshow</h4>
                  <p className="text-sm text-purple-800">
                    Upload photos of your cricket grounds, match days, or club events. These will appear as a 
                    rotating slideshow in the home page hero banner. Recommended: landscape images at least 1600×700px.
                  </p>
                </div>

                {/* Upload section */}
                <div className="bg-white border-2 border-dashed border-purple-300 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Upload className="size-4 text-purple-600" />
                    Add New Banner Photo
                  </h4>

                  {/* File upload */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <input
                      ref={bannerFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleBannerFileUpload}
                    />
                    <Button
                      variant="outline"
                      className="border-purple-300 text-purple-700 hover:bg-purple-50"
                      onClick={() => bannerFileRef.current?.click()}
                      disabled={bannerUploading}
                    >
                      <Upload className="size-4 mr-2" />
                      {bannerUploading ? 'Uploading...' : 'Upload from Device'}
                    </Button>
                    <span className="text-xs text-gray-400 self-center">Max 5MB · JPG, PNG, WebP</span>
                  </div>

                  {/* URL input */}
                  <div className="flex items-center gap-2 text-xs text-gray-400 my-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span>or add by URL</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Image URL</Label>
                      <Input
                        placeholder="https://example.com/cricket-ground.jpg"
                        value={bannerUrlInput}
                        onChange={e => setBannerUrlInput(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Caption (optional)</Label>
                      <Input
                        placeholder="e.g., Airlie Park on match day"
                        value={bannerCaptionInput}
                        onChange={e => setBannerCaptionInput(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={addBannerByUrl}
                      disabled={bannerUploading || !bannerUrlInput.trim()}
                      className="bg-purple-600 hover:bg-purple-700 self-end"
                    >
                      <Plus className="size-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>

                {/* Current photos */}
                {loadingBannerPhotos ? (
                  <div className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-gray-500">Loading photos...</p>
                  </div>
                ) : bannerPhotos.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <Image className="size-10 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 font-medium">No banner photos yet</p>
                    <p className="text-sm text-gray-400">Upload your first photo above — cricket ground photos work great!</p>
                  </div>
                ) : (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      🖼️ Current Banner Photos ({bannerPhotos.length})
                    </h4>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {bannerPhotos.map((photo, index) => (
                        <div key={photo.id} className="group relative rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow bg-white">
                          <div className="aspect-video bg-gray-100">
                            <img
                              src={photo.url}
                              alt={photo.caption || 'Banner photo'}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).src = ''; (e.target as HTMLImageElement).className = 'hidden'; }}
                            />
                          </div>
                          <div className="p-3 flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-medium text-purple-600 bg-purple-50 rounded-full px-2 py-0.5">Slide {index + 1}</span>
                              {photo.caption && (
                                <p className="text-sm text-gray-600 truncate mt-1">📷 {photo.caption}</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              onClick={() => deleteBannerPhoto(photo.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tips */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Tips:</strong> Use landscape photos (wider than tall) for best results. 
                    Cricket ground panoramas, match action shots, and team celebrations look great. 
                    Photos auto-rotate every 5 seconds on the home page.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-6">
            {/* Ground Configuration */}
            <Card className="border-green-300">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="size-5 text-green-600" />
                  Home Grounds Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                  <h4 className="font-semibold text-green-900 mb-2">🏟️ Club Home Grounds</h4>
                  <p className="text-sm text-green-800">
                    Configure your club's home grounds for this season. These will be automatically available 
                    in the <strong>Fixture Generator</strong> - no need to enter them again!
                  </p>
                </div>

                {loadingGrounds ? (
                  <div className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-gray-500">Loading grounds...</p>
                  </div>
                ) : (
                  <>
                    {/* Ground List */}
                    <div className="space-y-3">
                      {grounds.length === 0 ? (
                        <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                          <MapPin className="size-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-gray-500">No grounds configured yet</p>
                          <p className="text-sm text-gray-400">Click "Add Ground" to get started</p>
                        </div>
                      ) : (
                        grounds.map((ground, index) => (
                          <div key={ground.id} className="p-4 bg-white border rounded-lg shadow-sm">
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <span className="text-green-700 font-semibold text-sm">{index + 1}</span>
                              </div>
                              <div className="flex-1 grid md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs text-gray-500">Ground Name *</Label>
                                  <Input
                                    placeholder="e.g., Adamstown Main Pitch"
                                    value={ground.name}
                                    onChange={(e) => updateGround(ground.id, "name", e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-gray-500">Address / Location</Label>
                                  <Input
                                    placeholder="e.g., Adamstown, Dublin 24"
                                    value={ground.address}
                                    onChange={(e) => updateGround(ground.id, "address", e.target.value)}
                                  />
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => removeGround(ground.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Ground Button */}
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={addGround}
                        className="border-green-300 text-green-700 hover:bg-green-50"
                      >
                        <Plus className="size-4 mr-2" />
                        Add Ground
                      </Button>
                      <Button
                        onClick={saveGrounds}
                        disabled={savingGrounds || grounds.length === 0}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Save className="size-4 mr-2" />
                        {savingGrounds ? "Saving..." : `Save ${grounds.length} Ground${grounds.length !== 1 ? 's' : ''}`}
                      </Button>
                    </div>

                    {/* Info Box */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>💡 Tip:</strong> These grounds will automatically appear in the Fixture Generator 
                        page, so fixture secretaries don't need to enter them manually each time.
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Email Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="size-5" />
                  Email Service Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                  <h4 className="font-semibold text-blue-900 mb-2">📧 Enable Email Notifications</h4>
                  <p className="text-sm text-blue-800">
                    Configure email service (Resend, SendGrid, etc.) to send automatic notifications when coaches update their training availability.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emailApiKey">Email API Key *</Label>
                    <Input
                      id="emailApiKey"
                      type="password"
                      placeholder="Enter your email service API key"
                      value={settingsForm.emailApiKey}
                      onChange={(e) => setSettingsForm({ ...settingsForm, emailApiKey: e.target.value })}
                    />
                    <p className="text-xs text-gray-500">Get this from your email service provider (e.g., Resend)</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emailServiceUrl">Email Service URL</Label>
                    <Input
                      id="emailServiceUrl"
                      placeholder="https://api.resend.com/emails"
                      value={settingsForm.emailServiceUrl}
                      onChange={(e) => setSettingsForm({ ...settingsForm, emailServiceUrl: e.target.value })}
                    />
                    <p className="text-xs text-gray-500">Default: https://api.resend.com/emails</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fromEmail">From Email Address *</Label>
                    <Input
                      id="fromEmail"
                      type="email"
                      placeholder="noreply@adamstowncc.ie"
                      value={settingsForm.fromEmail}
                      onChange={(e) => setSettingsForm({ ...settingsForm, fromEmail: e.target.value })}
                    />
                    <p className="text-xs text-gray-500">Must be verified with your email service</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appUrl">Website URL *</Label>
                    <Input
                      id="appUrl"
                      type="url"
                      placeholder="https://adamstowncc.ie"
                      value={settingsForm.appUrl}
                      onChange={(e) => setSettingsForm({ ...settingsForm, appUrl: e.target.value })}
                    />
                    <p className="text-xs text-gray-500">Used in email links to your site</p>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-semibold text-yellow-900 mb-2">Recommended: Resend</h4>
                  <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                    <li>Sign up at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline">resend.com</a></li>
                    <li>Verify your domain or use their test domain</li>
                    <li>Get your API key from the dashboard</li>
                    <li>Enter the details above and save</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* WhatsApp Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="size-5 text-green-600" />
                  WhatsApp Contact Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                  <h4 className="font-semibold text-green-900 mb-2">💬 WhatsApp Contact Button</h4>
                  <p className="text-sm text-green-800">
                    Add a floating WhatsApp button on your website for members to contact you quickly. Enter your contact number below.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsappContactNumber">WhatsApp Contact Number *</Label>
                  <Input
                    id="whatsappContactNumber"
                    type="tel"
                    placeholder="+353 85 142 4525"
                    value={settingsForm.whatsappContactNumber}
                    onChange={(e) => setSettingsForm({ ...settingsForm, whatsappContactNumber: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">
                    Include country code (e.g., +353 for Ireland). This will be the default contact number for the club.
                  </p>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">How it works:</h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>A green WhatsApp button will appear in the bottom-right corner of your website</li>
                    <li>Members can click it to instantly message your club on WhatsApp</li>
                    <li>Pre-filled message will be sent to make it easier for members</li>
                    <li>Great for quick support and member engagement!</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <Card>
              <CardContent className="pt-6">
                <Button 
                  onClick={saveSettings} 
                  className="w-full bg-red-900 hover:bg-red-800 text-lg py-6" 
                  disabled={savingSettings}
                >
                  <Save className="size-5 mr-2" />
                  {savingSettings ? "Saving Settings..." : "Save All Settings"}
                </Button>
                <p className="text-sm text-gray-500 text-center mt-3">
                  These settings will be applied immediately across the website
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}