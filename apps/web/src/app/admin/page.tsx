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
    else if (user && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      router.push('/');
    }
  }, [user, router]);

  if (!user) return null;

  const links = [
    { href: '/admin/upload', label: 'Upload content', emoji: '📤', desc: 'Add ebooks or tarot decks' },
    { href: '/admin/orders', label: 'Pending payments', emoji: '🧾', desc: 'Approve or reject payment slips' },
    { href: '/admin/config', label: 'Payment config', emoji: '🏦', desc: 'Set bank details & QR code' },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Manage your Twon store</p>
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
