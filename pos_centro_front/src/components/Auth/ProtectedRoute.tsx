import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/components/Auth/AuthContext";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div style={{ padding: 24 }}>Cargando…</div>;
  if (!token)
    return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
};
