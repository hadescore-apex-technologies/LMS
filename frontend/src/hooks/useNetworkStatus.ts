import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Network reconnected! Synchronizing data...', {
        id: 'network-status',
        duration: 3000,
        icon: '⚡',
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Network connection lost. Retrying in background...', {
        id: 'network-status',
        duration: 5000,
        icon: '📡',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};
