const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Middleware d'authentification spécifique pour le serveur local
const checkSyncAuth = (req, res, next) => {
  const syncSecret = process.env.SYNC_SECRET || 'ids_secret_sync_key_987654321_secure';
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.split(' ')[1]
    : (req.headers['x-sync-secret'] || req.query.secret);

  if (!token || token !== syncSecret) {
    return res.status(401).json({ error: 'Accès refusé : clé de synchronisation invalide ou manquante' });
  }
  next();
};

router.use(checkSyncAuth);

// GET /api/sync/pull — Le serveur local aspire les nouvelles réservations et présences
router.get('/pull', (req, res) => {
  try {
    const reservations = db.getReservations();
    const presences = db.getPresences();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      counts: {
        reservations: reservations.length,
        presences: presences.length
      },
      reservations,
      presences
    });
  } catch (err) {
    console.error('Erreur sync pull:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des données de synchronisation' });
  }
});

// POST /api/sync/clean — Le serveur local confirme les IDs intégrés dans MariaDB pour purge du cloud
router.post('/clean', (req, res) => {
  try {
    const { reservationIds, presenceIds } = req.body;

    let deletedReservations = 0;
    let deletedPresences = 0;

    if (Array.isArray(reservationIds) && reservationIds.length > 0) {
      deletedReservations = db.deleteReservations(reservationIds);
    }

    if (Array.isArray(presenceIds) && presenceIds.length > 0) {
      deletedPresences = db.deletePresences(presenceIds);
    }

    res.json({
      success: true,
      message: 'Nettoyage des données synchronisées effectué avec succès',
      deletedReservations,
      deletedPresences,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Erreur sync clean:', err);
    res.status(500).json({ error: 'Erreur lors de la purge des données synchronisées' });
  }
});

// POST /api/sync/events — Le serveur local pousse ses ateliers / événements récents vers le cloud
router.post('/events', (req, res) => {
  try {
    const { ateliers } = req.body;
    if (!ateliers || (Array.isArray(ateliers) && ateliers.length === 0)) {
      return res.status(400).json({ error: 'Aucun atelier fourni' });
    }

    db.upsertEvenements(ateliers);

    res.json({
      success: true,
      message: 'Ateliers mis à jour sur le relais cloud avec succès',
      count: Array.isArray(ateliers) ? ateliers.length : 1
    });
  } catch (err) {
    console.error('Erreur sync events:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour des ateliers' });
  }
});

module.exports = router;
