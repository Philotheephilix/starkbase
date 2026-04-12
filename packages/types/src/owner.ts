export interface Owner {
  id: string;
  username: string;
  email: string | null;
  walletAddress: string;
  createdAt: number;
}

export interface OwnerRegisterRequest {
  username: string;
  password: string;
  email?: string;
}

export interface OwnerLoginRequest {
  username: string;
  password: string;
}

export interface OwnerAuthResult {
  token: string;
  ownerId: string;
  username: string;
  walletAddress: string;
}

export interface Role {
  id: string;
  platformId: string;
  name: string;
  isSystem: boolean;
  permissions: string[];
  createdAt: number;
}

export interface CreateRoleRequest {
  name: string;
  permissions: string[];
}

export interface UpdateRoleRequest {
  permissions: string[];
}

export interface AssignRoleRequest {
  roleId: string;
}

export interface StorageRegistry {
  id: string;
  platformId: string;
  name: string;
  maxFileSize: number;
  maxTotalSize: number;
  currentTotalSize: number;
  allowedMimeTypes: string[] | null;
  createdAt: number;
}

export interface CreateRegistryRequest {
  name: string;
  maxFileSize?: number;
  maxTotalSize?: number;
  allowedMimeTypes?: string[];
}

export interface UpdateRegistryRequest {
  maxFileSize?: number;
  maxTotalSize?: number;
  allowedMimeTypes?: string[];
}

export interface PlatformSettings {
  platformId: string;
  allowedOrigins: string[] | null;
  registrationEnabled: boolean;
  updatedAt: number;
}

export interface UpdatePlatformSettingsRequest {
  allowedOrigins?: string[];
  registrationEnabled?: boolean;
}

export interface AuditLogEntry {
  id: string;
  actorType: 'owner' | 'user';
  actorId: string;
  platformId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: number;
}

export interface ExternalWallet {
  id: string;
  walletAddress: string;
  linkedAt: number;
}

export interface WalletExportRequest {
  password: string;
}

export interface WalletLinkRequest {
  walletAddress: string;
  signature: string;
  challenge: string;
}
