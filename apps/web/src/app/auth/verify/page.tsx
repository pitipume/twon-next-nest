'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';

export default function VerifyPage() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const t = useTranslations('auth.verify');

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(300);
  const [resendCooldown, setResendCooldown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  async function handleResend() {
    const displayName = sessionStorage.getItem('reg_displayName') ?? '';
    if (!displayName) return toast.error('Session expired. Please register again.');
    setResending(true);
    try {
      await api.post('/auth/register/initiate', { email, displayName });
      setOtp(['', '', '', '', '', '']);
      setCountdown(300);
      setResendCooldown(60);
      inputRefs.current[0]?.focus();
      toast.success('New code sent!');
    } catch {
      toast.error('Failed to resend code.');
    } finally {
      setResending(false);
    }
  }

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  function handleChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) return toast.error('Enter the full 6-digit code');
    setLoading(true);
    try {
      const password = sessionStorage.getItem('reg_password') ?? '';
      sessionStorage.removeItem('reg_password');
      const res = await api.post('/auth/register/verify', { email, otp: code, password });
      const { accessToken, user } = res.data.data;
      setAccessToken(accessToken);
      if (user) setUser(user);
      toast.success('Account verified! Welcome to Twon');
      router.push('/');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Invalid OTP.';
      if (message === 'ALREADY_VERIFIED') {
        toast.success('Account already verified — please log in.');
        router.push('/auth/login');
        return;
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {t('subtitle')} <strong>{email}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-2">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="h-12 w-10 rounded-lg border border-[var(--border)] bg-[var(--background)] text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            ))}
          </div>

          <div className="text-center text-sm text-[var(--muted-foreground)]">
            {countdown > 0 ? (
              <span>{t('codeExpires')} {formatTime(countdown)}</span>
            ) : (
              <span className="text-red-500">{t('codeExpired')}</span>
            )}
          </div>

          <Button type="submit" className="w-full" loading={loading} disabled={countdown === 0}>
            {t('submit')}
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--muted-foreground)]">
          {t('noCode')}{' '}
          {resendCooldown > 0 ? (
            <span className="text-[var(--muted-foreground)]">{t('resendIn', { seconds: resendCooldown })}</span>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="font-medium text-violet-600 hover:underline disabled:opacity-50"
            >
              {resending ? t('resending') : t('resend')}
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
