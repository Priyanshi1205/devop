import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export class UserPayload {
  userId: string;
  email: string;
  organizationId: string;
  role: string;
  permissions: string[];
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
