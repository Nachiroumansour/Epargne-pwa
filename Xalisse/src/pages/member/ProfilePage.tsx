import { useAuth } from "../../contexts/AuthContext";
import { useState, useEffect } from "react";
import {
  PiggyBank,
  CreditCard,
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
} from "lucide-react";
import { membersApi, contributionsApi, loansApi } from "../../api/axiosConfig";
import Table from "../../components/shared/Table";
import { format } from "date-fns";

// Étendre l'interface User pour inclure memberId
interface UserWithMemberId {
  id: string;
  email: string;
  role: string;
  fullName: string;
  memberId?: string;
}

interface MemberProfileData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  profileImage?: string;
  profile_image?: string;
  membershipDate?: string;
  isActive?: boolean;
  total_savings?: number;
}

const MemberProfile = () => {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<MemberProfileData | null>(null);
  const [contributions, setContributions] = useState([]);
  const [loans, setLoans] = useState([]);
  const [activeTab, setActiveTab] = useState("contributions");
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (user && (user.memberId || user.id)) {
      const memberId = user.memberId || user.id;
      setDataLoading(true);
      Promise.all([
        membersApi.getById(memberId),
        contributionsApi.getByMember(memberId),
        loansApi.getByMember(memberId),
      ])
        .then(([memberRes, contribRes, loansRes]) => {
          const memberObj =
            memberRes.data?.data?.member ||
            memberRes.data?.member ||
            memberRes.data;
          setProfile(memberObj);
          setContributions(
            contribRes.data?.data?.contributions ||
              contribRes.data?.contributions ||
              contribRes.data ||
              []
          );
          setLoans(
            loansRes.data?.data?.loans ||
              loansRes.data?.loans ||
              loansRes.data ||
              []
          );
          setDataLoading(false);
        })
        .catch(() => setDataLoading(false));
    }
  }, [user]);

  const contributionColumns = [
    {
      header: "Date",
      accessor: (contribution) => (
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
      accessor: (contribution) => (
        <span className="font-medium text-green-600">
          {contribution.amount?.toLocaleString()} FCFA
        </span>
      ),
    },
    {
      header: "Notes",
      accessor: (contribution) => contribution.notes || "-",
    },
  ];

  const loanColumns = [
    {
      header: "Date d'émission",
      accessor: (loan) => (
        <span>
          {format(new Date(loan.date_issued || loan.createdAt), "dd/MM/yyyy")}
        </span>
      ),
    },
    {
      header: "Montant",
      accessor: (loan) => (
        <span className="font-medium">
          {loan.amount?.toLocaleString()} FCFA
        </span>
      ),
    },
    {
      header: "Reste à payer",
      accessor: (loan) => (
        <span className="font-medium">
          {loan.remaining_amount?.toLocaleString() || 0} FCFA
        </span>
      ),
    },
    {
      header: "Date d'échéance",
      accessor: (loan) => (
        <span>
          {loan.due_date ? format(new Date(loan.due_date), "dd/MM/yyyy") : "-"}
        </span>
      ),
    },
    {
      header: "Statut",
      accessor: (loan) => {
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

  if (loading || dataLoading || !profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        Détails du membre
      </h1>
      {/* Member Info Card */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row">
            {/* Member Avatar */}
            <div className="flex-shrink-0 mb-4 sm:mb-0">
              <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 overflow-hidden">
                {profile.profileImage || profile.profile_image ? (
                  <img
                    src={profile.profileImage || profile.profile_image}
                    alt="Avatar"
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <User size={40} />
                )}
              </div>
            </div>
            {/* Member Details */}
            <div className="sm:ml-6 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {profile.fullName}
                  </h2>
                  <span
                    className={`mt-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      profile.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {profile.isActive ? "Actif" : "Inactif"}
                  </span>
                </div>
                <div className="mt-3 sm:mt-0 bg-blue-50 px-4 py-2 rounded-lg">
                  <p className="text-sm text-gray-500">Épargne Totale</p>
                  <p className="text-xl font-bold text-blue-600">
                    {(profile.total_savings ?? 0).toLocaleString()} FCFA
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="flex items-center text-gray-500">
                  <Phone className="h-5 w-5 mr-2" />
                  <span>{profile.phone}</span>
                </div>
                <div className="flex items-center text-gray-500">
                  <Mail className="h-5 w-5 mr-2" />
                  <span>{profile.email}</span>
                </div>
                <div className="flex items-center text-gray-500">
                  <Calendar className="h-5 w-5 mr-2" />
                  <span>
                    Membre depuis{" "}
                    {profile.membershipDate
                      ? format(new Date(profile.membershipDate), "dd/MM/yyyy")
                      : "-"}
                  </span>
                </div>
                <div className="flex items-center text-gray-500">
                  <MapPin className="h-5 w-5 mr-2" />
                  <span>{profile.address}</span>
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
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Historique des cotisations
              </h3>
              <Table
                columns={contributionColumns}
                data={contributions}
                keyExtractor={(contribution) => contribution._id}
                emptyMessage="Aucune cotisation enregistrée"
              />
            </div>
          )}
          {activeTab === "loans" && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Historique des crédits
              </h3>
              <Table
                columns={loanColumns}
                data={loans}
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

export default MemberProfile;
