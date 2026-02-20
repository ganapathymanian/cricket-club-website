import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { ChevronDown, ChevronRight, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

interface Member {
  id: string;
  name: string;
  category: "youth" | "adult";
}

interface TeamSelection {
  box1: Member[]; // 8 members
  box2: Member[]; // 3 members
}

interface SelectionCommitteeStarringPageProps {
  apiUrl: string;
  apiKey: string;
}

export function SelectionCommitteeStarringPage({ apiUrl, apiKey }: SelectionCommitteeStarringPageProps) {
  const [youthMembers, setYouthMembers] = useState<Member[]>([]);
  const [adultMembers, setAdultMembers] = useState<Member[]>([]);
  const [selectedYouth, setSelectedYouth] = useState<string[]>([]);
  const [selectedAdult, setSelectedAdult] = useState<string[]>([]);
  const [expandedTeam, setExpandedTeam] = useState<number | null>(1); // Start with Team 1 expanded
  const [expandedPool, setExpandedPool] = useState<number | null>(1); // Start with Team 1 Pool expanded
  const [teamSelections, setTeamSelections] = useState<Record<number, TeamSelection>>({});
  const [totalTeams, setTotalTeams] = useState<number>(10);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
    // Initialize team selections
    const initialSelections: Record<number, TeamSelection> = {};
    for (let i = 1; i <= 10; i++) {
      initialSelections[i] = { box1: [], box2: [] };
    }
    setTeamSelections(initialSelections);
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      // Fetch members from backend using admin endpoint
      const response = await fetch(`${apiUrl}/admin/members`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // The backend returns members in data.members
        if (data.success && data.members) {
          // Separate youth and adult members based on member data
          // For now, we'll need to add category field or determine it another way
          // Let's use all members and allow manual categorization
          setYouthMembers([]);
          setAdultMembers(data.members.map((m: any) => ({
            id: m.email,
            name: `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email,
            category: "adult"
          })));
        }
      } else {
        const errorData = await response.json();
        console.error("Error fetching members:", errorData);
        toast.error(errorData.error || "Failed to fetch members");
      }
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error("Failed to fetch members");
    } finally {
      setLoading(false);
    }
  };

  const toggleYouthSelection = (memberId: string) => {
    setSelectedYouth(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const toggleAdultSelection = (memberId: string) => {
    setSelectedAdult(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const addToTeamBox = (teamNumber: number, boxNumber: 1 | 2) => {
    const selectedMembers = [
      ...youthMembers.filter(m => selectedYouth.includes(m.id)),
      ...adultMembers.filter(m => selectedAdult.includes(m.id))
    ];

    if (selectedMembers.length === 0) {
      toast.error("Please select members to add");
      return;
    }

    const currentBox = boxNumber === 1 ? teamSelections[teamNumber].box1 : teamSelections[teamNumber].box2;
    const maxMembers = boxNumber === 1 ? 8 : 3;

    if (currentBox.length + selectedMembers.length > maxMembers) {
      toast.error(`Box ${boxNumber} can only hold ${maxMembers} members`);
      return;
    }

    setTeamSelections(prev => ({
      ...prev,
      [teamNumber]: {
        ...prev[teamNumber],
        [boxNumber === 1 ? 'box1' : 'box2']: [...currentBox, ...selectedMembers]
      }
    }));

    // Clear selections
    setSelectedYouth([]);
    setSelectedAdult([]);
    toast.success(`Added ${selectedMembers.length} member(s) to Team ${teamNumber}.${boxNumber}`);
  };

  const removeMemberFromBox = (teamNumber: number, boxNumber: 1 | 2, memberId: string) => {
    setTeamSelections(prev => ({
      ...prev,
      [teamNumber]: {
        ...prev[teamNumber],
        [boxNumber === 1 ? 'box1' : 'box2']: 
          (boxNumber === 1 ? prev[teamNumber].box1 : prev[teamNumber].box2)
            .filter(m => m.id !== memberId)
      }
    }));
  };

  const handleTeamClick = (teamNumber: number) => {
    setExpandedTeam(expandedTeam === teamNumber ? null : teamNumber);
    setExpandedPool(teamNumber); // Expand corresponding pool
  };

  const saveSelections = async () => {
    try {
      const response = await fetch(`${apiUrl}/selection-committee/save-starring`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ teamSelections }),
      });

      if (response.ok) {
        toast.success("Team selections saved successfully");
      } else {
        toast.error("Failed to save selections");
      }
    } catch (error) {
      console.error("Error saving selections:", error);
      toast.error("Failed to save selections");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-red-900">Members Starring</h1>
          <p className="text-gray-600">Selection Committee - Assign members to teams</p>
        </div>
        <Button onClick={saveSelections} className="bg-red-900 hover:bg-red-800">
          Save All Selections
        </Button>
      </div>

      {/* Three Column Layout */}
      <div className="grid grid-cols-3 gap-4 h-[calc(100vh-250px)]">
        
        {/* LEFT COLUMN - Youth & Adult Members */}
        <div className="space-y-4 overflow-y-auto">
          {/* Youth Members */}
          <Card className="p-4">
            <h3 className="font-semibold text-lg mb-3 text-red-900">Youth Members</h3>
            <div className="space-y-2 max-h-[45vh] overflow-y-auto">
              {youthMembers.map(member => (
                <div
                  key={member.id}
                  onClick={() => toggleYouthSelection(member.id)}
                  className={`p-2 rounded cursor-pointer border transition-colors ${
                    selectedYouth.includes(member.id)
                      ? "bg-red-100 border-red-500"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedYouth.includes(member.id)}
                      onChange={() => {}}
                      className="rounded"
                    />
                    <span className="text-sm">{member.name}</span>
                  </div>
                </div>
              ))}
              {youthMembers.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No youth members available</p>
              )}
            </div>
          </Card>

          {/* Adult Members */}
          <Card className="p-4">
            <h3 className="font-semibold text-lg mb-3 text-red-900">Adult Members (Hardball Eligible)</h3>
            <div className="space-y-2 max-h-[45vh] overflow-y-auto">
              {adultMembers.map(member => (
                <div
                  key={member.id}
                  onClick={() => toggleAdultSelection(member.id)}
                  className={`p-2 rounded cursor-pointer border transition-colors ${
                    selectedAdult.includes(member.id)
                      ? "bg-red-100 border-red-500"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedAdult.includes(member.id)}
                      onChange={() => {}}
                      className="rounded"
                    />
                    <span className="text-sm">{member.name}</span>
                  </div>
                </div>
              ))}
              {adultMembers.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No adult members available</p>
              )}
            </div>
          </Card>
        </div>

        {/* MIDDLE COLUMN - Teams 1-10 */}
        <div className="space-y-2 overflow-y-auto">
          {Array.from({ length: totalTeams }, (_, i) => i + 1).map(teamNumber => (
            <Card key={teamNumber} className="overflow-hidden">
              {/* Team Header */}
              <div
                onClick={() => handleTeamClick(teamNumber)}
                className="p-3 bg-red-900 text-white cursor-pointer hover:bg-red-800 transition-colors flex items-center justify-between"
              >
                <span className="font-semibold">Team {teamNumber}</span>
                {expandedTeam === teamNumber ? (
                  <ChevronDown className="size-5" />
                ) : (
                  <ChevronRight className="size-5" />
                )}
              </div>

              {/* Team Content - Expanded */}
              {expandedTeam === teamNumber && (
                <div className="p-4 space-y-4">
                  {/* Box 1 - 8 Members */}
                  <div className="border border-gray-300 rounded p-3">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-sm text-red-900">
                        {teamNumber}.1 - Main Squad (0/8)
                      </h4>
                      <Button
                        size="sm"
                        onClick={() => addToTeamBox(teamNumber, 1)}
                        disabled={teamSelections[teamNumber]?.box1.length >= 8}
                        className="bg-red-900 hover:bg-red-800 h-7 text-xs"
                      >
                        <UserPlus className="size-3 mr-1" />
                        Add
                      </Button>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {teamSelections[teamNumber]?.box1.map(member => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs"
                        >
                          <span>{member.name}</span>
                          <button
                            onClick={() => removeMemberFromBox(teamNumber, 1, member.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                      {(!teamSelections[teamNumber]?.box1 || teamSelections[teamNumber]?.box1.length === 0) && (
                        <p className="text-xs text-gray-400 text-center py-2">No members assigned</p>
                      )}
                    </div>
                  </div>

                  {/* Box 2 - 3 Members */}
                  <div className="border border-gray-300 rounded p-3">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-sm text-red-900">
                        {teamNumber}.2 - Reserves (0/3)
                      </h4>
                      <Button
                        size="sm"
                        onClick={() => addToTeamBox(teamNumber, 2)}
                        disabled={teamSelections[teamNumber]?.box2.length >= 3}
                        className="bg-red-900 hover:bg-red-800 h-7 text-xs"
                      >
                        <UserPlus className="size-3 mr-1" />
                        Add
                      </Button>
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {teamSelections[teamNumber]?.box2.map(member => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs"
                        >
                          <span>{member.name}</span>
                          <button
                            onClick={() => removeMemberFromBox(teamNumber, 2, member.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                      {(!teamSelections[teamNumber]?.box2 || teamSelections[teamNumber]?.box2.length === 0) && (
                        <p className="text-xs text-gray-400 text-center py-2">No reserves assigned</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* RIGHT COLUMN - Team Pools */}
        <div className="space-y-2 overflow-y-auto">
          {Array.from({ length: totalTeams }, (_, i) => i + 1).map(teamNumber => (
            <Card key={`pool-${teamNumber}`} className="overflow-hidden">
              {/* Pool Header */}
              <div
                className={`p-3 cursor-pointer transition-colors flex items-center justify-between ${
                  expandedPool === teamNumber
                    ? "bg-green-700 text-white"
                    : "bg-gray-700 text-white hover:bg-gray-600"
                }`}
              >
                <span className="font-semibold">Team {teamNumber} Pool</span>
                {expandedPool === teamNumber ? (
                  <ChevronDown className="size-5" />
                ) : (
                  <ChevronRight className="size-5" />
                )}
              </div>

              {/* Pool Content - Expanded */}
              {expandedPool === teamNumber && (
                <div className="p-4">
                  <div className="border border-gray-300 rounded p-3 bg-green-50">
                    <h4 className="font-semibold text-sm text-green-900 mb-2">
                      Available Pool Members
                    </h4>
                    <div className="space-y-1 max-h-96 overflow-y-auto">
                      {/* Show all members from box1 and box2 */}
                      {[...(teamSelections[teamNumber]?.box1 || []), ...(teamSelections[teamNumber]?.box2 || [])].map(member => (
                        <div
                          key={member.id}
                          className="bg-white p-2 rounded text-xs border border-green-200"
                        >
                          <div className="flex items-center justify-between">
                            <span>{member.name}</span>
                            <span className="text-gray-500 text-xs">
                              ({member.category})
                            </span>
                          </div>
                        </div>
                      ))}
                      {(teamSelections[teamNumber]?.box1.length === 0 && teamSelections[teamNumber]?.box2.length === 0) && (
                        <p className="text-xs text-gray-400 text-center py-4">
                          No members in pool yet
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}