import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LoginScreen from "./pages/LoginScreen";
import ControlComandero from "./pages/ControlComandero";

import "@ant-design/v5-patch-for-react-19";
import { AuthProvider } from "./components/Auth/AuthContext";
// import { ProtectedRoute } from "./components/Auth/ProtectedRoute";
// import PrivateLayout from "./components/PrivateLayout";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* OPCIONAL: deja el login de panel para otras vistas del panel */}
          <Route path="/login" element={<LoginScreen />} />

          {/* Comandero libre de ProtectedRoute — aquí correrá pairing + PIN */}
          <Route path="/control" element={<ControlComandero />} />

          {/* raíz: redirige a comandero */}
          <Route path="/" element={<Navigate to="/control" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
export default App;
