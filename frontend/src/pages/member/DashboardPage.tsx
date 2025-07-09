import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { PiggyBank, CreditCard, Calendar, TrendingUp } from "lucide-react";
import Card from "../../components/shared/Card";
import StatCard from "../../components/shared/StatCard";
import { Line } from "react-chartjs-2";
import { statisticsApi } from "../../api/axiosConfig";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useRealtimeEvents } from "../../hooks/useRealtimeEvents";
import { RealtimeIndicator } from "../../components/shared/RealtimeIndicator";

const MemberDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const memberId = user?.memberId || user?.id;
      if (memberId) {
        const response = await statisticsApi.getMemberStats(memberId);
        setStats(response.data.data);
        console.log("📊 Statistiques mises à jour:", response.data.data);
      }
    } catch (error) {
      console.error("Error fetching member statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  // 🔥 WebSocket pour temps réel - mise à jour automatique !
  const { isConnected, lastUpdate } = useRealtimeEvents({
    onMyContributionCreated: (data) => {
      console.log("🎯 Dashboard reçoit contribution:", data);
      fetchStats(); // Recharger les statistiques
    },
    onMyContributionsBulkCreated: () => {
      fetchStats(); // Recharger les statistiques
    },
  });

  if (loading || !stats) return <div>Chargement...</div>;

  // Préparation des données pour le graphique
  const chartData = {
    labels: (stats.trends?.monthlyContributions || []).map(
      (item) => `${item._id.month}/${item._id.year}`
    ),
    datasets: [
      {
        label: "Cotisations Mensuelles (FCFA)",
        data: (stats.trends?.monthlyContributions || []).map(
          (item) => item.total
        ),
        borderColor: "#3366CC",
        backgroundColor: "rgba(51, 102, 204, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Calcul de la prochaine échéance
  let nextDueDate = "Aucune";
  if (stats.loans && stats.loans.active > 0 && stats.loans.nextDueDate) {
    nextDueDate = new Date(stats.loans.nextDueDate).toLocaleDateString();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="mt-1 text-gray-500">
            Bienvenue, {user?.name}. Voici un aperçu de votre compte.
          </p>
        </div>
        <RealtimeIndicator />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Épargne Totale"
          value={`${stats.contributions.amount?.toLocaleString() || 0} FCFA`}
        />
        <StatCard title="Crédits Actifs" value={stats.loans.active || 0} />
        <StatCard
          title="Montant à Rembourser"
          value={`${
            (stats.loans.amount - stats.loans.repayments)?.toLocaleString() || 0
          } FCFA`}
        />
        <StatCard title="Prochaine Échéance" value={nextDueDate} />
      </div>

      {/* Savings Chart */}
      <Card title="Évolution de vos cotisations">
        <div className="h-80">
          <Line
            data={chartData}
            options={{ responsive: true, maintainAspectRatio: false }}
          />
        </div>
      </Card>

      {/* Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Dernières activités">
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-green-100 rounded-full p-2">
                <PiggyBank className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-gray-900">
                  Cotisation enregistrée
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  15,000 FCFA - Cotisation hebdomadaire
                </p>
                <p className="text-xs text-gray-400 mt-1">Il y a 3 jours</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 bg-blue-100 rounded-full p-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-gray-900">
                  Remboursement de crédit
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  25,000 FCFA - Versement mensuel
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  La semaine dernière
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 bg-amber-100 rounded-full p-2">
                <CreditCard className="h-5 w-5 text-amber-600" />
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-gray-900">
                  Crédit approuvé
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  200,000 FCFA - Projet commercial
                </p>
                <p className="text-xs text-gray-400 mt-1">Il y a 2 semaines</p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Prochaines échéances">
          <div className="space-y-4">
            <div className="border-l-4 border-amber-400 pl-4 py-2">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    Remboursement crédit
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">30,000 FCFA</p>
                </div>
                <span className="text-sm font-medium text-amber-600">
                  Dans 5 jours
                </span>
              </div>
            </div>

            <div className="border-l-4 border-green-400 pl-4 py-2">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    Cotisation hebdomadaire
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">15,000 FCFA</p>
                </div>
                <span className="text-sm font-medium text-green-600">
                  Dans 2 jours
                </span>
              </div>
            </div>

            <div className="border-l-4 border-blue-400 pl-4 py-2">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    Réunion mensuelle
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Planification des activités
                  </p>
                </div>
                <span className="text-sm font-medium text-blue-600">
                  Dans 2 semaines
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MemberDashboard;
