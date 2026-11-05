import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectPinoLogger, type PinoLogger } from "nestjs-pino";
import type { User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { env } from "../common/config/env";
import { InvalidRefreshToken } from "../common/problem/domain-errors";

export function sha256(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @InjectPinoLogger(TokensService.name)
    private readonly logger: PinoLogger,
  ) {}

  async issuePair(user: User, familyId: string = randomUUID()): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role },
      { secret: env.JWT_ACCESS_SECRET, expiresIn: env.JWT_ACCESS_TTL_SECONDS },
    );

    const refreshToken = randomBytes(32).toString("base64url");

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        familyId,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + env.REFRESH_TTL_DAYS * 86_400_000),
      },
    });

    return { accessToken, refreshToken };
  }

  async rotate(raw: string): Promise<TokenPair> {
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(raw) },
      include: { user: true },
    });

    if (!token || token.revokedAt || token.expiresAt < new Date()) {
      throw new InvalidRefreshToken();
    }

    if (token.usedAt) {
      await this.revokeFamily(token.familyId);
      this.logger.warn(
        { familyId: token.familyId },
        "refresh token reuse detected",
      );
      throw new InvalidRefreshToken();
    }

    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: token.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    if (count === 0) {
      await this.revokeFamily(token.familyId);
      throw new InvalidRefreshToken();
    }

    return this.issuePair(token.user, token.familyId);
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeByRaw(raw: string | undefined): Promise<void> {
    if (!raw) return;
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(raw) },
    });
    if (token) {
      await this.revokeFamily(token.familyId);
    }
  }

  /**
   * ДЗ ЛР №5 (п. 1): Вихід з усіх пристроїв.
   * Відкликає всі сімейства refresh-токенів поточного користувача.
   *
   * Чому access-токени на інших пристроях продовжать працювати ще до 15 хвилин,
   * і чи прийнятно це:
   * Access-токен є самодостатнім (stateless) JWT: JwtAuthGuard перевіряє лише
   * криптографічний підпис та exp без звернення до БД. Тому вже видані
   * access-токени залишаються валідними до завершення свого короткого TTL
   * (JWT_ACCESS_TTL_SECONDS = 900 с = 15 хв), після чого спроба оновитися
   * через /auth/refresh впаде з 401 через revokedAt IS NOT NULL.
   * Для звичайного виходу з усіх пристроїв це свідомий і прийнятний компроміс
   * між миттєвим відкликанням і відсутністю запиту в БД на кожен HTTP-виклик.
   */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
