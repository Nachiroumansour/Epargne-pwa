import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, PlusCircle, User, Filter, X } from "lucide-react";
import Card from "../../components/shared/Card";
import Table from "../../components/shared/Table";
import { membersApi } from "../../api/axiosConfig";
import { useRealtimeEvents } from "../../hooks/useRealtimeEvents";
import { RealtimeIndicator } from "../../components/shared/RealtimeIndicator";

const MembersList = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await membersApi.getAll();
      const membersArray = res.data?.data?.members || [];
      setMembers(Array.isArray(membersArray) ? membersArray : []);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // WebSocket pour temps réel
  const { isConnected, lastUpdate } = useRealtimeEvents({
    onMemberCreated: fetchMembers,
    onMemberUpdated: fetchMembers,
  });

  // Filtres simples côté front
  const filteredMembers = Array.isArray(members)
    ? searchTerm.trim() !== ""
      ? members.filter(
          (member) =>
            member.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.phone?.includes(searchTerm)
        )
      : members.filter((member) =>
          statusFilter === "all"
            ? true
            : (member.isActive ? "active" : "inactive") === statusFilter
        )
    : [];

  const columns = [
    {
      header: "Nom",
      accessor: (member) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <User size={18} />
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {member.fullName || member.name}
            </div>
            <div className="text-sm text-gray-500">{member.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Téléphone",
      accessor: (member) => member.phone || member.phoneNumber || "-",
    },
    {
      header: "Épargne Totale",
      accessor: (member) => (
        <span className="text-sm font-medium text-gray-900">
          {member.total_savings?.toLocaleString() ||
            member.savings?.toLocaleString() ||
            0}{" "}
          FCFA
        </span>
      ),
    },
    {
      header: "Crédits Actifs",
      accessor: (member) => (
        <span className="text-sm font-medium text-gray-900">
          {member.active_loans || member.activeLoans || 0}
        </span>
      ),
    },
    {
      header: "Date d'adhésion",
      accessor: (member) => {
        const date = new Date(
          member.join_date || member.membershipDate || member.createdAt
        );
        return <span>{date.toLocaleDateString()}</span>;
      },
    },
    {
      header: "Statut",
      accessor: (member) => (
        <span
          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            member.isActive
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {member.isActive ? "Actif" : "Inactif"}
        </span>
      ),
    },
  ];

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Membres</h1>
          <RealtimeIndicator
            isConnected={isConnected}
            lastUpdate={lastUpdate}
          />
        </div>
        <button
          onClick={() => navigate("/admin/members/create")}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Ajouter un membre
        </button>
      </div>
      <Card>
        {/* Search and Filters */}
        <div className="p-5 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <form className="relative">
                <input
                  type="text"
                  placeholder="Rechercher un membre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
              </form>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value as "all" | "active" | "inactive"
                    )
                  }
                  className="pl-10 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                </select>
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Filter className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              {(searchTerm !== "" || statusFilter !== "all") && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4 mr-1" />
                  Effacer
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Members Table */}
        <Table
          columns={columns}
          data={filteredMembers}
          keyExtractor={(member) => member._id}
          emptyMessage="Aucun membre trouvé"
          onRowClick={(member) => navigate(`/admin/members/${member._id}`)}
        />
      </Card>
    </div>
  );
};

export default MembersList;
