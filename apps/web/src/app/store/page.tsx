'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';

export default function StorePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user === null) router.push('/auth/login');
    else if (user && user.role !== 'MERCHANT' && user.role !== 'ADMIN') router.push('/');
  }, [user, router]);

  if (!user || (user.role !== 'MERCHANT' && user.role !== 'ADMIN')) return null;

  const links = [
    { href: '/store/upload', label: 'Upload content', emoji: '📤', desc: 'Add ebooks or tarot decks' },
    { href: '/store/products', label: 'My products', emoji: '📦', desc: 'Publish, unpublish or delete your products' },
    { href: '/store/sales', label: 'Sales history', emoji: '📖', desc: 'Who bought your products, and when' },
    { href: '/store/earnings', label: 'My earnings', emoji: '💰', desc: 'Sales, commission & net payout' },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">My Store</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Manage your products and track earnings</p>
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
