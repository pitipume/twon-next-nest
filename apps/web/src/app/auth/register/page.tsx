'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';

const schema = z
  .object({
    email: z.string().email('Invalid email'),
    displayName: z.string().min(2, 'Name must be at least 2 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations('auth.register');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      await api.post('/auth/register/initiate', {
        email: data.email,
        displayName: data.displayName,
      });
      sessionStorage.setItem('reg_password', data.password);
      sessionStorage.setItem('reg_displayName', data.displayName);
      toast.success('OTP sent to your email!');
      router.push(`/auth/verify?email=${encodeURIComponent(data.email)}`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Registration failed.';
      toast.error(message);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-8 overflow-y-auto">
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
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            id="displayName"
            label={t('displayName')}
            placeholder="Your name"
            error={errors.displayName?.message}
            {...register('displayName')}
          />
          <PasswordInput
            id="password"
            label={t('password')}
            placeholder="Min 8 characters"
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordInput
            id="confirmPassword"
            label={t('confirmPassword')}
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          <Button type="submit" className="w-full" loading={isSubmitting}>
            {t('submit')}
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--muted-foreground)]">
          {t('hasAccount')}{' '}
          <Link href="/auth/login" className="font-medium text-violet-600 hover:underline">
            {t('signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
