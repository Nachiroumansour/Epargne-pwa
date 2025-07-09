import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useRealtimeEvents } from "../../hooks/useRealtimeEvents";
import {
  Search,
  Filter,
  X,
  PiggyBank,
  Calendar,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import Card from "../../components/shared/Card";
import Table from "../../components/shared/Table";
import { contributionsApi } from "../../api/axiosConfig";
import { format } from "date-fns";

import { RealtimeIndicator } from "../../components/shared/RealtimeIndicator";

interface Contribution {
  _id: string;
  date: string;
  amount: number;
  notes: string;
}

const MemberContributions = () => {
  const { user } = useAuth();
  const [contributions, setContributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    if (user?.memberId || user?.id) {
      fetchContributions();
    }
  }, [user]);

  // Déclare fetchContributions avant useRealtimeEvents
  const fetchContributions = async () => {
    try {
      setLoading(true);
      const response = await contributionsApi.getMyContributions();
      setContributions(response.data.data?.contributions || response.data);
    } catch (error) {
      console.error("Error fetching contributions:", error);
    } finally {
      setLoading(false);
    }
  };

  // WebSocket pour le temps réel
  const { isConnected, lastUpdate } = useRealtimeEvents({
    onMyContributionCreated: fetchContributions,
    onMyContributionsBulkCreated: fetchContributions,
  });

  const handleDateFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFilter(e.target.value);
  };

  const clearFilters = () => {
    setDateFilter("");
  };

  const toggleSortDirection = () => {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
  };

  // Filter and sort contributions
  const filteredContributions = contributions
    .filter((contribution) => {
      if (!dateFilter) return true;
      return contribution.date.includes(dateFilter);
    })
    .sort((a, b) => {
      if (sortDirection === "asc") {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } else {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

  // Calculate total savings
  const totalSavings = filteredContributions.reduce(
    (total, c) => total + (c.amount || 0),
    0
  );
  const lastContribution = filteredContributions[0]?.date
    ? new Date(filteredContributions[0].date).toLocaleDateString()
    : "Aucune";

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
      header: "Montant",
      accessor: (contribution: Contribution) => (
        <span className="font-medium text-green-600">
          {contribution.amount.toLocaleString()} FCFA
        </span>
      ),
    },
    {
      header: "Notes",
      accessor: "notes",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes Cotisations</h1>
          <p className="mt-1 text-gray-500">
            Historique de toutes vos cotisations
          </p>
        </div>
        <RealtimeIndicator />
      </div>

      {/* Stats Card */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between">
          <div className="flex items-center mb-4 sm:mb-0">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-4">
              <PiggyBank size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Épargne Totale</p>
              <p className="text-2xl font-bold text-gray-800">
                {totalSavings.toLocaleString()} FCFA
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <p className="text-sm text-gray-500">Dernière cotisation</p>
              <p className="text-lg font-medium text-gray-800">
                {lastContribution}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <p className="text-sm text-gray-500">Total cotisations</p>
              <p className="text-lg font-medium text-gray-800">
                {contributions.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Table */}
      <Card>
        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="month"
                value={dateFilter}
                onChange={handleDateFilterChange}
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <Filter className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {dateFilter && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4 mr-1" />
                Effacer
              </button>
            )}

            <button
              onClick={toggleSortDirection}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              {sortDirection === "asc" ? (
                <>
                  <ArrowUp className="h-4 w-4 mr-1" />
                  Plus ancien
                </>
              ) : (
                <>
                  <ArrowDown className="h-4 w-4 mr-1" />
                  Plus récent
                </>
              )}
            </button>
          </div>
        </div>

        {/* Contributions Table */}
        <Table
          columns={columns}
          data={filteredContributions}
          keyExtractor={(contribution: Contribution) => contribution._id}
          isLoading={loading}
          emptyMessage="Vous n'avez pas encore de cotisations enregistrées"
        />
      </Card>
    </div>
  );
};

export default MemberContributions;
