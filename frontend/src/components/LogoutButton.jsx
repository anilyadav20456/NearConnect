import { useState } from "react";

const API =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5001"
    : "https://nearconnect-backend-cavd.onrender.com";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    const token = localStorage.getItem(
      "nearconnect_token"
    );

    try {
      setLoading(true);

      if (token) {
        await fetch(
          `${API}/api/auth/logout`,
          {
            method: "POST",

            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

    } finally {

      // Remove JWT
      localStorage.removeItem(
        "nearconnect_token"
      );

      // Remove user information
      localStorage.removeItem(
        "nearconnect_user"
      );

      // Go to login
      window.location.href = "/login";
    }
  };

  return (
    <button
      type="button"
      className="logout-btn"
      onClick={handleLogout}
      disabled={loading}
    >
      {loading
        ? "Logging out..."
        : "Logout"}
    </button>
  );
}