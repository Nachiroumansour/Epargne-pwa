import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useRealtimeEvents } from "../../hooks/useRealtimeEvents";
import {
  CreditCard,
  Calendar,
  CircleDollarSign,
  AlertCircle,
  PlusCircle,
  X,
  TrendingUp,
  TrendingDown,
  CheckCircle,
} from "lucide-react";
import Card from "../../components/shared/Card";
import Table from "../../components/shared/Table";
import { loansApi } from "../../api/axiosConfig";
import { format } from "date-fns";
import toast from "react-hot-toast";

import { RealtimeIndicator } from "../../components/shared/RealtimeIndicator";

interface Loan {
  _id: string;
  amount: number;
  purpose: string;
  applicationDate: string;
  term: number;
  remainingBalance: number;
  effectiveStatus:
    | "pending"
    | "approved"
    | "disbursed"
    | "repaid"
    | "rejected"
    | "defaulted";
  status?: string;
}

const MemberLoansPage = () => {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: "", term: "", purpose: "" });
  const [formLoading, setFormLoading] = useState(false);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const response = await loansApi.getMyLoans();
      setLoans(response.data.data?.loans || []);
    } catch (error) {
      console.error("Error fetching loans:", error);
      toast.error("Erreur lors de la récupération des crédits.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  // WebSocket pour temps réel
  const { isConnected, lastUpdate } = useRealtimeEvents({
    onLoanNew: fetchLoans,
    onLoanApproved: fetchLoans,
    onLoanRepaid: fetchLoans,
    onLoanRejected: fetchLoans,
    onLoanDeleted: fetchLoans,
  });

  // Calculs basés sur les données fiables du backend
  const stats = useMemo(() => {
    const totalOutstanding = loans
      .filter((l) => {
        const status = l.effectiveStatus || l.status;
        return ["approved", "disbursed"].includes(status);
      })
      .reduce((sum, loan) => sum + loan.remainingBalance, 0);

    const activeLoansCount = loans.filter((l) => {
      const status = l.effectiveStatus || l.status;
      return ["approved", "disbursed"].includes(status);
    }).length;

    const repaidLoansCount = loans.filter(
      (l) => (l.effectiveStatus || l.status) === "repaid"
    ).length;

    return { totalOutstanding, activeLoansCount, repaidLoansCount };
  }, [loans]);

  const columns = useMemo(
    () => [
      {
        header: "Date de demande",
        accessor: (loan: Loan) => {
          if (!loan.applicationDate) {
            return <span>N/A</span>;
          }
          try {
            return (
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                <span>
                  {format(new Date(loan.applicationDate), "dd/MM/yyyy")}
                </span>
              </div>
            );
          } catch (e) {
            return <span>Date invalide</span>;
          }
        },
      },
      {
        header: "Montant",
        accessor: (loan: Loan) => (
          <span className="font-medium">
            {loan.amount.toLocaleString()} FCFA
          </span>
        ),
      },
      {
        header: "Reste à payer",
        accessor: (loan: Loan) => (
          <span
            className={`font-medium ${
              loan.remainingBalance > 0 ? "text-amber-600" : "text-green-600"
            }`}
          >
            {loan.remainingBalance.toLocaleString()} FCFA
          </span>
        ),
      },
      {
        header: "Durée",
        accessor: (loan: Loan) => <span>{loan.term} mois</span>,
      },
      {
        header: "Statut",
        accessor: (loan: Loan) => {
          const statusConfig = {
            pending: {
              color: "bg-yellow-100 text-yellow-800",
              text: "En attente",
            },
            approved: { color: "bg-blue-100 text-blue-800", text: "Approuvé" },
            disbursed: {
              color: "bg-green-100 text-green-800",
              text: "Décaissé",
            },
            repaid: {
              color: "bg-purple-100 text-purple-800",
              text: "Remboursé",
            },
            rejected: { color: "bg-red-100 text-red-800", text: "Rejeté" },
            defaulted: {
              color: "bg-orange-100 text-orange-800",
              text: "En défaut",
            },
          };
          const status = loan.effectiveStatus || loan.status;
          const config = statusConfig[status] || {
            color: "bg-gray-100 text-gray-800",
            text: status,
          };

          return (
            <span
              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${config.color}`}
            >
              {config.text}
            </span>
          );
        },
      },
    ],
    []
  );

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await loansApi.create({
        // Le backend utilise req.user, pas besoin de memberId ici
        amount: Number(form.amount),
        term: Number(form.term),
        purpose: form.purpose,
      });
      setShowForm(false);
      setForm({ amount: "", term: "", purpose: "" });
      toast.success("Demande de crédit envoyée !");
      fetchLoans(); // Re-fetch loans to update the list
    } catch (error) {
      console.error("Loan creation error", error);
      toast.error("Erreur lors de la demande de crédit.");
    } finally {
      setFormLoading(false);
    }
  };

  if (loading && loans.length === 0) {
    return <div>Chargement des crédits...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes Crédits</h1>
          <p className="mt-1 text-gray-500">
            Historique et statut de vos crédits
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <RealtimeIndicator />
        </div>
        <button
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          onClick={() => setShowForm(true)}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Demander un crédit
        </button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold">Demande de crédit</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-red-600"
              >
                <X />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Montant</label>
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleFormChange}
                required
                className="w-full px-3 py-2 border rounded-md"
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Durée (mois)
              </label>
              <input
                type="number"
                name="term"
                value={form.term}
                onChange={handleFormChange}
                required
                className="w-full px-3 py-2 border rounded-md"
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Motif</label>
              <input
                type="text"
                name="purpose"
                value={form.purpose}
                onChange={handleFormChange}
                required
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={formLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60"
              >
                {formLoading ? "Envoi..." : "Envoyer la demande"}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Stats Card */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between">
          <div className="flex items-center mb-4 sm:mb-0">
            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mr-4">
              <CircleDollarSign />
            </div>
            <div>
              <p className="text-gray-500">Montant à rembourser</p>
              <p className="text-2xl font-bold">
                {stats.totalOutstanding.toLocaleString()} FCFA
              </p>
            </div>
          </div>
          <div className="flex space-x-6">
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
              <div>
                <p className="text-gray-500">Crédits actifs</p>
                <p className="font-bold">{stats.activeLoansCount}</p>
              </div>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-purple-500 mr-2" />
              <div>
                <p className="text-gray-500">Crédits remboursés</p>
                <p className="font-bold">{stats.repaidLoansCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loans.length > 0 ? (
        <Card>
          <Table
            columns={columns}
            data={loans}
            keyExtractor={(loan) => loan._id}
          />
        </Card>
      ) : (
        !loading && (
          <Card>
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Aucun crédit trouvé
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Vous n'avez pas encore de crédit. Faites une demande pour
                commencer.
              </p>
            </div>
          </Card>
        )
      )}
    </div>
  );
};

export default MemberLoansPage;
