import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptions, VerifyCallback, Profile } from 'passport-google-oauth20';

export interface GoogleProfile {
  googleId: string;
  email: string;
  displayName: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    // Falls back to placeholders instead of throwing so the app can still boot
    // when Google auth hasn't been configured yet — the route itself is gated
    // by FEATURE_GOOGLE_AUTH_ENABLED in GoogleAuthGuard.
    // Uses `||` rather than ConfigService's default param — an empty string
    // (e.g. a blank value copied from .env.example) is still "present" to
    // .get(), so only `||` correctly treats it as unconfigured.
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || 'not-configured',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') || 'not-configured',
      callbackURL:
        config.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:3001/api/auth/google/callback',
      scope: ['email', 'profile'],
    } satisfies StrategyOptions);
  }

  // Return value is attached to req.user by Passport
  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('Google account has no email'), false);
      return;
    }

    const googleProfile: GoogleProfile = {
      googleId: profile.id,
      email,
      displayName: profile.displayName || email.split('@')[0],
    };
    done(null, googleProfile);
  }
}
