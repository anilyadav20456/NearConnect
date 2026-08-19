import LogoutButton from "./LogoutButton";
import "./Navbar.css";

export default function Navbar() {
  return (
    <header className="nc-navbar">

      <div className="nc-navbar-inner">

        {/* LOGO */}
        <div className="nc-brand">

          <div className="nc-brand-mark">
            N
          </div>

          <span className="nc-brand-name">
            NearConnect
          </span>

        </div>


        {/* RIGHT */}
        <div className="nc-navbar-actions">

          <div className="nc-status">

            <span className="nc-status-dot"></span>

            <span>
              Nearby
            </span>

          </div>

          <LogoutButton />

        </div>

      </div>

    </header>
  );
}