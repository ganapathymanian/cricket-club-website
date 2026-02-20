import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";

interface ClubFlyerPageProps {
  apiUrl: string;
  apiKey: string;
  userRole?: string;
}

interface ClubStats {
  totalMembers: number;
  adultTeams: { mens: number; womens: number; total: number };
  youthTeams: { count: number; totalKids: number; teams: string[] };
  grounds: { count: number; names: string[] };
  totalFixtures: number;
  upcomingFixtures: number;
}

interface Performer {
  name: string;
  team: string;
  runs?: number;
  wickets?: number;
  catches?: number;
  avg?: number;
  economy?: number;
  strikeRate?: number;
  innings?: number;
  overs?: number;
  runOuts?: number;
  stumpings?: number;
  rank: number;
}

interface PerformanceCategory {
  batting: Performer[];
  bowling: Performer[];
  fielding: Performer[];
}

interface TopPerformers {
  adults: {
    league: PerformanceCategory;
    t20: PerformanceCategory;
    internal: PerformanceCategory;
  };
  youth: {
    adultMatches: PerformanceCategory;
    youthGames: PerformanceCategory;
  };
  ladies: PerformanceCategory;
}

interface SeasonWeek {
  weekNumber: number;
  startDate: string;
  endDate: string;
  year: number;
}

interface SeasonMonth {
  month: string;
  year: number;
  startDate: string;
  endDate: string;
}

interface SeasonConfig {
  year: number;
  startDate: string;
  endDate: string;
  months: SeasonMonth[];
  weeks: SeasonWeek[];
}

interface Sponsor {
  id: string;
  name: string;
  logo: string;
  message: string;
  tier: string;
  website: string;
  active: boolean;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

function formatShortDate(dateStr: string): string {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch { return dateStr; }
}

export function ClubFlyerPage({ apiUrl, apiKey, userRole }: ClubFlyerPageProps) {
  const [stats, setStats] = useState<ClubStats | null>(null);
  const [performers, setPerformers] = useState<TopPerformers | null>(null);
  const [season, setSeason] = useState<SeasonConfig | null>(null);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllWeeks, setShowAllWeeks] = useState(false);
  const flyerRef = useRef<HTMLDivElement>(null);

  const isAdmin = userRole === 'admin';

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, perfRes, seasonRes, sponsorRes] = await Promise.all([
        fetch(`${apiUrl}/club-stats`),
        fetch(`${apiUrl}/top-performers`),
        fetch(`${apiUrl}/season-config`),
        fetch(`${apiUrl}/sponsors`)
      ]);

      const [statsData, perfData, seasonData, sponsorData] = await Promise.all([
        statsRes.json(), perfRes.json(), seasonRes.json(), sponsorRes.json()
      ]);

      if (statsData.success) setStats(statsData.data);
      if (perfData.success) setPerformers(perfData.data);
      if (seasonData.success) setSeason(seasonData.data);
      if (sponsorData.success) setSponsors(sponsorData.data);
    } catch (error) {
      console.error('Error fetching flyer data:', error);
      toast.error('Failed to load club data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportDrive = async () => {
    try {
      const res = await fetch(`${apiUrl}/flyer/export-drive`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Flyer exported to Google Drive as ${data.data.fileName}`);
      } else {
        toast.error(data.error || 'Export failed');
      }
    } catch {
      toast.error('Failed to export to Google Drive. Configure Google Drive in Admin Settings.');
    }
  };

  // Render a performer table
  const renderPerformerTable = (title: string, category: PerformanceCategory, emoji: string) => (
    <Card className="shadow-md border-0 rounded-xl overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <span className="text-xl">{emoji}</span> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Batting */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Badge className="bg-blue-100 text-blue-800 text-xs">🏏 Batting</Badge>
          </div>
          {category.batting.length > 0 ? (
            <div className="bg-blue-50 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="text-blue-700 border-b border-blue-200">
                  <th className="py-1 px-2 text-left">#</th>
                  <th className="py-1 px-2 text-left">Player</th>
                  <th className="py-1 px-2 text-left">Team</th>
                  <th className="py-1 px-2 text-right">Runs</th>
                  <th className="py-1 px-2 text-right">Avg</th>
                </tr></thead>
                <tbody>
                  {category.batting.map((p, i) => (
                    <tr key={i} className={i === 0 ? 'bg-blue-100 font-semibold' : ''}>
                      <td className="py-1 px-2">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : p.rank}</td>
                      <td className="py-1 px-2">{p.name}</td>
                      <td className="py-1 px-2 text-gray-500">{p.team}</td>
                      <td className="py-1 px-2 text-right font-mono">{p.runs}</td>
                      <td className="py-1 px-2 text-right font-mono">{p.avg?.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-xs text-gray-400 italic">No data yet</p>}
        </div>

        {/* Bowling */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Badge className="bg-green-100 text-green-800 text-xs">🎯 Bowling</Badge>
          </div>
          {category.bowling.length > 0 ? (
            <div className="bg-green-50 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="text-green-700 border-b border-green-200">
                  <th className="py-1 px-2 text-left">#</th>
                  <th className="py-1 px-2 text-left">Player</th>
                  <th className="py-1 px-2 text-left">Team</th>
                  <th className="py-1 px-2 text-right">Wkts</th>
                  <th className="py-1 px-2 text-right">Avg</th>
                </tr></thead>
                <tbody>
                  {category.bowling.map((p, i) => (
                    <tr key={i} className={i === 0 ? 'bg-green-100 font-semibold' : ''}>
                      <td className="py-1 px-2">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : p.rank}</td>
                      <td className="py-1 px-2">{p.name}</td>
                      <td className="py-1 px-2 text-gray-500">{p.team}</td>
                      <td className="py-1 px-2 text-right font-mono">{p.wickets}</td>
                      <td className="py-1 px-2 text-right font-mono">{p.avg?.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-xs text-gray-400 italic">No data yet</p>}
        </div>

        {/* Fielding */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Badge className="bg-orange-100 text-orange-800 text-xs">🧤 Fielding</Badge>
          </div>
          {category.fielding.length > 0 ? (
            <div className="bg-orange-50 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="text-orange-700 border-b border-orange-200">
                  <th className="py-1 px-2 text-left">#</th>
                  <th className="py-1 px-2 text-left">Player</th>
                  <th className="py-1 px-2 text-left">Team</th>
                  <th className="py-1 px-2 text-right">Ct</th>
                  <th className="py-1 px-2 text-right">RO</th>
                  <th className="py-1 px-2 text-right">St</th>
                </tr></thead>
                <tbody>
                  {category.fielding.map((p, i) => (
                    <tr key={i} className={i === 0 ? 'bg-orange-100 font-semibold' : ''}>
                      <td className="py-1 px-2">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : p.rank}</td>
                      <td className="py-1 px-2">{p.name}</td>
                      <td className="py-1 px-2 text-gray-500">{p.team}</td>
                      <td className="py-1 px-2 text-right font-mono">{p.catches}</td>
                      <td className="py-1 px-2 text-right font-mono">{p.runOuts}</td>
                      <td className="py-1 px-2 text-right font-mono">{p.stumpings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-xs text-gray-400 italic">No data yet</p>}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-red-900 mx-auto mb-4" />
          <p className="text-gray-500">Loading club data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Action Bar (not printed) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📄 Club Flyer</h1>
          <p className="text-sm text-gray-500">Auto-generated overview of Adamstown Cricket Club</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full" onClick={handlePrint}>
            🖨️ Print Flyer
          </Button>
          {isAdmin && (
            <Button className="rounded-full bg-blue-600 hover:bg-blue-700" onClick={handleExportDrive}>
              📁 Export to Google Drive
            </Button>
          )}
        </div>
      </div>

      {/* ===== FLYER CONTENT ===== */}
      <div ref={flyerRef} className="space-y-6 print:space-y-4">

        {/* HEADER */}
        <div className="bg-gradient-to-r from-red-900 via-red-800 to-red-900 rounded-2xl p-6 md:p-8 text-white text-center relative overflow-hidden print:rounded-none">
          <div className="absolute top-0 left-0 w-32 h-32 bg-yellow-400/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/5 rounded-full translate-x-1/2 translate-y-1/2" />
          <div className="relative z-10">
            <div className="w-20 h-20 bg-white rounded-full mx-auto mb-3 flex items-center justify-center">
              <span className="text-red-900 font-extrabold text-2xl">ACC</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Adamstown Cricket Club</h1>
            <p className="text-red-200 mt-1">Established 1950 • Cricket Leinster</p>
            <div className="mt-3 flex justify-center gap-4 text-sm">
              <span>📧 info@adamstowncc.com</span>
              <span>🏟️ Adamstown Oval</span>
            </div>
          </div>
        </div>

        {/* CLUB OVERVIEW STATS */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-700">📊</span>
            Club Overview
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Members', value: stats?.totalMembers || 0, icon: '👥', bg: 'bg-blue-50 border-blue-200' },
              { label: "Men's Teams", value: stats?.adultTeams.mens || 0, icon: '🏏', bg: 'bg-red-50 border-red-200' },
              { label: "Women's Teams", value: stats?.adultTeams.womens || 0, icon: '🏏', bg: 'bg-purple-50 border-purple-200' },
              { label: 'Youth Teams', value: stats?.youthTeams.count || 0, icon: '⚡', bg: 'bg-green-50 border-green-200' },
              { label: 'Youth Players', value: stats?.youthTeams.totalKids || 0, icon: '👦', bg: 'bg-teal-50 border-teal-200' },
              { label: 'Grounds', value: stats?.grounds.count || 0, icon: '🏟️', bg: 'bg-amber-50 border-amber-200' },
            ].map((item, i) => (
              <Card key={i} className={`${item.bg} border rounded-xl`}>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl">{item.icon}</div>
                  <div className="text-2xl font-extrabold text-gray-900">{item.value}</div>
                  <div className="text-xs text-gray-600 font-medium">{item.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Youth teams list */}
          {stats?.youthTeams.teams && stats.youthTeams.teams.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-sm text-gray-500 font-medium">Youth Teams:</span>
              {stats.youthTeams.teams.map((t, i) => (
                <Badge key={i} variant="outline" className="border-green-300 text-green-700 text-xs">{t}</Badge>
              ))}
            </div>
          )}

          {/* Grounds list */}
          {stats?.grounds.names && stats.grounds.names.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="text-sm text-gray-500 font-medium">Playing Grounds:</span>
              {stats.grounds.names.map((g, i) => (
                <Badge key={i} variant="outline" className="border-amber-300 text-amber-700 text-xs">🏟️ {g}</Badge>
              ))}
            </div>
          )}
        </div>

        {/* TOP PERFORMERS */}
        {performers && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-700">🏆</span>
              Top Performers — Season {season?.year || new Date().getFullYear()}
            </h2>

            <Tabs defaultValue="adults" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="adults" className="text-sm">🏏 Adults</TabsTrigger>
                <TabsTrigger value="youth" className="text-sm">⚡ Youth</TabsTrigger>
                <TabsTrigger value="ladies" className="text-sm">👩 Ladies</TabsTrigger>
              </TabsList>

              {/* ADULTS */}
              <TabsContent value="adults" className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  {renderPerformerTable('League Matches', performers.adults.league, '🏅')}
                  {renderPerformerTable('T20 Matches', performers.adults.t20, '⚡')}
                  {renderPerformerTable('Internal Matches', performers.adults.internal, '🤝')}
                </div>
              </TabsContent>

              {/* YOUTH */}
              <TabsContent value="youth" className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {renderPerformerTable('Youth in Adult Matches', performers.youth.adultMatches, '🌟')}
                  {renderPerformerTable('Youth Games', performers.youth.youthGames, '🎯')}
                </div>
              </TabsContent>

              {/* LADIES */}
              <TabsContent value="ladies" className="space-y-4">
                <div className="grid md:grid-cols-1 gap-4 max-w-2xl mx-auto">
                  {renderPerformerTable('Ladies Cricket', performers.ladies, '👑')}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* SEASON CALENDAR */}
        {season && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700">📅</span>
              Season Calendar — {season.year}
            </h2>

            {/* Season Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 rounded-xl">
                <CardContent className="p-4 text-center">
                  <div className="text-sm text-green-600 font-medium">Season Start</div>
                  <div className="text-lg font-bold text-green-900">{formatDate(season.startDate)}</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200 rounded-xl">
                <CardContent className="p-4 text-center">
                  <div className="text-sm text-red-600 font-medium">Season End</div>
                  <div className="text-lg font-bold text-red-900">{formatDate(season.endDate)}</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 rounded-xl">
                <CardContent className="p-4 text-center">
                  <div className="text-sm text-blue-600 font-medium">Year</div>
                  <div className="text-lg font-bold text-blue-900">{season.year}</div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Breakdown */}
            {season.months.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">📆 Monthly Breakdown</h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {season.months.map((m, i) => (
                    <Card key={i} className="border rounded-lg">
                      <CardContent className="p-2 text-center">
                        <div className="text-sm font-bold text-gray-900">{m.month}</div>
                        <div className="text-xs text-gray-500">{formatShortDate(m.startDate)} – {formatShortDate(m.endDate)}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Weekly Breakdown */}
            {season.weeks.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">📋 Weekly Breakdown (Week 1 – {season.weeks.length})</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-full print:hidden"
                    onClick={() => setShowAllWeeks(!showAllWeeks)}
                  >
                    {showAllWeeks ? 'Show Less' : `Show All ${season.weeks.length} Weeks`}
                  </Button>
                </div>
                <div className="bg-gray-50 rounded-xl border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700 border-b">
                        <th className="py-2 px-3 text-left w-20">Week</th>
                        <th className="py-2 px-3 text-left">Start Date</th>
                        <th className="py-2 px-3 text-left">End Date</th>
                        <th className="py-2 px-3 text-left">Year</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(showAllWeeks ? season.weeks : season.weeks.slice(0, 8)).map((w) => (
                        <tr key={w.weekNumber} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-1.5 px-3 font-semibold text-red-700">Week {w.weekNumber}</td>
                          <td className="py-1.5 px-3">{formatDate(w.startDate)}</td>
                          <td className="py-1.5 px-3">{formatDate(w.endDate)}</td>
                          <td className="py-1.5 px-3">{w.year}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!showAllWeeks && season.weeks.length > 8 && (
                    <div className="text-center py-2 text-xs text-gray-400 border-t print:hidden">
                      Showing 8 of {season.weeks.length} weeks • Click "Show All" to expand
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SPONSORS */}
        {sponsors.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-700">🤝</span>
              Our Valued Sponsors
            </h2>
            <Card className="bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-50 border-yellow-200 rounded-xl">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {sponsors.map(s => (
                    <div key={s.id} className="text-center bg-white rounded-lg p-3 border border-yellow-100 shadow-sm">
                      <div className="h-16 w-full flex items-center justify-center mb-2">
                        {s.logo ? (
                          <img src={s.logo} alt={s.name} className="max-h-14 max-w-full object-contain" />
                        ) : (
                          <span className="text-3xl">🏢</span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-gray-900">{s.name}</h4>
                      <p className="text-xs text-gray-500 italic mt-0.5">{s.message}</p>
                    </div>
                  ))}
                </div>
                <div className="text-center border-t border-yellow-200 pt-4">
                  <p className="text-amber-800 text-sm font-medium">
                    🙏 Thank you to all our sponsors for their generous support. Your partnership 
                    enables us to deliver outstanding cricket experiences for our entire community.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* FOOTER */}
        <div className="bg-gray-900 text-white rounded-2xl p-6 text-center print:rounded-none">
          <div className="flex items-center justify-center gap-4 mb-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <span className="text-red-900 font-bold text-sm">ACC</span>
            </div>
            <div className="text-left">
              <h3 className="font-bold text-lg">Adamstown Cricket Club</h3>
              <p className="text-gray-400 text-sm">Established 1950</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm">
            📧 info@adamstowncc.com &nbsp;•&nbsp; 🏟️ Adamstown Oval &nbsp;•&nbsp; 🏏 Cricket Leinster
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Generated on {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          [class*="print:"] { break-inside: avoid; }
          header, footer, nav { display: none !important; }
        }
      `}</style>
    </div>
  );
}
