import { Link } from "react-router-dom";

import "./Home.css";


export default function Home() {

  return (
    <div className="home-page">

      {/* =====================================
          NAVBAR
      ===================================== */}

      <header className="home-navbar">

        <Link
          to="/"
          className="home-brand"
        >

          <span className="home-brand-mark">
            N
          </span>

          <span className="home-brand-name">
            NearConnect
          </span>

        </Link>


        <nav className="home-nav-links">

          <a href="#how-it-works">
            How it works
          </a>

          <a href="#features">
            Features
          </a>

          <a href="#privacy">
            Privacy
          </a>

          <Link
            to="/login"
            className="home-login"
          >
            Sign in
          </Link>

          <Link
            to="/register"
            className="home-register"
          >
            Get started
          </Link>

        </nav>

      </header>


      {/* =====================================
          HERO
      ===================================== */}

      <main>


        <section className="home-hero">

          <div className="home-hero-content">

            <div className="home-location-label">

              <span className="home-live-dot"></span>

              <span>
                YOUR NEARBY NETWORK
              </span>

            </div>


            <h1>

              Meet people
              <br />

              <span>nearby.</span>

              <br />

              Build real connections.

            </h1>


            <p className="home-hero-description">

              Discover compatible people around you,
              make new friends, and build meaningful
              connections based on shared interests.

            </p>


            {/* BUTTONS */}

            <div className="home-hero-buttons">

              <Link
                to="/register"
                className="home-primary-button"
              >

                Get started

                <span>
                  →
                </span>

              </Link>


              <Link
                to="/login"
                className="home-secondary-button"
              >

                Sign in

              </Link>

            </div>


            <div className="home-trust">

              <span>
                ✓
              </span>

              No exact location shown publicly

            </div>

          </div>


          {/* =================================
              NETWORK VISUAL
          ================================= */}

          <div className="home-visual">

            <div className="home-grid"></div>


            <div className="home-ring home-ring-one"></div>

            <div className="home-ring home-ring-two"></div>

            <div className="home-ring home-ring-three"></div>


            {/* CONNECTIONS */}

            <div className="home-line home-line-one"></div>

            <div className="home-line home-line-two"></div>

            <div className="home-line home-line-three"></div>


            {/* CENTER */}

            <div className="home-center-point">

              <div className="home-center-icon">
                N
              </div>

            </div>


            {/* PEOPLE */}

            <div className="home-person home-person-one">

              <div className="home-avatar">
                👨🏻
              </div>

              <span>
                Rahul
              </span>

            </div>


            <div className="home-person home-person-two">

              <div className="home-avatar">
                👩🏻
              </div>

              <span>
                Ananya
              </span>

            </div>


            <div className="home-person home-person-three">

              <div className="home-avatar">
                🧑🏽
              </div>

              <span>
                Arjun
              </span>

            </div>


            <div className="home-person home-person-four">

              <div className="home-avatar">
                👩🏽
              </div>

              <span>
                Priya
              </span>

            </div>


            {/* DISTANCE */}

            <div className="home-distance">

              <span className="home-distance-dot"></span>

              People nearby

              <strong>
                2.4 km
              </strong>

            </div>

          </div>

        </section>


        {/* =====================================
            FEATURES
        ===================================== */}

        <section
          className="home-features"
          id="features"
        >

          <div className="home-section-heading">

            <span>
              WHY NEARCONNECT
            </span>

            <h2>
              Connections that feel closer.
            </h2>

            <p>
              Everything you need to discover
              and connect with people around you.
            </p>

          </div>


          <div className="home-feature-grid">


            <div className="home-feature-card">

              <div className="home-feature-icon">
                📍
              </div>

              <h3>
                Discover nearby
              </h3>

              <p>
                Find people around you without
                exposing your exact location.
              </p>

            </div>


            <div className="home-feature-card">

              <div className="home-feature-icon">
                ✨
              </div>

              <h3>
                Smart matching
              </h3>

              <p>
                Discover people based on shared
                interests and compatibility.
              </p>

            </div>


            <div className="home-feature-card">

              <div className="home-feature-icon">
                💬
              </div>

              <h3>
                Real-time chat
              </h3>

              <p>
                Connect with accepted friends
                through private conversations.
              </p>

            </div>


            <div className="home-feature-card">

              <div className="home-feature-icon">
                🛡️
              </div>

              <h3>
                Privacy first
              </h3>

              <p>
                Your exact location and private
                information stay protected.
              </p>

            </div>

          </div>

        </section>


        {/* =====================================
            HOW IT WORKS
        ===================================== */}

        <section
          className="home-how"
          id="how-it-works"
        >

          <div className="home-section-heading">

            <span>
              HOW IT WORKS
            </span>

            <h2>
              Start connecting in five steps.
            </h2>

          </div>


          <div className="home-steps">


            <div className="home-step">

              <span>
                01
              </span>

              <h3>
                Create your profile
              </h3>

              <p>
                Tell people a little about yourself.
              </p>

            </div>


            <div className="home-step">

              <span>
                02
              </span>

              <h3>
                Choose your radius
              </h3>

              <p>
                Decide how far you want to discover.
              </p>

            </div>


            <div className="home-step">

              <span>
                03
              </span>

              <h3>
                Discover people
              </h3>

              <p>
                Find compatible people nearby.
              </p>

            </div>


            <div className="home-step">

              <span>
                04
              </span>

              <h3>
                Send a request
              </h3>

              <p>
                Connect with people you're interested in.
              </p>

            </div>


            <div className="home-step">

              <span>
                05
              </span>

              <h3>
                Start chatting
              </h3>

              <p>
                Build real connections through chat.
              </p>

            </div>


          </div>

        </section>


        {/* =====================================
            PRIVACY
        ===================================== */}

        <section
          className="home-privacy"
          id="privacy"
        >

          <div>

            <span className="home-privacy-label">
              PRIVACY FIRST
            </span>

            <h2>
              Your location is yours.
            </h2>

            <p>
              NearConnect is designed to help you
              discover people nearby while keeping
              your exact location private.
            </p>

            <Link
              to="/register"
              className="home-primary-button"
            >
              Create your account →
            </Link>

          </div>

        </section>


      </main>


      {/* =====================================
          FOOTER
      ===================================== */}

      <footer className="home-footer">

        <div className="home-footer-brand">

          <span className="home-brand-mark">
            N
          </span>

          <span>
            NearConnect
          </span>

        </div>


        <div className="home-footer-links">

          <Link to="/">
            Home
          </Link>

          <Link to="/login">
            Sign in
          </Link>

          <Link to="/register">
            Register
          </Link>

        </div>


        <p>
          © 2026 NearConnect. All rights reserved.
        </p>

      </footer>

    </div>
  );
}