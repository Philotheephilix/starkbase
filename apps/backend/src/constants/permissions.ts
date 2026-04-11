export const PERMISSIONS = {
  PLATFORM_READ: 'platform:read',
  PLATFORM_UPDATE: 'platform:update',
  PLATFORM_DELETE: 'platform:delete',
  USERS_INVITE: 'users:invite',
  USERS_REMOVE: 'users:remove',
  USERS_LIST: 'users:list',
  ROLES_ASSIGN: 'roles:assign',
  ROLES_CREATE: 'roles:create',
  ROLES_DELETE: 'roles:delete',
  SCHEMAS_READ: 'schemas:read',
  SCHEMAS_WRITE: 'schemas:write',
  SCHEMAS_DELETE: 'schemas:delete',
  DOCS_READ: 'docs:read',
  DOCS_WRITE: 'docs:write',
  DOCS_DELETE: 'docs:delete',
  BLOBS_READ: 'blobs:read',
  BLOBS_UPLOAD: 'blobs:upload',
  BLOBS_DELETE: 'blobs:delete',
  TOKENS_DEPLOY: 'tokens:deploy',
  TOKENS_MINT: 'tokens:mint',
  NFTS_DEPLOY: 'nfts:deploy',
  NFTS_MINT: 'nfts:mint',
  EVENTS_CREATE: 'events:create',
  EVENTS_MINT: 'events:mint',
  REGISTRY_ANCHOR: 'registry:anchor',
  REGISTRY_DEPLOY: 'registry:deploy',
  REGISTRIES_CREATE: 'registries:create',
  REGISTRIES_READ: 'registries:read',
  REGISTRIES_UPDATE: 'registries:update',
  REGISTRIES_DELETE: 'registries:delete',
  WALLET_EXPORT: 'wallet:export',
  WALLET_LINK: 'wallet:link',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

const ADMIN_EXCLUDED: Permission[] = [
  PERMISSIONS.PLATFORM_DELETE,
  PERMISSIONS.REGISTRY_DEPLOY,
  PERMISSIONS.ROLES_CREATE,
  PERMISSIONS.ROLES_DELETE,
  PERMISSIONS.REGISTRIES_CREATE,
  PERMISSIONS.REGISTRIES_UPDATE,
  PERMISSIONS.REGISTRIES_DELETE,
];

export const ADMIN_PERMISSIONS: Permission[] =
  ALL_PERMISSIONS.filter(p => !ADMIN_EXCLUDED.includes(p));

export const MEMBER_PERMISSIONS: Permission[] = [
  PERMISSIONS.SCHEMAS_READ, PERMISSIONS.DOCS_READ,
  PERMISSIONS.BLOBS_READ, PERMISSIONS.BLOBS_UPLOAD,
  PERMISSIONS.USERS_LIST, PERMISSIONS.REGISTRIES_READ,
  PERMISSIONS.WALLET_EXPORT, PERMISSIONS.WALLET_LINK,
];

export const SYSTEM_ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;
