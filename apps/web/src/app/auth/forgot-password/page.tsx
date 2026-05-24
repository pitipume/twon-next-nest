'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const schema = z.object({
  email: z.string().email('Invalid email'),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      await api.post('/auth/forgot-password', { email: data.email });
      toast.success('Reset code sent — check your email');
      router.push(`/auth/reset-password?email=${encodeURIComponent(data.email)}`);
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Forgot password?</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Enter your email and we&apos;ll send a reset code
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Send reset code
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--muted-foreground)]">
          Remember your password?{' '}
          <Link href="/auth/login" className="font-medium text-violet-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
