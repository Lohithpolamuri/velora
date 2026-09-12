import { useEffect, useState } from "react";
import { apiFetch } from "../utils/api";

function relative(value) {
  if (!value) return "Recently";

  const seconds = Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(value).getTime()) / 1000
    )
  );

  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}

export function OverviewSection({
  user,
  summary,
  onNavigate,
}) {
  if (!summary) {
    return (
      <div className="loading-card">
        Loading your workspace…
      </div>
    );
  }

  const stats = summary.stats;

  return (
    <>
      <div className="welcome-row">
        <div>
          <span className="eyebrow">
            WELCOME BACK
          </span>

          <h2>
            Hello, {user?.name || "there"} 👋
          </h2>

          <p>
            Here's what's happening with your workspace today.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => onNavigate("Workspace")}
        >
          + Create new
        </button>
      </div>

      <div className="stats-grid">
        <Stat
          label="Your Activity"
          value={stats.activity}
          note="Actions on your account"
        />

        <Stat
          label="Projects"
          value={stats.projects}
          note="Active workspace projects"
        />

        <Stat
          label="Team Members"
          value={stats.members}
          note={`${stats.active_members} active now`}
        />

        <Stat
          label="Plan Usage"
          value={`${stats.usage_percent}%`}
          note={`${Math.max(
            0,
            summary.subscription.usage_limit -
              summary.subscription.usage_count
          )} remaining`}
          progress={stats.usage_percent}
        />
      </div>

      <div className="overview-grid">
        <QuickCard
          title="Activity"
          text="Review only your account activity."
          action={() => onNavigate("Activity")}
        />

        <QuickCard
          title="Notifications"
          text={`${stats.unread_notifications} unread notification${
            stats.unread_notifications === 1
              ? ""
              : "s"
          }.`}
          action={() => onNavigate("Notifications")}
        />

        <QuickCard
          title="Workspace"
          text={`${stats.members} member${
            stats.members === 1 ? "" : "s"
          } in this workspace.`}
          action={() => onNavigate("Workspace")}
        />
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  note,
  progress,
}) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>

      {progress !== undefined && (
        <div className="progress">
          <i
            style={{
              width: `${Math.min(
                100,
                progress
              )}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}

function QuickCard({
  title,
  text,
  action,
}) {
  return (
    <button
      className="quick-card"
      onClick={action}
    >
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>

      <span>→</span>
    </button>
  );
}

export function ActivitySection() {
  const [items, setItems] = useState([]);

  const load = () =>
    apiFetch("/api/activity")
      .then(setItems)
      .catch(() => {});

  useEffect(() => {
    load();

    const timer = setInterval(
      load,
      15000
    );

    return () => clearInterval(timer);
  }, []);

  return (
    <section>
      <SectionIntro text="Only actions belonging to your authenticated account are shown." />

      <div className="list-card">
        {items.length ? (
          items.map((item) => (
            <div
              className="list-row"
              key={item.id}
            >
              <div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>

              <time>
                {relative(item.timestamp)}
              </time>
            </div>
          ))
        ) : (
          <Empty text="No activity recorded yet." />
        )}
      </div>
    </section>
  );
}

export function NotificationsSection({
  onChanged,
}) {
  const [items, setItems] = useState([]);

  const load = () =>
    apiFetch("/api/notifications")
      .then(setItems)
      .catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id) => {
    try {
      await apiFetch(
        `/api/notifications/${id}/read`,
        {
          method: "POST",
        }
      );

      await load();
      onChanged?.(
        "Notification marked as read"
      );
    } catch (e) {
      onChanged?.(e.message);
    }
  };

  return (
    <section>
      <SectionIntro text="Real events from your account and workspace." />

      <div className="list-card">
        {items.length ? (
          items.map((item) => (
            <div
              className={`list-row ${
                item.unread ? "unread" : ""
              }`}
              key={item.id}
            >
              <div>
                <strong>{item.title}</strong>
                <p>{item.message}</p>

                <time>
                  {relative(item.timestamp)}
                </time>
              </div>

              {item.unread && (
                <button
                  className="small-button"
                  onClick={() =>
                    markRead(item.id)
                  }
                >
                  Mark read
                </button>
              )}
            </div>
          ))
        ) : (
          <Empty text="You're all caught up." />
        )}
      </div>
    </section>
  );
}

export function WorkspaceSection({
  user,
  onChanged,
}) {
  const [workspace, setWorkspace] =
    useState(null);

  const [email, setEmail] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const load = () =>
    apiFetch("/api/workspace")
      .then(setWorkspace)
      .catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const addMember = async (event) => {
    event.preventDefault();

    if (!email.trim()) return;

    setLoading(true);

    try {
      const result = await apiFetch(
        "/api/workspace/members",
        {
          method: "POST",
          body: JSON.stringify({
            email: email.trim(),
          }),
        }
      );

      setEmail("");
      await load();

      onChanged?.(
        result.message ||
          "Member added successfully"
      );
    } catch (e) {
      onChanged?.(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <SectionIntro text="Manage your workspace and add existing verified Vertofi users." />

      <div className="workspace-grid">
        <div className="panel">
          <h3>Add Team Member</h3>

          <p>
            Add an existing verified Vertofi
            user directly to this workspace.
          </p>

          <form
            className="inline-form"
            onSubmit={addMember}
          >
            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="teammate@example.com"
              required
            />

            <button
              className="primary-button"
              disabled={loading}
            >
              {loading
                ? "Adding…"
                : "Add Member"}
            </button>
          </form>

          <small className="field-hint">
            The email must belong to an
            existing verified Vertofi account.
          </small>
        </div>

        <div className="panel">
          <div className="member-panel-heading">
            <h3>
              Team Members (
              {workspace?.members?.length || 0}
              )
            </h3>

            <span>
              {workspace?.members?.length || 0}{" "}
              current members
            </span>
          </div>

          {workspace?.members?.length ? (
            workspace.members.map((member) => (
              <div
                className="member-row"
                key={member.id}
              >
                <div className="avatar small">
                  {member.name
                    ?.charAt(0)
                    ?.toUpperCase() || "V"}
                </div>

                <div>
                  <strong>
                    {member.name}

                    {member.user_id === user?.id && (
                      <span className="you-badge">
                        You
                      </span>
                    )}
                  </strong>

                  <small>
                    {member.email}
                  </small>
                </div>

                <span className="member-role">
                  {member.role}
                </span>
              </div>
            ))
          ) : (
            <Empty text="No workspace members yet." />
          )}
        </div>
      </div>
    </section>
  );
}

export function ProjectsSection({
  onChanged,
}) {
  const [items, setItems] =
    useState([]);

  const [name, setName] =
    useState("");

  const load = () =>
    apiFetch("/api/projects")
      .then(setItems)
      .catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const create = async (event) => {
    event.preventDefault();

    if (!name.trim()) return;

    try {
      await apiFetch("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
        }),
      });

      setName("");
      await load();

      onChanged?.(
        "Project created successfully"
      );
    } catch (e) {
      onChanged?.(e.message);
    }
  };

  const remove = async (id) => {
    try {
      await apiFetch(
        `/api/projects/${id}`,
        {
          method: "DELETE",
        }
      );

      await load();
      onChanged?.("Project removed");
    } catch (e) {
      onChanged?.(e.message);
    }
  };

  return (
    <section>
      <SectionIntro text="Real projects stored in your workspace database." />

      <div className="panel">
        <form
          className="inline-form"
          onSubmit={create}
        >
          <input
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="New project name"
            required
          />

          <button className="primary-button">
            Create Project
          </button>
        </form>
      </div>

      <div className="list-card project-list">
        {items.length ? (
          items.map((item) => (
            <div
              className="list-row"
              key={item.id}
            >
              <div>
                <strong>{item.name}</strong>
                <p>{item.status}</p>
              </div>

              <button
                className="small-button danger"
                onClick={() =>
                  remove(item.id)
                }
              >
                Delete
              </button>
            </div>
          ))
        ) : (
          <Empty text="No projects yet. Create your first project above." />
        )}
      </div>
    </section>
  );
}

export function SubscriptionSection({
  onChanged,
}) {
  const [data, setData] =
    useState(null);

  const [loadingPlan, setLoadingPlan] =
    useState(false);

  const load = () =>
    apiFetch("/api/subscription")
      .then(setData)
      .catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const choose = async (plan) => {
    if (data?.plan === plan) return;

    setLoadingPlan(true);

    try {
      await apiFetch("/api/subscription", {
        method: "POST",
        body: JSON.stringify({
          plan,
        }),
      });

      await load();

      onChanged?.(
        `Switched to ${plan} plan`
      );
    } catch (e) {
      onChanged?.(e.message);
    } finally {
      setLoadingPlan(false);
    }
  };

  const catalog = {
    Free: {
      price: "$0",
      interval: "forever",
      description:
        "Essential collaboration and tools for individuals and small teams.",
      actions: 100,
      members: 5,
      features: [
        "100 workspace actions / month",
        "Up to 5 workspace members",
        "Basic workspace activity",
        "1 active project workspace",
        "Standard notifications",
        "Core collaboration tools",
      ],
    },

    Pro: {
      price: "$29",
      interval: "per month",
      description:
        "Built for growing teams that need more capacity and collaboration.",
      actions: 1000,
      members: 100,
      features: [
        "1,000 workspace actions / month",
        "Up to 100 workspace members",
        "Unlimited projects",
        "Extended activity history",
        "Workspace member management",
        "Advanced workspace tools",
        "Priority support",
      ],
    },

    Business: {
      price: "$99",
      interval: "per month",
      description:
        "Maximum workspace capacity for organizations with advanced requirements.",
      actions: 10000,
      members: Infinity,
      features: [
        "10,000 workspace actions / month",
        "Unlimited workspace members",
        "Unlimited projects",
        "Advanced activity history",
        "Advanced workspace controls",
        "Business support",
        "Enterprise-ready workspace capacity",
      ],
    },
  };

  if (!data) {
    return (
      <div className="loading-card">
        Loading subscription…
      </div>
    );
  }

  const currentPlan =
    data.plan || "Free";

  const current =
    catalog[currentPlan] ||
    catalog.Free;

  const actionUsage =
    data.usage_count || 0;

  const actionLimit =
    data.usage_limit ||
    current.actions;

  const memberCount =
    data.member_count || 0;

  const memberLimit =
    data.member_limit;

  const actionPercent = actionLimit
    ? Math.min(
        100,
        Math.round(
          (actionUsage / actionLimit) *
            100
        )
      )
    : 0;

  const memberPercent =
    memberLimit === null ||
    memberLimit === undefined
      ? 0
      : Math.min(
          100,
          Math.round(
            (memberCount / memberLimit) *
              100
          )
        );

  return (
    <section>
      <SectionIntro text="Manage your plan, review workspace capacity, and monitor your current usage." />

      <div className="subscription-active-card">
        <div className="subscription-active-main">
          <span className="eyebrow">
            ACTIVE SUBSCRIPTION
          </span>

          <h2>
            {currentPlan} Tier
          </h2>

          <p>
            {current.description}
          </p>

          <div className="subscription-meta">
            <span>
              <strong>Status:</strong>{" "}
              <b className="subscription-status">
                ●{" "}
                {data.status ||
                  "Active"}
              </b>
            </span>

            <span>
              <strong>Billing Cycle:</strong>{" "}
              {data.billing_cycle ||
                "Monthly"}
            </span>

            <span>
              <strong>Members:</strong>{" "}
              {memberLimit === null
                ? `${memberCount} / Unlimited`
                : `${memberCount} / ${memberLimit}`}
            </span>
          </div>
        </div>

        <div className="subscription-usage-box">
          <div className="usage-row">
            <strong>Action Usage</strong>

            <span>
              {actionUsage}/
              {actionLimit}
            </span>
          </div>

          <div className="usage-track">
            <i
              style={{
                width: `${actionPercent}%`,
              }}
            />
          </div>

          <small>
            {Math.max(
              0,
              actionLimit -
                actionUsage
            )}{" "}
            actions remaining
          </small>

          <div className="usage-divider" />

          <div className="usage-row">
            <strong>
              Team Members
            </strong>

            <span>
              {memberLimit === null
                ? `${memberCount} / Unlimited`
                : `${memberCount} / ${memberLimit}`}
            </span>
          </div>

          {memberLimit !== null && (
            <div className="usage-track member-track">
              <i
                style={{
                  width: `${memberPercent}%`,
                }}
              />
            </div>
          )}

          <small>
            {memberLimit === null
              ? "Unlimited workspace members"
              : `${Math.max(
                  0,
                  memberLimit -
                    memberCount
                )} member seats remaining`}
          </small>
        </div>
      </div>

      <div className="subscription-section-heading">
        <div>
          <span className="eyebrow">
            AVAILABLE WORKSPACE TIERS
          </span>

          <h2>
            Choose your workspace plan
          </h2>
        </div>

        <p>
          Upgrade as your workspace
          grows.
        </p>
      </div>

      <div className="plans-grid">
        {Object.entries(catalog).map(
          ([name, info]) => {
            const selected =
              currentPlan === name;

            return (
              <article
                key={name}
                className={`plan-card ${
                  selected
                    ? "selected"
                    : ""
                }`}
              >
                {name === "Pro" && (
                  <span className="plan-badge">
                    MOST POPULAR
                  </span>
                )}

                {name === "Business" && (
                  <span className="plan-badge enterprise-badge">
                    UNLIMITED
                  </span>
                )}

                <div className="plan-card-top">
                  <div>
                    <h3>{name}</h3>

                    <p>
                      {info.description}
                    </p>
                  </div>

                  {selected && (
                    <span className="current-badge">
                      CURRENT
                    </span>
                  )}
                </div>

                <div className="plan-price-row">
                  <strong>
                    {info.price}
                  </strong>

                  <span>
                    / {info.interval}
                  </span>
                </div>

                <div className="plan-capacity">
                  <div>
                    <span>
                      Actions
                    </span>

                    <strong>
                      {info.actions} / mo
                    </strong>
                  </div>

                  <div>
                    <span>
                      Members
                    </span>

                    <strong>
                      {info.members ===
                      Infinity
                        ? "Unlimited"
                        : `Up to ${info.members}`}
                    </strong>
                  </div>
                </div>

                <div className="plan-feature-area">
                  <span className="feature-title">
                    INCLUDED FEATURES
                  </span>

                  {info.features.map(
                    (feature) => (
                      <div
                        className="feature-row"
                        key={feature}
                      >
                        <span>✓</span>
                        <p>
                          {feature}
                        </p>
                      </div>
                    )
                  )}
                </div>

                <button
                  className={`primary-button plan-button ${
                    selected
                      ? "active-plan"
                      : ""
                  }`}
                  disabled={
                    selected ||
                    loadingPlan
                  }
                  onClick={() =>
                    choose(name)
                  }
                >
                  {selected
                    ? "✓ Active Workspace Plan"
                    : `Switch to ${name}`}
                </button>
              </article>
            );
          }
        )}
      </div>
    </section>
  );
}

export function SettingsSection({
  user,
  preferences,
  onSaved,
}) {
  const [form, setForm] =
    useState(
      preferences || {
        theme: "light",
        accent: "green",
        font: "inter",
        layout: "comfortable",
        sidebar: "expanded",
        email_notifications: true,
        product_updates: true,
      }
    );

  const [profile, setProfile] =
    useState({
      name: user?.name || "",
      email: user?.email || "",
    });

  const [passwords, setPasswords] =
    useState({
      current_password: "",
      new_password: "",
    });

  useEffect(() => {
    if (preferences) {
      setForm(preferences);
    }
  }, [preferences]);

  useEffect(() => {
    setProfile({
      name: user?.name || "",
      email: user?.email || "",
    });
  }, [user]);

  const save = async (event) => {
    event.preventDefault();

    try {
      const result = await apiFetch(
        "/api/preferences",
        {
          method: "PUT",
          body: JSON.stringify(form),
        }
      );

      onSaved?.({
        ...form,
        ...result,
      });
    } catch (error) {
      alert(error.message);
    }
  };

  const updateProfile = async () => {
    try {
      const updatedUser =
        await apiFetch(
          "/auth/me",
          {
            method: "PUT",
            body: JSON.stringify(profile),
          }
        );

      onSaved?.(updatedUser);
    } catch (error) {
      alert(error.message);
    }
  };

  const changePassword = async () => {
    try {
      await apiFetch(
        "/auth/me/password",
        {
          method: "PUT",
          body: JSON.stringify(
            passwords
          ),
        }
      );

      setPasswords({
        current_password: "",
        new_password: "",
      });

      alert(
        "Password updated. Please sign in again."
      );

      window.location.href =
        "/login";
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <section>
      <SectionIntro text="Manage your appearance, profile, password, and notification preferences." />

      <div className="settings-grid">
        <div className="panel">
          <h3>Appearance</h3>

          <SettingSelect
            label="Theme"
            value={form.theme}
            options={[
              ["light", "Light"],
              ["dark", "Dark"],
              ["system", "System"],
            ]}
            onChange={(value) =>
              setForm({
                ...form,
                theme: value,
              })
            }
          />

          <SettingSelect
            label="Accent"
            value={form.accent}
            options={[
              ["green", "Green"],
              ["blue", "Blue"],
              ["purple", "Purple"],
              ["gold", "Gold"],
              ["rose", "Rose"],
            ]}
            onChange={(value) =>
              setForm({
                ...form,
                accent: value,
              })
            }
          />

          <SettingSelect
            label="Font"
            value={form.font}
            options={[
              ["inter", "Inter"],
              ["system", "System"],
              ["serif", "Serif"],
              ["mono", "Mono"],
            ]}
            onChange={(value) =>
              setForm({
                ...form,
                font: value,
              })
            }
          />

          <SettingSelect
            label="Layout"
            value={form.layout}
            options={[
              [
                "comfortable",
                "Comfortable",
              ],
              ["compact", "Compact"],
              ["spacious", "Spacious"],
            ]}
            onChange={(value) =>
              setForm({
                ...form,
                layout: value,
              })
            }
          />

          <SettingSelect
            label="Sidebar"
            value={form.sidebar}
            options={[
              ["expanded", "Expanded"],
              ["compact", "Compact"],
            ]}
            onChange={(value) =>
              setForm({
                ...form,
                sidebar: value,
              })
            }
          />

          <label className="check-row">
            <input
              type="checkbox"
              checked={
                form.email_notifications
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  email_notifications:
                    event.target.checked,
                })
              }
            />
            Email notifications
          </label>

          <label className="check-row">
            <input
              type="checkbox"
              checked={
                form.product_updates
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  product_updates:
                    event.target.checked,
                })
              }
            />
            Product updates
          </label>

          <button
            className="primary-button"
            onClick={save}
          >
            Save appearance
          </button>
        </div>

        <div className="panel">
          <h3>Profile</h3>

          <input
            value={profile.name}
            onChange={(event) =>
              setProfile({
                ...profile,
                name: event.target.value,
              })
            }
            placeholder="Name"
          />

          <input
            value={profile.email}
            onChange={(event) =>
              setProfile({
                ...profile,
                email: event.target.value,
              })
            }
            placeholder="Email"
            type="email"
          />

          <button
            className="primary-button"
            onClick={updateProfile}
          >
            Update profile
          </button>

          <h3 className="section-gap">
            Change password
          </h3>

          <input
            type="password"
            value={
              passwords.current_password
            }
            onChange={(event) =>
              setPasswords({
                ...passwords,
                current_password:
                  event.target.value,
              })
            }
            placeholder="Current password"
          />

          <input
            type="password"
            value={
              passwords.new_password
            }
            onChange={(event) =>
              setPasswords({
                ...passwords,
                new_password:
                  event.target.value,
              })
            }
            placeholder="New password"
          />

          <button
            className="primary-button"
            onClick={changePassword}
          >
            Update password
          </button>
        </div>
      </div>
    </section>
  );
}

function SettingSelect({
  label,
  value,
  options,
  onChange,
}) {
  return (
    <label className="setting-field">
      <span>{label}</span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
      >
        {options.map(([value, label]) => (
          <option
            value={value}
            key={value}
          >
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SectionIntro({ text }) {
  return (
    <div className="section-intro">
      <span className="eyebrow">
        VERTOFI WORKSPACE
      </span>

      <p>{text}</p>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="empty">
      {text}
    </div>
  );
}