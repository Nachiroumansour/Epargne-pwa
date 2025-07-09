import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";

const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  emit: (event: string, data?: any) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (!user) {
      // Déconnecter si pas d'utilisateur
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Debug: vérifier les valeurs de user
    console.log('🔍 User dans SocketContext:', user);
    console.log('🔍 user.memberId:', user.memberId);
    console.log('🔍 user.id:', user.id);
    console.log('🔍 user._id:', user._id);
    console.log('🔍 user.role:', user.role);

    // Créer une nouvelle connexion socket
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth: {
        userId: user.id || user._id,
        role: user.role,
        memberId: user.memberId, // Utiliser directement user.memberId
      },
    });

    // Debug: vérifier l'objet auth envoyé
    console.log('📤 Auth envoyé au WebSocket:', {
      userId: user.id || user._id,
      role: user.role,
      memberId: user.memberId,
    });

    // Événements de connexion
    newSocket.on("connect", () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
      console.log("✅ WebSocket connecté");
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
      console.log("❌ WebSocket déconnecté");
    });

    newSocket.on("reconnect", () => {
      setIsConnected(true);
      toast.success("Connexion temps réel rétablie");
    });

    newSocket.on("reconnect_error", () => {
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        console.log(
          `Tentative de reconnexion ${reconnectAttempts.current}/${maxReconnectAttempts}`
        );
      } else {
        toast.error(
          "Connexion temps réel impossible. Veuillez rafraîchir la page."
        );
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.removeAllListeners();
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [user?.id, user?._id, user?.role, user?.memberId]); // Ajouter user?.memberId dans les dépendances

  const emit = (event: string, data?: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, emit }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
