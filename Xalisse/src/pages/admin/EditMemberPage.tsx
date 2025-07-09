import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { membersApi } from "../../api/axiosConfig";
import Card from "../../components/shared/Card";
import toast from "react-hot-toast";

interface MemberFormData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
}

const EditMemberPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<MemberFormData>();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    membersApi
      .getById(id)
      .then((res) => {
        const member = res.data?.data?.member || res.data?.member || res.data;
        setValue("fullName", member.fullName || "");
        setValue("email", member.email || "");
        setValue("phone", member.phone || "");
        setValue("address", member.address || "");
        setValue("isActive", member.isActive || false);
      })
      .catch(() => {
        toast.error("Erreur lors du chargement du membre");
        navigate("/admin/members");
      })
      .finally(() => setLoading(false));
  }, [id, setValue, navigate]);

  const onSubmit = async (data: MemberFormData) => {
    try {
      setLoading(true);
      await membersApi.update(id, data);
      toast.success("Membre modifié avec succès");
      navigate(`/admin/members/${id}`);
    } catch (error) {
      console.error("Error updating member:", error);
      toast.error("Erreur lors de la modification du membre");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <button
          onClick={() => navigate(`/admin/members/${id}`)}
          className="mr-4 p-1 rounded-full hover:bg-gray-200"
        >
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Modifier le membre</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2 flex justify-center md:justify-start md:col-span-1">
              <div className="relative">
                <div className="h-32 w-32 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <User size={48} />
                </div>
              </div>
            </div>

            <div className="col-span-2 md:col-span-1">
              <div className="mb-4">
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Nom complet
                </label>
                <input
                  id="fullName"
                  type="text"
                  {...register("fullName", {
                    required: "Le nom est obligatoire",
                  })}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.fullName ? "border-red-300" : "border-gray-300"
                  }`}
                />
                {errors.fullName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  {...register("email", {
                    required: "L'email est obligatoire",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Email invalide",
                    },
                  })}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? "border-red-300" : "border-gray-300"
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Téléphone
                </label>
                <input
                  id="phone"
                  type="text"
                  {...register("phone", {
                    required: "Le téléphone est obligatoire",
                  })}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.phone ? "border-red-300" : "border-gray-300"
                  }`}
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="address"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Adresse
              </label>
              <input
                id="address"
                type="text"
                {...register("address", {
                  required: "L'adresse est obligatoire",
                })}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.address ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.address.message}
                </p>
              )}
            </div>
          </div>

          {/* Nouveau champ pour le statut isActive */}
          <div className="mt-4">
            <label
              htmlFor="isActive"
              className="flex items-center text-sm font-medium text-gray-700"
            >
              <input
                id="isActive"
                type="checkbox"
                {...register("isActive")}
                className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              Membre Actif
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => navigate(`/admin/members/${id}`)}
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

export default EditMemberPage;
