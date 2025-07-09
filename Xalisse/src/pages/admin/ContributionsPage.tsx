import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  X,
  PlusCircle,
  Calendar,
  Download,
} from "lucide-react";
import { contributionsApi, membersApi } from "../../api/axiosConfig";
import Card from "../../components/shared/Card";
import Table from "../../components/shared/Table";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { useRealtimeEvents } from "../../hooks/useRealtimeEvents";
import { RealtimeIndicator } from "../../components/shared/RealtimeIndicator";

interface Contribution {
  _id: string;
  memberId: string;
  amount: number;
  date: string;
  notes?: string;
  memberName?: string;
}

const ContributionsPage = () => {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dateFilter, setDateFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [members, setMembers] = useState<any[]>([]);
  const [displayedContributions, setDisplayedContributions] = useState<
    Contribution[]
  >([]);

  const fetchMembers = async () => {
    try {
      const res = await membersApi.getAll();
      setMembers(res.data?.data?.members || []);
    } catch (error) {
      toast.error("Impossible de charger les membres");
    }
  };

  const fetchContributions = async () => {
    try {
      setLoading(true);
      const response = await contributionsApi.getAll(currentPage);
      // Correction : extraire le tableau depuis response.data.data.contributions
      const contributionsArray =
        response.data?.data?.contributions || response.data?.data || [];
      // Mapper pour ajouter le nom du membre
      const mapped = contributionsArray.map((c: any) => {
        const member = members.find((m) => m._id === c.memberId);
        return {
          ...c,
          memberName: member ? member.fullName || member.name : c.memberId,
        };
      });
      setContributions(mapped);
      setTotalPages(response.data?.pagination?.pages || 1);
    } catch (error) {
      console.error("Error fetching contributions:", error);
      toast.error("Impossible de charger les cotisations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    fetchContributions();
  }, [currentPage, dateFilter]);

  // WebSocket pour temps réel
  const { isConnected, lastUpdate } = useRealtimeEvents({
    onContributionCreated: fetchContributions,
    onContributionsBulkCreated: fetchContributions,
  });

  // Mapping contributions <-> membres dès que les deux sont chargés
  useEffect(() => {
    console.log("members:", members);
    console.log("contributions:", contributions);
    const mapped = contributions.map((c: any) => {
      let memberIdStr = "";
      if (typeof c.memberId === "object" && c.memberId !== null) {
        memberIdStr = c.memberId._id;
      } else {
        memberIdStr = c.memberId;
      }
      const member = members.find((m) => String(m._id) === String(memberIdStr));
      const memberName = member
        ? member.fullName || member.name
        : String(memberIdStr);
      return {
        ...c,
        memberName,
      };
    });
    setDisplayedContributions(mapped);
  }, [contributions, members]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const clearFilters = () => {
    setDateFilter("");
    setMemberFilter("");
  };

  // Filtres simples côté front
  const filteredContributions = displayedContributions.filter((c) => {
    const matchMember =
      memberFilter === "" ||
      c.memberName?.toLowerCase().includes(memberFilter.toLowerCase());
    const matchDate = dateFilter === "" || c.date.startsWith(dateFilter);
    return matchMember && matchDate;
  });

  const columns = [
    {
      header: "Date",
      accessor: (contribution: Contribution) => (
        <div className="flex items-center">
          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
          <span>{format(new Date(contribution.date), "dd/MM/yyyy")}</span>
        </div>
      ),
    },
    {
      header: "Membre",
      accessor: (contribution: Contribution) => contribution.memberName || "",
    },
    {
      header: "Montant",
      accessor: (contribution: Contribution) => (
        <span className="font-medium text-green-600">
          {contribution.amount?.toLocaleString()} FCFA
        </span>
      ),
    },
    {
      header: "Notes",
      accessor: (contribution: Contribution) => contribution.notes,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cotisations</h1>
          <RealtimeIndicator />
        </div>
        <div className="flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </button>
          <Link
            to="/admin/contributions/create"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Nouvelle cotisation
          </Link>
        </div>
      </div>

      <Card>
        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher un membre..."
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="sm:w-48">
            <div className="relative">
              <input
                type="month"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <Filter className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          {(dateFilter || memberFilter) && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4 mr-1" />
              Effacer
            </button>
          )}
        </div>

        {/* Contributions Table */}
        <Table
          columns={columns}
          data={filteredContributions}
          keyExtractor={(contribution) => contribution._id}
          isLoading={loading}
          pagination={{
            currentPage,
            totalPages,
            onPageChange: handlePageChange,
          }}
          emptyMessage="Aucune cotisation trouvée"
        />
      </Card>
    </div>
  );
};

export default ContributionsPage;
