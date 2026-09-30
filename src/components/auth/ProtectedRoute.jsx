import { Navigate, Outlet } from "react-router-dom";

/** Everything behind sign-in. Signed out, the entry page is the only place to be. */
function ProtectedRoute({ isAllowed, children }) {
  if (!isAllowed) {
    return <Navigate to="/" replace />;
  }

  return children || <Outlet />;
}

export default ProtectedRoute;
