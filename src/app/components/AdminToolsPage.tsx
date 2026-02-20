import { useState } from "react";
import { Trash2, AlertTriangle, Database, Users, UserPlus } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";

interface AdminToolsPageProps {
  apiUrl: string;
  accessToken: string;
}

export function AdminToolsPage({ apiUrl, accessToken }: AdminToolsPageProps) {
  const [deleting, setDeleting] = useState(false);
  const [grantingAdmin, setGrantingAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [checkingUser, setCheckingUser] = useState(false);
  const [userExists, setUserExists] = useState<boolean | null>(null);

  const checkIfUserExists = async () => {
    if (!adminEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setCheckingUser(true);
    try {
      console.log(`🔍 Checking if user exists: ${adminEmail.trim()}`);
      
      const response = await fetch(`${apiUrl}/admin/check-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: adminEmail.trim() }),
      });

      const data = await response.json();
      console.log(`User check result:`, data);

      if (data.success) {
        setUserExists(data.exists);
        if (data.exists) {
          toast.success(`✅ User exists! Current role: ${data.user?.role || 'unknown'}`);
        } else {
          toast.error(`❌ User not found. They need to log in at least once before granting admin rights.`);
        }
      } else {
        toast.error(`Failed to check user: ${data.error}`);
      }
    } catch (error) {
      console.error("Error checking user:", error);
      toast.error(`Failed to check user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCheckingUser(false);
    }
  };

  const handleDeleteAllUsers = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`${apiUrl}/admin/delete-all-users`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Successfully deleted ${data.deletedCount} users`);
      } else {
        toast.error(data.error || "Failed to delete users");
      }
    } catch (error) {
      console.error("Error deleting users:", error);
      toast.error("Failed to delete users");
    } finally {
      setDeleting(false);
    }
  };

  const handleGrantAdminRights = async () => {
    if (!adminEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setGrantingAdmin(true);
    try {
      console.log(`🔧 Attempting to grant admin rights to: ${adminEmail.trim()}`);
      console.log(`API URL: ${apiUrl}/admin/grant-admin-rights`);
      
      const response = await fetch(`${apiUrl}/admin/grant-admin-rights`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email: adminEmail.trim() }),
      });

      console.log(`Response status: ${response.status}`);
      
      const data = await response.json();
      console.log(`Response data:`, data);

      if (data.success) {
        toast.success(`✅ Admin rights granted to ${adminEmail}! User needs to log out and log back in.`);
      } else {
        console.error(`Failed to grant admin rights:`, data.error);
        toast.error(`Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error granting admin rights:", error);
      toast.error(`Failed to grant admin rights: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGrantingAdmin(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-red-900 to-red-800 text-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Database className="size-8" />
            <div>
              <CardTitle className="text-3xl">Admin Tools</CardTitle>
              <CardDescription className="text-red-100">
                Dangerous operations - use with extreme caution
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Warning Banner */}
      <Card className="border-yellow-500 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-6 text-yellow-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-yellow-900 mb-2">⚠️ Warning: Irreversible Operations</h3>
              <p className="text-sm text-yellow-800">
                The tools on this page perform irreversible database operations. Always make sure you understand
                what you're doing before proceeding. These operations cannot be undone.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete All Users */}
      <Card className="border-red-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-900">
            <Users className="size-6" />
            Delete All Users
          </CardTitle>
          <CardDescription>
            Remove all user accounts from the database (useful for testing/development)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-semibold text-red-900 mb-2">This will delete:</h4>
            <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
              <li>All user accounts and profile data</li>
              <li>All user access tokens</li>
              <li>All user bookings and associated data</li>
              <li>All user ID mappings</li>
            </ul>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">This will NOT delete:</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Fixtures, teams, players, and results</li>
              <li>Team configurations and selections</li>
              <li>Training settings and coach availability</li>
              <li>App settings and system configuration</li>
            </ul>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="lg" disabled={deleting} className="w-full">
                <Trash2 className="size-5 mr-2" />
                {deleting ? "Deleting All Users..." : "Delete All Users"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-red-900">
                  <AlertTriangle className="size-6" />
                  Are you absolutely sure?
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>
                    This action <strong>cannot be undone</strong>. This will permanently delete all user accounts
                    from the database.
                  </p>
                  <p className="text-red-600 font-semibold">
                    You will also be logged out and will need to create a new account.
                  </p>
                  <p>
                    Only proceed if you're absolutely certain you want to delete all users (e.g., for testing purposes).
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel - Keep All Users</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAllUsers}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Yes, Delete All Users
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Grant Admin Rights */}
      <Card className="border-green-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <UserPlus className="size-6" />
            Grant Admin Rights
          </CardTitle>
          <CardDescription>
            Grant admin rights to a user by their email address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">This will grant:</h4>
            <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
              <li>Admin rights to the specified user</li>
            </ul>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">This will NOT grant:</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Admin rights to any other user</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminEmail">Email Address</Label>
            <Input
              id="adminEmail"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="Enter user email"
            />
          </div>

          <Button
            size="lg"
            disabled={checkingUser}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white"
            onClick={checkIfUserExists}
          >
            <UserPlus className="size-5 mr-2" />
            {checkingUser ? "Checking User..." : "Check User"}
          </Button>

          {userExists !== null && (
            <div className="mt-2">
              {userExists ? (
                <p className="text-green-600">User exists. You can proceed to grant admin rights.</p>
              ) : (
                <p className="text-red-600">User does not exist. They need to log in at least once.</p>
              )}
            </div>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="lg" disabled={grantingAdmin} className="w-full bg-green-700 hover:bg-green-800 text-white">
                <UserPlus className="size-5 mr-2" />
                {grantingAdmin ? "Granting Admin Rights..." : "Grant Admin Rights"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-green-900">
                  <AlertTriangle className="size-6" />
                  Are you absolutely sure?
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>
                    This action <strong>cannot be undone</strong>. This will permanently grant admin rights
                    to the specified user.
                  </p>
                  <p className="text-red-600 font-semibold">
                    The user will need to log out and log back in to access admin features.
                  </p>
                  <p>
                    Only proceed if you're absolutely certain you want to grant admin rights to this user.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel - Do Not Grant</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleGrantAdminRights}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Yes, Grant Admin Rights
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">💡 Usage Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-700 space-y-2">
          <p>
            <strong>When to use this:</strong> When you want to reset your user database completely for testing
            or when starting fresh with real data after development.
          </p>
          <p>
            <strong>What happens next:</strong> After deletion, you can create new user accounts from scratch.
            The signup flow will work normally.
          </p>
          <p>
            <strong>Best practice:</strong> Make sure you have admin credentials ready to create a new admin account
            after deletion, or you won't be able to access admin features.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}