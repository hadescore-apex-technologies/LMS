import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { Bell, Check, RefreshCw, Loader2, Trash2 } from 'lucide-react';

interface Notification {
  id: number;
  verb: string;
  is_read: boolean;
  timestamp: string;
}

export const NotificationsTab: React.FC = () => {
  const queryClient = useQueryClient();

  // 1. Fetch Notifications
  const { data: alerts = [], isLoading, refetch } = useQuery<Notification[]>({
    queryKey: ['notifications-alerts-list'],
    placeholderData: (prev) => prev,
    refetchInterval: 8000,
    queryFn: async () => {
      const res = await api.get('notifications/');
      return res.data;
    }
  });

  // Mark all read Mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.post('notifications/mark-all-read/');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-alerts-list'] });
      toast.success('All alerts marked as read.');
    }
  });

  // Mark single notification read
  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`notifications/${id}/mark-read/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-alerts-list'] });
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`notifications/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-alerts-list'] });
      toast.success('Alert logs removed.');
    }
  });

  return (
    <div className="space-y-6 text-xs max-w-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Notification Alerts</h1>
          <p className="text-muted-foreground text-sm mt-1">Review programmatic updates, task submissions, and system warning logs.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-2 bg-muted hover:bg-muted/80 rounded-xl border border-border"><RefreshCw size={13} /></button>
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={alerts.filter(a => !a.is_read).length === 0}
            className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground font-bold rounded-xl shadow disabled:opacity-50"
          >
            <Check size={13} />
            <span>Mark All Read</span>
          </button>
        </div>
      </div>

      {/* Notifications list */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        
          <div className="divide-y divide-border">
            {alerts.map(alert => (
              <div key={alert.id} className={`p-4 flex items-center justify-between gap-4 transition-colors ${alert.is_read ? 'bg-card' : 'bg-primary/5'}`}>
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`p-2 rounded-xl mt-0.5 ${alert.is_read ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary animate-pulse'}`}>
                    <Bell size={14} />
                  </div>
                  <div>
                    <p className={`text-xs ${alert.is_read ? 'text-muted-foreground' : 'text-foreground font-semibold leading-relaxed'}`}>{alert.verb}</p>
                    <span className="text-[9px] text-muted-foreground mt-0.5 block">{new Date(alert.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!alert.is_read && (
                    <button onClick={() => markReadMutation.mutate(alert.id)} className="p-1.5 bg-muted hover:bg-primary hover:text-primary-foreground rounded-lg transition-all" title="Mark read">
                      <Check size={12} />
                    </button>
                  )}
                  <button onClick={() => deleteNotificationMutation.mutate(alert.id)} className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-all" title="Delete">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="py-12 text-center text-muted-foreground font-medium">
                No alerts or warning logs on record.
              </div>
            )}
          </div>
      </div>
    </div>
  );
};
export default NotificationsTab;
