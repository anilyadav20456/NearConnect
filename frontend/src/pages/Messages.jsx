import React, {
  useEffect,
  useRef,
  useState
} from "react";

import {
  useNavigate,
  useSearchParams
} from "react-router-dom";

import { io } from "socket.io-client";

import {
  apiFetch,
  getToken,
  getSavedUser
} from "../api";

import "./Messages.css";


const API =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5001"
    : (process.env.REACT_APP_API_URL || "https://nearconnect-backend-cavd.onrender.com");


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
    return `${API}${image}`;
  }

  return `${API}/media/profile/${image}`;
};


export default function Messages() {

  const navigate =
    useNavigate();

  const [
    searchParams,
    setSearchParams
  ] = useSearchParams();


  // =====================================================
  // SELECTED FRIEND
  // =====================================================

  const selectedFriendId =
    searchParams.get("friend");


  // =====================================================
  // AUTH
  // =====================================================

  const token =
    getToken();


  // =====================================================
  // STATE
  // =====================================================

  const [
    conversations,
    setConversations
  ] = useState([]);

  const [
    selectedFriend,
    setSelectedFriend
  ] = useState(null);

  const [
    messages,
    setMessages
  ] = useState([]);

  const [
    text,
    setText
  ] = useState("");

  const [
    search,
    setSearch
  ] = useState("");

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    chatLoading,
    setChatLoading
  ] = useState(false);

  const [
    sending,
    setSending
  ] = useState(false);

  const [
    typing,
    setTyping
  ] = useState(false);

  const [
    connected,
    setConnected
  ] = useState(false);

  const [
    error,
    setError
  ] = useState("");


  // =====================================================
  // REFS
  // =====================================================

  const socketRef =
    useRef(null);

  const typingTimerRef =
    useRef(null);

  const messagesEndRef =
    useRef(null);

  const currentUserRef =
    useRef(null);

  const fileInputRef =
    useRef(null);

  const [uploadingMedia, setUploadingMedia] = useState(false);


  // =====================================================
  // CURRENT USER
  // =====================================================

  useEffect(() => {

    try {

      const savedUser =
        localStorage.getItem(
          "nearconnect_user"
        );

      if (savedUser) {

        currentUserRef.current =
          JSON.parse(savedUser);

      }

    } catch (err) {

      console.error(
        "Unable to read current user:",
        err
      );

      currentUserRef.current =
        null;

    }

  }, []);


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

  }, [token, navigate]);


  // =====================================================
  // LOAD CONVERSATIONS
  // =====================================================

  useEffect(() => {

    if (!token) {
      return;
    }

    loadConversations();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);


  const loadConversations =
    async () => {

      try {

        setLoading(true);

        setError("");


        // Load the conversation list from the correct backend endpoint.
        // GET /api/messages is only used for POSTing a new message.
        const data =
          await apiFetch(
            "/api/messages/conversations"
          );


        const rawConversations =
          Array.isArray(
            data?.conversations
          )
            ? data.conversations
            : [];


        // Backend format:
        // {
        //   friend: {...},
        //   latest_message: {...},
        //   unread_count: number
        // }
        //
        // Convert it to the flat structure used by this component.
        const normalizedConversations =
          rawConversations.map(
            conversation => {

              const friend =
                conversation?.friend ||
                {};

              const latest =
                conversation?.latest_message ||
                null;


              return {

                id:
                  friend.id,

                name:
                  friend.name ||
                  friend.username ||
                  "User",

                username:
                  friend.username ||
                  "",

                profile_image:
                  friend.profile_image ||
                  "",

                is_online:
                  friend.is_online === true,

                show_online_status:
                  friend.show_online_status !== false,

                profession:
                  friend.profession ||
                  "",

                bio:
                  friend.bio ||
                  "",

                last_message:
                  latest?.content ||
                  "",

                last_message_at:
                  latest?.created_at ||
                  null,

                unread_count:
                  Number(
                    conversation?.unread_count ||
                    0
                  )

              };

            }
          );


        setConversations(
          normalizedConversations
        );


        if (selectedFriendId) {

          const matching =
            normalizedConversations.find(
              conversation =>
                Number(
                  conversation.id
                ) ===
                Number(
                  selectedFriendId
                )
            );


          if (matching) {

            setSelectedFriend(
              matching
            );

          }

        }


      } catch (err) {

        console.error(
          "LOAD CONVERSATIONS:",
          err
        );


        setError(
          err.message ||
          "Unable to load conversations."
        );


      } finally {

        setLoading(false);

      }

    };


  // =====================================================
  // LOAD SELECTED CONVERSATION
  // =====================================================

  useEffect(() => {

    if (!selectedFriendId) {

      setSelectedFriend(null);

      setMessages([]);

      setTyping(false);

      return;

    }


    loadConversation(
      selectedFriendId
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFriendId]);


  const loadConversation =
    async (
      friendId
    ) => {

      try {

        setChatLoading(true);

        setError("");


        const data =
          await apiFetch(
            `/api/messages/${friendId}`
          );


        setSelectedFriend(
          data.friend || null
        );


        setMessages(
          Array.isArray(
            data.messages
          )
            ? data.messages
            : []
        );


        // Mark as read
        await markRead(
          friendId
        );


        // Remove unread badge
        setConversations(
          previous =>
            previous.map(
              conversation => {

                if (
                  Number(
                    conversation.id
                  ) ===
                  Number(
                    friendId
                  )
                ) {

                  return {
                    ...conversation,
                    unread_count: 0
                  };

                }

                return conversation;

              }
            )
        );


        scrollToBottom();

      } catch (err) {

        console.error(
          "LOAD CONVERSATION:",
          err
        );


        setError(
          err.message ||
          "Unable to load this conversation."
        );

      } finally {

        setChatLoading(false);

      }

    };


  // =====================================================
  // MARK READ
  // =====================================================

  const markRead =
    async (
      friendId
    ) => {

      try {

        await apiFetch(
          `/api/messages/${friendId}/read`,
          {
            method: "PUT"
          }
        );


      } catch (err) {

        console.error(
          "MARK READ:",
          err
        );

      }

    };


  // =====================================================
  // SOCKET CONNECTION
  // =====================================================

  useEffect(() => {

    if (!token) {
      return;
    }


    const socket =
      io(
        API,
        {
          // Use Socket.IO polling only in local development.
          // This avoids the current WebSocket "Invalid frame header"
          // problem while keeping real-time messaging working.
          transports: [
            "websocket",
            "polling"
          ],

          upgrade: true,

          auth: {
            token
          },

          reconnection: true,

          reconnectionAttempts: Infinity,

          reconnectionDelay: 1000,

          reconnectionDelayMax: 5000
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
          "NearConnect Socket connected:",
          socket.id
        );


        setConnected(true);


        // Join active chat room
        if (
          selectedFriendId
        ) {

          socket.emit(
            "join_room",
            {
              friend_id:
                Number(
                  selectedFriendId
                )
            }
          );

        }

      }
    );


    // ===================================================
    // RECONNECT
    // ===================================================

    socket.io.on(
      "reconnect",
      () => {

        console.log(
          "Socket reconnected"
        );


        setConnected(true);


        if (
          selectedFriendId
        ) {

          socket.emit(
            "join_room",
            {
              friend_id:
                Number(
                  selectedFriendId
                )
            }
          );

        }

      }
    );


    // ===================================================
    // DISCONNECT
    // ===================================================

    socket.on(
      "disconnect",
      () => {

        console.log(
          "NearConnect Socket disconnected"
        );


        setConnected(false);

      }
    );


    // ===================================================
    // CONNECTION ERROR
    // ===================================================

    socket.on(
      "connect_error",
      error => {

        console.error(
          "Socket connection error:",
          error
        );


        setConnected(false);

      }
    );


    // ===================================================
    // NEW MESSAGE
    // ===================================================

    socket.on(
      "new_message",
      (
        message
      ) => {

        console.log(
          "REAL-TIME NEW MESSAGE:",
          message
        );


        const senderId =
          Number(
            message.sender_id
          );

        const receiverId =
          Number(
            message.receiver_id
          );


        const myId =
          Number(
            currentUserRef.current?.id
          );


        const otherUserId =
          senderId === myId
            ? receiverId
            : senderId;


        // -----------------------------------------------
        // ACTIVE CHAT
        // -----------------------------------------------

        if (
          Number(
            selectedFriendId
          ) ===
          Number(
            otherUserId
          )
        ) {

          setMessages(
            previous => {

              const exists =
                previous.some(
                  existing =>
                    Number(
                      existing.id
                    ) ===
                    Number(
                      message.id
                    )
                );


              if (exists) {

                return previous;

              }


              // Remove matching optimistic
              // message if backend message
              // arrives with a real ID.

              const withoutOptimistic =
                previous.filter(
                  existing => {

                    if (
                      !String(
                        existing.id
                      ).startsWith(
                        "temp-"
                      )
                    ) {

                      return true;

                    }


                    return !(
                      Number(
                        existing.sender_id
                      ) ===
                      senderId &&

                      Number(
                        existing.receiver_id
                      ) ===
                      receiverId &&

                      String(
                        existing.content
                      ) ===
                      String(
                        message.content
                      )
                    );

                  }
                );


              return [
                ...withoutOptimistic,
                message
              ];

            }
          );


          scrollToBottom();


          // Incoming message while
          // chat is open -> read.

          if (
            senderId !== myId
          ) {

            markRead(
              otherUserId
            );

          }

        }


        // -----------------------------------------------
        // CONVERSATION PREVIEW
        // -----------------------------------------------

        setConversations(
          previous => {

            const exists =
              previous.some(
                conversation =>
                  Number(
                    conversation.id
                  ) ===
                  Number(
                    otherUserId
                  )
              );


            // If this is a brand-new
            // conversation, reload list.

            if (!exists) {

              loadConversations();

              return previous;

            }


            return previous.map(
              conversation => {

                if (
                  Number(
                    conversation.id
                  ) !==
                  Number(
                    otherUserId
                  )
                ) {

                  return conversation;

                }


                const currentChat =
                  Number(
                    selectedFriendId
                  ) ===
                  Number(
                    otherUserId
                  );


                const isMine =
                  senderId === myId;


                return {

                  ...conversation,

                  last_message:
                    message.content,

                  last_message_at:
                    message.created_at,

                  unread_count:
                    currentChat ||
                    isMine
                      ? 0
                      :
                        Number(
                          conversation.unread_count ||
                          0
                        ) + 1

                };

              }
            );

          }
        );

      }
    );


    // ===================================================
    // TYPING
    // ===================================================

    socket.on(
      "user_typing",
      data => {

        if (
          Number(
            data.user_id
          ) ===
          Number(
            selectedFriendId
          )
        ) {

          setTyping(true);

        }

      }
    );


    // ===================================================
    // STOP TYPING
    // ===================================================

    socket.on(
      "user_stopped_typing",
      data => {

        if (
          Number(
            data.user_id
          ) ===
          Number(
            selectedFriendId
          )
        ) {

          setTyping(false);

        }

      }
    );


    // ===================================================
    // MESSAGE READ
    // ===================================================

    socket.on(
      "message_read",
      data => {
        const readerId = Number(data?.reader_id || data?.user_id);
        const currentFriendId = Number(selectedFriendId);

        if (readerId === currentFriendId || Number(data?.friend_id) === currentFriendId) {
          setMessages(previous =>
            previous.map(message => ({
              ...message,
              is_read: true
            }))
          );
        }
      }
    );

    socket.on(
      "messages_read",
      data => {
        const readerId = Number(data?.reader_id || data?.user_id);
        const currentFriendId = Number(selectedFriendId);

        if (readerId === currentFriendId || Number(data?.friend_id) === currentFriendId) {
          setMessages(previous =>
            previous.map(message => ({
              ...message,
              is_read: true
            }))
          );
        }
      }
    );


    // ===================================================
    // ONLINE
    // ===================================================

    socket.on(
      "user_online",
      data => {

        setSelectedFriend(
          previous => {

            if (
              !previous ||
              Number(
                previous.id
              ) !==
              Number(
                data.user_id
              )
            ) {

              return previous;

            }


            return {
              ...previous,
              is_online: true
            };

          }
        );


        setConversations(
          previous =>
            previous.map(
              conversation => {

                if (
                  Number(
                    conversation.id
                  ) ===
                  Number(
                    data.user_id
                  )
                ) {

                  return {
                    ...conversation,
                    is_online: true
                  };

                }

                return conversation;

              }
            )
        );

      }
    );


    // ===================================================
    // OFFLINE
    // ===================================================

    socket.on(
      "user_offline",
      data => {

        setSelectedFriend(
          previous => {

            if (
              !previous ||
              Number(
                previous.id
              ) !==
              Number(
                data.user_id
              )
            ) {

              return previous;

            }


            return {
              ...previous,
              is_online: false
            };

          }
        );


        setConversations(
          previous =>
            previous.map(
              conversation => {

                if (
                  Number(
                    conversation.id
                  ) ===
                  Number(
                    data.user_id
                  )
                ) {

                  return {
                    ...conversation,
                    is_online: false
                  };

                }

                return conversation;

              }
            )
        );

      }
    );


    // ===================================================
    // CLEANUP
    // ===================================================

    return () => {

      clearTimeout(
        typingTimerRef.current
      );


      if (
        selectedFriendId
      ) {

        socket.emit(
          "leave_room",
          {
            friend_id:
              Number(
                selectedFriendId
              )
          }
        );

      }


      socket.disconnect();

      socketRef.current =
        null;

    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    token,
    selectedFriendId
  ]);


  // =====================================================
  // SCROLL
  // =====================================================

  const scrollToBottom =
    () => {

      setTimeout(() => {

        messagesEndRef
          .current
          ?.scrollIntoView({
            behavior: "smooth",
            block: "end"
          });

      }, 30);

    };


  // =====================================================
  // OPEN CONVERSATION
  // =====================================================

  const openConversation =
    friendId => {

      setSearchParams({
        friend:
          String(
            friendId
          )
      });

    };


  // =====================================================
  // SEND MESSAGE
  // =====================================================

  const sendMessage =
    async () => {

      const content =
        text.trim();


      if (
        !content ||
        !selectedFriendId ||
        sending
      ) {

        return;

      }


      const myId =
        Number(
          currentUserRef.current?.id
        );


      const receiverId =
        Number(
          selectedFriendId
        );


      try {

        setSending(true);

        setError("");


        // =================================================
        // OPTIMISTIC MESSAGE
        //
        // THIS MAKES THE MESSAGE APPEAR
        // IMMEDIATELY WITHOUT REFRESH.
        // =================================================

        const tempMessage = {

          id:
            `temp-${Date.now()}-${Math.random()}`,

          sender_id:
            myId,

          receiver_id:
            receiverId,

          content:

            content,

          is_read:
            false,

          created_at:
            new Date().toISOString(),

          optimistic:
            true

        };


        setMessages(
          previous => [
            ...previous,
            tempMessage
          ]
        );


        setText("");

        scrollToBottom();


        // =================================================
        // SOCKET SEND
        // =================================================

        if (
          socketRef.current &&
          socketRef.current.connected
        ) {

          socketRef.current.emit(
            "send_message",

            {
              receiver_id:
                receiverId,

              content:
                content
            },

            response => {

              console.log(
                "SOCKET MESSAGE RESPONSE:",
                response
              );


              // -------------------------------------------
              // SOCKET ERROR
              // -------------------------------------------

              if (
                response &&
                response.success === false
              ) {

                setMessages(
                  previous =>
                    previous.filter(
                      message =>
                        message.id !==
                        tempMessage.id
                    )
                );


                setError(
                  response.error ||
                  response.message ||
                  "Message could not be sent."
                );


                setText(
                  content
                );


                return;

              }


              // -------------------------------------------
              // SERVER MAY RETURN CREATED MESSAGE
              // -------------------------------------------

              const serverMessage =
                response?.message ||
                response?.data;


              if (serverMessage) {

                setMessages(
                  previous => {

                    const alreadyExists =
                      previous.some(
                        message =>
                          Number(
                            message.id
                          ) ===
                          Number(
                            serverMessage.id
                          )
                      );


                    if (
                      alreadyExists
                    ) {

                      return previous;

                    }


                    return previous.map(
                      message =>

                        message.id ===
                        tempMessage.id
                          ? serverMessage
                          : message

                    );

                  }
                );


                scrollToBottom();

              }

            }
          );


        } else {

          // =================================================
          // REST FALLBACK
          // =================================================

          const data =
            await apiFetch(
              "/api/messages",
              {
                method: "POST",

                body:
                  JSON.stringify({

                    receiver_id:
                      receiverId,

                    content:
                      content

                  })

              }
            );


          const serverMessage =
            data.message_data ||
            data.data ||
            data.message;


          if (
            serverMessage &&
            typeof serverMessage ===
            "object"
          ) {

            setMessages(
              previous => {

                const exists =
                  previous.some(
                    message =>
                      Number(
                        message.id
                      ) ===
                      Number(
                        serverMessage.id
                      )
                  );


                if (exists) {

                  return previous;

                }


                return previous.map(
                  message =>

                    message.id ===
                    tempMessage.id
                      ? serverMessage
                      : message

                );

              }
            );

          }

          scrollToBottom();

        }


        // =================================================
        // UPDATE CONVERSATION PREVIEW
        // =================================================

        setConversations(
          previous => {

            const found =
              previous.some(
                conversation =>
                  Number(
                    conversation.id
                  ) ===
                  receiverId
              );


            if (!found) {

              return previous;

            }


            return previous.map(
              conversation => {

                if (
                  Number(
                    conversation.id
                  ) !==
                  receiverId
                ) {

                  return conversation;

                }


                return {

                  ...conversation,

                  last_message:
                    content,

                  last_message_at:
                    new Date().toISOString(),

                  unread_count:
                    0

                };

              }
            );

          }
        );


      } catch (err) {

        console.error(
          "SEND MESSAGE ERROR:",
          err
        );


        setMessages(
          previous =>
            previous.filter(
              message =>
                !(
                  message.optimistic &&
                  message.content ===
                  content
                )
            )
        );


        setText(
          content
        );


        setError(
          err.message ||
          "Unable to send message."
        );

      } finally {

        setSending(false);

      }

    };


  // =====================================================
  // TYPING
  // =====================================================

  const handleTyping =
    event => {

      const value =
        event.target.value;


      setText(
        value
      );


      if (
        !socketRef.current ||
        !socketRef.current.connected ||
        !selectedFriendId
      ) {

        return;

      }


      socketRef.current.emit(
        "typing",
        {
          friend_id:
            Number(
              selectedFriendId
            )
        }
      );


      clearTimeout(
        typingTimerRef.current
      );


      typingTimerRef.current =
        setTimeout(
          () => {

            if (
              socketRef.current &&
              socketRef.current.connected
            ) {

              socketRef.current.emit(
                "stop_typing",
                {
                  friend_id:
                    Number(
                      selectedFriendId
                    )
                }
              );

            }


          },
          900
        );

    };


  // =====================================================
  // ENTER TO SEND
  // =====================================================

  const handleKeyDown =
    event => {

      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {

        event.preventDefault();

        sendMessage();

      }

    };


  // =====================================================
  // MEDIA UPLOAD & RENDER
  // =====================================================

  const handleMediaSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFriendId || !token) return;

    try {
      setUploadingMedia(true);
      setError("");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("receiver_id", selectedFriendId);
      if (text.trim()) {
        formData.append("content", text.trim());
      }

      const response = await fetch(`${API}/api/messages/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to upload media");
      }

      const newMsg = data.message;
      if (newMsg) {
        setMessages(prev => {
          if (prev.some(m => Number(m.id) === Number(newMsg.id))) return prev;
          return [...prev, newMsg];
        });
        scrollToBottom();
      }

      setText("");
    } catch (err) {
      console.error("Media upload error:", err);
      setError(err.message || "Failed to upload media");
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const renderMessageContent = (content) => {
    if (!content) return null;

    if (content.startsWith("[IMAGE]:")) {
      const spaceIdx = content.indexOf(" ", 8);
      const url = spaceIdx === -1 ? content.slice(8) : content.slice(8, spaceIdx);
      const caption = spaceIdx === -1 ? "" : content.slice(spaceIdx + 1);
      const fullUrl = url.startsWith("http") ? url : `${API}${url}`;

      return (
        <div className="chat-media-box">
          <img
            src={fullUrl}
            alt="Shared image"
            className="chat-media-image"
            onClick={() => window.open(fullUrl, "_blank")}
          />
          {caption && <div className="chat-media-caption">{caption}</div>}
        </div>
      );
    }

    if (content.startsWith("[VIDEO]:")) {
      const spaceIdx = content.indexOf(" ", 8);
      const url = spaceIdx === -1 ? content.slice(8) : content.slice(8, spaceIdx);
      const caption = spaceIdx === -1 ? "" : content.slice(spaceIdx + 1);
      const fullUrl = url.startsWith("http") ? url : `${API}${url}`;

      return (
        <div className="chat-media-box">
          <video src={fullUrl} controls className="chat-media-video" />
          {caption && <div className="chat-media-caption">{caption}</div>}
        </div>
      );
    }

    return content;
  };


  // =====================================================
  // FORMAT MESSAGE TIME
  // =====================================================

  const parseUtcDate = (value) => {
    if (!value) return null;
    let str = String(value);
    if (!str.endsWith("Z") && !str.includes("+") && !str.includes("-", 10)) {
      str += "Z";
    }
    return new Date(str);
  };

  const formatTime = (value) => {
    if (!value) return "";
    try {
      const date = parseUtcDate(value);
      if (!date || isNaN(date.getTime())) return "";
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch {
      return "";
    }
  };


  // =====================================================
  // FORMAT CONVERSATION TIME
  // =====================================================

  const formatConversationTime = (value) => {
    if (!value) return "";
    try {
      const date = parseUtcDate(value);
      if (!date || isNaN(date.getTime())) return "";
      const now = new Date();

      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true
        });
      }

      return date.toLocaleDateString([], {
        day: "2-digit",
        month: "short"
      });
    } catch {
      return "";
    }
  };


  // =====================================================
  // AVATAR INITIAL
  // =====================================================

  const getInitial =
    person => {

      return (
        person?.name ||
        person?.username ||
        "U"
      )
        .charAt(0)
        .toUpperCase();

    };


  // =====================================================
  // FILTER CONVERSATIONS
  // =====================================================

  const filteredConversations =
    conversations.filter(
      conversation => {

        const query =
          search
            .trim()
            .toLowerCase();


        if (!query) {

          return true;

        }


        const name =
          (
            conversation.name ||
            ""
          ).toLowerCase();


        const username =
          (
            conversation.username ||
            ""
          ).toLowerCase();


        const lastMessage =
          (
            conversation.last_message ||
            ""
          ).toLowerCase();


        return (

          name.includes(query) ||

          username.includes(query) ||

          lastMessage.includes(query)

        );

      }
    );


  // =====================================================
  // NOT AUTHENTICATED
  // =====================================================

  if (!token) {

    return null;

  }


  // =====================================================
  // RENDER
  // =====================================================

  return (

    <div className="messages-page">


      <div className="messenger-layout">


        {/* =================================================
            CONVERSATION SIDEBAR
        ================================================= */}

        <aside
          className={
            selectedFriendId
              ? "conversation-sidebar mobile-hidden"
              : "conversation-sidebar"
          }
        >


          {/* HEADER */}

          <div className="conversation-header">

            <div>

              <span className="messages-label">
                NEARCONNECT
              </span>

              <h1>
                Messages
              </h1>

            </div>


            <button
              type="button"
              className="messages-close-button"
              onClick={() =>
                navigate(
                  "/friends"
                )
              }
              aria-label="Close messages"
            >
              ×
            </button>

          </div>


          {/* SEARCH */}

          <div className="conversation-search">

            <span>
              🔎
            </span>


            <input
              type="text"
              value={search}
              onChange={event =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search conversations..."
              aria-label="Search conversations"
            />

          </div>


          {/* LIVE STATUS */}

          <div className="messenger-status">

            <span
              className={
                connected
                  ? "status-live"
                  : "status-offline"
              }
            />

            {connected
              ? "Live messaging"
              : "Connecting..."}

          </div>


          {/* ERROR */}

          {error && (

            <div
              style={{
                margin:
                  "8px 12px",
                padding:
                  "9px 10px",
                borderRadius:
                  "8px",
                background:
                  "#fff1f2",
                color:
                  "#b91c1c",
                fontSize:
                  "9px"
              }}
            >
              {error}
            </div>

          )}


          {/* CONVERSATION LIST */}

          <div className="conversation-list">


            {loading ? (

              <div className="conversation-list-loading">

                <div className="loading-spinner" />

                Loading conversations...

              </div>

            ) : filteredConversations.length === 0 ? (

              <div className="no-conversations">

                <div>
                  💬
                </div>


                <h3>
                  No conversations yet
                </h3>


                <p>
                  Your accepted friends
                  will appear here.
                </p>


                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/friends"
                    )
                  }
                >
                  View Friends
                </button>

              </div>

            ) : (

              filteredConversations.map(
                conversation => {

                  const friendId =
                    Number(
                      conversation.id
                    );


                  const unread =
                    Number(
                      conversation.unread_count ||
                      0
                    );


                  const active =
                    Number(
                      selectedFriendId
                    ) ===
                    friendId;


                  return (

                    <button
                      type="button"
                      key={
                        friendId
                      }
                      className={
                        active
                          ? "conversation-item active"
                          : "conversation-item"
                      }
                      onClick={() =>
                        openConversation(
                          friendId
                        )
                      }
                    >


                      {/* AVATAR */}

                      <div className="conversation-avatar">

                        {conversation.profile_image ? (

                          <img
                            src={
                              getProfileImageUrl(
                                conversation.profile_image
                              )
                            }
                            alt={
                              conversation.name ||
                              conversation.username ||
                              "User"
                            }
                            className="conversation-avatar-image"
                          />

                        ) : (

                          getInitial(
                            conversation
                          )

                        )}


                        {conversation.is_online && (

                          <span className="conversation-online" />

                        )}

                      </div>


                      {/* DETAILS */}

                      <div className="conversation-details">


                        <div className="conversation-name-row">

                          <strong>
                            {
                              conversation.name ||
                              conversation.username ||
                              "User"
                            }
                          </strong>


                          <time>
                            {
                              formatConversationTime(
                                conversation.last_message_at
                              )
                            }
                          </time>

                        </div>


                        <div className="conversation-preview">

                          <span>
                            {
                              conversation.last_message ||
                              "Start a conversation"
                            }
                          </span>


                          {unread > 0 && (

                            <b className="unread-badge">

                              {unread >
                              99
                                ? "99+"
                                : unread}

                            </b>

                          )}

                        </div>

                      </div>

                    </button>

                  );

                }
              )

            )}

          </div>


          {/* FOOTER */}

          <div className="conversation-footer">

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/friends"
                )
              }
            >
              ← Friends
            </button>

          </div>

        </aside>


        {/* =================================================
            CHAT PANEL
        ================================================= */}

        <section
          className={
            selectedFriendId
              ? "chat-panel"
              : "chat-panel chat-panel-empty"
          }
        >


          {/* =================================================
              NO SELECTED CHAT
          ================================================= */}

          {!selectedFriendId ? (

            <div className="select-chat">

              <div className="select-chat-icon">
                💬
              </div>


              <h2>
                Your messages
              </h2>


              <p>
                Select a friend to open
                your conversation.
              </p>


              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/friends"
                  )
                }
              >
                Find Friends
              </button>

            </div>

          ) : (

            <>


              {/* =========================================
                  CHAT HEADER
              ========================================= */}

              <header className="chat-header">


                <button
                  type="button"
                  className="mobile-chat-back"
                  onClick={() =>
                    setSearchParams({})
                  }
                  aria-label="Back to messages"
                >
                  ←
                </button>


                <div className="chat-avatar">

                  {
                    getInitial(
                      selectedFriend
                    )
                  }


                  <span
                    className={
                      selectedFriend?.is_online
                        ? "online-dot active"
                        : "online-dot"
                    }
                  />

                </div>


                <div className="chat-user-info">

                  <h2>
                    {
                      selectedFriend?.name ||
                      selectedFriend?.username ||
                      "Friend"
                    }
                  </h2>


                  <div className="chat-status">

                    {typing ? (

                      <span className="typing-text">
                        typing...
                      </span>

                    ) : selectedFriend?.is_online ? (

                      <span className="online-text">
                        Active now
                      </span>

                    ) : (

                      "Offline"

                    )}

                  </div>

                </div>


                <div className="chat-connection">

                  <span
                    className={
                      connected
                        ? "socket-dot connected"
                        : "socket-dot"
                    }
                  />

                </div>

              </header>


              {/* =========================================
                  CHAT BODY
              ========================================= */}

              <main className="chat-body">


                {chatLoading ? (

                  <div className="chat-loading">

                    <div className="loading-spinner" />

                    Loading conversation...

                  </div>

                ) : messages.length === 0 ? (

                  <div className="conversation-empty">

                    <div className="large-avatar">

                      {
                        getInitial(
                          selectedFriend
                        )
                      }

                    </div>


                    <h3>
                      Start a conversation
                    </h3>


                    <p>
                      Say hello to{" "}
                      <strong>
                        {
                          selectedFriend?.name ||
                          selectedFriend?.username
                        }
                      </strong>
                    </p>

                  </div>

                ) : (

                  <div className="message-list">


                    {messages.map(
                      message => {

                        const myId = Number(currentUserRef.current?.id || getSavedUser()?.id || 0);
                        const mine = Number(message.sender_id) === myId;


                        return (

                          <div
                            key={
                              message.id
                            }
                            className={
                              mine
                                ? "message-row mine"
                                : "message-row"
                            }
                          >

                            <div
                              className={
                                mine
                                  ? "message-bubble mine-bubble"
                                  : "message-bubble"
                              }
                            >

                              <div className="message-content">
                                {renderMessageContent(message.content)}
                              </div>


                              <div className="message-meta">

                                {message.is_edited && !message.is_deleted && (
                                  <span className="edited-tag">(edited)</span>
                                )}

                                <span>

                                  {
                                    formatTime(
                                      message.created_at
                                    )
                                  }

                                </span>


                                {mine && (

                                  <span
                                    className={
                                      message.is_read
                                        ? "read-receipt read"
                                        : "read-receipt"
                                    }
                                  >

                                    {message.optimistic

                                      ? "✓"

                                      : message.is_read

                                      ? "✓✓"

                                      : "✓"}

                                  </span>

                                )}

                              </div>

                            </div>

                          </div>

                        );

                      }
                    )}


                    <div
                      ref={
                        messagesEndRef
                      }
                    />

                  </div>

                )}

              </main>


              {/* =========================================
                  TYPING
              ========================================= */}

              {typing && (

                <div className="typing-indicator">

                  <span />
                  <span />
                  <span />


                  <p>
                    {
                      selectedFriend?.name ||
                      "Friend"
                    }{" "}
                    is typing...
                  </p>

                </div>

              )}


              {/* =========================================
                  INPUT
              ========================================= */}

              <footer className="chat-input-area">


                <div className="chat-input-wrapper">

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*,video/*"
                    onChange={handleMediaSelect}
                    style={{ display: "none" }}
                  />

                  <button
                    type="button"
                    className="media-button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingMedia || sending}
                    title="Attach Image or Video"
                    aria-label="Attach Image or Video"
                  >
                    {uploadingMedia ? "⌛" : "📷"}
                  </button>

                  <button
                    type="button"
                    className="emoji-button"
                    onClick={() =>
                      setText(
                        previous =>
                          `${previous}😊`
                      )
                    }
                    aria-label="Add emoji"
                  >
                    😊
                  </button>


                  <textarea
                    value={text}
                    onChange={
                      handleTyping
                    }
                    onKeyDown={
                      handleKeyDown
                    }
                    placeholder={
                      `Message ${
                        selectedFriend?.name ||
                        "friend"
                      }...`
                    }
                    maxLength={2000}
                    rows={1}
                    disabled={
                      sending
                    }
                    aria-label="Message"
                  />


                  <button
                    type="button"
                    className="send-button"
                    onClick={
                      sendMessage
                    }
                    disabled={
                      !text.trim() ||
                      sending
                    }
                    aria-label="Send message"
                  >

                    {sending ? (

                      <span className="send-spinner" />

                    ) : (

                      "➤"

                    )}

                  </button>

                </div>


                <div className="input-footer">

                  <span>
                    {text.length}/2000
                  </span>


                  <span>
                    Enter to send
                  </span>

                </div>

              </footer>

            </>

          )}

        </section>

      </div>

    </div>

  );

}