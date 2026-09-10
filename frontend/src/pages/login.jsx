import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import vertofiLogo from "../assets/vertofi.jpg";
import { useAuth } from "../context/AuthContext";
import "./auth.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState("");
  const [resending, setResending] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNeedsVerification(false);
    setResendStatus("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.detail === "EMAIL_NOT_VERIFIED") {
          setNeedsVerification(true);
          throw new Error(
            "Your email address hasn't been verified yet. Check your inbox for the verification link."
          );
        }
        throw new Error(
          typeof data.detail === "string" ? data.detail : "Invalid email or password"
        );
      }

      const meResponse = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
      const userData = await meResponse.json();

      if (!meResponse.ok) {
        throw new Error("Unable to load your account");
      }

      login(userData);
      navigate(inviteToken ? `/invite/${inviteToken}` : "/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendStatus("");
    try {
      const response = await fetch(`${API_URL}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      await response.json().catch(() => ({}));
      setResendStatus("If that address is registered and unverified, a new link is on its way.");
    } catch {
      setResendStatus("Something went wrong sending that. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-container">
        <div className="auth-brand">
          <img src={vertofiLogo} alt="Vertofi" className="auth-logo" />
          <div className="auth-brand-name">Vertofi</div>
        </div>

        <div className="auth-card">
          <h1>Welcome back</h1>
          <p className="auth-subtitle">Sign in to continue to your workspace.</p>

          {error && <div className="auth-error">{error}</div>}

          {needsVerification && (
            <div className="auth-field" style={{ marginBottom: "1rem" }}>
              <button
                type="button"
                className="auth-button"
                onClick={handleResend}
                disabled={resending || !email}
              >
                {resending ? "Sending..." : "Resend verification email"}
              </button>
              {resendStatus && (
                <p className="auth-subtitle" style={{ marginTop: "0.5rem" }}>
                  {resendStatus}
                </p>
              )}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <button className="auth-button" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account? <Link to="/register">Create account</Link>
          </div>
        </div>

        <div className="auth-security">Your account is securely protected.</div>
      </div>
    </main>
  );
}

export default Login;