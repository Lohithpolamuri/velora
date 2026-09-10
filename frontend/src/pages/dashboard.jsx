import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/api";
import vertofiLogo from "../assets/vertofi.jpg";
import { ActivitySection, NotificationsSection, WorkspaceSection, SubscriptionSection, SettingsSection, OverviewSection, ProjectsSection } from "./dashboardsections";
import "./dashboard.css";

const navigation = [
  ["Overview", "▦"], ["Projects", "□"], ["Activity", "↗"], ["Notifications", "♢"], ["Workspace", "□"], ["Subscription", "◇"], ["Settings", "⚙"],
];

function Dashboard() {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState("Overview");
  const [summary, setSummary] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [toast, setToast] = useState("");

  const refresh = async () => {
    try {
      const [dashboard, prefs] = await Promise.all([apiFetch("/api/dashboard"), apiFetch("/api/preferences")]);
      setSummary(dashboard);
      setPreferences(prefs);
      applyPreferences(prefs);
    } catch (error) {
      if (error.status === 401) window.location.href = "/login";
    }
  };

  useEffect(() => {
    refresh();
    const timer = setInterval(() => {
      apiFetch("/api/heartbeat", { method: "POST" }).catch(() => {});
      refresh();
    }, 30000);
    return () => clearInterval(timer);
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

  const onChanged = async (message) => {
    if (message) {
      setToast(message);
      setTimeout(() => setToast(""), 3000);
    }
    await refresh();
  };

  const content = {
    Overview: <OverviewSection user={user} summary={summary} onNavigate={setActiveSection} />,
    Projects: <ProjectsSection onChanged={onChanged} />,
    Activity: <ActivitySection />,
    Notifications: <NotificationsSection onChanged={onChanged} />,
    Workspace: <WorkspaceSection user={user} onChanged={onChanged} />,
    Subscription: <SubscriptionSection onChanged={onChanged} />,
    Settings: <SettingsSection user={user} preferences={preferences} onSaved={(prefs) => { setPreferences(prefs); applyPreferences(prefs); onChanged("Preferences saved"); }} />,
  }[activeSection];

  return (
    <div className="dashboard-layout">
      <header className="sidebar">
        <div className="brand">
          <img src={vertofiLogo} alt="Vertofi" className="brand-logo-image" />
          <span>Vertofi</span>
        </div>
        <nav className="nav-bar">
          {navigation.map(([name, icon]) => (
            <button key={name} className={`nav-item ${activeSection === name ? "active" : ""}`} onClick={() => setActiveSection(name)} title={name}>
              <span className="nav-icon">{icon}</span><span>{name}</span><span className="nav-popover">Open {name}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-actions">
          <div className="help-chip"><span>?</span><div><strong>Need help?</strong><small>Contact support</small></div></div>
          <button className="logout-button" onClick={handleLogout}>↪ Logout</button>
        </div>
      </header>
      <main className="dashboard-main">
        <div className="topbar">
          <div><div className="breadcrumb">Dashboard / {activeSection}</div><h1>{activeSection}</h1></div>
          <div className="profile"><div className="avatar">{user?.name?.charAt(0)?.toUpperCase() || "V"}</div><div><strong>{user?.name}</strong><small>{user?.email}</small></div></div>
        </div>
        <section className="dashboard-content">{content}</section>
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default Dashboard;
