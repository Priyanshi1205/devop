import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UserPayload } from '../decorators/current-user.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const path = request.path || request.url;
    if (path && (path.includes('/config/google') || path.includes('/websites/google/oauth/callback'))) {
      return true;
    }

    const { user }: { user: UserPayload } = request;
    if (!user) {
      throw new ForbiddenException('User session context not found');
    }

    // OWNER has override permissions for all resources within the organization
    if (user.role === 'OWNER') {
      return true;
    }

    const hasPermission = requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have the required permissions to access this resource');
    }

    return true;
  }
}
