import React, {
  useEffect,
  useRef,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import {
  io
} from "socket.io-client";

import {
  apiFetch,
  getToken
} from "../api";

import "./Dashboard.css";


const API_BASE =
  "http://127.0.0.1:5001";

const SOCKET_URL =
  "http://127.0.0.1:5001";


// =========================================================
// PROFILE IMAGE
// =========================================================

const getProfileImageUrl = (image) => {

  if (!image) {
    return "";
  }

  if (
    image.startsWith("http://") ||
    image.startsWith("https://")
  ) {
    return image;
  }

  if (image.startsWith("/")) {
    return `${API_BASE}${image}`;
  }

  return `${API_BASE}/media/profile/${image}`;
};


// =========================================================
// INITIAL
// =========================================================

const getInitial = (user) => {

  return (
    user?.name ||
    user?.username ||
    "N"
  )
    .charAt(0)
    .toUpperCase();

};


// =========================================================
// DASHBOARD
// =========================================================

export default function Dashboard() {

  const navigate =
    useNavigate();

  const token =
    getToken();


  // =======================================================
  // PROFILE / PEOPLE
  // =======================================================

  const [
    profile,
    setProfile
  ] = useState(null);

  const [
    nearbyPeople,
    setNearbyPeople
  ] = useState([]);

  const [
    friendRequests,
    setFriendRequests
  ] = useState([]);


  // =======================================================
  // RADIUS
  // =======================================================

  const [
    radius,
    setRadius
  ] = useState(2);


  // =======================================================
  // LOADING
  // =======================================================

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    nearbyLoading,
    setNearbyLoading
  ] = useState(false);


  // =======================================================
  // ERROR
  // =======================================================

  const [
    error,
    setError
  ] = useState("");


  // =======================================================
  // LOCATION
  // =======================================================

  const [
    locationEnabled,
    setLocationEnabled
  ] = useState(false);

  const [
    locationLoading,
    setLocationLoading
  ] = useState(false);

  const [
    locationMessage,
    setLocationMessage
  ] = useState("");


  const locationWatchId =
    useRef(null);


  // =======================================================
  // UNREAD COUNTS
  // =======================================================

  const [
    unreadMessages,
    setUnreadMessages
  ] = useState(0);

  const [
    unreadNotifications,
    setUnreadNotifications
  ] = useState(0);


  // =======================================================
  // SOCKET
  // =======================================================

  const socketRef =
    useRef(null);


  // =======================================================
  // TOAST
  // =======================================================

  const [
    notificationToast,
    setNotificationToast
  ] = useState(null);


  const toastTimerRef =
    useRef(null);


  // =======================================================
  // CURRENT USER
  // =======================================================

  const currentUserRef =
    useRef(null);


  // =======================================================
  // AUTH
  // =======================================================

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

    loadDashboard();

  }, [
    token,
    navigate
  ]);


  // =======================================================
  // LOAD DASHBOARD
  // =======================================================

  const loadDashboard =
    async () => {

      try {

        setLoading(true);
        setError("");


        const profileData =
          await apiFetch(
            "/api/users/profile"
          );


        const currentProfile =
          profileData?.user ||
          profileData;


        setProfile(
          currentProfile
        );


        currentUserRef.current =
          currentProfile;


        localStorage.setItem(
          "nearconnect_user",
          JSON.stringify(
            currentProfile
          )
        );


        const nearbyData =
          await apiFetch(
            `/api/users/nearby?radius=${radius}`
          );


        setNearbyPeople(
          nearbyData?.users ||
          nearbyData?.people ||
          nearbyData?.nearby ||
          []
        );


        const requestsData =
          await apiFetch(
            "/api/friends/requests"
          );


        setFriendRequests(
          requestsData?.requests ||
          []
        );


        await loadUnreadCounts();

      } catch (err) {

        console.error(
          "Dashboard error:",
          err
        );


        if (
          String(
            err.message || ""
          ).includes("401")
        ) {

          localStorage.removeItem(
            "nearconnect_token"
          );

          localStorage.removeItem(
            "nearconnect_user"
          );


          navigate(
            "/login",
            {
              replace: true
            }
          );

          return;
        }


        setError(
          err.message ||
          "Unable to load dashboard."
        );

      } finally {

        setLoading(false);

      }

    };


  // =======================================================
  // RADIUS CHANGE
  // =======================================================

  useEffect(() => {

    if (!token) {
      return;
    }

    if (loading) {
      return;
    }

    loadNearbyPeople(
      radius
    );

  }, [radius]);


  // =======================================================
  // NEARBY
  // =======================================================

  const loadNearbyPeople =
    async selectedRadius => {

      try {

        setNearbyLoading(
          true
        );


        const data =
          await apiFetch(
            `/api/users/nearby?radius=${selectedRadius}`
          );


        setNearbyPeople(
          data?.users ||
          data?.people ||
          data?.nearby ||
          []
        );

      } catch (err) {

        console.error(
          "Nearby error:",
          err
        );


        setError(
          err.message ||
          "Unable to load nearby people."
        );

      } finally {

        setNearbyLoading(
          false
        );

      }

    };


  // =======================================================
  // UNREAD COUNTS
  // =======================================================

  const loadUnreadCounts =
    async () => {

      try {

        const [
          messageData,
          notificationData
        ] = await Promise.all([

          apiFetch(
            "/api/messages/unread/count"
          ),

          apiFetch(
            "/api/notifications/unread/count"
          )

        ]);


        setUnreadMessages(
          Number(
            messageData?.unread_count ||
            0
          )
        );


        setUnreadNotifications(
          Number(
            notificationData?.unread_count ||
            0
          )
        );

      } catch (err) {

        console.error(
          "Unread counts error:",
          err
        );

      }

    };


  // =======================================================
  // SHOW TOAST
  // =======================================================

  const showNotificationToast =
    notification => {

      if (!notification) {
        return;
      }


      if (toastTimerRef.current) {

        clearTimeout(
          toastTimerRef.current
        );

      }


      setNotificationToast(
        notification
      );


      toastTimerRef.current =
        setTimeout(
          () => {

            setNotificationToast(
              null
            );

          },
          5000
        );


      // -----------------------------------------------
      // Browser notification
      // -----------------------------------------------

      if (
        "Notification" in window &&
        Notification.permission ===
        "granted" &&
        document.visibilityState !==
        "visible"
      ) {

        try {

          new Notification(
            notification.title ||
            "NearConnect",
            {
              body:
                notification.message ||
                "You have a new notification.",

              icon:
                "/favicon.ico"
            }
          );

        } catch (notificationError) {

          console.error(
            "Browser notification:",
            notificationError
          );

        }

      }

    };


  // =======================================================
  // BROWSER NOTIFICATION PERMISSION
  // =======================================================

  useEffect(() => {

    if (
      "Notification" in window &&
      Notification.permission ===
      "default"
    ) {

      Notification.requestPermission()
        .catch(
          err => {
            console.error(
              "Notification permission:",
              err
            );
          }
        );

    }

  }, []);


  // =======================================================
  // SOCKET.IO
  // =======================================================

  useEffect(() => {

    if (!token) {
      return;
    }


    console.log(
      "Starting Dashboard Socket.IO..."
    );


    const socket =
      io(
        SOCKET_URL,
        {

          // We keep polling transport because
          // your local WebSocket upgrade produced
          // "Invalid frame header".
          //
          // This is still Socket.IO real-time.
          transports: [
            "polling"
          ],

          upgrade: false,

          auth: {
            token
          },

          reconnection:
            true,

          reconnectionAttempts:
            Infinity,

          reconnectionDelay:
            500,

          reconnectionDelayMax:
            3000

        }
      );


    socketRef.current =
      socket;


    // ===================================================
    // CONNECT
    // ===================================================

    socket.on(
      "connect",
      () => {

        console.log(
          "🔥 DASHBOARD SOCKET CONNECTED:",
          socket.id
        );

      }
    );


    // ===================================================
    // DISCONNECT
    // ===================================================

    socket.on(
      "disconnect",
      reason => {

        console.log(
          "Dashboard Socket disconnected:",
          reason
        );

      }
    );


    // ===================================================
    // CONNECTION ERROR
    // ===================================================

    socket.on(
      "connect_error",
      socketError => {

        console.error(
          "Dashboard Socket error:",
          socketError
        );

      }
    );


    // ===================================================
    // INSTANT MESSAGE NOTIFICATION
    // ===================================================

    socket.on(
      "message_notification",
      data => {

        console.log(
          "🔥 INSTANT MESSAGE NOTIFICATION:",
          data
        );


        const sender =
          data?.sender ||
          {};


        const message =
          data?.message ||
          {};


        // ----------------------------------------------
        // Update badges immediately
        // ----------------------------------------------

        setUnreadMessages(
          previous =>
            previous + 1
        );


        setUnreadNotifications(
          previous =>
            previous + 1
        );


        // ----------------------------------------------
        // Toast immediately
        // ----------------------------------------------

        showNotificationToast({

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

          related_user_id:
            sender?.id ||
            null,

          related_message_id:
            message?.id ||
            null

        });

      }
    );


    // ===================================================
    // INSTANT FRIEND NOTIFICATION
    // ===================================================

    socket.on(
      "friend_notification",
      data => {

        console.log(
          "🔥 INSTANT FRIEND NOTIFICATION:",
          data
        );


        setUnreadNotifications(
          previous =>
            previous + 1
        );


        showNotificationToast({

          type:
            data?.type ||
            "friend_request",

          title:
            data?.title ||
            "Friend notification",

          message:
            data?.message ||
            "You have a new friend notification.",

          related_user_id:
            data?.related_user_id ||
            null

        });


        // Refresh request list instantly
        apiFetch(
          "/api/friends/requests"
        )
          .then(
            requestsData => {

              setFriendRequests(
                requestsData?.requests ||
                []
              );

            }
          )
          .catch(
            requestError => {

              console.error(
                "Refresh friend requests:",
                requestError
              );

            }
          );

      }
    );


    // ===================================================
    // INSTANT SYSTEM NOTIFICATION
    // ===================================================

    socket.on(
      "system_notification",
      data => {

        console.log(
          "🔥 INSTANT SYSTEM NOTIFICATION:",
          data
        );


        setUnreadNotifications(
          previous =>
            previous + 1
        );


        showNotificationToast({

          type:
            data?.type ||
            "system",

          title:
            data?.title ||
            "NearConnect",

          message:
            data?.message ||
            "You have a new notification.",

          related_user_id:
            data?.related_user_id ||
            null

        });

      }
    );


    // ===================================================
    // USER ONLINE
    // ===================================================

    socket.on(
      "user_online",
      data => {

        const userId =
          Number(
            data?.user_id
          );


        setNearbyPeople(
          previous =>
            previous.map(
              person =>
                Number(
                  person.id
                ) ===
                userId
                  ? {
                      ...person,
                      is_online:
                        true
                    }
                  : person
            )
        );

      }
    );


    // ===================================================
    // USER OFFLINE
    // ===================================================

    socket.on(
      "user_offline",
      data => {

        const userId =
          Number(
            data?.user_id
          );


        setNearbyPeople(
          previous =>
            previous.map(
              person =>
                Number(
                  person.id
                ) ===
                userId
                  ? {
                      ...person,
                      is_online:
                        false
                    }
                  : person
            )
        );

      }
    );


    // ===================================================
    // CLEANUP
    // ===================================================

    return () => {

      console.log(
        "Closing Dashboard Socket.IO"
      );


      socket.disconnect();

      socketRef.current =
        null;


      if (
        toastTimerRef.current
      ) {

        clearTimeout(
          toastTimerRef.current
        );

      }

    };

  }, [token]);


  // =======================================================
  // LOCATION
  // =======================================================

  useEffect(() => {

    const saved =
      localStorage.getItem(
        "nearconnect_location_enabled"
      );


    if (
      saved ===
      "true"
    ) {

      startLocationTracking();

    }


    return () => {

      stopLocationTracking();

    };

  }, []);


  // =======================================================
  // START LOCATION
  // =======================================================

  const startLocationTracking =
    () => {

      if (
        !navigator.geolocation
      ) {

        setError(
          "Location is not supported by this browser."
        );

        return;

      }


      stopLocationTracking();


      setLocationLoading(
        true
      );


      setLocationMessage(
        "Requesting location..."
      );


      const watchId =
        navigator.geolocation.watchPosition(

          async position => {

            const {
              latitude,
              longitude
            } =
              position.coords;


            setLocationEnabled(
              true
            );

            setLocationLoading(
              false
            );


            setLocationMessage(
              "Your location is live."
            );


            localStorage.setItem(
              "nearconnect_location_enabled",
              "true"
            );


            try {

              await apiFetch(
                "/api/users/location",
                {
                  method:
                    "POST",

                  body:
                    JSON.stringify({
                      latitude,
                      longitude
                    })
                }
              );


              await loadNearbyPeople(
                radius
              );

            } catch (err) {

              console.error(
                "Location update:",
                err
              );

            }

          },

          geoError => {

            console.error(
              "Location error:",
              geoError
            );


            setLocationLoading(
              false
            );

            setLocationEnabled(
              false
            );


            localStorage.setItem(
              "nearconnect_location_enabled",
              "false"
            );


            setLocationMessage(
              "Location access is off."
            );

          },

          {
            enableHighAccuracy:
              true,

            maximumAge:
              10000,

            timeout:
              15000
          }

        );


      locationWatchId.current =
        watchId;

    };


  // =======================================================
  // STOP LOCATION
  // =======================================================

  const stopLocationTracking =
    () => {

      if (
        locationWatchId.current !==
        null
      ) {

        navigator.geolocation.clearWatch(
          locationWatchId.current
        );


        locationWatchId.current =
          null;

      }

    };


  // =======================================================
  // TOGGLE LOCATION
  // =======================================================

  const toggleLocation =
    () => {

      if (
        locationEnabled
      ) {

        stopLocationTracking();


        setLocationEnabled(
          false
        );


        setLocationMessage(
          "Location sharing is off."
        );


        localStorage.setItem(
          "nearconnect_location_enabled",
          "false"
        );


        return;

      }


      startLocationTracking();

    };


  // =======================================================
  // NAVIGATION
  // =======================================================

  const goDashboard =
    () => {

      navigate(
        "/dashboard"
      );

    };


  const openFriends =
    () => {

      navigate(
        "/friends"
      );

    };


  const openMessages =
    () => {

      navigate(
        "/messages"
      );

    };


  const openNotifications =
    () => {

      navigate(
        "/notifications"
      );

    };


  const openProfile =
    () => {

      navigate(
        "/profile"
      );

    };


  const openSettings =
    () => {

      navigate(
        "/settings"
      );

    };


  // =======================================================
  // LOGOUT
  // =======================================================

  const logout =
    () => {

      stopLocationTracking();


      if (
        socketRef.current
      ) {

        socketRef.current.disconnect();

      }


      localStorage.removeItem(
        "nearconnect_token"
      );

      localStorage.removeItem(
        "nearconnect_user"
      );

      localStorage.removeItem(
        "nearconnect_location_enabled"
      );


      navigate(
        "/login",
        {
          replace:
            true
        }
      );

    };


  // =======================================================
  // TOAST CLICK
  // =======================================================

  const openToast =
    () => {

      if (!notificationToast) {
        return;
      }


      if (
        notificationToast.type ===
        "new_message" &&
        notificationToast.related_user_id
      ) {

        navigate(
          `/messages?friend=${notificationToast.related_user_id}`
        );

      } else {

        navigate(
          "/notifications"
        );

      }


      setNotificationToast(
        null
      );

    };


  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {

    return (

      <div className="dashboard-page">

        <div className="dashboard-loading">

          <div className="loading-spinner" />

          <h2>
            Loading NearConnect
          </h2>

          <p>
            Finding your local network...
          </p>

        </div>

      </div>

    );

  }


  // =======================================================
  // RADIUS FILTER
  // =======================================================
  // Only show people whose actual distance is within
  // the selected radius.
  const visibleNearbyPeople =
    nearbyPeople.filter((person) => {
      const distance =
        parseFloat(person.distance);

      if (Number.isNaN(distance)) {
        return false;
      }

      // Separate, non-overlapping ranges:
      // 2 km -> 0 to 2 km
      // 4 km -> above 2 to 4 km
      // 5 km -> above 4 to 5 km
      if (Number(radius) === 2) {
        return distance >= 0 && distance <= 2;
      }

      if (Number(radius) === 4) {
        return distance > 2 && distance <= 4;
      }

      if (Number(radius) === 5) {
        return distance > 4 && distance <= 5;
      }

      return false;
    });


  // =======================================================
  // RENDER
  // =======================================================

  return (

    <div className="dashboard-page">


      {/* =================================================
          INSTANT NOTIFICATION TOAST
      ================================================= */}

      {notificationToast && (

        <div
          className="dashboard-notification-toast"
          onClick={
            openToast
          }
        >

          <div className="dashboard-toast-icon">
            💬
          </div>


          <div className="dashboard-toast-content">

            <strong>
              {
                notificationToast.title
              }
            </strong>


            <p>
              {
                notificationToast.message
              }
            </p>

          </div>


          <button
            type="button"
            onClick={
              event => {

                event.stopPropagation();

                setNotificationToast(
                  null
                );

              }
            }
            aria-label="Close notification"
          >
            ×
          </button>

        </div>

      )}


      {/* =================================================
          NAVBAR
      ================================================= */}

      <header className="dashboard-topbar">


        <button
          type="button"
          className="dashboard-brand"
          onClick={
            goDashboard
          }
        >

          <div className="dashboard-brand-mark">
            N
          </div>

          <span>
            NearConnect
          </span>

        </button>


        <nav
          className="dashboard-user-actions"
        >


          {/* PROFILE */}

          <button
            type="button"
            className="dashboard-user-button"
            onClick={
              openProfile
            }
          >

            <div className="dashboard-avatar">

              {profile?.profile_image ? (

                <img
                  src={
                    getProfileImageUrl(
                      profile.profile_image
                    )
                  }
                  alt={
                    profile?.name ||
                    profile?.username ||
                    "Profile"
                  }
                  className="dashboard-avatar-image"
                />

              ) : (

                getInitial(
                  profile
                )

              )}

            </div>


            <strong>
              {
                profile?.username ||
                "User"
              }
            </strong>

          </button>


          {/* FRIENDS */}

          <button
            type="button"
            className="dashboard-nav-button"
            onClick={
              openFriends
            }
          >

            👥 Friends

          </button>


          {/* MESSAGES */}

          <button
            type="button"
            className="dashboard-messages-button"
            onClick={
              openMessages
            }
          >

            💬 Messages


            {unreadMessages > 0 && (

              <span className="dashboard-unread-badge">

                {
                  unreadMessages >
                  99
                    ? "99+"
                    : unreadMessages
                }

              </span>

            )}

          </button>


          {/* NOTIFICATIONS */}

          <button
            type="button"
            className="dashboard-notifications-button"
            onClick={
              openNotifications
            }
          >

            🔔 Notifications


            {unreadNotifications > 0 && (

              <span className="dashboard-notification-badge">

                {
                  unreadNotifications >
                  99
                    ? "99+"
                    : unreadNotifications
                }

              </span>

            )}

          </button>


          {/* SETTINGS */}

          <button
            type="button"
            className="dashboard-settings-button"
            onClick={
              openSettings
            }
          >

            ⚙️ Settings

          </button>


          {/* LOGOUT */}

          <button
            type="button"
            className="dashboard-logout"
            onClick={
              logout
            }
          >
            Logout
          </button>

        </nav>

      </header>


      {/* =================================================
          MAIN
      ================================================= */}

      <main className="dashboard-main">


        {/* ERROR */}

        {error && (

          <div className="dashboard-error">

            <strong>
              Something went wrong
            </strong>

            <span>
              {error}
            </span>

          </div>

        )}


        {/* =================================================
            HERO
        ================================================= */}

        <section className="dashboard-welcome">

          <div>

            <span className="dashboard-label">
              NEARCONNECT
            </span>


            <h1>
              Discover people
              <br />
              around you.
            </h1>


            <p>
              Find meaningful connections
              nearby and build your local
              network.
            </p>

          </div>


          <div className="dashboard-welcome-icon">
            📍
          </div>

        </section>


        {/* =================================================
            PROFILE
        ================================================= */}

        <section className="dashboard-profile">


          <div className="profile-avatar">

            {profile?.profile_image ? (

              <img
                src={
                  getProfileImageUrl(
                    profile.profile_image
                  )
                }
                alt={
                  profile?.name ||
                  profile?.username ||
                  "Profile"
                }
                className="profile-avatar-image"
              />

            ) : (

              getInitial(
                profile
              )

            )}

          </div>


          <div className="profile-content">

            <span className="dashboard-label">
              YOUR PROFILE
            </span>


            <h2>
              {
                profile?.name ||
                profile?.username ||
                "Your name"
              }
            </h2>


            <p>
              @
              {
                profile?.username ||
                "username"
              }
            </p>


            <div className="profile-meta">

              {profile?.profession && (

                <span>
                  💼{" "}
                  {profile.profession}
                </span>

              )}


              {profile?.interests && (

                <span>
                  ✦{" "}
                  {profile.interests}
                </span>

              )}

            </div>

          </div>


          <button
            type="button"
            className="dashboard-profile-edit"
            onClick={
              openProfile
            }
          >
            Edit Profile →
          </button>

        </section>


        {/* =================================================
            LOCATION
        ================================================= */}

        <section className="dashboard-location">

          <div>

            <span className="dashboard-label">
              YOUR LOCATION
            </span>


            <h2>
              Find people near you
            </h2>


            <p>
              {locationEnabled
                ? "Your location is live."
                : "Turn on location to discover nearby people."}
            </p>


            {locationMessage && (

              <div className="location-status">

                <span
                  className={
                    locationEnabled
                      ? "location-status-dot active"
                      : "location-status-dot"
                  }
                />

                {locationMessage}

              </div>

            )}

          </div>


          <button
            type="button"
            className={
              locationEnabled
                ? "location-button location-on"
                : "location-button location-off"
            }
            onClick={
              toggleLocation
            }
            disabled={
              locationLoading
            }
          >

            📍{" "}

            {locationLoading
              ? "Turning On..."
              : locationEnabled
              ? "Location ON"
              : "Location OFF"}

          </button>

        </section>


        {/* =================================================
            RADIUS
        ================================================= */}

        <section className="dashboard-radius">

          <div>

            <span className="dashboard-label">
              DISCOVERY RANGE
            </span>


            <h2>
              People nearby
            </h2>

          </div>


          <div className="radius-buttons">

            {[2, 4, 5].map(
              value => (

                <button
                  type="button"
                  key={value}
                  className={
                    radius === value
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setRadius(
                      value
                    )
                  }
                  disabled={
                    nearbyLoading
                  }
                >
                  {value} km
                </button>

              )
            )}

          </div>

        </section>


        {/* =================================================
            NEARBY
        ================================================= */}

        <section className="dashboard-section">

          <div className="section-heading">

            <div>

              <span className="dashboard-label">
                DISCOVER
              </span>


              <h2>
                People near you
              </h2>

            </div>


            <span>
              {
                nearbyLoading
                  ? "Updating..."
                  : `${visibleNearbyPeople.length} people`
              }
            </span>

          </div>


          {nearbyLoading ? (

            <div className="nearby-updating">

              <div className="loading-spinner" />

              Finding people...

            </div>

          ) : visibleNearbyPeople.length === 0 ? (

            <div className="empty-state">

              <div>
                📍
              </div>

              <h3>
                No one nearby yet
              </h3>

              <p>
                Try turning on location
                or changing your radius.
              </p>

            </div>

          ) : (

            <div className="people-grid">

              {visibleNearbyPeople.map(
                person => (

                  <article
                    key={
                      person.id
                    }
                    className="person-card"
                  >

                    <div className="person-card-top">

                      <div className="person-avatar">

                        {person.profile_image ? (

                          <img
                            src={
                              getProfileImageUrl(
                                person.profile_image
                              )
                            }
                            alt={
                              person.name ||
                              person.username ||
                              "User"
                            }
                            className="person-avatar-image"
                          />

                        ) : (

                          getInitial(
                            person
                          )

                        )}

                      </div>


                      {person.is_online && (

                        <span className="online-dot">
                          Online
                        </span>

                      )}

                    </div>


                    <h3>
                      {
                        person.name ||
                        person.username
                      }
                    </h3>


                    <span className="person-username">
                      @
                      {
                        person.username ||
                        ""
                      }
                    </span>


                    {person.profession && (

                      <p>
                        {
                          person.profession
                        }
                      </p>

                    )}


                    {person.distance !==
                      undefined && (

                      <span className="distance">
                        📍{" "}
                        {
                          person.distance
                        } km away
                      </span>

                    )}

                  </article>

                )
              )}

            </div>

          )}

        </section>


        {/* =================================================
            FRIEND REQUESTS
        ================================================= */}

        <section className="dashboard-section">

          <div className="section-heading">

            <div>

              <span className="dashboard-label">
                CONNECTIONS
              </span>


              <h2>
                Friend requests
              </h2>

            </div>


            <span>
              {
                friendRequests.length
              }
            </span>

          </div>


          {friendRequests.length === 0 ? (

            <div className="empty-state small">

              <div>
                🤝
              </div>

              <h3>
                No pending requests
              </h3>

            </div>

          ) : (

            <div className="requests-list">

              {friendRequests.map(
                request => {

                  const sender =
                    request.sender ||
                    {};


                  return (

                    <div
                      className="request-card"
                      key={
                        request.id
                      }
                    >

                      <div className="person-avatar">

                        {sender.profile_image ? (

                          <img
                            src={
                              getProfileImageUrl(
                                sender.profile_image
                              )
                            }
                            alt={
                              sender.name ||
                              sender.username ||
                              "User"
                            }
                            className="person-avatar-image"
                          />

                        ) : (

                          getInitial(
                            sender
                          )

                        )}

                      </div>


                      <div>

                        <strong>
                          {
                            sender.name ||
                            sender.username ||
                            "Someone"
                          }
                        </strong>


                        <span>
                          @
                          {
                            sender.username ||
                            ""
                          }
                        </span>

                      </div>

                    </div>

                  );

                }
              )}

            </div>

          )}

        </section>

        {/* =================================================
            MOBILE BOTTOM NAVIGATION
        ================================================= */}
        <nav
          className="mobile-bottom-nav"
          aria-label="Mobile navigation"
        >

          <button
            type="button"
            onClick={goDashboard}
            aria-label="Home"
          >
            <span aria-hidden="true">⌂</span>
            <small>Home</small>
          </button>

          <button
            type="button"
            onClick={() => navigate("/nearby")}
            aria-label="Nearby"
          >
            <span aria-hidden="true">⌖</span>
            <small>Nearby</small>
          </button>

          <button
            type="button"
            onClick={openFriends}
            aria-label="Friends"
          >
            <span aria-hidden="true">♣</span>
            <small>Friends</small>
          </button>

          <button
            type="button"
            onClick={openMessages}
            className="mobile-nav-with-badge"
            aria-label="Messages"
          >
            <span aria-hidden="true">◌</span>

            {unreadMessages > 0 && (
              <b className="mobile-nav-badge">
                {unreadMessages > 99
                  ? "99+"
                  : unreadMessages}
              </b>
            )}

            <small>Messages</small>
          </button>

          <button
            type="button"
            onClick={openNotifications}
            className="mobile-nav-with-badge"
            aria-label="Notifications"
          >
            <span aria-hidden="true">♧</span>

            {unreadNotifications > 0 && (
              <b className="mobile-nav-badge">
                {unreadNotifications > 99
                  ? "99+"
                  : unreadNotifications}
              </b>
            )}

            <small>Alerts</small>
          </button>

        </nav>

      </main>

    </div>

  );

}