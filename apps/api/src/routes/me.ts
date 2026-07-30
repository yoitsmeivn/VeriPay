import { apiSuccess, authPrincipalSchema } from '@veripay/shared';
import { Router } from 'express';

import { type Authenticator } from '../auth/jwt.js';
import { requireAuth, requirePrincipal } from '../middleware/require-auth.js';

/**
 * The authenticated caller's identity.
 *
 * Returns the verified token claims only — no database read. Synchronising
 * Auth0 subjects into VeriPay user records is the next task; until then this
 * endpoint proves the token path works end to end.
 */
export function meRouter(authenticator: Authenticator): Router {
  const router = Router();

  router.get('/me', requireAuth(authenticator), (req, res) => {
    const principal = requirePrincipal(req);
    res.status(200).json(apiSuccess(authPrincipalSchema.parse(principal)));
  });

  return router;
}
