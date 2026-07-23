import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoginRequestDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { RoleType } from '@prisma/client';
import * as crypto from 'crypto';
import { Resend } from 'resend';

@Injectable()
export class AuthService {
  private resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginRequestDto) {
    const t0 = performance.now();
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
    const t1 = performance.now();
    console.log(`[Login Timing] prisma.user.findUnique: ${(t1 - t0).toFixed(2)} ms`);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const t2 = performance.now();
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    const t3 = performance.now();
    console.log(`[Login Timing] bcrypt.compare: ${(t3 - t2).toFixed(2)} ms`);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email first. Check your inbox.');
    }

    const permissions = user.role.permissions.map((rp) => rp.permission.action);

    const payload = {
      sub: user.id,
      email: user.email,
      orgId: user.organizationId,
      role: user.role.name,
      permissions,
    };

    const t4 = performance.now();
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign({ sub: user.id }, { expiresIn: '7d' });
    const t5 = performance.now();
    console.log(`[Login Timing] jwt signing: ${(t5 - t4).toFixed(2)} ms`);

    // Store refresh token hash (SHA-256)
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const t6 = performance.now();
    await this.prisma.userRefreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
    const t7 = performance.now();
    console.log(`[Login Timing] prisma.userRefreshToken.create: ${(t7 - t6).toFixed(2)} ms`);
    console.log(`[Login Timing] Total login time: ${(t7 - t0).toFixed(2)} ms`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role.name,
        isEmailVerified: user.isEmailVerified,
        subscription: {
          plan: user.plan,
          status: user.subscriptionStatus,
          trialEndDate: user.trialEndDate,
          paid: user.plan !== 'free_trial'
        }
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const userId = payload.sub;

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Refresh Token Rotation (RTR) using SHA-256
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      
      const matchedToken = await this.prisma.userRefreshToken.findFirst({
        where: { userId, tokenHash },
      });

      if (!matchedToken) {
        throw new UnauthorizedException('Invalid refresh token.');
      }

      if (matchedToken.isRevoked || matchedToken.expiresAt.getTime() <= Date.now()) {
        // Potential breach - revoke all tokens for security
        await this.prisma.userRefreshToken.updateMany({
          where: { userId },
          data: { isRevoked: true },
        });
        throw new UnauthorizedException('Invalid or expired refresh token. Sessions revoked.');
      }

      // Revoke the old token
      await this.prisma.userRefreshToken.update({
        where: { id: matchedToken.id },
        data: { isRevoked: true },
      });

      // Issue new ones
      const permissions = user.role.permissions.map((rp) => rp.permission.action);
      const newPayload = {
        sub: user.id,
        email: user.email,
        orgId: user.organizationId,
        role: user.role.name,
        permissions,
      };

      const accessToken = this.jwtService.sign(newPayload, { expiresIn: '15m' });
      const newRefreshToken = this.jwtService.sign({ sub: user.id }, { expiresIn: '7d' });

      const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

      await this.prisma.userRefreshToken.create({
        data: {
          userId: user.id,
          tokenHash: newTokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (e) {
      if (e instanceof UnauthorizedException) {
        throw e;
      }
      throw new UnauthorizedException('Invalid refresh token signature');
    }
  }

  async register(registerDto: any) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(registerDto.password, salt);

    // Create Organization
    const organization = await this.prisma.organization.create({
      data: {
        name: registerDto.organizationName,
      },
    });

    // Find OWNER role
    let ownerRole = await this.prisma.role.findUnique({
      where: { name: RoleType.OWNER },
    });

    if (!ownerRole) {
      ownerRole = await this.prisma.role.create({
        data: {
          name: RoleType.OWNER,
          description: 'Super Administrator and Agency Owner',
        },
      });
    }

    // Create verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create User with trial subscription fields
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        organizationId: organization.id,
        roleId: ownerRole.id,
        isEmailVerified: false,
        emailVerificationToken,
        plan: 'free_trial',
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
        subscriptionStatus: 'trial',
      },
    });

    // Create a default project for the new organization
    await this.prisma.project.create({
      data: {
        name: 'Default Project',
        description: 'First default SEO campaign',
        organizationId: organization.id,
      },
    });

    const verificationLink = `http://localhost:3000/verify-email?token=${emailVerificationToken}`;

    // Send verification email using Resend
    try {
      await this.resend.emails.send({
        from: 'onboarding@resend.dev',
        to: registerDto.email,
        subject: 'Verify your Optimora AI account',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-lg;">
            <h2 style="color: #4f46e5; margin-bottom: 20px;">Welcome to Optimora AI!</h2>
            <p>Thank you for signing up. Please verify your email address to access your SEO dashboards:</p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${verificationLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Verify Email Address</a>
            </div>
            <p style="color: #64748b; font-size: 14px;">If you cannot click the button above, copy and paste this URL into your browser:</p>
            <p style="color: #64748b; font-size: 14px; word-break: break-all;">${verificationLink}</p>
          </div>
        `,
      });
      console.log(`Verification email successfully sent via Resend to ${registerDto.email}`);
    } catch (emailErr) {
      console.error('Failed to send verification email via Resend:', emailErr);
    }

    // Print verification link to console logs (simulating SMTP dispatch fallback)
    console.log(`\n--- EMAIL VERIFICATION LINK ---`);
    console.log(`User: ${user.email}`);
    console.log(`Link: ${verificationLink}`);
    console.log(`--------------------------------\n`);

    return {
      message: 'Registration successful. Please check your email to verify your account.',
      emailVerificationToken,
      verificationLink,
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return {
        message: 'If the email exists in our system, a password reset link has been generated.',
      };
    }

    const resetToken = this.jwtService.sign(
      { email, type: 'reset' },
      { expiresIn: '1h' },
    );

    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;
    console.log(`\n--- PASSWORD RESET REQUEST ---`);
    console.log(`User: ${email}`);
    console.log(`Link: ${resetLink}`);
    console.log(`------------------------------\n`);

    return {
      message: 'Reset link generated successfully.',
      resetToken,
      resetLink,
    };
  }

  async resetPassword(resetDto: any) {
    try {
      const payload = this.jwtService.verify(resetDto.token);
      
      if (payload.type !== 'reset') {
        throw new BadRequestException('Invalid reset token type');
      }

      const email = payload.email;
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Hash new password
      const salt = await bcrypt.genSalt();
      const passwordHash = await bcrypt.hash(resetDto.password, salt);

      // Update password
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      // Revoke all existing sessions
      await this.prisma.userRefreshToken.updateMany({
        where: { userId: user.id },
        data: { isRevoked: true },
      });

      return {
        message: 'Password reset successfully. Please log in with your new password.',
      };
    } catch (err) {
      throw new BadRequestException(err.message || 'Invalid or expired password reset token');
    }
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: token },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Update user status
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
      },
    });

    // Generate login session directly
    const permissions = user.role.permissions.map((rp) => rp.permission.action);
    const payload = {
      sub: user.id,
      email: user.email,
      orgId: user.organizationId,
      role: user.role.name,
      permissions,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign({ sub: user.id }, { expiresIn: '7d' });

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.prisma.userRefreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role.name,
        isEmailVerified: true,
        subscription: {
          plan: user.plan,
          status: user.subscriptionStatus,
          trialEndDate: user.trialEndDate,
          paid: user.plan !== 'free_trial'
        }
      },
    };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationToken },
    });

    const verificationLink = `http://localhost:3000/verify-email?token=${emailVerificationToken}`;

    try {
      await this.resend.emails.send({
        from: 'onboarding@resend.dev',
        to: user.email,
        subject: 'Verify your Optimora AI account',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-lg;">
            <h2 style="color: #4f46e5; margin-bottom: 20px;">Verify your Optimora AI Account</h2>
            <p>You requested a new verification link. Please click the button below to verify your email address:</p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${verificationLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Verify Email Address</a>
            </div>
            <p style="color: #64748b; font-size: 14px;">If you cannot click the button above, copy and paste this URL into your browser:</p>
            <p style="color: #64748b; font-size: 14px; word-break: break-all;">${verificationLink}</p>
          </div>
        `,
      });
      console.log(`Verification email successfully resent via Resend to ${user.email}`);
    } catch (emailErr) {
      console.error('Failed to resend verification email via Resend:', emailErr);
    }

    // Print verification link to console logs (simulating SMTP dispatch fallback)
    console.log(`\n--- EMAIL VERIFICATION LINK (RESENT) ---`);
    console.log(`User: ${user.email}`);
    console.log(`Link: ${verificationLink}`);
    console.log(`--------------------------------\n`);

    return {
      message: 'Verification email resent successfully. Please check your inbox.',
      verificationLink,
    };
  }
}
