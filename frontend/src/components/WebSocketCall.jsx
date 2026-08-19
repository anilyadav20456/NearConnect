import { useEffect, useState } from "react";

export default function WebSocketCall({ socket }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const handleText = (e) => {
    setMessage(e.target.value);
  };

  const handleSubmit = () => {
    if (!message.trim()) {
      return;
    }

    socket.emit("data", message);
    setMessage("");
  };

  const clearChat = () => {
    socket.emit("data", "clear");
    setMessage("");
  };

  useEffect(() => {
    const receiveMessage = (data) => {
      console.log("Message received:", data);

      if (data.data === "clear") {
        setMessages([]);
      } else {
        setMessages((previousMessages) => [
          ...previousMessages,
          data.data,
        ]);
      }
    };

    socket.on("data", receiveMessage);

    return () => {
      socket.off("data", receiveMessage);
    };
  }, [socket]);

  return (
    <div>
      <h2>WebSocket Communication</h2>

      <button onClick={clearChat}>
        clear chat
      </button>

      <input
        type="text"
        value={message}
        onChange={handleText}
        placeholder="Type a message..."
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSubmit();
          }
        }}
      />

      <button onClick={handleSubmit}>
        send
      </button>

      <ul>
        {messages.map((message, ind) => (
          <li key={ind}>{message}</li>
        ))}
      </ul>
    </div>
  );
}