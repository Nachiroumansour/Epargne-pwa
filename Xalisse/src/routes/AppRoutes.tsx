import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Loader } from "lucide-react";

// Layouts
import AuthLayout from "../layouts/AuthLayout";
import AdminLayout from "../layouts/AdminLayout";
import MemberLayout from "../layouts/MemberLayout";

// Auth Pages
import LoginPage from "../pages/auth/LoginPage";

// Admin Pages
import AdminDashboard from "../pages/admin/DashboardPage";
import MembersList from "../pages/admin/MembersListPage";
import MemberDetail from "../pages/admin/MemberDetailPage";
import CreateMember from "../pages/admin/CreateMemberPage";
import ContributionsPage from "../pages/admin/ContributionsPage";
import LoansPage from "../pages/admin/LoansPage";
import LoanDetailPage from "../pages/admin/LoanDetailPage";
import CreateContribution from "../pages/admin/CreateContributionPage";
import CreateLoan from "../pages/admin/CreateLoanPage";
import EditMemberPage from "../pages/admin/EditMemberPage";
import ReportsPage from "../pages/admin/ReportsPage";
import SettingsPage from "../pages/admin/SettingsPage";

// Member Pages
import MemberDashboard from "../pages/member/DashboardPage";
import MemberContributions from "../pages/member/ContributionsPage";
import MemberLoansPage from "../pages/member/LoansPage";
import MemberProfile from "../pages/member/ProfilePage";

// --- Garde de Route Unique et Intelligent ---
const PrivateRoute = ({
  requiredRole,
}: {
  requiredRole: "admin" | "member";
}) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // La logique de redirection est simplifiée.
  // Si le rôle de l'utilisateur ne correspond pas au rôle requis pour la route,
  // on le redirige simplement vers la page de connexion, ce qui force une redirection
  // vers son tableau de bord par défaut. C'est plus simple et plus sûr.
  if (user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />; // Si tout est bon, on affiche la page demandée
};

// --- Structure des Routes Simplifiée ---
const AppRoutes = () => {
  const { isAuthenticated, user, loading } = useAuth();

  // Pendant que l'on vérifie l'authentification, on affiche un loader global
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Route de connexion */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />}
        />
      </Route>

      {/* Routes Admin Protégées */}
      <Route element={<PrivateRoute requiredRole="admin" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="members" element={<MembersList />} />
          <Route path="members/create" element={<CreateMember />} />
          <Route path="members/:id" element={<MemberDetail />} />
          <Route path="members/:id/edit" element={<EditMemberPage />} />
          <Route path="contributions" element={<ContributionsPage />} />
          <Route path="contributions/create" element={<CreateContribution />} />
          <Route path="loans" element={<LoansPage />} />
          <Route path="loans/:id" element={<LoanDetailPage />} />
          <Route path="loans/create" element={<CreateLoan />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Routes Membre Protégées */}
      <Route element={<PrivateRoute requiredRole="member" />}>
        <Route path="/member" element={<MemberLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<MemberDashboard />} />
          <Route path="contributions" element={<MemberContributions />} />
          <Route path="loans" element={<MemberLoansPage />} />
          <Route path="profile" element={<MemberProfile />} />
        </Route>
      </Route>

      {/* Redirection depuis la racine */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate
              to={user?.role === "admin" ? "/admin" : "/member"}
              replace
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Page non trouvée */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default AppRoutes;
