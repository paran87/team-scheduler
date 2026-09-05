"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { BackendConsole } from "./BackendConsole";

const ADMIN_NAME = "kath";
const ADMIN_PASSWORD = "cruz";

export function BackendGate() {
  const [admin, setAdmin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const name = admin.trim();
    const pass = password;
    if (name === ADMIN_NAME && pass === ADMIN_PASSWORD) {
      setError("");
      setUnlocked(true);
      return;
    }
    setError("Admin or Password is incorrect.");
  }

  if (unlocked) return <BackendConsole />;

  return (
    <div className="backend-page backend-login-page">
      <header className="backend-header">
        <div className="backend-header-inner">
          <div className="brand-block">
            <BrandLogo />
            <div>
              <p className="brand-title">Admin Console</p>
              <p className="brand-sub">Enter Admin and Password to continue</p>
            </div>
          </div>
          <Link href="/" className="backend-dash-link">
            ← Public dashboard
          </Link>
        </div>
      </header>

      <main className="backend-login-main">
        <form className="backend-card backend-login-card" onSubmit={onSubmit}>
          <h2 className="backend-login-title">Sign in</h2>

          <label className="backend-field">
            Admin
            <input
              type="text"
              autoComplete="username"
              placeholder="Admin name"
              value={admin}
              onChange={(event) => setAdmin(event.target.value)}
            />
          </label>

          <label className="backend-field">
            Password
            <span className="backend-password-wrap">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="backend-password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </span>
          </label>

          {error ? <p className="backend-login-error">{error}</p> : null}

          <button className="backend-submit" type="submit">
            Open admin
          </button>
        </form>
      </main>
    </div>
  );
}
