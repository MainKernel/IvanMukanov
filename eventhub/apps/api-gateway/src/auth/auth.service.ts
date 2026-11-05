import { Injectable } from "@nestjs/common";
import { Prisma, type User } from "@prisma/client";
import * as argon2 from "argon2";
import type { LoginBody, RegisterBody } from "@eventhub/contracts";
import { PrismaService } from "../prisma/prisma.service";
import {
  EmailTaken,
  InvalidCredentials,
  Unauthenticated,
} from "../common/problem/domain-errors";
import { TokensService, type TokenPair } from "./tokens.service";

@Injectable()
export class AuthService {
  private dummyHashPromise: Promise<string> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
  ) {}

  private getDummyHash(): Promise<string> {
    if (!this.dummyHashPromise) {
      this.dummyHashPromise = argon2.hash(
        "dummy-password-for-constant-time-check",
        {
          type: argon2.argon2id,
          memoryCost: 65536,
          timeCost: 3,
        },
      );
    }
    return this.dummyHashPromise;
  }

  async register(body: RegisterBody): Promise<TokenPair & { user: User }> {
    const passwordHash = await argon2.hash(body.password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 МБ на одну перевірку
      timeCost: 3,
    });

    try {
      const user = await this.prisma.user.create({
        data: { email: body.email, passwordHash },
      });
      return { ...(await this.tokens.issuePair(user)), user };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new EmailTaken();
      }
      throw err;
    }
  }

  async login(body: LoginBody): Promise<TokenPair & { user: User }> {
    const user = await this.prisma.user.findUnique({
      where: { email: body.email },
    });

    // Перевіряємо пароль ЗАВЖДИ – навіть якщо користувача немає
    const hash = user?.passwordHash ?? (await this.getDummyHash());
    const ok = await argon2.verify(hash, body.password);

    if (!user || !ok) throw new InvalidCredentials();

    return { ...(await this.tokens.issuePair(user)), user };
  }

  async me(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new Unauthenticated();
    return user;
  }
}
