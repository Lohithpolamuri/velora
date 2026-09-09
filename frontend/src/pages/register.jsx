import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MagicRing from "../components/MagicRing";
import vertofiLogo from "../assets/vertofi.jpg";
import "./auth.css";

const SPECIAL_CHAR_REGEX = /[!@#$%^&*(),.?":{}|<>_\-+=[\]/\\;'`~]/;

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const hasMinLength = password.length >= 8;
  const hasSpecialChar = SPECIAL_CHAR_REGEX.test(password);
  const isPasswordValid = hasMinLength && hasSpecialChar;

  const isEmailValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    [email]
  );

  const canSubmit =
    name.trim().length > 0 && isEmailValid && isPasswordValid;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!isPasswordValid) {
      setError(
        "Password must be at least 8 characters long and include at least one special character."
      );
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Unable to create account"
        );
      }

      navigate("/login");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-container">
        <div className="auth-brand">
    <img src={vertofiLogo} alt="Vertofi" className="auth-logo" />
    <div className="auth-brand-name">Vertofi</div>
</div>

        <MagicRing>
          <div className="auth-card">
          <h1>Create account</h1>
          <p className="auth-subtitle">
            Start managing your workspace today.
          </p>

          {error && <div className="auth-error">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>

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
                placeholder="Create a password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />

              <ul className="password-requirements">
                <li
                  className={
                    hasMinLength
                      ? "requirement-met"
                      : "requirement-unmet"
                  }
                >
                  <span aria-hidden="true">
                    {hasMinLength ? "✓" : "✕"}
                  </span>
                  At least 8 characters
                </li>

                <li
                  className={
                    hasSpecialChar
                      ? "requirement-met"
                      : "requirement-unmet"
                  }
                >
                  <span aria-hidden="true">
                    {hasSpecialChar ? "✓" : "✕"}
                  </span>
                  At least one special character (e.g. ! @ # $ % & *)
                </li>
              </ul>
            </div>

            <button
              className="auth-button"
              type="submit"
              disabled={!canSubmit}
            >
              Create account
            </button>
          </form>

          <div className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
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

export default Register;
