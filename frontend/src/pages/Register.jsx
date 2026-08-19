import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Register.css";

const API = "https://nearconnect-backend-cavd.onrender.com";

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");


  // =========================================
  // INPUT CHANGE
  // =========================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };


  // =========================================
  // REGISTER
  // =========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");


    // Read directly from form.
    // This also handles browser autofill.

    const form = e.currentTarget;

    const name =
      form.elements.name.value.trim();

    const username =
      form.elements.username.value.trim();

    const email =
      form.elements.email.value.trim();

    const password =
      form.elements.password.value;

    const confirmPassword =
      form.elements.confirmPassword.value;


    // =========================================
    // VALIDATION
    // =========================================

    if (!name) {
      setError("Please enter your full name.");
      return;
    }


    if (name.length < 2) {
      setError(
        "Name must contain at least 2 characters."
      );
      return;
    }


    if (!username) {
      setError("Please enter a username.");
      return;
    }


    if (username.length < 3) {
      setError(
        "Username must contain at least 3 characters."
      );
      return;
    }


    if (!email) {
      setError("Please enter your email.");
      return;
    }


    // Basic email validation

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      setError(
        "Please enter a valid email address."
      );
      return;
    }


    if (!password) {
      setError("Please enter a password.");
      return;
    }


    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }


    if (!confirmPassword) {
      setError(
        "Please confirm your password."
      );
      return;
    }


    if (password !== confirmPassword) {
      setError(
        "Passwords do not match."
      );
      return;
    }


    // =========================================
    // SEND TO FLASK
    // =========================================

    try {
      setLoading(true);

      const response = await fetch(
        `${API}/api/auth/register`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name: name,
            username: username,
            email: email,
            password: password,
          }),
        }
      );


      const data =
        await response.json();


      console.log(
        "Register response:",
        data
      );


      // =========================================
      // BACKEND ERROR
      // =========================================

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Unable to create account."
        );
      }


      // =========================================
      // SUCCESS
      // =========================================

      setSuccess(
        "Account created successfully."
      );


      setFormData({
        name: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
      });


      // =========================================
      // GO TO LOGIN
      // =========================================

      setTimeout(() => {
        navigate("/login");
      }, 1200);


    } catch (err) {

      console.error(
        "Registration error:",
        err
      );

      setError(
        err.message ||
          "Unable to create account. Please try again."
      );

    } finally {

      setLoading(false);

    }
  };


  return (
    <div className="register-page">


      {/* =====================================
          NAVBAR
      ===================================== */}

      <header className="register-navbar">

        <Link
          to="/"
          className="register-brand"
        >

          <span className="register-brand-mark">
            N
          </span>

          <span className="register-brand-name">
            NearConnect
          </span>

        </Link>


        <div className="register-nav-right">

          <span>
            Already have an account?
          </span>

          <Link to="/login">
            Sign in
          </Link>

        </div>

      </header>


      {/* =====================================
          MAIN
      ===================================== */}

      <main className="register-main">


        {/* =====================================
            LEFT SIDE
        ===================================== */}

        <section className="register-intro">

          <div className="register-location-label">

            <span className="register-live-dot"></span>

            <span>
              YOUR NEARBY NETWORK
            </span>

          </div>


          <h1>

            Start with

            <br />

            <span>
              people nearby.
            </span>

          </h1>


          <p className="register-description">

            Create your NearConnect account and
            discover people around you based on
            location, distance, and shared interests.

          </p>


          {/* =====================================
              NETWORK VISUAL
          ===================================== */}

          <div className="register-visual">

            <div className="register-grid"></div>

            <div className="register-circle circle-one"></div>

            <div className="register-circle circle-two"></div>

            <div className="register-circle circle-three"></div>


            <div className="register-connection connection-one"></div>

            <div className="register-connection connection-two"></div>

            <div className="register-connection connection-three"></div>


            <div className="register-center">

              <div className="register-center-glow"></div>

              <div className="register-center-dot">
                N
              </div>

            </div>


            <div className="register-person person-one">

              <span className="person-head"></span>

              <span className="person-body"></span>

            </div>


            <div className="register-person person-two">

              <span className="person-head"></span>

              <span className="person-body"></span>

            </div>


            <div className="register-person person-three">

              <span className="person-head"></span>

              <span className="person-body"></span>

            </div>


            <div className="register-person person-four">

              <span className="person-head"></span>

              <span className="person-body"></span>

            </div>


            <div className="register-distance distance-one">
              0.8 km
            </div>

            <div className="register-distance distance-two">
              1.6 km
            </div>

            <div className="register-distance distance-three">
              2.1 km
            </div>

          </div>


          {/* FEATURES */}

          <div className="register-features">

            <div>

              <span>
                01
              </span>

              Location based

            </div>


            <div>

              <span>
                02
              </span>

              Privacy focused

            </div>


            <div>

              <span>
                03
              </span>

              Real connections

            </div>

          </div>

        </section>


        {/* =====================================
            REGISTER CARD
        ===================================== */}

        <section className="register-card-wrapper">

          <div className="register-card">


            {/* HEADING */}

            <div className="register-card-heading">

              <span className="register-card-eyebrow">
                CREATE YOUR ACCOUNT
              </span>

              <h2>

                Let's get you

                <br />

                connected.

              </h2>

              <p>
                Set up your account in less than
                a minute.
              </p>

            </div>


            {/* ERROR */}

            {error && (

              <div className="register-message register-error">

                <span className="message-icon">
                  !
                </span>

                <span>
                  {error}
                </span>

              </div>

            )}


            {/* SUCCESS */}

            {success && (

              <div className="register-message register-success">

                <span className="message-icon">
                  ✓
                </span>

                <span>
                  {success}
                </span>

              </div>

            )}


            {/* =================================
                FORM
            ================================= */}

            <form
              className="register-form"
              onSubmit={handleSubmit}
              autoComplete="on"
            >


              {/* NAME */}

              <div className="register-field">

                <label htmlFor="name">
                  Full name
                </label>

                <div className="register-input-wrapper">

                  <span className="register-input-prefix">
                    👤
                  </span>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    disabled={loading}
                  />

                </div>

              </div>


              {/* USERNAME */}

              <div className="register-field">

                <label htmlFor="username">
                  Username
                </label>

                <div className="register-input-wrapper">

                  <span className="register-input-prefix">
                    @
                  </span>

                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Choose your username"
                    autoComplete="username"
                    disabled={loading}
                  />

                </div>

                <span className="register-field-hint">
                  At least 3 characters
                </span>

              </div>


              {/* EMAIL */}

              <div className="register-field">

                <label htmlFor="email">
                  Email address
                </label>

                <div className="register-input-wrapper">

                  <span className="register-input-prefix">
                    ✉
                  </span>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={loading}
                  />

                </div>

              </div>


              {/* PASSWORD */}

              <div className="register-field">

                <label htmlFor="password">
                  Password
                </label>

                <div className="register-input-wrapper">

                  <span className="register-input-prefix password-prefix">
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
                    placeholder="Create a password"
                    autoComplete="new-password"
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="register-show-button"
                    onClick={() =>
                      setShowPassword(
                        (previous) =>
                          !previous
                      )
                    }
                  >
                    {showPassword
                      ? "HIDE"
                      : "SHOW"}
                  </button>

                </div>

                <span className="register-field-hint">
                  At least 6 characters
                </span>

              </div>


              {/* CONFIRM PASSWORD */}

              <div className="register-field">

                <label htmlFor="confirmPassword">
                  Confirm password
                </label>

                <div className="register-input-wrapper">

                  <span className="register-input-prefix password-prefix">
                    •
                  </span>

                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      formData.confirmPassword
                    }
                    onChange={handleChange}
                    placeholder="Enter your password again"
                    autoComplete="new-password"
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="register-show-button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (previous) =>
                          !previous
                      )
                    }
                  >
                    {showConfirmPassword
                      ? "HIDE"
                      : "SHOW"}
                  </button>

                </div>

              </div>


              {/* SUBMIT */}

              <button
                type="submit"
                className="register-submit"
                disabled={loading}
              >

                {loading ? (

                  <>
                    <span className="register-spinner"></span>

                    Creating account
                  </>

                ) : (

                  <>
                    Create account

                    <span className="register-submit-arrow">
                      →
                    </span>
                  </>

                )}

              </button>

            </form>


            {/* LOGIN */}

            <div className="register-login">

              <span>
                Already a member?
              </span>

              <Link to="/login">
                Sign in
              </Link>

            </div>


            {/* PRIVACY */}

            <div className="register-privacy">

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

          </div>


          <div className="register-copyright">
            © 2026 NearConnect
          </div>

        </section>

      </main>

    </div>
  );
}