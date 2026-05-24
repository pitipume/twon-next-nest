'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const t = useTranslations('auth.login');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      const res = await api.post('/auth/login', data);
      const { accessToken, user } = res.data.data;
      setAccessToken(accessToken);
      if (user) setUser(user);
      toast.success(`Welcome back, ${user?.displayName ?? 'friend'}!`);
      router.push('/');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Login failed.';
      toast.error(message);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">{t('subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="email"
            label={t('email')}
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <div className="space-y-1">
            <Input
              id="password"
              label={t('password')}
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <div className="text-right">
              <Link href="/auth/forgot-password" className="text-xs text-[var(--muted-foreground)] hover:text-violet-600 hover:underline">
                {t('forgotPassword')}
              </Link>
            </div>
          </div>
          <Button type="submit" className="w-full" loading={isSubmitting}>
            {t('submit')}
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--muted-foreground)]">
          {t('noAccount')}{' '}
          <Link href="/auth/register" className="font-medium text-violet-600 hover:underline">
            {t('register')}
          </Link>
        </p>
      </div>
    </div>
  );
}
