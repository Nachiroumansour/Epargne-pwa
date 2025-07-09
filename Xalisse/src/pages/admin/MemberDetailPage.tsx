import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  User,
  Edit,
  ArrowLeft,
  PiggyBank,
  CreditCard,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Trash,
} from "lucide-react";
import { membersApi, contributionsApi, loansApi } from "../../api/axiosConfig";
import Card from "../../components/shared/Card";
import Table from "../../components/shared/Table";
import toast from "react-hot-toast";
import { format } from "date-fns";

const MemberDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<any>(null);
  const [contributions, setContributions] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("contributions");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      membersApi.getById(id),
      contributionsApi.getByMember(id),
      loansApi.getByMember(id),
    ])
      .then(([memberRes, contribRes, loansRes]) => {
        const memberObj =
          memberRes.data?.data?.member ||
          memberRes.data?.member ||
          memberRes.data;
        setMember(memberObj);
        console.log("Objet membre reçu du backend :", memberObj);
        setContributions(contribRes.data || contribRes);
        setLoans(loansRes.data || loansRes);
        setLoading(false);
      })
      .catch((err) => {
        toast.error("Erreur lors du chargement des données du membre");
        setLoading(false);
      });
  }, [id]);

  const contributionColumns = [
    {
      header: "Date",
      accessor: (contribution: any) => (
        <span>
          {format(
            new Date(contribution.date || contribution.createdAt),
            "dd/MM/yyyy"
          )}
        </span>
      ),
    },
    {
      header: "Montant",
      accessor: (contribution: any) => (
        <span className="font-medium text-green-600">
          {contribution.amount?.toLocaleString()} FCFA
        </span>
      ),
    },
    {
      header: "Notes",
      accessor: (contribution: any) => contribution.notes || "-",
    },
  ];

  const loanColumns = [
    {
      header: "Date d'émission",
      accessor: (loan: any) => (
        <span>
          {format(new Date(loan.date_issued || loan.createdAt), "dd/MM/yyyy")}
        </span>
      ),
    },
    {
      header: "Montant",
      accessor: (loan: any) => (
        <span className="font-medium">
          {loan.amount?.toLocaleString()} FCFA
        </span>
      ),
    },
    {
      header: "Reste à payer",
      accessor: (loan: any) => (
        <span className="font-medium">
          {loan.remaining_amount?.toLocaleString() || 0} FCFA
        </span>
      ),
    },
    {
      header: "Date d'échéance",
      accessor: (loan: any) => (
        <span>
          {loan.due_date ? format(new Date(loan.due_date), "dd/MM/yyyy") : "-"}
        </span>
      ),
    },
    {
      header: "Statut",
      accessor: (loan: any) => {
        let statusColor = "";
        let statusText = "";
        switch (loan.status) {
          case "approved":
            statusColor = "bg-blue-100 text-blue-800";
            statusText = "Approuvé";
            break;
          case "in_progress":
            statusColor = "bg-green-100 text-green-800";
            statusText = "En cours";
            break;
          case "completed":
            statusColor = "bg-purple-100 text-purple-800";
            statusText = "Remboursé";
            break;
          case "late":
            statusColor = "bg-red-100 text-red-800";
            statusText = "En retard";
            break;
          default:
            statusColor = "bg-gray-100 text-gray-800";
            statusText = loan.status;
        }
        return (
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}`}
          >
            {statusText}
          </span>
        );
      },
    },
  ];

  const handleDelete = async () => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce membre ?")) return;
    try {
      await membersApi.delete(id);
      toast.success("Membre supprimé avec succès");
      navigate("/admin/members");
    } catch (error) {
      toast.error("Erreur lors de la suppression du membre");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Membre non trouvé</h3>
        <p className="mt-1 text-gray-500">
          Le membre que vous recherchez n'existe pas ou a été supprimé.
        </p>
        <button
          onClick={() => navigate("/admin/members")}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          Retour à la liste
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate("/admin/members")}
            className="mr-4 p-1 rounded-full hover:bg-gray-200"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Détails du membre
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/admin/members/${id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Link>
          <button
            onClick={handleDelete}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
          >
            <Trash className="h-4 w-4 mr-2" />
            Supprimer
          </button>
        </div>
      </div>

      {/* Member Info Card */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row">
            {/* Member Avatar */}
            <div className="flex-shrink-0 mb-4 sm:mb-0">
              <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <User size={40} />
              </div>
            </div>

            {/* Member Details */}
            <div className="sm:ml-6 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {member.fullName || member.name}
                  </h2>
                  <span
                    className={`mt-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      member.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {member.isActive ? "Actif" : "Inactif"}
                  </span>
                </div>

                <div className="mt-3 sm:mt-0 bg-blue-50 px-4 py-2 rounded-lg">
                  <p className="text-sm text-gray-500">Épargne Totale</p>
                  <p className="text-xl font-bold text-blue-600">
                    {(member.total_savings ?? 0).toLocaleString()} FCFA
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="flex items-center text-gray-500">
                  <Phone className="h-5 w-5 mr-2" />
                  <span>{member.phone}</span>
                </div>
                <div className="flex items-center text-gray-500">
                  <Mail className="h-5 w-5 mr-2" />
                  <span>{member.email}</span>
                </div>
                <div className="flex items-center text-gray-500">
                  <Calendar className="h-5 w-5 mr-2" />
                  <span>
                    Membre depuis{" "}
                    {format(
                      new Date(
                        member.membershipDate ||
                          member.join_date ||
                          member.createdAt
                      ),
                      "dd/MM/yyyy"
                    )}
                  </span>
                </div>
                <div className="flex items-center text-gray-500">
                  <MapPin className="h-5 w-5 mr-2" />
                  <span>{member.address}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="border-t border-gray-200">
          <div className="flex">
            <button
              className={`py-3 px-4 text-sm font-medium border-b-2 ${
                activeTab === "contributions"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("contributions")}
            >
              <div className="flex items-center">
                <PiggyBank className="h-4 w-4 mr-2" />
                Cotisations
              </div>
            </button>
            <button
              className={`py-3 px-4 text-sm font-medium border-b-2 ${
                activeTab === "loans"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("loans")}
            >
              <div className="flex items-center">
                <CreditCard className="h-4 w-4 mr-2" />
                Crédits
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "contributions" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Historique des cotisations
                </h3>
                <Link
                  to={`/admin/contributions/create?memberId=${member._id}`}
                  className="inline-flex items-center px-3 py-1.5 border border-blue-500 text-blue-600 rounded-md text-sm font-medium hover:bg-blue-50"
                >
                  <PiggyBank className="h-4 w-4 mr-1" />
                  Ajouter une cotisation
                </Link>
              </div>

              <Table
                columns={contributionColumns}
                data={contributions?.data?.contributions ?? []}
                keyExtractor={(contribution) => contribution._id}
                emptyMessage="Aucune cotisation enregistrée"
              />
            </div>
          )}

          {activeTab === "loans" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Historique des crédits
                </h3>
                <Link
                  to={`/admin/loans/create?memberId=${member._id}`}
                  className="inline-flex items-center px-3 py-1.5 border border-blue-500 text-blue-600 rounded-md text-sm font-medium hover:bg-blue-50"
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  Accorder un crédit
                </Link>
              </div>

              <Table
                columns={loanColumns}
                data={loans?.data?.loans ?? []}
                keyExtractor={(loan) => loan._id}
                emptyMessage="Aucun crédit enregistré"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberDetail;
