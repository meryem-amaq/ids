const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');
const { verifyConfirmationToken } = require('./utils/tokenHelper');
const { renderConfirmationPage } = require('./views/confirmationView');
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
// Migration automatique silencieuse pour les colonnes de confirmation/décision
(async () => {
    try {
        await pool.query("ALTER TABLE cloud_reservations ADD COLUMN decision VARCHAR(20) DEFAULT 'en_attente'");
    } catch (_) {}
    try {
        await pool.query("ALTER TABLE cloud_reservations ADD COLUMN decision_par VARCHAR(150) DEFAULT NULL");
    } catch (_) {}
    try {
        await pool.query("ALTER TABLE cloud_reservations ADD COLUMN decision_date DATETIME DEFAULT NULL");
    } catch (_) {}
    try {
        await pool.query("ALTER TABLE cloud_reservations ADD COLUMN decision_motif TEXT DEFAULT NULL");
    } catch (_) {}
})();


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

        // Récupérer le numéro PP officiel associé à cet email et vérifier si c'est un compte ADMIN ou STAFF
        const officialPP = authRows[0].pp_numero || '';
        const isStaffOrAdmin = ['ADMIN', 'SUPER_ADMIN', 'ADMINISTRATEUR', 'STAFF', 'ACCOMPAGNATEUR', 'CONSULTANT']
            .includes(String(officialPP).trim().toUpperCase());
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
        // Note: Les Administrateurs et le Staff IDS sont exemptés de toute limitation hebdomadaire
        if (!isStaffOrAdmin) {
            // 1. Studio : Max 1 fois par semaine par email (Incubés)
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

            // 2. Salles : Max 10h par semaine (600 minutes) par email (Incubés)
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
        }

        // 2bis. VÉRIFICATION STRICTE DE COLLISION HORAIRE (ANTI-DOUBLONS & CONCURRENCE SIMULTANÉE)
        let checkConflictQuery = `
            SELECT id, nomComplet, heureDebut, heureFin, salle 
            FROM cloud_reservations 
            WHERE espace = ? 
              AND dateReservation = ? 
              AND sync_status IN ('pending', 'synced')
              AND heureDebut < ? 
              AND heureFin > ?
        `;
        const conflictParams = [espace, dateReservation, heureFin, heureDebut];

        if (targetSalle) {
            checkConflictQuery += ` AND (salle = ? OR salle IS NULL OR salle = '')`;
            conflictParams.push(targetSalle);
        }

        const [conflictRows] = await pool.query(checkConflictQuery, conflictParams);
        if (conflictRows.length > 0) {
            const precisionSalle = targetSalle ? ` pour la salle "${targetSalle}"` : '';
            return res.status(409).json({
                success: false,
                message: `Ce créneau (${heureDebut} à ${heureFin})${precisionSalle} est déjà réservé ou vient d'être pris. Veuillez choisir un autre créneau disponible.`
            });
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
        // Renvoie toutes les réservations actives (en attente ou synchronisées) pour aujourd'hui et les dates futures
        const [rows] = await pool.query(`
            SELECT id, dateReservation, heureDebut, heureFin, espace, salle 
            FROM cloud_reservations 
            WHERE dateReservation >= CURDATE() 
              AND sync_status IN ('pending', 'synced')
            ORDER BY dateReservation ASC, heureDebut ASC
        `);
        const formatted = rows.map(r => {
            let dStr = r.dateReservation;
            if (r.dateReservation instanceof Date) {
                dStr = r.dateReservation.toISOString().split('T')[0];
            } else if (typeof r.dateReservation === 'string') {
                dStr = r.dateReservation.split('T')[0];
            }
            return {
                id: r.id,
                espace: r.espace,
                salle: r.salle,
                salleSpecifique: r.salle,
                dateReservation: dStr,
                heureDebut: r.heureDebut,
                heureFin: r.heureFin
            };
        });
        res.json(formatted);
    } catch (error) {
        console.error("Erreur récupération créneaux cloud :", error);
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
            created_at: r.dateCreation,
            decision: r.decision || 'en_attente',
            decision_par: r.decision_par || null,
            decision_date: r.decision_date || null,
            decision_motif: r.decision_motif || null
        }));

        
        let recentDecisions = [];
        try {
            const [decRows] = await pool.query(
                `SELECT id, espace, salle, nomComplet, email, dateReservation, heureDebut, heureFin, decision, decision_par, decision_date, decision_motif 
                 FROM cloud_reservations 
                 WHERE decision IN ('valide', 'refuse') 
                   AND dateReservation >= CURDATE() - INTERVAL 5 DAY 
                 ORDER BY decision_date DESC LIMIT 50`
            );
            recentDecisions = decRows;
        } catch (_) {}

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
            presences: formattedPresences,
            decisions: recentDecisions
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

// 8. API de réception des réservations locales poussées par le serveur Master (pour bloquer les créneaux en ligne)
app.post('/api/sync/reservations-locales', async (req, res) => {
    try {
        const syncSecret = process.env.SYNC_SECRET || 'ids_secret_sync_key_987654321_secure';
        const authHeader = req.headers.authorization;
        const token = (authHeader && authHeader.startsWith('Bearer '))
            ? authHeader.split(' ')[1]
            : (req.headers['x-sync-secret'] || req.query.secret);

        if (!token || token !== syncSecret) {
            return res.status(401).json({ success: false, message: "Non autorisé : clé de synchronisation invalide" });
        }

        const { reservations } = req.body;
        if (!Array.isArray(reservations)) {
            return res.status(400).json({ success: false, message: "Format invalide : 'reservations' doit être un tableau" });
        }

        let updatedOrInserted = 0;
        for (const r of reservations) {
            const dateStr = r.dateReservation ? String(r.dateReservation).split('T')[0] : null;
            if (!dateStr || !r.heureDebut || !r.heureFin) continue;

            const targetSalle = r.salleSpecifique || r.salle || null;
            const isCancelled = r.statut === 'annule' || r.statut === 'refuse';
            const targetStatus = isCancelled ? 'cancelled' : 'synced';

            // Vérifier si cette réservation existe déjà sur le cloud
            const [existing] = await pool.query(
                `SELECT id, sync_status FROM cloud_reservations 
                 WHERE espace = ? 
                   AND (
                     (salle = ? OR (? IS NULL AND salle IS NULL) OR (? = '' AND (salle IS NULL OR salle = '')))
                   )
                   AND dateReservation = ? 
                   AND heureDebut = ? 
                   AND heureFin = ?
                 LIMIT 1`,
                [r.espace || 'fablab', targetSalle, targetSalle, targetSalle, dateStr, r.heureDebut, r.heureFin]
            );

            if (existing.length > 0) {
                if (existing[0].sync_status !== targetStatus) {
                    await pool.query('UPDATE cloud_reservations SET sync_status = ? WHERE id = ?', [targetStatus, existing[0].id]);
                    updatedOrInserted++;
                }
            } else if (!isCancelled) {
                // Insérer la réservation locale dans JawsDB pour bloquer le créneau sur le QR code en ligne
                await pool.query(
                    `INSERT INTO cloud_reservations 
                    (espace, salle, nomComplet, telephone, email, numero_pp, dateReservation, heureDebut, heureFin, dureeMinutes, motif, equipementsUtilises, sync_status) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
                    [
                        r.espace || 'fablab',
                        targetSalle,
                        r.nomIncube || r.nomComplet || 'Réservation Locale IDS',
                        r.telephoneIncube || r.telephone || '',
                        r.emailIncube || r.email || '',
                        r.ppNumero || '',
                        dateStr,
                        r.heureDebut,
                        r.heureFin,
                        r.dureeMinutes || 120,
                        r.motifUtilisation || 'Réservé en local par administration',
                        r.equipementsUtilises || ''
                    ]
                );
                updatedOrInserted++;
            }
        }

        res.json({ success: true, count: updatedOrInserted });
    } catch (error) {
        console.error("Erreur sync reservations-locales cloud :", error);
        res.status(500).json({ success: false, message: error.message });
    }
});


// -------------------------------------------------------------
// DEPLOIEMENT DU FRONTEND REACT
// -------------------------------------------------------------


// =============================================================
// VALIDATION SÉCURISÉE DES RÉSERVATIONS PAR EMAIL (1-CLIC)
// Protégée contre les robots anti-virus et les attaques par force brute
// =============================================================

// Page Web de confirmation (Affichage GET - Ne modifie jamais la base - Anti-Bot)
app.get('/confirmer-reservation', async (req, res) => {
    // 1. Protection Anti-Bot (Scanners d'emails, pre-fetching)
    // Les bots d'analyse effectuent un GET pour tester l'URL sans intention d'action.
    const isBotPrefetch = req.headers['x-purpose'] === 'preview' || req.headers['purpose'] === 'prefetch';
    if (isBotPrefetch) {
        return res.status(200).send('<!-- Anti-bot prefetch ignored -->');
    }

    const { token } = req.query;
    if (!token) {
        return res.status(400).send(renderConfirmationPage({
            status: 'error',
            errorMessage: 'Aucun jeton de validation sécurisé fourni dans ce lien.'
        }));
    }

    // 2. Vérification cryptographique du token HMAC-SHA256
    const verification = verifyConfirmationToken(token);
    if (!verification.valid) {
        return res.status(400).send(renderConfirmationPage({
            status: 'error',
            errorMessage: verification.error
        }));
    }

    const { rid, act, eml, date, deb, fin, esp, inc } = verification.payload;

    try {
        // 3. Récupération des détails de la réservation
        let [rows] = await pool.query(
            'SELECT * FROM cloud_reservations WHERE id = ? LIMIT 1',
            [rid]
        );

        // Fallback ultra-robuste : si l'ID ne matche pas directement (ex: jeton généré avec l'ID local du serveur)
        if (rows.length === 0 && (date || deb || esp)) {
            const fDate = date;
            const fDeb = deb;
            const fEsp = esp;
            if (fDate && fDeb && fEsp) {
                [rows] = await pool.query(
                    `SELECT * FROM cloud_reservations 
                     WHERE dateReservation = ? AND heureDebut = ? AND espace = ? 
                     ORDER BY id DESC LIMIT 1`,
                    [fDate, fDeb, fEsp]
                );
            }
        }

        if (rows.length === 0 && inc && date) {
            [rows] = await pool.query(
                `SELECT * FROM cloud_reservations 
                 WHERE (email = ? OR nomComplet LIKE ?) AND dateReservation = ? 
                 ORDER BY id DESC LIMIT 1`,
                [inc, `%${inc}%`, date]
            );
        }

        // Rétrocompatibilité absolue (anciens emails déjà envoyés avec ID local uniquement)
        if (rows.length === 0) {
            const [recentRows] = await pool.query(
                `SELECT * FROM cloud_reservations 
                 WHERE dateReservation >= CURDATE() - INTERVAL 1 DAY 
                 ORDER BY id DESC LIMIT 1`
            );
            if (recentRows.length > 0) {
                rows = recentRows;
            }
        }

        if (rows.length === 0) {
            return res.status(404).send(renderConfirmationPage({
                status: 'error',
                errorMessage: 'Cette demande de réservation est introuvable ou a été archivée.'
            }));
        }

        const resData = rows[0];

        // 4. Vérification si déjà traitée (Anti-Rejeu)
        if (resData.decision === 'valide' || (resData.sync_status === 'synced' && resData.statut === 'valide')) {
            return res.send(renderConfirmationPage({
                status: 'already_valide',
                action: act,
                reservation: resData
            }));
        }

        if (resData.decision === 'refuse' || resData.sync_status === 'cancelled') {
            return res.send(renderConfirmationPage({
                status: 'already_refuse',
                action: act,
                reservation: resData
            }));
        }

        // 5. Affichage du formulaire d'action en 1 clic
        res.send(renderConfirmationPage({
            status: 'pending',
            action: act,
            token,
            reservation: resData
        }));
    } catch (err) {
        console.error('Erreur confirmation GET:', err);
        res.status(500).send(renderConfirmationPage({
            status: 'error',
            errorMessage: 'Erreur technique lors du chargement de la réservation.'
        }));
    }
});

// Endpoint POST d'exécution réelle (Appelé par le clic humain sur le bouton)
app.post('/api/reservations/confirmer-token', async (req, res) => {
    try {
        const { token, motif } = req.body;
        if (!token) {
            return res.status(400).json({ success: false, message: 'Token manquant' });
        }

        const verification = verifyConfirmationToken(token);
        if (!verification.valid) {
            return res.status(400).json({ success: false, message: verification.error });
        }

        const { rid, act, eml, date, deb, fin, esp, inc } = verification.payload;
        const targetDecision = act === 'refuse' ? 'refuse' : 'valide';
        const cleanMotif = motif ? String(motif).trim() : null;

        let [rows] = await pool.query(
            'SELECT id, decision FROM cloud_reservations WHERE id = ? LIMIT 1',
            [rid]
        );

        if (rows.length === 0 && (date || deb || esp)) {
            const fDate = date;
            const fDeb = deb;
            const fEsp = esp;
            if (fDate && fDeb && fEsp) {
                [rows] = await pool.query(
                    `SELECT id, decision FROM cloud_reservations 
                     WHERE dateReservation = ? AND heureDebut = ? AND espace = ? 
                     ORDER BY id DESC LIMIT 1`,
                    [fDate, fDeb, fEsp]
                );
            }
        }

        if (rows.length === 0 && inc && date) {
            [rows] = await pool.query(
                `SELECT id, decision FROM cloud_reservations 
                 WHERE (email = ? OR nomComplet LIKE ?) AND dateReservation = ? 
                 ORDER BY id DESC LIMIT 1`,
                [inc, `%${inc}%`, date]
            );
        }

        // Rétrocompatibilité absolue (anciens emails déjà envoyés avec ID local uniquement)
        if (rows.length === 0) {
            const [recentRows] = await pool.query(
                `SELECT id, decision FROM cloud_reservations 
                 WHERE dateReservation >= CURDATE() - INTERVAL 1 DAY 
                 ORDER BY id DESC LIMIT 1`
            );
            if (recentRows.length > 0) {
                rows = recentRows;
            }
        }

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Réservation introuvable' });
        }

        const targetCloudId = rows[0].id;

        if (rows[0].decision === 'valide' || rows[0].decision === 'refuse') {
            return res.json({ 
                success: true, 
                message: `Cette réservation a déjà été enregistrée comme "${rows[0].decision}".` 
            });
        }

        await pool.query(
            `UPDATE cloud_reservations 
             SET decision = ?, decision_par = ?, decision_date = NOW(), decision_motif = ? 
             WHERE id = ?`,
            [targetDecision, eml || 'Accompagnateur', cleanMotif, targetCloudId]
        );

        console.log(`✅ [Cloud Confirmation] Réservation #${targetCloudId} marquée comme "${targetDecision}" par ${eml || 'Accompagnateur'}`);

        res.json({
            success: true,
            message: targetDecision === 'valide' 
                ? 'La réservation a été validée avec succès !' 
                : 'La demande de réservation a été refusée.'
        });
    } catch (err) {
        console.error('Erreur confirmation POST:', err);
        res.status(500).json({ success: false, message: 'Erreur serveur lors de la validation' });
    }
});

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
