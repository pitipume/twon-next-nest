'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';

export default function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user === null) router.push('/auth/login');
    else if (user?.role === 'MERCHANT') router.push('/store');
    else if (user && user.role !== 'ADMIN') router.push('/');
  }, [user, router]);

  if (!user || user.role !== 'ADMIN') return null;

  const links = [
    { href: '/admin/orders', label: 'Pending payments', emoji: '🧾', desc: 'Approve or reject payment slips' },
    { href: '/admin/sales', label: 'Sales history', emoji: '📖', desc: 'Every completed sale, who bought what' },
    { href: '/admin/config', label: 'Payment config', emoji: '🏦', desc: 'Set bank details & QR code' },
    { href: '/admin/users', label: 'Users', emoji: '👥', desc: 'Search users and manage roles' },
    { href: '/admin/maintenance', label: 'Maintenance', emoji: '🚧', desc: 'Close the site to everyone except ADMIN' },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Admin Panel</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Manage the Twon platform</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-start gap-4 rounded-xl border border-[var(--border)] p-5 transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            <span className="text-3xl">{link.emoji}</span>
            <div>
              <p className="font-medium">{link.label}</p>
              <p className="text-sm text-[var(--muted-foreground)]">{link.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
