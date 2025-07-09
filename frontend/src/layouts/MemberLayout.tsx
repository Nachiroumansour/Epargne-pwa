import { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { Home, CreditCard, PiggyBank, User, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

const MemberLayout = () => {
  const { user, logout, isAdmin, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return null;
  if (isAdmin) return <Navigate to="/admin/dashboard" />;

  const sidebarItems = [
    {
      label: "Dashboard",
      icon: <Home size={20} />,
      path: "/member/dashboard",
    },
    {
      label: "Mes Cotisations",
      icon: <PiggyBank size={20} />,
      path: "/member/contributions",
    },
    {
      label: "Mes Crédits",
      icon: <CreditCard size={20} />,
      path: "/member/loans",
    },
    {
      label: "Mon Profil",
      icon: <User size={20} />,
      path: "/member/profile",
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        closeSidebar={() => setSidebarOpen(false)}
        items={sidebarItems}
        role="Membre"
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

export default MemberLayout;
