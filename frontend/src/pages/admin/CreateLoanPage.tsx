import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, CreditCard } from "lucide-react";
import { useForm } from "react-hook-form";
import Card from "../../components/shared/Card";
import toast from "react-hot-toast";
import { membersApi, loansApi } from "../../api/axiosConfig";

interface LoanFormData {
  memberId: number;
  amount: number;
  date_issued: string;
  due_date: string;
  interestRate: number;
  term: number;
  purpose: string;
  notes?: string;
}

const CreateLoan = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<LoanFormData>();

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await membersApi.getAll();
      setMembers(res.data?.data?.members || []);
    } catch (error) {
      toast.error("Impossible de charger les membres");
    }
  };

  const onSubmit = async (data: LoanFormData) => {
    setLoading(true);
    try {
      // Préparer le payload avec les bons types et uniquement les champs attendus
      const payload = {
        memberId: String(data.memberId),
        amount: Number(data.amount),
        interestRate: Number(data.interestRate),
        term: Number(data.term),
        purpose: data.purpose,
        notes: data.notes,
      };
      await loansApi.create(payload);
      toast.success("Crédit ajouté avec succès");
      navigate("/admin/loans");
    } catch (error) {
      toast.error("Erreur lors de la création du crédit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <button
          onClick={() => navigate("/admin/loans")}
          className="mr-4 p-1 rounded-full hover:bg-gray-200"
        >
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Accorder un crédit</h1>
      </div>
      <Card>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="mb-4">
              <label
                htmlFor="memberId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Membre
              </label>
              <select
                id="memberId"
                {...register("memberId", {
                  required: "Le membre est obligatoire",
                })}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.memberId ? "border-red-300" : "border-gray-300"
                }`}
                defaultValue=""
              >
                <option value="" disabled>
                  Sélectionner un membre
                </option>
                {members.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.fullName || m.name}
                  </option>
                ))}
              </select>
              {errors.memberId && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.memberId.message}
                </p>
              )}
            </div>
            <div className="mb-4">
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Montant (FCFA)
              </label>
              <input
                id="amount"
                type="number"
                min="1"
                {...register("amount", {
                  required: "Le montant est obligatoire",
                  min: { value: 1, message: "Le montant doit être positif" },
                })}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.amount ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.amount.message}
                </p>
              )}
            </div>
            <div className="mb-4">
              <label
                htmlFor="date_issued"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Date d'émission
              </label>
              <input
                id="date_issued"
                type="date"
                {...register("date_issued", {
                  required: "La date d'émission est obligatoire",
                })}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.date_issued ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.date_issued && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.date_issued.message}
                </p>
              )}
            </div>
            <div className="mb-4">
              <label
                htmlFor="due_date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Date d'échéance
              </label>
              <input
                id="due_date"
                type="date"
                {...register("due_date", {
                  required: "La date d'échéance est obligatoire",
                })}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.due_date ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.due_date && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.due_date.message}
                </p>
              )}
            </div>
            <div className="mb-4">
              <label
                htmlFor="interestRate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Taux d'intérêt (%)
              </label>
              <input
                id="interestRate"
                type="number"
                step="0.01"
                min="0"
                {...register("interestRate", {
                  required: "Le taux d'intérêt est obligatoire",
                  min: {
                    value: 0,
                    message: "Le taux d'intérêt ne peut pas être négatif",
                  },
                })}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.interestRate ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.interestRate && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.interestRate.message}
                </p>
              )}
            </div>
            <div className="mb-4">
              <label
                htmlFor="term"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Durée du prêt (mois)
              </label>
              <input
                id="term"
                type="number"
                min="1"
                {...register("term", {
                  required: "La durée du prêt est obligatoire",
                  min: {
                    value: 1,
                    message: "La durée du prêt doit être d'au moins 1 mois",
                  },
                })}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.term ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.term && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.term.message}
                </p>
              )}
            </div>
            <div className="mb-4 md:col-span-2">
              <label
                htmlFor="purpose"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Objet du prêt
              </label>
              <input
                id="purpose"
                type="text"
                {...register("purpose", {
                  required: "L'objet du prêt est obligatoire",
                })}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.purpose ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.purpose && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.purpose.message}
                </p>
              )}
            </div>
            <div className="mb-4 md:col-span-2">
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Notes (optionnel)
              </label>
              <textarea
                id="notes"
                {...register("notes")}
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                rows={3}
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => navigate("/admin/loans")}
              className="mr-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-70"
            >
              {loading ? (
                <svg
                  className="animate-spin h-5 w-5 mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Enregistrer
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CreateLoan;
