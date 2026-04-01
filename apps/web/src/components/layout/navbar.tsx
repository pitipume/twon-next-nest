'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

export function Navbar() {
  const { user, clear } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      await api.post('/auth/logout');
    } finally {
      clear();
      router.push('/auth/login');
    }
  }

  const navLinks = [
    { href: '/', label: 'Catalog' },
    ...(user ? [{ href: '/library', label: 'My Library' }] : []),
    ...(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
      ? [{ href: '/admin', label: 'Admin' }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="text-xl">✦</span>
          <span>Twon</span>
        </Link>

        {/* Nav links */}
        <div className="hidden items-center gap-1 sm:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-[var(--muted)]',
                pathname === link.href
                  ? 'font-medium text-[var(--foreground)]'
                  : 'text-[var(--muted-foreground)]',
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Auth */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden text-sm text-[var(--muted-foreground)] sm:inline">
                {user.displayName}
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => router.push('/auth/login')}>
                Sign in
              </Button>
              <Button size="sm" onClick={() => router.push('/auth/register')}>
                Register
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
