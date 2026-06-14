// Feature flags — controlled via environment variables.
// Default to false (off) so new features must be explicitly enabled.
export const Features = {
  etarot: process.env.FEATURE_ETAROT_ENABLED === 'true',
  emailOtp: process.env.FEATURE_EMAIL_OTP_ENABLED === 'true',
} as const;
