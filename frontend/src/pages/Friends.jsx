import React, {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  apiFetch,
  getToken
} from "../api";

import "./Friends.css";


export default function Friends() {

  // =====================================================
  // STATE
  // =====================================================

  const [friends, setFriends] =
    useState([]);

  const [requests, setRequests] =
    useState([]);

  const [blockedUsers, setBlockedUsers] =
    useState([]);

  const [activeTab, setActiveTab] =
    useState("friends");

  const [search, setSearch] =
    useState("");

  const [sortBy, setSortBy] =
    useState("recent");

  const [loading, setLoading] =
    useState(true);

  const [blockedLoading, setBlockedLoading] =
    useState(false);

  const [busyUserId, setBusyUserId] =
    useState(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  // Report modal
  const [reportUser, setReportUser] =
    useState(null);

  const [reportReason, setReportReason] =
    useState("");

  const [reportDetails, setReportDetails] =
    useState("");

  const [reportLoading, setReportLoading] =
    useState(false);

  const [openActionMenuId, setOpenActionMenuId] =
    useState(null);


  // =====================================================
  // AUTH
  // =====================================================

  const token =
    getToken();


  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {

    if (!token) {

      window.location.href =
        "/login";

      return;

    }


    loadAll();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);


  // =====================================================
  // LOAD EVERYTHING
  // =====================================================

  const loadAll =
    async () => {

      try {

        setLoading(true);

        setError("");

        setSuccess("");


        await Promise.all([
          loadFriends(),
          loadRequests(),
          loadBlockedUsers()
        ]);


      } catch (err) {

        console.error(
          "Friends page error:",
          err
        );


        setError(
          err.message ||
          "Unable to load friends."
        );

      } finally {

        setLoading(false);

      }

    };


  // =====================================================
  // LOAD FRIENDS
  // =====================================================

  const loadFriends =
    async () => {

      const data =
        await apiFetch(
          "/api/friends"
        );


      setFriends(
        Array.isArray(
          data.friends
        )
          ? data.friends
          : []
      );

    };


  // =====================================================
  // LOAD REQUESTS
  // =====================================================

  const loadRequests =
    async () => {

      const data =
        await apiFetch(
          "/api/friends/requests"
        );


      setRequests(
        Array.isArray(
          data.requests
        )
          ? data.requests
          : []
      );

    };


  // =====================================================
  // LOAD BLOCKED USERS
  // =====================================================

  const loadBlockedUsers =
    async () => {

      try {

        setBlockedLoading(
          true
        );


        const data =
          await apiFetch(
            "/api/users/blocked"
          );


        setBlockedUsers(
          Array.isArray(
            data.blocked_users
          )
            ? data.blocked_users
            : []
        );


      } catch (err) {

        console.error(
          "LOAD BLOCKED USERS:",
          err
        );


        // Keep the page usable if the endpoint
        // is temporarily unavailable.

        setBlockedUsers([]);

      } finally {

        setBlockedLoading(
          false
        );

      }

    };


  // =====================================================
  // CLEAR MESSAGES
  // =====================================================

  const showSuccess =
    message => {

      setSuccess(
        message
      );

      setError("");

      setTimeout(() => {

        setSuccess("");

      }, 3000);

    };


  const showError =
    message => {

      setError(
        message
      );

      setSuccess("");

    };


  // =====================================================
  // OPEN CHAT
  // =====================================================

  const openChat =
    userId => {

      window.location.href =
        `/messages?friend=${userId}`;

    };


  // =====================================================
  // ACCEPT REQUEST
  // =====================================================

  const acceptRequest =
    async request => {

      try {

        setBusyUserId(
          request.id
        );

        setError("");


        await apiFetch(
          `/api/friends/request/${request.id}`,
          {
            method:
              "PUT",

            body:
              JSON.stringify({
                action:
                  "accept"
              })
          }
        );


        showSuccess(
          "Friend request accepted."
        );


        await Promise.all([
          loadFriends(),
          loadRequests()
        ]);


      } catch (err) {

        console.error(
          "ACCEPT REQUEST:",
          err
        );


        showError(
          err.message ||
          "Unable to accept request."
        );

      } finally {

        setBusyUserId(
          null
        );

      }

    };


  // =====================================================
  // REJECT REQUEST
  // =====================================================

  const rejectRequest =
    async request => {

      try {

        setBusyUserId(
          request.id
        );

        setError("");


        await apiFetch(
          `/api/friends/request/${request.id}`,
          {
            method:
              "PUT",

            body:
              JSON.stringify({
                action:
                  "reject"
              })
          }
        );


        showSuccess(
          "Friend request rejected."
        );


        await loadRequests();


      } catch (err) {

        console.error(
          "REJECT REQUEST:",
          err
        );


        showError(
          err.message ||
          "Unable to reject request."
        );

      } finally {

        setBusyUserId(
          null
        );

      }

    };


  // =====================================================
  // REMOVE FRIEND
  // =====================================================

  const removeFriend =
    async friend => {

      const confirmed =
        window.confirm(
          `Remove ${friend.name || friend.username} from your friends?`
        );


      if (!confirmed) {
        return;
      }


      try {

        setBusyUserId(
          friend.id
        );

        setError("");


        await apiFetch(
          `/api/friends/${friend.id}`,
          {
            method:
              "DELETE"
          }
        );


        showSuccess(
          "Friend removed."
        );


        await loadFriends();


      } catch (err) {

        console.error(
          "REMOVE FRIEND:",
          err
        );


        showError(
          err.message ||
          "Unable to remove friend."
        );

      } finally {

        setBusyUserId(
          null
        );

      }

    };


  // =====================================================
  // BLOCK USER
  // =====================================================

  const blockUser =
    async user => {

      const confirmed =
        window.confirm(
          `Block ${user.name || user.username}? They will no longer appear in your nearby discovery or be able to start a private chat with you.`
        );


      if (!confirmed) {
        return;
      }


      try {

        setBusyUserId(
          user.id
        );

        setError("");


        await apiFetch(
          `/api/users/${user.id}/block`,
          {
            method:
              "POST"
          }
        );


        showSuccess(
          `${user.name || user.username} has been blocked.`
        );


        await Promise.all([
          loadFriends(),
          loadBlockedUsers()
        ]);


      } catch (err) {

        console.error(
          "BLOCK USER:",
          err
        );


        showError(
          err.message ||
          "Unable to block this user."
        );

      } finally {

        setBusyUserId(
          null
        );

      }

    };


  // =====================================================
  // UNBLOCK USER
  // =====================================================

  const unblockUser =
    async user => {

      const confirmed =
        window.confirm(
          `Unblock ${user.name || user.username}?`
        );


      if (!confirmed) {
        return;
      }


      try {

        setBusyUserId(
          user.id
        );

        setError("");


        await apiFetch(
          `/api/users/${user.id}/block`,
          {
            method:
              "DELETE"
          }
        );


        showSuccess(
          `${user.name || user.username} has been unblocked.`
        );


        await loadBlockedUsers();

        await loadFriends();


      } catch (err) {

        console.error(
          "UNBLOCK USER:",
          err
        );


        showError(
          err.message ||
          "Unable to unblock this user."
        );

      } finally {

        setBusyUserId(
          null
        );

      }

    };


  // =====================================================
  // OPEN REPORT MODAL
  // =====================================================

  const openReport =
    user => {

      setReportUser(
        user
      );

      setReportReason(
        ""
      );

      setReportDetails(
        ""
      );

      setError("");

    };


  // =====================================================
  // CLOSE REPORT MODAL
  // =====================================================

  const closeReport =
    () => {

      if (reportLoading) {
        return;
      }


      setReportUser(
        null
      );

      setReportReason(
        ""
      );

      setReportDetails(
        ""
      );

    };


  // =====================================================
  // SUBMIT REPORT
  // =====================================================

  const submitReport =
    async event => {

      event.preventDefault();


      if (
        !reportUser ||
        !reportReason
      ) {

        showError(
          "Please select a report reason."
        );

        return;

      }


      try {

        setReportLoading(
          true
        );

        setError("");


        await apiFetch(
          `/api/users/${reportUser.id}/report`,
          {
            method:
              "POST",

            body:
              JSON.stringify({

                reason:
                  reportReason,

                details:
                  reportDetails.trim()

              })
          }
        );


        closeReport();


        showSuccess(
          "Report submitted. Thank you for helping keep NearConnect safe."
        );


      } catch (err) {

        console.error(
          "REPORT USER:",
          err
        );


        showError(
          err.message ||
          "Unable to submit report."
        );

      } finally {

        setReportLoading(
          false
        );

      }

    };


  // =====================================================
  // FILTER
  // =====================================================

  const filteredFriends =
    useMemo(() => {

      const query =
        search
          .trim()
          .toLowerCase();


      let list =
        friends.filter(
          friend => {

            if (!query) {
              return true;
            }


            return (

              (
                friend.name ||
                ""
              )
                .toLowerCase()
                .includes(query)

              ||

              (
                friend.username ||
                ""
              )
                .toLowerCase()
                .includes(query)

              ||

              (
                friend.profession ||
                ""
              )
                .toLowerCase()
                .includes(query)

            );

          }
        );


      list = [
        ...list
      ];


      if (
        sortBy ===
        "online"
      ) {

        list.sort(
          (a, b) =>
            Number(
              b.is_online
            ) -
            Number(
              a.is_online
            )
        );

      }


      if (
        sortBy ===
        "name"
      ) {

        list.sort(
          (a, b) =>
            (
              a.name ||
              a.username ||
              ""
            ).localeCompare(
              b.name ||
              b.username ||
              ""
            )
        );

      }


      return list;

    }, [
      friends,
      search,
      sortBy
    ]);


  // =====================================================
  // PAGE LOADING
  // =====================================================

  if (
    !token ||
    loading
  ) {

    return (

      <div className="friends-page">

        <div className="friends-loading">

          <div className="friends-spinner" />

          <h2>
            Loading Friends
          </h2>

          <p>
            Getting your connections...
          </p>

        </div>

      </div>

    );

  }


  // =====================================================
  // RENDER
  // =====================================================

  return (

    <div className="friends-page">


      {/* =================================================
          HEADER
      ================================================= */}

      <header className="friends-topbar">


        <div
          className="friends-brand"
          onClick={() =>
            window.location.href =
              "/dashboard"
          }
        >

          <div className="friends-brand-mark">
            N
          </div>

          <span>
            NearConnect
          </span>

        </div>


        <div className="friends-top-actions">

          <button
            type="button"
            onClick={() =>
              window.location.href =
                "/dashboard"
            }
            className="friends-nav-button"
          >
            ← Dashboard
          </button>


          <button
            type="button"
            onClick={() =>
              window.location.href =
                "/messages"
            }
            className="friends-nav-button"
          >
            💬 Messages
          </button>


          <button
            type="button"
            onClick={() =>
              window.location.href =
                "/notifications"
            }
            className="friends-nav-button"
          >
            🔔 Notifications
          </button>

        </div>

      </header>


      {/* =================================================
          MAIN
      ================================================= */}

      <main className="friends-main">


        {/* =================================================
            HERO
        ================================================= */}

        <section className="friends-hero">

          <div>

            <span className="friends-label">
              YOUR NETWORK
            </span>


            <h1>
              Friends & connections
            </h1>


            <p>
              Manage your friendships,
              requests and blocked users
              in one place.
            </p>

          </div>


          <div className="friends-hero-icon">
            👥
          </div>

        </section>


        {/* =================================================
            SUCCESS
        ================================================= */}

        {success && (

          <div className="friends-success">

            <span>
              ✓
            </span>

            {success}

          </div>

        )}


        {/* =================================================
            ERROR
        ================================================= */}

        {error && (

          <div className="friends-error">

            <span>
              ⚠️
            </span>

            {error}

          </div>

        )}


        {/* =================================================
            TABS
        ================================================= */}

        <div className="friends-tabs">


          <button
            type="button"
            className={
              activeTab === "friends"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab(
                "friends"
              )
            }
          >

            <span>
              All Friends
            </span>

            <b>
              {friends.length}
            </b>

          </button>


          <button
            type="button"
            className={
              activeTab === "requests"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab(
                "requests"
              )
            }
          >

            <span>
              Requests
            </span>

            {requests.length > 0 && (

              <b className="request-count">
                {requests.length}
              </b>

            )}

          </button>


          <button
            type="button"
            className={
              activeTab === "blocked"
                ? "active danger-tab"
                : ""
            }
            onClick={() =>
              setActiveTab(
                "blocked"
              )
            }
          >

            <span>
              Blocked
            </span>

            <b>
              {blockedUsers.length}
            </b>

          </button>

        </div>


        {/* =================================================
            FRIENDS TAB
        ================================================= */}

        {activeTab === "friends" && (

          <section className="friends-section">


            {/* SEARCH / SORT */}

            <div className="friends-toolbar">


              <div className="friends-search">

                <span>
                  🔎
                </span>


                <input
                  value={search}
                  onChange={
                    event =>
                      setSearch(
                        event.target.value
                      )
                  }
                  placeholder="Search friends..."
                />

              </div>


              <select
                value={sortBy}
                onChange={
                  event =>
                    setSortBy(
                      event.target.value
                    )
                }
                className="friends-sort"
              >

                <option value="recent">
                  Recently Added
                </option>

                <option value="online">
                  Online
                </option>

                <option value="name">
                  Name
                </option>

              </select>

            </div>


            {/* FRIEND COUNT */}

            <div className="friends-section-heading">

              <div>

                <span>
                  CONNECTIONS
                </span>

                <h2>
                  {filteredFriends.length}{" "}
                  friend
                  {filteredFriends.length ===
                  1
                    ? ""
                    : "s"}
                </h2>

              </div>

            </div>


            {/* EMPTY */}

            {filteredFriends.length ===
            0 ? (

              <div className="friends-empty">

                <div>
                  👥
                </div>

                <h3>
                  No friends found
                </h3>

                <p>
                  {search
                    ? "Try a different search."
                    : "Discover people nearby and start building your network."}
                </p>


                <button
                  type="button"
                  onClick={() =>
                    window.location.href =
                      "/dashboard"
                  }
                >
                  Discover People
                </button>

              </div>

            ) : (

              <div className="friends-grid">

                {filteredFriends.map(
                  friend => (

                    <article
                      className="friend-card"
                      key={
                        friend.id
                      }
                    >


                      {/* CARD TOP */}

                      <div className="friend-card-top">


                        <div className="friend-avatar-wrap">

                          <div className="friend-avatar">

                            {(
                              friend.name ||
                              friend.username ||
                              "U"
                            )
                              .charAt(0)
                              .toUpperCase()}

                          </div>


                          {friend.is_online && (

                            <span className="friend-online-dot" />

                          )}

                        </div>


                        {friend.is_online ? (

                          <span className="friend-online-label">
                            Online
                          </span>

                        ) : (

                          <span className="friend-offline-label">
                            Offline
                          </span>

                        )}

                      </div>


                      {/* INFO */}

                      <h3>
                        {friend.name ||
                          friend.username}
                      </h3>


                      <span className="friend-username">
                        @{friend.username}
                      </span>


                      {friend.profession && (

                        <p className="friend-profession">
                          💼{" "}
                          {friend.profession}
                        </p>

                      )}


                      {friend.bio && (

                        <p className="friend-bio">
                          {friend.bio}
                        </p>

                      )}


                      {friend.interests && (

                        <div className="friend-interests">

                          {friend.interests
                            .split(",")
                            .slice(0, 3)
                            .map(
                              (
                                interest,
                                index
                              ) => (

                                <span
                                  key={
                                    index
                                  }
                                >
                                  {interest.trim()}
                                </span>

                              )
                            )}

                        </div>

                      )}


                      {/* ACTIONS */}

                      <div className="friend-actions">


                        <button
                          type="button"
                          className="friend-message-button"
                          onClick={() =>
                            openChat(
                              friend.id
                            )
                          }
                          disabled={
                            busyUserId ===
                            friend.id
                          }
                        >
                          💬 Message
                        </button>


                        <div className="friend-more-wrap">

                          <button
                            type="button"
                            className="friend-more-button"
                            aria-label={`Actions for ${
                              friend.name ||
                              friend.username
                            }`}
                            onClick={(event) => {
                              event.stopPropagation();

                              setOpenActionMenuId(
                                previous =>
                                  previous === friend.id
                                    ? null
                                    : friend.id
                              );
                            }}
                          >
                            ⋯
                          </button>


                          {openActionMenuId === friend.id && (

                            <div
                              className="friend-action-menu"
                              onClick={event =>
                                event.stopPropagation()
                              }
                            >

                              <button
                                type="button"
                                className="friend-action-item"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  removeFriend(friend);
                                }}
                              >
                                <span>🗑️</span>
                                <span>Remove friend</span>
                              </button>


                              <button
                                type="button"
                                className="friend-action-item"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  blockUser(friend);
                                }}
                              >
                                <span>🚫</span>
                                <span>Block</span>
                              </button>


                              <button
                                type="button"
                                className="friend-action-item report"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  openReport(friend);
                                }}
                              >
                                <span>⚑</span>
                                <span>Report</span>
                              </button>

                            </div>

                          )}

                        </div>

                      </div>

                    </article>

                  )
                )}

              </div>

            )}

          </section>

        )}


        {/* =================================================
            REQUESTS TAB
        ================================================= */}

        {activeTab === "requests" && (

          <section className="friends-section">


            <div className="friends-section-heading">

              <div>

                <span>
                  CONNECTION REQUESTS
                </span>

                <h2>
                  {requests.length} pending
                </h2>

              </div>

            </div>


            {requests.length ===
            0 ? (

              <div className="friends-empty">

                <div>
                  🤝
                </div>

                <h3>
                  No pending requests
                </h3>

                <p>
                  New friend requests
                  will appear here.
                </p>

              </div>

            ) : (

              <div className="request-list">

                {requests.map(
                  request => {

                    const sender =
                      request.sender ||
                      {};


                    const busy =
                      busyUserId ===
                      request.id;


                    return (

                      <article
                        className="request-card"
                        key={
                          request.id
                        }
                      >

                        <div className="request-avatar">

                          {(
                            sender.name ||
                            sender.username ||
                            "U"
                          )
                            .charAt(0)
                            .toUpperCase()}

                        </div>


                        <div className="request-info">

                          <h3>
                            {
                              sender.name ||
                              sender.username ||
                              "Someone"
                            }
                          </h3>


                          <span>
                            @{sender.username}
                          </span>


                          {sender.profession && (

                            <p>
                              {
                                sender.profession
                              }
                            </p>

                          )}

                        </div>


                        <div className="request-actions">

                          <button
                            type="button"
                            className="accept-request-button"
                            onClick={() =>
                              acceptRequest(
                                request
                              )
                            }
                            disabled={
                              busy
                            }
                          >
                            {busy
                              ? "..."
                              : "✓ Accept"}
                          </button>


                          <button
                            type="button"
                            className="reject-request-button"
                            onClick={() =>
                              rejectRequest(
                                request
                              )
                            }
                            disabled={
                              busy
                            }
                          >
                            Reject
                          </button>

                        </div>

                      </article>

                    );

                  }
                )}

              </div>

            )}

          </section>

        )}


        {/* =================================================
            BLOCKED TAB
        ================================================= */}

        {activeTab === "blocked" && (

          <section className="friends-section">


            <div className="friends-section-heading">

              <div>

                <span>
                  SAFETY & PRIVACY
                </span>

                <h2>
                  Blocked Users
                </h2>

              </div>

            </div>


            <div className="blocked-info">

              <span>
                🛡️
              </span>


              <p>
                Blocked users cannot appear
                in your nearby discovery or
                start a private conversation
                with you.
              </p>

            </div>


            {blockedLoading ? (

              <div className="friends-loading-inline">

                <div className="friends-spinner" />

                Loading blocked users...

              </div>

            ) : blockedUsers.length ===
              0 ? (

              <div className="friends-empty">

                <div>
                  🛡️
                </div>

                <h3>
                  No blocked users
                </h3>

                <p>
                  Users you block will
                  appear here.
                </p>

              </div>

            ) : (

              <div className="blocked-list">

                {blockedUsers.map(
                  user => (

                    <article
                      className="blocked-card"
                      key={
                        user.id
                      }
                    >

                      <div className="blocked-avatar">

                        {(
                          user.name ||
                          user.username ||
                          "U"
                        )
                          .charAt(0)
                          .toUpperCase()}

                      </div>


                      <div className="blocked-info-content">

                        <h3>
                          {user.name ||
                            user.username}
                        </h3>


                        <span>
                          @{user.username}
                        </span>

                      </div>


                      <button
                        type="button"
                        className="unblock-button"
                        onClick={() =>
                          unblockUser(
                            user
                          )
                        }
                        disabled={
                          busyUserId ===
                          user.id
                        }
                      >

                        {busyUserId ===
                        user.id
                          ? "..."
                          : "Unblock"}

                      </button>

                    </article>

                  )
                )}

              </div>

            )}

          </section>

        )}

      </main>


      {/* =================================================
          REPORT MODAL
      ================================================= */}

      {reportUser && (

        <div
          className="report-overlay"
          onClick={
            closeReport
          }
        >

          <div
            className="report-modal"
            onClick={
              event =>
                event.stopPropagation()
            }
          >


            <div className="report-modal-header">

              <div>

                <span>
                  SAFETY
                </span>

                <h2>
                  Report User
                </h2>

              </div>


              <button
                type="button"
                onClick={
                  closeReport
                }
                className="report-close"
                disabled={
                  reportLoading
                }
              >
                ×
              </button>

            </div>


            <p className="report-subtitle">

              Tell us what happened with{" "}
              <strong>
                {reportUser.name ||
                  reportUser.username}
              </strong>
              .

            </p>


            <form
              onSubmit={
                submitReport
              }
            >


              <label className="report-label">
                Reason
              </label>


              <select
                value={
                  reportReason
                }
                onChange={
                  event =>
                    setReportReason(
                      event.target.value
                    )
                }
                required
                className="report-select"
              >

                <option value="">
                  Select a reason
                </option>

                <option value="spam">
                  Spam
                </option>

                <option value="harassment">
                  Harassment
                </option>

                <option value="fake_account">
                  Fake account
                </option>

                <option value="inappropriate_content">
                  Inappropriate content
                </option>

                <option value="other">
                  Other
                </option>

              </select>


              <label className="report-label">
                Additional details
              </label>


              <textarea
                value={
                  reportDetails
                }
                onChange={
                  event =>
                    setReportDetails(
                      event.target.value
                    )
                }
                maxLength={
                  1000
                }
                rows={
                  5
                }
                placeholder="Optional details..."
                className="report-textarea"
              />


              <div className="report-modal-actions">


                <button
                  type="button"
                  className="report-cancel"
                  onClick={
                    closeReport
                  }
                  disabled={
                    reportLoading
                  }
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="report-submit"
                  disabled={
                    reportLoading ||
                    !reportReason
                  }
                >

                  {reportLoading
                    ? "Submitting..."
                    : "Submit Report"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>

  );

}