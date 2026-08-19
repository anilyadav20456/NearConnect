import { useEffect, useState } from "react";
import "./ProfileCard.css";

const API = "https://nearconnect-backend-cavd.onrender.com";

export default function ProfileCard() {
  const [profile, setProfile] = useState(null);

  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    profession: "",
    interests: "",
  });


  // =========================================
  // LOAD PROFILE
  // =========================================

  useEffect(() => {
    const loadProfile = async () => {
      const token = localStorage.getItem(
        "nearconnect_token"
      );

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API}/api/users/profile`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to load profile"
          );
        }

        const user = data.profile;

        setProfile(user);

        setFormData({
          name: user.name || "",
          bio: user.bio || "",
          profession:
            user.profession || "",
          interests:
            user.interests || "",
        });

      } catch (err) {
        console.error(
          "Profile error:",
          err
        );

        setError(
          err.message ||
            "Unable to load profile"
        );

      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);


  // =========================================
  // INPUT CHANGE
  // =========================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };


  // =========================================
  // SAVE PROFILE
  // =========================================

  const handleSave = async () => {
    const token = localStorage.getItem(
      "nearconnect_token"
    );

    if (!token) {
      setError("Please login again.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        `${API}/api/users/profile`,
        {
          method: "PUT",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name: formData.name,
            bio: formData.bio,
            profession:
              formData.profession,
            interests:
              formData.interests,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to update profile"
        );
      }

      setProfile(data.profile);

      setFormData({
        name:
          data.profile.name || "",
        bio:
          data.profile.bio || "",
        profession:
          data.profile.profession || "",
        interests:
          data.profile.interests || "",
      });

      setEditing(false);

    } catch (err) {
      console.error(
        "Profile update error:",
        err
      );

      setError(
        err.message ||
          "Unable to update profile"
      );

    } finally {
      setSaving(false);
    }
  };


  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <section className="profile-card">

        <div className="profile-loading">
          Loading profile...
        </div>

      </section>
    );
  }


  // =========================================
  // ERROR
  // =========================================

  if (!profile) {
    return (
      <section className="profile-card">

        <div className="profile-error">
          {error || "Profile unavailable"}
        </div>

      </section>
    );
  }


  // =========================================
  // PROFILE
  // =========================================

  return (
    <section className="profile-card">


      {/* TOP */}

      <div className="profile-top">

        <div className="profile-avatar">

          {profile.name
            ?.charAt(0)
            .toUpperCase()}

        </div>


        <div className="profile-main-info">

          <div className="profile-name-row">

            <h2>
              {profile.name}
            </h2>

            <span className="profile-online">
              <span></span>
              Online
            </span>

          </div>

          <p className="profile-username">
            @{profile.username}
          </p>

        </div>


        {!editing && (

          <button
            type="button"
            className="profile-edit-button"
            onClick={() =>
              setEditing(true)
            }
          >
            Edit profile
          </button>

        )}

      </div>


      {/* ERROR */}

      {error && (

        <div className="profile-error">
          {error}
        </div>

      )}


      {/* EDIT MODE */}

      {editing ? (

        <div className="profile-edit-area">


          <div className="profile-field">

            <label>
              Full name
            </label>

            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your full name"
              maxLength={100}
            />

          </div>


          <div className="profile-field">

            <label>
              Profession
            </label>

            <input
              type="text"
              name="profession"
              value={
                formData.profession
              }
              onChange={handleChange}
              placeholder="e.g. Frontend Developer"
              maxLength={100}
            />

          </div>


          <div className="profile-field">

            <label>
              Bio
            </label>

            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell people a little about yourself..."
              maxLength={500}
              rows={3}
            />

            <small>
              {formData.bio.length}/500
            </small>

          </div>


          <div className="profile-field">

            <label>
              Interests
            </label>

            <input
              type="text"
              name="interests"
              value={
                formData.interests
              }
              onChange={handleChange}
              placeholder="Technology, Cricket, Music"
              maxLength={500}
            />

          </div>


          <div className="profile-edit-actions">

            <button
              type="button"
              className="profile-cancel"
              disabled={saving}
              onClick={() => {
                setEditing(false);

                setFormData({
                  name:
                    profile.name || "",
                  bio:
                    profile.bio || "",
                  profession:
                    profile.profession ||
                    "",
                  interests:
                    profile.interests ||
                    "",
                });
              }}
            >
              Cancel
            </button>


            <button
              type="button"
              className="profile-save"
              disabled={saving}
              onClick={handleSave}
            >
              {saving
                ? "Saving..."
                : "Save profile"}
            </button>

          </div>

        </div>

      ) : (

        <>


          {/* BIO */}

          <div className="profile-bio">

            <p>
              {profile.bio ||
                "Add a short bio to tell people about yourself."}
            </p>

          </div>


          {/* DETAILS */}

          <div className="profile-details">

            {profile.profession && (

              <div className="profile-detail">

                <span className="profile-detail-icon">
                  💼
                </span>

                <div>
                  <small>
                    Profession
                  </small>

                  <strong>
                    {profile.profession}
                  </strong>
                </div>

              </div>

            )}


            {profile.interests && (

              <div className="profile-detail">

                <span className="profile-detail-icon">
                  ✦
                </span>

                <div>
                  <small>
                    Interests
                  </small>

                  <strong>
                    {profile.interests}
                  </strong>
                </div>

              </div>

            )}

          </div>


          {/* FOOTER */}

          <div className="profile-footer">

            <span>
              📍 Discoverable nearby
            </span>

            <span>
              @{profile.username}
            </span>

          </div>

        </>

      )}

    </section>
  );
}