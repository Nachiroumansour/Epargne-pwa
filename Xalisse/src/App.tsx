import { BrowserRouter as Router } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketContext";
import AppRoutes from "./routes/AppRoutes";
import { PWAManager, PWAInstallBanner } from "./components/PWAManager";
import "./index.css";

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          {/* Bannière d'installation PWA */}
          <PWAInstallBanner />

          {/* Notifications toast */}
          <Toaster position="top-right" />

          {/* Routes principales */}
          <AppRoutes />

          {/* Gestionnaire PWA (installation, mises à jour, mode offline) */}
          <PWAManager />
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
