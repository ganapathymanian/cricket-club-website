import { useState, useEffect, useRef } from "react";
import { Calendar, Plus, Edit, Trash2, RefreshCw, Upload, FileSpreadsheet, Wand2, PenLine, Filter, Trophy, Clock, MapPin, Users, Download, AlertTriangle, CheckCircle2, X, ChevronDown, Search, Settings, Save, LayoutGrid, Table2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { toast } from "sonner";
import { Separator } from "./ui/separator";

interface ManageFixturesPageProps {
  apiUrl: string;
  apiKey: string;
}

interface Fixture {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time?: string;
  venue: string;
  competition: string;
  matchType: string;
  matchCategory: string;
  overs?: string;
  status: string;
}

// Match type definitions with Cricket Leinster competitions
const MATCH_TYPES = [
  { value: "league", label: "League", color: "bg-blue-600", description: "Cricket Leinster League matches" },
  { value: "t20", label: "T20", color: "bg-purple-600", description: "T20 format matches" },
  { value: "cup", label: "Cup", color: "bg-amber-600", description: "Cup competition matches" },
  { value: "friendly", label: "Friendly", color: "bg-green-600", description: "Friendly/exhibition matches" },
  { value: "internal", label: "Internal", color: "bg-gray-600", description: "Internal club matches & practice games" },
  { value: "youth", label: "Youth", color: "bg-teal-600", description: "Youth age-group matches" },
];

const DEFAULT_YOUTH_TEAMS = [
  "Under 7", "Under 9", "Under 11", "Under 13", "Under 15", "Under 17", "Under 19",
];

const MATCH_CATEGORIES: Record<string, { value: string; label: string }[]> = {
  league: [
    { value: "cl-division-1", label: "Cricket Leinster - Division 1" },
    { value: "cl-division-2", label: "Cricket Leinster - Division 2" },
    { value: "cl-division-3", label: "Cricket Leinster - Division 3" },
    { value: "cl-division-4", label: "Cricket Leinster - Division 4" },
    { value: "cl-division-5", label: "Cricket Leinster - Division 5" },
    { value: "cl-division-6", label: "Cricket Leinster - Division 6" },
    { value: "cl-division-7", label: "Cricket Leinster - Division 7" },
    { value: "cl-division-8", label: "Cricket Leinster - Division 8" },
    { value: "cl-division-9", label: "Cricket Leinster - Division 9" },
    { value: "cl-junior-league", label: "Cricket Leinster - Junior League" },
    { value: "cl-minor-league", label: "Cricket Leinster - Minor League" },
    { value: "other-league", label: "Other League" },
  ],
  t20: [
    { value: "cl-t20-cup", label: "Cricket Leinster - T20 Cup" },
    { value: "cl-t20-league", label: "Cricket Leinster - T20 League" },
    { value: "club-t20", label: "Club T20 Tournament" },
    { value: "inter-club-t20", label: "Inter-Club T20" },
    { value: "other-t20", label: "Other T20" },
  ],
  cup: [
    { value: "cl-senior-cup", label: "Cricket Leinster - Senior Cup" },
    { value: "cl-intermediate-cup", label: "Cricket Leinster - Intermediate Cup" },
    { value: "cl-junior-cup", label: "Cricket Leinster - Junior Cup" },
    { value: "cl-minor-cup", label: "Cricket Leinster - Minor Cup" },
    { value: "cl-whelan-cup", label: "Cricket Leinster - Whelan Cup" },
    { value: "cl-tillain-cup", label: "Cricket Leinster - Tillain Cup" },
    { value: "other-cup", label: "Other Cup" },
  ],
  friendly: [
    { value: "pre-season-friendly", label: "Pre-Season Friendly" },
    { value: "mid-season-friendly", label: "Mid-Season Friendly" },
    { value: "end-season-friendly", label: "End of Season Friendly" },
    { value: "touring-team", label: "vs Touring Team" },
    { value: "charity-match", label: "Charity Match" },
    { value: "other-friendly", label: "Other Friendly" },
  ],
  internal: [
    { value: "practice-match", label: "Practice Match" },
    { value: "trial-match", label: "Trial / Selection Match" },
    { value: "inter-squad", label: "Inter-Squad Game" },
    { value: "coaching-match", label: "Coaching Match" },
    { value: "juniors-internal", label: "Juniors Internal" },
    { value: "other-internal", label: "Other Internal" },
  ],
  youth: [
    { value: "youth-league", label: "Youth League" },
    { value: "youth-cup", label: "Youth Cup" },
    { value: "youth-t20", label: "Youth T20" },
    { value: "youth-friendly", label: "Youth Friendly" },
    { value: "youth-festival", label: "Youth Festival / Tournament" },
    { value: "youth-inter-provincial", label: "Inter-Provincial Youth" },
    { value: "youth-coaching", label: "Youth Coaching Match" },
    { value: "other-youth", label: "Other Youth" },
  ],
};

const OVERS_OPTIONS = [
  { value: "10", label: "10 Overs" },
  { value: "15", label: "15 Overs" },
  { value: "20", label: "20 Overs (T20)" },
  { value: "25", label: "25 Overs" },
  { value: "30", label: "30 Overs" },
  { value: "35", label: "35 Overs" },
  { value: "40", label: "40 Overs" },
  { value: "45", label: "45 Overs" },
  { value: "50", label: "50 Overs (ODI)" },
  { value: "unlimited", label: "Unlimited (Timed)" },
];

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "postponed", label: "Postponed" },
  { value: "abandoned", label: "Abandoned" },
];

interface ImportedRow {
  [key: string]: string;
}

interface ColumnMapping {
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  venue: string;
  competition: string;
  matchType: string;
  matchCategory: string;
  overs: string;
  status: string;
}

export function ManageFixturesPage({ apiUrl, apiKey }: ManageFixturesPageProps) {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingFixture, setEditingFixture] = useState<Fixture | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all-fixtures");
  const [filterType, setFilterType] = useState("all");
  const [filterTeam, setFilterTeam] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  // Youth team management
  const [youthTeams, setYouthTeams] = useState<string[]>(DEFAULT_YOUTH_TEAMS);
  const [youthTeamDialogOpen, setYouthTeamDialogOpen] = useState(false);
  const [editableYouthTeams, setEditableYouthTeams] = useState<string[]>(DEFAULT_YOUTH_TEAMS);
  const [newYouthTeam, setNewYouthTeam] = useState("");

  // Import state
  const [importedData, setImportedData] = useState<ImportedRow[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    homeTeam: "", awayTeam: "", date: "", time: "", venue: "",
    competition: "", matchType: "", matchCategory: "", overs: "", status: "",
  });
  const [importStep, setImportStep] = useState<"upload" | "map" | "preview" | "done">("upload");
  const [importPreview, setImportPreview] = useState<Fixture[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fixtureForm, setFixtureForm] = useState({
    homeTeam: "",
    awayTeam: "",
    date: "",
    time: "",
    venue: "",
    competition: "",
    matchType: "league",
    matchCategory: "",
    overs: "50",
    status: "scheduled",
  });

  useEffect(() => {
    fetchFixtures();
    fetchYouthTeams();
  }, []);

  // Auto-set overs when match type changes
  useEffect(() => {
    if (fixtureForm.matchType === "t20") {
      setFixtureForm(prev => ({ ...prev, overs: "20" }));
    } else if (fixtureForm.matchType === "league") {
      setFixtureForm(prev => ({ ...prev, overs: "50" }));
    } else if (fixtureForm.matchType === "youth") {
      setFixtureForm(prev => ({ ...prev, overs: "20" }));
    }
  }, [fixtureForm.matchType]);

  // Reset team filter when type filter changes
  useEffect(() => {
    setFilterTeam("all");
  }, [filterType]);

  const fetchFixtures = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/fixtures`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await response.json();
      if (data.success) {
        setFixtures(data.data);
      } else {
        toast.error("Failed to fetch fixtures");
      }
    } catch (error) {
      console.error("Error fetching fixtures:", error);
      toast.error("Failed to fetch fixtures");
    } finally {
      setLoading(false);
    }
  };

  const fetchYouthTeams = async () => {
    try {
      const response = await fetch(`${apiUrl}/youth-teams`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await response.json();
      if (data.success && data.data?.length > 0) {
        setYouthTeams(data.data);
        setEditableYouthTeams(data.data);
      }
    } catch (error) {
      // Use defaults if endpoint not available
      console.log("Using default youth teams");
    }
  };

  const saveYouthTeams = async () => {
    const cleanTeams = editableYouthTeams.filter(t => t.trim() !== "");
    try {
      const response = await fetch(`${apiUrl}/youth-teams`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ teams: cleanTeams }),
      });
      const data = await response.json();
      if (data.success) {
        setYouthTeams(cleanTeams);
        setYouthTeamDialogOpen(false);
        toast.success("Youth team names updated!");
      } else {
        toast.error("Failed to save youth teams");
      }
    } catch (error) {
      // Save locally even if server fails
      setYouthTeams(cleanTeams);
      setYouthTeamDialogOpen(false);
      toast.success("Youth team names updated locally");
    }
  };

  const addFixture = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const competition = fixtureForm.competition || getCategoryLabel(fixtureForm.matchType, fixtureForm.matchCategory);
      const response = await fetch(`${apiUrl}/fixtures`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ ...fixtureForm, competition, status: fixtureForm.status || "scheduled" }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Fixture added successfully!");
        resetForm();
        fetchFixtures();
      } else {
        toast.error(`Failed to add fixture: ${data.error}`);
      }
    } catch (error) {
      console.error("Error adding fixture:", error);
      toast.error("Failed to add fixture");
    } finally {
      setSubmitting(false);
    }
  };

  const updateFixture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFixture) return;
    setSubmitting(true);
    try {
      const competition = fixtureForm.competition || getCategoryLabel(fixtureForm.matchType, fixtureForm.matchCategory);
      const response = await fetch(`${apiUrl}/fixtures/${editingFixture.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ ...fixtureForm, competition }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Fixture updated successfully!");
        setEditingFixture(null);
        resetForm();
        setDialogOpen(false);
        fetchFixtures();
      } else {
        toast.error(`Failed to update fixture: ${data.error}`);
      }
    } catch (error) {
      console.error("Error updating fixture:", error);
      toast.error("Failed to update fixture");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteFixture = async (fixtureId: string) => {
    if (!confirm("Are you sure you want to delete this fixture?")) return;
    try {
      const response = await fetch(`${apiUrl}/fixtures/${fixtureId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Fixture deleted successfully!");
        fetchFixtures();
      } else {
        toast.error(`Failed to delete fixture: ${data.error}`);
      }
    } catch (error) {
      console.error("Error deleting fixture:", error);
      toast.error("Failed to delete fixture");
    }
  };

  const resetForm = () => {
    setFixtureForm({
      homeTeam: "", awayTeam: "", date: "", time: "", venue: "",
      competition: "", matchType: "league", matchCategory: "", overs: "50", status: "scheduled",
    });
  };

  const openEditDialog = (fixture: Fixture) => {
    setEditingFixture(fixture);
    setFixtureForm({
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      date: fixture.date,
      time: fixture.time || "",
      venue: fixture.venue,
      competition: fixture.competition,
      matchType: fixture.matchType || "league",
      matchCategory: fixture.matchCategory || "",
      overs: fixture.overs || "50",
      status: fixture.status || "scheduled",
    });
    setDialogOpen(true);
  };

  const getCategoryLabel = (type: string, category: string): string => {
    const categories = MATCH_CATEGORIES[type] || [];
    const found = categories.find(c => c.value === category);
    return found?.label || category || "";
  };

  const getMatchTypeInfo = (type: string) => {
    return MATCH_TYPES.find(t => t.value === type) || MATCH_TYPES[0];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IE", {
      weekday: "short", year: "numeric", month: "long", day: "numeric",
    });
  };

  // Extract teams for filtering
  const getTeamsForType = (type: string): string[] => {
    const relevantFixtures = type === "all"
      ? fixtures
      : fixtures.filter(f => f.matchType === type);
    const teamSet = new Set<string>();
    relevantFixtures.forEach(f => {
      if (f.homeTeam) teamSet.add(f.homeTeam);
      if (f.awayTeam) teamSet.add(f.awayTeam);
    });
    // For youth, also include registered youth team names
    if (type === "youth") {
      youthTeams.forEach(t => teamSet.add(t));
    }
    return Array.from(teamSet).sort();
  };

  const teamsForFilter = getTeamsForType(filterType);

  // ===== CSV/Excel Import Functions =====
  const parseCSV = (text: string): { headers: string[]; rows: ImportedRow[] } => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]);
    const rows: ImportedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      if (values.length > 0 && values.some(v => v.trim())) {
        const row: ImportedRow = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });
        rows.push(row);
      }
    }
    return { headers, rows };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".csv") && !fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      toast.error("Please upload a CSV or Excel file (.csv, .xlsx, .xls)");
      return;
    }

    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      toast.info("For Excel files, please save as CSV first. CSV import is fully supported.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const { headers, rows } = parseCSV(text);
        if (headers.length === 0 || rows.length === 0) {
          toast.error("No data found in the file");
          return;
        }
        setImportHeaders(headers);
        setImportedData(rows);

        // Auto-map columns
        const autoMapping: ColumnMapping = {
          homeTeam: "", awayTeam: "", date: "", time: "", venue: "",
          competition: "", matchType: "", matchCategory: "", overs: "", status: "",
        };
        headers.forEach(header => {
          const h = header.toLowerCase().replace(/[_\s-]/g, "");
          if (h.includes("home") && (h.includes("team") || h.includes("side"))) autoMapping.homeTeam = header;
          else if (h.includes("away") && (h.includes("team") || h.includes("side"))) autoMapping.awayTeam = header;
          else if (h === "date" || h.includes("matchdate") || h.includes("fixturedate")) autoMapping.date = header;
          else if (h === "time" || h.includes("matchtime") || h.includes("starttime")) autoMapping.time = header;
          else if (h.includes("venue") || h.includes("ground") || h.includes("location")) autoMapping.venue = header;
          else if (h.includes("competition") || h.includes("league") || h.includes("division")) autoMapping.competition = header;
          else if (h.includes("matchtype") || h.includes("type") || h.includes("format")) autoMapping.matchType = header;
          else if (h.includes("category")) autoMapping.matchCategory = header;
          else if (h.includes("overs")) autoMapping.overs = header;
          else if (h.includes("status")) autoMapping.status = header;
        });
        setColumnMapping(autoMapping);
        setImportStep("map");
        toast.success(`Loaded ${rows.length} rows from "${file.name}"`);
      } catch (error) {
        console.error("Error parsing file:", error);
        toast.error("Failed to parse the file. Please check the format.");
      }
    };
    reader.readAsText(file);
  };

  const processImportMapping = () => {
    if (!columnMapping.homeTeam || !columnMapping.awayTeam || !columnMapping.date) {
      toast.error("Please map at least Home Team, Away Team, and Date columns");
      return;
    }

    const errors: string[] = [];
    const preview: Fixture[] = [];

    importedData.forEach((row, index) => {
      const homeTeam = row[columnMapping.homeTeam]?.trim();
      const awayTeam = row[columnMapping.awayTeam]?.trim();
      const dateStr = row[columnMapping.date]?.trim();

      if (!homeTeam || !awayTeam) {
        errors.push(`Row ${index + 2}: Missing home or away team`);
        return;
      }
      if (!dateStr) {
        errors.push(`Row ${index + 2}: Missing date`);
        return;
      }

      let parsedDate = "";
      const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      const euMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);

      if (isoMatch) {
        parsedDate = `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
      } else if (euMatch) {
        parsedDate = `${euMatch[3]}-${euMatch[2].padStart(2, "0")}-${euMatch[1].padStart(2, "0")}`;
      } else {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          parsedDate = d.toISOString().split("T")[0];
        } else {
          errors.push(`Row ${index + 2}: Invalid date format "${dateStr}"`);
          return;
        }
      }

      let matchType = columnMapping.matchType ? (row[columnMapping.matchType]?.trim().toLowerCase() || "league") : "league";
      if (!["league", "t20", "cup", "friendly", "internal", "youth"].includes(matchType)) {
        if (matchType.includes("t20") || matchType.includes("twenty")) matchType = "t20";
        else if (matchType.includes("cup")) matchType = "cup";
        else if (matchType.includes("friend")) matchType = "friendly";
        else if (matchType.includes("internal") || matchType.includes("practice")) matchType = "internal";
        else if (matchType.includes("youth") || matchType.includes("under") || matchType.includes("junior")) matchType = "youth";
        else matchType = "league";
      }

      preview.push({
        id: `import-${index}`,
        homeTeam,
        awayTeam,
        date: parsedDate,
        time: columnMapping.time ? row[columnMapping.time]?.trim() || "" : "",
        venue: columnMapping.venue ? row[columnMapping.venue]?.trim() || "" : "",
        competition: columnMapping.competition ? row[columnMapping.competition]?.trim() || "" : "",
        matchType,
        matchCategory: columnMapping.matchCategory ? row[columnMapping.matchCategory]?.trim() || "" : "",
        overs: columnMapping.overs ? row[columnMapping.overs]?.trim() || "" : matchType === "t20" ? "20" : matchType === "youth" ? "20" : "50",
        status: columnMapping.status ? row[columnMapping.status]?.trim() || "scheduled" : "scheduled",
      });
    });

    setImportPreview(preview);
    setImportErrors(errors);
    setImportStep("preview");

    if (errors.length > 0) {
      toast.warning(`${preview.length} fixtures ready, ${errors.length} rows had issues`);
    } else {
      toast.success(`${preview.length} fixtures ready for import!`);
    }
  };

  const importFixtures = async () => {
    if (importPreview.length === 0) {
      toast.error("No fixtures to import");
      return;
    }
    setSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      const response = await fetch(`${apiUrl}/fixtures/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ fixtures: importPreview }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          successCount = data.imported || importPreview.length;
          toast.success(`Successfully imported ${successCount} fixtures!`);
          setImportStep("done");
          fetchFixtures();
          setSubmitting(false);
          return;
        }
      }

      for (const fixture of importPreview) {
        try {
          const resp = await fetch(`${apiUrl}/fixtures`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify(fixture),
          });
          const data = await resp.json();
          if (data.success) successCount++;
          else errorCount++;
        } catch {
          errorCount++;
        }
      }

      if (errorCount > 0) {
        toast.warning(`Imported ${successCount} fixtures, ${errorCount} failed`);
      } else {
        toast.success(`Successfully imported all ${successCount} fixtures!`);
      }
      setImportStep("done");
      fetchFixtures();
    } catch (error) {
      console.error("Error importing fixtures:", error);
      toast.error("Failed to import fixtures");
    } finally {
      setSubmitting(false);
    }
  };

  const resetImport = () => {
    setImportedData([]);
    setImportHeaders([]);
    setColumnMapping({
      homeTeam: "", awayTeam: "", date: "", time: "", venue: "",
      competition: "", matchType: "", matchCategory: "", overs: "", status: "",
    });
    setImportStep("upload");
    setImportPreview([]);
    setImportErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadSampleCSV = () => {
    const csv = `Home Team,Away Team,Date,Time,Venue,Competition,Match Type,Overs,Status
Adamstown CC 1st XI,Phoenix CC,2026-04-18,13:00,Adamstown Ground,Cricket Leinster - Division 2,league,50,scheduled
Adamstown CC 2nd XI,Leinster CC,2026-04-18,13:00,Tymon Park,Cricket Leinster - Division 5,league,45,scheduled
Adamstown CC 1st XI,YMCA CC,2026-04-25,10:30,Adamstown Ground,Cricket Leinster - T20 Cup,t20,20,scheduled
Adamstown CC vs B Team,Internal Selection Match,2026-04-12,11:00,Adamstown Ground,Practice Match,internal,20,scheduled
Adamstown CC 1st XI,Dublin University CC,2026-04-05,13:00,College Park,Pre-Season Friendly,friendly,40,scheduled
Adamstown CC Under 13,Phoenix CC Under 13,2026-05-10,10:00,Adamstown Ground,Youth League,youth,20,scheduled
Adamstown CC Under 15,YMCA CC Under 15,2026-05-10,10:00,Tymon Park,Youth Cup,youth,20,scheduled`;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fixtures_import_sample.csv";
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Sample CSV downloaded!");
  };

  // ===== Filtered fixtures =====
  const filteredFixtures = fixtures
    .filter(f => filterType === "all" || f.matchType === filterType)
    .filter(f => {
      if (filterTeam === "all") return true;
      return f.homeTeam === filterTeam || f.awayTeam === filterTeam;
    })
    .filter(f => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        f.homeTeam?.toLowerCase().includes(q) ||
        f.awayTeam?.toLowerCase().includes(q) ||
        f.venue?.toLowerCase().includes(q) ||
        f.competition?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // ===== Stats =====
  const stats = {
    total: fixtures.length,
    league: fixtures.filter(f => f.matchType === "league").length,
    t20: fixtures.filter(f => f.matchType === "t20").length,
    cup: fixtures.filter(f => f.matchType === "cup").length,
    friendly: fixtures.filter(f => f.matchType === "friendly").length,
    internal: fixtures.filter(f => f.matchType === "internal").length,
    youth: fixtures.filter(f => f.matchType === "youth").length,
    upcoming: fixtures.filter(f => new Date(f.date) >= new Date()).length,
  };

  // ===== Fixture Form (shared between manual entry tab and edit dialog) =====
  const renderFixtureForm = (isDialog = false) => (
    <form onSubmit={editingFixture ? updateFixture : addFixture} className="space-y-4">
      {/* Match Type */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-red-900">Match Type</Label>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {MATCH_TYPES.map(type => (
            <button
              key={type.value}
              type="button"
              onClick={() => setFixtureForm(prev => ({ ...prev, matchType: type.value, matchCategory: "" }))}
              className={`p-2 rounded-lg border-2 text-center transition-all text-xs font-medium ${
                fixtureForm.matchType === type.value
                  ? `${type.color} text-white border-transparent shadow-md scale-105`
                  : "border-gray-200 hover:border-gray-300 text-gray-600"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Youth Team selector — shown only for youth match type */}
      {fixtureForm.matchType === "youth" && (
        <div className="bg-teal-50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold text-teal-800">Youth Age Group</Label>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setEditableYouthTeams([...youthTeams]); setYouthTeamDialogOpen(true); }} className="text-teal-700 hover:text-teal-900 text-xs">
              <Settings className="size-3 mr-1" /> Edit Team Names
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {youthTeams.map(team => (
              <button
                key={team}
                type="button"
                onClick={() => {
                  const clubName = "Adamstown CC";
                  const teamName = `${clubName} ${team}`;
                  setFixtureForm(prev => ({
                    ...prev,
                    homeTeam: prev.homeTeam || teamName,
                  }));
                }}
                className="px-3 py-1.5 rounded-full border text-xs font-medium bg-white text-teal-700 border-teal-300 hover:bg-teal-100 transition-all"
              >
                {team}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category */}
      <div className="space-y-2">
        <Label>Competition / Category</Label>
        <Select
          value={fixtureForm.matchCategory}
          onValueChange={(value) => setFixtureForm(prev => ({ ...prev, matchCategory: value, competition: getCategoryLabel(prev.matchType, value) }))}
        >
          <SelectTrigger><SelectValue placeholder="Select competition..." /></SelectTrigger>
          <SelectContent>
            {(MATCH_CATEGORIES[fixtureForm.matchType] || []).map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Or enter custom competition name"
          value={fixtureForm.competition}
          onChange={(e) => setFixtureForm(prev => ({ ...prev, competition: e.target.value }))}
        />
      </div>

      {/* Teams */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Home Team *</Label>
          <Input value={fixtureForm.homeTeam} onChange={(e) => setFixtureForm(prev => ({ ...prev, homeTeam: e.target.value }))} required placeholder={fixtureForm.matchType === "youth" ? "e.g., Adamstown CC Under 13" : "e.g., Adamstown CC 1st XI"} />
        </div>
        <div className="space-y-2">
          <Label>Away Team *</Label>
          <Input value={fixtureForm.awayTeam} onChange={(e) => setFixtureForm(prev => ({ ...prev, awayTeam: e.target.value }))} required placeholder={fixtureForm.matchType === "youth" ? "e.g., Phoenix CC Under 13" : "e.g., Phoenix CC"} />
        </div>
      </div>

      {/* Date, Time, Overs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Date *</Label>
          <Input type="date" value={fixtureForm.date} onChange={(e) => setFixtureForm(prev => ({ ...prev, date: e.target.value }))} required />
        </div>
        <div className="space-y-2">
          <Label>Time</Label>
          <Input type="time" value={fixtureForm.time} onChange={(e) => setFixtureForm(prev => ({ ...prev, time: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Overs</Label>
          <Select value={fixtureForm.overs} onValueChange={(value) => setFixtureForm(prev => ({ ...prev, overs: value }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {OVERS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Venue & Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Venue *</Label>
          <Input value={fixtureForm.venue} onChange={(e) => setFixtureForm(prev => ({ ...prev, venue: e.target.value }))} required />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={fixtureForm.status} onValueChange={(value) => setFixtureForm(prev => ({ ...prev, status: value }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        {isDialog && <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>}
        <Button type="submit" className="bg-red-900 hover:bg-red-800" disabled={submitting}>
          {submitting ? "Saving..." : editingFixture ? "Update Fixture" : isDialog ? "Add Fixture" : <><Plus className="size-4 mr-2" /> Add Fixture</>}
        </Button>
      </div>
    </form>
  );

  // ===== Table View for All Fixtures =====
  const renderAllFixturesTable = () => (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-gray-100 sticky top-0">
          <tr>
            <th className="border-b p-2.5 text-left font-semibold text-gray-700">Type</th>
            <th className="border-b p-2.5 text-left font-semibold text-gray-700">Home Team</th>
            <th className="border-b p-2.5 text-center font-semibold text-gray-700"></th>
            <th className="border-b p-2.5 text-left font-semibold text-gray-700">Away Team</th>
            <th className="border-b p-2.5 text-left font-semibold text-gray-700">Date</th>
            <th className="border-b p-2.5 text-left font-semibold text-gray-700">Time</th>
            <th className="border-b p-2.5 text-left font-semibold text-gray-700">Venue</th>
            <th className="border-b p-2.5 text-left font-semibold text-gray-700">Competition</th>
            <th className="border-b p-2.5 text-left font-semibold text-gray-700">Overs</th>
            <th className="border-b p-2.5 text-left font-semibold text-gray-700">Status</th>
            <th className="border-b p-2.5 text-center font-semibold text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredFixtures.map((fixture) => {
            const typeInfo = getMatchTypeInfo(fixture.matchType);
            const isPast = new Date(fixture.date) < new Date();
            return (
              <tr key={fixture.id} className={`hover:bg-gray-50 ${isPast ? "opacity-75" : ""}`}>
                <td className="border-b p-2.5"><Badge className={`${typeInfo.color} text-white text-xs`}>{typeInfo.label}</Badge></td>
                <td className="border-b p-2.5 font-semibold text-gray-800">{fixture.homeTeam}</td>
                <td className="border-b p-2.5 text-center text-red-900 font-bold text-xs">vs</td>
                <td className="border-b p-2.5 font-semibold text-gray-800">{fixture.awayTeam}</td>
                <td className="border-b p-2.5 text-gray-600 whitespace-nowrap">{formatDate(fixture.date)}</td>
                <td className="border-b p-2.5 text-gray-600">{fixture.time || "-"}</td>
                <td className="border-b p-2.5 text-gray-600">{fixture.venue}</td>
                <td className="border-b p-2.5 text-gray-600">{fixture.competition}</td>
                <td className="border-b p-2.5 text-gray-600">{fixture.overs || "-"}</td>
                <td className="border-b p-2.5">
                  <Badge variant={fixture.status === "scheduled" ? "default" : fixture.status === "completed" ? "secondary" : "destructive"} className="text-xs capitalize">
                    {fixture.status}
                  </Badge>
                </td>
                <td className="border-b p-2.5 text-center">
                  <div className="flex items-center justify-center gap-0.5">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(fixture)}>
                      <Edit className="size-4 text-gray-500" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteFixture(fixture.id)}>
                      <Trash2 className="size-4 text-red-500" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-red-900">Manage Fixtures</h2>
        <p className="text-gray-600 mt-2">
          Add fixtures manually, auto-generate, or import from CSV/Excel
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Total", count: stats.total, color: "bg-red-900" },
          { label: "League", count: stats.league, color: "bg-blue-600" },
          { label: "T20", count: stats.t20, color: "bg-purple-600" },
          { label: "Cup", count: stats.cup, color: "bg-amber-600" },
          { label: "Friendly", count: stats.friendly, color: "bg-green-600" },
          { label: "Internal", count: stats.internal, color: "bg-gray-600" },
          { label: "Youth", count: stats.youth, color: "bg-teal-600" },
          { label: "Upcoming", count: stats.upcoming, color: "bg-cyan-700" },
        ].map(stat => (
          <Card key={stat.label} className="overflow-hidden">
            <div className={`h-1 ${stat.color}`} />
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{stat.count}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all-fixtures" className="flex items-center gap-1">
            <Calendar className="size-4" /> All Fixtures
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-1">
            <PenLine className="size-4" /> Manual Entry
          </TabsTrigger>
          <TabsTrigger value="generator" className="flex items-center gap-1">
            <Wand2 className="size-4" /> Auto Generate
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-1">
            <Upload className="size-4" /> Import CSV/Excel
          </TabsTrigger>
        </TabsList>

        {/* ====== TAB 1: All Fixtures ====== */}
        <TabsContent value="all-fixtures" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input placeholder="Search fixtures..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("card")}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === "card" ? "bg-white text-red-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <LayoutGrid className="size-3.5" /> Cards
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === "table" ? "bg-white text-red-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Table2 className="size-3.5" /> Table
              </button>
            </div>

            {/* Match Type filter */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <Filter className="size-4 mr-2" /><SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {MATCH_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Team filter - shown when a type is selected */}
            {filterType !== "all" && teamsForFilter.length > 0 && (
              <Select value={filterTeam} onValueChange={setFilterTeam}>
                <SelectTrigger className="w-[200px]">
                  <Users className="size-4 mr-2" /><SelectValue placeholder="Filter by team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teamsForFilter.map(team => <SelectItem key={team} value={team}>{team}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            <Button onClick={fetchFixtures} variant="outline" disabled={loading} size="sm">
              <RefreshCw className={`size-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="size-8 mx-auto animate-spin text-red-900 mb-4" />
              <p className="text-gray-500">Loading fixtures...</p>
            </div>
          ) : filteredFixtures.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="size-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 text-lg">No fixtures found</p>
                <p className="text-gray-400 text-sm mt-1">Use the tabs above to add fixtures</p>
              </CardContent>
            </Card>
          ) : viewMode === "table" ? (
            renderAllFixturesTable()
          ) : (
            <div className="grid gap-3">
              {filteredFixtures.map((fixture) => {
                const typeInfo = getMatchTypeInfo(fixture.matchType);
                const isPast = new Date(fixture.date) < new Date();
                return (
                  <Card key={fixture.id} className={`transition-shadow hover:shadow-md ${isPast ? "opacity-75" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`${typeInfo.color} text-white text-xs`}>{typeInfo.label}</Badge>
                            {fixture.overs && <Badge variant="outline" className="text-xs">{fixture.overs} overs</Badge>}
                            <span className="text-sm text-gray-600">{fixture.competition}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{fixture.homeTeam}</span>
                            <span className="text-red-900 font-semibold">vs</span>
                            <span className="font-bold text-gray-900">{fixture.awayTeam}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1"><Calendar className="size-3.5" />{formatDate(fixture.date)}</span>
                            {fixture.time && <span className="flex items-center gap-1"><Clock className="size-3.5" />{fixture.time}</span>}
                            {fixture.venue && <span className="flex items-center gap-1"><MapPin className="size-3.5" />{fixture.venue}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant={fixture.status === "scheduled" ? "default" : fixture.status === "completed" ? "secondary" : "destructive"} className="text-xs capitalize">
                            {fixture.status}
                          </Badge>
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(fixture)}>
                            <Edit className="size-4 text-gray-500" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteFixture(fixture.id)}>
                            <Trash2 className="size-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ====== TAB 2: Manual Entry ====== */}
        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenLine className="size-5 text-red-900" /> Add Fixture Manually
              </CardTitle>
              <CardDescription>
                Fill in the match details. Select the match type first to see relevant competitions. For Youth matches, select the age group.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderFixtureForm(false)}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== TAB 3: Auto Generate ====== */}
        <TabsContent value="generator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="size-5 text-red-900" /> Auto Generate Fixtures
              </CardTitle>
              <CardDescription>
                Use the fixture generator to automatically create a season's fixtures based on teams, grounds, and scheduling rules.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <Calendar className="size-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Fixture Generator</AlertTitle>
                <AlertDescription className="text-blue-700">
                  The fixture generator creates fixtures based on your team configuration, home grounds, and season dates.
                  It supports League, T20, Cup, Friendly, Internal, and Youth match types.
                </AlertDescription>
              </Alert>
              <div className="grid md:grid-cols-4 gap-4">
                {[
                  { icon: Trophy, title: "League & Cup", desc: "Cricket Leinster league divisions and cup competitions" },
                  { icon: Clock, title: "T20 Matches", desc: "Short format T20 matches and tournaments" },
                  { icon: Users, title: "Internal & Friendly", desc: "Practice matches, friendlies, and inter-squad games" },
                  { icon: Users, title: "Youth Matches", desc: "Age-group matches from Under 7 to Under 19" },
                ].map(item => (
                  <Card key={item.title} className="bg-gray-50">
                    <CardContent className="p-4 text-center">
                      <item.icon className="size-8 mx-auto text-red-900 mb-2" />
                      <h4 className="font-semibold text-sm">{item.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button
                className="bg-red-900 hover:bg-red-800 w-full"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("navigate", { detail: "fixture-generator" }));
                  toast.info("Opening Fixture Generator...");
                }}
              >
                <Wand2 className="size-4 mr-2" /> Open Fixture Generator
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== TAB 4: Import CSV/Excel ====== */}
        <TabsContent value="import" className="space-y-4">
          {importStep === "upload" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="size-5 text-red-900" /> Import Fixtures from CSV / Excel
                </CardTitle>
                <CardDescription>
                  Upload a CSV file containing your fixtures. The file should have columns for teams, dates, venues, and competition details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div
                  className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-red-400 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-red-400", "bg-red-50"); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove("border-red-400", "bg-red-50"); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("border-red-400", "bg-red-50");
                    const file = e.dataTransfer.files[0];
                    if (file && fileInputRef.current) {
                      const dt = new DataTransfer();
                      dt.items.add(file);
                      fileInputRef.current.files = dt.files;
                      fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
                    }
                  }}
                >
                  <Upload className="size-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-lg font-semibold text-gray-700">Drop your file here or click to browse</p>
                  <p className="text-sm text-gray-500 mt-2">Supports CSV files (.csv)</p>
                  <p className="text-xs text-gray-400 mt-1">For Excel files (.xlsx), please save as CSV first</p>
                  <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
                </div>

                <Separator />

                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                  <div>
                    <p className="font-medium text-sm">Need a template?</p>
                    <p className="text-xs text-gray-500">Download a sample CSV with the expected format</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadSampleCSV}>
                    <Download className="size-4 mr-2" /> Download Sample CSV
                  </Button>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-sm mb-3">Expected CSV Format</h4>
                  <div className="overflow-x-auto">
                    <table className="text-xs w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-200">
                          <th className="border p-1.5">Home Team</th>
                          <th className="border p-1.5">Away Team</th>
                          <th className="border p-1.5">Date</th>
                          <th className="border p-1.5">Time</th>
                          <th className="border p-1.5">Venue</th>
                          <th className="border p-1.5">Competition</th>
                          <th className="border p-1.5">Match Type</th>
                          <th className="border p-1.5">Overs</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border p-1.5">Adamstown CC</td>
                          <td className="border p-1.5">Phoenix CC</td>
                          <td className="border p-1.5">2026-04-18</td>
                          <td className="border p-1.5">13:00</td>
                          <td className="border p-1.5">Adamstown</td>
                          <td className="border p-1.5">CL Div 2</td>
                          <td className="border p-1.5">league</td>
                          <td className="border p-1.5">50</td>
                        </tr>
                        <tr className="bg-teal-50">
                          <td className="border p-1.5">ACC Under 13</td>
                          <td className="border p-1.5">Phoenix U13</td>
                          <td className="border p-1.5">2026-05-10</td>
                          <td className="border p-1.5">10:00</td>
                          <td className="border p-1.5">Adamstown</td>
                          <td className="border p-1.5">Youth League</td>
                          <td className="border p-1.5">youth</td>
                          <td className="border p-1.5">20</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    <strong>Match Type values:</strong> league, t20, cup, friendly, internal, youth
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {importStep === "map" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChevronDown className="size-5 text-red-900" /> Map CSV Columns
                </CardTitle>
                <CardDescription>
                  Map your CSV columns to fixture fields. We've auto-detected some mappings. Required fields are marked with *.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="size-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    Loaded <strong>{importedData.length}</strong> rows with <strong>{importHeaders.length}</strong> columns: {importHeaders.join(", ")}
                  </AlertDescription>
                </Alert>

                <div className="grid md:grid-cols-2 gap-4">
                  {([
                    { key: "homeTeam" as const, label: "Home Team *", required: true },
                    { key: "awayTeam" as const, label: "Away Team *", required: true },
                    { key: "date" as const, label: "Date *", required: true },
                    { key: "time" as const, label: "Time", required: false },
                    { key: "venue" as const, label: "Venue", required: false },
                    { key: "competition" as const, label: "Competition", required: false },
                    { key: "matchType" as const, label: "Match Type", required: false },
                    { key: "matchCategory" as const, label: "Match Category", required: false },
                    { key: "overs" as const, label: "Overs", required: false },
                    { key: "status" as const, label: "Status", required: false },
                  ]).map(field => (
                    <div key={field.key} className="space-y-1">
                      <Label className={`text-sm ${field.required ? "font-semibold" : ""}`}>{field.label}</Label>
                      <Select
                        value={columnMapping[field.key] || "___none___"}
                        onValueChange={(value) => setColumnMapping(prev => ({ ...prev, [field.key]: value === "___none___" ? "" : value }))}
                      >
                        <SelectTrigger className={columnMapping[field.key] ? "border-green-400" : field.required ? "border-red-300" : ""}>
                          <SelectValue placeholder="Select column..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="___none___">-- Not mapped --</SelectItem>
                          {importHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={resetImport}><X className="size-4 mr-2" /> Cancel</Button>
                  <Button className="bg-red-900 hover:bg-red-800" onClick={processImportMapping}>Preview Import →</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {importStep === "preview" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-red-900" /> Preview Import ({importPreview.length} fixtures)
                </CardTitle>
                <CardDescription>Review the fixtures below before importing them into the system.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {importErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="size-4" />
                    <AlertTitle>Issues Found ({importErrors.length})</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc ml-4 mt-2 text-sm max-h-32 overflow-y-auto">
                        {importErrors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="overflow-x-auto max-h-[400px] overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="border p-2 text-left">#</th>
                        <th className="border p-2 text-left">Type</th>
                        <th className="border p-2 text-left">Home Team</th>
                        <th className="border p-2 text-left">Away Team</th>
                        <th className="border p-2 text-left">Date</th>
                        <th className="border p-2 text-left">Time</th>
                        <th className="border p-2 text-left">Venue</th>
                        <th className="border p-2 text-left">Competition</th>
                        <th className="border p-2 text-left">Overs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((f, i) => {
                        const typeInfo = getMatchTypeInfo(f.matchType);
                        return (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="border p-2 text-gray-400">{i + 1}</td>
                            <td className="border p-2"><Badge className={`${typeInfo.color} text-white text-xs`}>{typeInfo.label}</Badge></td>
                            <td className="border p-2 font-medium">{f.homeTeam}</td>
                            <td className="border p-2 font-medium">{f.awayTeam}</td>
                            <td className="border p-2">{f.date}</td>
                            <td className="border p-2">{f.time || "-"}</td>
                            <td className="border p-2">{f.venue || "-"}</td>
                            <td className="border p-2">{f.competition || "-"}</td>
                            <td className="border p-2">{f.overs || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setImportStep("map")}>← Back to Mapping</Button>
                  <Button variant="outline" onClick={resetImport}>Cancel</Button>
                  <Button className="bg-red-900 hover:bg-red-800" onClick={importFixtures} disabled={submitting || importPreview.length === 0}>
                    {submitting ? <><RefreshCw className="size-4 mr-2 animate-spin" /> Importing...</> : <><Upload className="size-4 mr-2" /> Import {importPreview.length} Fixtures</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {importStep === "done" && (
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <CheckCircle2 className="size-16 mx-auto text-green-600" />
                <h3 className="text-2xl font-bold text-green-800">Import Complete!</h3>
                <p className="text-gray-600">Your fixtures have been successfully imported.</p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={resetImport}>Import More</Button>
                  <Button className="bg-red-900 hover:bg-red-800" onClick={() => setActiveTab("all-fixtures")}>View All Fixtures</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Fixture Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingFixture ? <Edit className="size-5" /> : <Plus className="size-5" />}
              {editingFixture ? "Edit Fixture" : "Add New Fixture"}
            </DialogTitle>
            <DialogDescription>
              {editingFixture ? "Update the fixture details below" : "Fill in the details to add a new fixture"}
            </DialogDescription>
          </DialogHeader>
          {renderFixtureForm(true)}
        </DialogContent>
      </Dialog>

      {/* Youth Team Names Management Dialog */}
      <Dialog open={youthTeamDialogOpen} onOpenChange={setYouthTeamDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="size-5 text-teal-600" /> Manage Youth Team Names
            </DialogTitle>
            <DialogDescription>
              Edit, add, or remove youth age group names. These are used when creating youth fixtures.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {editableYouthTeams.map((team, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={team}
                  onChange={(e) => {
                    const updated = [...editableYouthTeams];
                    updated[index] = e.target.value;
                    setEditableYouthTeams(updated);
                  }}
                  placeholder="e.g., Under 11"
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const updated = editableYouthTeams.filter((_, i) => i !== index);
                    setEditableYouthTeams(updated);
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}

            <div className="flex items-center gap-2 pt-2 border-t">
              <Input
                value={newYouthTeam}
                onChange={(e) => setNewYouthTeam(e.target.value)}
                placeholder="Add new team name, e.g., Under 12"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newYouthTeam.trim()) {
                    e.preventDefault();
                    setEditableYouthTeams(prev => [...prev, newYouthTeam.trim()]);
                    setNewYouthTeam("");
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (newYouthTeam.trim()) {
                    setEditableYouthTeams(prev => [...prev, newYouthTeam.trim()]);
                    setNewYouthTeam("");
                  }
                }}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setYouthTeamDialogOpen(false)}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={saveYouthTeams}>
              <Save className="size-4 mr-2" /> Save Team Names
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
