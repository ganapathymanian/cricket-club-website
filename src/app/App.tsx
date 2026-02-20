import { useState, useEffect } from "react";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { 
  apiUrl as configApiUrl, 
  isLocalBackend,
  storeLocalToken,
  storeLocalUser,
  getLocalToken,
  getLocalUser,
  removeLocalToken
} from "../../utils/config";
import { WhatsAppContact } from "./components/WhatsAppContact";
import { Header } from "./components/Header";
import { MobileMenu } from "./components/MobileMenu";
import { HomePage } from "./components/HomePage";
import { FixturesPage } from "./components/FixturesPage";
import { ResultsPage } from "./components/ResultsPage";
import { AuthPage } from "./components/AuthPage";
import { TeamsPage } from "./components/TeamsPage";
import { PlayersPage } from "./components/PlayersPage";
import { AdminPage } from "./components/AdminPage";
import { AvailabilityPage } from "./components/AvailabilityPage";
import { StatsPage } from "./components/StatsPage";
import { UserManagementPage } from "./components/UserManagementPage";
import { ManageFixturesPage } from "./components/ManageFixturesPage";
import { FixtureGeneratorPage } from "./components/FixtureGeneratorPage";
import { TeamSheetPage } from "./components/TeamSheetPage";
import { TrainingPage } from "./components/TrainingPage";
import { CoachPlanPage } from "./components/CoachPlanPage";
import { TrainingAdminPage } from "./components/TrainingAdminPage";
import { AdminMembersPage } from "./components/AdminMembersPage";
import { AttendanceScannerPage } from "./components/AttendanceScannerPage";
import { SelectionCommitteeStarringPage } from "./components/SelectionCommitteeStarringPage";
import { BoardMembersPage } from "./components/BoardMembersPage";
import { ClubFlyerPage } from "./components/ClubFlyerPage";
import { LiveScoringPage } from "./components/LiveScoringPage";

interface User {
  email: string;
  name?: string;
  accessToken: string;
  role?: string;
  userId?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isInitialAuth, setIsInitialAuth] = useState(true);

  // Use local backend configuration
  const apiUrl = configApiUrl;

  useEffect(() => {
    checkSession();
    initializeClub();
  }, []);

  // Handle hash changes in URL
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1); // Remove the # symbol
      if (hash) {
        setActiveTab(hash);
      }
    };

    // Check hash on initial load
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);

    // Listen for custom navigate events (from ManageFixturesPage etc.)
    const handleNavigate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setActiveTab(detail);
        window.location.hash = detail;
      }
    };
    window.addEventListener('navigate', handleNavigate);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('navigate', handleNavigate);
    };
  }, []);

  const checkSession = async () => {
    try {
      // Check for stored JWT token
      const storedToken = getLocalToken();
      const storedUser = getLocalUser();
      
      if (storedToken && storedUser) {
        // Verify token is still valid by calling /api/auth/me
        try {
          const response = await fetch(`${apiUrl}/auth/me`, {
            headers: { 'Authorization': `Bearer ${storedToken}` }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
              setUser({
                email: data.user.email,
                name: data.user.name,
                accessToken: storedToken,
                role: data.user.role,
                userId: data.user.id
              });
            }
          } else {
            removeLocalToken();
          }
        } catch (err) {
          removeLocalToken();
        }
      }
    } catch (error) {
      // Session check failed silently
    } finally {
      setCheckingSession(false);
    }
  };

  const initializeClub = async () => {
    try {
      const storedToken = getLocalToken();
      const response = await fetch(`${apiUrl}/init-club`, {
        method: "POST",
        headers: {
          ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      setInitialized(true);
    } catch (error) {
      console.error("Error initializing club:", error);
      setInitialized(true); // Still set to true to show the UI
    }
  };

  const handleLoginSuccess = async (accessToken: string, userEmail: string, userName?: string, userRole?: string, userId?: string) => {
    // Role is determined server-side only - never override from client
    // The server's /api/auth/login and /api/auth/me responses include the authoritative role

    const userObject = {
      email: userEmail,
      name: userName,
      accessToken,
      role: userRole,
      userId,
    };

    // Store token locally for local backend mode
    if (isLocalBackend()) {
      storeLocalToken(accessToken);
      storeLocalUser(userObject);
    }

    setUser(userObject);
    toast.success(`Welcome back${userName ? ", " + userName : ""}!${userRole ? " (" + userRole + ")" : ""}`);
    // Redirect to home after login
    setActiveTab("home");
  };

  const handleLogout = async () => {
    try {
      // Clear local storage and logout
      removeLocalToken();
      setUser(null);
      setActiveTab("home");
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Error logging out");
    }
  };

  const handleTabChange = (tab: string) => {
    // Protect Availability, Players, and Stats pages - require login
    const protectedPages = ["availability", "players", "stats"];
    const adminPages = ["admin", "user-management", "manage-fixtures", "fixture-generator", "training-admin", "admin-members"];
    
    if (protectedPages.includes(tab) && !user) {
      toast.error("Please login to access this page");
      setActiveTab("login");
      return;
    }
    
    if (adminPages.includes(tab) && (!user || user.role !== 'admin')) {
      toast.error("Admin access required");
      return;
    }
    
    setActiveTab(tab);
  };

  const renderContent = () => {
    // For authenticated pages, use user's JWT access token
    const accessToken = user?.accessToken || '';
    
    switch (activeTab) {
      case "home":
        return <HomePage apiUrl={apiUrl} apiKey={accessToken} userRole={user?.role} />;
      case "club-flyer":
        return <ClubFlyerPage apiUrl={apiUrl} apiKey={accessToken} userRole={user?.role} />;
      case "fixtures":
        return <FixturesPage apiUrl={apiUrl} apiKey={accessToken} />;
      case "results":
        return <ResultsPage apiUrl={apiUrl} apiKey={accessToken} />;
      case "login":
        return (
          <AuthPage
            onLoginSuccess={handleLoginSuccess}
            apiUrl={apiUrl}
            apiKey={accessToken}
          />
        );
      case "teams":
        return user ? <TeamsPage apiUrl={apiUrl} apiKey={accessToken} /> : <HomePage />;
      case "players":
        return user ? <PlayersPage apiUrl={apiUrl} apiKey={accessToken} /> : <HomePage />;
      case "admin":
        return user ? <AdminPage apiUrl={apiUrl} apiKey={accessToken} /> : <HomePage />;
      case "availability":
        return user ? <AvailabilityPage apiUrl={apiUrl} apiKey={accessToken} userName={user.name} /> : <HomePage />;
      case "stats":
        return user ? <StatsPage apiUrl={apiUrl} apiKey={accessToken} /> : <HomePage />;
      case "user-management":
        return user ? <UserManagementPage apiUrl={apiUrl} apiKey={accessToken} /> : <HomePage />;
      case "manage-fixtures":
        return user ? <ManageFixturesPage apiUrl={apiUrl} apiKey={accessToken} /> : <HomePage />;
      case "fixture-generator":
        return user ? <FixtureGeneratorPage apiUrl={apiUrl} apiKey={accessToken} /> : <HomePage />;
      case "team-sheet":
        return user ? <TeamSheetPage apiUrl={apiUrl} apiKey={accessToken} /> : <HomePage />;
      case "training":
        return user && user.userId && user.name ? (
          <TrainingPage apiUrl={apiUrl} apiKey={accessToken} userId={user.userId} userName={user.name} />
        ) : <HomePage />;
      case "coach-plan":
        return user && user.userId && user.name ? (
          <CoachPlanPage apiUrl={apiUrl} apiKey={accessToken} userId={user.userId} userName={user.name} />
        ) : <HomePage />;
      case "training-admin":
        return user ? <TrainingAdminPage apiUrl={apiUrl} apiKey={accessToken} /> : <HomePage />;
      case "admin-members":
        return user ? <AdminMembersPage apiUrl={apiUrl} apiKey={accessToken} accessToken={accessToken} /> : <HomePage />;
      case "attendance-scanner":
        return user && user.userId && user.name && user.role ? (
          <AttendanceScannerPage apiUrl={apiUrl} apiKey={accessToken} userId={user.userId} userName={user.name} userRole={user.role} />
        ) : <HomePage />;
      case "backend-debug":
        return <HomePage />; // Debug page removed for security
      case "selection-committee-starring":
        return user ? <SelectionCommitteeStarringPage apiUrl={apiUrl} apiKey={accessToken} /> : <HomePage />;
      case "board-members":
        return <BoardMembersPage apiUrl={apiUrl} apiKey={user?.accessToken || ''} userRole={user?.role} />;
      case "live-scoring":
        return user ? (
          <LiveScoringPage apiUrl={apiUrl} apiKey={accessToken} userId={user.userId} userName={user.name} />
        ) : <HomePage />;
      default:
        return <HomePage />;
    }
  };

  // Show loading while checking session or initializing
  if (checkingSession || !initialized) {
    return (
      <div className="size-full flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-900 mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-red-900">Loading Adamstown Cricket Club...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="size-full flex flex-col bg-gray-50">
      <Header
        onMenuClick={() => setMobileMenuOpen(true)}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        user={user}
        onLogout={handleLogout}
      />
      
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        user={user}
      />

      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-8">
          {renderContent()}
        </div>
      </main>

      <footer className="bg-gray-800 text-white py-3 md:py-6 mt-4 md:mt-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 text-center md:text-left">
            <div>
              <h3 className="font-bold text-sm md:text-lg mb-1 md:mb-2">Adamstown Cricket Club</h3>
              <p className="text-gray-300 text-xs md:text-sm">Established 1950</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm md:text-base mb-1 md:mb-2">Contact</h4>
              <p className="text-gray-300 text-xs md:text-sm">info@adamstowncc.com</p>
              <p className="text-gray-300 text-xs md:text-sm">Adamstown Oval</p>
            </div>
            <div className="hidden md:block">
              <h4 className="font-semibold mb-2">Quick Links</h4>
              <div className="flex flex-col gap-1 text-sm">
                <button
                  onClick={() => setActiveTab("fixtures")}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Fixtures
                </button>
                <button
                  onClick={() => handleTabChange("teams")}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Teams
                </button>
                <button
                  onClick={() => setActiveTab("results")}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Results
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-3 md:mt-6 pt-2 md:pt-4 text-center text-xs md:text-sm text-gray-400">
            © {new Date().getFullYear()} Adamstown CC
          </div>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      <WhatsAppContact apiUrl={apiUrl} apiKey={user?.accessToken || ''} />

      <Toaster />
    </div>
  );
}