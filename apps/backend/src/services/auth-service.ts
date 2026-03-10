import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type Database from 'better-sqlite3';
import type { WalletService } from './wallet-service';
import type { PlatformService } from './platform-service';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';
const BCRYPT_ROUNDS = 12;
const SESSION_TTL_SECONDS = 86400; // 24 hours

export interface RegisterResult {
  walletAddress: string;
  sessionToken: string;
  username: string;
  platformId: string;
}

export interface AuthUser {
  userId: string;
  username: string;
  platformId: string;
  walletAddress: string;
}

interface UserRow {
  id: string;
  platform_id: string;
  username: string;
  password_hash: string;
  wallet_address: string | null;
  deployed: number;
}

export class AuthService {
  constructor(
    private db: Database.Database,
    private walletSvc: WalletService,
    private platformSvc: PlatformService
  ) {}

  async register(apiKey: string, username: string, password: string): Promise<RegisterResult> {
    const platform = this.platformSvc.getByApiKey(apiKey);
    if (!platform) throw Object.assign(new Error('Invalid API key'), { statusCode: 401 });

    const existing = this.db
      .prepare('SELECT id FROM platform_users WHERE platform_id = ? AND username = ?')
      .get(platform.id, username);
    if (existing) throw Object.assign(new Error('Username already exists'), { statusCode: 409 });

    const privateKey = this.walletSvc.derivePrivateKey(platform.id, username);
    const computedAddress = this.walletSvc.computeAddress(privateKey);
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const userId = crypto.randomUUID();
    this.db
      .prepare(
        'INSERT INTO platform_users (id, platform_id, username, password_hash, wallet_address, deployed) VALUES (?, ?, ?, ?, ?, 0)'
      )
      .run(userId, platform.id, username, passwordHash, computedAddress);

    let walletAddress: string;
    try {
      const provider = this.walletSvc.getProvider();
      const deployer = this.walletSvc.getDeployer(provider);
      const result = await this.walletSvc.deployAccount(privateKey, provider, deployer);
      walletAddress = result.address;
    } catch (err) {
      // Roll back the user row so re-registration is possible after a deploy failure
      this.db.prepare('DELETE FROM platform_users WHERE id = ?').run(userId);
      throw err;
    }

    this.db
      .prepare('UPDATE platform_users SET wallet_address = ?, deployed = 1 WHERE id = ?')
      .run(walletAddress, userId);

    const sessionToken = this.signToken({
      userId,
      username,
      platformId: platform.id,
      walletAddress,
    });
    return { walletAddress, sessionToken, username, platformId: platform.id };
  }

  async login(apiKey: string, username: string, password: string): Promise<RegisterResult> {
    const platform = this.platformSvc.getByApiKey(apiKey);
    if (!platform) throw Object.assign(new Error('Invalid API key'), { statusCode: 401 });

    const row = this.db
      .prepare('SELECT * FROM platform_users WHERE platform_id = ? AND username = ?')
      .get(platform.id, username) as UserRow | undefined;

    if (!row) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });

    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });

    const walletAddress = row.wallet_address ?? '';
    const sessionToken = this.signToken({
      userId: row.id,
      username: row.username,
      platformId: row.platform_id,
      walletAddress,
    });
    return { walletAddress, sessionToken, username: row.username, platformId: row.platform_id };
  }

  listUsers(platformId: string): Array<{ userId: string; username: string; walletAddress: string; deployed: boolean; createdAt: number }> {
    const rows = this.db
      .prepare('SELECT id, username, wallet_address, deployed, created_at FROM platform_users WHERE platform_id = ? ORDER BY created_at DESC')
      .all(platformId) as Array<{ id: string; username: string; wallet_address: string | null; deployed: number; created_at: number }>;
    return rows.map(r => ({
      userId: r.id,
      username: r.username,
      walletAddress: r.wallet_address ?? '',
      deployed: r.deployed === 1,
      createdAt: r.created_at,
    }));
  }

  verifySession(sessionToken: string): AuthUser {
    const payload = jwt.verify(sessionToken, JWT_SECRET) as {
      userId: string;
      username: string;
      platformId: string;
      walletAddress: string;
    };
    return {
      userId: payload.userId,
      username: payload.username,
      platformId: payload.platformId,
      walletAddress: payload.walletAddress,
    };
  }

  revokeSession(_sessionToken: string): void {
    // Stateless JWT — client-side logout drops the token
    // Add sessions table lookup here if server-side revocation is needed
  }

  private signToken(payload: {
    userId: string;
    username: string;
    platformId: string;
    walletAddress: string;
  }): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: SESSION_TTL_SECONDS });
  }
}
