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
