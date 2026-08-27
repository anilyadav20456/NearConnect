import { useEffect, useState } from "react";
import "./FriendRequests.css";

const API =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5001"
    : "https://nearconnect-backend-cavd.onrender.com";

export default function FriendRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");

  // =========================================
  // GET FRIEND REQUESTS
  // =========================================

  const fetchRequests = async () => {
    const token = localStorage.getItem(
      "nearconnect_token"
    );

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `${API}/api/friends/requests`,
        {
          method: "GET",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      console.log(
        "Friend requests:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Unable to load friend requests"
        );
      }

      setRequests(
        Array.isArray(data)
          ? data
          : data.requests || []
      );

    } catch (err) {
      console.error(
        "Friend requests error:",
        err
      );

      setError(
        err.message ||
          "Unable to load friend requests"
      );

    } finally {
      setLoading(false);
    }
  };


  // =========================================
  // LOAD REQUESTS
  // =========================================

  useEffect(() => {
    fetchRequests();
  }, []);


  // =========================================
  // ACCEPT / REJECT
  // =========================================

  const handleRequest = async (
    requestId,
    action
  ) => {
    const token = localStorage.getItem(
      "nearconnect_token"
    );

    if (!token) {
      setError("Please login again.");
      return;
    }

    try {
      setActionId(requestId);
      setError("");

      /*
        IMPORTANT:

        Backend route:

        PUT /api/friends/request/<request_id>

        Body:

        {
          action: "accept"
        }

        OR

        {
          action: "reject"
        }
      */

      const response = await fetch(
        `${API}/api/friends/request/${requestId}`,
        {
          method: "PUT",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            action: action,
          }),
        }
      );


      const data =
        await response.json();


      console.log(
        "Friend request response:",
        data
      );


      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            `Unable to ${action} friend request`
        );
      }


      // Remove processed request
      setRequests((previous) =>
        previous.filter(
          (request) =>
            (request.id ||
              request.request_id) !==
            requestId
        )
      );


      console.log(
        `Friend request ${action} successful`
      );

    } catch (err) {

      console.error(
        "Friend request action error:",
        err
      );

      setError(
        err.message ||
          `Unable to ${action} request`
      );

    } finally {

      setActionId(null);

    }
  };


  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <div className="friend-request-state">

        <div className="friend-request-spinner"></div>

        <span>
          Loading requests...
        </span>

      </div>
    );
  }


  // =========================================
  // ERROR
  // =========================================

  if (error) {
    return (
      <div className="friend-request-error">

        <span>!</span>

        <div>
          {error}
        </div>

      </div>
    );
  }


  // =========================================
  // EMPTY
  // =========================================

  if (requests.length === 0) {
    return (
      <div className="friend-request-empty">

        <div className="friend-request-empty-icon">
          ✓
        </div>

        <div>

          <strong>
            No pending requests
          </strong>

          <p>
            New connection requests will
            appear here.
          </p>

        </div>

      </div>
    );
  }


  // =========================================
  // REQUEST LIST
  // =========================================

  return (
    <div className="friend-request-list">

      {requests.map(
        (request, index) => {

          const requestId =
            request.id ||
            request.request_id;

          const sender =
            request.sender ||
            request.from_user ||
            request.user ||
            request;

          const name =
            sender.name ||
            sender.username ||
            sender.full_name ||
            "Nearby User";

          const username =
            sender.username ||
            name;

          const initial =
            name
              .charAt(0)
              .toUpperCase();

          const isLoading =
            actionId === requestId;


          return (
            <div
              className="friend-request-item"
              key={
                requestId ||
                index
              }
            >

              {/* AVATAR */}

              <div className="friend-request-avatar">

                {initial}

              </div>


              {/* USER INFORMATION */}

              <div className="friend-request-info">

                <strong>
                  {name}
                </strong>

                <span>
                  @{username}
                </span>

                <small>
                  wants to connect with you
                </small>

              </div>


              {/* ACTIONS */}

              <div className="friend-request-actions">

                <button
                  type="button"
                  className="friend-accept"
                  disabled={isLoading}
                  onClick={() =>
                    handleRequest(
                      requestId,
                      "accept"
                    )
                  }
                >

                  {isLoading
                    ? "..."
                    : "Accept"}

                </button>


                <button
                  type="button"
                  className="friend-reject"
                  disabled={isLoading}
                  onClick={() =>
                    handleRequest(
                      requestId,
                      "reject"
                    )
                  }
                >

                  Reject

                </button>

              </div>

            </div>
          );
        }
      )}

    </div>
  );
}