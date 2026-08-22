import { createRequire } from "node:module";
import argon2 from "argon2";
import type { FastifyInstance } from "fastify";
import type { JwtPayload } from "jsonwebtoken";
import {
  emailAlreadyRegisteredError,
  invalidCredentialsError,
  tenantAccessRequiredError,
  unauthorizedError
} from "./auth.errors.js";
import type { LoginBody, RegisterBody } from "./auth.schemas.js";
import {
  type PublicTenant,
  type PublicUser,
  toPublicTenant,
  toPublicUser,
  type UserRepository
} from "./user.repository.js";

const accessTokenExpiresIn = "15m";
const refreshTokenExpiresIn = "7d";
const refreshCookieName = "brm_refresh_token";
const require = createRequire(import.meta.url);
const jwt = require("jsonwebtoken") as typeof import("jsonwebtoken");

type JwtSigner = {
  sign: FastifyInstance["jwt"]["sign"];
};

type RefreshPayload = {
  sub: string;
  type: "refresh";
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResult = {
  user: PublicUser;
  tenant: PublicTenant;
  tokens: AuthTokens;
};

export type AuthSession = {
  user: PublicUser;
  tenant: PublicTenant;
};

export type AuthServiceOptions = {
  userRepository: UserRepository;
  jwt: JwtSigner;
  refreshSecret: string;
  secureCookies: boolean;
  refreshCookieSameSite: "lax" | "none";
};

export class AuthService {
  constructor(private readonly options: AuthServiceOptions) {}

  get refreshCookieName(): string {
    return refreshCookieName;
  }

  get refreshCookieOptions() {
    return {
      httpOnly: true,
      secure: this.options.secureCookies,
      sameSite: this.options.refreshCookieSameSite,
      path: "/auth",
      maxAge: 7 * 24 * 60 * 60
    };
  }

  get clearRefreshCookieOptions() {
    return {
      httpOnly: true,
      secure: this.options.secureCookies,
      sameSite: this.options.refreshCookieSameSite,
      path: "/auth"
    };
  }

  async register(input: RegisterBody): Promise<AuthResult> {
    const existingUser = await this.options.userRepository.findByEmail(input.email);

    if (existingUser) {
      throw emailAlreadyRegisteredError();
    }

    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id
    });

    const { user, tenant } = await this.options.userRepository.createWithInitialTenant({
      name: input.name,
      email: input.email,
      passwordHash
    });

    return {
      user: toPublicUser(user),
      tenant: toPublicTenant(tenant),
      tokens: this.createTokens(user.id)
    };
  }

  async login(input: LoginBody): Promise<AuthResult> {
    const user = await this.options.userRepository.findByEmail(input.email);

    if (!user) {
      throw invalidCredentialsError();
    }

    const passwordMatches = await argon2.verify(user.passwordHash, input.password);

    if (!passwordMatches) {
      throw invalidCredentialsError();
    }

    return {
      user: toPublicUser(user),
      tenant: await this.getPublicTenantForUser(user.id),
      tokens: this.createTokens(user.id)
    };
  }

  async refresh(refreshToken: string | undefined): Promise<AuthResult> {
    if (!refreshToken) {
      throw unauthorizedError();
    }

    const payload = this.verifyRefreshToken(refreshToken);
    const user = await this.options.userRepository.findById(payload.sub);

    if (!user) {
      throw unauthorizedError();
    }

    return {
      user: toPublicUser(user),
      tenant: await this.getPublicTenantForUser(user.id),
      tokens: this.createTokens(user.id)
    };
  }

  async getCurrentSession(userId: string): Promise<AuthSession> {
    const user = await this.options.userRepository.findById(userId);

    if (!user) {
      throw unauthorizedError();
    }

    return {
      user: toPublicUser(user),
      tenant: await this.getPublicTenantForUser(user.id)
    };
  }

  private createTokens(userId: string): AuthTokens {
    return {
      accessToken: this.options.jwt.sign(
        { type: "access", sub: userId },
        {
          expiresIn: accessTokenExpiresIn
        }
      ),
      refreshToken: jwt.sign(
        { type: "refresh" },
        this.options.refreshSecret,
        {
          subject: userId,
          expiresIn: refreshTokenExpiresIn
        }
      )
    };
  }

  private verifyRefreshToken(refreshToken: string): RefreshPayload {
    try {
      const payload = jwt.verify(refreshToken, this.options.refreshSecret) as JwtPayload;

      if (
        typeof payload !== "object" ||
        typeof payload.sub !== "string" ||
        payload.type !== "refresh"
      ) {
        throw unauthorizedError();
      }

      return {
        sub: payload.sub,
        type: "refresh"
      };
    } catch {
      throw unauthorizedError();
    }
  }

  private async getPublicTenantForUser(userId: string): Promise<PublicTenant> {
    const tenant = await this.options.userRepository.findPrimaryTenantForUser(userId);

    if (!tenant) {
      throw tenantAccessRequiredError();
    }

    return toPublicTenant(tenant);
  }
}
