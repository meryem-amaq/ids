const express = require('express');
const router = express.Router();
const db = require('../config/database');

/**
 * Helper de vérification de la plage horaire d'un atelier
 */
function verifyAtelierWindow(event) {
  if (!event) return { isOpen: true }; // Si l'atelier n'est pas encore synchronisé, on accepte par défaut pour ne pas bloquer

  const statut = event.statut_ouverture || event.statutOuverture || 'auto';
  if (statut === 'ouvert_force') {
    return { isOpen: true, message: 'Ouvert manuellement par l\'administrateur' };
  }
  if (statut === 'cloture') {
    return { isOpen: false, message: 'Cet atelier est clôturé. L\'émargement est définitivement fermé.' };
  }

  // Cas automatique : vérification date et heure (avec marge de 15 min avant et 30 min après)
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const eventDate = event.date;

    if (eventDate !== todayStr) {
      if (eventDate > todayStr) {
        return { isOpen: false, message: `Cet atelier aura lieu le ${eventDate}. L'émargement n'est pas encore ouvert.` };
      } else {
        return { isOpen: false, message: `Cet atelier a eu lieu le ${eventDate}. L'émargement est désormais clos.` };
      }
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const parseMinutes = (timeStr, defaultMin) => {
      if (!timeStr) return defaultMin;
      const [h, m] = timeStr.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const startMinutes = parseMinutes(event.heure_debut || event.heureDebut, 9 * 60 + 30) - 15; // 15 min avant
    const endMinutes = parseMinutes(event.heure_fin || event.heureFin, 12 * 60 + 30) + 30; // 30 min après

    if (currentMinutes < startMinutes) {
      return { isOpen: false, message: 'L\'émargement ouvrira 15 minutes avant le début de l\'atelier.' };
    }
    if (currentMinutes > endMinutes) {
      return { isOpen: false, message: 'La séance est terminée. Le créneau d\'émargement est clôturé.' };
    }

    return { isOpen: true };
  } catch (err) {
    return { isOpen: true };
  }
}

// POST /api/presences (Enregistre l'émargement d'un incubé ou participant)
router.post('/', (req, res) => {
  try {
    const { atelierId, incubeId, nom, prenom, ppNumero, time } = req.body;

    if (!atelierId || (!nom && !incubeId)) {
      return res.status(400).json({ message: 'Identifiant de l\'atelier et nom du participant requis' });
    }

    // Vérifier l'état de l'atelier si disponible
    const event = db.getEvenementById(atelierId);
    if (event) {
      const check = verifyAtelierWindow(event);
      if (!check.isOpen) {
        return res.status(403).json({ message: check.message });
      }
    }

    const timeStr = time || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const record = db.insertPresence({
      atelierId: String(atelierId),
      incubeId: incubeId ? String(incubeId) : null,
      nom: (nom || '—').trim(),
      prenom: (prenom || '—').trim(),
      ppNumero: (ppNumero || '—').trim(),
      time: timeStr
    });

    res.status(201).json({
      success: true,
      message: 'Votre présence a été enregistrée avec succès.',
      data: record
    });
  } catch (err) {
    console.error('Erreur enregistrement présence:', err);
    res.status(500).json({ message: 'Erreur lors de l\'enregistrement de la présence' });
  }
});

module.exports = router;
