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

import {
  io
} from "socket.io-client";

import "./Notifications.css";


const SOCKET_URL =
  "http://127.0.0.1:5001";


function formatNotificationTime(
  value
) {

  if (!value) {
    return "";
  }

  try {

    const date =
      new Date(value);

    const now =
      new Date();

    const diff =
      Math.floor(
        (now.getTime() -
          date.getTime()) /
          1000
      );


    if (diff < 60) {
      return "Just now";
    }


    if (diff < 3600) {

      const minutes =
        Math.floor(
          diff / 60
        );

      return `${minutes}m ago`;

    }


    if (diff < 86400) {

      const hours =
        Math.floor(
          diff / 3600
        );

      return `${hours}h ago`;

    }


    if (diff < 604800) {

      const days =
        Math.floor(
          diff / 86400
        );

      return `${days}d ago`;

    }


    return date.toLocaleDateString(
      [],
      {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    );

  } catch {

    return "";

  }

}


function getNotificationIcon(
  type
) {

  switch (type) {

    case "friend_request":
      return "👥";

    case "friend_accepted":
      return "✅";

    case "new_message":
      return "💬";

    case "system":
      return "🔵";

    case "safety":
      return "🛡️";

    default:
      return "🔔";

  }

}


function getNotificationClass(
  notification
) {

  if (
    !notification ||
    notification.is_read
  ) {

    return "";

  }

  switch (
    notification.type
  ) {

    case "friend_request":
      return "notification-blue";

    case "friend_accepted":
      return "notification-green";

    case "new_message":
      return "notification-message";

    case "system":
      return "notification-purple";

    case "safety":
      return "notification-red";

    default:
      return "notification-blue";

  }

}


export default function Notifications() {

  const navigate =
    useNavigate();


  const token =
    getToken();


  // =====================================================
  // STATE
  // =====================================================

  const [
    notifications,
    setNotifications
  ] = useState([]);

  const [
    unreadCount,
    setUnreadCount
  ] = useState(0);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    markingAll,
    setMarkingAll
  ] = useState(false);

  const [
    error,
    setError
  ] = useState("");

  const [
    connected,
    setConnected
  ] = useState(false);


  // =====================================================
  // REF
  // =====================================================

  const socketRef =
    useRef(null);


  // =====================================================
  // AUTH CHECK
  // =====================================================

  useEffect(() => {

    if (!token) {

      navigate(
        "/login",
        {
          replace: true
        }
      );

    }

  }, [
    token,
    navigate
  ]);


  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {

    if (!token) {
      return;
    }

    loadNotifications();

  }, [token]);


  // =====================================================
  // SOCKET
  // =====================================================

  useEffect(() => {

    if (!token) {
      return;
    }


    const socket =
      io(
        SOCKET_URL,
        {
          transports: [
            "websocket",
            "polling"
          ],

          auth: {
            token
          },

          reconnection: true,

          reconnectionAttempts:
            Infinity,

          reconnectionDelay:
            1000,

          reconnectionDelayMax:
            5000
        }
      );


    socketRef.current =
      socket;


    // ---------------------------------------------------
    // CONNECT
    // ---------------------------------------------------

    socket.on(
      "connect",
      () => {

        setConnected(true);

        console.log(
          "Notification socket connected:",
          socket.id
        );

      }
    );


    // ---------------------------------------------------
    // DISCONNECT
    // ---------------------------------------------------

    socket.on(
      "disconnect",
      () => {

        setConnected(false);

      }
    );


    // ---------------------------------------------------
    // REAL-TIME MESSAGE NOTIFICATION
    // ---------------------------------------------------

    socket.on(
      "message_notification",
      data => {

        const message =
          data?.message;

        const sender =
          data?.sender;


        const newNotification = {

          id:
            `live-${Date.now()}-${Math.random()}`,

          type:
            "new_message",

          title:
            `New message from ${
              sender?.name ||
              sender?.username ||
              "Someone"
            }`,

          message:
            message?.content ||
            "You received a new message.",

          is_read:
            false,

          related_user_id:
            sender?.id ||
            null,

          related_message_id:
            message?.id ||
            null,

          created_at:
            new Date().toISOString(),

          live:
            true

        };


        setNotifications(
          previous => {

            // Avoid duplicate live events.

            const duplicate =
              previous.some(
                item =>

                  Number(
                    item.related_message_id
                  ) ===
                  Number(
                    newNotification.related_message_id
                  )

              );


            if (duplicate) {
              return previous;
            }


            return [
              newNotification,
              ...previous
            ];

          }
        );


        setUnreadCount(
          previous =>
            previous + 1
        );

      }
    );


    // ---------------------------------------------------
    // FRIEND NOTIFICATION
    // ---------------------------------------------------

    socket.on(
      "friend_notification",
      data => {

        const newNotification = {

          id:
            `friend-${Date.now()}-${Math.random()}`,

          type:
            data?.type ||
            "friend_request",

          title:
            data?.title ||
            "Friend notification",

          message:
            data?.message ||
            "You have a new friend notification.",

          is_read:
            false,

          related_user_id:
            data?.related_user_id ||
            null,

          related_message_id:
            null,

          created_at:
            new Date().toISOString(),

          live:
            true

        };


        setNotifications(
          previous => [
            newNotification,
            ...previous
          ]
        );


        setUnreadCount(
          previous =>
            previous + 1
        );

      }
    );


    // ---------------------------------------------------
    // SYSTEM NOTIFICATION
    // ---------------------------------------------------

    socket.on(
      "system_notification",
      data => {

        const newNotification = {

          id:
            `system-${Date.now()}-${Math.random()}`,

          type:
            data?.type ||
            "system",

          title:
            data?.title ||
            "NearConnect",

          message:
            data?.message ||
            "",

          is_read:
            false,

          related_user_id:
            null,

          related_message_id:
            null,

          created_at:
            new Date().toISOString(),

          live:
            true

        };


        setNotifications(
          previous => [
            newNotification,
            ...previous
          ]
        );


        setUnreadCount(
          previous =>
            previous + 1
        );

      }
    );


    // ---------------------------------------------------
    // CLEANUP
    // ---------------------------------------------------

    return () => {

      socket.disconnect();

      socketRef.current =
        null;

    };

  }, [token]);


  // =====================================================
  // LOAD NOTIFICATIONS
  // =====================================================

  const loadNotifications =
    async () => {

      try {

        setLoading(true);

        setError("");


        const data =
          await apiFetch(
            "/api/notifications"
          );


        setNotifications(
          Array.isArray(
            data.notifications
          )
            ? data.notifications
            : []
        );


        const loadedNotifications =
          Array.isArray(
            data.notifications
          )
            ? data.notifications
            : [];


        setNotifications(
          loadedNotifications
        );


        const loadedUnreadCount =
          Number(
            data.unread_count ||
            0
          );


        setUnreadCount(
          loadedUnreadCount
        );


        // IMPORTANT:
        // Keep the notifications visible on this page,
        // then mark them as read. Do not mark them read
        // before loading them, otherwise an unread-only
        // backend response can make the page look blank.
        if (
          loadedUnreadCount > 0
        ) {

          try {

            await apiFetch(
              "/api/notifications/read-all",
              {
                method:
                  "PUT"
              }
            );


            setNotifications(
              previous =>
                previous.map(
                  notification => ({
                    ...notification,
                    is_read: true
                  })
                )
            );


            setUnreadCount(
              0
            );

          } catch (readError) {

            console.error(
              "MARK NOTIFICATIONS READ AFTER LOAD:",
              readError
            );

            // Keep the loaded notifications visible even
            // if marking them read fails.
          }

        }


      } catch (err) {

        console.error(
          "LOAD NOTIFICATIONS:",
          err
        );


        setError(
          err.message ||
          "Unable to load notifications."
        );

      } finally {

        setLoading(false);

      }

    };


  // =====================================================
  // MARK ONE READ
  // =====================================================

  const markAsRead =
    async notification => {

      if (
        !notification ||
        notification.is_read
      ) {

        return;

      }


      // Live notifications do not have a
      // database ID yet. Reloading will
      // reconcile them.

      if (
        String(
          notification.id
        ).startsWith("live-") ||
        String(
          notification.id
        ).startsWith("friend-") ||
        String(
          notification.id
        ).startsWith("system-")
      ) {

        setNotifications(
          previous =>
            previous.map(
              item => {

                if (
                  item.id ===
                  notification.id
                ) {

                  return {
                    ...item,
                    is_read: true
                  };

                }

                return item;

              }
            )
        );


        setUnreadCount(
          previous =>
            Math.max(
              0,
              previous - 1
            )
        );


        // For a live event, no DB record
        // may exist yet in the current UI.
        // Simply open the related destination.

        openNotificationTarget(
          notification
        );

        return;

      }


      try {

        await apiFetch(
          `/api/notifications/${notification.id}/read`,
          {
            method:
              "PUT"
          }
        );


        setNotifications(
          previous =>
            previous.map(
              item => {

                if (
                  item.id ===
                  notification.id
                ) {

                  return {
                    ...item,
                    is_read: true
                  };

                }

                return item;

              }
            )
        );


        setUnreadCount(
          previous =>
            Math.max(
              0,
              previous - 1
            )
        );


        openNotificationTarget(
          notification
        );


      } catch (err) {

        console.error(
          "MARK NOTIFICATION READ:",
          err
        );

      }

    };


  // =====================================================
  // MARK ALL READ
  // =====================================================

  const markAllAsRead =
    async () => {

      if (
        unreadCount === 0 ||
        markingAll
      ) {

        return;

      }


      try {

        setMarkingAll(true);


        await apiFetch(
          "/api/notifications/read-all",
          {
            method:
              "PUT"
          }
        );


        setNotifications(
          previous =>
            previous.map(
              notification => ({
                ...notification,
                is_read: true
              })
            )
        );


        setUnreadCount(
          0
        );


      } catch (err) {

        console.error(
          "MARK ALL NOTIFICATIONS:",
          err
        );


        setError(
          err.message ||
          "Unable to mark notifications as read."
        );

      } finally {

        setMarkingAll(false);

      }

    };


  // =====================================================
  // OPEN NOTIFICATION TARGET
  // =====================================================

  const openNotificationTarget =
    notification => {

      if (!notification) {
        return;
      }


      // New message
      if (
        notification.type ===
          "new_message" &&
        notification.related_user_id
      ) {

        navigate(
          `/messages?friend=${notification.related_user_id}`
        );

        return;

      }


      // Friend request
      if (
        notification.type ===
          "friend_request" &&
        notification.related_user_id
      ) {

        navigate(
          "/friends"
        );

        return;

      }


      // Friend accepted
      if (
        notification.type ===
          "friend_accepted" &&
        notification.related_user_id
      ) {

        navigate(
          `/profile?user=${notification.related_user_id}`
        );

        return;

      }

    };


  // =====================================================
  // ICON
  // =====================================================

  // Search / UI helper isn't needed here,
  // but keeping notification rendering
  // centralized makes the page easier to extend.


  // =====================================================
  // LOADING
  // =====================================================

  if (
    !token ||
    loading
  ) {

    return (

      <div className="notifications-page">

        <div className="notifications-loading">

          <div className="notifications-spinner" />

          <h2>
            Loading notifications
          </h2>

          <p>
            Checking your latest updates...
          </p>

        </div>

      </div>

    );

  }


  // =====================================================
  // RENDER
  // =====================================================

  return (

    <div className="notifications-page">


      {/* =================================================
          TOP NAV
      ================================================= */}

      <header className="notifications-header">


        <div className="notifications-header-left">


          <button
            type="button"
            className="notifications-back"
            onClick={() =>
              navigate(
                "/dashboard"
              )
            }
            aria-label="Back to dashboard"
          >
            ←
          </button>


          <div className="notifications-brand-mark">
            N
          </div>


          <div>

            <h1>
              Notifications
            </h1>

            <p>
              Stay updated with your network
            </p>

          </div>

        </div>


        <div className="notifications-header-right">


          <span
            className={
              connected
                ? "notification-connection live"
                : "notification-connection"
            }
          >

            <span />

            {connected
              ? "Live"
              : "Offline"}

          </span>


          <button
            type="button"
            className="notifications-messages-button"
            onClick={() =>
              navigate(
                "/messages"
              )
            }
          >

            <span>
              💬
            </span>

            <span>
              Messages
            </span>

          </button>

        </div>

      </header>


      {/* =================================================
          MAIN
      ================================================= */}

      <main className="notifications-main">


        {/* =================================================
            INTRO
        ================================================= */}

        <section className="notifications-hero">


          <div>

            <span className="notifications-label">
              YOUR UPDATES
            </span>


            <h2>
              Everything important,
              <br />
              in one place.
            </h2>


            <p>
              Friend requests, messages,
              connections and important
              NearConnect updates.
            </p>

          </div>


          <div className="notifications-hero-icon">
            🔔
          </div>

        </section>


        {/* =================================================
            ERROR
        ================================================= */}

        {error && (

          <div className="notifications-error">

            <span>
              ⚠️
            </span>


            <strong>
              {error}
            </strong>

          </div>

        )}


        {/* =================================================
            TOOLBAR
        ================================================= */}

        <section className="notifications-toolbar">


          <div className="notifications-count">


            <div className="notifications-count-icon">
              🔔
            </div>


            <div>

              <strong>
                {unreadCount}
              </strong>


              <span>
                unread
              </span>

            </div>

          </div>


          <button
            type="button"
            className="mark-all-button"
            onClick={
              markAllAsRead
            }
            disabled={
              unreadCount === 0 ||
              markingAll
            }
          >

            {markingAll
              ? "Marking..."
              : "✓ Mark all as read"}

          </button>

        </section>


        {/* =================================================
            NOTIFICATION LIST
        ================================================= */}

        {notifications.length === 0 ? (

          <section className="notifications-empty">


            <div className="notifications-empty-icon">
              🔔
            </div>


            <h2>
              You're all caught up
            </h2>


            <p>
              New friend requests,
              messages and updates will
              appear here.
            </p>


            <button
              type="button"
              onClick={() =>
                navigate(
                  "/friends"
                )
              }
            >
              Explore Friends
            </button>

          </section>

        ) : (

          <section className="notification-list">


            {/* =================================================
                NEW / UNREAD LABEL
            ================================================= */}

            {notifications.some(
              item =>
                !item.is_read
            ) && (

              <div className="notification-section-title">

                <span>
                  NEW
                </span>

              </div>

            )}


            {notifications.map(
              notification => (

                <article
                  key={
                    notification.id
                  }
                  className={
                    notification.is_read
                      ? "notification-card"
                      : `notification-card unread ${getNotificationClass(
                          notification
                        )}`
                  }
                  onClick={() =>
                    markAsRead(
                      notification
                    )
                  }
                >


                  {/* ICON */}

                  <div
                    className={
                      notification.is_read
                        ? "notification-icon"
                        : `notification-icon ${getNotificationClass(
                            notification
                          )}`
                    }
                  >

                    {getNotificationIcon(
                      notification.type
                    )}

                  </div>


                  {/* CONTENT */}

                  <div className="notification-content">


                    <div className="notification-title-row">

                      <h3>
                        {
                          notification.title
                        }
                      </h3>


                      {!notification.is_read && (

                        <span className="unread-dot" />

                      )}

                    </div>


                    <p>
                      {
                        notification.message
                      }
                    </p>


                    <div className="notification-meta">

                      <span>
                        🕒{" "}
                        {
                          formatNotificationTime(
                            notification.created_at
                          )
                        }
                      </span>


                      {!notification.is_read && (

                        <span className="notification-unread-text">
                          Unread
                        </span>

                      )}

                    </div>

                  </div>


                  {/* ACTION */}

                  <button
                    type="button"
                    className="notification-open"
                    onClick={event => {

                      event.stopPropagation();

                      markAsRead(
                        notification
                      );

                    }}
                    aria-label="Open notification"
                  >
                    →
                  </button>

                </article>

              )
            )}

          </section>

        )}

      </main>

    </div>

  );

}