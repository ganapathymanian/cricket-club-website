import { useState, useEffect } from "react";
import { Users, Search, Filter, Download, Calendar, Mail, Phone, MapPin, Shield, UserCheck, Baby, Award, Camera } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { ProfilePhotoUpload } from "./ProfilePhotoUpload";

interface Member {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  gender: string;
  dateOfBirth: string;
  isMinor: boolean;
  mobileNumber: string;
  whatsappNumber: string;
  facebookId?: string;
  address: string;
  province?: string;
  eircode?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  cricketLeinsterUserId?: string;
  oldAccUserId?: string;
  dataConsent: boolean;
  socialMediaPhotoConsent?: boolean;
  hardballApproval?: boolean;
  memberJoinedDate?: string;
  createdAt: string;
  lastLoginAt?: string;
  role: string;
  profilePhoto?: string | null;
}

interface AdminMembersPageProps {
  apiUrl: string;
  apiKey: string;
  accessToken: string;
}

export function AdminMembersPage({ apiUrl, apiKey, accessToken }: AdminMembersPageProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "adult" | "youth">("all");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [editingMemberJoinedDate, setEditingMemberJoinedDate] = useState<string>("");

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await fetch(`${apiUrl}/admin/members`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setMembers(data.members);
      } else {
        toast.error(data.error || "Failed to fetch members");
      }
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  const handleViewMember = async (member: Member) => {
    setSelectedMember(member);
    setEditingMemberJoinedDate(member.memberJoinedDate || "");
    setShowMemberDialog(true);
    
    // Load profile photo
    try {
      const response = await fetch(`${apiUrl}/users/${member.id}/profile-photo`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (data.success && data.profilePhoto) {
        setSelectedMember(prev => prev ? { ...prev, profilePhoto: data.profilePhoto } : null);
      }
    } catch (error) {
      console.error("Error loading profile photo:", error);
    }
  };

  const handleUploadMemberPhoto = async (photo: string | null) => {
    if (!selectedMember) return;
    
    try {
      const response = await fetch(`${apiUrl}/users/${selectedMember.id}/profile-photo`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ profilePhoto: photo }),
      });
      
      const data = await response.json();
      if (data.success) {
        setSelectedMember(prev => prev ? { ...prev, profilePhoto: photo } : null);
        toast.success("Profile photo updated");
      } else {
        toast.error(data.error || "Failed to update photo");
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Failed to upload photo");
    }
  };

  const handleUpdateMemberJoinedDate = async () => {
    if (!selectedMember) return;

    try {
      const response = await fetch(`${apiUrl}/admin/members/${selectedMember.id}/joined-date`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ memberJoinedDate: editingMemberJoinedDate }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Member joined date updated successfully");
        setMembers(members.map(m => 
          m.id === selectedMember.id 
            ? { ...m, memberJoinedDate: editingMemberJoinedDate }
            : m
        ));
        setSelectedMember({ ...selectedMember, memberJoinedDate: editingMemberJoinedDate });
      } else {
        toast.error(data.error || "Failed to update joined date");
      }
    } catch (error) {
      console.error("Error updating joined date:", error);
      toast.error("Failed to update joined date");
    }
  };

  const exportToCSV = () => {
    const headers = [
      "First Name", "Last Name", "Email", "Gender", "Date of Birth", "Type",
      "Mobile", "WhatsApp", "Facebook ID", "Address", "Province", "Eircode",
      "Emergency Contact Name", "Emergency Contact Phone", "Emergency Contact Relationship",
      "Cricket Leinster ID", "Old ACC User ID", "Member Joined Date",
      "Privacy Consent", "Social Media Photo Consent", "Hardball Approval",
      "Created At", "Last Login", "Role"
    ];

    const rows = filteredMembers.map(member => [
      member.firstName,
      member.lastName,
      member.email,
      member.gender,
      member.dateOfBirth,
      member.isMinor ? "Youth" : "Adult",
      member.mobileNumber,
      member.whatsappNumber,
      member.facebookId || "",
      member.address,
      member.province || "",
      member.eircode || "",
      member.emergencyContactName,
      member.emergencyContactPhone,
      member.emergencyContactRelationship,
      member.cricketLeinsterUserId || "",
      member.oldAccUserId || "",
      member.memberJoinedDate || "",
      member.dataConsent ? "Yes" : "No",
      member.socialMediaPhotoConsent ? "Yes" : "No",
      member.hardballApproval ? "Yes" : "No",
      new Date(member.createdAt).toLocaleDateString(),
      member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleDateString() : "Never",
      member.role
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `members-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success("Members exported to CSV");
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = 
      member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = 
      filterType === "all" ||
      (filterType === "adult" && !member.isMinor) ||
      (filterType === "youth" && member.isMinor);

    return matchesSearch && matchesFilter;
  });

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="size-12 border-4 border-red-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-red-900 to-red-800 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="size-8" />
              <div>
                <CardTitle className="text-3xl">Club Members</CardTitle>
                <CardDescription className="text-red-100">
                  Comprehensive member management and information
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {members.length} Total Members
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="size-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                <SelectItem value="adult">Adults Only</SelectItem>
                <SelectItem value="youth">Youth Only</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={exportToCSV} variant="outline">
              <Download className="size-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <div className="flex gap-4 mt-4">
            <Badge variant="outline" className="text-sm">
              Adults: {members.filter(m => !m.isMinor).length}
            </Badge>
            <Badge variant="outline" className="text-sm">
              Youth: {members.filter(m => m.isMinor).length}
            </Badge>
            <Badge variant="outline" className="text-sm">
              Showing: {filteredMembers.length}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No members found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => (
                    <TableRow key={member.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200">
                            {member.profilePhoto ? (
                              <img src={member.profilePhoto} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-gray-400">
                                {member.firstName?.[0]}{member.lastName?.[0]}
                              </span>
                            )}
                          </div>
                          {member.isMinor && <Baby className="size-4 text-orange-600" />}
                          {member.firstName} {member.lastName}
                        </div>
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <Badge variant={member.isMinor ? "destructive" : "default"}>
                          {member.isMinor ? "Youth" : "Adult"}
                        </Badge>
                      </TableCell>
                      <TableCell>{calculateAge(member.dateOfBirth)}</TableCell>
                      <TableCell>{member.mobileNumber}</TableCell>
                      <TableCell>
                        {member.memberJoinedDate 
                          ? new Date(member.memberJoinedDate).toLocaleDateString()
                          : <span className="text-gray-400">Not set</span>
                        }
                      </TableCell>
                      <TableCell>
                        {member.lastLoginAt 
                          ? new Date(member.lastLoginAt).toLocaleDateString()
                          : <span className="text-gray-400">Never</span>
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{member.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewMember(member)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Member Details Dialog */}
      <Dialog open={showMemberDialog} onOpenChange={setShowMemberDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="size-6 text-red-900" />
              Member Details: {selectedMember?.firstName} {selectedMember?.lastName}
            </DialogTitle>
            <DialogDescription>
              Complete member information and settings
            </DialogDescription>
          </DialogHeader>

          {selectedMember && (
            <div className="space-y-6 py-4">
              {/* Profile Photo */}
              <div className="space-y-3">
                <h3 className="font-bold text-lg border-b pb-2 flex items-center gap-2">
                  <Camera className="size-5" />
                  Profile Photo
                </h3>
                <ProfilePhotoUpload
                  currentPhoto={selectedMember.profilePhoto}
                  onPhotoChange={handleUploadMemberPhoto}
                  size="lg"
                  label="Member Photo"
                  showRemove={true}
                />
              </div>

              {/* Basic Information */}
              <div className="space-y-3">
                <h3 className="font-bold text-lg border-b pb-2">Basic Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600">First Name</Label>
                    <p className="font-medium">{selectedMember.firstName}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Last Name</Label>
                    <p className="font-medium">{selectedMember.lastName}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Email</Label>
                    <p className="font-medium flex items-center gap-2">
                      <Mail className="size-4 text-gray-400" />
                      {selectedMember.email}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Gender</Label>
                    <p className="font-medium capitalize">{selectedMember.gender}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Date of Birth</Label>
                    <p className="font-medium flex items-center gap-2">
                      <Calendar className="size-4 text-gray-400" />
                      {new Date(selectedMember.dateOfBirth).toLocaleDateString()} ({calculateAge(selectedMember.dateOfBirth)} years)
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Member Type</Label>
                    <Badge variant={selectedMember.isMinor ? "destructive" : "default"} className="mt-1">
                      {selectedMember.isMinor ? "Youth (Under 18)" : "Adult"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-3">
                <h3 className="font-bold text-lg border-b pb-2">Contact Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600">Mobile Number</Label>
                    <p className="font-medium flex items-center gap-2">
                      <Phone className="size-4 text-gray-400" />
                      {selectedMember.mobileNumber}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600">WhatsApp Number</Label>
                    <p className="font-medium">{selectedMember.whatsappNumber}</p>
                  </div>
                  {selectedMember.facebookId && (
                    <div>
                      <Label className="text-gray-600">Facebook ID</Label>
                      <p className="font-medium">{selectedMember.facebookId}</p>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <Label className="text-gray-600">Address</Label>
                    <p className="font-medium flex items-start gap-2">
                      <MapPin className="size-4 text-gray-400 mt-1" />
                      {selectedMember.address}
                    </p>
                  </div>
                  {selectedMember.province && (
                    <div>
                      <Label className="text-gray-600">Province</Label>
                      <p className="font-medium">{selectedMember.province}</p>
                    </div>
                  )}
                  {selectedMember.eircode && (
                    <div>
                      <Label className="text-gray-600">Eircode</Label>
                      <p className="font-medium">{selectedMember.eircode}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-3">
                <h3 className="font-bold text-lg border-b pb-2">Emergency Contact</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600">Name</Label>
                    <p className="font-medium">{selectedMember.emergencyContactName}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Phone</Label>
                    <p className="font-medium">{selectedMember.emergencyContactPhone}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Relationship</Label>
                    <p className="font-medium capitalize">{selectedMember.emergencyContactRelationship}</p>
                  </div>
                </div>
              </div>

              {/* Cricket Information */}
              <div className="space-y-3">
                <h3 className="font-bold text-lg border-b pb-2 flex items-center gap-2">
                  <Award className="size-5" />
                  Cricket Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {selectedMember.cricketLeinsterUserId && (
                    <div>
                      <Label className="text-gray-600">Cricket Leinster User ID</Label>
                      <p className="font-medium">{selectedMember.cricketLeinsterUserId}</p>
                    </div>
                  )}
                  {selectedMember.oldAccUserId && (
                    <div>
                      <Label className="text-gray-600">Old ACC User ID</Label>
                      <p className="font-medium">{selectedMember.oldAccUserId}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Membership Dates */}
              <div className="space-y-3">
                <h3 className="font-bold text-lg border-b pb-2">Membership Dates</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600">Account Created</Label>
                    <p className="font-medium">
                      {new Date(selectedMember.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Last Login</Label>
                    <p className="font-medium">
                      {selectedMember.lastLoginAt 
                        ? new Date(selectedMember.lastLoginAt).toLocaleDateString()
                        : "Never"
                      }
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="joinedDate" className="text-gray-600">Member Joined Date (Manual Entry)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="joinedDate"
                        type="date"
                        value={editingMemberJoinedDate}
                        onChange={(e) => setEditingMemberJoinedDate(e.target.value)}
                      />
                      <Button onClick={handleUpdateMemberJoinedDate} size="sm">
                        Update
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Consents and Approvals */}
              <div className="space-y-3">
                <h3 className="font-bold text-lg border-b pb-2 flex items-center gap-2">
                  <Shield className="size-5" />
                  Consents & Approvals
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={selectedMember.dataConsent} disabled />
                    <Label className="text-sm">Privacy & Data Storage Consent</Label>
                  </div>
                  {selectedMember.isMinor && (
                    <>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={selectedMember.socialMediaPhotoConsent || false} disabled />
                        <Label className="text-sm">Parent Approval for Social Media Photos</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={selectedMember.hardballApproval || false} disabled />
                        <Label className="text-sm">Approval to Play Hardball Cricket</Label>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Role */}
              <div className="space-y-3">
                <h3 className="font-bold text-lg border-b pb-2">Account Role</h3>
                <Badge variant="outline" className="text-base px-4 py-2">
                  {selectedMember.role}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
