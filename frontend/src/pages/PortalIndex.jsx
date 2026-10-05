import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function PortalIndex() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#001633] text-white font-sans selection:bg-primary-500/30">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-600/10 blur-[120px]" />
      </div>

      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
        {/* Header Section */}
        <div className="text-center max-w-2xl mx-auto mb-16 fade-in slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            RELAIS CLOUD PUBLIC 24H/24 ACTIF
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
            Incubateur Digital Solidaire
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed max-w-xl mx-auto">
            Portail public de réservation des espaces d'innovation et d'émargement numérique des ateliers. <br/> Scannez un QR Code ou choisissez une option ci-dessous :
          </p>
        </div>

        {/* Options Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto">
          {/* Reservation Card */}
          <div 
            onClick={() => navigate('/booking/fablab')}
            className="group relative bg-[#0a2040]/80 backdrop-blur-xl border border-slate-700/50 hover:border-primary-500/50 rounded-3xl p-8 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-primary-500/10 hover:-translate-y-1 fade-in slide-up"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="w-14 h-14 rounded-2xl bg-primary-500/20 flex items-center justify-center mb-6 text-primary-400 text-2xl shadow-inner group-hover:scale-110 transition-transform duration-300">
              📅
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Réserver un Espace</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              FabLab, Coworking, Studio Média, Salle Réunion ou Formation. Réservez votre créneau en temps réel.
            </p>
            <div className="text-primary-400 text-sm font-semibold flex items-center gap-2 group-hover:gap-3 transition-all">
              Accéder au formulaire <span>→</span>
            </div>
          </div>

          {/* Emargement Card */}
          <div 
            className="group relative bg-[#0a2040]/80 backdrop-blur-xl border border-slate-700/50 hover:border-emerald-500/50 rounded-3xl p-8 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1 fade-in slide-up opacity-50"
            style={{ animationDelay: '0.3s' }}
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6 text-emerald-400 text-2xl shadow-inner group-hover:scale-110 transition-transform duration-300">
              ✍️
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Émargement Atelier</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              Feuille de présence numérique pour les porteurs de projets et participants aux formations du jour.
            </p>
            <div className="text-emerald-400 text-sm font-semibold flex items-center gap-2">
              (Scannez le QR Code de l'Atelier)
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center fade-in" style={{ animationDelay: '0.5s' }}>
          <p className="text-slate-500 text-xs font-medium">
            Système Hybride IDS — Données sécurisées et synchronisées avec le centre local.
          </p>
        </div>
      </main>
    </div>
  );
}
