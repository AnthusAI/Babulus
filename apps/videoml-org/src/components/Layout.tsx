import * as React from "react";
import { Link } from "gatsby";
import "../styles/global.css";
import "../styles/content.css";

type LayoutProps = {
  children: React.ReactNode;
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <>
      <header className="nav">
        <Link to="/" aria-label="VideoML Home">
          VideoML
        </Link>
        <nav className="nav-links">
          <Link to="/specs">Spec</Link>
          <Link to="/player">Player</Link>
          <Link to="/docs">Docs</Link>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="footer">
        <div className="container">
          <p>
            VideoML is a draft standard for declarative video composition. This
            site is a work in progress.
          </p>
        </div>
      </footer>
    </>
  );
};
