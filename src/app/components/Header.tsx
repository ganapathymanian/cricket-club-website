import { Menu, LogOut, User, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface HeaderProps {
  onMenuClick: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  user?: { email: string; name?: string; role?: string };
  onLogout?: () => void;
}

export function Header({ onMenuClick, activeTab, onTabChange, user, onLogout }: HeaderProps) {
  // Check if a tab is active in a group
  const isGroupActive = (tabIds: string[]) => tabIds.includes(activeTab);

  // Public tabs - always visible
  const publicTabs = [
    { id: "home", label: "Home" },
    { id: "fixtures", label: "Fixtures" },
    { id: "results", label: "Results" },
    { id: "board-members", label: "Board" },
    { id: "club-flyer", label: "Club Flyer" },
  ];

  // Member tabs - visible after login
  const memberTabs = [
    { id: "players", label: "Players" },
    { id: "stats", label: "Stats" },
  ];

  // Match Management dropdown - for fixture secretary and admin
  const matchManagementTabs = [
    { id: "availability", label: "Availability" },
    { id: "team-sheet", label: "Team Sheet" },
    { id: "manage-fixtures", label: "Manage Fixtures" },
    { id: "fixture-generator", label: "Fixture Generator" },
    { id: "selection-committee-starring", label: "Members Starring" },
    { id: "live-scoring", label: "Live Scoring" },
  ];

  // Training dropdown - for coaches and admin
  const trainingTabs = [
    { id: "training", label: "Training Bookings" },
    { id: "coach-plan", label: "Coach Plan" },
    { id: "training-admin", label: "Training Settings" },
    { id: "attendance-scanner", label: "📷 Photo Attendance" },
  ];

  // Admin dropdown - for admins only
  const adminTabs = [
    { id: "teams", label: "Teams" },
    { id: "admin", label: "Admin Settings" },
    { id: "user-management", label: "User Management" },
    { id: "admin-members", label: "Members" },
  ];

  // Determine visibility based on role
  const showMatchManagement = user && (user.role === "fixture_secretary" || user.role === "admin");
  const showTraining = user && (user.role === "coach" || user.role === "head_coach" || user.role === "accountant" || user.role === "admin");
  const showAdmin = user && user.role === "admin";

  return (
    <header className="bg-gradient-to-r from-red-900 to-red-800 text-white shadow-lg">
      <div className="container mx-auto px-4">
        {/* Top bar with logo and user info */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-white hover:bg-red-800"
              onClick={onMenuClick}
            >
              <Menu className="size-6" />
            </Button>
            <div className="flex items-center gap-4">
              {/* Logo placeholder - replace with actual logo */}
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-red-900 font-bold text-xl">ACC</span>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Adamstown Cricket Club</h1>
                <p className="text-sm text-red-100">Established 1950</p>
              </div>
            </div>
          </div>
          
          {/* User info and logout */}
          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <p className="text-xs text-red-200 mb-0.5">Logged in as</p>
                <p className="font-semibold text-white">{user.name || user.email}</p>
              </div>
              {onLogout && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-red-800 border border-red-600 hover:border-red-500"
                  onClick={onLogout}
                >
                  <LogOut className="size-4 mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              )}
            </div>
          )}
        </div>
        
        {/* Navigation tabs */}
        <nav className="hidden md:flex gap-1 pb-2">
          {/* Public Tabs - Always Visible */}
          {publicTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-white text-red-900"
                  : "text-red-100 hover:bg-red-800"
              }`}
            >
              {tab.label}
            </button>
          ))}

          {/* Login Tab - Only when not logged in */}
          {!user && (
            <button
              onClick={() => onTabChange("login")}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === "login"
                  ? "bg-white text-red-900"
                  : "text-red-100 hover:bg-red-800"
              }`}
            >
              Login
            </button>
          )}

          {/* Member Tabs - Visible after login */}
          {user && memberTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-white text-red-900"
                  : "text-red-100 hover:bg-red-800"
              }`}
            >
              {tab.label}
            </button>
          ))}

          {/* Match Management Dropdown */}
          {showMatchManagement && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-1 ${
                    isGroupActive(matchManagementTabs.map(t => t.id))
                      ? "bg-white text-red-900"
                      : "text-red-100 hover:bg-red-800"
                  }`}
                >
                  Match Management
                  <ChevronDown className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white">
                {matchManagementTabs.map((tab) => (
                  <DropdownMenuItem
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`cursor-pointer ${
                      activeTab === tab.id ? "bg-red-50 text-red-900 font-semibold" : ""
                    }`}
                  >
                    {tab.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Training Dropdown */}
          {showTraining && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-1 ${
                    isGroupActive(trainingTabs.map(t => t.id))
                      ? "bg-white text-red-900"
                      : "text-red-100 hover:bg-red-800"
                  }`}
                >
                  Training
                  <ChevronDown className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white">
                {trainingTabs.map((tab) => (
                  <DropdownMenuItem
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`cursor-pointer ${
                      activeTab === tab.id ? "bg-red-50 text-red-900 font-semibold" : ""
                    }`}
                  >
                    {tab.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Admin Dropdown */}
          {showAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-1 ${
                    isGroupActive(adminTabs.map(t => t.id))
                      ? "bg-white text-red-900"
                      : "text-red-100 hover:bg-red-800"
                  }`}
                >
                  Admin
                  <ChevronDown className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white">
                {adminTabs.map((tab) => (
                  <DropdownMenuItem
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`cursor-pointer ${
                      activeTab === tab.id ? "bg-red-50 text-red-900 font-semibold" : ""
                    }`}
                  >
                    {tab.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>
    </header>
  );
}