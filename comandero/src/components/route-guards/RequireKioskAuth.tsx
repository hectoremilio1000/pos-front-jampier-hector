import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useKioskAuth } from "@/context/KioskAuthProvider";

export default function RequireKioskAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const { hasPair, isJwtValid } = useKioskAuth();
  const location = useLocation();

  if (hasPair && isJwtValid()) return <>{children}</>;
  return <Navigate to="/login" replace state={{ from: location.pathname }} />;
}
