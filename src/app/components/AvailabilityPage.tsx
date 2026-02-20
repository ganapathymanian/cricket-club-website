import { useState, useEffect } from "react";
import { Calendar, Check, X } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { toast } from "sonner";

interface AvailabilityPageProps {
  apiUrl: string;
  apiKey: string;
  userName?: string;
}

interface Fixture {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  venue: string;
  competition: string;
  status: string;
}

interface AvailabilityStatus {
  fixtureId: string;
  available: boolean;
}

export function AvailabilityPage({ apiUrl, apiKey, userName }: AvailabilityPageProps) {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    fetchFixtures();
  }, []);

  const fetchFixtures = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/fixtures`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        // Filter for upcoming fixtures
        const upcoming = data.data.filter((fixture: Fixture) => {
          const fixtureDate = new Date(fixture.date);
          return fixtureDate >= new Date() && fixture.status === "scheduled";
        });
        setFixtures(upcoming);
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

  const updateAvailability = (fixtureId: string, available: boolean) => {
    setSubmitting(fixtureId);
    setAvailability({ ...availability, [fixtureId]: available });
    
    // Simulate API call
    setTimeout(() => {
      toast.success(available ? "Marked as available" : "Marked as unavailable");
      setSubmitting(null);
    }, 500);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IE", {
      weekday: "short",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-red-900">Match Availability</h2>
        <p className="text-gray-600 mt-2">
          Indicate your availability for upcoming fixtures
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading fixtures...</p>
        </div>
      ) : fixtures.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="size-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No upcoming fixtures available</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {fixtures.map((fixture) => {
            const isAvailable = availability[fixture.id];
            const hasResponded = fixture.id in availability;

            return (
              <Card key={fixture.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-5 text-red-900" />
                      <span>{fixture.homeTeam} vs {fixture.awayTeam}</span>
                    </div>
                    {hasResponded && (
                      <span
                        className={`text-sm font-normal px-3 py-1 rounded-full ${
                          isAvailable
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {isAvailable ? "Available" : "Unavailable"}
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    <div className="space-y-1 mt-2">
                      <p><strong>Date:</strong> {formatDate(fixture.date)}</p>
                      <p><strong>Venue:</strong> {fixture.venue}</p>
                      <p><strong>Competition:</strong> {fixture.competition}</p>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => updateAvailability(fixture.id, true)}
                      disabled={submitting === fixture.id}
                      className={`flex-1 ${
                        isAvailable
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-gray-200 text-gray-700 hover:bg-green-100"
                      }`}
                    >
                      <Check className="size-4 mr-2" />
                      Available
                    </Button>
                    <Button
                      onClick={() => updateAvailability(fixture.id, false)}
                      disabled={submitting === fixture.id}
                      className={`flex-1 ${
                        hasResponded && !isAvailable
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-gray-200 text-gray-700 hover:bg-red-100"
                      }`}
                    >
                      <X className="size-4 mr-2" />
                      Unavailable
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
