
import { useEffect, useRef, useState } from "react";
import vertofiLogo from "../assets/vertofi.jpg";
import { Link, useSearchParams } from "react-router-dom";
import "./auth.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const verificationStarted = useRef(false);

  const [status, setStatus] = useState(token ? "verifying" : "missing");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }
    if (verificationStarted.current) {
    return;
}

verificationStarted.current = true;

    const verify = async () => {
      try {
        const response = await fetch(
          `${API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            typeof data.detail === "string"
              ? data.detail
              : "Unable to verify this email address"
          );
        }

        setStatus("success");
      } catch (err) {
        setErrorMessage(err.message);
        setStatus("error");
      }
    };

    verify();
  }, [token]);

  return (
    <main className="auth-page">
      <div className="auth-container">
        <div className="auth-brand">
          <img src={vertofiLogo} alt="Vertofi" className="auth-logo" />
<div className="auth-brand-name">Vertofi</div>
        </div>

        <div className="auth-card">
          {status === "verifying" && (
            <>
              <h1>Verifying your email...</h1>
              <p className="auth-subtitle">
                Hang tight, this only takes a moment.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <h1>Email verified</h1>
              <p className="auth-subtitle">
                Your email address has been verified. You can now sign in.
              </p>
              <Link className="auth-button" to="/login">
                Go to sign in
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <h1>Verification failed</h1>
              <div className="auth-error">{errorMessage}</div>
              <p className="auth-subtitle">
                The link may have expired. You can request a new one from the
                sign-in page.
              </p>
              <Link className="auth-button" to="/login">
                Go to sign in
              </Link>
            </>
          )}

          {status === "missing" && (
            <>
              <h1>Missing verification link</h1>
              <p className="auth-subtitle">
                This page needs a verification token in the URL. Please use
                the link from your verification email.
              </p>
              <Link className="auth-button" to="/login">
                Go to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default VerifyEmail;
