'use client';

import { useState } from 'react';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';

const ROLES = ['CUSTOMER', 'PREMIUM', 'MERCHANT', 'ADMIN'] as const;
type Role = typeof ROLES[number];

const ROLE_BADGE: Record<Role, string> = {
  CUSTOMER: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  PREMIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  MERCHANT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  ADMIN: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
};

interface UserResult {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  createdAt: string;
}

export default function UserManagementPage() {
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [user, setUser] = useState<UserResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>('CUSTOMER');
  const [saving, setSaving] = useState(false);

  async function search() {
    if (!email.trim()) return;
    setSearching(true);
    setUser(null);
    setNotFound(false);
    try {
      const res = await api.get(`/admin/users/search?email=${encodeURIComponent(email.trim())}`);
      if (res.data?.data) {
        setUser(res.data.data);
        setSelectedRole(res.data.data.role);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setSearching(false);
    }
  }

  async function saveRole() {
    if (!user || selectedRole === user.role) return;
    setSaving(true);
    try {
      const res = await api.patch('/admin/users/role', { userId: user.id, role: selectedRole });
      if (res.data?.data) {
        setUser(res.data.data);
        toast.success(`${user.displayName} is now ${selectedRole}`);
      } else {
        toast.error(res.data?.message ?? 'Failed to update role.');
      }
    } catch {
      toast.error('Failed to update role.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 space-y-8">
      <BackButton fallback="/admin" />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Search by email to view or change a user's role</p>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="user@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setUser(null); setNotFound(false); }}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          className="flex-1"
        />
        <Button loading={searching} onClick={search} className="shrink-0">
          Search
        </Button>
      </div>

      {notFound && (
        <p className="text-sm text-[var(--muted-foreground)] text-center py-6">No user found with that email.</p>
      )}

      {/* User card */}
      {user && (
        <div className="rounded-xl border border-[var(--border)] p-5 space-y-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold">{user.displayName}</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE[user.role]}`}>
                {user.role}
              </span>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">{user.email}</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Joined {new Date(user.createdAt).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Change role</p>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    selectedRole === role
                      ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                      : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-violet-300'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full"
            loading={saving}
            disabled={selectedRole === user.role}
            onClick={saveRole}
          >
            {selectedRole === user.role ? 'No change' : `Set as ${selectedRole}`}
          </Button>
        </div>
      )}
    </div>
  );
}
