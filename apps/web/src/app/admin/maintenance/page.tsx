'use client';

import { useState } from 'react';
import { BackButton } from '@/components/ui/back-button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageSpinner } from '@/components/ui/spinner';

interface MaintenanceConfig {
  enabled: boolean;
  backByAt: string | null;
}

export default function MaintenancePage() {
  const qc = useQueryClient();
  const [backByInput, setBackByInput] = useState('');
  const [toggling, setToggling] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ['maintenance-config'],
    queryFn: async () => {
      const res = await api.get('/admin/maintenance-config');
      return res.data.data as MaintenanceConfig;
    },
  });

  async function toggleMaintenance() {
    const enabling = !config?.enabled;
    setToggling(true);
    try {
      await api.put('/admin/maintenance-config', {
        enabled: enabling,
        backByAt: enabling && backByInput ? new Date(backByInput).toISOString() : null,
      });
      toast.success(enabling ? 'Maintenance mode enabled.' : 'Maintenance mode disabled.');
      setBackByInput('');
      qc.invalidateQueries({ queryKey: ['maintenance-config'] });
    } catch {
      toast.error('Failed to update maintenance mode.');
    } finally {
      setToggling(false);
    }
  }

  if (isLoading) return <PageSpinner />;

  return (
    <div className="mx-auto max-w-lg px-4 py-10 space-y-8">
      <BackButton fallback="/admin" />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Maintenance mode</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Close the site to everyone except ADMIN</p>
      </div>

      <div className="space-y-3 rounded-xl border border-[var(--border)] p-4">
        <p className="text-sm">
          {config?.enabled ? (
            <span className="font-medium text-red-500">The site is currently closed to everyone except ADMIN.</span>
          ) : (
            'Closes the site to everyone except ADMIN, showing a maintenance message instead.'
          )}
        </p>

        {!config?.enabled && (
          <Input
            label="Back by (optional)"
            type="datetime-local"
            value={backByInput}
            onChange={(e) => setBackByInput(e.target.value)}
          />
        )}

        <Button
          variant={config?.enabled ? 'danger' : 'primary'}
          className="w-full"
          loading={toggling}
          onClick={toggleMaintenance}
        >
          {config?.enabled ? 'Disable maintenance mode' : 'Enable maintenance mode'}
        </Button>
      </div>
    </div>
  );
}
