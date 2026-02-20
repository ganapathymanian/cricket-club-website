import { X, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  user?: { email: string; name?: string; role?: string };
}

export function MobileMenu({ isOpen, onClose, activeTab, onTabChange, user }: MobileMenuProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

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

  // Match Management section
  const matchManagementTabs = [
    { id: "availability", label: "Availability" },
    { id: "team-sheet", label: "Team Sheet" },
    { id: "manage-fixtures", label: "Manage Fixtures" },
    { id: "fixture-generator", label: "Fixture Generator" },
    { id: "selection-committee-starring", label: "Team Selection" },
    { id: "live-scoring", label: "Live Scoring" },
  ];

  // Training section
  const trainingTabs = [
    { id: "training", label: "Training Bookings" },
    { id: "coach-plan", label: "Coach Plan" },
    { id: "training-admin", label: "Training Settings" },
    { id: "attendance-scanner", label: "📷 Photo Attendance" },
  ];

  // Admin section
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

  if (!isOpen) return null;

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl z-50 md:hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-red-900">Menu</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-5" />
          </Button>
        </div>
        
        {/* User info for mobile */}
        {user && (
          <div className="p-4 bg-red-50 border-b">
            <p className="text-xs text-gray-600 mb-1">Logged in as</p>
            <p className="font-semibold text-red-900">{user.name || user.email}</p>
          </div>
        )}
        
        <nav className="p-4 overflow-y-auto max-h-[calc(100vh-150px)]">
          {/* Public Tabs */}
          {publicTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`w-full text-left px-4 py-3 rounded-lg mb-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-red-900 text-white"
                  : "text-gray-700 hover:bg-red-50"
              }`}
            >
              {tab.label}
            </button>
          ))}

          {/* Login Tab */}
          {!user && (
            <button
              onClick={() => handleTabClick("login")}
              className={`w-full text-left px-4 py-3 rounded-lg mb-2 font-medium transition-colors ${
                activeTab === "login"
                  ? "bg-red-900 text-white"
                  : "text-gray-700 hover:bg-red-50"
              }`}
            >
              Login
            </button>
          )}

          {/* Member Tabs */}
          {user && memberTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`w-full text-left px-4 py-3 rounded-lg mb-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-red-900 text-white"
                  : "text-gray-700 hover:bg-red-50"
              }`}
            >
              {tab.label}
            </button>
          ))}

          {/* Match Management Section */}
          {showMatchManagement && (
            <div className="mb-2">
              <button
                onClick={() => setExpandedSection(expandedSection === "match" ? null : "match")}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-red-50"
              >
                <span>Match Management</span>
                {expandedSection === "match" ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </button>
              {expandedSection === "match" && (
                <div className="ml-4 mt-1 space-y-1">
                  {matchManagementTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabClick(tab.id)}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? "bg-red-900 text-white"
                          : "text-gray-600 hover:bg-red-50"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Training Section */}
          {showTraining && (
            <div className="mb-2">
              <button
                onClick={() => setExpandedSection(expandedSection === "training" ? null : "training")}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-red-50"
              >
                <span>Training</span>
                {expandedSection === "training" ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </button>
              {expandedSection === "training" && (
                <div className="ml-4 mt-1 space-y-1">
                  {trainingTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabClick(tab.id)}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? "bg-red-900 text-white"
                          : "text-gray-600 hover:bg-red-50"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Admin Section */}
          {showAdmin && (
            <div className="mb-2">
              <button
                onClick={() => setExpandedSection(expandedSection === "admin" ? null : "admin")}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-red-50"
              >
                <span>Admin</span>
                {expandedSection === "admin" ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </button>
              {expandedSection === "admin" && (
                <div className="ml-4 mt-1 space-y-1">
                  {adminTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabClick(tab.id)}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? "bg-red-900 text-white"
                          : "text-gray-600 hover:bg-red-50"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </>
  );
}