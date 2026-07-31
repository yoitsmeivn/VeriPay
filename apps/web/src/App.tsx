import { Navigate, Route, Routes } from 'react-router-dom';

import { AuthNotConfigured } from './components/auth-not-configured.js';
import { RequireAuth } from './components/require-auth.js';
import { resolveAuth0Settings } from './env.js';
import { BuyerConfirm } from './pages/BuyerConfirm.js';
import { CreateDeal } from './pages/CreateDeal.js';
import { Dashboard } from './pages/Dashboard.js';
import { DealCreated } from './pages/DealCreated.js';
import { DealDetail } from './pages/DealDetail.js';
import { Invite } from './pages/Invite.js';

/**
 * Application root. Routes the VeriPay interface.
 *
 * Registered users hit Auth0 before any creator route renders. Guest link
 * recipients use `/invite` and `/confirm` without signing in.
 */
export function App(): React.JSX.Element {
  const auth0 = resolveAuth0Settings();

  if (auth0 === undefined) {
    return (
      <Routes>
        <Route path="/invite" element={<Invite />} />
        <Route path="/confirm" element={<BuyerConfirm />} />
        <Route path="*" element={<AuthNotConfigured />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/invite" element={<Invite />} />
      <Route path="/confirm" element={<BuyerConfirm />} />

      <Route element={<RequireAuth />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/create" element={<CreateDeal />} />
        <Route path="/created" element={<DealCreated />} />
        <Route path="/deal" element={<DealDetail />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
