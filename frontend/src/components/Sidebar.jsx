import "./Sidebar.css";

export default function Sidebar() {
  return (
    <aside className="sidebar">

      {/* Main navigation */}
      <nav className="sidebar-nav">

        {/* Home */}
        <div className="sidebar-item active">
          <span className="sidebar-icon">
            🏠
          </span>

          <span className="sidebar-text">
            Home
          </span>
        </div>


        {/* Friends */}
        <div className="sidebar-item">
          <span className="sidebar-icon">
            👥
          </span>

          <span className="sidebar-text">
            Friends
          </span>
        </div>


        {/* Messages */}
        <div className="sidebar-item">
          <span className="sidebar-icon">
            💬
          </span>

          <span className="sidebar-text">
            Messages
          </span>
        </div>


        {/* Notifications */}
        <div className="sidebar-item">
          <span className="sidebar-icon">
            🔔
          </span>

          <span className="sidebar-text">
            Notifications
          </span>
        </div>


        {/* Profile */}
        <div className="sidebar-item">
          <span className="sidebar-icon">
            👤
          </span>

          <span className="sidebar-text">
            Profile
          </span>
        </div>

      </nav>


      {/* Bottom section */}
      <div className="sidebar-bottom">

        <div className="sidebar-item">

          <span className="sidebar-icon">
            ⚙️
          </span>

          <span className="sidebar-text">
            Settings
          </span>

        </div>

      </div>

    </aside>
  );
}