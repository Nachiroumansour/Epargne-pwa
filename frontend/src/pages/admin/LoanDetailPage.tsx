import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  User,
  Calendar,
  DollarSign,
  Clock,
  Plus,
  Receipt,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { loansApi, membersApi } from "../../api/axiosConfig";
import Card from "../../components/shared/Card";
import Table from "../../components/shared/Table";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { useRealtimeEvents } from "../../hooks/useRealtimeEvents";

interface Loan {
  _id: string;
  amount: number;
  term: number;
  interestRate: number;
  status: string;
  purpose: string;
  applicationDate: string;
  approvalDate?: string;
  disbursementDate?: string;
  dueDate?: string;
  repayments: Array<{
    _id: string;
    amount: number;
    date: string;
    paymentMethod: string;
    receiptNumber?: string;
    notes?: string;
  }>;
  member?: {
    _id: string;
    fullName: string;
    email: string;
  };
  totalRepaid: number;
  remainingBalance: number;
}

const LoanDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRepaymentForm, setShowRepaymentForm] = useState(false);
  const [repaymentForm, setRepaymentForm] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "cash",
    receiptNumber: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchLoan = async () => {
    try {
      setLoading(true);
      const response = await loansApi.getById(id);
      setLoan(response.data.data?.loan || response.data);
    } catch (error) {
      console.error("Erreur lors du chargement du crédit:", error);
      toast.error("Impossible de charger les détails du crédit");
      navigate("/admin/loans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchLoan();
    }
  }, [id]);

  // WebSocket pour temps réel
  useRealtimeEvents({
    onLoanRepaid: fetchLoan,
    onLoanApproved: fetchLoan,
    onLoanRejected: fetchLoan,
    onLoanDeleted: () => {
      toast.info("Ce crédit a été supprimé");
      navigate("/admin/loans");
    },
  });

  const handleRepaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loan || submitting) return;

    setSubmitting(true);
    try {
      await loansApi.addRepayment(loan._id, repaymentForm);

      toast.success("Remboursement ajouté avec succès");
      setShowRepaymentForm(false);
      setRepaymentForm({
        amount: "",
        date: new Date().toISOString().split("T")[0],
        paymentMethod: "cash",
        receiptNumber: "",
        notes: "",
      });
      fetchLoan(); // Recharger les données
    } catch (error) {
      console.error("Erreur lors de l'ajout du remboursement:", error);
      toast.error("Erreur lors de l'ajout du remboursement");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "disbursed":
        return "bg-green-100 text-green-800";
      case "repaid":
        return "bg-purple-100 text-purple-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "defaulted":
        return "bg-orange-100 text-orange-800";
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
      case "disbursed":
        return "Décaissé";
      case "repaid":
        return "Remboursé";
      case "rejected":
        return "Rejeté";
      case "defaulted":
        return "En défaut";
      default:
        return status;
    }
  };

  const repaymentColumns = [
    {
      header: "Date",
      accessor: (repayment: any) => (
        <div className="flex items-center">
          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
          <span>{format(new Date(repayment.date), "dd/MM/yyyy")}</span>
        </div>
      ),
    },
    {
      header: "Montant",
      accessor: (repayment: any) => (
        <span className="font-medium text-green-600">
          {repayment.amount?.toLocaleString()} FCFA
        </span>
      ),
    },
    {
      header: "Méthode",
      accessor: (repayment: any) => (
        <span className="capitalize">{repayment.paymentMethod}</span>
      ),
    },
    {
      header: "Reçu",
      accessor: (repayment: any) => repayment.receiptNumber || "-",
    },
    {
      header: "Notes",
      accessor: (repayment: any) => repayment.notes || "-",
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!loan) {
    return (
      <Card>
        <div className="text-center py-8">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Crédit introuvable
          </h3>
          <Link to="/admin/loans" className="text-blue-600 hover:text-blue-700">
            Retourner à la liste des crédits
          </Link>
        </div>
      </Card>
    );
  }

  const interestAmount = (loan.amount * loan.interestRate) / 100;
  const totalDue = loan.amount + interestAmount;
  const progressPercentage = ((loan.totalRepaid || 0) / totalDue) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/admin/loans")}
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Détails du crédit
            </h1>
            <p className="text-gray-500">
              {loan.member?.fullName} - {loan.purpose}
            </p>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
            loan.status
          )}`}
        >
          {getStatusText(loan.status)}
        </span>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Montant emprunté</p>
              <p className="text-lg font-semibold">
                {loan.amount.toLocaleString()} FCFA
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Remboursé</p>
              <p className="text-lg font-semibold">
                {(loan.totalRepaid || 0).toLocaleString()} FCFA
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Reste à payer</p>
              <p className="text-lg font-semibold">
                {(
                  loan.remainingBalance || totalDue - (loan.totalRepaid || 0)
                ).toLocaleString()}{" "}
                FCFA
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Receipt className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">
                Intérêts ({loan.interestRate}%)
              </p>
              <p className="text-lg font-semibold">
                {interestAmount.toLocaleString()} FCFA
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">
              Progression du remboursement
            </h3>
            <span className="text-sm text-gray-500">
              {progressPercentage.toFixed(1)}% remboursé
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>0 FCFA</span>
            <span>{totalDue.toLocaleString()} FCFA</span>
          </div>
        </div>
      </Card>

      {/* Interest to Savings Info */}
      <Card>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                💰 Système d'épargne automatique des intérêts
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  <strong>Avantage membre :</strong> Tous les intérêts payés
                  lors des remboursements sont automatiquement convertis en
                  cotisations d'épargne pour le membre.
                </p>
                <p className="mt-1">
                  Par exemple, si ce membre rembourse{" "}
                  {interestAmount.toLocaleString()} FCFA d'intérêts, cette somme
                  sera ajoutée à son épargne totale.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Loan Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Informations du crédit">
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-500">Demandeur:</span>
              <span className="font-medium">{loan.member?.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email:</span>
              <span>{loan.member?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Durée:</span>
              <span>{loan.term} mois</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Taux d'intérêt:</span>
              <span>{loan.interestRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date de demande:</span>
              <span>
                {format(new Date(loan.applicationDate), "dd/MM/yyyy")}
              </span>
            </div>
            {loan.approvalDate && (
              <div className="flex justify-between">
                <span className="text-gray-500">Date d'approbation:</span>
                <span>{format(new Date(loan.approvalDate), "dd/MM/yyyy")}</span>
              </div>
            )}
            {loan.dueDate && (
              <div className="flex justify-between">
                <span className="text-gray-500">Date d'échéance:</span>
                <span>{format(new Date(loan.dueDate), "dd/MM/yyyy")}</span>
              </div>
            )}
          </div>
        </Card>

        <Card title="Résumé financier">
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-500">Capital:</span>
              <span className="font-medium">
                {loan.amount.toLocaleString()} FCFA
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Intérêts:</span>
              <span className="font-medium">
                {interestAmount.toLocaleString()} FCFA
              </span>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Total à rembourser:</span>
                <span className="font-bold">
                  {totalDue.toLocaleString()} FCFA
                </span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Déjà remboursé:</span>
              <span className="font-medium text-green-600">
                {(loan.totalRepaid || 0).toLocaleString()} FCFA
              </span>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Reste à payer:</span>
                <span className="font-bold text-orange-600">
                  {(totalDue - (loan.totalRepaid || 0)).toLocaleString()} FCFA
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Repayments Section */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Historique des remboursements</h3>
          {loan.status !== "repaid" && loan.status !== "rejected" && (
            <button
              onClick={() => setShowRepaymentForm(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un remboursement
            </button>
          )}
        </div>

        {showRepaymentForm && (
          <Card>
            <form onSubmit={handleRepaymentSubmit} className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-medium">Nouveau remboursement</h4>
                <button
                  type="button"
                  onClick={() => setShowRepaymentForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Montant *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={repaymentForm.amount}
                    onChange={(e) =>
                      setRepaymentForm({
                        ...repaymentForm,
                        amount: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Montant en FCFA"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={repaymentForm.date}
                    onChange={(e) =>
                      setRepaymentForm({
                        ...repaymentForm,
                        date: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Méthode de paiement
                  </label>
                  <select
                    value={repaymentForm.paymentMethod}
                    onChange={(e) =>
                      setRepaymentForm({
                        ...repaymentForm,
                        paymentMethod: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="cash">Espèces</option>
                    <option value="transfer">Virement</option>
                    <option value="check">Chèque</option>
                    <option value="mobile">Mobile Money</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Numéro de reçu
                  </label>
                  <input
                    type="text"
                    value={repaymentForm.receiptNumber}
                    onChange={(e) =>
                      setRepaymentForm({
                        ...repaymentForm,
                        receiptNumber: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Numéro de reçu (optionnel)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={repaymentForm.notes}
                  onChange={(e) =>
                    setRepaymentForm({
                      ...repaymentForm,
                      notes: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Notes ou commentaires (optionnel)"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRepaymentForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "Ajout..." : "Ajouter le remboursement"}
                </button>
              </div>
            </form>
          </Card>
        )}

        {loan.repayments && loan.repayments.length > 0 ? (
          <Table
            columns={repaymentColumns}
            data={loan.repayments}
            keyExtractor={(repayment) => repayment._id}
          />
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Receipt className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun remboursement
            </h3>
            <p>Aucun remboursement n'a encore été enregistré pour ce crédit.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default LoanDetailPage;
