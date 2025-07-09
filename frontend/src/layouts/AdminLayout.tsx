import { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import {
  Menu,
  ChevronDown,
  Home,
  Users,
  CreditCard,
  PiggyBank,
  LogOut,
  BarChart3,
  Settings,
  Bell,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

const AdminLayout = () => {
  const { user, logout, isAdmin, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/member/dashboard" />;

  const sidebarItems = [
    {
      label: "Dashboard",
      icon: <Home size={20} />,
      path: "/admin/dashboard",
    },
    {
      label: "Membres",
      icon: <Users size={20} />,
      path: "/admin/members",
    },
    {
      label: "Cotisations",
      icon: <PiggyBank size={20} />,
      path: "/admin/contributions",
    },
    {
      label: "Crédits",
      icon: <CreditCard size={20} />,
      path: "/admin/loans",
    },
    {
      label: "Rapports",
      icon: <BarChart3 size={20} />,
      path: "/admin/reports",
    },
    {
      label: "Paramètres",
      icon: <Settings size={20} />,
      path: "/admin/settings",
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        closeSidebar={() => setSidebarOpen(false)}
        items={sidebarItems}
        role="Admin"
        onLogout={logout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user}
          openSidebar={() => setSidebarOpen(true)}
          onLogout={logout}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
