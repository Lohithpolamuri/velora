import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  ActivitySection,
  NotificationsSection,
  WorkspaceSection,
  SubscriptionSection,
  SettingsSection,
} from "./dashboardsections";

const DATA_EVENT = "Velora:data-changed";
const ACTIVITY_EVENT = "Velora:activity-changed";

const getActivities = () => {
  try {
    const saved = localStorage.getItem("activityLog");

    if (saved) {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    localStorage.removeItem("activityLog");
  }

  return [];
};

const getNotifications = () => {
  try {
    const saved = localStorage.getItem("notifications");

    if (saved) {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    localStorage.removeItem("notifications");
  }

  return [];
};

const getMembers = () => {
  try {
    const saved = localStorage.getItem("workspaceMembers");

    if (saved) {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    localStorage.removeItem("workspaceMembers");
  }

  return [];
};

const formatRelativeTime = (timestamp, now) => {
  if (!timestamp) {
    return "Recently";
  }

  const difference = Math.max(
    0,
    now - Number(timestamp)
  );

  const seconds = Math.floor(
    difference / 1000
  );

  const minutes = Math.floor(
    seconds / 60
  );

  const hours = Math.floor(
    minutes / 60
  );

  const days = Math.floor(
    hours / 24
  );

  if (seconds < 10) {
    return "Just now";
  }

  if (seconds < 60) {
    return `${seconds} seconds ago`;
  }

  if (minutes === 1) {
    return "1 minute ago";
  }

  if (minutes < 60) {
    return `${minutes} minutes ago`;
  }

  if (hours === 1) {
    return "1 hour ago";
  }

  if (hours < 24) {
    return `${hours} hours ago`;
  }

  if (days === 1) {
    return "Yesterday";
  }

  if (days < 7) {
    return `${days} days ago`;
  }

  return new Date(
    Number(timestamp)
  ).toLocaleDateString();
};

function Dashboard() {
  const { user, logout } = useAuth();

  const [activeSection, setActiveSection] =
    useState("Overview");

  const [activities, setActivities] =
    useState(getActivities);

  const [notifications, setNotifications] =
    useState(getNotifications);

  const [members, setMembers] =
    useState(getMembers);

  const [currentPlan, setCurrentPlan] =
    useState(
      localStorage.getItem(
        "selectedPlan"
      ) || "Free"
    );

  const [now, setNow] =
    useState(Date.now());

  const [searchOpen, setSearchOpen] =
    useState(false);

  const [searchText, setSearchText] =
    useState("");

  const [searchMessage, setSearchMessage] =
    useState("");

  const navigation = [
    {
      name: "Overview",
      icon: "▦",
    },
    {
      name: "Activity",
      icon: "↗",
    },
    {
      name: "Notifications",
      icon: "♢",
    },
    {
      name: "Workspace",
      icon: "□",
    },
    {
      name: "Subscription",
      icon: "◇",
    },
    {
      name: "Settings",
      icon: "⚙",
    },
  ];

  const handleLogout = () => {
    logout();
    navigateToLogin();
  };

  const navigateToLogin = () => {
    window.location.href = "/login";
  };

  useEffect(() => {
    const refreshDashboardData = () => {
      setActivities(getActivities());
      setNotifications(getNotifications());
      setMembers(getMembers());

      setCurrentPlan(
        localStorage.getItem(
          "selectedPlan"
        ) || "Free"
      );
    };

    window.addEventListener(
      DATA_EVENT,
      refreshDashboardData
    );

    window.addEventListener(
      ACTIVITY_EVENT,
      refreshDashboardData
    );

    const interval = setInterval(() => {
      refreshDashboardData();
      setNow(Date.now());
    }, 10000);

    return () => {
      window.removeEventListener(
        DATA_EVENT,
        refreshDashboardData
      );

      window.removeEventListener(
        ACTIVITY_EVENT,
        refreshDashboardData
      );

      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setActivities(getActivities());
    setNotifications(getNotifications());
    setMembers(getMembers());

    setCurrentPlan(
      localStorage.getItem(
        "selectedPlan"
      ) || "Free"
    );
  }, [activeSection]);

  const unreadNotifications =
    notifications.filter(
      (notification) =>
        notification.unread
    ).length;

  const recentActivities = useMemo(() => {
    return [...activities]
      .sort(
        (a, b) =>
          Number(b.timestamp || 0) -
          Number(a.timestamp || 0)
      )
      .slice(0, 4);
  }, [activities]);

  const recentNotifications =
    useMemo(() => {
      return [...notifications].slice(0, 4);
    }, [notifications]);

  const searchResults = useMemo(() => {
    const query =
      searchText
        .trim()
        .toLowerCase();

    if (!query) {
      return [];
    }

    const results = [];

    navigation.forEach((item) => {
      if (
        item.name
          .toLowerCase()
          .includes(query)
      ) {
        results.push({
          type: "Section",
          title: item.name,
          action: () => {
            setActiveSection(
              item.name
            );
            setSearchOpen(false);
            setSearchText("");
          },
        });
      }
    });

    recentActivities.forEach(
      (activity) => {
        const title =
          activity.title || "";

        const description =
          activity.description || "";

        if (
          title
            .toLowerCase()
            .includes(query) ||
          description
            .toLowerCase()
            .includes(query)
        ) {
          results.push({
            type: "Activity",
            title,
            action: () => {
              setActiveSection(
                "Activity"
              );
              setSearchOpen(false);
              setSearchText("");
            },
          });
        }
      }
    );

    recentNotifications.forEach(
      (notification) => {
        const title =
          notification.title || "";

        const message =
          notification.message || "";

        if (
          title
            .toLowerCase()
            .includes(query) ||
          message
            .toLowerCase()
            .includes(query)
        ) {
          results.push({
            type: "Notification",
            title,
            action: () => {
              setActiveSection(
                "Notifications"
              );
              setSearchOpen(false);
              setSearchText("");
            },
          });
        }
      }
    );

    return results.slice(0, 6);
  }, [
    searchText,
    recentActivities,
    recentNotifications,
  ]);

  const handleSearch = () => {
    if (!searchText.trim()) {
      setSearchMessage(
        "Type something to search."
      );
      return;
    }

    if (searchResults.length === 0) {
      setSearchMessage(
        "No matching results found."
      );
      return;
    }

    setSearchMessage("");
  };

  const planUsage =
    currentPlan === "Enterprise"
      ? 68
      : currentPlan === "Pro"
      ? Math.min(
          68,
          Math.round(
            (members.length / 50) *
              100
          )
        )
      : Math.min(
          68,
          Math.round(
            (members.length / 5) *
              100
          )
        );

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">
            V
          </div>

          <span>Velora</span>
        </div>

        <div className="sidebar-section">
          <p className="sidebar-label">
            MENU
          </p>

          <nav>
            {navigation.map((item) => (
              <button
                key={item.name}
                className={`nav-item ${
                  activeSection ===
                  item.name
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActiveSection(
                    item.name
                  )
                }
              >
                <span className="nav-icon">
                  {item.icon}
                </span>

                <span>
                  {item.name}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <div className="help-icon">
              ?
            </div>

            <div>
              <strong>
                Need help?
              </strong>

              <span>
                Contact support
              </span>
            </div>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            <span>↪</span>
            Logout
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="topbar">
          <div>
            <p className="breadcrumb">
              Dashboard /{" "}
              {activeSection}
            </p>

            <h2>
              {activeSection}
            </h2>
          </div>

          <div className="topbar-right">
            <div className="search-wrapper">
              <button
                className="icon-button"
                onClick={() => {
                  setSearchOpen(
                    (current) =>
                      !current
                  );

                  setSearchMessage("");
                }}
                aria-label="Search"
              >
                ⌕
              </button>

              {searchOpen && (
                <div className="search-panel">
                  <div className="search-input-row">
                    <input
                      type="text"
                      value={searchText}
                      onChange={(event) => {
                        setSearchText(
                          event.target.value
                        );
                        setSearchMessage("");
                      }}
                      onKeyDown={(event) => {
                        if (
                          event.key ===
                          "Enter"
                        ) {
                          handleSearch();
                        }
                      }}
                      placeholder="Search your dashboard..."
                      autoFocus
                    />

                    <button
                      onClick={
                        handleSearch
                      }
                    >
                      Search
                    </button>
                  </div>

                  {searchMessage && (
                    <div className="search-message">
                      {searchMessage}
                    </div>
                  )}

                  {searchResults.length >
                    0 && (
                    <div className="search-results">
                      {searchResults.map(
                        (
                          result,
                          index
                        ) => (
                          <button
                            key={`${result.type}-${result.title}-${index}`}
                            onClick={
                              result.action
                            }
                          >
                            <span>
                              {
                                result.type
                              }
                            </span>

                            <strong>
                              {
                                result.title
                              }
                            </strong>
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              className="icon-button notification-button"
              onClick={() =>
                setActiveSection(
                  "Notifications"
                )
              }
              aria-label="Notifications"
            >
              ♢

              {unreadNotifications >
                0 && (
                <span className="notification-dot"></span>
              )}
            </button>

            <div className="user-menu">
              <div className="avatar">
                {user?.name
                  ?.charAt(0)
                  .toUpperCase()}
              </div>

              <div className="user-info">
                <strong>
                  {user?.name}
                </strong>

                <span>
                  {user?.email}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          {activeSection ===
            "Overview" && (
            <>
              <section className="welcome-section">
                <div>
                  <p className="welcome-label">
                    WELCOME BACK
                  </p>

                  <h1>
                    Hello,{" "}
                    {user?.name}{" "}
                    <span>
                      👋
                    </span>
                  </h1>

                  <p>
                    Here's what's
                    happening with
                    your workspace
                    today.
                  </p>
                </div>

                <button
                  className="primary-button"
                  onClick={() =>
                    setActiveSection(
                      "Workspace"
                    )
                  }
                >
                  + Create new
                </button>
              </section>

              <section className="stats-grid">
                <div className="stat-card">
                  <div className="stat-header">
                    <span>
                      Total Activity
                    </span>

                    <div className="stat-icon">
                      ↗
                    </div>
                  </div>

                  <h3>
                    {activities.length}
                  </h3>

                  <p className="positive">
                    Live{" "}
                    <span>
                      account activity
                    </span>
                  </p>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    <span>
                      Projects
                    </span>

                    <div className="stat-icon">
                      □
                    </div>
                  </div>

                  <h3>8</h3>

                  <p className="positive">
                    Active{" "}
                    <span>
                      workspace projects
                    </span>
                  </p>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    <span>
                      Team Members
                    </span>

                    <div className="stat-icon">
                      ♙
                    </div>
                  </div>

                  <h3>
                    {members.length}
                  </h3>

                  <p className="positive">
                    Live{" "}
                    <span>
                      workspace members
                    </span>
                  </p>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    <span>
                      Plan Usage
                    </span>

                    <div className="stat-icon">
                      ◇
                    </div>
                  </div>

                  <h3>
                    {planUsage}%
                  </h3>

                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${planUsage}%`,
                      }}
                    ></div>
                  </div>

                  <p className="usage-text">
                    {100 -
                      planUsage}
                    % remaining
                  </p>
                </div>
              </section>

              <section className="dashboard-grid">
                <div className="content-card activity-card">
                  <div className="card-header">
                    <div>
                      <h3>
                        Recent Activity
                      </h3>

                      <p>
                        Your latest
                        account activity
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        setActiveSection(
                          "Activity"
                        )
                      }
                    >
                      View all →
                    </button>
                  </div>

                  <div className="activity-list">
                    {recentActivities.length ===
                    0 ? (
                      <div className="empty-state">
                        <h3>
                          No activity yet
                        </h3>

                        <p>
                          Your recent
                          actions will
                          appear here.
                        </p>
                      </div>
                    ) : (
                      recentActivities.map(
                        (
                          activity
                        ) => (
                          <div
                            className="activity-item"
                            key={
                              activity.id
                            }
                          >
                            <div className="activity-dot"></div>

                            <div className="activity-content">
                              <strong>
                                {
                                  activity.title
                                }
                              </strong>

                              <p>
                                {
                                  activity.description
                                }
                              </p>
                            </div>

                            <span className="activity-time">
                              {formatRelativeTime(
                                activity.timestamp,
                                now
                              )}
                            </span>
                          </div>
                        )
                      )
                    )}
                  </div>
                </div>

                <div className="content-card">
                  <div className="card-header">
                    <div>
                      <h3>
                        Notifications
                      </h3>

                      <p>
                        Stay up to date
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        setActiveSection(
                          "Notifications"
                        )
                      }
                    >
                      View all →
                    </button>
                  </div>

                  <div className="notification-list">
                    {recentNotifications.length ===
                    0 ? (
                      <div className="empty-state">
                        <h3>
                          You're all
                          caught up
                        </h3>

                        <p>
                          There are no
                          notifications
                          to show.
                        </p>
                      </div>
                    ) : (
                      recentNotifications.map(
                        (
                          notification
                        ) => (
                          <div
                            className="notification-item"
                            key={
                              notification.id
                            }
                          >
                            <div className="notification-icon">
                              ♢
                            </div>

                            <div>
                              <strong>
                                {
                                  notification.title
                                }
                              </strong>

                              <p>
                                {
                                  notification.message
                                }
                              </p>
                            </div>
                          </div>
                        )
                      )
                    )}
                  </div>
                </div>
              </section>

              <section className="bottom-grid">
                <div className="content-card workspace-card">
                  <div>
                    <p className="card-label">
                      WORKSPACE
                    </p>

                    <h3>
                      Your workspace
                      is ready
                    </h3>

                    <p>
                      Organize your
                      projects, manage
                      your team and
                      keep everything
                      in one place.
                    </p>
                  </div>

                  <button
                    className="secondary-button"
                    onClick={() =>
                      setActiveSection(
                        "Workspace"
                      )
                    }
                  >
                    Open workspace →
                  </button>
                </div>

                <div className="content-card subscription-card">
                  <div className="subscription-top">
                    <div>
                      <p className="card-label">
                        CURRENT PLAN
                      </p>

                      <h3>
                        {currentPlan}{" "}
                        Plan
                      </h3>
                    </div>

                    <span className="plan-badge">
                      ACTIVE
                    </span>
                  </div>

                  <p>
                    Manage your plan
                    and workspace
                    features.
                  </p>

                  <button
                    className="secondary-button"
                    onClick={() =>
                      setActiveSection(
                        "Subscription"
                      )
                    }
                  >
                    Manage plan →
                  </button>
                </div>
              </section>
            </>
          )}

          {activeSection ===
            "Activity" && (
            <ActivitySection />
          )}

          {activeSection ===
            "Notifications" && (
            <NotificationsSection />
          )}

          {activeSection ===
            "Workspace" && (
            <WorkspaceSection
              user={user}
            />
          )}

          {activeSection ===
            "Subscription" && (
            <SubscriptionSection />
          )}

          {activeSection ===
            "Settings" && (
            <SettingsSection
              user={user}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;