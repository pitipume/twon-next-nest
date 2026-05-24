'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LocaleToggle } from '@/components/ui/locale-toggle';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

export function Navbar() {
  const { user, clear } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations('nav');

  async function handleLogout() {
    try {
      await api.post('/auth/logout');
    } finally {
      clear();
      setMobileOpen(false);
      router.push('/auth/login');
    }
  }

  const navLinks = [
    { href: '/', label: t('catalog') },
    ...(user ? [{ href: '/library', label: t('library') }] : []),
    ...(user ? [{ href: '/profile', label: t('profile') }] : []),
    ...(user?.role === 'MERCHANT' || user?.role === 'ADMIN'
      ? [{ href: '/admin', label: t('admin') }]
      : []),
  ];

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
          onClick={() => setMobileOpen(false)}
        >
          <span className="text-xl">✦</span>
          <span>Twon</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-[var(--muted)]',
                isActive(link.href)
                  ? 'font-medium text-[var(--foreground)]'
                  : 'text-[var(--muted-foreground)]',
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop right side */}
        <div className="hidden items-center gap-2 md:flex">
          <LocaleToggle />
          <ThemeToggle />
          {user ? (
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              {t('signOut')}
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => router.push('/auth/login')}>
                {t('signIn')}
              </Button>
              <Button size="sm" onClick={() => router.push('/auth/register')}>
                {t('register')}
              </Button>
            </>
          )}
        </div>

        {/* Mobile: toggles + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <LocaleToggle />
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="rounded-md p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-[var(--border)] bg-[var(--background)] px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-[var(--muted)]',
                  isActive(link.href)
                    ? 'font-medium text-[var(--foreground)]'
                    : 'text-[var(--muted-foreground)]',
                )}
              >
                {link.label}
              </Link>
            ))}

            <div className="mt-3 border-t border-[var(--border)] pt-3 flex flex-col gap-2">
              {user ? (
                <>
                  <p className="px-3 text-xs text-[var(--muted-foreground)]">{user.email}</p>
                  <Button variant="ghost" size="sm" className="justify-start" onClick={handleLogout}>
                    {t('signOut')}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() => { router.push('/auth/login'); setMobileOpen(false); }}
                  >
                    {t('signIn')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => { router.push('/auth/register'); setMobileOpen(false); }}
                  >
                    {t('register')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
