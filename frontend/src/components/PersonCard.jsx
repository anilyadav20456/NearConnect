import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PersonCard.css";

const API =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5001"
    : (process.env.REACT_APP_API_URL || "https://nearconnect-ohe3.onrender.com");

export default function PersonCard({ person }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const [showIntroBox, setShowIntroBox] = useState(false);
  const [introMessage, setIntroMessage] = useState("");

  const id = person.id || person.user_id;

  const name =
    person.name ||
    person.username ||
    person.full_name ||
    "Nearby User";

  const username = person.username || name;

  const distance =
    person.distance !== undefined
      ? Number(person.distance).toFixed(1)
      : null;

  const firstLetter = name.charAt(0).toUpperCase();

  const isFriend =
    person.is_friend ||
    person.friendship_status === "accepted" ||
    person.status === "accepted";

  const isPending =
    sent ||
    person.friendship_status === "pending_sent" ||
    person.friendship_status === "pending";

  const handleOpenDirectMessage = () => {
    navigate(`/messages?user=${id}`);
  };

  const sendFriendRequest = async (e) => {
    if (e) e.preventDefault();

    const token = localStorage.getItem("nearconnect_token");

    if (!token) {
      setError("Login required.");
      return;
    }

    if (!id) {
      setError("User information unavailable.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API}/api/friends/request/${id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: introMessage.trim(),
        }),
      });

      let data = {};
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text.includes("<!doctype") || text.includes("<html") ? `Server error (${response.status})` : text };
      }

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Unable to send request"
        );
      }

      setSent(true);
      setShowIntroBox(false);
      setIntroMessage("");

    } catch (err) {
      console.error("Friend request error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="person-card">
      {/* TOP */}
      <div className="person-card-top">
        <div className="person-avatar">{firstLetter}</div>

        <div className="person-online">
          <span></span>
          Nearby
        </div>
      </div>

      {/* INFO */}
      <div className="person-info">
        <h3>{name}</h3>
        <p>@{username}</p>
      </div>

      {/* DISTANCE */}
      {distance !== null && (
        <div className="person-distance">
          <span>●</span>
          {distance} km away
        </div>
      )}

      {/* ACTION BUTTONS */}
      {isFriend ? (
        <button
          type="button"
          className="person-connect person-connect-message"
          onClick={handleOpenDirectMessage}
        >
          Message 💬
        </button>
      ) : isPending ? (
        <button
          type="button"
          className="person-connect person-connect-sent"
          disabled
        >
          Request sent ✓
        </button>
      ) : !showIntroBox ? (
        <button
          type="button"
          className="person-connect"
          onClick={() => setShowIntroBox(true)}
          disabled={loading}
        >
          {loading ? "Sending..." : "Connect"}
          {!loading && <span>→</span>}
        </button>
      ) : (
        <form className="person-intro-form" onSubmit={sendFriendRequest}>
          <input
            type="text"
            className="person-intro-input"
            placeholder="Add intro message (optional)..."
            value={introMessage}
            onChange={(e) => setIntroMessage(e.target.value)}
            disabled={loading}
            autoFocus
          />
          <div className="person-intro-actions">
            <button
              type="submit"
              className="person-intro-send"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Request"}
            </button>
            <button
              type="button"
              className="person-intro-cancel"
              onClick={() => setShowIntroBox(false)}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ERROR */}
      {error && <div className="person-error">{error}</div>}
    </article>
  );
}