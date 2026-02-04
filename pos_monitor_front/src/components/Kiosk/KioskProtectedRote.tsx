import { useEffect, useState, type JSX } from "react";
import { Navigate } from "react-router-dom";
import { verifyKioskToken } from "./kioskVerify";

export const KioskProtectedRoute = ({
  children,
}: {
  children: JSX.Element;
}) => {
  const [status, setStatus] = useState<"checking" | "ok" | "fail">("checking");

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await verifyKioskToken();
      if (!alive) return;

      if (res.ok) {
        setStatus("ok");
      } else {
        // limpiar rastro y caer a login
        sessionStorage.removeItem("kiosk_token");
        sessionStorage.removeItem("kiosk_device_name");
        sessionStorage.removeItem("monitor_station_id");
        sessionStorage.removeItem("monitor_station_code");
        setStatus("fail");
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (status === "checking") {
    // Puedes renderizar un mini loader si quieres
    return <div className="p-6 text-gray-500">Validando dispositivo…</div>;
  }

  if (status === "fail") {
    return <Navigate to="/" replace />;
  }

  return children;
};
