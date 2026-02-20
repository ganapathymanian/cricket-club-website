import { useEffect, useState } from "react";
import { Users, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

interface Team {
  id: string;
  name: string;
  division: string;
  captain: string;
  players: string[];
  createdAt: string;
}

interface TeamsPageProps {
  apiUrl: string;
  apiKey: string;
}

export function TeamsPage({ apiUrl, apiKey }: TeamsPageProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/teams`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch teams: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Teams data:", data);
      
      if (data.success) {
        setTeams(data.data || []);
      } else {
        setError(data.error || "Failed to load teams");
      }
    } catch (err) {
      console.error("Error fetching teams:", err);
      setError(err instanceof Error ? err.message : "Failed to load teams");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading teams...</p>
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
        <h2 className="text-3xl font-bold text-red-900">Teams</h2>
        <Badge variant="secondary" className="text-sm">
          {teams.length} {teams.length === 1 ? "Team" : "Teams"}
        </Badge>
      </div>

      {teams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="size-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No teams registered yet</p>
            <p className="text-gray-500 text-sm mt-2">Teams will appear here once they are added</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <Card key={team.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="bg-gradient-to-r from-red-50 to-red-100">
                <CardTitle className="text-xl text-red-900">{team.name}</CardTitle>
                <Badge className="w-fit bg-red-900">{team.division}</Badge>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-700">
                    <User className="size-4 text-red-900" />
                    <div>
                      <p className="text-sm text-gray-500">Captain</p>
                      <p className="font-semibold">{team.captain}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Users className="size-4 text-red-900" />
                    <div>
                      <p className="text-sm text-gray-500">Squad Size</p>
                      <p className="font-semibold">
                        {team.players?.length || 0} {team.players?.length === 1 ? "Player" : "Players"}
                      </p>
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