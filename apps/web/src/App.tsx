import { Navigate, Route, Routes } from 'react-router-dom';

import { BuyerConfirm } from './pages/BuyerConfirm.js';
import { CreateDeal } from './pages/CreateDeal.js';
import { Dashboard } from './pages/Dashboard.js';
import { DealCreated } from './pages/DealCreated.js';
import { Invite } from './pages/Invite.js';
import { SellerDeal } from './pages/SellerDeal.js';
import { SellerDealPaid } from './pages/SellerDealPaid.js';

/**
 * Application root. Routes the VeriPay interface.
 * Seller flow: dashboard → create → created → deal (funded) → deal paid.
 * Buyer flow (public, no account): invite (accept) → confirm receipt.
 */
export function App(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/create" element={<CreateDeal />} />
      <Route path="/created" element={<DealCreated />} />
      <Route path="/deal" element={<SellerDeal />} />
      <Route path="/deal/paid" element={<SellerDealPaid />} />
      <Route path="/invite" element={<Invite />} />
      <Route path="/confirm" element={<BuyerConfirm />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
