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

// 1. Réception d'une demande de réservation (Fablab / Studio / Salles)
app.post('/api/reservations/demande', async (req, res) => {
    try {
        const { espace, salle, salleSpecifique, nomComplet, telephone, email, numero_pp, dateReservation, heureDebut, heureFin, dureeMinutes, duree, motif, equipementsUtilises } = req.body;
        
        // 1. Nettoyage strict et validation de l'adresse email
        const cleanEmail = email ? String(email).trim().toLowerCase() : '';
        if (!cleanEmail || !cleanEmail.includes('@')) {
            return res.status(400).json({ 
                success: false, 
                message: "L'adresse email est obligatoire et doit être valide pour réserver." 
            });
        }

        // 2. VÉRIFICATION STRICTE PAR EMAIL DANS LA LISTE BLANCHE
        // Seuls les porteurs de projet dont l'adresse email est dans la liste blanche sont autorisés.
        const [authRows] = await pool.query(
            'SELECT email, pp_numero FROM cloud_porteurs_autorises WHERE LOWER(TRIM(email)) = ?',
            [cleanEmail]
        );

        if (authRows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: "Accès refusé : Cette adresse email n'est pas autorisée sur la liste blanche de l'incubateur." 
            });
        }

        // Récupérer le numéro PP officiel associé à cet email
        const officialPP = authRows[0].pp_numero || '';
        const cleanPP = (numero_pp ? String(numero_pp).trim().toUpperCase() : '') || officialPP;
        const cleanNom = String(nomComplet || '').trim();
        const cleanTel = telephone ? String(telephone).trim() : '';
        const targetSalle = salleSpecifique || salle || null;

        // Calcul propre de la durée en minutes si format '1h', '2h', '4h' ou numérique
        let parsedMinutes = 120;
        if (dureeMinutes && !isNaN(dureeMinutes)) {
            parsedMinutes = parseInt(dureeMinutes, 10);
        } else if (duree && typeof duree === 'string') {
            const matchH = duree.match(/(\d+)\s*h/i);
            if (matchH) parsedMinutes = parseInt(matchH[1], 10) * 60;
        } else if (espace === 'fablab') {
            parsedMinutes = 60;
        } else if (espace === 'studio') {
            parsedMinutes = 240;
        }

        // --- RÈGLES DE LIMITATION PAR SEMAINE ---
        
        // 1. Studio : Max 1 fois par semaine par email
        if (espace === 'studio') {
            const [studioRows] = await pool.query(
                `SELECT COUNT(*) as total 
                 FROM cloud_reservations 
                 WHERE LOWER(TRIM(email)) = ?
                 AND espace = 'studio' 
                 AND YEARWEEK(dateReservation, 1) = YEARWEEK(?, 1)`,
                [cleanEmail, dateReservation]
            );
            if (studioRows[0].total >= 1) {
                return res.status(403).json({
                    success: false,
                    message: "Limite atteinte : Vous avez déjà réservé le Studio cette semaine (maximum 1 fois par semaine)."
                });
            }
        }

        // 2. Salles : Max 10h par semaine (600 minutes) par email
        if (espace === 'salle_reunion') {
            const [salleRows] = await pool.query(
                `SELECT SUM(dureeMinutes) as total_minutes 
                 FROM cloud_reservations 
                 WHERE LOWER(TRIM(email)) = ?
                 AND espace = 'salle_reunion' 
                 AND YEARWEEK(dateReservation, 1) = YEARWEEK(?, 1)`,
                [cleanEmail, dateReservation]
            );
            const totalPrecedent = salleRows[0].total_minutes || 0;
            if (totalPrecedent + parsedMinutes > 600) {
                return res.status(403).json({
                    success: false,
                    message: `Limite atteinte : Vous avez déjà réservé ${totalPrecedent / 60}h de salles cette semaine (maximum 10h par semaine).`
                });
            }
        }

        // 3. Enregistrement sécurisé
        const [result] = await pool.query(
            `INSERT INTO cloud_reservations 
            (espace, salle, nomComplet, telephone, email, numero_pp, dateReservation, heureDebut, heureFin, dureeMinutes, motif, equipementsUtilises) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [espace, targetSalle, cleanNom, cleanTel, cleanEmail, cleanPP, dateReservation, heureDebut, heureFin, parsedMinutes, motif, equipementsUtilises]
        );
        
        res.status(201).json({ success: true, message: "Réservation enregistrée sur le cloud", id: result.insertId });
    } catch (error) {
        console.error("Erreur enregistrement réservation cloud :", error);
        res.status(500).json({ success: false, message: "Erreur serveur cloud" });
    }
});

// 2. Réception d'un émargement (Événements & Formations)
const handlePresenceRegistration = async (req, res) => {
    try {
        const { atelierId, nom, prenom, email, pp_numero, ppNumero, time } = req.body;
        
        if (!atelierId || !nom) {
            return res.status(400).json({ success: false, message: "Identifiant d'atelier et nom requis." });
        }

        const cleanEmail = email ? String(email).trim().toLowerCase() : '';
        if (!cleanEmail || !cleanEmail.includes('@')) {
            return res.status(400).json({ 
                success: false, 
                message: "L'adresse email est obligatoire et doit être valide pour émarger." 
            });
        }

        const cleanNom = String(nom).trim().toUpperCase();
        const cleanPrenom = prenom ? String(prenom).trim() : '—';
        const cleanPp = (pp_numero || ppNumero || '—').trim().toUpperCase();
        const timeStr = time || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        // S'assurer silencieusement que la colonne email existe dans cloud_presences
        try {
            await pool.query("ALTER TABLE cloud_presences ADD COLUMN email VARCHAR(150) NOT NULL DEFAULT '' AFTER prenom");
        } catch (_) {}

        const [result] = await pool.query(
            `INSERT INTO cloud_presences (atelierId, nom, prenom, email, pp_numero, timeEmargement) VALUES (?, ?, ?, ?, ?, ?)`,
            [atelierId, cleanNom, cleanPrenom, cleanEmail, cleanPp, timeStr]
        );
        
        res.status(201).json({ 
            success: true, 
            message: "Présence enregistrée avec succès sur le relais cloud",
            data: { 
                id: result.insertId,
                atelierId, 
                nom: cleanNom, 
                prenom: cleanPrenom, 
                email: cleanEmail, 
                pp_numero: cleanPp, 
                time: timeStr 
            } 
        });
    } catch (error) {
        console.error("Erreur enregistrement présence cloud :", error);
        res.status(500).json({ success: false, message: "Erreur serveur cloud" });
    }
};

app.post('/api/presence/enregistrer', handlePresenceRegistration);
app.post('/api/presences', handlePresenceRegistration);

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

// 5. API de synchronisation de la liste blanche (Appelée par le serveur local)
app.post('/api/sync/whitelist', async (req, res) => {
    try {
        const { secret, porteurs } = req.body;
        
        // Sécurité basique : on s'assure que c'est le serveur local qui appelle
        if (secret !== 'MON_SECRET_DE_SYNC_123') {
            return res.status(401).json({ success: false, message: "Non autorisé" });
        }

        if (!Array.isArray(porteurs)) {
            return res.status(400).json({ success: false, message: "Format invalide" });
        }

        // On vide la table et on la remplit
        await pool.query('TRUNCATE TABLE cloud_porteurs_autorises');
        
        if (porteurs.length > 0) {
            const values = porteurs.map(p => [p.email, p.pp_numero]);
            await pool.query(
                'INSERT INTO cloud_porteurs_autorises (email, pp_numero) VALUES ?',
                [values]
            );
        }

        res.json({ success: true, message: `Liste blanche synchronisée avec ${porteurs.length} porteurs.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Erreur serveur cloud" });
    }
});

// 6. API d'aspiration pour le serveur local (Pull des réservations et présences)
app.get('/api/sync/pull', async (req, res) => {
    try {
        const [reservations] = await pool.query(
            'SELECT * FROM cloud_reservations WHERE sync_status = "pending" ORDER BY id ASC'
        );
        const [presences] = await pool.query(
            'SELECT * FROM cloud_presences WHERE sync_status = "pending" ORDER BY id ASC'
        );

        // Formatage pour conformité parfaite avec SyncService.js (supporte tous les alias de champs)
        const formattedReservations = reservations.map(r => ({
            id: r.id,
            espace: r.espace,
            salle: r.salle,
            salle_specifique: r.salle,
            salleSpecifique: r.salle,
            nomComplet: r.nomComplet,
            nom_incube: r.nomComplet,
            nomIncube: r.nomComplet,
            email: r.email,
            email_incube: r.email,
            emailIncube: r.email,
            telephone: r.telephone,
            telephone_incube: r.telephone,
            telephoneIncube: r.telephone,
            numero_pp: r.numero_pp,
            pp_numero: r.numero_pp,
            dateReservation: r.dateReservation,
            date_reservation: r.dateReservation,
            heureDebut: r.heureDebut,
            heure_debut: r.heureDebut,
            heureFin: r.heureFin,
            heure_fin: r.heureFin,
            duree: `${Math.round((r.dureeMinutes || 120) / 60)}h`,
            dureeMinutes: r.dureeMinutes,
            motif: r.motif,
            motif_utilisation: r.motif,
            motifUtilisation: r.motif,
            equipementsUtilises: r.equipementsUtilises,
            equipements_utilises: r.equipementsUtilises,
            dateCreation: r.dateCreation,
            created_at: r.dateCreation
        }));

        const formattedPresences = presences.map(p => ({
            id: p.id,
            atelier_id: p.atelierId,
            nom: p.nom,
            prenom: p.prenom,
            email: p.email,
            pp_numero: p.pp_numero,
            time: p.timeEmargement || p.time,
            created_at: p.created_at
        }));

        res.json({
            success: true,
            reservations: formattedReservations,
            presences: formattedPresences
        });
    } catch (error) {
        console.error("Erreur sync pull cloud :", error);
        res.status(500).json({ success: false, message: "Erreur récupération sync cloud" });
    }
});

// 7. API de confirmation de purge / marquage après aspiration locale
app.post('/api/sync/clean', async (req, res) => {
    try {
        const { reservationIds, presenceIds } = req.body;
        
        if (Array.isArray(reservationIds) && reservationIds.length > 0) {
            await pool.query('UPDATE cloud_reservations SET sync_status = "synced" WHERE id IN (?)', [reservationIds]);
        }
        if (Array.isArray(presenceIds) && presenceIds.length > 0) {
            await pool.query('UPDATE cloud_presences SET sync_status = "synced" WHERE id IN (?)', [presenceIds]);
        }

        res.json({ success: true, message: "Éléments synchronisés avec succès" });
    } catch (error) {
        console.error("Erreur sync clean cloud :", error);
        res.status(500).json({ success: false, message: "Erreur marquage sync cloud" });
    }
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
