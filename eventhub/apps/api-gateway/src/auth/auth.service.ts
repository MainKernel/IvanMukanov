import { Injectable } from "@nestjs/common";
import { Prisma, type User } from "@prisma/client";
import * as argon2 from "argon2";
import type { TokenPayload } from "google-auth-library";
import type { LoginBody, RegisterBody } from "@eventhub/contracts";
import { PrismaService } from "../prisma/prisma.service";
import {
  AccountExistsWithPassword,
  EmailTaken,
  InvalidCredentials,
  OAuthAccountAlreadyLinked,
  OAuthEmailNotVerified,
  Unauthenticated,
} from "../common/problem/domain-errors";
import { TokensService, type TokenPair } from "./tokens.service";

export type UserWithOAuth = User & {
  oauthAccounts?: Array<{ provider: string }>;
};

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

  async register(
    body: RegisterBody,
  ): Promise<TokenPair & { user: UserWithOAuth }> {
    const passwordHash = await argon2.hash(body.password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 МБ на одну перевірку
      timeCost: 3,
    });

    try {
      const user = await this.prisma.user.create({
        data: { email: body.email, passwordHash },
        include: { oauthAccounts: { select: { provider: true } } },
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

  async login(body: LoginBody): Promise<TokenPair & { user: UserWithOAuth }> {
    const user = await this.prisma.user.findUnique({
      where: { email: body.email },
      include: { oauthAccounts: { select: { provider: true } } },
    });

    // Перевіряємо пароль ЗАВЖДИ – навіть якщо користувача немає
    const hash = user?.passwordHash ?? (await this.getDummyHash());
    const ok = await argon2.verify(hash, body.password);

    if (!user || !ok) throw new InvalidCredentials();

    return { ...(await this.tokens.issuePair(user)), user };
  }

  async me(userId: string): Promise<UserWithOAuth> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { oauthAccounts: { select: { provider: true } } },
    });
    if (!user) throw new Unauthenticated();
    return user;
  }

  /**
   * Вхід через Google (ЛР №6, п. 8.7):
   * 1. Шукаємо користувача за парою (provider: "google", providerSubject: claims.sub).
   * 2. Якщо не знайдено — перевіряємо, що пошта підтверджена в Google.
   * 3. Якщо пошта вже зареєстрована, автоматично прив'язуємо ЛИШЕ коли
   *    existing.emailVerified === true (інакше AccountExistsWithPassword — захист
   *    від атаки захоплення акаунта наперед / pre-account takeover).
   * 4. Інакше створюємо нового користувача без пароля.
   */
  async loginWithGoogle(claims: TokenPayload): Promise<UserWithOAuth> {
    // 1. Уже прив'язаний – за парою «провайдер + sub»
    const linked = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerSubject: {
          provider: "google",
          providerSubject: claims.sub,
        },
      },
      include: {
        user: { include: { oauthAccounts: { select: { provider: true } } } },
      },
    });
    if (linked) return linked.user;

    if (!claims.email || claims.email_verified !== true) {
      throw new OAuthEmailNotVerified();
    }
    const email = claims.email.toLowerCase();

    // 2. Пошта вже зареєстрована
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      if (!existing.emailVerified) throw new AccountExistsWithPassword();

      await this.prisma.oAuthAccount.create({
        data: {
          userId: existing.id,
          provider: "google",
          providerSubject: claims.sub,
        },
      });
      return this.me(existing.id);
    }

    // 3. Новий користувач – без пароля
    return this.prisma.user.create({
      data: {
        email,
        emailVerified: true,
        oauthAccounts: {
          create: {
            provider: "google",
            providerSubject: claims.sub,
          },
        },
      },
      include: { oauthAccounts: { select: { provider: true } } },
    });
  }

  /**
   * ДЗ ЛР №6 (п. 1): Явне прив'язування Google з особистого кабінету.
   *
   * ЧИМ ЦЕЙ ПОТІК ВІДРІЗНЯЄТЬСЯ ВІД ЗВИЧАЙНОГО ВХОДУ І ЧОМУ ТУТ ЗВ'ЯЗУВАННЯ
   * БЕЗПЕЧНЕ БЕЗ ПІДТВЕРДЖЕННЯ ПОШТИ:
   * - При звичайному вході (/auth/google) користувач НЕ автентифікований, і
   *   пошук ведеться за поштою з Google. Якби ми автоматично зливали акаунт
   *   із непідтвердженою поштою, зловмисник міг би заздалегідь зареєструвати
   *   чужу пошту зі своїм паролем, дочекатися входу жертви через Google і
   *   зберегти доступ до її акаунта за своїм паролем (Pre-Account Takeover).
   * - При явному прив'язуванні (/auth/google/link) ініціатор УЖЕ увійшов у
   *   свій акаунт за паролем (перевірено JwtAuthGuard), а його userId
   *   збережено у httpOnly cookie потоку oauthFlow разом із криптографічним state.
   *   Тут ми прив'язуємо Google sub не «до когось, у кого така сама пошта», а
   *   безпосередньо до поточного автентифікованого користувача, який сам
   *   натиснув кнопку у своєму кабінеті й підтвердив свій Google-акаунт.
   *   Жертва зі свого браузера ніколи не потрапить у чужу сесію.
   */
  async linkGoogleToUser(
    userId: string,
    claims: TokenPayload,
  ): Promise<UserWithOAuth> {
    const existingLink = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerSubject: {
          provider: "google",
          providerSubject: claims.sub,
        },
      },
    });

    if (existingLink && existingLink.userId !== userId) {
      throw new OAuthAccountAlreadyLinked();
    }

    if (!existingLink) {
      await this.prisma.oAuthAccount.create({
        data: {
          userId,
          provider: "google",
          providerSubject: claims.sub,
        },
      });
    }

    return this.me(userId);
  }
}
