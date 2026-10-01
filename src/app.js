require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const reservationsRouter = require('./routes/reservations');
const presencesRouter = require('./routes/presences');
const eventsRouter = require('./routes/events');
const syncRouter = require('./routes/sync');

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares globaux
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-sync-secret']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Fichiers statiques publics
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// Routes API
app.use('/api/reservations', reservationsRouter);
app.use('/api/presences', presencesRouter);
app.use('/api/presence', presencesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/ateliers', eventsRouter);
app.use('/api/sync', syncRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    relay: 'IDS Incubateur - Cloud Relay Server',
    mode: process.env.NODE_ENV || 'production',
    time: new Date().toISOString()
  });
});

// Alias conviviaux pour les pages publiques (QR Codes)
app.get(['/booking', '/booking/:espace', '/reserver-espace', '/reserver-espace/:espace'], (req, res) => {
  res.sendFile(path.join(publicDir, 'booking.html'));
});

app.get(['/emargement', '/emargement/:id', '/presence', '/presence/:id'], (req, res) => {
  res.sendFile(path.join(publicDir, 'emargement.html'));
});

// Page d'accueil portail
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log('========================================================');
  console.log(`🚀 RELAIS CLOUD IDS DÉMARRÉ SUR LE PORT ${PORT}`);
  console.log(`🌐 Accès local : http://127.0.0.1:${PORT}`);
  console.log(`📋 Réservations : http://127.0.0.1:${PORT}/booking`);
  console.log(`✍️  Émargement  : http://127.0.0.1:${PORT}/emargement`);
  console.log(`🔄 Sync Endpoint: http://127.0.0.1:${PORT}/api/sync/pull`);
  console.log('========================================================');
});


module.exports = app;
