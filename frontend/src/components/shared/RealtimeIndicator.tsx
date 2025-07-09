import React from "react";
import { useSocket } from "../../contexts/SocketContext";
import { useRealtimeEvents } from "../../hooks/useRealtimeEvents";

export const RealtimeIndicator: React.FC = () => {
  const { isConnected } = useSocket();
  const { lastUpdate } = useRealtimeEvents();

  const formatLastUpdate = () => {
    if (!lastUpdate) return "";
    const now = Date.now();
    const diff = now - lastUpdate.timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `il y a ${minutes}min`;
    } else if (seconds > 0) {
      return `il y a ${seconds}s`;
    } else {
      return "maintenant";
    }
  };

  const handleReconnect = () => {
    window.location.reload(); // Simple reconnection par reload
  };

  return (
    <div className="flex items-center space-x-2 text-sm">
      <div className="flex items-center space-x-1">
        <div
          className={`w-2 h-2 rounded-full ${
            isConnected ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span className={isConnected ? "text-green-600" : "text-red-600"}>
          {isConnected ? "En ligne" : "Hors ligne"}
        </span>
      </div>

      {lastUpdate && isConnected && (
        <span className="text-gray-500">
          • Dernière MAJ: {formatLastUpdate()}
        </span>
      )}

      {!isConnected && (
        <button
          onClick={handleReconnect}
          className="text-blue-600 hover:text-blue-800 underline"
        >
          Reconnecter
        </button>
      )}
    </div>
  );
};
