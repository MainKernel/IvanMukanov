import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Role } from "@eventhub/contracts";
import { env } from "../common/config/env";
import { Unauthenticated } from "../common/problem/domain-errors";
import type { AuthUser } from "./current-user.decorator";

interface JwtPayload {
  sub: string;
  role: Role;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx
      .switchToHttp()
      .getRequest<{ headers: { authorization?: string }; user?: AuthUser }>();
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new Unauthenticated();

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(header.slice(7), {
        secret: env.JWT_ACCESS_SECRET,
      });
      req.user = { id: payload.sub, role: payload.role };
      return true;
    } catch {
      throw new Unauthenticated();
    }
  }
}
