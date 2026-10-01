const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/events/:id
router.get('/:id', (req, res) => {
  try {
    const event = db.getEvenementById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Atelier non trouvé ou non encore synchronisé' });
    }
    res.json(event);
  } catch (err) {
    console.error('Erreur get event:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/events
router.get('/', (req, res) => {
  try {
    const list = db.getAllEvenements();
    res.json(list);
  } catch (err) {
    console.error('Erreur get all events:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
