// frontend/src/components/RequirePerm.jsx
import { Navigate } from "react-router-dom";
import { can } from "../utils/perm";

export default function RequirePerm({ perm, children }) {
  if (!can(perm)) return <Navigate to="/dashboard" replace />;
  return children;
}
