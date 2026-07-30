import { Navigate, Route, Routes } from 'react-router-dom';

import { BuyerConfirm } from './pages/BuyerConfirm.js';
import { CreateDeal } from './pages/CreateDeal.js';
import { Dashboard } from './pages/Dashboard.js';
import { DealCreated } from './pages/DealCreated.js';
import { DealDetail } from './pages/DealDetail.js';
import { Invite } from './pages/Invite.js';

/**
 * Application root. Routes the VeriPay interface.
 *
 * The deal detail is a single route (`/deal`) whose UI is driven by query
 * params: `status` (new | connected | held | completed) advances the timeline
 * and swaps the action card, and `as` (buyer | seller) flips the perspective
 * and the counterparty shown in the trust panel.
 *
 * Auth0 wraps this tree from `main.tsx`, so any page here may call `useAuth0()`
 * and `useApiClient()`. No route is gated yet — the sign-in surfaces
 * (`components/auth-controls.tsx`, `components/me-panel.tsx`) exist and compile
 * but are not mounted; they get wired into these pages in a follow-up.
 */
export function App(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/create" element={<CreateDeal />} />
      <Route path="/created" element={<DealCreated />} />
      <Route path="/deal" element={<DealDetail />} />
      <Route path="/invite" element={<Invite />} />
      <Route path="/confirm" element={<BuyerConfirm />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
