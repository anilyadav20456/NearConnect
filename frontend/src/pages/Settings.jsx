import React, {
  useEffect,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import {
  apiFetch,
  getToken
} from "../api";

import {
  useLanguage
} from "../i18n/LanguageContext";

import "./Settings.css";


export default function Settings() {

  const navigate = useNavigate();

  const token = getToken();

  const {
    language,
    setLanguage,
    t
  } = useLanguage();


  // =====================================================
  // STATE
  // =====================================================

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [profile, setProfile] =
    useState(null);


  // =====================================================
  // SETTINGS
  // =====================================================

  const [discoverable, setDiscoverable] =
    useState(true);

  const [showOnlineStatus, setShowOnlineStatus] =
    useState(true);

  const [defaultRadius, setDefaultRadius] =
    useState(2);

  const [notificationEnabled, setNotificationEnabled] =
    useState(true);


  // =====================================================
  // PASSWORD
  // =====================================================

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [changingPassword, setChangingPassword] =
    useState(false);


  // =====================================================
  // AUTH
  // =====================================================

  useEffect(() => {

    if (!token) {

      navigate(
        "/login",
        { replace: true }
      );

      return;
    }

    loadSettings();

  }, [token, navigate]);


  // =====================================================
  // LOAD SETTINGS
  // =====================================================

  const loadSettings = async () => {

    try {

      setLoading(true);
      setError("");

      const data =
        await apiFetch(
          "/api/users/profile"
        );

      const user =
        data.user || data;

      setProfile(user);

      setDiscoverable(
        user.is_discoverable !== false
      );

      setShowOnlineStatus(
        user.show_online_status !== false
      );

      setDefaultRadius(
        [2, 4, 5].includes(
          Number(user.default_radius)
        )
          ? Number(user.default_radius)
          : 2
      );

      const savedNotifications =
        localStorage.getItem(
          "nearconnect_notifications_enabled"
        );

      setNotificationEnabled(
        savedNotifications !== "false"
      );

      if (
        user.language === "en" ||
        user.language === "te"
      ) {

        setLanguage(
          user.language
        );

      }

    } catch (err) {

      console.error(
        "SETTINGS LOAD:",
        err
      );

      setError(
        err.message ||
        "Unable to load settings."
      );

    } finally {

      setLoading(false);

    }

  };


  // =====================================================
  // SUCCESS
  // =====================================================

  const showSuccessMessage = message => {

    setSuccess(message);
    setError("");

    setTimeout(() => {
      setSuccess("");
    }, 3000);

  };


  // =====================================================
  // LANGUAGE
  // =====================================================

  const handleLanguageChange = async newLanguage => {

    setLanguage(
      newLanguage
    );

    try {

      await apiFetch(
        "/api/users/profile",
        {
          method: "PUT",

          body: JSON.stringify({
            language:
              newLanguage
          })
        }
      );

    } catch (err) {

      console.error(
        "LANGUAGE SAVE:",
        err
      );

    }

  };


  // =====================================================
  // SAVE SETTINGS
  // =====================================================

  const saveSettings = async () => {

    try {

      setSaving(true);
      setError("");

      await apiFetch(
        "/api/users/profile",
        {
          method: "PUT",

          body: JSON.stringify({

            is_discoverable:
              discoverable,

            show_online_status:
              showOnlineStatus,

            default_radius:
              Number(defaultRadius),

            language:
              language

          })
        }
      );


      localStorage.setItem(
        "nearconnect_notifications_enabled",
        notificationEnabled
          ? "true"
          : "false"
      );


      showSuccessMessage(
        language === "te"
          ? "సెట్టింగ్‌లు విజయవంతంగా సేవ్ చేయబడ్డాయి."
          : "Settings saved successfully."
      );

    } catch (err) {

      console.error(
        "SAVE SETTINGS:",
        err
      );

      setError(
        err.message ||
        "Unable to save settings."
      );

    } finally {

      setSaving(false);

    }

  };


  // =====================================================
  // CHANGE PASSWORD
  // =====================================================

  const handlePasswordChange = async event => {

    event.preventDefault();

    setError("");
    setSuccess("");


    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {

      setError(
        language === "te"
          ? "దయచేసి అన్ని పాస్‌వర్డ్ ఫీల్డ్‌లను పూర్తి చేయండి."
          : "Please fill in all password fields."
      );

      return;

    }


    if (
      newPassword.length < 6
    ) {

      setError(
        language === "te"
          ? "కొత్త పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి."
          : "New password must be at least 6 characters."
      );

      return;

    }


    if (
      newPassword !==
      confirmPassword
    ) {

      setError(
        language === "te"
          ? "కొత్త పాస్‌వర్డ్‌లు ఒకేలా లేవు."
          : "New password and confirmation do not match."
      );

      return;

    }


    try {

      setChangingPassword(true);

      await apiFetch(
        "/api/auth/change-password",
        {
          method: "PUT",

          body: JSON.stringify({

            current_password:
              currentPassword,

            new_password:
              newPassword

          })
        }
      );


      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");


      showSuccessMessage(
        language === "te"
          ? "పాస్‌వర్డ్ విజయవంతంగా మార్చబడింది."
          : "Password changed successfully."
      );

    } catch (err) {

      console.error(
        "CHANGE PASSWORD:",
        err
      );

      setError(
        err.message ||
        "Unable to change password."
      );

    } finally {

      setChangingPassword(false);

    }

  };


  // =====================================================
  // NAVIGATION
  // =====================================================

  const goDashboard = () => {
    navigate("/dashboard");
  };

  const goProfile = () => {
    navigate("/profile");
  };

  const goFriends = () => {
    navigate("/friends");
  };

  const goMessages = () => {
    navigate("/messages");
  };

  const goNotifications = () => {
    navigate("/notifications");
  };

  const goBlocked = () => {
    navigate("/friends");
  };


  // =====================================================
  // LOADING
  // =====================================================

  if (
    !token ||
    loading
  ) {

    return (

      <div className="settings-page">

        <div className="settings-loading">

          <div className="settings-spinner" />

          <h2>
            {t("common.loading")}
          </h2>

          <p>
            {language === "te"
              ? "మీ ప్రాధాన్యతలను సిద్ధం చేస్తోంది..."
              : "Preparing your preferences..."}
          </p>

        </div>

      </div>

    );

  }


  // =====================================================
  // MAIN
  // =====================================================

  return (

    <div className="settings-page">


      {/* =================================================
          HEADER
      ================================================= */}

      <header className="settings-header">

        <div className="settings-brand">

          <button
            type="button"
            className="settings-back"
            onClick={goDashboard}
            aria-label="Back"
          >
            ←
          </button>


          <div className="settings-logo">
            N
          </div>


          <div>

            <h1>
              {t("settings.title")}
            </h1>

            <p>
              {t("settings.subtitle")}
            </p>

          </div>

        </div>


        <div className="settings-header-actions">

          <button
            type="button"
            onClick={goFriends}
          >
            👥 {t("common.friends")}
          </button>


          <button
            type="button"
            onClick={goMessages}
          >
            💬 {t("common.messages")}
          </button>


          <button
            type="button"
            onClick={goNotifications}
          >
            🔔 {t("common.notifications")}
          </button>

        </div>

      </header>


      {/* =================================================
          MAIN
      ================================================= */}

      <main className="settings-main">


        {/* =================================================
            HERO
        ================================================= */}

        <section className="settings-hero">

          <div>

            <span className="settings-label">
              {t("settings.accountPreferences")}
            </span>


            <h2>
              {t("settings.yourAccount")}
            </h2>


            <p>
              {t("settings.description")}
            </p>

          </div>


          <div className="settings-hero-icon">
            ⚙️
          </div>

        </section>


        {/* =================================================
            SUCCESS
        ================================================= */}

        {success && (

          <div className="settings-success">

            <span>✓</span>

            {success}

          </div>

        )}


        {/* =================================================
            ERROR
        ================================================= */}

        {error && (

          <div className="settings-error">

            <span>⚠️</span>

            {error}

          </div>

        )}


        {/* =================================================
            LAYOUT
        ================================================= */}

        <div className="settings-layout">


          {/* =================================================
              SIDEBAR
          ================================================= */}

          <aside className="settings-sidebar">


            <button
              type="button"
              className="settings-sidebar-active"
              onClick={() =>
                window.scrollTo({
                  top: 0,
                  behavior: "smooth"
                })
              }
            >
              <span>⚙️</span>
              {t("settings.account")}
            </button>


            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("privacy")
                  ?.scrollIntoView({
                    behavior: "smooth"
                  })
              }
            >
              <span>🛡️</span>
              {t("settings.privacy")}
            </button>


            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("notifications")
                  ?.scrollIntoView({
                    behavior: "smooth"
                  })
              }
            >
              <span>🔔</span>
              {t("settings.notifications")}
            </button>


            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("language")
                  ?.scrollIntoView({
                    behavior: "smooth"
                  })
              }
            >
              <span>🌐</span>
              {t("settings.language")}
            </button>


            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("security")
                  ?.scrollIntoView({
                    behavior: "smooth"
                  })
              }
            >
              <span>🔐</span>
              {t("settings.security")}
            </button>


            <button
              type="button"
              onClick={goBlocked}
            >
              <span>🚫</span>
              {t("settings.blockedUsers")}
            </button>

          </aside>


          {/* =================================================
              CONTENT
          ================================================= */}

          <div className="settings-content">


            {/* =================================================
                PROFILE
            ================================================= */}

            <section className="settings-card">

              <div className="settings-card-header">

                <div>

                  <span>
                    {t("settings.account").toUpperCase()}
                  </span>

                  <h3>
                    {t("settings.yourProfile")}
                  </h3>

                </div>


                {/* THIS NOW WORKS */}

                <button
                  type="button"
                  onClick={goProfile}
                >
                  {t("profile.editProfile")} →
                </button>

              </div>


              <div className="settings-profile-summary">

                <div className="settings-avatar">

                  {(
                    profile?.name ||
                    profile?.username ||
                    "N"
                  )
                    .charAt(0)
                    .toUpperCase()}

                </div>


                <div>

                  <strong>
                    {profile?.name ||
                      profile?.username ||
                      "User"}
                  </strong>


                  <span>
                    @{profile?.username ||
                      "username"}
                  </span>


                  <p>
                    {profile?.bio ||
                      t("profile.addBio")}
                  </p>

                </div>

              </div>

            </section>


            {/* =================================================
                PRIVACY
            ================================================= */}

            <section
              id="privacy"
              className="settings-card"
            >

              <div className="settings-card-heading">

                <div className="settings-section-icon">
                  🛡️
                </div>

                <div>

                  <span>
                    {t("settings.privacy").toUpperCase()}
                  </span>

                  <h3>
                    {t("settings.discoveryVisibility")}
                  </h3>

                </div>

              </div>


              {/* DISCOVERABLE */}

              <div className="settings-option">

                <div className="settings-option-icon">
                  📍
                </div>


                <div className="settings-option-content">

                  <strong>
                    {t("profile.discoverable")}
                  </strong>

                  <p>
                    {t("settings.discoverableDescription")}
                  </p>

                </div>


                <label className="settings-switch">

                  <input
                    type="checkbox"
                    checked={discoverable}
                    onChange={event =>
                      setDiscoverable(
                        event.target.checked
                      )
                    }
                  />

                  <span />

                </label>

              </div>


              {/* ONLINE STATUS */}

              <div className="settings-option">

                <div className="settings-option-icon">
                  🟢
                </div>


                <div className="settings-option-content">

                  <strong>
                    {t("settings.showOnlineStatus")}
                  </strong>

                  <p>
                    {t("settings.showOnlineDescription")}
                  </p>

                </div>


                <label className="settings-switch">

                  <input
                    type="checkbox"
                    checked={showOnlineStatus}
                    onChange={event =>
                      setShowOnlineStatus(
                        event.target.checked
                      )
                    }
                  />

                  <span />

                </label>

              </div>


              {/* RADIUS */}

              <div className="settings-option settings-radius-option">

                <div className="settings-option-icon">
                  📏
                </div>


                <div className="settings-option-content">

                  <strong>
                    {t("settings.defaultRadius")}
                  </strong>

                  <p>
                    {t("settings.defaultRadiusDescription")}
                  </p>


                  <div className="settings-radius-buttons">

                    {[2, 4, 5].map(
                      value => (

                        <button
                          type="button"
                          key={value}
                          className={
                            Number(
                              defaultRadius
                            ) === value
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            setDefaultRadius(
                              value
                            )
                          }
                        >
                          {value} km
                        </button>

                      )
                    )}

                  </div>

                </div>

              </div>

            </section>


            {/* =================================================
                NOTIFICATIONS
            ================================================= */}

            <section
              id="notifications"
              className="settings-card"
            >

              <div className="settings-card-heading">

                <div className="settings-section-icon">
                  🔔
                </div>

                <div>

                  <span>
                    {t("settings.notifications").toUpperCase()}
                  </span>

                  <h3>
                    {t("settings.notificationPreferences")}
                  </h3>

                </div>

              </div>


              <div className="settings-option">

                <div className="settings-option-icon">
                  💬
                </div>


                <div className="settings-option-content">

                  <strong>
                    {t("settings.notificationsEnabled")}
                  </strong>

                  <p>
                    {t("settings.notificationDescription")}
                  </p>

                </div>


                <label className="settings-switch">

                  <input
                    type="checkbox"
                    checked={notificationEnabled}
                    onChange={event =>
                      setNotificationEnabled(
                        event.target.checked
                      )
                    }
                  />

                  <span />

                </label>

              </div>


              <div className="settings-info-box">

                <span>ℹ️</span>

                <p>
                  {t("settings.browserNotificationInfo")}
                </p>

              </div>

            </section>


            {/* =================================================
                LANGUAGE
            ================================================= */}

            <section
              id="language"
              className="settings-card"
            >

              <div className="settings-card-heading">

                <div className="settings-section-icon">
                  🌐
                </div>

                <div>

                  <span>
                    {t("settings.language").toUpperCase()}
                  </span>

                  <h3>
                    {t("settings.appLanguage")}
                  </h3>

                </div>

              </div>


              <div className="settings-language-grid">

                <button
                  type="button"
                  className={
                    language === "en"
                      ? "selected"
                      : ""
                  }
                  onClick={() =>
                    handleLanguageChange("en")
                  }
                >

                  <span>🇬🇧</span>

                  <div>

                    <strong>
                      {t("settings.english")}
                    </strong>

                    <small>
                      English
                    </small>

                  </div>


                  {language === "en" && (
                    <b>✓</b>
                  )}

                </button>


                <button
                  type="button"
                  className={
                    language === "te"
                      ? "selected"
                      : ""
                  }
                  onClick={() =>
                    handleLanguageChange("te")
                  }
                >

                  <span>🇮🇳</span>

                  <div>

                    <strong>
                      {t("settings.telugu")}
                    </strong>

                    <small>
                      Telugu
                    </small>

                  </div>


                  {language === "te" && (
                    <b>✓</b>
                  )}

                </button>

              </div>

            </section>


            {/* =================================================
                SECURITY
            ================================================= */}

            <section
              id="security"
              className="settings-card"
            >

              <div className="settings-card-heading">

                <div className="settings-section-icon">
                  🔐
                </div>

                <div>

                  <span>
                    {t("settings.security").toUpperCase()}
                  </span>

                  <h3>
                    {t("settings.changePassword")}
                  </h3>

                </div>

              </div>


              <form
                className="password-form"
                onSubmit={
                  handlePasswordChange
                }
              >

                <div className="password-field">

                  <label>
                    {t("settings.currentPassword")}
                  </label>

                  <input
                    type="password"
                    value={currentPassword}
                    onChange={event =>
                      setCurrentPassword(
                        event.target.value
                      )
                    }
                  />

                </div>


                <div className="password-field">

                  <label>
                    {t("settings.newPassword")}
                  </label>

                  <input
                    type="password"
                    value={newPassword}
                    onChange={event =>
                      setNewPassword(
                        event.target.value
                      )
                    }
                    minLength={6}
                  />

                  <small>
                    {t("settings.minimumPassword")}
                  </small>

                </div>


                <div className="password-field">

                  <label>
                    {t("settings.confirmPassword")}
                  </label>

                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={event =>
                      setConfirmPassword(
                        event.target.value
                      )
                    }
                    minLength={6}
                  />

                </div>


                <button
                  type="submit"
                  className="password-button"
                  disabled={
                    changingPassword
                  }
                >

                  {changingPassword
                    ? t("settings.changingPassword")
                    : t("settings.changePasswordButton")}

                </button>

              </form>

            </section>


            {/* =================================================
                BLOCKED
            ================================================= */}

            <section className="settings-card">

              <div className="settings-card-header">

                <div>

                  <span>
                    {t("friends.safety").toUpperCase()}
                  </span>

                  <h3>
                    {t("settings.blockedUsers")}
                  </h3>

                </div>


                <button
                  type="button"
                  onClick={goBlocked}
                >
                  {language === "te"
                    ? "నిర్వహించండి →"
                    : "Manage →"}
                </button>

              </div>


              <div className="settings-blocked-preview">

                <div className="settings-blocked-icon">
                  🚫
                </div>


                <div>

                  <strong>
                    {t("settings.manageBlocked")}
                  </strong>

                  <p>
                    {language === "te"
                      ? "మీరు బ్లాక్ చేసిన వినియోగదారులను చూడండి లేదా అన్‌బ్లాక్ చేయండి."
                      : "Review or unblock users you've previously blocked."}
                  </p>

                </div>

              </div>

            </section>


            {/* =================================================
                SAVE
            ================================================= */}

            <div className="settings-save-bar">

              <div>

                <strong>
                  {language === "te"
                    ? "ఏదైనా సెట్టింగ్ గురించి సందేహమా?"
                    : "Unsure about a setting?"}
                </strong>

                <span>
                  {language === "te"
                    ? "మీరు ఈ ప్రాధాన్యతలను ఎప్పుడైనా మార్చవచ్చు."
                    : "You can change these preferences anytime."}
                </span>

              </div>


              <button
                type="button"
                onClick={saveSettings}
                disabled={saving}
              >

                {saving
                  ? t("settings.saving")
                  : t("settings.saveChanges")}

              </button>

            </div>


          </div>

        </div>

      </main>

    </div>

  );

}