"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" className="header-logo">
          <span className="header-logo-icon">⚡</span>
          FlashForge
        </Link>
        <nav className="header-nav">
          <Link href="/" className="header-nav-link">
            📚 My Decks
          </Link>
        </nav>
      </div>
    </header>
  );
}
