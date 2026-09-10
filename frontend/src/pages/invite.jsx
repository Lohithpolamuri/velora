import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../utils/api";
import vertofiLogo from "../assets/vertofi.jpg";
import { useAuth } from "../context/AuthContext";
import "./auth.css";

export default function Invite() {
  const { token } = useParams();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  useEffect(() => { apiFetch(`/api/invitations/${encodeURIComponent(token)}`).then(setData).catch(e => setError(e.message)); }, [token]);
  const accept = async () => { try { await apiFetch(`/api/invitations/${encodeURIComponent(token)}/accept`, { method: "POST" }); setAccepted(true); setTimeout(() => navigate("/dashboard"), 600); } catch (e) { setError(e.message); } };
  return <main className="auth-page"><div className="auth-container"><div className="auth-brand"><img src={vertofiLogo} alt="Vertofi" className="auth-logo"/><div className="auth-brand-name">Vertofi</div></div><div className="auth-card"><h1>{accepted ? "Welcome to the workspace" : "You're invited"}</h1>{error ? <div className="auth-error">{error}</div> : data ? <><p className="auth-subtitle"><strong>{data.inviter}</strong> invited <strong>{data.email}</strong> to join <strong>{data.workspace}</strong>.</p>{isAuthenticated ? <button className="auth-button" onClick={accept} disabled={user?.email?.toLowerCase() !== data.email.toLowerCase()}>Accept invitation</button> : <div className="auth-footer"><Link to={`/login?invite=${encodeURIComponent(token)}`}>Sign in to accept</Link> · <Link to={`/register?invite=${encodeURIComponent(token)}`}>Create account</Link></div>}</> : <p className="auth-subtitle">Loading invitation…</p>}</div></div></main>;
}
