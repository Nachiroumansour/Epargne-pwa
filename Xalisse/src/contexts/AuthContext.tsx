import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/axiosConfig"; // Utiliser l'instance centralisée
import { toast } from "react-hot-toast";
import { AxiosError } from "axios";

interface User {
  id: string;
  _id: string; // Garder les deux pour la compatibilité
  email: string;
  role: "admin" | "member";
  fullName: string;
  memberId?: string; // ID du membre (pour les utilisateurs de type "member")
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void; // Pas besoin d'être async ici
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // Commence à true par défaut
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const verifyAuth = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      setUser(null);
      return;
    }

    try {
      // Le token est la seule source de vérité. On vérifie sa validité.
      const response = await authApi.getSelf();
      if (response.data.status === "success") {
        const userData = response.data.data.user;
        setUser(userData);
      } else {
        throw new Error("Session invalide");
      }
    } catch (err) {
      console.error("Échec de la vérification de l'authentification", err);
      // Si la vérification échoue, on nettoie tout
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    verifyAuth();
  }, [verifyAuth]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApi.login({ email, password });
      if (response.data.status === "success" && response.data.token) {
        const { token, data } = response.data;
        // On ne stocke QUE le token. Le user sera récupéré par verifyAuth.
        localStorage.setItem("token", token);
        await verifyAuth(); // Re-vérifier pour obtenir les infos utilisateur à jour
        navigate(
          data.user.role === "admin" ? "/admin/dashboard" : "/member/dashboard"
        );
      } else {
        throw new Error(response.data.message || "Erreur de connexion");
      }
    } catch (err) {
      const error = err as AxiosError<{ message: string }> | Error;
      const errorMessage =
        (error as AxiosError<{ message: string }>)?.response?.data?.message ||
        error.message ||
        "Erreur de connexion";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Nettoyage complet et immédiat
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login", { replace: true });
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !loading && !!user, // L'utilisateur est authentifié seulement si le chargement est terminé ET qu'il existe
    isAdmin: !loading && user?.role === "admin",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
