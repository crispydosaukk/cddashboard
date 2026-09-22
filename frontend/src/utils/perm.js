// frontend/src/utils/perm.js

// Get permissions array (for normal roles)
export function getPerms() {
  try {
    return JSON.parse(localStorage.getItem("perms") || "[]");
  } catch {
    return [];
  }
}

// Get logged-in user
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

// Check if current user is Super Admin
export function isSuperAdmin(user = getUser()) {
  if (!user) return false;
  const roleId = String(user.role_id || "");
  const roleTitle = String(
    user.role_title || 
    user.role?.title || 
    (typeof user.role === "string" ? user.role : "") || 
    ""
  ).toLowerCase();
  const email = String(user.email || "").toLowerCase();

  return (
    roleId === "6" ||
    roleTitle.includes("super") ||
    email === "rahulbadugu22@gmail.com" ||
    email === "sandeep786@gmail.com"
  );
}

export function can(required) {
  if (!required) return true;

  const user = getUser();

  // 🔥 SUPER ADMIN BYPASS: Super Admin can see ALL modules unconditionally!
  if (isSuperAdmin(user)) {
    return true;
  }

  // Normal permissions check for other roles
  const perms = getPerms().map((p) => String(p).toLowerCase().trim());
  const req = String(required).toLowerCase().trim();

  // Exact match
  if (perms.includes(req)) return true;

  return false;
}

// Get first allowed route to prevent redirect loops when dashboard is not assigned to a role
export function getFirstAllowedRoute() {
  const user = getUser();
  if (isSuperAdmin(user)) return "/dashboard";

  const routes = [
    { perm: "dashboard", path: "/dashboard" },
    { perm: "order_management", path: "/orders" },
    { perm: "delivery_orders", path: "/delivery-orders" },
    { perm: "delivery_partners", path: "/delivery-partners" },
    { perm: "category", path: "/category" },
    { perm: "product", path: "/product" },
    { perm: "customer_info", path: "/customerinfo" },
    { perm: "customer_details", path: "/customerdetails" },
    { perm: "restaurant", path: "/restuarent" },
    { perm: "settings", path: "/settings" },
    { perm: "access", path: "/access" },
  ];

  for (const r of routes) {
    if (can(r.perm)) return r.path;
  }
  return "/login";
}
