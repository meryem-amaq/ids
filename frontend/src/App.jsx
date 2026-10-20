import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Presence from './pages/Presence';
import PresenceFormation from './pages/PresenceFormation';
import ReservationEspacePublique from './pages/ReservationEspacePublique';
import PortalIndex from './pages/PortalIndex';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/presence/:id" element={<Presence />} />
        <Route path="/emargement/:id" element={<Presence />} />
        <Route path="/formation" element={<PresenceFormation />} />
        <Route path="/formation/:id" element={<PresenceFormation />} />
        <Route path="/reserver-espace/:espace" element={<ReservationEspacePublique />} />
        <Route path="/booking/:espace" element={<ReservationEspacePublique />} />
        <Route path="/booking" element={<Navigate to="/booking/fablab" replace />} />
        <Route path="/reserver-espace" element={<Navigate to="/booking/fablab" replace />} />
        
        {/* Fallback to something if they hit the root */}
        <Route path="/" element={<PortalIndex />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
