import { Navigate } from "react-router-dom";

function isKioskJwtValid(): boolean {
  const expStr = sessionStorage.getItem("kiosk_jwt_exp");
  if (!expStr) return false;
  return Number(expStr) - Date.now() > 15_000;
}

export const KioskProtectedRoute = ({
  children,
}: {
  children: JSX.Element;
}) => {
  const jwt = sessionStorage.getItem("kiosk_jwt");
  if (!jwt || !isKioskJwtValid()) return <Navigate to="/kiosk-login" replace />;
  return children;
};
