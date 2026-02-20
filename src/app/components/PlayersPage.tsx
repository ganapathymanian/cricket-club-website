import { useEffect, useState } from "react";
import { User, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

interface Player {
  id: string;
  name: string;
  role: string;
  battingStyle?: string;
  bowlingStyle?: string;
  team: string;
  stats: {
    matches: number;
    runs: number;
    wickets: number;
  };
}

interface PlayersPageProps {
  apiUrl: string;
  apiKey: string;
}

export function PlayersPage({ apiUrl, apiKey }: PlayersPageProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/players`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch players: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Players data:", data);
      
      if (data.success) {
        setPlayers(data.data || []);
      } else {
        setError(data.error || "Failed to load players");
      }
    } catch (err) {
      console.error("Error fetching players:", err);
      setError(err instanceof Error ? err.message : "Failed to load players");
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    const roleLower = role.toLowerCase();
    if (roleLower.includes("batsman") || roleLower.includes("batter")) return "bg-blue-500";
    if (roleLower.includes("bowler")) return "bg-red-500";
    if (roleLower.includes("all-rounder")) return "bg-purple-500";
    if (roleLower.includes("wicket-keeper")) return "bg-green-500";
    return "bg-gray-500";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading players...</p>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-red-900">Players</h2>
        <Badge variant="secondary" className="text-sm">
          {players.length} {players.length === 1 ? "Player" : "Players"}
        </Badge>
      </div>

      {players.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="size-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No players registered yet</p>
            <p className="text-gray-500 text-sm mt-2">Players will appear here once they are added</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {players.map((player) => (
            <Card key={player.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="bg-gradient-to-br from-green-50 to-blue-50">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg text-gray-800">{player.name}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{player.team}</p>
                  </div>
                  <Badge className={getRoleColor(player.role)}>{player.role}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {player.battingStyle && (
                    <div className="text-sm">
                      <p className="text-gray-500">Batting</p>
                      <p className="font-semibold text-gray-800">{player.battingStyle}</p>
                    </div>
                  )}
                  {player.bowlingStyle && (
                    <div className="text-sm">
                      <p className="text-gray-500">Bowling</p>
                      <p className="font-semibold text-gray-800">{player.bowlingStyle}</p>
                    </div>
                  )}
                  <div className="pt-3 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="size-4 text-red-900" />
                      <p className="text-sm font-semibold text-gray-700">Statistics</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs text-gray-500">Matches</p>
                        <p className="font-bold text-red-900">{player.stats.matches}</p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs text-gray-500">Runs</p>
                        <p className="font-bold text-blue-700">{player.stats.runs}</p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs text-gray-500">Wickets</p>
                        <p className="font-bold text-red-700">{player.stats.wickets}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}