/**
 * Vue HTML responsive, moderne et ultra-sécurisée pour la validation par email en 1-clic.
 * Zéro dépendance de build (Tailwind CDN), s'adapte parfaitement à mobile et desktop.
 */
function renderConfirmationPage({
  status, // 'pending' | 'already_valide' | 'already_refuse' | 'error' | 'success'
  action = 'valide', // 'valide' | 'refuse'
  token = '',
  errorMessage = '',
  reservation = null
}) {
  const isValideAction = action === 'valide';
  const actionTitle = isValideAction ? 'Validation de la Réservation' : 'Refus de la Réservation';
  const actionColor = isValideAction ? '#10b981' : '#ef4444';

  const espaceLabels = {
    fablab: '🛠️ Espace FabLab',
    studio: '🎥 Studio IDS',
    salle_reunion: '🏢 Les Salles'
  };
  const espaceName = reservation ? (espaceLabels[reservation.espace] || reservation.espace || 'Espace Incubateur') : '';
  const salleName = reservation?.salle ? ` (${reservation.salle})` : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${actionTitle} — Incubateur Digital Solidaire</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f8fafc; }
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between text-slate-800 antialiased p-4 sm:p-6">
  
  <div class="max-w-xl mx-auto w-full my-auto py-6">
    <!-- Header Logo & Marque -->
    <div class="text-center mb-6">
      <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 mb-3 shadow-sm border border-amber-500/20">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
        </svg>
      </div>
      <h2 class="text-lg font-extrabold text-slate-900 tracking-tight">Incubateur Digital Solidaire</h2>
      <p class="text-xs text-slate-500 font-medium">Portail Sécurisé de Supervision & Accompagnement</p>
    </div>

    <!-- Conteneur Principal -->
    <div id="card-container" class="bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden transition-all duration-300">
      
      ${status === 'error' ? `
        <!-- CAS D'ERREUR OU EXPIRATION -->
        <div class="p-6 sm:p-8 text-center">
          <div class="w-16 h-16 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center mb-4">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <h3 class="text-xl font-bold text-slate-900 mb-2">Lien Expiré ou Invalide</h3>
          <p class="text-sm text-slate-600 mb-6 leading-relaxed">
            ${errorMessage || "Ce lien de confirmation n'est plus valable. Le délai de 48h a peut-être été dépassé ou la réservation a été modifiée."}
          </p>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
            Pour toute assistance, connectez-vous directement sur la plateforme IDS ou contactez l'administration.
          </div>
        </div>
      ` : status === 'already_valide' ? `
        <!-- CAS DÉJÀ VALIDÉE -->
        <div class="p-6 sm:p-8 text-center">
          <div class="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-4">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h3 class="text-xl font-bold text-slate-900 mb-2">Réservation Déjà Validée</h3>
          <p class="text-sm text-slate-600 mb-4 leading-relaxed">
            Cette demande pour <strong>${reservation?.nomComplet || 'l\'incubé'}</strong> a déjà été confirmée avec succès.
          </p>
          <div class="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-800 text-left space-y-1">
            <p><strong>Espace :</strong> ${espaceName}${salleName}</p>
            <p><strong>Date & Heure :</strong> ${reservation?.dateReservation ? String(reservation.dateReservation).split('T')[0] : '—'} (${reservation?.heureDebut} - ${reservation?.heureFin})</p>
            ${reservation?.decision_par ? `<p><strong>Validé par :</strong> ${reservation.decision_par}</p>` : ''}
          </div>
        </div>
      ` : status === 'already_refuse' ? `
        <!-- CAS DÉJÀ REFUSÉE -->
        <div class="p-6 sm:p-8 text-center">
          <div class="w-16 h-16 rounded-full bg-slate-100 text-slate-600 mx-auto flex items-center justify-center mb-4">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </div>
          <h3 class="text-xl font-bold text-slate-900 mb-2">Réservation Déjà Refusée</h3>
          <p class="text-sm text-slate-600 mb-4 leading-relaxed">
            Cette demande a déjà été marquée comme refusée. Aucune action supplémentaire n'est requise.
          </p>
          ${reservation?.decision_motif ? `
            <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-left">
              <strong>Motif indiqué :</strong> ${reservation.decision_motif}
            </div>
          ` : ''}
        </div>
      ` : `
        <!-- FORMULAIRE ACTIF DE CONFIRMATION (EN ATTENTE) -->
        <div class="bg-gradient-to-r ${isValideAction ? 'from-emerald-600 to-teal-700' : 'from-rose-600 to-red-700'} p-5 text-white">
          <div class="flex items-center justify-between">
            <span class="text-xs uppercase font-extrabold tracking-wider px-2.5 py-1 rounded-full bg-white/20">
              ${isValideAction ? 'Validation Requise' : 'Refus de Demande'}
            </span>
            <span class="text-xs text-white/80 font-medium">1-Clic Sécurisé</span>
          </div>
          <h3 class="text-lg font-extrabold mt-2 tracking-tight">
            ${isValideAction ? 'Confirmer la Réservation' : 'Refuser la Réservation'}
          </h3>
          <p class="text-xs text-white/80 mt-0.5">
            Vérifiez les détails ci-dessous avant d'enregistrer votre décision.
          </p>
        </div>

        <div class="p-5 sm:p-7 space-y-5">
          <!-- Carte récapitulative -->
          <div class="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3 text-xs">
            <div class="flex items-start justify-between pb-3 border-b border-slate-200/60">
              <div>
                <span class="text-[11px] text-slate-400 font-semibold uppercase block">Porteur de Projet</span>
                <span class="text-sm font-bold text-slate-900">${reservation?.nomComplet || 'Demandeur'}</span>
                ${reservation?.numero_pp ? `<span class="inline-block ml-2 px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded font-mono text-[10px] font-bold">${reservation.numero_pp}</span>` : ''}
              </div>
              <div class="text-right">
                <span class="text-[11px] text-slate-400 font-semibold uppercase block">Espace Demandé</span>
                <span class="text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200">
                  ${espaceName}${salleName}
                </span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200/60">
              <div>
                <span class="text-[11px] text-slate-400 font-semibold uppercase block">Date Prévue</span>
                <span class="text-xs font-bold text-slate-800">${reservation?.dateReservation ? String(reservation.dateReservation).split('T')[0] : '—'}</span>
              </div>
              <div>
                <span class="text-[11px] text-slate-400 font-semibold uppercase block">Créneau Horaire</span>
                <span class="text-xs font-bold text-slate-800">${reservation?.heureDebut || '—'} → ${reservation?.heureFin || '—'} (${reservation?.dureeMinutes ? Math.round(reservation.dureeMinutes/60) + 'h' : '2h'})</span>
              </div>
            </div>

            ${reservation?.motif ? `
              <div>
                <span class="text-[11px] text-slate-400 font-semibold uppercase block mb-0.5">Motif / Contexte</span>
                <p class="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/60 italic">
                  « ${reservation.motif} »
                </p>
              </div>
            ` : ''}

            ${reservation?.equipementsUtilises ? `
              <div>
                <span class="text-[11px] text-slate-400 font-semibold uppercase block mb-0.5">Matériel Demandé</span>
                <p class="text-xs text-slate-700 bg-white p-2 rounded-xl border border-slate-200/60">
                  ${reservation.equipementsUtilises}
                </p>
              </div>
            ` : ''}
          </div>

          <!-- Formulaire d'action -->
          <form id="confirm-form" class="space-y-4">
            <input type="hidden" id="token" value="${token}" />
            <input type="hidden" id="action" value="${action}" />

            ${!isValideAction ? `
              <div>
                <label for="motif" class="block text-xs font-bold text-slate-700 mb-1.5">
                  Motif du refus (optionnel mais recommandé pour l'incubé) :
                </label>
                <textarea
                  id="motif"
                  rows="2"
                  placeholder="Ex : Créneau indisponible pour cause de maintenance..."
                  class="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white shadow-inner"
                ></textarea>
              </div>
            ` : ''}

            <div class="pt-2">
              <button
                type="submit"
                id="submit-btn"
                class="w-full py-3.5 px-4 rounded-xl text-white font-extrabold text-sm shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                  isValideAction 
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25 active:scale-[0.98]' 
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/25 active:scale-[0.98]'
                }"
              >
                ${isValideAction ? `
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
                  <span>Confirmer la Validation en 1 Clic</span>
                ` : `
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  <span>Confirmer le Refus</span>
                `}
              </button>
            </div>

            <p class="text-[11px] text-slate-400 text-center font-medium">
              🔒 Action protégée contre les robots de messagerie • Signature cryptographique vérifiée
            </p>
          </form>

          <!-- Zone de Résultat Dynamique JS -->
          <div id="result-box" class="hidden p-5 rounded-2xl text-center"></div>
        </div>

        <script>
          const form = document.getElementById('confirm-form');
          const submitBtn = document.getElementById('submit-btn');
          const resultBox = document.getElementById('result-box');

          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>Traitement en cours...</span>';

            const token = document.getElementById('token').value;
            const action = document.getElementById('action').value;
            const motifInput = document.getElementById('motif');
            const motif = motifInput ? motifInput.value.trim() : '';

            try {
              const res = await fetch('/api/reservations/confirmer-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, motif })
              });

              const data = await res.json();

              form.classList.add('hidden');
              resultBox.classList.remove('hidden');

              if (data.success) {
                resultBox.className = 'p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center space-y-2';
                resultBox.innerHTML = \`
                  <div class="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <h4 class="text-base font-bold text-slate-900">\${action === 'valide' ? 'Réservation Validée avec Succès !' : 'Demande Refusée'}</h4>
                  <p class="text-xs text-slate-600">\${data.message || 'La décision a été enregistrée et synchronisée avec la plateforme locale.'}</p>
                  <p class="text-[11px] text-slate-400 pt-2">Vous pouvez maintenant fermer cette fenêtre en toute sécurité.</p>
                \`;
              } else {
                resultBox.className = 'p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-center space-y-2';
                resultBox.innerHTML = \`
                  <h4 class="text-base font-bold text-rose-900">Échec du traitement</h4>
                  <p class="text-xs text-rose-700">\${data.message || 'Une erreur est survenue lors de la confirmation.'}</p>
                \`;
              }
            } catch (err) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = '<span>Réessayer</span>';
              alert('Erreur de connexion avec le serveur relais : ' + err.message);
            }
          });
        </script>
      `}
    </div>

    <!-- Footer Sécurité -->
    <div class="text-center mt-6 text-xs text-slate-400">
      <p>© ${new Date().getFullYear()} Incubateur Digital Solidaire • Système de Contrôle & Réservations</p>
    </div>
  </div>

</body>
</html>`;
}

module.exports = {
  renderConfirmationPage
};

