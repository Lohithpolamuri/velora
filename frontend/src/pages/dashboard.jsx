import { useEffect, useState } from "react";
import vertofiLogo from "../assets/vertofi.jpg";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/api";
import "./dashboard.css";
import {
  ActivitySection,
  NotificationsSection,
  OverviewSection,
  ProjectsSection,
  SettingsSection,
  SubscriptionSection,
  WorkspaceSection,
} from "./dashboardsections";

const NAV_ITEMS = [
  ["Overview", "▦"],
  ["Projects", "□"],
  ["Activity", "↗"],
  ["Notifications", "♢"],
  ["Workspace", "□"],
  ["Subscription", "◇"],
  ["Settings", "⚙"],
];

function Dashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("Overview");
  const [summary, setSummary] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const refreshAll = async () => {
    try {
      const [sum, prefs] = await Promise.all([
        apiFetch("/api/dashboard"),
        apiFetch("/api/preferences"),
      ]);
      setSummary(sum);
      setPreferences(prefs);
      applyPreferences(prefs);
    } catch (err) {
      if (err.status === 401) {
        window.location.href = "/login";
      }
    }
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(() => {
      apiFetch("/api/heartbeat", { method: "POST" }).catch(() => {});
      refreshAll();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const applyPreferences = (prefs) => {
    if (!prefs) return;
    const root = document.documentElement;
    root.dataset.theme = prefs.theme;
    root.dataset.accent = prefs.accent;
    root.dataset.font = prefs.font;
    root.dataset.layout = prefs.layout;
    root.dataset.sidebar = prefs.sidebar;
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const handleDataChanged = async (msg) => {
    if (msg) {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(""), 3000);
    }
    await refreshAll();
  };

  const tabComponents = {
    Overview: <OverviewSection user={user} summary={summary} onNavigate={setActiveTab} />,
    Projects: <ProjectsSection onChanged={handleDataChanged} />,
    Activity: <ActivitySection />,
    Notifications: <NotificationsSection onChanged={handleDataChanged} />,
    Workspace: <WorkspaceSection user={user} onChanged={handleDataChanged} />,
    Subscription: <SubscriptionSection onChanged={handleDataChanged} />,
    Settings: (
      <SettingsSection
        user={user}
        preferences={preferences}
        onSaved={(newPrefs) => {
          setPreferences(newPrefs);
          applyPreferences(newPrefs);
          handleDataChanged("Preferences saved");
        }}
      />
    ),
  };

  const content = tabComponents[activeTab];

  return (
    <div className="dashboard-layout">
      <header className="sidebar">
        <div className="brand">
          <img src={vertofiLogo} alt="Vertofi" className="brand-logo-image" />
          <span>Vertofi</span>
        </div>

        <nav className="nav-bar">
          {NAV_ITEMS.map(([name, icon]) => (
            <button
              key={name}
              className={`nav-item ${activeTab === name ? "active" : ""}`}
              onClick={() => setActiveTab(name)}
              title={name}
            >
              <span className="nav-icon">{icon}</span>
              <span>{name}</span>
              <span className="nav-popover">Open {name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-actions">
          <div className="help-chip">
            <span>?</span>
            <div>
              <strong>Need help?</strong>
              <small>Contact support</small>
            </div>
          </div>
          <button className="logout-button" onClick={handleLogout}>
            ↪ Logout
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="topbar">
          <div>
            <div className="breadcrumb">Dashboard / {activeTab}</div>
            <h1>{activeTab}</h1>
          </div>

          <div className="profile">
            <div className="avatar">{user?.name?.charAt(0)?.toUpperCase() || "V"}</div>
            <div>
              <strong>{user?.name}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
        </div>

        <section className="dashboard-content">{content}</section>
      </main>

      {toastMessage && <div className="toast">{toastMessage}</div>}
    </div>
  );
}

export default Dashboard;