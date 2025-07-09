import Card from "../../components/shared/Card";

const SettingsPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
      <Card>
        <h2 className="text-lg font-semibold mb-4">Paramètres généraux</h2>
        <div className="text-gray-600 mb-2">
          Ici, vous pourrez bientôt configurer les paramètres de l'application
          (nom, logo, notifications, etc.).
        </div>
        {/* Ajoute ici tes sections de configuration (ex: logo, email, notifications, etc.) */}
      </Card>
    </div>
  );
};

export default SettingsPage;
