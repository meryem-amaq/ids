import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Video, Users, ArrowRight, Clock, Sparkles, CheckCircle2 } from 'lucide-react';

const ESPACES = [
  {
    id: 'fablab',
    nom: 'Espace FabLab',
    badge: 'Prototypage & Fabrication',
    badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    iconColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    hoverBorder: 'hover:border-amber-500/50 hover:shadow-amber-500/15',
    buttonColor: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-amber-500/25',
    icon: Wrench,
    duree: 'Créneaux de 1 heure',
    description: 'Atelier de fabrication numérique, prototypage rapide, impression 3D et usinage mécanique.',
    zones: ['Fablab 1 (Étage - 3D/Laser)', 'Sous-sol (Fraisage CNC)'],
    materiels: ['Imprimantes 3D', 'Découpeuse Laser', 'Fraiseuse CNC', 'Électronique'],
    path: '/booking/fablab'
  },
  {
    id: 'studio',
    nom: 'Studio Média / Photo',
    badge: 'Média & Contenu 4K',
    badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    iconColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    hoverBorder: 'hover:border-purple-500/50 hover:shadow-purple-500/15',
    buttonColor: 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-purple-500/25',
    icon: Video,
    duree: 'Créneaux de 4 heures',
    description: 'Plateau complet pour production audiovisuelle, enregistrement de podcasts et photos produits.',
    zones: ['Studio Média & Podcast'],
    materiels: ['Caméras 4K', 'Micros Studio Podcast', 'Éclairage Softbox', 'Fond Vert'],
    path: '/booking/studio'
  },
  {
    id: 'salle_reunion',
    nom: 'Salles & Formation',
    badge: 'Collaboration & Réunions',
    badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    iconColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    hoverBorder: 'hover:border-blue-500/50 hover:shadow-blue-500/15',
    buttonColor: 'bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white shadow-blue-500/25',
    icon: Users,
    duree: 'Créneaux de 2 heures',
    description: 'Espaces professionnels pour réunions d\'équipe, présentations clients et sessions de formation.',
    zones: ['Salle 1 (6-8 pers.)', 'Salle 2 (6-8 pers.)', 'Salle de Formation (20+ pers.)'],
    materiels: ['Écrans tactiles 4K', 'Système Visioconférence', 'Paperboard connecté'],
    path: '/booking/salle_reunion'
  }
];

export default function PortalIndex() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#001428] text-white font-sans selection:bg-primary-500/30 relative flex flex-col justify-between">
      {/* Background Ambience Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[130px]" />
        <div className="absolute top-[30%] right-[-15%] w-[45%] h-[45%] rounded-full bg-purple-600/10 blur-[140px]" />
        <div className="absolute bottom-[-15%] left-[20%] w-[40%] h-[40%] rounded-full bg-emerald-600/10 blur-[130px]" />
      </div>

      <main className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16 flex-1 flex flex-col justify-center">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold mb-5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            PORTAIL OFFICIEL DE RÉSERVATION DES ESPACES
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
            Incubateur Digital Solidaire
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Réservez vos créneaux d'accès aux équipements et espaces d'innovation en temps réel.
            Sélectionnez votre espace ci-dessous ou utilisez le lien correspondant à votre QR Code :
          </p>
        </div>

        {/* 3 Space Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-7 w-full">
          {ESPACES.map((espace) => {
            const Icon = espace.icon;
            return (
              <div
                key={espace.id}
                onClick={() => navigate(espace.path)}
                className={`group relative bg-[#071d37]/85 backdrop-blur-xl border border-slate-700/60 ${espace.hoverBorder} rounded-3xl p-6 sm:p-7 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5`}
              >
                {/* Card Top */}
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className={`w-13 h-13 rounded-2xl border flex items-center justify-center text-xl ${espace.iconColor} group-hover:scale-105 transition-transform duration-300 shadow-inner`}>
                      <Icon size={24} />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${espace.badgeColor}`}>
                      {espace.badge}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-white mb-2 group-hover:text-primary-300 transition-colors">
                    {espace.nom}
                  </h2>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-3.5">
                    <Clock size={13} className="text-slate-500" />
                    <span>{espace.duree}</span>
                  </div>

                  <p className="text-slate-300 text-xs leading-relaxed mb-5">
                    {espace.description}
                  </p>

                  {/* Zones / Salles */}
                  <div className="space-y-1.5 mb-5 pt-3 border-t border-slate-700/50">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">
                      Zones disponibles :
                    </span>
                    <div className="space-y-1">
                      {espace.zones.map((zone, zIdx) => (
                        <div key={zIdx} className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                          <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                          <span className="truncate">{zone}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Bottom / Button */}
                <div className="pt-4 mt-auto border-t border-slate-700/50">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(espace.path);
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all ${espace.buttonColor} cursor-pointer group-hover:gap-3`}
                  >
                    <span>Réserver cet Espace</span>
                    <ArrowRight size={14} />
                  </button>
                  <p className="text-[10px] text-center text-slate-400 mt-2 font-mono">
                    Lien QR Code : {espace.path}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Banner at bottom */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-800/60 border border-slate-700/70 text-slate-300 text-xs">
            <Sparkles size={14} className="text-amber-400" />
            <span>Accès sécurisé : la réservation requiert une adresse email ou un numéro de projet autorisé sur la liste blanche.</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center border-t border-slate-800/80 bg-[#001020]/60">
        <p className="text-slate-400 text-xs">
          Incubateur Digital Solidaire (IDS) • Relais Cloud sécurisé synchronisé avec le centre physique.
        </p>
      </footer>
    </div>
  );
}
