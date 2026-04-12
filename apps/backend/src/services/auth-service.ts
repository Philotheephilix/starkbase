import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type Database from 'better-sqlite3';
import type { WalletService } from './wallet-service';
import type { PlatformService } from './platform-service';

const BCRYPT_ROUNDS = 12;

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
  token_version: number;
}

export class AuthService {
  private jwtSecret: string;

  constructor(
    private db: Database.Database,
    private walletSvc: WalletService,
    private platformSvc: PlatformService,
    jwtSecret: string,
  ) {
    this.jwtSecret = jwtSecret;
  }

  async register(apiKey: string, username: string, password: string): Promise<RegisterResult> {
    const platform = this.platformSvc.getByApiKey(apiKey);
    if (!platform) throw Object.assign(new Error('Invalid API key'), { statusCode: 401 });

    // Check if registration is enabled for this platform
    const settings = this.db.prepare('SELECT registration_enabled FROM platform_settings WHERE platform_id = ?').get(platform.id) as any;
    if (settings && settings.registration_enabled === 0) {
      throw Object.assign(new Error('Registration is disabled for this platform'), { statusCode: 403 });
    }

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

    // Assign default member role
    const memberRole = this.db.prepare("SELECT id FROM roles WHERE platform_id = ? AND name = ? AND is_system = 1").get(platform.id, 'member') as any;
    if (memberRole) {
      this.db.prepare("INSERT OR IGNORE INTO platform_user_roles (user_id, role_id, assigned_by, assigned_at) VALUES (?, ?, 'system', ?)").run(userId, memberRole.id, Math.floor(Date.now() / 1000));
    }

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
      tokenVersion: row.token_version ?? 0,
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
    const payload = jwt.verify(sessionToken, this.jwtSecret, { issuer: 'starkbase', audience: 'user' }) as any;
    return {
      userId: payload.userId,
      username: payload.username,
      platformId: payload.platformId,
      walletAddress: payload.walletAddress,
    };
  }

  revokeSession(_sessionToken: string): void {
    // Stateless JWT — client-side logout drops the token
  }

  private signToken(payload: {
    userId: string;
    username: string;
    platformId: string;
    walletAddress: string;
    tokenVersion?: number;
  }): string {
    return jwt.sign(
      { type: 'user', userId: payload.userId, username: payload.username, platformId: payload.platformId, walletAddress: payload.walletAddress, tokenVersion: payload.tokenVersion ?? 0 },
      this.jwtSecret,
      { expiresIn: '24h', issuer: 'starkbase', audience: 'user' },
    );
  }
}
