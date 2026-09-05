import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import MagicRing from "../components/MagicRing";
import "./auth.css";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const response = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

      localStorage.setItem("token", data.access_token);

      const meResponse = await fetch("http://localhost:8000/auth/me", {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      });

      const userData = await meResponse.json();

      if (!meResponse.ok) {
        throw new Error("Unable to load your account");
      }

      login(userData);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-container">
        <div className="auth-brand">
          <div className="auth-brand-mark">S</div>
          <div className="auth-brand-name">SaaSify</div>
        </div>

        <MagicRing>
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
                  placeholder="you@example.com"
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

              <button className="auth-button" type="submit">
                Sign in
              </button>
            </form>

            <div className="auth-footer">
              Don't have an account? <Link to="/register">Create account</Link>
            </div>
          </div>
        </MagicRing>

        <div className="auth-security">
          Your account is securely protected.
        </div>
      </div>
    </main>
  );
}

export default Login;