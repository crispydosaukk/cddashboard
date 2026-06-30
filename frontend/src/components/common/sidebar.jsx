import React, { useEffect, useMemo, useCallback, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { can } from "../../utils/perm";
import { usePopup } from "../../context/PopupContext";

/* Sidebar link item */
const Item = ({ to = "#", icon, label }) => (
  <NavLink
    to={to}
    end
    className={({ isActive }) =>
      `
      flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium tracking-wide
      transition-all duration-200 border border-transparent
      ${isActive
        ? "bg-white/25 text-white shadow-lg backdrop-blur-md scale-[1.03]"
        : "text-[#f7c7ce] hover:bg-white/10 hover:text-white"
      }
      `
    }
  >
    <span className="h-5 w-5 text-current">{icon}</span>
    <span className="truncate">{label}</span>
  </NavLink>
);

/* Dropdown (group) */
function Group({ label, icon, children, defaultOpen = false, hidden = false, openProp }) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (typeof openProp === "boolean") setOpen(openProp);
  }, [openProp]);

  if (hidden) return null;

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="
          w-full flex items-center justify-between px-3 py-2.5 rounded-xl
          text-[15px] font-semibold text-[#f7c7ce] hover:bg-white/10
          border border-white/10 backdrop-blur-md transition-all
        "
        aria-expanded={open}
      >
        <span className="flex items-center gap-3 truncate">
          <span className="h-5 w-5 text-current">{icon}</span>
          <span className="truncate">{label}</span>
        </span>
        <svg
          className={`h-4 w-4 text-[#f7c7ce] transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.127l3.71-3.896a.75.75 0 111.08 1.04l-4.24 4.46a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" />
        </svg>
      </button>

      {open && <div className="pl-9 pr-2 py-1 space-y-1 animate-fadeIn">{children}</div>}
    </div>
  );
}

export default function Sidebar({ open, onClose }) {
  const { showPopup } = usePopup();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (open && window.innerWidth < 1024) onClose?.();
  }, [location.pathname]);

  const escHandler = useCallback(
    (e) => {
      if (e.key === "Escape" && open) onClose?.();
    },
    [open, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", escHandler);
    return () => document.removeEventListener("keydown", escHandler);
  }, [escHandler]);

  const rawMenu = useMemo(
    () => [
      { label: "Dashboard", to: "/dashboard", icon: iconDashboard(), perm: "dashboard" },
      { label: "Restaurant Profile", to: "/restuarent", icon: iconRestaurant(), perm: "restaurant" },
      { label: "Customer Info", to: "/customerinfo", icon: iconCustomer(), perm: "customer_info" },
      { label: "Customer Details", to: "/customerdetails", icon: iconCustomerDetails(), perm: "customer_details" },
      { label: "Settings", to: "/settings", icon: iconSettings(), perm: "settings" },
      { label: "Order Management", to: "/orders", icon: iconOrders(), perm: "order_management" },
    ],
    []
  );

  const rawMenuManagementChildren = useMemo(
    () => [
      { label: "Category", to: "/category", icon: iconCategory(), perm: "category" },
      { label: "Product", to: "/product", icon: iconProduct(), perm: "product" },
    ],
    []
  );

  const rawAccessChildren = useMemo(
    () => [
      { label: "Permissions", to: "/access", icon: iconLock(), perm: "access" },
      { label: "Roles", to: "/access/roles", icon: iconUsersCog(), perm: "access" },
      { label: "Users", to: "/access/users", icon: iconUser(), perm: "access" },
    ],
    []
  );

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 160);
    return () => clearTimeout(t);
  }, [query]);

  const visibleMenu = useMemo(() => {
    const q = debouncedQuery;
    return rawMenu.filter((m) => can(m.perm) && (!q || m.label.toLowerCase().includes(q)));
  }, [rawMenu, debouncedQuery]);

  const filteredMenuManagement = useMemo(() => {
    const q = debouncedQuery;
    return rawMenuManagementChildren.filter(
      (c) => can(c.perm) && (!q || c.label.toLowerCase().includes(q))
    );
  }, [rawMenuManagementChildren, debouncedQuery]);

  const filteredAccessChildren = useMemo(() => {
    const q = debouncedQuery;
    return rawAccessChildren.filter(
      (c) => can(c.perm) && (!q || c.label.toLowerCase().includes(q))
    );
  }, [rawAccessChildren, debouncedQuery]);

  const showAccessGroup =
    filteredAccessChildren.length > 0 || location.pathname.startsWith("/access");

  const [user] = useState(() => {
    try {
      const u = localStorage.getItem("user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  return (
    <>
      <style>{`
        .animate-fadeIn { animation: fadeIn 240ms ease both; }
        @keyframes fadeIn { from { opacity:0; transform: translateY(-6px) } to { opacity:1; transform: translateY(0) } }
        .sidebar-scroll::-webkit-scrollbar { width: 6px; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.25); border-radius: 999px; }
      `}</style>

      <div
        onClick={onClose}
        className={`fixed inset-0 top-0 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity ${open ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
      />

      <aside
        className={`
          fixed left-0 bottom-0 z-[60] lg:z-40 w-72
          bg-gradient-to-br from-[#1A4D3A] to-[#8B1538]
          shadow-2xl
          transform transition-all duration-300 ease-in-out
          top-0 lg:top-16
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Mobile Sidebar Header (Logo + Close) */}
        <div className="flex lg:hidden items-center justify-between px-4 pb-4 pt-14 border-b border-white/15">
          <div className="flex items-center gap-2">
            <img src="/Crispy-Dosalogo.png" alt="Logo" className="h-16 w-auto object-contain" />
          </div>
          <button onClick={onClose} className="p-2 text-white/70 hover:text-white bg-white/10 rounded-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-white/15">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="
              w-full text-sm rounded-xl px-4 py-2.5
              bg-white/15 backdrop-blur-md
              border border-white/20
              text-[#f7c7ce] placeholder:text-white/60
              focus:outline-none
            "
          />
        </div>

        <nav className="p-4 space-y-3 overflow-y-auto h-[calc(100%-220px)] sidebar-scroll">
          {visibleMenu.map((m) => (
            <Item key={m.label} to={m.to} label={m.label} icon={m.icon} />
          ))}

          <Group
            label="Menu Management"
            icon={iconCategory()}
            hidden={filteredMenuManagement.length === 0}
            openProp={location.pathname.startsWith("/category") || location.pathname.startsWith("/product")}
          >
            {filteredMenuManagement.map((m) => (
              <Item key={m.label} to={m.to} label={m.label} icon={m.icon} />
            ))}
          </Group>

          <Group
            label="Access Control"
            icon={iconShield()}
            hidden={!showAccessGroup}
            openProp={location.pathname.startsWith("/access")}
          >
            {filteredAccessChildren.map((m) => (
              <Item key={m.label} to={m.to} label={m.label} icon={m.icon} />
            ))}
          </Group>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/15 bg-white/10 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-11 w-11 rounded-full bg-white/25 flex items-center justify-center text-[#f7c7ce] font-semibold">
              {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{user?.name || "Admin"}</div>
              <div className="text-xs text-white/70">{user?.email || "admin@crispy.dosa"}</div>
            </div>
          </div>

          <button
            onClick={() => {
              showPopup({
                title: "Confirm Logout",
                message: "Are you sure you want to log out?",
                type: "confirm",
                onConfirm: () => {
                  localStorage.clear();
                  navigate("/login", { replace: true });
                }
              });
            }}
            className="w-full bg-white/25 hover:bg-white/35 text-white py-2 rounded-xl font-semibold transition"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

/* icons unchanged */
function iconDashboard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path d="M3 12h8V4H3v8zm10 8h8v-6h-8v6zM3 20h8v-6H3v6zm10-8h8V4h-8v8z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function iconRestaurant() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path d="M6 3v9a2 2 0 0 0 4 0V3M6 8h4M14 3h2a3 3 0 0 1 3 3v15h-3v-7h-2V3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function iconCategory() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path d="M3 9h6V3H3v6zm12 0h6V3h-6v6zM3 21h6v-6H3v6zm12 0h6v-6h-6v6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function iconProduct() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path d="M4 7l8-4 8 4v10l-8 4-8-4V7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function iconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function iconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path d="M7 10V7a5 5 0 0 1 10 0v3M6 10h12v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-9z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function iconUsersCog() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path d="M12 14a5 5 0 0 0-9 3v3M21 20v-1a4 4 0 0 0-6.5-3.1M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 7.5l1 .6-1 1.7h-2l-1-1.7 1-.6V6h2v1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function iconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
      <path d="M16 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM4 20a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function iconLogout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
      <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 19H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function iconCustomer() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path
        d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zM3 21a9 9 0 0 1 18 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function iconOrders() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path
        d="M4 6h16v12H4z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 10h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 14h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function iconSettings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path
        d="M12 4.5l1.2 1.8a1 1 0 0 0 .8.4h2.1a1 1 0 0 1 .98 1.2l-.3 1.4a1 1 0 0 0 .26.9l1.5 1.5a1 1 0 0 1 0 1.4l-1.5 1.5a1 1 0 0 0-.26.9l.3 1.4a1 1 0 0 1-.98 1.2H14a1 1 0 0 0-.8.4L12 19.5a1 1 0 0 1-1.64 0L9.2 17.7a1 1 0 0 0-.8-.4H6.3a1 1 0 0 1-.98-1.2l.3-1.4a1 1 0 0 0-.26-.9L3.9 12a1 1 0 0 1 0-1.4l1.46-1.46a1 1 0 0 0 .26-.9l-.3-1.4A1 1 0 0 1 6.3 6.7h2.1a1 1 0 0 0 .8-.4L10.36 4.5a1 1 0 0 1 1.64 0z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function iconCustomerDetails() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path
        d="M17 20h5v-2a3 3 0 0 0-5.3-1.5M16 3.13a4 4 0 0 1 0 7.75M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zM3 21a9 9 0 0 1 18 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
