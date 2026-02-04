// /pos-monitor/src/App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginScreen from "./pages/LoginScreen";

import "@ant-design/v5-patch-for-react-19";

import { ControlMonitor } from "./pages/ControlMonitor";
import { ShiftProvider } from "./context/ShiftContext";
import { KioskProtectedRoute } from "./components/Kiosk/KioskProtectedRote";

function App() {
  return (
    <ShiftProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginScreen />} />
          <Route
            path="/monitor"
            element={
              <KioskProtectedRoute>
                <ControlMonitor />
              </KioskProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </ShiftProvider>
  );
}

export default App;
