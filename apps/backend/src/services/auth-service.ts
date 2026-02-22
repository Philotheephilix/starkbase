import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import type {
  AuthInitiateResponse,
  AuthDeployResponse,
  AuthSession,
} from '@starkbase/types';

const OAUTH_CONFIGS: Record<string, { authUrl: string; clientId: string }> = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
  },
  discord: {
    authUrl: 'https://discord.com/api/oauth2/authorize',
    clientId: process.env.DISCORD_CLIENT_ID ?? '',
  },
};

export class AuthService {
  private readonly jwtSecret = process.env.JWT_SECRET ?? 'dev-secret';

  async initiateAuth(provider: string, redirectUri: string): Promise<AuthInitiateResponse> {
    const config = OAUTH_CONFIGS[provider];
    if (!config) throw new Error(`Unsupported provider: ${provider}`);

    const state = crypto.randomBytes(16).toString('hex');
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: provider === 'google' ? 'openid email profile' : 'identify email',
      state,
    });

    return { authUrl: `${config.authUrl}?${params}`, state };
  }

  createSessionToken(accountAddress: string, provider: string): string {
    return jwt.sign(
      { accountAddress, provider, iat: Math.floor(Date.now() / 1000) },
      this.jwtSecret,
      { expiresIn: '7d' }
    );
  }

  verifySessionToken(token: string): AuthSession {
    const decoded = jwt.verify(token, this.jwtSecret) as AuthSession & { exp: number };
    return {
      accountAddress: decoded.accountAddress,
      provider: decoded.provider,
      expiresAt: decoded.exp,
    };
  }

  // Stub: real implementation requires SUMO contract on Starknet
  async deployAccount(params: {
    jwt: string;
    zkProof: string[];
    ephemeralPublicKey: string;
    expirationBlock: number;
  }): Promise<AuthDeployResponse> {
    const accountAddress = `0x${crypto.randomBytes(32).toString('hex').slice(0, 63)}`;
    const sessionToken = this.createSessionToken(accountAddress, 'google');
    return {
      accountAddress,
      sessionToken,
      transactionHash: `0x${crypto.randomBytes(32).toString('hex')}`,
    };
  }
}
