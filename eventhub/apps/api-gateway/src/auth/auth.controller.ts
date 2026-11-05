import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import type { User } from "@prisma/client";
import type { AuthResponse, RefreshResponse, UserDto } from "@eventhub/contracts";
import { env } from "../common/config/env";
import { InvalidRefreshToken } from "../common/problem/domain-errors";
import { LoginBodyDto, RegisterBodyDto } from "./auth.dto";
import { AuthService } from "./auth.service";
import { CurrentUser, type AuthUser } from "./current-user.decorator";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { TokensService } from "./tokens.service";

const REFRESH_COOKIE = "refreshToken";

/**
 * Доменний мапер користувача: ніколи не випускає passwordHash назовні.
 */
export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
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

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokensService,
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
}
