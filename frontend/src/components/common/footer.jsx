import React from "react";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-transparent">
      <div className="mx-auto max-w-7xl px-4 py-4 text-center text-sm text-white/60">
        © {new Date().getFullYear()} Crispydosa. All rights reserved.
      </div>
    </footer>
  );
}
