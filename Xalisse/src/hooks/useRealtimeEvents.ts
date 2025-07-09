import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface RealtimeCallbacks {
  // Événements Loans
  onLoanNew?: (data: any) => void;
  onLoanApproved?: (data: any) => void;
  onLoanRepaid?: (data: any) => void;
  onLoanRejected?: (data: any) => void;
  onLoanDeleted?: (data: any) => void;
  onLoanStatusChanged?: (data: any) => void;
  
  // Événements Contributions
  onContributionCreated?: (data: any) => void;
  onContributionUpdated?: (data: any) => void;
  onContributionDeleted?: (data: any) => void;
  onContributionsBulkCreated?: (data: any) => void;
  onMyContributionCreated?: (data: any) => void;
  onMyContributionUpdated?: (data: any) => void;
  onMyContributionDeleted?: (data: any) => void;
  onMyContributionsBulkCreated?: (data: any) => void;
  
  // Événements Membres
  onMemberCreated?: (data: any) => void;
  onMemberUpdated?: (data: any) => void;
  onMemberDeleted?: (data: any) => void;
  onMyProfileUpdated?: (data: any) => void;
  onMyAccountDeleted?: (data: any) => void;
  
  // Notifications
  onNotification?: (data: any) => void;
}

interface RealtimeUpdate {
  type: string;
  data: any;
  timestamp: number;
}

export const useRealtimeEvents = (callbacks: RealtimeCallbacks = {}) => {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const [lastUpdate, setLastUpdate] = useState<RealtimeUpdate | null>(null);
  const callbacksRef = useRef(callbacks);

  // Mettre à jour les callbacks sans re-render
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleLoanNew = (data: any) => {
      setLastUpdate({ type: "loan:new", data, timestamp: Date.now() });
      callbacksRef.current.onLoanNew?.(data);
      if (user?.role === "admin") {
        toast.success(`Nouvelle demande de crédit de ${data.member?.fullName}`);
      }
    };

    const handleLoanApproved = (data: any) => {
      console.log('🎯 Frontend - Événement loan:approved reçu:', data);
      console.log('🎯 User actuel:', user);
      console.log('🎯 Comparaison memberId - data:', data.member?._id, 'vs user.memberId:', (user as any).memberId);
      
      setLastUpdate({ type: "loan:approved", data, timestamp: Date.now() });
      callbacksRef.current.onLoanApproved?.(data);
      if (user?.role === "member" && data.member?._id === (user as any).memberId) {
        console.log('✅ Affichage toast pour membre concerné');
        toast.success("Votre demande de crédit a été approuvée ! 🎉");
      } else {
        console.log('❌ Pas de toast - conditions non remplies');
      }
    };

    const handleLoanRepaid = (data: any) => {
      setLastUpdate({ type: "loan:repaid", data, timestamp: Date.now() });
      callbacksRef.current.onLoanRepaid?.(data);
    };

    const handleLoanRejected = (data: any) => {
      setLastUpdate({ type: "loan:rejected", data, timestamp: Date.now() });
      callbacksRef.current.onLoanRejected?.(data);
      if (user?.role === "member" && data.member?._id === (user as any).memberId) {
        toast.error("Votre demande de crédit a été refusée.");
      }
    };

    const handleLoanDeleted = (data: any) => {
      console.log('🎯 Événement loan:deleted reçu:', data);
      setLastUpdate({ type: "loan:deleted", data, timestamp: Date.now() });
      callbacksRef.current.onLoanDeleted?.(data);
      if (user?.role === "admin") {
        toast.error(`Crédit supprimé`);
      } else if (user?.role === "member") {
        toast.error(`Votre demande de crédit a été supprimée`);
      }
    };

    const handleLoanStatusChanged = (data: any) => {
      console.log('🎯 Événement loan:status:changed reçu:', data);
      setLastUpdate({ type: "loan:status:changed", data, timestamp: Date.now() });
      callbacksRef.current.onLoanStatusChanged?.(data);
      if (user?.role === "admin") {
        toast(`Statut du crédit changé: ${data.oldStatus} → ${data.newStatus}`);
      } else if (user?.role === "member" && data.member?._id === (user as any).memberId) {
        toast(`Le statut de votre crédit a changé: ${data.newStatus}`);
      }
    };

    const handleContributionCreated = (data: any) => {
      console.log('🎯 Événement contribution:created reçu:', data);
      setLastUpdate({ type: "contribution:created", data, timestamp: Date.now() });
      callbacksRef.current.onContributionCreated?.(data);
      
      // Si c'est un admin, afficher notification pour toutes les cotisations
      if (user?.role === "admin") {
        toast.success(`Nouvelle cotisation de ${data.member?.fullName}: ${data.contribution?.amount} FCFA`);
      }
      // Si c'est un membre et que c'est SA cotisation, afficher notification
      else if (user?.role === "member" && data.member?._id === (user as any).memberId) {
        toast.success(`Nouvelle cotisation enregistrée: ${data.contribution?.amount} FCFA 💰`);
        callbacksRef.current.onMyContributionCreated?.(data);
      }
    };

    const handleContributionUpdated = (data: any) => {
      console.log('🎯 Événement contribution:updated reçu:', data);
      setLastUpdate({ type: "contribution:updated", data, timestamp: Date.now() });
      callbacksRef.current.onContributionUpdated?.(data);
      
      if (user?.role === "admin") {
        toast(`Cotisation modifiée pour ${data.member?.fullName}: ${data.contribution?.amount} FCFA`);
      } else if (user?.role === "member" && data.member?._id === (user as any).memberId) {
        toast(`Votre cotisation a été modifiée: ${data.contribution?.amount} FCFA`);
        callbacksRef.current.onMyContributionUpdated?.(data);
      }
    };

    const handleContributionDeleted = (data: any) => {
      console.log('🎯 Événement contribution:deleted reçu:', data);
      setLastUpdate({ type: "contribution:deleted", data, timestamp: Date.now() });
      callbacksRef.current.onContributionDeleted?.(data);
      
      if (user?.role === "admin") {
        toast.error(`Cotisation supprimée pour ${data.member?.fullName}`);
      } else if (user?.role === "member" && data.member?._id === (user as any).memberId) {
        toast.error(`Une de vos cotisations a été supprimée`);
        callbacksRef.current.onMyContributionDeleted?.(data);
      }
    };

    const handleContributionsBulkCreated = (data: any) => {
      console.log('🎯 Événement contributions:bulk:created reçu:', data);
      setLastUpdate({ type: "contributions:bulk:created", data, timestamp: Date.now() });
      callbacksRef.current.onContributionsBulkCreated?.(data);
      
      if (user?.role === "admin") {
        toast.success(`${data.count} cotisations ajoutées en masse`);
      } else if (user?.role === "member") {
        toast.success(`${data.contributions?.length} nouvelles cotisations ajoutées`);
        callbacksRef.current.onMyContributionsBulkCreated?.(data);
      }
    };

    const handleMemberCreated = (data: any) => {
      console.log('🎯 Événement member:created reçu:', data);
      setLastUpdate({ type: "member:created", data, timestamp: Date.now() });
      callbacksRef.current.onMemberCreated?.(data);
      if (user?.role === "admin") {
        toast.success(`Nouveau membre: ${data.member?.fullName}`);
      }
    };

    const handleMemberUpdated = (data: any) => {
      console.log('🎯 Événement member:updated reçu:', data);
      setLastUpdate({ type: "member:updated", data, timestamp: Date.now() });
      callbacksRef.current.onMemberUpdated?.(data);
      if (user?.role === "admin") {
        toast(`Membre mis à jour: ${data.member?.fullName}`);
      }
    };

    const handleMemberDeleted = (data: any) => {
      console.log('🎯 Événement member:deleted reçu:', data);
      setLastUpdate({ type: "member:deleted", data, timestamp: Date.now() });
      callbacksRef.current.onMemberDeleted?.(data);
      if (user?.role === "admin") {
        toast.error(`Membre supprimé: ${data.member?.fullName}`);
      }
    };

    const handleMyProfileUpdated = (data: any) => {
      console.log('🎯 Événement member:profile:updated reçu:', data);
      setLastUpdate({ type: "my:profile:updated", data, timestamp: Date.now() });
      callbacksRef.current.onMyProfileUpdated?.(data);
      if (user?.role === "member") {
        toast("Votre profil a été mis à jour");
      }
    };

    const handleMyAccountDeleted = (data: any) => {
      console.log('🎯 Événement member:account:deleted reçu:', data);
      setLastUpdate({ type: "my:account:deleted", data, timestamp: Date.now() });
      callbacksRef.current.onMyAccountDeleted?.(data);
      if (user?.role === "member") {
        toast.error("Votre compte a été supprimé. Vous allez être déconnecté.");
        // Ici on pourrait déclencher une déconnexion automatique
      }
    };

    const handleNotification = (data: any) => {
      callbacksRef.current.onNotification?.(data);
    };

    // Enregistrer les événements
    socket.on('loan:new', handleLoanNew);
    socket.on('loan:approved', handleLoanApproved);
    socket.on('loan:repaid', handleLoanRepaid);
    socket.on('loan:rejected', handleLoanRejected);
    socket.on('loan:deleted', handleLoanDeleted);
    socket.on('loan:status:changed', handleLoanStatusChanged);
    
    socket.on('contribution:created', handleContributionCreated);
    socket.on('contribution:updated', handleContributionUpdated);
    socket.on('contribution:deleted', handleContributionDeleted);
    socket.on('contributions:bulk:created', handleContributionsBulkCreated);
    
    socket.on('member:created', handleMemberCreated);
    socket.on('member:updated', handleMemberUpdated);
    socket.on('member:deleted', handleMemberDeleted);
    socket.on('member:profile:updated', handleMyProfileUpdated);
    socket.on('member:account:deleted', handleMyAccountDeleted);
    
    socket.on('notification', handleNotification);

    // Événements spécifiques au membre connecté
    const memberId = (user as any)?.memberId;
    if (memberId) {
      socket.on(`member:${memberId}:updated`, handleMyProfileUpdated);
      console.log(`🎧 Membre ${memberId} écoute les événements (via room member:${memberId})`);
    }

    return () => {
      socket.off('loan:new', handleLoanNew);
      socket.off('loan:approved', handleLoanApproved);
      socket.off('loan:repaid', handleLoanRepaid);
      socket.off('loan:rejected', handleLoanRejected);
      socket.off('loan:deleted', handleLoanDeleted);
      socket.off('loan:status:changed', handleLoanStatusChanged);
      
      socket.off('contribution:created', handleContributionCreated);
      socket.off('contribution:updated', handleContributionUpdated);
      socket.off('contribution:deleted', handleContributionDeleted);
      socket.off('contributions:bulk:created', handleContributionsBulkCreated);
      
      socket.off('member:created', handleMemberCreated);
      socket.off('member:updated', handleMemberUpdated);
      socket.off('member:deleted', handleMemberDeleted);
      socket.off('member:profile:updated', handleMyProfileUpdated);
      socket.off('member:account:deleted', handleMyAccountDeleted);
      
      socket.off('notification', handleNotification);
    };
  }, [socket, isConnected, user]);

  return {
    isConnected,
    lastUpdate
  };
}; 