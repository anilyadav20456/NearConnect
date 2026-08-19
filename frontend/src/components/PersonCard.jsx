import { useState } from "react";
import "./PersonCard.css";

const API = "http://https://nearconnect-backend-cavd.onrender.com";

export default function PersonCard({ person }) {

  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const id =
    person.id ||
    person.user_id;

  const name =
    person.name ||
    person.username ||
    person.full_name ||
    "Nearby User";

  const username =
    person.username ||
    name;

  const distance =
    person.distance !== undefined
      ? Number(person.distance).toFixed(1)
      : null;


  const firstLetter =
    name.charAt(0).toUpperCase();


  const sendFriendRequest = async () => {

    const token =
      localStorage.getItem(
        "nearconnect_token"
      );

    if (!token) {
      setError("Login required.");
      return;
    }

    if (!id) {
      setError(
        "User information unavailable."
      );
      return;
    }

    try {

      setLoading(true);
      setError("");

      const response = await fetch(
        `${API}/api/friends/request/${id}`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",
          },
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Unable to send request"
        );
      }

      setSent(true);

    } catch (err) {

      console.error(
        "Friend request error:",
        err
      );

      setError(err.message);

    } finally {

      setLoading(false);
    }
  };


  return (
    <article className="person-card">

      {/* TOP */}

      <div className="person-card-top">

        <div className="person-avatar">
          {firstLetter}
        </div>

        <div className="person-online">
          <span></span>
          Nearby
        </div>

      </div>


      {/* INFO */}

      <div className="person-info">

        <h3>
          {name}
        </h3>

        <p>
          @{username}
        </p>

      </div>


      {/* DISTANCE */}

      {distance !== null && (
        <div className="person-distance">

          <span>
            ●
          </span>

          {distance} km away

        </div>
      )}


      {/* ACTION */}

      <button
        className={
          sent
            ? "person-connect person-connect-sent"
            : "person-connect"
        }
        onClick={sendFriendRequest}
        disabled={loading || sent}
      >

        {loading
          ? "Sending..."
          : sent
          ? "Request sent ✓"
          : "Connect"}

        {!loading && !sent && (
          <span>
            →
          </span>
        )}

      </button>


      {/* ERROR */}

      {error && (
        <div className="person-error">
          {error}
        </div>
      )}

    </article>
  );
}