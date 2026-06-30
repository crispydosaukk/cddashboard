// frontend/src/utils/perm.js

// Get permissions array (for normal roles)
export function getPerms() {
  try {
    return JSON.parse(localStorage.getItem("perms") || "[]");
  } catch {
    return [];
  }
}

// New helper: get logged-in user
function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

export function can(required) {
  if (!required) return true;

  const user = getUser();

  // 🔥 SUPER ADMIN BYPASS (role_id === 6 or title includes 'super')
  if (
    user.role_id === 6 ||                       
    user.role === "Super Admin" ||             
    user.role?.title?.toLowerCase() === "super admin"
  ) {
    return true;
  } 

  // normal permissions for other roles
  const perms = getPerms();
  return perms.includes(String(required).toLowerCase());
}
