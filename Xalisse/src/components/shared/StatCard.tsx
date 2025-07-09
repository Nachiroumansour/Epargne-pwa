import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  bgColor?: string;
  textColor?: string;
}

const StatCard = ({ 
  title, 
  value, 
  icon, 
  trend, 
  bgColor = 'bg-white', 
  textColor = 'text-blue-600' 
}: StatCardProps) => {
  return (
    <div className={`${bgColor} rounded-lg shadow-sm p-6 border border-gray-200`}>
      <div className="flex items-center">
        <div className={`${textColor} p-3 rounded-full bg-opacity-10 mr-4`}>
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          
          {trend && (
            <div className="flex items-center mt-1">
              <span className={`text-xs font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs text-gray-500 ml-1">vs dernier mois</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;