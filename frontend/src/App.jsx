import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Presence from './pages/Presence';
import ReservationEspacePublique from './pages/ReservationEspacePublique';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/presence/:id" element={<Presence />} />
        <Route path="/emargement/:id" element={<Presence />} />
        <Route path="/reserver-espace/:espace" element={<ReservationEspacePublique />} />
        <Route path="/booking/:espace" element={<ReservationEspacePublique />} />
        
        {/* Fallback to something if they hit the root */}
        <Route path="/" element={
          <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 text-center">
            <h1 className="text-2xl font-bold">Portail Public IDS</h1>
            <p className="text-slate-400 mt-2">Veuillez scanner un QR Code valide.</p>
          </div>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
