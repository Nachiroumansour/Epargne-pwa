import { useState, useMemo } from "react";
import Card from "../../components/shared/Card";
import StatCard from "../../components/shared/StatCard";
import {
  contributionsApi,
  loansApi,
  statisticsApi,
} from "../../api/axiosConfig";
import { utils, writeFile } from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Line, Bar, Pie } from "react-chartjs-2";
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
  ArcElement,
} from "chart.js";
import {
  FaMoneyBillWave,
  FaChartLine,
  FaUsers,
  FaFileInvoiceDollar,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import { format } from "date-fns";

// Enregistrement de tous les composants Chart.js nécessaires
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Helper to format currency
const formatCurrency = (value: number) => `${value.toLocaleString()} FCFA`;

const ReportsPage = () => {
  const [reportType, setReportType] = useState("cotisations");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setData([]);
    setSummary(null);
    try {
      let res;
      if (reportType === "cotisations") {
        res = await contributionsApi.getAll(1);
        const contributions = res.data?.data?.contributions || [];
        setData(contributions);

        const totalAmount = contributions.reduce(
          (sum: number, c: any) => sum + c.amount,
          0
        );
        setSummary({
          totalAmount,
          count: contributions.length,
          title: "Résumé des Cotisations",
        });
      } else if (reportType === "credits") {
        res = await loansApi.getAll(1);
        const loans = res.data?.data?.loans || [];
        setData(loans);
        const totalAmount = loans.reduce(
          (sum: number, l: any) => sum + l.amount,
          0
        );
        setSummary({
          totalAmount,
          count: loans.length,
          title: "Résumé des Crédits",
        });
      } else if (reportType === "remboursements") {
        res = await loansApi.getAll(1);
        const remboursements: any[] = [];
        (res.data?.data?.loans || []).forEach((l: any) => {
          (l.repayments || []).forEach((r: any) => {
            remboursements.push({
              membre: l.memberId?.fullName || l.memberId,
              montant: r.amount,
              date: r.date?.slice(0, 10),
              methode: r.paymentMethod,
              notes: r.notes,
            });
          });
        });
        setData(remboursements);
        const totalAmount = remboursements.reduce(
          (sum, r) => sum + r.montant,
          0
        );
        setSummary({
          totalAmount,
          count: remboursements.length,
          title: "Résumé des Remboursements",
        });
      } else if (reportType === "interets-convertis") {
        // Récupérer les cotisations qui proviennent de la conversion d'intérêts
        res = await contributionsApi.getAll(1);
        const interestContributions = (res.data?.data?.contributions || [])
          .filter(
            (c: any) =>
              c.paymentMethod === "transfer" &&
              c.notes &&
              c.notes.includes("Conversion des intérêts payés")
          )
          .map((c: any) => ({
            membre: c.memberId?.fullName || c.memberId,
            montant: c.amount,
            date: c.date?.slice(0, 10),
            notes: c.notes,
            creditId: c.notes.match(/ID: ([a-f0-9]+)/)?.[1] || "N/A",
          }));

        setData(interestContributions);
        const totalAmount = interestContributions.reduce(
          (sum: number, c: any) => sum + c.montant,
          0
        );
        setSummary({
          totalAmount,
          count: interestContributions.length,
          title: "Résumé des Intérêts Convertis en Épargne",
        });
      } else if (reportType === "accompte") {
        res = await statisticsApi.getAccompteReport(startDate, endDate);
        const reportData = res.data?.data;
        setData(reportData?.members || []);
        setSummary({
          ...reportData?.summary,
          count: reportData?.members?.length,
          title: "Rapport d'Acquittement",
        });
      }
    } catch (error) {
      console.error("Failed to fetch report:", error);
      setData([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const groupedContributions = useMemo(() => {
    if (reportType !== "cotisations" || !data.length) return null;

    return data.reduce((acc, c) => {
      const memberName = c.memberId?.fullName || "Membre Inconnu";
      if (!acc[memberName]) {
        acc[memberName] = {
          contributions: [],
          total: 0,
        };
      }
      acc[memberName].contributions.push(c);
      acc[memberName].total += c.amount;
      return acc;
    }, {} as Record<string, { contributions: any[]; total: number }>);
  }, [data, reportType]);

  const exportExcel = () => {
    if (!data.length) return;
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Rapport");
    writeFile(wb, `rapport_${reportType}.xlsx`);
  };

  const exportPDF = () => {
    if (!data.length) return;
    const doc = new jsPDF();
    doc.text(`Rapport: ${reportType}`, 10, 10);
    autoTable(doc, {
      head: [Object.keys(data[0])],
      body: data.map((row) =>
        Object.values(row).map(
          (val: any) =>
            val?.fullName || val?.name || val?._id || JSON.stringify(val)
        )
      ),
      startY: 20,
    });
    doc.save(`rapport_${reportType}.pdf`);
  };

  const chart = useMemo(() => {
    if (!data.length) return null;

    let chartComponent = null;
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" as const },
        title: {
          display: true,
          text: `Évolution pour: ${reportType}`,
          font: { size: 16 },
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              let label = context.dataset.label || "";
              if (label) label += ": ";
              if (context.parsed.y !== null) {
                label += formatCurrency(context.parsed.y);
              }
              return label;
            },
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (value: any) => formatCurrency(value),
          },
        },
      },
    };

    if (reportType === "cotisations" || reportType === "remboursements") {
      const chartData = {
        labels: data.map((row) => new Date(row.date).toLocaleDateString()),
        datasets: [
          {
            label: `Montant (${reportType})`,
            data: data.map((row) => row.montant || row.amount),
            borderColor: reportType === "cotisations" ? "#2ecc71" : "#3498db",
            backgroundColor:
              reportType === "cotisations"
                ? "rgba(46, 204, 113, 0.1)"
                : "rgba(52, 152, 219, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      };
      chartComponent = <Line options={options} data={chartData} />;
    } else if (reportType === "credits") {
      const statusData = data.reduce((acc, l) => {
        acc[l.status] = (acc[l.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const chartData = {
        labels: Object.keys(statusData),
        datasets: [
          {
            label: "Nombre de crédits par statut",
            data: Object.values(statusData),
            backgroundColor: [
              "rgba(255, 159, 64, 0.7)",
              "rgba(75, 192, 192, 0.7)",
              "rgba(54, 162, 235, 0.7)",
              "rgba(255, 99, 132, 0.7)",
              "rgba(153, 102, 255, 0.7)",
            ],
            borderWidth: 1,
          },
        ],
      };
      chartComponent = <Bar options={options} data={chartData} />;
    } else if (reportType === "accompte") {
      const chartData = {
        labels: data.map((row) => row.memberName),
        datasets: [
          {
            label: "Montant Total par Membre",
            data: data.map((row) => row.totalSavings),
            backgroundColor: [
              "#1abc9c",
              "#2ecc71",
              "#3498db",
              "#9b59b6",
              "#f1c40f",
              "#e67e22",
              "#e74c3c",
              "#bdc3c7",
              "#7f8c8d",
            ],
            borderWidth: 1,
          },
        ],
      };
      chartComponent = <Pie options={options} data={chartData} />;
    }

    return <div className="h-96 mb-6">{chartComponent}</div>;
  }, [data, reportType]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Rapports & Analyses</h1>
      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchReport();
          }}
          className="flex flex-wrap gap-4 items-end"
        >
          <div>
            <label className="block text-sm font-medium mb-1">
              Type de rapport
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="border px-3 py-2 rounded-md shadow-sm"
            >
              <option value="cotisations">Cotisations</option>
              <option value="credits">Crédits</option>
              <option value="remboursements">Remboursements</option>
              <option value="interets-convertis">
                Intérêts convertis en épargne
              </option>
              <option value="accompte">Acquittement Membres</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Date de début
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border px-3 py-2 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Date de fin
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border px-3 py-2 rounded-md shadow-sm"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold shadow-md"
            disabled={loading}
          >
            {loading ? "Génération..." : "Générer"}
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 ml-auto"
            onClick={exportExcel}
            disabled={loading || !data.length}
          >
            Export Excel
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            onClick={exportPDF}
            disabled={loading || !data.length}
          >
            Export PDF
          </button>
        </form>
      </Card>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title={summary.title || "Total"}
            value={formatCurrency(summary.totalAmount || 0)}
            icon={
              reportType === "accompte" ? (
                <FaFileInvoiceDollar />
              ) : (
                <FaMoneyBillWave />
              )
            }
          />
          <StatCard
            title="Nombre de Transactions"
            value={summary.count?.toString() || "0"}
            icon={<FaChartLine />}
          />
          {summary.averageAmount && (
            <StatCard
              title="Moyenne par Membre"
              value={formatCurrency(summary.averageAmount)}
              icon={<FaUsers />}
            />
          )}
        </div>
      )}

      {chart}

      <Card>
        {loading ? (
          <div className="text-center py-8">Chargement des données...</div>
        ) : !data.length ? (
          <div className="text-center py-8 text-gray-500">
            Aucune donnée à afficher.
          </div>
        ) : (
          <div className="overflow-x-auto">
            {reportType === "accompte" ? (
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-12 px-3 py-2"></th>
                    <th className="text-left px-3 py-2 font-semibold">
                      Membre
                    </th>
                    <th className="text-left px-3 py-2 font-semibold">
                      Date d'adhésion
                    </th>
                    <th className="text-right px-3 py-2 font-semibold">
                      Total Épargné
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((member) => (
                    <>
                      <tr
                        key={member._id}
                        onClick={() =>
                          setExpandedMember(
                            expandedMember === member._id ? null : member._id
                          )
                        }
                        className="border-b cursor-pointer hover:bg-gray-50"
                      >
                        <td className="px-3 py-2 text-center text-gray-500">
                          {expandedMember === member._id ? (
                            <FaChevronUp />
                          ) : (
                            <FaChevronDown />
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {member.memberName}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {new Date(member.joinDate).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-green-600">
                          {formatCurrency(member.totalSavings)}
                        </td>
                      </tr>
                      {expandedMember === member._id && (
                        <tr className="bg-gray-100">
                          <td colSpan={4} className="p-4">
                            <h4 className="font-bold mb-2">
                              Détail de l'épargne :
                            </h4>
                            <table className="min-w-full text-xs bg-white rounded">
                              <thead className="bg-gray-200">
                                <tr>
                                  <th className="text-left p-2">Date</th>
                                  <th className="text-right p-2">Montant</th>
                                  <th className="text-left p-2">Notes</th>
                                </tr>
                              </thead>
                              <tbody>
                                {member.savingsBreakdown.map(
                                  (s: any, i: number) => (
                                    <tr key={i} className="border-b">
                                      <td className="p-2">
                                        {new Date(s.date).toLocaleDateString()}
                                      </td>
                                      <td className="p-2 text-right">
                                        {formatCurrency(s.amount)}
                                      </td>
                                      <td className="p-2">{s.notes}</td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  {reportType === "cotisations" ? (
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">
                        Membre
                      </th>
                      <th className="text-left px-3 py-2 font-semibold">
                        Montant
                      </th>
                      <th className="text-left px-3 py-2 font-semibold">
                        Date
                      </th>
                      <th className="text-left px-3 py-2 font-semibold">
                        Notes
                      </th>
                    </tr>
                  ) : (
                    <tr>
                      {data[0] &&
                        Object.keys(data[0]).map((col) => (
                          <th
                            key={col}
                            className="text-left px-3 py-2 font-semibold"
                          >
                            {col.charAt(0).toUpperCase() + col.slice(1)}
                          </th>
                        ))}
                    </tr>
                  )}
                </thead>
                <tbody>
                  {reportType === "cotisations" && groupedContributions
                    ? Object.entries(groupedContributions).map(
                        ([memberName, group]) => (
                          <>
                            <tr key={memberName} className="bg-gray-100">
                              <td
                                colSpan={3}
                                className="px-3 py-2 font-bold text-gray-700"
                              >
                                {memberName}
                              </td>
                              <td className="px-3 py-2 font-bold text-right text-gray-700">
                                Total: {formatCurrency(group.total)}
                              </td>
                            </tr>
                            {group.contributions.map((c: any, idx: number) => (
                              <tr
                                key={`${memberName}-${idx}`}
                                className="border-b"
                              >
                                <td className="px-3 py-2 pl-6">-</td>
                                <td className="px-3 py-2">
                                  {formatCurrency(c.amount)}
                                </td>
                                <td className="px-3 py-2">
                                  {new Date(c.date).toLocaleDateString()}
                                </td>
                                <td className="px-3 py-2">{c.notes}</td>
                              </tr>
                            ))}
                          </>
                        )
                      )
                    : data.map((row, idx) => (
                        <tr key={idx} className="border-b">
                          {Object.values(row).map((val: any, i) => (
                            <td key={i} className="px-3 py-2">
                              {typeof val === "number"
                                ? val.toLocaleString()
                                : typeof val === "object"
                                ? JSON.stringify(val)
                                : val}
                            </td>
                          ))}
                        </tr>
                      ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ReportsPage;
