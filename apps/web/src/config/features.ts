// Feature flags — must be prefixed NEXT_PUBLIC_ to reach the browser.
// Default to false (off) so features must be explicitly enabled.
export const Features = {
  etarot: process.env.NEXT_PUBLIC_FEATURE_ETAROT_ENABLED === 'true',
  emailOtp: process.env.NEXT_PUBLIC_FEATURE_EMAIL_OTP_ENABLED === 'true',
  googleAuth: process.env.NEXT_PUBLIC_FEATURE_GOOGLE_AUTH_ENABLED === 'true',
} as const;
