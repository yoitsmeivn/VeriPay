import { Navigate, Route, Routes } from 'react-router-dom';

import { CreateDeal } from './pages/CreateDeal.js';
import { Dashboard } from './pages/Dashboard.js';
import { DealCreated } from './pages/DealCreated.js';

/**
 * Application root. Routes the authenticated VeriPay interface.
 * The interface starts at the dashboard; further screens are added as routes.
 */
export function App(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/create" element={<CreateDeal />} />
      <Route path="/created" element={<DealCreated />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
