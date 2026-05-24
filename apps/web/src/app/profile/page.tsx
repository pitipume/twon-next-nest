'use client';

import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { User, Mail, Shield } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: 'Customer',
  PREMIUM: 'Premium',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'Super Admin',
};

export default function ProfilePage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push('/auth/login');
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Your account details</p>
      </div>

      {/* Avatar + name */}
      <div className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--muted)] p-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 text-xl font-bold">
          {user.displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-lg">{user.displayName}</p>
          <p className="text-sm text-[var(--muted-foreground)]">{user.email}</p>
        </div>
      </div>

      {/* Info rows */}
      <div className="rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
        <div className="flex items-center gap-3 px-5 py-4">
          <User size={16} className="shrink-0 text-[var(--muted-foreground)]" />
          <div className="min-w-0">
            <p className="text-xs text-[var(--muted-foreground)]">Display name</p>
            <p className="text-sm font-medium truncate">{user.displayName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-4">
          <Mail size={16} className="shrink-0 text-[var(--muted-foreground)]" />
          <div className="min-w-0">
            <p className="text-xs text-[var(--muted-foreground)]">Email</p>
            <p className="text-sm font-medium truncate">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-4">
          <Shield size={16} className="shrink-0 text-[var(--muted-foreground)]" />
          <div className="min-w-0">
            <p className="text-xs text-[var(--muted-foreground)]">Account type</p>
            <p className="text-sm font-medium">{ROLE_LABELS[user.role] ?? user.role}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/library"
          className="flex-1 rounded-lg border border-[var(--border)] px-4 py-3 text-center text-sm font-medium hover:bg-[var(--muted)] transition-colors"
        >
          My Library
        </Link>
        <Link
          href="/auth/forgot-password"
          className="flex-1 rounded-lg border border-[var(--border)] px-4 py-3 text-center text-sm font-medium hover:bg-[var(--muted)] transition-colors"
        >
          Change password
        </Link>
      </div>
    </div>
  );
}
