import { Navigate, Route, Routes } from 'react-router-dom';

import { Dashboard } from './pages/Dashboard.js';

/**
 * Application root. Routes the authenticated VeriPay interface.
 * The interface starts at the dashboard; further screens are added as routes.
 */
export function App(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
