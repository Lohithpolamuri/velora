import { useEffect, useState } from "react";
import { apiFetch } from "../utils/api";

function relative(value) {
  if (!value) return "Recently";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function OverviewSection({ user, summary, onNavigate }) {
  if (!summary) return <div className="loading-card">Loading your workspace…</div>;
  const stats = summary.stats;
  return <>
    <div className="welcome-row"><div><span className="eyebrow">WELCOME BACK</span><h2>Hello, {user?.name} 👋</h2><p>Here's what's happening with your workspace today.</p></div><button className="primary-button" onClick={() => onNavigate("Workspace")}>+ Create new</button></div>
    <div className="stats-grid">
      <Stat label="Your Activity" value={stats.activity} note="Actions on your account" />
      <Stat label="Projects" value={stats.projects} note="Active workspace projects" />
      <Stat label="Team Members" value={stats.members} note={`${stats.active_members} active now`} />
      <Stat label="Plan Usage" value={`${stats.usage_percent}%`} note={`${summary.subscription.usage_limit - summary.subscription.usage_count} remaining`} progress={stats.usage_percent} />
    </div>
    <div className="overview-grid">
      <QuickCard title="Activity" text="Review only your account activity." action={() => onNavigate("Activity")} />
      <QuickCard title="Notifications" text={`${stats.unread_notifications} unread notification${stats.unread_notifications === 1 ? "" : "s"}.`} action={() => onNavigate("Notifications")} />
      <QuickCard title="Workspace" text={`${stats.members} member${stats.members === 1 ? "" : "s"} in this workspace.`} action={() => onNavigate("Workspace")} />
    </div>
  </>;
}

function Stat({ label, value, note, progress }) { return <div className="stat-card"><span>{label}</span><strong>{value}</strong><small>{note}</small>{progress !== undefined && <div className="progress"><i style={{ width: `${Math.min(100, progress)}%` }} /></div>}</div>; }
function QuickCard({ title, text, action }) { return <button className="quick-card" onClick={action}><div><h3>{title}</h3><p>{text}</p></div><span>→</span></button>; }

export function ActivitySection() {
  const [items, setItems] = useState([]);
  const load = () => apiFetch("/api/activity").then(setItems).catch(() => {});
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);
  return <section><SectionIntro title="Recent Activity" text="Only actions belonging to your authenticated account are shown." /><div className="list-card">{items.length ? items.map(item => <div className="list-row" key={item.id}><div><strong>{item.title}</strong><p>{item.description}</p></div><time>{relative(item.timestamp)}</time></div>) : <Empty text="No activity recorded yet." />}</div></section>;
}

export function NotificationsSection({ onChanged }) {
  const [items, setItems] = useState([]);
  const load = () => apiFetch("/api/notifications").then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);
  const markRead = async (id) => { await apiFetch(`/api/notifications/${id}/read`, { method: "POST" }); await load(); onChanged?.("Notification marked as read"); };
  return <section><SectionIntro title="Notifications" text="Real events from your account and workspace." /><div className="list-card">{items.length ? items.map(item => <div className={`list-row ${item.unread ? "unread" : ""}`} key={item.id}><div><strong>{item.title}</strong><p>{item.message}</p><time>{relative(item.timestamp)}</time></div>{item.unread && <button className="small-button" onClick={() => markRead(item.id)}>Mark read</button>}</div>) : <Empty text="You're all caught up." />}</div></section>;
}

export function WorkspaceSection({ user, onChanged }) {
  const [workspace, setWorkspace] = useState(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const load = () => apiFetch("/api/workspace").then(setWorkspace).catch(() => {});
  useEffect(() => { load(); }, []);
  const invite = async (event) => { event.preventDefault(); setLoading(true); try { await apiFetch("/api/invitations", { method: "POST", body: JSON.stringify({ email }) }); setEmail(""); onChanged?.("Invitation sent successfully"); } catch (e) { onChanged?.(e.message); } finally { setLoading(false); } };
  return <section><SectionIntro title={workspace?.name || "Workspace"} text="Invite real teammates and manage your current members." /><div className="workspace-grid"><div className="panel"><h3>Invite a teammate</h3><p>The invite is emailed to the address you enter.</p><form className="inline-form" onSubmit={invite}><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="teammate@example.com" required /><button className="primary-button" disabled={loading}>{loading ? "Sending…" : "Send invite"}</button></form></div><div className="panel"><h3>Members</h3>{workspace?.members?.map(member => <div className="member-row" key={member.id}><div className="avatar small">{member.name.charAt(0).toUpperCase()}</div><div><strong>{member.name}</strong><small>{member.email}</small></div><span>{member.role}</span></div>)}</div></div></section>;
}

export function ProjectsSection({ onChanged }) {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const load = () => apiFetch("/api/projects").then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);
  const create = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    try { await apiFetch("/api/projects", { method: "POST", body: JSON.stringify({ name }) }); setName(""); await load(); onChanged?.("Project created successfully"); } catch (e) { onChanged?.(e.message); }
  };
  const remove = async (id) => {
    try { await apiFetch(`/api/projects/${id}`, { method: "DELETE" }); await load(); onChanged?.("Project removed"); } catch (e) { onChanged?.(e.message); }
  };
  return <section><SectionIntro title="Projects" text="Real projects stored in your workspace database." /><div className="panel"><form className="inline-form" onSubmit={create}><input value={name} onChange={e => setName(e.target.value)} placeholder="New project name" required /><button className="primary-button">Create project</button></form></div><div className="list-card project-list">{items.length ? items.map(item => <div className="list-row" key={item.id}><div><strong>{item.name}</strong><p>{item.status}</p></div><button className="small-button danger" onClick={() => remove(item.id)}>Delete</button></div>) : <Empty text="No projects yet. Create your first project above." />}</div></section>;
}

export function SubscriptionSection({ onChanged }) {
  const [data, setData] = useState(null);
  const load = () => apiFetch("/api/subscription").then(setData).catch(() => {});
  useEffect(() => { load(); }, []);
  const choose = async (plan) => { try { await apiFetch("/api/subscription", { method: "POST", body: JSON.stringify({ plan }) }); await load(); onChanged?.(`Switched to ${plan} plan`); } catch (e) { onChanged?.(e.message); } };
  return <section><SectionIntro title="Subscription" text="Plan state is stored on your account. Payments are not connected yet." /><div className="plans-grid">{[["Free","100 actions"],["Pro","1,000 actions"],["Business","10,000 actions"]].map(([name,desc]) => <button key={name} className={`plan-card ${data?.plan === name ? "selected" : ""}`} onClick={() => choose(name)}><span>{name}</span><strong>{desc}</strong><small>{data?.plan === name ? "Current plan" : "Choose plan"}</small></button>)}</div></section>;
}

export function SettingsSection({ user, preferences, onSaved }) {
  const [form, setForm] = useState(preferences || { theme: "light", accent: "green", font: "inter", layout: "comfortable", sidebar: "expanded", email_notifications: true, product_updates: true });
  const [profile, setProfile] = useState({ name: user?.name || "", email: user?.email || "" });
  const [passwords, setPasswords] = useState({ current_password: "", new_password: "" });
  useEffect(() => { if (preferences) setForm(preferences); }, [preferences]);
  const save = async () => { await apiFetch("/api/preferences", { method: "PUT", body: JSON.stringify(form) }); onSaved?.(form); };
  const updateProfile = async () => { await apiFetch("/auth/me", { method: "PUT", body: JSON.stringify(profile) }); onSaved?.(form); };
  const changePassword = async () => { await apiFetch("/auth/me/password", { method: "PUT", body: JSON.stringify(passwords) }); setPasswords({ current_password: "", new_password: "" }); alert("Password updated. Please sign in again."); window.location.href = "/login"; };
  return <section><SectionIntro title="Settings" text="Your preferences are stored with your account, not browser storage." /><div className="settings-grid"><div className="panel"><h3>Appearance</h3><SettingSelect label="Theme" value={form.theme} options={[["light","Light"],["dark","Dark"],["system","System"]]} onChange={v => setForm({...form, theme:v})}/><SettingSelect label="Accent" value={form.accent} options={[["green","Green"],["blue","Blue"],["purple","Purple"],["gold","Gold"],["rose","Rose"]]} onChange={v => setForm({...form, accent:v})}/><SettingSelect label="Font" value={form.font} options={[["inter","Inter"],["system","System"],["serif","Serif"],["mono","Mono"]]} onChange={v => setForm({...form, font:v})}/><SettingSelect label="Layout" value={form.layout} options={[["comfortable","Comfortable"],["compact","Compact"],["spacious","Spacious"]]} onChange={v => setForm({...form, layout:v})}/><SettingSelect label="Sidebar" value={form.sidebar} options={[["expanded","Expanded"],["compact","Compact"]]} onChange={v => setForm({...form, sidebar:v})}/><label className="check-row"><input type="checkbox" checked={form.email_notifications} onChange={e => setForm({...form,email_notifications:e.target.checked})}/> Email notifications</label><label className="check-row"><input type="checkbox" checked={form.product_updates} onChange={e => setForm({...form,product_updates:e.target.checked})}/> Product updates</label><button className="primary-button" onClick={save}>Save appearance</button></div><div className="panel"><h3>Profile</h3><input value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})} placeholder="Name"/><input value={profile.email} onChange={e=>setProfile({...profile,email:e.target.value})} placeholder="Email" type="email"/><button className="primary-button" onClick={updateProfile}>Update profile</button><h3 className="section-gap">Change password</h3><input type="password" value={passwords.current_password} onChange={e=>setPasswords({...passwords,current_password:e.target.value})} placeholder="Current password"/><input type="password" value={passwords.new_password} onChange={e=>setPasswords({...passwords,new_password:e.target.value})} placeholder="New password"/><button className="primary-button" onClick={changePassword}>Update password</button></div></div></section>;
}

function SettingSelect({ label, value, options, onChange }) { return <label className="setting-field"><span>{label}</span><select value={value} onChange={e=>onChange(e.target.value)}>{options.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>; }
function SectionIntro({ title, text }) { return <div className="section-intro"><span className="eyebrow">VERTОFI WORKSPACE</span><h2>{title}</h2><p>{text}</p></div>; }
function Empty({ text }) { return <div className="empty">{text}</div>; }