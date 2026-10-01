const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/reservations (Retourne les créneaux déjà réservés pour éviter les collisions)
router.get('/', (req, res) => {
  try {
    const list = db.getReservations();
    // Ne renvoyer que les infos publiques (date, heure, espace)
    const publicSlots = list.map(r => ({
      id: r.id,
      espace: r.espace,
      salleSpecifique: r.salle_specifique || r.salleSpecifique,
      dateReservation: r.date_reservation || r.dateReservation,
      heureDebut: r.heure_debut || r.heureDebut,
      heureFin: r.heure_fin || r.heureFin,
      duree: r.duree
    }));
    res.json(publicSlots);
  } catch (err) {
    console.error('Erreur get reservations:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/reservations et POST /api/reservations/demande (Reçoit la réservation depuis le formulaire QR Code)
const handleReservationCreation = (req, res) => {
  try {
    const nom = (req.body.nomIncube || req.body.nomComplet || req.body.nom || '').trim();
    const email = (req.body.emailIncube || req.body.email || '').trim();
    const telephone = (req.body.telephoneIncube || req.body.telephone || '').trim();
    const motif = (req.body.motifUtilisation || req.body.motif || '').trim();
    const salleSpecifique = (req.body.salleSpecifique || req.body.salle || '').trim() || null;
    const { espace, dateReservation, heureDebut, heureFin, duree, equipementsUtilises } = req.body;

    if (!nom || !dateReservation || !heureDebut || !heureFin) {
      return res.status(400).json({
        message: 'Champs obligatoires manquants : nom, dateReservation, heureDebut, heureFin'
      });
    }

    const payload = {
      espace: espace || 'fablab',
      salleSpecifique,
      nomIncube: nom,
      emailIncube: email,
      telephoneIncube: telephone,
      dateReservation,
      heureDebut,
      heureFin,
      duree: duree || '2h',
      motifUtilisation: motif,
      equipementsUtilises: Array.isArray(equipementsUtilises) ? equipementsUtilises.join(', ') : (equipementsUtilises || null)
    };

    const record = db.insertReservation(payload);

    res.status(201).json({
      success: true,
      message: 'Demande de réservation enregistrée avec succès. Elle sera validée par l\'administration de l\'incubateur.',
      data: record
    });
  } catch (err) {
    console.error('Erreur insertion réservation:', err);
    res.status(500).json({ message: 'Erreur lors de l\'enregistrement de la réservation' });
  }
};

router.post('/', handleReservationCreation);
router.post('/demande', handleReservationCreation);

module.exports = router;
