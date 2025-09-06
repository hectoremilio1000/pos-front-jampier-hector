import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, loading } = useAuth();
  if (loading) return <div>Cargando...</div>;
  if (!token) return <Navigate to="/" />;
  return children;
};
