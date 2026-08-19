import React from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
} from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Friends from "./pages/Friends";
import Messages from "./pages/Messages";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

import { LanguageProvider } from "./i18n/LanguageContext";

import "./App.css";
import "./launch-theme.css";

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>

          {/* HOME */}
          <Route
            path="/"
            element={<Home />}
          />

          {/* LOGIN */}
          <Route
            path="/login"
            element={<Login />}
          />

          {/* REGISTER */}
          <Route
            path="/register"
            element={<Register />}
          />

          {/* DASHBOARD */}
          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          {/* NEARBY */}
          <Route
            path="/nearby"
            element={<Dashboard />}
          />

          {/* FRIENDS */}
          <Route
            path="/friends"
            element={<Friends />}
          />

          {/* MESSAGES */}
          <Route
            path="/messages"
            element={<Messages />}
          />

          {/* NOTIFICATIONS */}
          <Route
            path="/notifications"
            element={<Notifications />}
          />

          {/* PROFILE */}
          <Route
            path="/profile"
            element={<Profile />}
          />

          {/* SETTINGS */}
          <Route
            path="/settings"
            element={<Settings />}
          />

          {/* UNKNOWN URL */}
          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}


/* =========================================================
   HOME PAGE
   ========================================================= */

function Home() {
  return (
    <div className="nc-home">

      {/* NAVBAR */}
      <header className="nc-home-nav">

        <Link
          to="/"
          className="nc-home-brand"
        >
          <span className="nc-home-logo">
            N
          </span>

          <span className="nc-home-brand-name">
            NearConnect
          </span>
        </Link>


        <div className="nc-home-actions">

          <Link
            to="/login"
            className="nc-home-login"
          >
            Log in
          </Link>

          <Link
            to="/register"
            className="nc-home-create"
          >
            Create Account
          </Link>

        </div>

      </header>


      {/* MAIN */}
      <main className="nc-home-main">

        {/* LEFT */}
        <div className="nc-home-copy">

          <span className="nc-home-label">
            YOUR LOCAL SOCIAL RADAR
          </span>


          <h1>
            See who’s
            <br />
            <span>around.</span>
          </h1>


          <p>
            Discover people nearby.
            <br />
            Connect. Chat. Meet.
          </p>


          <Link
            to="/register"
            className="nc-home-cta"
          >
            Create Account
            <span>→</span>
          </Link>

        </div>


        {/* RADAR */}
        <div className="nc-home-radar">

          <div className="nc-ring nc-ring-1" />

          <div className="nc-ring nc-ring-2" />

          <div className="nc-ring nc-ring-3" />


          <div className="nc-you">
            YOU
          </div>


          <div className="nc-dot nc-dot-1">
            H
          </div>


          <div className="nc-dot nc-dot-2">
            R
          </div>


          <div className="nc-dot nc-dot-3">
            A
          </div>


          <div className="nc-dot nc-dot-4">
            S
          </div>

        </div>

      </main>


      {/* FOOTER */}
      <footer className="nc-home-footer">

        <span>
          2–5 km discovery
        </span>

        <span>
          Private connections
        </span>

        <span>
          Real-time chat
        </span>

      </footer>

    </div>
  );
}


export default App;