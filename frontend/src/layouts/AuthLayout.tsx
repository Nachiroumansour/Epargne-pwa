import { Outlet } from 'react-router-dom';
import { CreditCard } from 'lucide-react';

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Left Side - Branding */}
      <div className="hidden md:flex md:w-1/2 bg-blue-700 text-white p-8 flex-col justify-center items-center">
        <div className="max-w-md mx-auto">
          <div className="flex items-center mb-8">
            <CreditCard size={40} className="mr-3" />
            <h1 className="text-3xl font-bold">EpargneCredit</h1>
          </div>
          <h2 className="text-2xl font-semibold mb-4">Bienvenue à votre plateforme d'épargne et crédit</h2>
          <p className="text-lg opacity-90 mb-8">
            Gérez vos contributions, suivez vos épargnes et accédez à des crédits facilement.
          </p>
          <div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm">
            <h3 className="text-xl font-medium mb-2">Nous vous accompagnons</h3>
            <p className="opacity-80">
              Notre association facilite l'épargne communautaire et l'accès au crédit pour tous nos membres.
            </p>
          </div>
        </div>
      </div>
      
      {/* Right Side - Login Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center">
        <div className="w-full max-w-md px-6 py-8">
          <div className="md:hidden flex items-center justify-center mb-8">
            <CreditCard size={32} className="text-blue-700 mr-2" />
            <h1 className="text-2xl font-bold text-blue-700">EpargneCredit</h1>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;