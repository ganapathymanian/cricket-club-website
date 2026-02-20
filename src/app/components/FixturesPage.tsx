import { useEffect, useState } from "react";
import { Calendar, MapPin, Trophy, Clock, Filter, Users, LayoutGrid, Table2 } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface Fixture {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time?: string;
  venue: string;
  competition: string;
  matchType?: string;
  overs?: string;
  status: string;
}

interface FixturesPageProps {
  apiUrl: string;
  apiKey: string;
}

const MATCH_TYPE_STYLES: Record<string, { label: string; color: string }> = {
  league: { label: "League", color: "bg-blue-600" },
  t20: { label: "T20", color: "bg-purple-600" },
  cup: { label: "Cup", color: "bg-amber-600" },
  friendly: { label: "Friendly", color: "bg-green-600" },
  internal: { label: "Internal", color: "bg-gray-600" },
  youth: { label: "Youth", color: "bg-teal-600" },
};

const YOUTH_TEAMS = [
  "Under 7", "Under 9", "Under 11", "Under 13", "Under 15", "Under 17", "Under 19",
];

export function FixturesPage({ apiUrl, apiKey }: FixturesPageProps) {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [filterTime, setFilterTime] = useState("upcoming");
  const [filterTeam, setFilterTeam] = useState("all");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  useEffect(() => {
    fetchFixtures();
  }, []);

  // Reset team filter when match type changes
  useEffect(() => {
    setFilterTeam("all");
  }, [filterType]);

  const fetchFixtures = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/fixtures`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch fixtures: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.success) {
        setFixtures(data.data || []);
      } else {
        setError(data.error || "Failed to load fixtures");
      }
    } catch (err) {
      console.error("Error fetching fixtures:", err);
      setError(err instanceof Error ? err.message : "Failed to load fixtures");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IE", {
      weekday: "short", year: "numeric", month: "short", day: "numeric",
    });
  };

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed": return "bg-gray-500 text-white";
      case "in-progress": case "in progress": return "bg-blue-500 text-white";
      case "scheduled": return "bg-green-600 text-white";
      case "cancelled": return "bg-red-500 text-white";
      case "postponed": return "bg-amber-500 text-white";
      case "abandoned": return "bg-orange-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getMatchTypeStyle = (type?: string) => {
    return MATCH_TYPE_STYLES[type || "league"] || MATCH_TYPE_STYLES.league;
  };

  // Extract unique team names from fixtures for team filter
  const getTeamsForType = (type: string): string[] => {
    const relevantFixtures = type === "all"
      ? fixtures
      : fixtures.filter(f => (f.matchType || "league") === type);

    const teamSet = new Set<string>();
    relevantFixtures.forEach(f => {
      if (f.homeTeam) teamSet.add(f.homeTeam);
      if (f.awayTeam) teamSet.add(f.awayTeam);
    });
    return Array.from(teamSet).sort();
  };

  const teamsForFilter = getTeamsForType(filterType);

  // For Youth type, also show default youth team labels if not present
  const youthTeamOptions = filterType === "youth"
    ? Array.from(new Set([...YOUTH_TEAMS, ...teamsForFilter])).sort()
    : teamsForFilter;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const filteredFixtures = fixtures
    .filter(f => filterType === "all" || (f.matchType || "league") === filterType)
    .filter(f => {
      if (filterTeam === "all") return true;
      return f.homeTeam === filterTeam || f.awayTeam === filterTeam;
    })
    .filter(f => {
      if (filterTime === "upcoming") return new Date(f.date) >= now;
      if (filterTime === "past") return new Date(f.date) < now;
      return true;
    })
    .sort((a, b) => {
      if (filterTime === "past") {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

  // Group fixtures by month
  const groupedFixtures: Record<string, Fixture[]> = {};
  filteredFixtures.forEach(f => {
    const d = new Date(f.date);
    const key = d.toLocaleDateString("en-IE", { year: "numeric", month: "long" });
    if (!groupedFixtures[key]) groupedFixtures[key] = [];
    groupedFixtures[key].push(f);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading fixtures...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  // ===== Table View =====
  const renderTableView = () => (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-gray-100 sticky top-0">
          <tr>
            <th className="border-b p-3 text-left font-semibold text-gray-700">Type</th>
            <th className="border-b p-3 text-left font-semibold text-gray-700">Home Team</th>
            <th className="border-b p-3 text-center font-semibold text-gray-700"></th>
            <th className="border-b p-3 text-left font-semibold text-gray-700">Away Team</th>
            <th className="border-b p-3 text-left font-semibold text-gray-700">Date</th>
            <th className="border-b p-3 text-left font-semibold text-gray-700">Time</th>
            <th className="border-b p-3 text-left font-semibold text-gray-700">Venue</th>
            <th className="border-b p-3 text-left font-semibold text-gray-700">Competition</th>
            <th className="border-b p-3 text-left font-semibold text-gray-700">Overs</th>
            <th className="border-b p-3 text-left font-semibold text-gray-700">Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredFixtures.map((fixture) => {
            const typeStyle = getMatchTypeStyle(fixture.matchType);
            const isPast = new Date(fixture.date) < now;
            return (
              <tr key={fixture.id} className={`hover:bg-gray-50 ${isPast ? "opacity-70" : ""}`}>
                <td className="border-b p-3">
                  <Badge className={`${typeStyle.color} text-white text-xs`}>{typeStyle.label}</Badge>
                </td>
                <td className="border-b p-3 font-semibold text-gray-800">{fixture.homeTeam}</td>
                <td className="border-b p-3 text-center text-red-900 font-bold text-xs">vs</td>
                <td className="border-b p-3 font-semibold text-gray-800">{fixture.awayTeam}</td>
                <td className="border-b p-3 text-gray-600 whitespace-nowrap">{formatDate(fixture.date)}</td>
                <td className="border-b p-3 text-gray-600">{fixture.time || "-"}</td>
                <td className="border-b p-3 text-gray-600">{fixture.venue}</td>
                <td className="border-b p-3 text-gray-600">{fixture.competition}</td>
                <td className="border-b p-3 text-gray-600">{fixture.overs || "-"}</td>
                <td className="border-b p-3">
                  <Badge className={`${getStatusStyle(fixture.status)} text-xs`}>{fixture.status}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // ===== Card View =====
  const renderCardView = () => (
    <div className="space-y-8">
      {Object.entries(groupedFixtures).map(([month, monthFixtures]) => (
        <div key={month}>
          <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Calendar className="size-4 text-red-900" />
            {month}
            <span className="text-sm font-normal text-gray-400">({monthFixtures.length})</span>
          </h3>
          <div className="grid gap-3">
            {monthFixtures.map((fixture) => {
              const typeStyle = getMatchTypeStyle(fixture.matchType);
              const isPast = new Date(fixture.date) < now;
              return (
                <Card key={fixture.id} className={`hover:shadow-lg transition-shadow ${isPast ? "opacity-70" : ""}`}>
                  <CardContent className="p-0">
                    <div className={`h-1 ${typeStyle.color} rounded-t-lg`} />
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${typeStyle.color} text-white text-xs`}>{typeStyle.label}</Badge>
                          {fixture.overs && (
                            <Badge variant="outline" className="text-xs">{fixture.overs} overs</Badge>
                          )}
                          <span className="text-sm font-medium text-gray-600">{fixture.competition}</span>
                        </div>
                        <Badge className={`${getStatusStyle(fixture.status)} text-xs`}>{fixture.status}</Badge>
                      </div>

                      <div className="flex items-center justify-center gap-4 py-3">
                        <div className="text-right flex-1">
                          <p className="font-bold text-lg text-gray-800">{fixture.homeTeam}</p>
                          <p className="text-xs text-gray-500">Home</p>
                        </div>
                        <div className="text-2xl font-bold text-red-900">vs</div>
                        <div className="text-left flex-1">
                          <p className="font-bold text-lg text-gray-800">{fixture.awayTeam}</p>
                          <p className="text-xs text-gray-500">Away</p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-3 pt-3 border-t">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar className="size-4 text-red-900" />
                          <span className="text-sm">{formatDate(fixture.date)}</span>
                        </div>
                        {fixture.time && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Clock className="size-4 text-red-900" />
                            <span className="text-sm">{fixture.time}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-700">
                          <MapPin className="size-4 text-red-900" />
                          <span className="text-sm">{fixture.venue}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold text-red-900">Fixtures</h2>
          <p className="text-gray-500 text-sm mt-1">
            {filteredFixtures.length} {filteredFixtures.length === 1 ? "match" : "matches"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("card")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === "card"
                  ? "bg-white text-red-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <LayoutGrid className="size-4" /> Cards
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === "table"
                  ? "bg-white text-red-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Table2 className="size-4" /> Table
            </button>
          </div>

          {/* Time Filter */}
          <Select value={filterTime} onValueChange={setFilterTime}>
            <SelectTrigger className="w-[140px]">
              <Clock className="size-4 mr-1" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="past">Past</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>

          {/* Match Type Filter */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[170px]">
              <Filter className="size-4 mr-1" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="league">League</SelectItem>
              <SelectItem value="t20">T20</SelectItem>
              <SelectItem value="cup">Cup</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="internal">Internal</SelectItem>
              <SelectItem value="youth">Youth Matches</SelectItem>
            </SelectContent>
          </Select>

          {/* Team Filter - shown when a type is selected */}
          {filterType !== "all" && (
            <Select value={filterTeam} onValueChange={setFilterTeam}>
              <SelectTrigger className="w-[200px]">
                <Users className="size-4 mr-1" /><SelectValue placeholder="Filter by team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {(filterType === "youth" ? youthTeamOptions : teamsForFilter).map(team => (
                  <SelectItem key={team} value={team}>{team}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Quick filter badges */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(MATCH_TYPE_STYLES).map(([key, style]) => {
          const count = fixtures.filter(f => (f.matchType || "league") === key).length;
          if (count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setFilterType(filterType === key ? "all" : key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filterType === key
                  ? `${style.color} text-white shadow-md`
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {style.label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                filterType === key ? "bg-white/20" : "bg-gray-200"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filteredFixtures.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="size-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No fixtures found</p>
            <p className="text-gray-500 text-sm mt-2">
              {filterType !== "all" || filterTime !== "all" || filterTeam !== "all"
                ? "Try adjusting your filters"
                : "Check back soon for upcoming matches"}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        renderTableView()
      ) : (
        renderCardView()
      )}
    </div>
  );
}
