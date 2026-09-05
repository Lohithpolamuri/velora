import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

const ACTIVITY_EVENT = "saasify:activity-changed";
const DATA_EVENT = "saasify:data-changed";

const emitDataChange = () => {
  window.dispatchEvent(new Event(DATA_EVENT));
};

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

const saveActivities = (activities) => {
  localStorage.setItem(
    "activityLog",
    JSON.stringify(activities)
  );

  window.dispatchEvent(new Event(ACTIVITY_EVENT));
};

const addActivity = (title, description) => {
  const activities = getActivities();

  const newActivity = {
    id: Date.now() + Math.random(),
    title,
    description,
    timestamp: Date.now(),
  };

  const updatedActivities = [
    newActivity,
    ...activities,
  ].slice(0, 50);

  saveActivities(updatedActivities);
};

const formatRelativeTime = (timestamp, now) => {
  const difference = Math.max(0, now - timestamp);

  const seconds = Math.floor(difference / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

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

  return new Date(timestamp).toLocaleDateString();
};

export function ActivitySection() {
  const [activities, setActivities] = useState(
    getActivities
  );

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    const loginKey = `saasify-login-${token}`;

    if (!sessionStorage.getItem(loginKey)) {
      addActivity(
        "Logged in",
        "Signed in to your account"
      );

      sessionStorage.setItem(loginKey, "true");

      setActivities(getActivities());
    }
  }, []);

  useEffect(() => {
    const refreshActivities = () => {
      setActivities(getActivities());
    };

    window.addEventListener(
      ACTIVITY_EVENT,
      refreshActivities
    );

    window.addEventListener(
      DATA_EVENT,
      refreshActivities
    );

    return () => {
      window.removeEventListener(
        ACTIVITY_EVENT,
        refreshActivities
      );

      window.removeEventListener(
        DATA_EVENT,
        refreshActivities
      );
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const sortedActivities = [...activities].sort(
    (a, b) => b.timestamp - a.timestamp
  );

  return (
    <div className="section-panel">
      <div className="section-heading">
        <h2>Activity</h2>
        <p>
          Track recent actions across your account and
          workspace.
        </p>
      </div>

      {sortedActivities.length === 0 ? (
        <div className="empty-state">
          <h3>No activity yet</h3>
          <p>
            Your recent account activity will appear
            here.
          </p>
        </div>
      ) : (
        <div className="activity-list">
          {sortedActivities.map((activity) => (
            <div
              className="activity-item"
              key={activity.id}
            >
              <div className="activity-indicator"></div>

              <div>
                <strong>{activity.title}</strong>

                <span>
                  {activity.description}
                </span>

                <small>
                  {formatRelativeTime(
                    activity.timestamp,
                    now
                  )}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function NotificationsSection() {
  const defaultNotifications = [
    {
      id: 1,
      title: "Security alert",
      message:
        "New login from Chrome on macOS",
      timestamp:
        Date.now() - 10 * 60 * 1000,
      unread: true,
    },
    {
      id: 2,
      title: "Workspace update",
      message:
        "Your workspace settings were changed",
      timestamp:
        Date.now() - 60 * 60 * 1000,
      unread: true,
    },
    {
      id: 3,
      title: "New report available",
      message:
        "Your weekly usage report is ready",
      timestamp:
        Date.now() - 24 * 60 * 60 * 1000,
      unread: false,
    },
    {
      id: 4,
      title: "Team invite accepted",
      message:
        "A teammate joined your workspace",
      timestamp:
        Date.now() - 2 * 24 * 60 * 60 * 1000,
      unread: false,
    },
  ];

  const [notifications, setNotifications] =
    useState(() => {
      try {
        const saved =
          localStorage.getItem(
            "notifications"
          );

        if (saved) {
          const parsed = JSON.parse(saved);

          if (Array.isArray(parsed)) {
            return parsed;
          }
        }
      } catch {
        localStorage.removeItem(
          "notifications"
        );
      }

      return defaultNotifications;
    });

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    localStorage.setItem(
      "notifications",
      JSON.stringify(notifications)
    );

    emitDataChange();
  }, [notifications]);

  useEffect(() => {
    const refreshNotifications = () => {
      try {
        const saved =
          localStorage.getItem(
            "notifications"
          );

        if (saved) {
          const parsed = JSON.parse(saved);

          if (Array.isArray(parsed)) {
            setNotifications(parsed);
          }
        }
      } catch {
        setNotifications([]);
      }
    };

    window.addEventListener(
      DATA_EVENT,
      refreshNotifications
    );

    return () => {
      window.removeEventListener(
        DATA_EVENT,
        refreshNotifications
      );
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const markAsRead = (id) => {
    const notification =
      notifications.find(
        (item) => item.id === id
      );

    if (!notification?.unread) {
      return;
    }

    const updated = notifications.map(
      (item) =>
        item.id === id
          ? { ...item, unread: false }
          : item
    );

    setNotifications(updated);

    addActivity(
      "Read notification",
      notification.title
    );
  };

  const markAllAsRead = () => {
    const hasUnread = notifications.some(
      (item) => item.unread
    );

    if (!hasUnread) {
      return;
    }

    const updated = notifications.map(
      (item) => ({
        ...item,
        unread: false,
      })
    );

    setNotifications(updated);

    addActivity(
      "Read notifications",
      "Marked all notifications as read"
    );
  };

  const clearNotifications = () => {
    if (notifications.length === 0) {
      return;
    }

    setNotifications([]);

    addActivity(
      "Cleared notifications",
      "Removed all notifications"
    );
  };

  const unreadCount = notifications.filter(
    (notification) => notification.unread
  ).length;

  return (
    <div className="section-panel">
      <div className="section-heading section-heading-actions">
        <div>
          <h2>Notifications</h2>
          <p>
            Stay up to date with your account and
            workspace.
          </p>
        </div>

        {notifications.length > 0 && (
          <div className="section-button-group">
            {unreadCount > 0 && (
              <button
                className="section-action-button"
                onClick={markAllAsRead}
              >
                Mark all read
              </button>
            )}

            <button
              className="section-action-button"
              onClick={clearNotifications}
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <h3>You're all caught up</h3>
          <p>
            There are no notifications to show.
          </p>
        </div>
      ) : (
        <div className="notification-list">
          {notifications.map(
            (notification) => (
              <button
                className={`notification-item ${
                  notification.unread
                    ? "notification-unread"
                    : ""
                }`}
                key={notification.id}
                onClick={() =>
                  markAsRead(
                    notification.id
                  )
                }
              >
                <span
                  className={`notification-dot ${
                    notification.unread
                      ? "notification-dot-unread"
                      : ""
                  }`}
                ></span>

                <span className="notification-content">
                  <strong>
                    {notification.title}
                  </strong>

                  <span>
                    {notification.message}
                  </span>

                  <small>
                    {formatRelativeTime(
                      notification.timestamp ||
                        Date.now(),
                      now
                    )}
                  </small>
                </span>

                {notification.unread && (
                  <span className="notification-status">
                    Unread
                  </span>
                )}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

export function WorkspaceSection({ user }) {
  const planLimits = {
    Free: 5,
    Pro: 50,
    Enterprise: Infinity,
  };

  const [currentPlan, setCurrentPlan] =
    useState(
      localStorage.getItem(
        "selectedPlan"
      ) || "Free"
    );

  const memberLimit =
    planLimits[currentPlan] ?? 5;

  const [workspaceName, setWorkspaceName] =
    useState(
      localStorage.getItem(
        "workspaceName"
      ) ||
        `${user?.name || "My"}'s Workspace`
    );

  const [members, setMembers] = useState(
    () => {
      try {
        const savedMembers =
          localStorage.getItem(
            "workspaceMembers"
          );

        if (savedMembers) {
          const parsed =
            JSON.parse(savedMembers);

          if (Array.isArray(parsed)) {
            return parsed;
          }
        }
      } catch {
        localStorage.removeItem(
          "workspaceMembers"
        );
      }

      return [
        {
          id: 1,
          name: user?.name || "You",
          email: user?.email || "",
          role: "Owner",
        },
      ];
    }
  );

  const [editingName, setEditingName] =
    useState(false);

  const [newWorkspaceName, setNewWorkspaceName] =
    useState(workspaceName);

  const [inviteEmail, setInviteEmail] =
    useState("");

  const [showInvite, setShowInvite] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!user) {
      return;
    }

    setMembers((current) =>
      current.map((member) =>
        member.role === "Owner"
          ? {
              ...member,
              name: user.name,
              email: user.email,
            }
          : member
      )
    );
  }, [user?.name, user?.email]);

  useEffect(() => {
    localStorage.setItem(
      "workspaceMembers",
      JSON.stringify(members)
    );

    emitDataChange();
  }, [members]);

  useEffect(() => {
    const syncWorkspace = () => {
      const storedName =
        localStorage.getItem(
          "workspaceName"
        );

      if (storedName) {
        setWorkspaceName(storedName);
        setNewWorkspaceName(
          storedName
        );
      }

      const storedMembers =
        localStorage.getItem(
          "workspaceMembers"
        );

      if (storedMembers) {
        try {
          const parsed =
            JSON.parse(storedMembers);

          if (Array.isArray(parsed)) {
            setMembers(parsed);
          }
        } catch {
          localStorage.removeItem(
            "workspaceMembers"
          );
        }
      }

      setCurrentPlan(
        localStorage.getItem(
          "selectedPlan"
        ) || "Free"
      );
    };

    window.addEventListener(
      DATA_EVENT,
      syncWorkspace
    );

    return () => {
      window.removeEventListener(
        DATA_EVENT,
        syncWorkspace
      );
    };
  }, []);

  const showMessage = (text) => {
    setMessage(text);

    setTimeout(() => {
      setMessage("");
    }, 2500);
  };

  const saveWorkspaceName = () => {
    const trimmedName =
      newWorkspaceName.trim();

    if (!trimmedName) {
      setError(
        "Workspace name cannot be empty."
      );
      return;
    }

    setWorkspaceName(trimmedName);

    localStorage.setItem(
      "workspaceName",
      trimmedName
    );

    setEditingName(false);
    setError("");

    addActivity(
      "Changed workspace name",
      `Workspace renamed to ${trimmedName}`
    );

    emitDataChange();

    showMessage(
      "Workspace name updated successfully."
    );
  };

  const inviteMember = () => {
    const trimmedEmail =
      inviteEmail.trim();

    if (!trimmedEmail) {
      setError(
        "Enter an email address."
      );
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        trimmedEmail
      )
    ) {
      setError(
        "Enter a valid email address."
      );
      return;
    }

    if (
      memberLimit !== Infinity &&
      members.length >= memberLimit
    ) {
      setError(
        `Your current plan supports up to ${memberLimit} members. Upgrade to invite more.`
      );
      return;
    }

    const alreadyExists =
      members.some(
        (member) =>
          member.email.toLowerCase() ===
          trimmedEmail.toLowerCase()
      );

    if (alreadyExists) {
      setError(
        "This member is already in the workspace."
      );
      return;
    }

    const newMember = {
      id: Date.now(),
      name: trimmedEmail.split("@")[0],
      email: trimmedEmail,
      role: "Member",
    };

    const updatedMembers = [
      ...members,
      newMember,
    ];

    setMembers(updatedMembers);

    setInviteEmail("");
    setShowInvite(false);
    setError("");

    addActivity(
      "Invited a teammate",
      `Sent an invitation to ${trimmedEmail}`
    );

    showMessage(
      `Invitation sent to ${trimmedEmail}.`
    );
  };

  const removeMember = (id) => {
    const member =
      members.find(
        (item) => item.id === id
      );

    const updatedMembers =
      members.filter(
        (item) => item.id !== id
      );

    setMembers(updatedMembers);

    addActivity(
      "Removed a teammate",
      member
        ? `${member.name} was removed from the workspace`
        : "A member was removed from the workspace"
    );

    showMessage(
      "Member removed from the workspace."
    );
  };

  return (
    <div className="section-panel">
      <div className="section-heading">
        <h2>Workspace</h2>
        <p>
          Manage your workspace details and
          members.
        </p>
      </div>

      {message && (
        <div className="success-message">
          {message}
        </div>
      )}

      {error && (
        <div className="auth-error">
          {error}
        </div>
      )}

      <div className="workspace-card">
        <div className="workspace-info-row">
          <div>
            <span>Workspace Name</span>

            {editingName ? (
              <div className="workspace-name-edit">
                <input
                  type="text"
                  value={
                    newWorkspaceName
                  }
                  onChange={(event) =>
                    setNewWorkspaceName(
                      event.target.value
                    )
                  }
                  autoFocus
                />

                <button
                  className="section-action-button"
                  onClick={
                    saveWorkspaceName
                  }
                >
                  Save
                </button>

                <button
                  className="section-action-button"
                  onClick={() => {
                    setNewWorkspaceName(
                      workspaceName
                    );
                    setEditingName(false);
                    setError("");
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="workspace-name-display">
                <strong>
                  {workspaceName}
                </strong>

                <button
                  className="section-action-button"
                  onClick={() => {
                    setEditingName(true);
                    setError("");
                  }}
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          <div>
            <span>Plan</span>
            <strong>
              {currentPlan}
            </strong>
          </div>

          <div>
            <span>Members</span>

            <strong>
              {members.length} of{" "}
              {memberLimit === Infinity
                ? "∞"
                : memberLimit}
            </strong>
          </div>
        </div>

        <div className="workspace-members">
          <div className="section-heading-actions">
            <div>
              <h3>Members</h3>
              <p>
                People who have access to
                this workspace.
              </p>
            </div>

            <button
              className="section-action-button"
              onClick={() => {
                setShowInvite(
                  (current) => !current
                );
                setError("");
              }}
            >
              {showInvite
                ? "Cancel"
                : "Invite member"}
            </button>
          </div>

          {showInvite && (
            <div className="workspace-invite">
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) =>
                  setInviteEmail(
                    event.target.value
                  )
                }
                placeholder="Enter member email"
              />

              <button
                className="save-settings-button"
                onClick={inviteMember}
              >
                Send invitation
              </button>
            </div>
          )}

          <div className="member-list">
            {members.map((member) => (
              <div
                className="member-row"
                key={member.id}
              >
                <div className="member-avatar">
                  {member.name
                    ?.charAt(0)
                    .toUpperCase()}
                </div>

                <div className="member-details">
                  <strong>
                    {member.name}
                  </strong>

                  <span>
                    {member.email}
                  </span>
                </div>

                <span className="member-role">
                  {member.role}
                </span>

                {member.role !==
                  "Owner" && (
                  <button
                    className="member-remove-button"
                    onClick={() =>
                      removeMember(
                        member.id
                      )
                    }
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="workspace-controls">
          <button
            className="section-action-button"
            onClick={() => {
              setShowInvite(true);
              setError("");
            }}
          >
            Add teammate
          </button>
        </div>
      </div>
    </div>
  );
}

export function SubscriptionSection() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description:
        "For individuals getting started.",
      users: "Up to 5 users",
      features: [
        "Basic analytics",
        "Basic workspace tools",
        "Standard support",
      ],
    },
    {
      name: "Pro",
      price: "$29",
      period: "per month",
      description:
        "For growing teams and businesses.",
      users: "Up to 50 users",
      features: [
        "Advanced analytics",
        "Advanced workspace tools",
        "Priority support",
      ],
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "contact sales",
      description:
        "For larger organizations.",
      users: "Custom users",
      features: [
        "Advanced controls",
        "Custom workspace limits",
        "Dedicated support",
      ],
    },
  ];

  const [plan, setPlan] = useState(
    localStorage.getItem(
      "selectedPlan"
    ) || "Free"
  );

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    const syncPlan = () => {
      setPlan(
        localStorage.getItem(
          "selectedPlan"
        ) || "Free"
      );
    };

    window.addEventListener(
      DATA_EVENT,
      syncPlan
    );

    return () => {
      window.removeEventListener(
        DATA_EVENT,
        syncPlan
      );
    };
  }, []);

  const selectPlan = (
    selectedPlan
  ) => {
    if (selectedPlan === plan) {
      return;
    }

    setPlan(selectedPlan);

    localStorage.setItem(
      "selectedPlan",
      selectedPlan
    );

    addActivity(
      "Changed subscription plan",
      `Selected the ${selectedPlan} plan`
    );

    emitDataChange();

    if (selectedPlan === "Free") {
      setMessage(
        "Your workspace is now on the Free plan."
      );
    } else if (
      selectedPlan === "Pro"
    ) {
      setMessage(
        "Pro plan selected successfully."
      );
    } else {
      setMessage(
        "Enterprise plan selected. Our sales team can contact you."
      );
    }

    setTimeout(() => {
      setMessage("");
    }, 3000);
  };

  return (
    <div className="section-panel">
      <div className="section-heading">
        <h2>Subscription</h2>
        <p>
          Manage your SaaS plan and choose
          the features your workspace needs.
        </p>
      </div>

      {message && (
        <div className="success-message">
          {message}
        </div>
      )}

      <div className="plan-grid">
        {plans.map((item) => {
          const isCurrent =
            plan === item.name;

          return (
            <div
              className={`plan-card ${
                isCurrent
                  ? "plan-card-current"
                  : ""
              }`}
              key={item.name}
            >
              {isCurrent && (
                <span className="current-plan-badge">
                  Current Plan
                </span>
              )}

              <h3>{item.name}</h3>

              <strong className="plan-price">
                {item.price}
              </strong>

              <span>
                {item.period}
              </span>

              <p>
                {item.description}
              </p>

              <strong>
                {item.users}
              </strong>

              <div className="plan-features">
                {item.features.map(
                  (feature) => (
                    <span
                      key={feature}
                    >
                      ✓ {feature}
                    </span>
                  )
                )}
              </div>

              <button
                className="plan-button"
                onClick={() =>
                  selectPlan(
                    item.name
                  )
                }
                disabled={isCurrent}
              >
                {isCurrent
                  ? "Current Plan"
                  : item.name ===
                    "Enterprise"
                  ? "Contact Sales"
                  : "Upgrade Plan"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="subscription-note">
        <strong>
          Billing information
        </strong>

        <span>
          This is a demonstration
          subscription system. No real
          payment or billing is processed.
        </span>
      </div>
    </div>
  );
}

export function SettingsSection({
  user,
}) {
  const { setUser } = useAuth();

  const [name, setName] =
    useState(user?.name || "");

  const [email, setEmail] =
    useState(user?.email || "");

  const [
    emailNotifications,
    setEmailNotifications,
  ] = useState(
    localStorage.getItem(
      "emailNotifications"
    ) !== "false"
  );

  const [
    productUpdates,
    setProductUpdates,
  ] = useState(
    localStorage.getItem(
      "productUpdates"
    ) === "true"
  );

  const [saving, setSaving] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    setName(user?.name || "");
    setEmail(user?.email || "");
  }, [user]);

  useEffect(() => {
    const syncPreferences = () => {
      setEmailNotifications(
        localStorage.getItem(
          "emailNotifications"
        ) !== "false"
      );

      setProductUpdates(
        localStorage.getItem(
          "productUpdates"
        ) === "true"
      );
    };

    window.addEventListener(
      DATA_EVENT,
      syncPreferences
    );

    return () => {
      window.removeEventListener(
        DATA_EVENT,
        syncPreferences
      );
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError("");

    const trimmedName =
      name.trim();

    const trimmedEmail =
      email.trim();

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedName) {
      setError(
        "Full name cannot be empty."
      );
      setSaving(false);
      return;
    }

    if (
      !emailPattern.test(
        trimmedEmail
      )
    ) {
      setError(
        "Enter a valid email address."
      );
      setSaving(false);
      return;
    }

    const token =
      localStorage.getItem(
        "token"
      );

    if (!token) {
      setError(
        "Your session has expired. Please log in again."
      );
      setSaving(false);
      return;
    }

    try {
      const response =
        await fetch(
          "http://localhost:8000/auth/me",
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: trimmedName,
              email: trimmedEmail,
            }),
          }
        );

      let data = {};

      try {
        data =
          await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          typeof data.detail ===
            "string"
            ? data.detail
            : "Unable to update your account"
        );
      }

      const nameChanged =
        user?.name !==
        trimmedName;

      const emailChanged =
        user?.email !==
        trimmedEmail;

      setUser(data);

      localStorage.setItem(
        "emailNotifications",
        String(
          emailNotifications
        )
      );

      localStorage.setItem(
        "productUpdates",
        String(
          productUpdates
        )
      );

      if (
        nameChanged ||
        emailChanged
      ) {
        addActivity(
          "Updated profile",
          "Changed account information"
        );
      } else {
        addActivity(
          "Updated preferences",
          "Saved notification preferences"
        );
      }

      emitDataChange();

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2500);
    } catch (err) {
      setError(
        err.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="section-panel settings-panel">
      <div className="section-heading">
        <h2>Settings</h2>
        <p>
          Manage your account preferences.
        </p>
      </div>

      {saved && (
        <div className="success-message">
          Your settings have been saved
          successfully.
        </div>
      )}

      {error && (
        <div className="auth-error">
          {error}
        </div>
      )}

      <div className="settings-group">
        <div className="settings-group-heading">
          <h3>Account</h3>
          <p>
            Update your basic account
            information.
          </p>
        </div>

        <div className="settings-form">
          <label>
            Full Name

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              placeholder="Enter your name"
            />
          </label>

          <label>
            Email Address

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              placeholder="Enter your email"
            />
          </label>
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-group-heading">
          <h3>
            Notification Preferences
          </h3>

          <p>
            Choose which notifications
            you want to receive.
          </p>
        </div>

        <div className="settings-option">
          <div>
            <strong>
              Email notifications
            </strong>

            <span>
              Receive important account
              notifications.
            </span>
          </div>

          <label className="toggle">
            <input
              type="checkbox"
              checked={
                emailNotifications
              }
              onChange={(event) =>
                setEmailNotifications(
                  event.target.checked
                )
              }
            />

            <span></span>
          </label>
        </div>

        <div className="settings-option">
          <div>
            <strong>
              Product updates
            </strong>

            <span>
              Receive news about new
              SaaSify features.
            </span>
          </div>

          <label className="toggle">
            <input
              type="checkbox"
              checked={
                productUpdates
              }
              onChange={(event) =>
                setProductUpdates(
                  event.target.checked
                )
              }
            />

            <span></span>
          </label>
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-group-heading">
          <h3>Appearance</h3>

          <p>
            Customize how SaaSify looks
            for you.
          </p>
        </div>

        <div className="settings-option settings-disabled">
          <div>
            <strong>
              Dark mode
            </strong>

            <span>
              Dark mode is already active.
            </span>
          </div>

          <span className="status-label">
            Active
          </span>
        </div>
      </div>

      <div className="settings-footer">
        <button
          className="save-settings-button"
          onClick={handleSave}
          disabled={saving}
        >
          {saving
            ? "Saving..."
            : "Save changes"}
        </button>
      </div>
    </div>
  );
}