import { FastifyRequest, FastifyReply } from 'fastify';

export function createPermissionMiddleware(getUserPermissions: (userId: string) => string[]) {
  return async function permissionMiddleware(request: FastifyRequest, reply: FastifyReply) {
    if (!request.authType) return; // Public route
    if (request.authType === 'owner') return; // Owners have full access to their platforms

    const config = (request.routeOptions as any)?.config;
    const requiredPermission = config?.permission;
    if (!requiredPermission) return; // No permission required on this route

    const userPermissions = getUserPermissions(request.user!.userId);
    if (!userPermissions.includes(requiredPermission)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }
  };
}
