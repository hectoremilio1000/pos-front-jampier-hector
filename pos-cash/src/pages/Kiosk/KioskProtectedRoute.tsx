// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-cash/src/pages/Kiosk/KioskProtectedRoute.tsx
import { Navigate } from "react-router-dom";

function isJwtValid() {
  const expStr = sessionStorage.getItem("kiosk_jwt_exp");
  if (!expStr) return false;
  return Number(expStr) - Date.now() > 15_000;
}

export const KioskProtectedRoute = ({
  children,
}: {
  children: JSX.Element;
}) => {
  const hasToken = !!sessionStorage.getItem("kiosk_token");
  const okJwt = isJwtValid();
  if (!hasToken || !okJwt) {
    return <Navigate to="/kiosk-login" replace />;
  }
  return children;
};
