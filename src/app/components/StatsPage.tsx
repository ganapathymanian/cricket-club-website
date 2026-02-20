import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Award, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";

interface StatsPageProps {
  apiUrl: string;
  apiKey: string;
}

interface PlayerStats {
  name: string;
  matches: number;
  runs: number;
  wickets: number;
  average: number;
}

interface TeamStats {
  played: number;
  won: number;
  lost: number;
  drawn: number;
  winPercentage: number;
}

export function StatsPage({ apiUrl, apiKey }: StatsPageProps) {
  const [loading, setLoading] = useState(false);
  const [teamStats, setTeamStats] = useState<TeamStats>({
    played: 24,
    won: 15,
    lost: 7,
    drawn: 2,
    winPercentage: 62.5,
  });

  const [topBatsmen, setTopBatsmen] = useState<PlayerStats[]>([
    { name: "John Smith", matches: 12, runs: 487, wickets: 0, average: 48.7 },
    { name: "Michael O'Brien", matches: 11, runs: 423, wickets: 0, average: 42.3 },
    { name: "David Murphy", matches: 10, runs: 385, wickets: 0, average: 38.5 },
    { name: "Patrick Kelly", matches: 12, runs: 356, wickets: 0, average: 35.6 },
    { name: "James Walsh", matches: 9, runs: 312, wickets: 0, average: 34.7 },
  ]);

  const [topBowlers, setTopBowlers] = useState<PlayerStats[]>([
    { name: "Sean O'Connor", matches: 12, runs: 0, wickets: 28, average: 2.3 },
    { name: "Tom Brennan", matches: 11, runs: 0, wickets: 24, average: 2.2 },
    { name: "Ryan Fitzgerald", matches: 10, runs: 0, wickets: 21, average: 2.1 },
    { name: "Mark Doyle", matches: 9, runs: 0, wickets: 18, average: 2.0 },
    { name: "Kevin Lynch", matches: 8, runs: 0, wickets: 15, average: 1.9 },
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-red-900">Statistics</h2>
        <p className="text-gray-600 mt-2">
          Club and player performance statistics for the season
        </p>
      </div>

      {/* Team Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <BarChart3 className="size-8 mx-auto text-red-900 mb-2" />
              <p className="text-3xl font-bold text-red-900">{teamStats.played}</p>
              <p className="text-sm text-gray-600">Matches Played</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Award className="size-8 mx-auto text-green-600 mb-2" />
              <p className="text-3xl font-bold text-green-600">{teamStats.won}</p>
              <p className="text-sm text-gray-600">Wins</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Target className="size-8 mx-auto text-red-600 mb-2" />
              <p className="text-3xl font-bold text-red-600">{teamStats.lost}</p>
              <p className="text-sm text-gray-600">Losses</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <TrendingUp className="size-8 mx-auto text-blue-600 mb-2" />
              <p className="text-3xl font-bold text-blue-600">{teamStats.winPercentage}%</p>
              <p className="text-sm text-gray-600">Win Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Player Statistics */}
      <Tabs defaultValue="batting" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="batting">Batting</TabsTrigger>
          <TabsTrigger value="bowling">Bowling</TabsTrigger>
        </TabsList>

        <TabsContent value="batting">
          <Card>
            <CardHeader>
              <CardTitle>Top Batsmen</CardTitle>
              <CardDescription>Leading run scorers this season</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 font-semibold text-sm text-gray-700 pb-2 border-b">
                  <div>Player</div>
                  <div className="text-center">Matches</div>
                  <div className="text-center">Runs</div>
                  <div className="text-center">Average</div>
                </div>
                {topBatsmen.map((player, index) => (
                  <div
                    key={player.name}
                    className="grid grid-cols-4 gap-4 items-center py-2 hover:bg-gray-50 rounded-lg px-2 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-900 text-white text-xs font-bold">
                        {index + 1}
                      </span>
                      <span className="font-medium">{player.name}</span>
                    </div>
                    <div className="text-center text-gray-600">{player.matches}</div>
                    <div className="text-center font-semibold text-red-900">{player.runs}</div>
                    <div className="text-center text-gray-600">{player.average.toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bowling">
          <Card>
            <CardHeader>
              <CardTitle>Top Bowlers</CardTitle>
              <CardDescription>Leading wicket takers this season</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 font-semibold text-sm text-gray-700 pb-2 border-b">
                  <div>Player</div>
                  <div className="text-center">Matches</div>
                  <div className="text-center">Wickets</div>
                  <div className="text-center">Avg/Match</div>
                </div>
                {topBowlers.map((player, index) => (
                  <div
                    key={player.name}
                    className="grid grid-cols-4 gap-4 items-center py-2 hover:bg-gray-50 rounded-lg px-2 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-900 text-white text-xs font-bold">
                        {index + 1}
                      </span>
                      <span className="font-medium">{player.name}</span>
                    </div>
                    <div className="text-center text-gray-600">{player.matches}</div>
                    <div className="text-center font-semibold text-red-900">{player.wickets}</div>
                    <div className="text-center text-gray-600">{player.average.toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
