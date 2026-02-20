import { useEffect, useState } from "react";
import { Trophy, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

interface Result {
  id: string;
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  winner: string;
  date: string;
  summary?: string;
}

interface ResultsPageProps {
  apiUrl: string;
  apiKey: string;
}

export function ResultsPage({ apiUrl, apiKey }: ResultsPageProps) {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/results`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch results: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Results data:", data);
      
      if (data.success) {
        // Sort by date, most recent first
        const sortedResults = (data.data || []).sort((a: Result, b: Result) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setResults(sortedResults);
      } else {
        setError(data.error || "Failed to load results");
      }
    } catch (err) {
      console.error("Error fetching results:", err);
      setError(err instanceof Error ? err.message : "Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
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
        <h2 className="text-3xl font-bold text-red-900">Match Results</h2>
        <Badge variant="secondary" className="text-sm">
          {results.length} {results.length === 1 ? "Result" : "Results"}
        </Badge>
      </div>

      {results.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="size-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No results available yet</p>
            <p className="text-gray-500 text-sm mt-2">Match results will appear here once games are completed</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {results.map((result) => (
            <Card key={result.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-red-900" />
                    <span className="text-sm text-gray-600">{formatDate(result.date)}</span>
                  </div>
                  <Badge className="bg-red-900">
                    <Trophy className="size-3 mr-1" />
                    Completed
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 items-center">
                    {/* Home Team */}
                    <div className={`text-right ${result.winner === result.homeTeam ? "font-bold" : ""}`}>
                      <p className="text-lg text-gray-800">{result.homeTeam}</p>
                      {result.winner === result.homeTeam && (
                        <Badge variant="secondary" className="mt-1 bg-red-100 text-red-900">Winner</Badge>
                      )}
                    </div>

                    {/* Score */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div className={`text-2xl font-bold ${result.winner === result.homeTeam ? "text-red-900" : "text-gray-600"}`}>
                          {result.homeScore}
                        </div>
                        <div className="text-gray-400">-</div>
                        <div className={`text-2xl font-bold ${result.winner === result.awayTeam ? "text-red-900" : "text-gray-600"}`}>
                          {result.awayScore}
                        </div>
                      </div>
                    </div>

                    {/* Away Team */}
                    <div className={`text-left ${result.winner === result.awayTeam ? "font-bold" : ""}`}>
                      <p className="text-lg text-gray-800">{result.awayTeam}</p>
                      {result.winner === result.awayTeam && (
                        <Badge variant="secondary" className="mt-1 bg-red-100 text-red-900">Winner</Badge>
                      )}
                    </div>
                  </div>

                  {result.summary && (
                    <div className="pt-3 border-t">
                      <p className="text-sm text-gray-600">{result.summary}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}