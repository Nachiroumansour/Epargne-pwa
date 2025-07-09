import { Menu, Bell, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { notificationsApi } from "../../api/axiosConfig";
import { formatDistanceToNow } from "date-fns";
import { RealtimeIndicator } from "../shared/RealtimeIndicator";
import { useRealtimeEvents } from "../../hooks/useRealtimeEvents";
import toast from "react-hot-toast";

interface User {
  name: string;
  email: string;
  role: string;
  profile_image?: string;
  fullName?: string;
}

interface Notification {
  _id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface HeaderProps {
  user: User | null;
  openSidebar: () => void;
  onLogout: () => void;
}

const Header = ({ user, openSidebar, onLogout }: HeaderProps) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    setLoadingNotif(true);
    try {
      const res = await notificationsApi.getAll();
      setNotifications(res.data.data.notifications || []);
    } catch (error) {
      console.log("Erreur lors du chargement des notifications:", error);
    } finally {
      setLoadingNotif(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // WebSocket pour le temps réel - notifications automatiques
  useRealtimeEvents({
    onLoanNew: (data) => {
      console.log("🔔 Nouvelle demande de crédit reçue:", data);
      fetchNotifications(); // Recharger les notifications
      toast.success(
        `Nouvelle demande de crédit de ${data.member?.fullName || "un membre"}`
      );
    },
    onLoanApproved: (data) => {
      console.log("🔔 Crédit approuvé:", data);
      fetchNotifications();
      if (user?.role === "member") {
        toast.success("Votre demande de crédit a été approuvée !");
      }
    },
    onLoanRejected: (data) => {
      console.log("🔔 Crédit rejeté:", data);
      fetchNotifications();
      if (user?.role === "member") {
        toast.error("Votre demande de crédit a été rejetée.");
      }
    },
    onContributionCreated: (data) => {
      console.log("🔔 Nouvelle cotisation:", data);
      fetchNotifications();
      if (user?.role === "admin") {
        toast.success(
          `Nouvelle cotisation de ${data.member?.fullName || "un membre"}`
        );
      }
    },
    onMemberCreated: (data) => {
      console.log("🔔 Nouveau membre:", data);
      fetchNotifications();
      if (user?.role === "admin") {
        toast.success(
          `Nouveau membre: ${data.member?.fullName || "membre ajouté"}`
        );
      }
    },
  });

  const handleMarkAsRead = async (notifId: string) => {
    try {
      await notificationsApi.markAsRead(notifId);
      fetchNotifications();
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la notification:", error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        <div className="flex items-center">
          {/* Mobile menu button */}
          <button
            type="button"
            className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 focus:outline-none"
            onClick={openSidebar}
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Page title - can be dynamic based on current route */}
          <h1 className="ml-2 lg:ml-0 text-lg font-semibold text-gray-700">
            Tableau de bord
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          {/* Indicateur temps réel */}
          <RealtimeIndicator />

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              className="p-1 rounded-full text-gray-500 hover:text-gray-600 hover:bg-gray-100 focus:outline-none relative"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
            >
              <Bell className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-10 border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-700">
                    Notifications
                  </p>
                </div>
                <div className="divide-y divide-gray-200 max-h-72 overflow-y-auto">
                  {loadingNotif ? (
                    <div className="px-4 py-6 text-center text-gray-400 text-sm">
                      Chargement...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-gray-400 text-sm">
                      Aucune notification
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif._id}
                        className={`px-4 py-3 cursor-pointer ${
                          !notif.isRead
                            ? "bg-blue-50 hover:bg-blue-100"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() => handleMarkAsRead(notif._id)}
                      >
                        <p className="text-sm font-medium text-gray-800">
                          {notif.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(notif.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <a
                  href="#"
                  className="block text-center text-sm font-medium text-blue-600 bg-gray-50 hover:bg-gray-100 py-2"
                >
                  Voir toutes les notifications
                </a>
              </div>
            )}
          </div>

          {/* User dropdown */}
          <div className="relative inline-block" ref={dropdownRef}>
            <button
              type="button"
              className="flex items-center space-x-2 text-sm focus:outline-none"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium overflow-hidden">
                {user?.profile_image ? (
                  <img
                    src={user.profile_image}
                    alt={user?.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  "A"
                )}
              </div>
              <span className="hidden sm:block font-medium text-gray-700">
                {user?.name}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 py-1 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                </div>
                <a
                  href="/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Mon profil
                </a>
                <a
                  href="/admin/settings"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Paramètres
                </a>
                <div className="border-t border-gray-200"></div>
                <button
                  onClick={onLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                >
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
