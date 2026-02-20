import { useState, useEffect } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Users, RefreshCw, Shield } from "lucide-react";
import { toast } from "sonner";

interface UserManagementPageProps {
  apiUrl: string;
  apiKey: string; // This is actually the user's access token
}

interface User {
  userId: string;
  email: string;
  name: string;
  role: string;
  age?: number;
  createdAt: string;
}

export function UserManagementPage({ apiUrl, apiKey }: UserManagementPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  // apiKey is actually the user's access token (naming maintained for compatibility)
  const accessToken = apiKey;
  
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    
    try {
      // Fetch users from backend API
      
      // Fetch users from backend API instead of Supabase Admin
      const response = await fetch(`${apiUrl}/admin/members`, {
        
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error fetching users:", errorData);
        toast.error(errorData.error || "Failed to fetch users");
        setLoadingUsers(false);
        return;
      }
      
      const data = await response.json();
      
      if (!data.success) {
        console.error("Error fetching users:", data.error);
        toast.error(data.error || "Failed to fetch users");
        setLoadingUsers(false);
        return;
      }
      
      console.log("✅ Fetched users from backend:", data.members?.length || 0);
      
      // Transform backend users to our User format
      const transformedUsers: User[] = (data.members || []).map((member: any) => ({
        userId: member.id || member.userId || member.email,
        email: member.email || "No email",
        name: member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || "Unknown",
        role: member.role || "member",
        createdAt: member.createdAt || new Date().toISOString(),
      }));
      
      console.log("Transformed users:", transformedUsers);
      setUsers(transformedUsers);
      setLoadingUsers(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
      setLoadingUsers(false);
    }
  };
  


  const updateUserRole = async (userId: string, newRole: string) => {
    setUpdatingRole(userId);
    
    try {
      const response = await fetch(`${apiUrl}/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`User role updated to ${formatRole(newRole)}`);
        // Update local state
        setUsers(users.map(user => 
          user.userId === userId ? { ...user, role: newRole } : user
        ));
      } else {
        toast.error(`Failed to update role: ${data.error}`);
      }
    } catch (error) {
      console.error("Error updating user role:", error);
      toast.error("Failed to update user role");
    } finally {
      setUpdatingRole(null);
    }
  };

  const formatRole = (role: string): string => {
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-700 border-purple-300";
      case "fixture_secretary":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "accountant":
        return "bg-green-100 text-green-700 border-green-300";
      case "media_admin":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "coach":
        return "bg-orange-100 text-orange-700 border-orange-300";
      case "head_coach":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-red-900">User Management</h2>
          <p className="text-gray-600 mt-2">
            Manage user roles and permissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchUsers}
            disabled={loadingUsers}
            className="bg-red-900 hover:bg-red-800"
          >
            <RefreshCw className={`size-4 mr-2 ${loadingUsers ? "animate-spin" : ""}`} />
            Refresh Users
          </Button>
        </div>
      </div>

      {/* Role Descriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            Role Descriptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Badge className={getRoleBadgeColor("admin")}>Admin</Badge>
              <p className="text-sm text-gray-600">Full access to all features and user management</p>
            </div>
            <div className="space-y-1">
              <Badge className={getRoleBadgeColor("fixture_secretary")}>Fixture Secretary</Badge>
              <p className="text-sm text-gray-600">Can manage fixtures and match schedules</p>
            </div>
            <div className="space-y-1">
              <Badge className={getRoleBadgeColor("accountant")}>Accountant</Badge>
              <p className="text-sm text-gray-600">Access to financial records and reports</p>
            </div>
            <div className="space-y-1">
              <Badge className={getRoleBadgeColor("media_admin")}>Media Admin</Badge>
              <p className="text-sm text-gray-600">Manage social media and club communications</p>
            </div>
            <div className="space-y-1">
              <Badge className={getRoleBadgeColor("coach")}>Coach</Badge>
              <p className="text-sm text-gray-600">Can set availability and manage training sessions</p>
            </div>
            <div className="space-y-1">
              <Badge className={getRoleBadgeColor("head_coach")}>Head Coach</Badge>
              <p className="text-sm text-gray-600">Manage training settings and payment configuration</p>
            </div>
            <div className="space-y-1">
              <Badge className={getRoleBadgeColor("member")}>Member</Badge>
              <p className="text-sm text-gray-600">Standard member access to club features</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      {loadingUsers ? (
        <div className="text-center py-12">
          <RefreshCw className="size-8 mx-auto animate-spin text-red-900 mb-4" />
          <p className="text-gray-500">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="size-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No users found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" />
              Registered Users ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="text-left p-3 font-semibold text-gray-700">Username (Email)</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Full Name</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Member Since</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Current Role</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Change Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <tr 
                      key={user.userId} 
                      className={`border-b border-gray-100 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    >
                      <td className="p-3">
                        <span className="text-sm text-gray-600">{user.email}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-gray-900">{user.name || 'N/A'}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-600">
                          {new Date(user.createdAt).toLocaleDateString("en-IE", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {formatRole(user.role)}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Select
                          value={user.role}
                          onValueChange={(value) => updateUserRole(user.userId, value)}
                          disabled={updatingRole === user.userId}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="fixture_secretary">Fixture Secretary</SelectItem>
                            <SelectItem value="accountant">Accountant</SelectItem>
                            <SelectItem value="media_admin">Media Admin</SelectItem>
                            <SelectItem value="coach">Coach</SelectItem>
                            <SelectItem value="head_coach">Head Coach</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}