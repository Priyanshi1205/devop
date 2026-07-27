import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserPayload } from '../decorators/current-user.decorator';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const { user }: { user: UserPayload } = request;
    
    if (!user) {
      throw new ForbiddenException('User session context not found.');
    }

    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required.');
    }

    return true;
  }
}
