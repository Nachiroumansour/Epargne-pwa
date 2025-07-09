import { useEffect, useState } from "react";
import {
  Users,
  PiggyBank,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  PlusCircle,
} from "lucide-react";
import Card from "../../components/shared/Card";
import StatCard from "../../components/shared/StatCard";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { statisticsApi } from "../../api/axiosConfig";
import { OfflineIndicator } from "../../components/PWAManager";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalSavings: 0,
    activeLoans: 0,
    totalLoansAmount: 0,
    membersGrowth: 0,
    savingsGrowth: 0,
    loansGrowth: 0,
    contributionsByWeek: [] as { date: string; amount: number }[],
    loansByStatus: [] as { status: string; count: number }[],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await statisticsApi.getAdminStats();
        const data = res.data?.data;
        setStats({
          totalMembers: data.members.total,
          totalSavings: data.contributions.amount,
          activeLoans: data.loans.approved + data.loans.disbursed,
          totalLoansAmount: data.loans.amount,
          membersGrowth: 0, // À calculer si tu veux la progression
          savingsGrowth: 0, // Idem
          loansGrowth: 0, // Idem
          contributionsByWeek: (data.trends.monthlyContributions || []).map(
            (item: {
              _id: { month: number; year: number };
              total: number;
            }) => ({
              date: `${item._id.month}/${item._id.year}`,
              amount: item.total,
            })
          ),
          loansByStatus: [
            { status: "En attente", count: data.loans.pending },
            { status: "Approuvé", count: data.loans.approved },
            { status: "Décaissé", count: data.loans.disbursed },
            { status: "Remboursé", count: data.loans.repaid },
            { status: "Défaut", count: data.loans.defaulted },
          ],
        });
        setError(null);
      } catch (error) {
        console.error("Dashboard stats error:", error);
        setError("Erreur lors de la récupération des statistiques");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Format data for chart
  const contributionsData = {
    labels: stats.contributionsByWeek.map((item) => {
      // item.date = "5/2025"
      const [month, year] = item.date.split("/");
      const dateObj = new Date(Number(year), Number(month) - 1, 1);
      return format(dateObj, "MMM yyyy", { locale: fr });
    }),
    datasets: [
      {
        label: "Cotisations (FCFA)",
        data: stats.contributionsByWeek.map((item) => item.amount),
        borderColor: "#3366CC",
        backgroundColor: "rgba(51, 102, 204, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Loan status data for chart
  const loanStatusData = {
    labels: stats.loansByStatus.map((item) => item.status),
    datasets: [
      {
        label: "Nombre de crédits",
        data: stats.loansByStatus.map((item) => item.count),
        backgroundColor: [
          "rgba(76, 175, 80, 0.7)", // En cours (green)
          "rgba(33, 150, 243, 0.7)", // Approuvé (blue)
          "rgba(255, 152, 0, 0.7)", // En attente (orange)
          "rgba(244, 67, 54, 0.7)", // En retard (red)
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900">
          Une erreur est survenue
        </h3>
        <p className="mt-1 text-gray-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Indicateur mode offline */}
      <OfflineIndicator />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <div className="flex space-x-3">
          <Link
            to="/admin/members/create"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Nouveau membre
          </Link>
          <Link
            to="/admin/contributions/create"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Nouvelle cotisation
          </Link>
          <Link
            to="/admin/loans/create"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Nouveau crédit
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Membres Total"
          value={stats.totalMembers}
          icon={<Users size={24} />}
          trend={{
            value: stats.membersGrowth,
            isPositive: stats.membersGrowth > 0,
          }}
          textColor="text-blue-600"
        />
        <StatCard
          title="Épargne Totale"
          value={`${stats.totalSavings.toLocaleString()} FCFA`}
          icon={<PiggyBank size={24} />}
          trend={{
            value: stats.savingsGrowth,
            isPositive: stats.savingsGrowth > 0,
          }}
          textColor="text-green-600"
        />
        <StatCard
          title="Crédits Actifs"
          value={stats.activeLoans}
          icon={<CreditCard size={24} />}
          trend={{
            value: stats.loansGrowth,
            isPositive: stats.loansGrowth > 0,
          }}
          textColor="text-amber-600"
        />
        <StatCard
          title="Montant des Crédits"
          value={`${stats.totalLoansAmount.toLocaleString()} FCFA`}
          icon={<TrendingUp size={24} />}
          textColor="text-purple-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Cotisations des 8 dernières semaines">
          <div className="h-80">
            <Line options={chartOptions} data={contributionsData} />
          </div>
        </Card>

        <Card title="Statut des Crédits">
          <div className="h-80">
            <Bar options={chartOptions} data={loanStatusData} />
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card
        title="Activité Récente"
        action={
          <Link
            to="/admin/contributions"
            className="text-sm font-medium text-blue-600 hover:text-blue-500 flex items-center"
          >
            Voir tout
            <ArrowUpRight className="ml-1 h-4 w-4" />
          </Link>
        }
      >
        <div className="space-y-5">
          <div className="flex items-start">
            <div className="flex-shrink-0 bg-green-100 rounded-full p-2">
              <PiggyBank className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-4">
              <h4 className="text-sm font-medium text-gray-900">
                Cotisation enregistrée
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                Saido Mamadou a cotisé 15,000 FCFA
              </p>
              <p className="text-xs text-gray-400 mt-1">Il y a 2 heures</p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0 bg-blue-100 rounded-full p-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-4">
              <h4 className="text-sm font-medium text-gray-900">
                Crédit approuvé
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                Aminata Diallo a reçu un crédit de 50,000 FCFA
              </p>
              <p className="text-xs text-gray-400 mt-1">Hier à 15:30</p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0 bg-amber-100 rounded-full p-2">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <div className="ml-4">
              <h4 className="text-sm font-medium text-gray-900">
                Nouveau membre
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                Adama Touré a rejoint l'association
              </p>
              <p className="text-xs text-gray-400 mt-1">Il y a 2 jours</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;
