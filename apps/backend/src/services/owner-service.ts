import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type Database from 'better-sqlite3';

const BCRYPT_ROUNDS = 12;

export interface WalletServiceLike {
  derivePrivateKey(platformId: string, username: string): string;
  computeAddress(privateKey: string): string;
  deployAccount(privateKey: string, provider: any, deployer: any): Promise<any>;
  getProvider(): any;
  getDeployer(provider: any): any;
}

export interface OwnerTokenPayload {
  type: 'owner';
  ownerId: string;
  username: string;
  walletAddress: string;
  tokenVersion: number;
  iss: string;
  aud: string;
}

interface OwnerRow {
  id: string;
  username: string;
  email: string | null;
  password_hash: string;
  wallet_address: string;
  token_version: number;
  created_at: number;
}

export class OwnerService {
  constructor(
    private db: Database.Database,
    private walletService: WalletServiceLike,
    private jwtSecret: string,
  ) {}

  async register(input: {
    username: string;
    password: string;
    email?: string;
  }): Promise<{ token: string; ownerId: string; username: string; walletAddress: string }> {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    const privateKey = this.walletService.derivePrivateKey('owner', input.username);
    const walletAddress = this.walletService.computeAddress(privateKey);

    const ownerId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    this.db
      .prepare(
        'INSERT INTO owners (id, username, email, password_hash, wallet_address, token_version, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
      )
      .run(ownerId, input.username, input.email ?? null, passwordHash, walletAddress, now);

    // Deploy account in background — errors are caught silently
    // Deploy account in background — don't block registration
    try {
      const provider = this.walletService.getProvider();
      const deployer = this.walletService.getDeployer(provider);
      this.walletService.deployAccount(privateKey, provider, deployer).catch(() => {});
    } catch {
      // Provider/deployer may not be available in test environments
    }

    const token = this.signToken(ownerId, input.username, walletAddress, 0);
    return { token, ownerId, username: input.username, walletAddress };
  }

  async login(input: {
    username: string;
    password: string;
  }): Promise<{ token: string; ownerId: string; username: string; walletAddress: string }> {
    const row = this.db
      .prepare('SELECT * FROM owners WHERE username = ?')
      .get(input.username) as OwnerRow | undefined;

    if (!row) throw new Error('Invalid credentials');

    const valid = await bcrypt.compare(input.password, row.password_hash);
    if (!valid) throw new Error('Invalid credentials');

    const token = this.signToken(row.id, row.username, row.wallet_address, row.token_version);
    return { token, ownerId: row.id, username: row.username, walletAddress: row.wallet_address };
  }

  verifyToken(token: string): OwnerTokenPayload {
    const decoded = jwt.verify(token, this.jwtSecret, {
      issuer: 'starkbase',
      audience: 'owner',
    }) as OwnerTokenPayload;

    const row = this.db
      .prepare('SELECT token_version FROM owners WHERE id = ?')
      .get(decoded.ownerId) as { token_version: number } | undefined;

    if (!row || row.token_version !== decoded.tokenVersion) {
      throw new Error('Token revoked');
    }

    return decoded;
  }

  getById(ownerId: string): Omit<OwnerRow, 'password_hash'> | null {
    const row = this.db
      .prepare('SELECT id, username, email, wallet_address, token_version, created_at FROM owners WHERE id = ?')
      .get(ownerId) as Omit<OwnerRow, 'password_hash'> | undefined;

    return row ?? null;
  }

  ownsPlatform(ownerId: string, platformId: string): boolean {
    const row = this.db
      .prepare('SELECT 1 FROM owner_platforms WHERE owner_id = ? AND platform_id = ?')
      .get(ownerId, platformId);

    return !!row;
  }

  getOwnedPlatformIds(ownerId: string): string[] {
    const rows = this.db
      .prepare('SELECT platform_id FROM owner_platforms WHERE owner_id = ?')
      .all(ownerId) as Array<{ platform_id: string }>;

    return rows.map((r) => r.platform_id);
  }

  private signToken(
    ownerId: string,
    username: string,
    walletAddress: string,
    tokenVersion: number,
  ): string {
    return jwt.sign(
      {
        type: 'owner' as const,
        ownerId,
        username,
        walletAddress,
        tokenVersion,
      },
      this.jwtSecret,
      {
        expiresIn: '4h',
        issuer: 'starkbase',
        audience: 'owner',
      },
    );
  }
}
