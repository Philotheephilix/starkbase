import { FastifyRequest, FastifyReply } from 'fastify';

export function createPermissionMiddleware(getUserPermissions: (userId: string) => string[]) {
  return async function permissionMiddleware(request: FastifyRequest, reply: FastifyReply) {
    if (!request.authType) return; // Public route

    const config = (request.routeOptions as any)?.config;
    const requiredPermission = config?.permission;
    if (!requiredPermission) return; // No permission required on this route

    // Routes with permission config are user routes — reject owner tokens
    if (request.authType === 'owner') {
      return reply.status(403).send({ error: 'Owner tokens cannot access user routes' });
    }

    const userPermissions = getUserPermissions(request.user!.userId);
    if (!userPermissions.includes(requiredPermission)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }
  };
}
