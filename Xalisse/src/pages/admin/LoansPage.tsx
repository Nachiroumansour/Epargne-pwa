import { useState, useEffect } from "react";
import { Plus, Eye, Check, X, Clock, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import Card from "../../components/shared/Card";
import { RealtimeIndicator } from "../../components/shared/RealtimeIndicator";
import { useRealtimeEvents } from "../../hooks/useRealtimeEvents";

interface Loan {
  _id: string;
  amount: number;
  duration: number;
  interestRate: number;
  status: string;
  createdAt: string;
  member?: {
    fullName: string;
    _id: string;
  };
}

const LoansPage = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchLoans = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/loans", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      // Extraire le tableau loans de la structure de réponse
      const loansArray = data?.data?.loans || [];
      setLoans(Array.isArray(loansArray) ? loansArray : []);
    } catch (error) {
      console.error("Erreur lors du chargement des crédits:", error);
      setLoans([]); // S'assurer que loans est toujours un tableau
    } finally {
      setLoading(false);
    }
  };

  // Configuration des événements temps réel
  useRealtimeEvents({
    onLoanNew: () => {
      fetchLoans(); // Recharger la liste quand un nouveau crédit arrive
    },
    onLoanApproved: () => {
      fetchLoans(); // Recharger quand un crédit est approuvé
    },
    onLoanRejected: () => {
      fetchLoans(); // Recharger quand un crédit est rejeté
    },
    onLoanRepaid: () => {
      fetchLoans(); // Recharger quand un crédit est remboursé
    },
    onLoanDeleted: () => {
      fetchLoans(); // Recharger quand un crédit est supprimé
    },
  });

  useEffect(() => {
    fetchLoans();
  }, []);

  const handleApprove = async (loanId: string) => {
    try {
      await fetch(`http://localhost:5000/api/loans/${loanId}/approve`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      fetchLoans();
    } catch (error) {
      console.error("Erreur lors de l'approbation:", error);
    }
  };

  const handleReject = async (loanId: string) => {
    try {
      await fetch(`http://localhost:5000/api/loans/${loanId}/reject`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      fetchLoans();
    } catch (error) {
      console.error("Erreur lors du rejet:", error);
    }
  };

  const filteredLoans = loans.filter((loan) => {
    if (filter === "all") return true;
    return loan.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "repaid":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "En attente";
      case "approved":
        return "Approuvé";
      case "rejected":
        return "Rejeté";
      case "repaid":
        return "Remboursé";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestion des Crédits
          </h1>
          <p className="text-gray-600">
            Gérez les demandes de crédit des membres
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <RealtimeIndicator />
          <Link
            to="/admin/loans/create"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Nouveau Crédit</span>
          </Link>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <div className="flex space-x-4">
          {[
            { key: "all", label: "Tous", icon: DollarSign },
            { key: "pending", label: "En attente", icon: Clock },
            { key: "approved", label: "Approuvés", icon: Check },
            { key: "rejected", label: "Rejetés", icon: X },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                filter === key
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Liste des crédits */}
      <div className="grid gap-4">
        {filteredLoans.map((loan) => (
          <Card key={loan._id}>
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <div className="flex items-center space-x-4">
                  <h3 className="font-medium">{loan.member?.fullName}</h3>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      loan.status
                    )}`}
                  >
                    {getStatusText(loan.status)}
                  </span>
                </div>
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <span>Montant: {loan.amount.toLocaleString()} FCFA</span>
                  <span>Durée: {loan.duration} mois</span>
                  <span>Intérêt: {loan.interestRate}%</span>
                </div>
                <p className="text-sm text-gray-600">
                  Demandé le {new Date(loan.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Link
                  to={`/admin/loans/${loan._id}`}
                  className="text-blue-600 hover:text-blue-700 p-2"
                  title="Voir les détails"
                >
                  <Eye size={20} />
                </Link>
                {loan.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleApprove(loan._id)}
                      className="text-green-600 hover:text-green-700 p-2"
                      title="Approuver"
                    >
                      <Check size={20} />
                    </button>
                    <button
                      onClick={() => handleReject(loan._id)}
                      className="text-red-600 hover:text-red-700 p-2"
                      title="Rejeter"
                    >
                      <X size={20} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredLoans.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <DollarSign size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun crédit trouvé
            </h3>
            <p className="text-gray-600">
              {filter === "all"
                ? "Aucune demande de crédit pour le moment."
                : `Aucun crédit avec le statut "${getStatusText(filter)}".`}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default LoansPage;
