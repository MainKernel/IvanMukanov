import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { TokensService } from "./tokens.service";

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, TokensService, JwtAuthGuard],
  exports: [AuthService, TokensService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
