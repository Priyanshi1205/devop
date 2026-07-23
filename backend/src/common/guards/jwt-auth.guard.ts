import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const path = request.path || request.url;
    if (path && (path.includes('/websites/google/oauth/callback') || path.includes('/config/google'))) {
      return true;
    }
    return super.canActivate(context);
  }
}

