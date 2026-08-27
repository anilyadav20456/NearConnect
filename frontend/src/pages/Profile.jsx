import React, {
  useEffect,
  useRef,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import {
  apiFetch,
  getToken
} from "../api";

import "./Profile.css";




const API_BASE =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5001"
    : (process.env.REACT_APP_API_URL || "https://nearconnect-ohe3.onrender.com");


export default function Profile() {

  const navigate =
    useNavigate();

  const token =
    getToken();

  const fileInputRef =
    useRef(null);


  // =====================================================
  // STATE
  // =====================================================

  const [
    profile,
    setProfile
  ] = useState(null);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    editing,
    setEditing
  ] = useState(false);

  const [
    saving,
    setSaving
  ] = useState(false);

  const [
    uploading,
    setUploading
  ] = useState(false);

  const [
    preview,
    setPreview
  ] = useState("");

  const [
    selectedFile,
    setSelectedFile
  ] = useState(null);

  const [
    error,
    setError
  ] = useState("");

  const [
    success,
    setSuccess
  ] = useState("");


  // =====================================================
  // FORM
  // =====================================================

  const [
    form,
    setForm
  ] = useState({
    name: "",
    bio: "",
    profession: "",
    interests: "",
    date_of_birth: "",
    is_discoverable: true
  });


  // =====================================================
  // LOAD PROFILE
  // =====================================================

  useEffect(() => {

    if (!token) {

      navigate(
        "/login",
        {
          replace: true
        }
      );

      return;

    }


    loadProfile();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);


  // =====================================================
  // LOAD PROFILE
  // =====================================================

  const loadProfile =
    async () => {

      try {

        setLoading(true);

        setError("");


        const data =
          await apiFetch(
            "/api/users/profile"
          );


        const user =
          data.user ||
          data;


        setProfile(
          user
        );


        setForm({
          name:
            user.name ||
            "",

          bio:
            user.bio ||
            "",

          profession:
            user.profession ||
            "",

          interests:
            user.interests ||
            "",

          date_of_birth:
            user.date_of_birth ||
            "",

          is_discoverable:
            user.is_discoverable !== false
        });


        setPreview(
          user.profile_image
            ? getImageUrl(
                user.profile_image
              )
            : ""
        );


      } catch (err) {

        console.error(
          "PROFILE LOAD:",
          err
        );


        setError(
          err.message ||
          "Unable to load profile."
        );

      } finally {

        setLoading(false);

      }

    };


  // =====================================================
  // IMAGE URL
  // =====================================================

  const getImageUrl =
    imagePath => {

      if (!imagePath) {
        return "";
      }


      if (
        imagePath.startsWith(
          "http://"
        ) ||
        imagePath.startsWith(
          "https://"
        )
      ) {

        return imagePath;

      }


      if (
        imagePath.startsWith("/")
      ) {

        return `${API_BASE}${imagePath}`;

      }


      return `${API_BASE}/media/profile/${imagePath}`;

    };


  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleChange =
    event => {

      const {
        name,
        value,
        type,
        checked
      } = event.target;


      setForm(
        previous => ({

          ...previous,

          [name]:
            type ===
            "checkbox"
              ? checked
              : value

        })
      );

    };


  // =====================================================
  // IMAGE SELECT
  // =====================================================

  const handleFileSelect =
    event => {

      const file =
        event.target.files?.[0];


      if (!file) {
        return;
      }


      setError("");
      setSuccess("");


      // ---------------------------------------------------
      // TYPE
      // ---------------------------------------------------

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
      ];


      if (
        !allowedTypes.includes(
          file.type
        )
      ) {

        setError(
          "Please select a JPG, PNG or WEBP image."
        );

        event.target.value =
          "";

        return;

      }


      // ---------------------------------------------------
      // SIZE: 5 MB
      // ---------------------------------------------------

      const maxSize =
        5 *
        1024 *
        1024;


      if (
        file.size >
        maxSize
      ) {

        setError(
          "Image size must be 5 MB or smaller."
        );

        event.target.value =
          "";

        return;

      }


      // ---------------------------------------------------
      // PREVIEW
      // ---------------------------------------------------

      const previewUrl =
        URL.createObjectURL(
          file
        );


      if (preview) {

        try {

          URL.revokeObjectURL(
            preview
          );

        } catch {}

      }


      setSelectedFile(
        file
      );


      setPreview(
        previewUrl
      );

    };


  // =====================================================
  // UPLOAD IMAGE
  // =====================================================

  const uploadProfileImage =
    async () => {

      if (
        !selectedFile
      ) {

        setError(
          "Please choose an image first."
        );

        return;

      }


      try {

        setUploading(
          true
        );

        setError("");
        setSuccess("");


        const formData =
          new FormData();


        formData.append(
          "image",
          selectedFile
        );


        const response =
          await fetch(
            `${API_BASE}/api/users/profile/image`,
            {
              method:
                "POST",

              headers: {
                Authorization:
                  `Bearer ${token}`
              },

              body:
                formData
            }
          );


        const data =
          await response.json();


        if (
          !response.ok
        ) {

          throw new Error(
            data.error ||
            "Image upload failed."
          );

        }


        const user =
          data.user ||
          {};


        setProfile(
          previous => ({
            ...previous,
            ...user
          })
        );


        const imagePath =
          data.profile_image ||
          user.profile_image;


        if (
          imagePath
        ) {

          setPreview(
            `${getImageUrl(
              imagePath
            )}?v=${Date.now()}`
          );

        }


        setSelectedFile(
          null
        );


        if (
          fileInputRef.current
        ) {

          fileInputRef.current.value =
            "";

        }


        setSuccess(
          "Profile photo updated successfully."
        );


      } catch (err) {

        console.error(
          "PROFILE IMAGE UPLOAD:",
          err
        );


        setError(
          err.message ||
          "Unable to upload profile photo."
        );

      } finally {

        setUploading(
          false
        );

      }

    };


  // =====================================================
  // SAVE PROFILE
  // =====================================================

  const handleSave =
    async event => {

      event.preventDefault();


      try {

        setSaving(
          true
        );

        setError("");
        setSuccess("");


        const data =
          await apiFetch(
            "/api/users/profile",
            {
              method:
                "PUT",

              body:
                JSON.stringify({

                  name:
                    form.name,

                  bio:
                    form.bio,

                  profession:
                    form.profession,

                  interests:
                    form.interests,

                  date_of_birth:
                    form.date_of_birth,

                  is_discoverable:
                    form.is_discoverable

                })
            }
          );


        const user =
          data.user ||
          data;


        setProfile(
          user
        );


        setForm({
          name:
            user.name ||
            "",

          bio:
            user.bio ||
            "",

          profession:
            user.profession ||
            "",

          interests:
            user.interests ||
            "",

          date_of_birth:
            user.date_of_birth ||
            "",

          is_discoverable:
            user.is_discoverable !== false
        });


        setEditing(
          false
        );


        setSuccess(
          "Profile updated successfully."
        );


      } catch (err) {

        console.error(
          "PROFILE SAVE:",
          err
        );


        setError(
          err.message ||
          "Unable to update profile."
        );

      } finally {

        setSaving(
          false
        );

      }

    };


  // =====================================================
  // REMOVE SELECTED PREVIEW
  // =====================================================

  const cancelSelectedImage =
    () => {

      setSelectedFile(
        null
      );


      setPreview(
        profile?.profile_image
          ? getImageUrl(
              profile.profile_image
            )
          : ""
      );


      if (
        fileInputRef.current
      ) {

        fileInputRef.current.value =
          "";

      }

    };


  // =====================================================
  // NAVIGATION
  // =====================================================

  const goDashboard =
    () => {

      navigate(
        "/dashboard"
      );

    };


  const goFriends =
    () => {

      navigate(
        "/friends"
      );

    };


  const goMessages =
    () => {

      navigate(
        "/messages"
      );

    };


  const goNotifications =
    () => {

      navigate(
        "/notifications"
      );

    };


  const goSettings =
    () => {

      navigate(
        "/settings"
      );

    };


  // =====================================================
  // LOADING
  // =====================================================

  if (
    !token ||
    loading
  ) {

    return (

      <div className="profile-page">

        <div className="profile-loading">

          <div className="profile-spinner" />

          <h2>
            Loading profile
          </h2>

          <p>
            Preparing your profile...
          </p>

        </div>

      </div>

    );

  }


  // =====================================================
  // AVATAR INITIAL
  // =====================================================

  const initial =
    (
      profile?.name ||
      profile?.username ||
      "U"
    )
      .charAt(0)
      .toUpperCase();


  // =====================================================
  // MAIN
  // =====================================================

  return (

    <div className="profile-page">


      {/* =================================================
          NAVBAR
      ================================================= */}

      <header className="profile-navbar">


        <button
          type="button"
          className="profile-brand"
          onClick={
            goDashboard
          }
        >

          <div className="profile-logo">
            N
          </div>


          <span>
            NearConnect
          </span>

        </button>


        <div className="profile-nav-actions">


          <button
            type="button"
            className="profile-nav-btn"
            onClick={
              goDashboard
            }
          >
            ← Dashboard
          </button>


          <button
            type="button"
            className="profile-nav-btn"
            onClick={
              goFriends
            }
          >
            👥 Friends
          </button>


          <button
            type="button"
            className="profile-nav-btn"
            onClick={
              goMessages
            }
          >
            💬 Messages
          </button>


          <button
            type="button"
            className="profile-nav-btn"
            onClick={
              goNotifications
            }
          >
            🔔 Notifications
          </button>


          <button
            type="button"
            className="profile-nav-btn"
            onClick={
              goSettings
            }
          >
            ⚙️ Settings
          </button>

        </div>

      </header>


      {/* =================================================
          MAIN
      ================================================= */}

      <main className="profile-container">


        {/* =================================================
            HEADING
        ================================================= */}

        <section className="profile-heading">

          <span>
            MY ACCOUNT
          </span>

          <h1>
            My Profile
          </h1>

          <p>
            Manage how people see you
            on NearConnect.
          </p>

        </section>


        {/* =================================================
            SUCCESS
        ================================================= */}

        {success && (

          <div className="profile-success">
            ✓ {success}
          </div>

        )}


        {/* =================================================
            ERROR
        ================================================= */}

        {error && (

          <div className="profile-error">
            ⚠️ {error}
          </div>

        )}


        {/* =================================================
            PROFILE CARD
        ================================================= */}

        <section className="profile-card">


          {/* =================================================
              HEADER / PHOTO
          ================================================= */}

          <div className="profile-card-top">


            <div className="profile-photo-area">


              {/* REAL IMAGE */}

              {preview ? (

                <img
                  src={
                    preview
                  }
                  alt={
                    profile?.name ||
                    "Profile"
                  }
                  className="profile-photo"
                />

              ) : (

                <div className="profile-photo profile-photo-placeholder">
                  {initial}
                </div>

              )}


              {/* CHANGE */}

              <button
                type="button"
                className="profile-photo-edit"
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >
                📷
              </button>


              <input
                ref={
                  fileInputRef
                }
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={
                  handleFileSelect
                }
                hidden
              />

            </div>


            <div className="profile-summary">

              <h2>
                {profile?.name ||
                  profile?.username}
              </h2>


              <p>
                @{profile?.username}
              </p>


              <span
                className={
                  profile?.is_online
                    ? "profile-status online"
                    : "profile-status"
                }
              >

                <span />

                {profile?.is_online
                  ? "Online"
                  : "Offline"}

              </span>

            </div>

          </div>


          {/* =================================================
              IMAGE UPLOAD PANEL
          ================================================= */}

          {selectedFile && (

            <div className="profile-upload-panel">


              <div>

                <strong>
                  New photo selected
                </strong>


                <span>
                  {
                    selectedFile.name
                  }
                </span>

              </div>


              <div className="profile-upload-actions">


                <button
                  type="button"
                  className="profile-upload-cancel"
                  onClick={
                    cancelSelectedImage
                  }
                  disabled={
                    uploading
                  }
                >
                  Cancel
                </button>


                <button
                  type="button"
                  className="profile-upload-button"
                  onClick={
                    uploadProfileImage
                  }
                  disabled={
                    uploading
                  }
                >

                  {uploading
                    ? "Uploading..."
                    : "Upload Photo"}

                </button>

              </div>

            </div>

          )}


          <div className="profile-upload-help">

            JPG, PNG or WEBP · Maximum 5 MB

          </div>


          {/* =================================================
              VIEW / EDIT
          ================================================= */}

          {editing ? (

            <form
              className="profile-edit-form"
              onSubmit={
                handleSave
              }
            >


              <div className="form-section-title">

                <span>
                  PROFILE INFORMATION
                </span>

                <p>
                  Keep your profile current
                  so people know who you are.
                </p>

              </div>


              {/* NAME */}

              <div className="profile-field">

                <label>
                  Full Name
                </label>

                <input
                  type="text"
                  name="name"
                  value={
                    form.name
                  }
                  onChange={
                    handleChange
                  }
                  maxLength="100"
                  required
                />

              </div>


              {/* USERNAME */}

              <div className="profile-field">

                <label>
                  Username
                </label>

                <div className="readonly-input">
                  @{profile?.username}
                </div>

                <small>
                  Username cannot be changed here.
                </small>

              </div>


              {/* DOB */}

              <div className="profile-field">

                <label>
                  Date of Birth
                </label>

                <input
                  type="date"
                  name="date_of_birth"
                  value={
                    form.date_of_birth
                  }
                  onChange={
                    handleChange
                  }
                />

                <small>
                  Your date of birth is private.
                </small>

              </div>


              {/* PROFESSION */}

              <div className="profile-field">

                <label>
                  Profession
                </label>

                <input
                  type="text"
                  name="profession"
                  value={
                    form.profession
                  }
                  onChange={
                    handleChange
                  }
                  maxLength="100"
                  placeholder="e.g. Frontend Developer"
                />

              </div>


              {/* BIO */}

              <div className="profile-field full">

                <div className="field-label-row">

                  <label>
                    Bio
                  </label>

                  <span>
                    {form.bio.length}/500
                  </span>

                </div>


                <textarea
                  name="bio"
                  value={
                    form.bio
                  }
                  onChange={
                    handleChange
                  }
                  maxLength="500"
                  rows="5"
                  placeholder="Tell people a little about yourself..."
                />

              </div>


              {/* INTERESTS */}

              <div className="profile-field full">

                <label>
                  Interests
                </label>

                <input
                  type="text"
                  name="interests"
                  value={
                    form.interests
                  }
                  onChange={
                    handleChange
                  }
                  maxLength="500"
                  placeholder="Technology, Cricket, Music, Movies..."
                />

              </div>


              {/* DISCOVERABILITY */}

              <div className="profile-privacy">

                <div>

                  <strong>
                    Discoverable by nearby users
                  </strong>

                  <p>
                    Allow people nearby to
                    discover your profile.
                  </p>

                </div>


                <label className="profile-switch">

                  <input
                    type="checkbox"
                    name="is_discoverable"
                    checked={
                      form.is_discoverable
                    }
                    onChange={
                      handleChange
                    }
                  />

                  <span />

                </label>

              </div>


              {/* ACTIONS */}

              <div className="profile-edit-actions">


                <button
                  type="button"
                  className="profile-cancel-btn"
                  onClick={() =>
                    setEditing(
                      false
                    )
                  }
                  disabled={
                    saving
                  }
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="profile-save-btn"
                  disabled={
                    saving
                  }
                >

                  {saving
                    ? "Saving..."
                    : "Save Changes"}

                </button>

              </div>

            </form>

          ) : (

            <div className="profile-view">


              {/* ABOUT */}

              <section className="about-section">

                <span className="section-label">
                  ABOUT
                </span>

                <h3>
                  About me
                </h3>

                <p>
                  {profile?.bio ||
                    "Add a short bio to tell people about yourself."}
                </p>

              </section>


              {/* DETAILS */}

              <div className="profile-details">


                <div className="detail-box">

                  <div className="detail-icon">
                    💼
                  </div>

                  <div>

                    <span>
                      PROFESSION
                    </span>

                    <strong>
                      {profile?.profession ||
                        "Not added"}
                    </strong>

                  </div>

                </div>


                <div className="detail-box">

                  <div className="detail-icon">
                    🎂
                  </div>

                  <div>

                    <span>
                      DATE OF BIRTH
                    </span>

                    <strong>
                      {profile?.date_of_birth
                        ? new Date(
                            `${profile.date_of_birth}T00:00:00`
                          ).toLocaleDateString(
                            "en-IN",
                            {
                              day:
                                "2-digit",

                              month:
                                "short",

                              year:
                                "numeric"
                            }
                          )
                        : "Not added"}
                    </strong>

                  </div>

                </div>


                <div className="detail-box">

                  <div className="detail-icon">
                    ✦
                  </div>

                  <div>

                    <span>
                      INTERESTS
                    </span>

                    <strong>
                      {profile?.interests ||
                        "Not added"}
                    </strong>

                  </div>

                </div>

              </div>


              {/* VISIBILITY */}

              <section className="profile-visibility">

                <div className="visibility-icon">
                  ✓
                </div>


                <div>

                  <span>
                    PROFILE VISIBILITY
                  </span>

                  <strong>
                    {profile?.is_discoverable
                      ? "Visible to nearby people"
                      : "Hidden from discovery"}
                  </strong>

                  <p>
                    {profile?.is_discoverable
                      ? "People within your discovery range can find you."
                      : "You are currently hidden from nearby discovery."}
                  </p>

                </div>

              </section>


              {/* EDIT BUTTON */}

              <div className="profile-edit-bottom">

                <button
                  type="button"
                  className="edit-profile-btn"
                  onClick={() =>
                    setEditing(
                      true
                    )
                  }
                >
                  Edit Profile
                </button>

              </div>


              {/* FOOTER */}

              <div className="profile-footer">

                <span>
                  NearConnect member
                </span>

                <span>
                  @{profile?.username}
                </span>

              </div>

            </div>

          )}

        </section>

      </main>

    </div>

  );

}