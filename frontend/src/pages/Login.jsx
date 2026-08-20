import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import "./Login.css";

const API = "https://nearconnect-backend-cavd.onrender.com";

export default function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");


  // =========================================
  // INPUT CHANGE
  // =========================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
  };


  // =========================================
  // LOGIN
  // =========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    const username = formData.username.trim();
    const password = formData.password;


    // -----------------------------------------
    // VALIDATION
    // -----------------------------------------

    if (!username) {
      setError("Please enter your username.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }


    try {
      setLoading(true);


      // -----------------------------------------
      // LOGIN REQUEST
      // -----------------------------------------

      const response = await fetch(
        `${API}/api/auth/login`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            username,
            password,
          }),
        }
      );


      const data = await response.json();

      console.log("Login response:", data);


      // -----------------------------------------
      // LOGIN ERROR
      // -----------------------------------------

      if (!response.ok) {
        throw new Error(
          data.error ||
          data.message ||
          "Invalid username or password."
        );
      }


      // -----------------------------------------
      // TOKEN
      // -----------------------------------------

      if (!data.token) {
        throw new Error(
          "Login successful, but authentication token was not received."
        );
      }


      // -----------------------------------------
      // SAVE TOKEN
      // -----------------------------------------

      localStorage.setItem(
        "nearconnect_token",
        data.token
      );


      // -----------------------------------------
      // SAVE USER
      // -----------------------------------------

      if (data.user) {
        localStorage.setItem(
          "nearconnect_user",
          JSON.stringify(data.user)
        );
      }


      console.log(
        "NearConnect authentication saved."
      );


      // -----------------------------------------
      // DASHBOARD
      // -----------------------------------------

      navigate("/dashboard");


    } catch (err) {

      console.error(
        "Login error:",
        err
      );

      setError(
        err.message ||
        "Unable to login. Please try again."
      );

    } finally {

      setLoading(false);

    }
  };


  return (
    <div className="login-page">

      {/* =====================================
          NAVBAR
      ===================================== */}

      <header className="login-navbar">

        <Link
          to="/"
          className="login-brand"
        >

          <span className="login-brand-mark">
            N
          </span>

          <span className="login-brand-name">
            NearConnect
          </span>

        </Link>


        <div className="login-nav-right">

          <span>
            Don't have an account?
          </span>

          <Link to="/register">
            Get started
          </Link>

        </div>

      </header>


      {/* =====================================
          MAIN
      ===================================== */}

      <main className="login-main">

        <section className="login-card">


          {/* =================================
              LEFT SIDE
          ================================= */}

          <section className="login-intro">

            <div className="login-location-label">

              <span className="login-live-dot"></span>

              <span>
                YOUR NEARBY NETWORK
              </span>

            </div>


            <h1>
              Meet people
              <br />
              <span>
                closer to you.
              </span>
            </h1>


            <p className="login-description">
              Sign in to discover people
              around you based on location,
              distance, and shared interests.
            </p>


            {/* NETWORK VISUAL */}

            <div className="login-visual">

              <div className="login-grid"></div>

              <div className="login-circle login-circle-one"></div>

              <div className="login-circle login-circle-two"></div>

              <div className="login-circle login-circle-three"></div>


              <div className="login-connection login-connection-one"></div>

              <div className="login-connection login-connection-two"></div>


              <div className="login-center">

                <span>
                  📍
                </span>

              </div>


              <div className="login-person login-person-one">
                👨🏻
              </div>

              <div className="login-person login-person-two">
                👩🏻
              </div>

              <div className="login-person login-person-three">
                🧑🏽
              </div>

            </div>

          </section>


          {/* =================================
              RIGHT SIDE
          ================================= */}

          <section className="login-form-section">


            <div className="login-form-header">

              <span className="login-card-eyebrow">
                WELCOME BACK
              </span>

              <h2>
                Sign in to NearConnect.
              </h2>

              <p>
                Continue discovering people
                nearby.
              </p>

            </div>


            {/* ERROR */}

            {error && (

              <div className="login-message login-error">

                <span className="message-icon">
                  !
                </span>

                <span>
                  {error}
                </span>

              </div>

            )}


            {/* FORM */}

            <form
              className="login-form"
              onSubmit={handleSubmit}
            >


              {/* USERNAME */}

              <div className="login-field">

                <label htmlFor="username">
                  Username
                </label>


                <div className="login-input-wrapper">

                  <span className="login-input-prefix">
                    @
                  </span>

                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Enter your username"
                    autoComplete="username"
                    disabled={loading}
                  />

                </div>

              </div>


              {/* PASSWORD */}

              <div className="login-field">

                <div className="login-label-row">

                  <label htmlFor="password">
                    Password
                  </label>

                  <button
                    type="button"
                    className="login-show-button"
                    onClick={() =>
                      setShowPassword(
                        (prev) => !prev
                      )
                    }
                  >
                    {showPassword
                      ? "HIDE"
                      : "SHOW"}
                  </button>

                </div>


                <div className="login-input-wrapper">

                  <span className="login-input-prefix password-prefix">
                    •
                  </span>

                  <input
                    id="password"
                    name="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={loading}
                  />

                </div>

              </div>


              {/* SUBMIT */}

              <button
                type="submit"
                className="login-submit"
                disabled={loading}
              >

                {loading ? (

                  <>
                    <span className="login-spinner"></span>
                    Signing in
                  </>

                ) : (

                  <>
                    Sign in

                    <span className="login-submit-arrow">
                      →
                    </span>
                  </>

                )}

              </button>


            </form>


            {/* REGISTER */}

            <div className="login-register">

              <span>
                New to NearConnect?
              </span>

              <Link to="/register">
                Create an account
              </Link>

            </div>


            {/* PRIVACY */}

            <div className="login-privacy">

              <div className="privacy-check">
                ✓
              </div>

              <div>

                <strong>
                  Built with privacy in mind
                </strong>

                <p>
                  Your exact location is never
                  publicly shown to other users.
                </p>

              </div>

            </div>


          </section>

        </section>


        <div className="login-copyright">
          © 2026 NearConnect
        </div>

      </main>

    </div>
  );
}