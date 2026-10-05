const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connexion à la base de données MySQL Heroku (JawsDB)
// Assurez-vous d'avoir process.env.JAWSDB_URL défini sur Heroku
const pool = mysql.createPool(process.env.JAWSDB_URL || {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ids_cloud_db'
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    relay: 'IDS Incubateur - Cloud Relay Server (React + MySQL)',
    mode: process.env.NODE_ENV || 'production',
    time: new Date().toISOString()
  });
});

// -------------------------------------------------------------
// ROUTES API - RECEPTION DES FORMULAIRES
// -------------------------------------------------------------

// 1. Réception d'une demande de réservation (Fablab / Studio)
app.post('/api/reservations/demande', async (req, res) => {
    try {
        const { espace, salle, nomComplet, telephone, email, dateReservation, heureDebut, heureFin, dureeMinutes, motif, equipementsUtilises } = req.body;
        
        const [result] = await pool.query(
            `INSERT INTO cloud_reservations 
            (espace, salle, nomComplet, telephone, email, dateReservation, heureDebut, heureFin, dureeMinutes, motif, equipementsUtilises) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [espace, salle, nomComplet, telephone, email, dateReservation, heureDebut, heureFin, dureeMinutes, motif, equipementsUtilises]
        );
        
        res.status(201).json({ success: true, message: "Réservation enregistrée sur le cloud", id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Erreur serveur cloud" });
    }
});

// 2. Réception d'un émargement (Événements)
app.post('/api/presence/enregistrer', async (req, res) => {
    try {
        const { atelierId, nom, prenom, pp_numero, time } = req.body;
        
        const [result] = await pool.query(
            `INSERT INTO cloud_presences (atelierId, nom, prenom, pp_numero, timeEmargement) VALUES (?, ?, ?, ?, ?)`,
            [atelierId, nom, prenom, pp_numero, time]
        );
        
        res.status(201).json({ 
            success: true, 
            data: { nom, prenom, pp_numero, time } 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Erreur serveur cloud" });
    }
});

// 3. API pour que le composant React sache si l'événement est forcé (ouvert/fermé)
app.get('/api/presence/atelier/:id/info', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT statutOuverture FROM cloud_ateliers_status WHERE atelierId = ?', [req.params.id]);
        res.json({
            success: true,
            atelier: {
                statutOuverture: rows.length > 0 ? rows[0].statutOuverture : 'auto'
            }
        });
    } catch (error) {
        res.json({ success: true, atelier: { statutOuverture: 'auto' } }); // Fallback silencieux
    }
});

// 4. API de récupération des créneaux déjà pris (pour griser les heures dans React)
app.get('/api/reservations', async (req, res) => {
    try {
        // Le cloud renvoie ses propres réservations en attente
        const [rows] = await pool.query('SELECT dateReservation, heureDebut, heureFin, espace, salle FROM cloud_reservations WHERE sync_status = "pending"');
        res.json(rows);
    } catch (error) {
        res.json([]);
    }
});

// API Factice pour les équipements (React basculera sur son fichier local)
app.get('/api/equipements-espaces', (req, res) => {
    res.json({}); 
});

// -------------------------------------------------------------
// DEPLOIEMENT DU FRONTEND REACT
// -------------------------------------------------------------

// Servir les fichiers React compilés (dossier dist) au lieu du dossier public
const reactDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(reactDistPath));

// Rediriger toutes les autres routes non-API vers React (react-router)
app.get('*', (req, res) => {
    res.sendFile(path.join(reactDistPath, 'index.html'));
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => {
    console.log('========================================================');
    console.log(`🚀 RELAIS CLOUD IDS (REACT) DÉMARRÉ SUR LE PORT ${PORT}`);
    console.log(`🌐 Application publique: http://127.0.0.1:${PORT}`);
    console.log('========================================================');
});

module.exports = app;
