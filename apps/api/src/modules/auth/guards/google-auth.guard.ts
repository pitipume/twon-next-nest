import { ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Features } from '../../../config/features';

/**
 * GoogleAuthGuard — gates both /auth/google and /auth/google/callback behind
 * FEATURE_GOOGLE_AUTH_ENABLED before ever touching the passport-google strategy.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  canActivate(context: ExecutionContext) {
    if (!Features.googleAuth) {
      throw new NotFoundException();
    }
    return super.canActivate(context);
  }
}
