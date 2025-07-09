import { CreditCard, LogOut } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

interface SidebarItem {
  label: string;
  icon: JSX.Element;
  path: string;
}

interface SidebarProps {
  isOpen: boolean;
  closeSidebar: () => void;
  items: SidebarItem[];
  role: string;
  onLogout: () => void;
}

const Sidebar = ({ isOpen, closeSidebar, items, role, onLogout }: SidebarProps) => {
  const location = useLocation();
  
  return (
    <>
      {/* Mobile Sidebar Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity lg:hidden"
          onClick={closeSidebar}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-blue-800 transform transition duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-center h-16 bg-blue-900 px-6">
          <div className="flex items-center">
            <CreditCard className="h-8 w-8 text-white" />
            <span className="ml-2 text-xl font-semibold text-white">EpargneCredit</span>
          </div>
        </div>
        
        {/* Role Badge */}
        <div className="px-6 py-3">
          <div className="bg-blue-700/50 text-white px-3 py-1 rounded-md text-sm font-medium inline-block">
            {role}
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="mt-4">
          <div className="px-4 space-y-1">
            {items.map((item) => {
              const isActive = location.pathname === item.path;
              
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-all group ${
                      isActive
                        ? 'bg-blue-700 text-white'
                        : 'text-blue-100 hover:bg-blue-700/50'
                    }`
                  }
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </nav>
        
        {/* Logout Button */}
        <div className="absolute bottom-0 w-full border-t border-blue-700 p-4">
          <button
            onClick={onLogout}
            className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-blue-100 rounded-md hover:bg-blue-700/50 transition-colors"
          >
            <LogOut size={20} className="mr-3" />
            Déconnexion
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;