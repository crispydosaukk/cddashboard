// frontend/src/components/RequirePerm.jsx
import { Navigate } from "react-router-dom";
import { can, getFirstAllowedRoute } from "../utils/perm";

export default function RequirePerm({ perm, children }) {
  if (!can(perm)) {
    const fallback = getFirstAllowedRoute();
    return <Navigate to={fallback} replace />;
  }
  return children;
}
