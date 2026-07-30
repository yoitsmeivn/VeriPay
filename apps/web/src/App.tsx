import { Navigate, Route, Routes } from 'react-router-dom';

import { CreateDeal } from './pages/CreateDeal.js';
import { Dashboard } from './pages/Dashboard.js';
import { DealCreated } from './pages/DealCreated.js';
import { SellerDeal } from './pages/SellerDeal.js';
import { SellerDealPaid } from './pages/SellerDealPaid.js';

/**
 * Application root. Routes the authenticated VeriPay interface.
 * Seller flow: dashboard → create → created → deal (funded) → deal paid.
 */
export function App(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/create" element={<CreateDeal />} />
      <Route path="/created" element={<DealCreated />} />
      <Route path="/deal" element={<SellerDeal />} />
      <Route path="/deal/paid" element={<SellerDealPaid />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
