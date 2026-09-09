import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import vertofiLogo from "../assets/vertofi.jpg";
import "./auth.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Invalid email or password"
        );
      }

      const meResponse = await fetch(`${API_URL}/auth/me`, {
        credentials: "include",
      });

      const userData = await meResponse.json();

      if (!meResponse.ok) {
        throw new Error("Unable to load your account");
      }

      login(userData);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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

          <p className="auth-subtitle">
            Sign in to continue to your workspace.
          </p>

          {error && <div className="auth-error">{error}</div>}

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

            <button
              className="auth-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account?{" "}
            <Link to="/register">Create account</Link>
          </div>
        </div>

        <div className="auth-security">
          Your account is securely protected.
        </div>
      </div>
    </main>
  );
}

export default Login;