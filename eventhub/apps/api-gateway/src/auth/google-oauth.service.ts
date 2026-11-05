import { createHash, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { OAuth2Client, type TokenPayload } from "google-auth-library";
import { env } from "../common/config/env";
import {
  GoogleAuthNotConfigured,
  OAuthStateMismatch,
} from "../common/problem/domain-errors";

export interface OAuthFlowState {
  state: string;
  verifier: string;
  nonce: string;
  /**
   * ДЗ ЛР №6 (п. 1): Якщо потік ініційовано автентифікованим користувачем
   * із кабінету («Прив'язати Google»), тут зберігається його userId.
   */
  linkUserId?: string;
}

function random(): string {
  return randomBytes(32).toString("base64url");
}

@Injectable()
export class GoogleOAuthService {
  private getClient(): OAuth2Client {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new GoogleAuthNotConfigured();
    }
    return new OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI,
    );
  }

  start(linkUserId?: string): { url: string; flow: OAuthFlowState } {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new GoogleAuthNotConfigured();
    }

    const flow: OAuthFlowState = {
      state: random(), // захист від login CSRF
      verifier: random(), // PKCE: секрет, що лишається в нас
      nonce: random(), // захист від повторного використання id_token
      ...(linkUserId ? { linkUserId } : {}),
    };

    const challenge = createHash("sha256")
      .update(flow.verifier)
      .digest("base64url");

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      response_type: "code",
      scope: "openid email profile",
      state: flow.state,
      nonce: flow.nonce,
      code_challenge: challenge,
      code_challenge_method: "S256",
      prompt: "select_account",
    }).toString();

    return { url: url.toString(), flow };
  }

  async finish(code: string, flow: OAuthFlowState): Promise<TokenPayload> {
    const client = this.getClient();

    const { tokens } = await client.getToken({
      code,
      codeVerifier: flow.verifier,
    });

    if (!tokens.id_token) {
      throw new OAuthStateMismatch();
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID!, // ← не пропускати: перевіряє aud
    });

    const claims = ticket.getPayload();
    if (!claims || claims.nonce !== flow.nonce) {
      throw new OAuthStateMismatch();
    }

    return claims;
  }
}

