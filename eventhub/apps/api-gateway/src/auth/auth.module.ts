import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { GoogleOAuthService } from "./google-oauth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { TokensService } from "./tokens.service";

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, TokensService, GoogleOAuthService, JwtAuthGuard],
  exports: [AuthService, TokensService, GoogleOAuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
