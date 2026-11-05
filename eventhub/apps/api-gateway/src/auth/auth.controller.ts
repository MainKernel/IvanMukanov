import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import type {
  AuthResponse,
  GoogleLinkResponse,
  RefreshResponse,
  UserDto,
} from "@eventhub/contracts";
import { env } from "../common/config/env";
import {
  InvalidRefreshToken,
  OAuthStateMismatch,
} from "../common/problem/domain-errors";
import { toProblem } from "../common/problem/problem";
import { LoginBodyDto, RegisterBodyDto } from "./auth.dto";
import { AuthService, type UserWithOAuth } from "./auth.service";
import { CurrentUser, type AuthUser } from "./current-user.decorator";
import {
  GoogleOAuthService,
  type OAuthFlowState,
} from "./google-oauth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { TokensService } from "./tokens.service";

const REFRESH_COOKIE = "refreshToken";
const OAUTH_FLOW_COOKIE = "oauthFlow";

/**
 * Доменний мапер користувача: ніколи не випускає passwordHash назовні.
 */
export function toUserDto(user: UserWithOAuth): UserDto {
  const googleLinked = Boolean(
    user.oauthAccounts?.some((a) => a.provider === "google"),
  );
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    googleLinked,
  };
}

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/auth",
    maxAge: env.REFRESH_TTL_DAYS * 86_400_000,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/auth",
  });
}

function setOAuthCookie(res: Response, flow: OAuthFlowState): void {
  const encoded = Buffer.from(JSON.stringify(flow), "utf8").toString(
    "base64url",
  );
  res.cookie(OAUTH_FLOW_COOKIE, encoded, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax", // ← УВАГА: Lax, а не Strict (повернення з accounts.google.com)
    path: "/auth",
    maxAge: 10 * 60 * 1000,
  });
}

function readOAuthCookie(req: Request): OAuthFlowState | null {
  const raw = (req.cookies as Record<string, string | undefined> | undefined)?.[
    OAUTH_FLOW_COOKIE
  ];
  if (!raw) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as OAuthFlowState;
    if (!parsed.state || !parsed.verifier || !parsed.nonce) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearOAuthCookie(res: Response): void {
  res.clearCookie(OAUTH_FLOW_COOKIE, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth",
  });
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokensService,
    private readonly google: GoogleOAuthService,
  ) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() body: RegisterBodyDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const { accessToken, refreshToken, user } = await this.auth.register(body);
    setRefreshCookie(res, refreshToken);
    return { accessToken, user: toUserDto(user) };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginBodyDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const { accessToken, refreshToken, user } = await this.auth.login(body);
    setRefreshCookie(res, refreshToken);
    return { accessToken, user: toUserDto(user) };
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshResponse> {
    const raw = (req.cookies as Record<string, string | undefined> | undefined)?.[
      REFRESH_COOKIE
    ];
    if (!raw) throw new InvalidRefreshToken();

    const { accessToken, refreshToken } = await this.tokens.rotate(raw);
    setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const raw = (req.cookies as Record<string, string | undefined> | undefined)?.[
      REFRESH_COOKIE
    ];
    await this.tokens.revokeByRaw(raw);
    clearRefreshCookie(res);
  }

  /**
   * ДЗ ЛР №5 (п. 1): Вихід з усіх пристроїв поточного користувача.
   */
  @UseGuards(JwtAuthGuard)
  @Post("logout-all")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(
    @CurrentUser() current: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.tokens.revokeAllForUser(current.id);
    clearRefreshCookie(res);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@CurrentUser() current: AuthUser): Promise<UserDto> {
    return toUserDto(await this.auth.me(current.id));
  }

  /**
   * Крок 5 (ЛР №6): Початок входу через Google (OpenID Connect + PKCE).
   */
  @Get("google")
  googleStart(@Res() res: Response): void {
    try {
      const { url, flow } = this.google.start();
      setOAuthCookie(res, flow);
      res.redirect(url);
    } catch (err) {
      const code = toProblem(err).type.replace("/errors/", "");
      res.redirect(`/login?oauthError=${encodeURIComponent(code)}`);
    }
  }

  /**
   * ДЗ ЛР №6 (п. 1): Явне прив'язування Google з особистого кабінету.
   * Користувач автентифікований за Bearer-токеном; ми записуємо його userId
   * у cookie потоку oauthFlow (SameSite=Lax) і повертаємо URL Google OAuth.
   */
  @UseGuards(JwtAuthGuard)
  @Post("google/link")
  @HttpCode(HttpStatus.OK)
  prepareGoogleLink(
    @CurrentUser() current: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): GoogleLinkResponse {
    const { url, flow } = this.google.start(current.id);
    setOAuthCookie(res, flow);
    return { url };
  }

  @Get("google/callback")
  async googleCallback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Query("error") error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const flow = readOAuthCookie(req);
    clearOAuthCookie(res); // одноразово

    try {
      if (error) throw new OAuthStateMismatch(); // натиснули «Скасувати»
      if (!flow || !code || state !== flow.state) {
        throw new OAuthStateMismatch();
      }

      const claims = await this.google.finish(code, flow);
      const user = flow.linkUserId
        ? await this.auth.linkGoogleToUser(flow.linkUserId, claims)
        : await this.auth.loginWithGoogle(claims);

      const { refreshToken } = await this.tokens.issuePair(user);
      setRefreshCookie(res, refreshToken);
      res.redirect("/me");
    } catch (err) {
      const codeName = toProblem(err).type.replace("/errors/", "");
      const target = flow?.linkUserId ? "/me" : "/login";
      res.redirect(`${target}?oauthError=${encodeURIComponent(codeName)}`);
    }
  }
}
