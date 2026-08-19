import "./MobileBottomNav.css";

export default function MobileBottomNav() {
  return (
    <nav className="mobile-bottom-nav">

      <button className="mobile-nav-item active">
        <span>🏠</span>
        <small>Home</small>
      </button>

      <button className="mobile-nav-item">
        <span>👥</span>
        <small>Friends</small>
      </button>

      <button className="mobile-nav-item">
        <span>💬</span>
        <small>Chat</small>
      </button>

      <button className="mobile-nav-item">
        <span>🔔</span>
        <small>Alerts</small>
      </button>

      <button className="mobile-nav-item">
        <span>👤</span>
        <small>Profile</small>
      </button>

    </nav>
  );
}