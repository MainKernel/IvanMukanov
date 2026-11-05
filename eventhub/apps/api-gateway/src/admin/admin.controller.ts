import {
  Body,
  Controller,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { Prisma, Role } from "@prisma/client";
import type { UserDto } from "@eventhub/contracts";
import { toUserDto } from "../auth/auth.controller";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TokensService } from "../auth/tokens.service";
import { Roles } from "../common/authz/roles.decorator";
import { RolesGuard } from "../common/authz/roles.guard";
import { UserNotFound } from "../common/problem/domain-errors";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateUserRoleBodyDto, UserIdParamDto } from "./admin.dto";

/**
 * ДЗ ЛР №6 (п. 3): Зміна ролі користувача адміністратором.
 *
 * ПИСЬМОВИЙ АНАЛІЗ: Роль лежить у токені, а токен живе 15 хвилин.
 * Чи прийнятно, що зміна набуде сили із затримкою?
 *
 * 1. Для підвищення прав (наприклад, USER -> ORGANIZER):
 *    Затримка до 15 хвилин (або до наступного оновлення токена) є безпечною
 *    з погляду інформаційної безпеки, проте незручною для користувача UX-ово.
 *    Вирішується тим, що при зміні ролі сервер відкликає поточні refresh-токени
 *    або клієнт після отримання повідомлення викликає POST /auth/refresh і
 *    миттєво отримує новий access-токен із новою роллю.
 *
 * 2. Для зниження прав (наприклад, ORGANIZER -> USER або ADMIN -> USER при
 *    звільненні чи компрометації облікового запису):
 *    Затримка у 15 хвилин є НЕПРИЙНЯТНОЮ для критичних операцій: позбавлений
 *    прав організатор або адміністратор міг би ще 15 хвилин редагувати події
 *    або змінювати ролі за старим stateless JWT.
 *
 * Запропоноване й реалізоване рішення:
 * - Негайно відкликаємо всі refresh-токени користувача (`revokeAllForUser`),
 *   щоб він не зміг продовжити сесію зі старою роллю.
 * - Для миттєвого припинення дії вже виданих access-токенів при зниженні прав:
 *   а) на маршрутах підвищеної чутливості (`/admin/*` або при мутаціях) можна
 *      звіряти актуальну роль / `tokenVersion` у базі або швидкому кеші (Redis);
 *   б) включити у JWT поле `roleUpdatedAt` / `tokenVersion` і зберігати в
 *      in-memory Set / Redis список користувачів із примусово зниженими правами
 *      на час TTL access-токена (15 хв) — тоді перевірка залишається O(1) у
 *      пам'яті, але миттєво блокує старий токен після зниження ролі.
 */
@Controller("admin/users")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
  ) {}

  @Patch(":userId/role")
  async updateRole(
    @Param() params: UserIdParamDto,
    @Body() body: UpdateUserRoleBodyDto,
  ): Promise<UserDto> {
    try {
      const updated = await this.prisma.user.update({
        where: { id: params.userId },
        data: { role: body.role },
      });
      await this.tokens.revokeAllForUser(params.userId);
      return toUserDto(updated);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        throw new UserNotFound(params.userId);
      }
      throw err;
    }
  }
}

