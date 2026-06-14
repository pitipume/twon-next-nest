'use client';

import { useState } from 'react';
import { BackButton } from '@/components/ui/back-button';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { User, Mail, Shield, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const router = useRouter();
  const t = useTranslations('profile');

  // Display name edit state
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Password change state
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) router.push('/auth/login');
  }, [user, router]);

  if (!user) return null;

  const roleLabel = t(`roles.${user.role}` as any) ?? user.role;

  function startEditName() {
    setDisplayName(user!.displayName);
    setEditingName(true);
  }

  function cancelEditName() {
    setEditingName(false);
    setDisplayName('');
  }

  async function saveName() {
    const trimmed = displayName.trim();
    if (!trimmed || trimmed === user!.displayName) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      await api.patch('/auth/profile', { displayName: trimmed });
      setUser({ ...user!, displayName: trimmed });
      setEditingName(false);
      toast.success('Display name updated.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to update name.');
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword() {
    if (!currentPassword || !newPassword) return;
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match.");
      return;
    }
    setSavingPassword(true);
    try {
      await api.patch('/auth/profile/password', { currentPassword, newPassword });
      toast.success('Password changed.');
      setChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <BackButton fallback="/" />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t('subtitle')}</p>
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

        {/* Display name row */}
        <div className="px-5 py-4">
          {editingName ? (
            <div className="space-y-3">
              <p className="text-xs text-[var(--muted-foreground)]">{t('displayName')}</p>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') cancelEditName(); }}
                maxLength={50}
                autoFocus
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveName}
                  disabled={savingName}
                  className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
                >
                  {savingName ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={cancelEditName}
                  className="rounded-lg border border-[var(--border)] px-4 py-1.5 text-sm font-medium hover:bg-[var(--muted)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <User size={16} className="shrink-0 text-[var(--muted-foreground)]" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[var(--muted-foreground)]">{t('displayName')}</p>
                <p className="text-sm font-medium truncate">{user.displayName}</p>
              </div>
              <button
                onClick={startEditName}
                className="text-xs text-violet-600 hover:underline shrink-0"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Email row — read only */}
        <div className="flex items-center gap-3 px-5 py-4">
          <Mail size={16} className="shrink-0 text-[var(--muted-foreground)]" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[var(--muted-foreground)]">{t('email')}</p>
            <p className="text-sm font-medium truncate">{user.email}</p>
          </div>
        </div>

        {/* Role row — read only */}
        <div className="flex items-center gap-3 px-5 py-4">
          <Shield size={16} className="shrink-0 text-[var(--muted-foreground)]" />
          <div className="min-w-0">
            <p className="text-xs text-[var(--muted-foreground)]">{t('accountType')}</p>
            <p className="text-sm font-medium">{roleLabel}</p>
          </div>
        </div>

        {/* Password row */}
        <div className="px-5 py-4">
          {changingPassword ? (
            <div className="space-y-3">
              <p className="text-xs text-[var(--muted-foreground)]">{t('changePassword')}</p>

              {/* Current password */}
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm pr-10 outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                >
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* New password */}
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  placeholder="New password (min 8 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm pr-10 outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                >
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Confirm password */}
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
              />

              <div className="flex gap-2">
                <button
                  onClick={savePassword}
                  disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                  className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
                >
                  {savingPassword ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setChangingPassword(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="rounded-lg border border-[var(--border)] px-4 py-1.5 text-sm font-medium hover:bg-[var(--muted)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{t('changePassword')}</p>
              <button
                onClick={() => setChangingPassword(true)}
                className="text-xs text-violet-600 hover:underline"
              >
                Change
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/library"
          className="flex-1 rounded-lg border border-[var(--border)] px-4 py-3 text-center text-sm font-medium hover:bg-[var(--muted)] transition-colors"
        >
          {t('myLibrary')}
        </Link>
      </div>
    </div>
  );
}
