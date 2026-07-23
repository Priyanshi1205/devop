import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { UserPayload } from '../decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'fallbackLocalSecretKey123',
    });
  }

  async validate(payload: any): Promise<UserPayload> {
    return {
      userId: payload.sub,
      email: payload.email,
      organizationId: payload.orgId,
      role: payload.role,
      permissions: payload.permissions || [],
    };
  }
}
