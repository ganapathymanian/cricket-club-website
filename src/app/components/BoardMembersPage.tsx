import { useState, useEffect } from "react";
import { Users, Award, Star, Crown, Shield, Edit, Save, X, Plus, Trash2, ChevronDown, ChevronUp, Heart, History, Mail, Calendar, Briefcase } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import { Separator } from "./ui/separator";

interface BoardMembersPageProps {
  apiUrl: string;
  apiKey: string;
  userRole?: string;
}

interface BoardMember {
  id: string;
  name: string;
  position: string;
  photo?: string;
  bio?: string;
  since?: string;
  email?: string;
  order: number;
}

interface PastBoardMember {
  id: string;
  name: string;
  position: string;
  yearsServed: string;
  contribution?: string;
  photo?: string;
}

const BOARD_POSITIONS = [
  { value: "president", label: "President", icon: Crown, color: "bg-amber-700", accent: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  { value: "secretary", label: "Secretary", icon: Briefcase, color: "bg-slate-700", accent: "text-slate-700", bg: "bg-slate-50", border: "border-slate-200" },
  { value: "finance_secretary", label: "Finance Secretary", icon: Shield, color: "bg-emerald-700", accent: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  { value: "head_coach", label: "Head Coach", icon: Award, color: "bg-red-800", accent: "text-red-800", bg: "bg-red-50", border: "border-red-200" },
  { value: "fixture_secretary", label: "Fixture Secretary", icon: Calendar, color: "bg-violet-700", accent: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200" },
  { value: "selection_committee", label: "Selection Committee", icon: Star, color: "bg-orange-700", accent: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  { value: "social_media_incharge", label: "Social Media Incharge", icon: Users, color: "bg-pink-700", accent: "text-pink-700", bg: "bg-pink-50", border: "border-pink-200" },
  { value: "development_officer", label: "Development Officer", icon: Shield, color: "bg-indigo-700", accent: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200" },
  { value: "youth_secretary", label: "Youth Secretary", icon: Users, color: "bg-teal-700", accent: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200" },
  { value: "ladies_secretary", label: "Ladies Secretary", icon: Heart, color: "bg-rose-700", accent: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" },
];

const getPositionInfo = (position: string) => {
  return BOARD_POSITIONS.find(p => p.value === position) || { value: position, label: position, icon: Users, color: "bg-gray-600", accent: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200" };
};

export function BoardMembersPage({ apiUrl, apiKey, userRole }: BoardMembersPageProps) {
  const [currentMembers, setCurrentMembers] = useState<BoardMember[]>([]);
  const [pastMembers, setPastMembers] = useState<PastBoardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showPastMembers, setShowPastMembers] = useState(true);

  // Edit dialogs
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<BoardMember | null>(null);
  const [memberForm, setMemberForm] = useState({ name: "", position: "president", bio: "", since: "", email: "", photo: "" });

  const [pastDialogOpen, setPastDialogOpen] = useState(false);
  const [editingPast, setEditingPast] = useState<PastBoardMember | null>(null);
  const [pastForm, setPastForm] = useState({ name: "", position: "president", yearsServed: "", contribution: "", photo: "" });

  const isAdmin = userRole === "admin" || userRole === "fixture_secretary";

  useEffect(() => {
    fetchBoardMembers();
  }, []);

  const fetchBoardMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/board-members`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await response.json();
      if (data.success) {
        setCurrentMembers(data.data?.current || []);
        setPastMembers(data.data?.past || []);
      }
    } catch (error) {
      console.error("Error fetching board members:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveBoardMembers = async (current: BoardMember[], past: PastBoardMember[]) => {
    try {
      const response = await fetch(`${apiUrl}/board-members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ current, past }),
      });
      const data = await response.json();
      if (data.success) {
        setCurrentMembers(data.data?.current || current);
        setPastMembers(data.data?.past || past);
        toast.success("Board members updated!");
      } else {
        toast.error("Failed to update board members");
      }
    } catch (error) {
      console.error("Error saving board members:", error);
      toast.error("Failed to save changes");
    }
  };

  // Current member CRUD
  const openAddMember = () => {
    setEditingMember(null);
    setMemberForm({ name: "", position: "president", bio: "", since: "", email: "", photo: "" });
    setEditDialogOpen(true);
  };

  const openEditMember = (member: BoardMember) => {
    setEditingMember(member);
    setMemberForm({
      name: member.name,
      position: member.position,
      bio: member.bio || "",
      since: member.since || "",
      email: member.email || "",
      photo: member.photo || "",
    });
    setEditDialogOpen(true);
  };

  const saveMember = () => {
    if (!memberForm.name.trim()) { toast.error("Name is required"); return; }

    let updated: BoardMember[];
    if (editingMember) {
      updated = currentMembers.map(m =>
        m.id === editingMember.id ? { ...m, ...memberForm } : m
      );
    } else {
      const newMember: BoardMember = {
        id: `board-${Date.now()}`,
        ...memberForm,
        order: currentMembers.length,
      };
      updated = [...currentMembers, newMember];
    }

    saveBoardMembers(updated, pastMembers);
    setEditDialogOpen(false);
  };

  const deleteMember = (id: string) => {
    if (!confirm("Remove this board member?")) return;
    const updated = currentMembers.filter(m => m.id !== id);
    saveBoardMembers(updated, pastMembers);
  };

  // Past member CRUD
  const openAddPastMember = () => {
    setEditingPast(null);
    setPastForm({ name: "", position: "president", yearsServed: "", contribution: "", photo: "" });
    setPastDialogOpen(true);
  };

  const openEditPastMember = (member: PastBoardMember) => {
    setEditingPast(member);
    setPastForm({
      name: member.name,
      position: member.position,
      yearsServed: member.yearsServed,
      contribution: member.contribution || "",
      photo: member.photo || "",
    });
    setPastDialogOpen(true);
  };

  const savePastMember = () => {
    if (!pastForm.name.trim()) { toast.error("Name is required"); return; }

    let updated: PastBoardMember[];
    if (editingPast) {
      updated = pastMembers.map(m =>
        m.id === editingPast.id ? { ...m, ...pastForm } : m
      );
    } else {
      const newPast: PastBoardMember = {
        id: `past-${Date.now()}`,
        ...pastForm,
      };
      updated = [...pastMembers, newPast];
    }

    saveBoardMembers(currentMembers, updated);
    setPastDialogOpen(false);
  };

  const deletePastMember = (id: string) => {
    if (!confirm("Remove this past board member?")) return;
    const updated = pastMembers.filter(m => m.id !== id);
    saveBoardMembers(currentMembers, updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading board members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* ===== Page Header ===== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 px-8 py-12 md:py-16 mb-10">
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-red-500/10 blur-3xl" />
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 backdrop-blur border border-white/20 mb-5">
            <Shield className="size-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
            Board of Management
          </h1>
          <p className="text-slate-300 max-w-xl mx-auto leading-relaxed text-sm md:text-base">
            The dedicated individuals who lead, govern, and shape the future of Adamstown Cricket Club.
          </p>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditMode(!editMode)}
              className="mt-5 border-white/30 text-white hover:bg-white/10 rounded-full text-xs"
            >
              <Edit className="size-3.5 mr-1.5" /> {editMode ? "Done Editing" : "Edit Board"}
            </Button>
          )}
        </div>
      </div>

      {/* ====== Current Board Members ====== */}
      <div className="space-y-6 mb-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-red-800 rounded-full" />
            <h2 className="text-xl md:text-2xl font-semibold text-slate-800 tracking-tight">Current Board</h2>
          </div>
          {editMode && (
            <Button size="sm" onClick={openAddMember} className="bg-red-900 hover:bg-red-800 rounded-lg text-xs">
              <Plus className="size-3.5 mr-1" /> Add Member
            </Button>
          )}
        </div>

        {/* President Card — Featured */}
        {currentMembers.filter(m => m.position === "president").map(member => {
          const posInfo = getPositionInfo(member.position);
          const IconComp = posInfo.icon;
          return (
            <Card key={member.id} className="overflow-hidden border border-amber-200 shadow-md">
              <div className="h-1 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500" />
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row items-center gap-0">
                  {/* Photo / Avatar */}
                  <div className="w-full md:w-48 bg-gradient-to-br from-amber-50 to-amber-100/50 flex items-center justify-center py-8 md:py-0 md:min-h-[180px]">
                    {member.photo ? (
                      <img src={member.photo} alt={member.name} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg" />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-lg border-4 border-white">
                        <span className="text-white font-bold text-2xl tracking-wide">
                          {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-amber-700 text-white text-[11px] font-medium tracking-wide rounded-md px-2.5 py-0.5">
                        <Crown className="size-3 mr-1" /> PRESIDENT
                      </Badge>
                    </div>
                    <h3 className="text-xl md:text-2xl font-semibold text-slate-900 tracking-tight">{member.name}</h3>
                    {member.bio && <p className="text-slate-500 mt-2 leading-relaxed text-sm">{member.bio}</p>}
                    <div className="flex items-center gap-5 mt-4 text-xs text-slate-400">
                      {member.since && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="size-3.5" /> Since {member.since}
                        </span>
                      )}
                      {member.email && (
                        <span className="flex items-center gap-1.5">
                          <Mail className="size-3.5" /> {member.email}
                        </span>
                      )}
                    </div>
                  </div>

                  {editMode && (
                    <div className="flex md:flex-col gap-1 p-4">
                      <Button variant="ghost" size="sm" onClick={() => openEditMember(member)}><Edit className="size-4 text-slate-400" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteMember(member.id)}><Trash2 className="size-4 text-red-400" /></Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Other Board Members Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentMembers.filter(m => m.position !== "president").map(member => {
            const posInfo = getPositionInfo(member.position);
            const IconComp = posInfo.icon;
            return (
              <Card key={member.id} className="overflow-hidden border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 group">
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    {/* Left accent bar + avatar */}
                    <div className={`w-16 flex-shrink-0 ${posInfo.bg} flex items-center justify-center border-r ${posInfo.border}`}>
                      {member.photo ? (
                        <img src={member.photo} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className={`w-10 h-10 rounded-full ${posInfo.color} flex items-center justify-center`}>
                          <span className="text-white font-semibold text-xs">
                            {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${posInfo.accent} mb-1`}>
                            <IconComp className="size-3" />
                            {posInfo.label}
                          </span>
                          <h4 className="font-semibold text-slate-900 text-[15px] leading-snug tracking-tight truncate">{member.name}</h4>
                          {member.bio && <p className="text-slate-400 text-xs mt-1.5 line-clamp-2 leading-relaxed">{member.bio}</p>}
                          <div className="flex flex-wrap items-center gap-3 mt-2.5 text-[11px] text-slate-400">
                            {member.since && (
                              <span className="flex items-center gap-1">
                                <Calendar className="size-3" /> Since {member.since}
                              </span>
                            )}
                            {member.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="size-3" /> {member.email}
                              </span>
                            )}
                          </div>
                        </div>
                        {editMode && (
                          <div className="flex gap-0.5 flex-shrink-0">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditMember(member)}><Edit className="size-3" /></Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deleteMember(member.id)}><Trash2 className="size-3 text-red-400" /></Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {currentMembers.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-14 text-center">
              <Users className="size-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No current board members added yet</p>
              {isAdmin && (
                <Button className="mt-4 bg-red-900 hover:bg-red-800 rounded-lg" onClick={openAddMember}>
                  <Plus className="size-4 mr-2" /> Add First Board Member
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 my-10">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <History className="size-5 text-slate-300" />
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      </div>

      {/* ====== Past Board Members (Hall of Honour) ====== */}
      <div className="space-y-6 mb-12">
        <button
          onClick={() => setShowPastMembers(!showPastMembers)}
          className="flex items-center gap-3 group cursor-pointer w-full"
        >
          <div className="w-1 h-8 bg-amber-600 rounded-full" />
          <h2 className="text-xl md:text-2xl font-semibold text-slate-800 tracking-tight">Hall of Honour</h2>
          <span className="text-xs text-slate-400 font-normal ml-1">Past Board Members</span>
          <div className="flex-1" />
          {showPastMembers ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
        </button>

        {showPastMembers && (
          <>
            {/* Tribute banner */}
            <div className="bg-gradient-to-r from-slate-50 to-stone-50 rounded-xl p-6 border border-slate-200">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Heart className="size-5 text-red-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-base tracking-tight">With Gratitude & Respect</h4>
                  <p className="text-slate-500 mt-1.5 text-sm leading-relaxed">
                    Adamstown Cricket Club owes its rich history and traditions to the dedicated leaders who served on our board over the years.
                    Their vision and love for the game laid the foundation upon which our club continues to grow.
                  </p>
                </div>
              </div>
            </div>

            {editMode && (
              <div className="flex justify-end">
                <Button size="sm" onClick={openAddPastMember} className="bg-red-900 hover:bg-red-800 rounded-lg text-xs">
                  <Plus className="size-3.5 mr-1" /> Add Past Member
                </Button>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {pastMembers.map(member => {
                const posInfo = getPositionInfo(member.position);
                const IconComp = posInfo.icon;
                return (
                  <Card key={member.id} className="overflow-hidden border border-slate-200 bg-white hover:shadow-sm transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        {member.photo ? (
                          <img src={member.photo} alt={member.name} className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-slate-500 font-semibold text-xs">
                              {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 text-[15px] tracking-tight">{member.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${posInfo.accent}`}>
                              <IconComp className="size-3" /> {posInfo.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                            <Calendar className="size-3" /> {member.yearsServed}
                          </p>
                          {member.contribution && (
                            <p className="text-slate-500 text-xs mt-2 leading-relaxed italic border-l-2 border-slate-200 pl-3">
                              {member.contribution}
                            </p>
                          )}
                        </div>
                        {editMode && (
                          <div className="flex flex-col gap-0.5 flex-shrink-0">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditPastMember(member)}><Edit className="size-3" /></Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deletePastMember(member.id)}><Trash2 className="size-3 text-red-400" /></Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {pastMembers.length === 0 && (
              <Card className="border-dashed bg-slate-50/50">
                <CardContent className="py-12 text-center">
                  <Award className="size-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-400 font-medium">No past board members recorded yet</p>
                  {isAdmin && (
                    <Button className="mt-4 bg-red-900 hover:bg-red-800 rounded-lg" onClick={openAddPastMember}>
                      <Plus className="size-4 mr-2" /> Honour a Past Member
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* ====== Board Positions Reference ====== */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 mb-6">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Briefcase className="size-4" /> Board Positions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
          {BOARD_POSITIONS.map(pos => {
            const IconComp = pos.icon;
            return (
              <div key={pos.value} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2.5 border border-slate-200 shadow-sm">
                <div className={`w-6 h-6 rounded-md ${pos.color} flex items-center justify-center`}>
                  <IconComp className="size-3 text-white" />
                </div>
                <span className="text-xs font-medium text-slate-600 leading-tight">{pos.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ====== Edit Current Member Dialog ====== */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingMember ? "Edit Board Member" : "Add Board Member"}</DialogTitle>
            <DialogDescription>
              {editingMember ? "Update the board member's details" : "Add a new member to the current board"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={memberForm.name} onChange={(e) => setMemberForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label>Position *</Label>
              <Select value={memberForm.position} onValueChange={(value) => setMemberForm(prev => ({ ...prev, position: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BOARD_POSITIONS.map(pos => {
                    const PosIcon = pos.icon;
                    return (
                      <SelectItem key={pos.value} value={pos.value}>
                        <span className="inline-flex items-center gap-2"><PosIcon className="size-3.5" /> {pos.label}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bio / Description</Label>
              <Input value={memberForm.bio} onChange={(e) => setMemberForm(prev => ({ ...prev, bio: e.target.value }))} placeholder="Brief description of their role and contributions" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>In position since</Label>
                <Input value={memberForm.since} onChange={(e) => setMemberForm(prev => ({ ...prev, since: e.target.value }))} placeholder="e.g., 2023" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={memberForm.email} onChange={(e) => setMemberForm(prev => ({ ...prev, email: e.target.value }))} placeholder="email@example.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Photo URL (optional)</Label>
              <Input value={memberForm.photo} onChange={(e) => setMemberForm(prev => ({ ...prev, photo: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button className="bg-red-900 hover:bg-red-800" onClick={saveMember}>
              <Save className="size-4 mr-2" /> {editingMember ? "Update" : "Add"} Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== Edit Past Member Dialog ====== */}
      <Dialog open={pastDialogOpen} onOpenChange={setPastDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingPast ? "Edit Past Board Member" : "Honour a Past Board Member"}</DialogTitle>
            <DialogDescription>
              {editingPast ? "Update their record" : "Add a past member to the Hall of Honour"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={pastForm.name} onChange={(e) => setPastForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label>Position Held</Label>
              <Select value={pastForm.position} onValueChange={(value) => setPastForm(prev => ({ ...prev, position: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BOARD_POSITIONS.map(pos => {
                    const PosIcon = pos.icon;
                    return (
                      <SelectItem key={pos.value} value={pos.value}>
                        <span className="inline-flex items-center gap-2"><PosIcon className="size-3.5" /> {pos.label}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Years Served *</Label>
              <Input value={pastForm.yearsServed} onChange={(e) => setPastForm(prev => ({ ...prev, yearsServed: e.target.value }))} placeholder="e.g., 2015 – 2022" />
            </div>
            <div className="space-y-2">
              <Label>Contribution / Legacy</Label>
              <Input value={pastForm.contribution} onChange={(e) => setPastForm(prev => ({ ...prev, contribution: e.target.value }))} placeholder="Their key contribution to the club" />
            </div>
            <div className="space-y-2">
              <Label>Photo URL (optional)</Label>
              <Input value={pastForm.photo} onChange={(e) => setPastForm(prev => ({ ...prev, photo: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPastDialogOpen(false)}>Cancel</Button>
            <Button className="bg-red-900 hover:bg-red-800" onClick={savePastMember}>
              <Save className="size-4 mr-2" /> {editingPast ? "Update" : "Add"} Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
