import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, PiggyBank } from "lucide-react";
import { useForm } from "react-hook-form";
import Card from "../../components/shared/Card";
import toast from "react-hot-toast";
import { membersApi, contributionsApi } from "../../api/axiosConfig";

interface ContributionFormData {
  memberId: string;
  amount: number;
  date: string;
  notes?: string;
}

const CreateContribution = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const memberIdFromUrl = searchParams.get("memberId") || "";

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ContributionFormData>({
    defaultValues: { memberId: memberIdFromUrl },
  });

  useEffect(() => {
    membersApi.getAll().then((res) => {
      const membersArray = res.data?.data?.members || [];
      setMembers(membersArray);
      // Si memberId est dans l'URL, on le sélectionne
      if (memberIdFromUrl) {
        setValue("memberId", memberIdFromUrl);
      }
    });
  }, [memberIdFromUrl, setValue]);

  const onSubmit = async (data: ContributionFormData) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        amount: Number(data.amount),
        type: "savings",
        paymentMethod: "cash",
      };
      await contributionsApi.create(payload);
      toast.success("Cotisation ajoutée avec succès");
      navigate("/admin/contributions");
    } catch (error) {
      toast.error("Erreur lors de l'ajout de la cotisation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <button
          onClick={() => navigate("/admin/contributions")}
          className="mr-4 p-1 rounded-full hover:bg-gray-200"
        >
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          Ajouter une cotisation
        </h1>
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
                defaultValue={memberIdFromUrl || ""}
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
                htmlFor="date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Date
              </label>
              <input
                id="date"
                type="date"
                {...register("date", { required: "La date est obligatoire" })}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.date ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.date.message}
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
              onClick={() => navigate("/admin/contributions")}
              className="mr-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-70"
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

export default CreateContribution;
