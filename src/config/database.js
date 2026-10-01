const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'relay.sqlite');
let db = null;
let useNativeSqlite = false;

try {
  const { DatabaseSync } = require('node:sqlite');
  db = new DatabaseSync(dbPath);
  useNativeSqlite = true;
  console.log('✅ Base de données SQLite native activée :', dbPath);

  // Initialisation des tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservations_attente (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      espace TEXT NOT NULL,
      salle_specifique TEXT,
      nom_incube TEXT NOT NULL,
      email_incube TEXT,
      telephone_incube TEXT,
      date_reservation TEXT NOT NULL,
      heure_debut TEXT NOT NULL,
      heure_fin TEXT NOT NULL,
      duree TEXT DEFAULT '2h',
      motif_utilisation TEXT,
      equipements_utilises TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS presences_attente (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      atelier_id TEXT NOT NULL,
      incube_id TEXT,
      nom TEXT NOT NULL,
      prenom TEXT,
      pp_numero TEXT,
      time TEXT,
      signed_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS evenements_publics (
      id TEXT PRIMARY KEY,
      titre TEXT NOT NULL,
      formateur TEXT,
      intervenant TEXT,
      date TEXT NOT NULL,
      heure_debut TEXT,
      heure_fin TEXT,
      duree TEXT,
      description TEXT,
      statut_ouverture TEXT DEFAULT 'auto',
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
} catch (e) {
  console.warn('⚠️ SQLite natif non disponible, utilisation du stockage JSON sécurisé.', e.message);
  useNativeSqlite = false;
}

// Fallback JSON si nécessaire
const jsonDbPath = path.join(dataDir, 'relay.json');
function readJsonDb() {
  if (!fs.existsSync(jsonDbPath)) {
    const initData = { reservations: [], presences: [], evenements: [] };
    fs.writeFileSync(jsonDbPath, JSON.stringify(initData, null, 2), 'utf-8');
    return initData;
  }
  try {
    return JSON.parse(fs.readFileSync(jsonDbPath, 'utf-8'));
  } catch {
    return { reservations: [], presences: [], evenements: [] };
  }
}

function writeJsonDb(data) {
  fs.writeFileSync(jsonDbPath, JSON.stringify(data, null, 2), 'utf-8');
}

// Interface unifiée d'accès aux données
const database = {
  // RESERVATIONS
  insertReservation(data) {
    if (useNativeSqlite) {
      const stmt = db.prepare(`
        INSERT INTO reservations_attente 
        (espace, salle_specifique, nom_incube, email_incube, telephone_incube, date_reservation, heure_debut, heure_fin, duree, motif_utilisation, equipements_utilises)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        data.espace || 'fablab',
        data.salleSpecifique || null,
        data.nomIncube,
        data.emailIncube || null,
        data.telephoneIncube || null,
        data.dateReservation,
        data.heureDebut,
        data.heureFin,
        data.duree || '2h',
        data.motifUtilisation || null,
        data.equipementsUtilises || null
      );
      return { id: Number(result.lastInsertRowid), ...data };
    } else {
      const store = readJsonDb();
      const newId = store.reservations.length ? Math.max(...store.reservations.map(r => r.id)) + 1 : 1;
      const record = { id: newId, ...data, created_at: new Date().toISOString() };
      store.reservations.push(record);
      writeJsonDb(store);
      return record;
    }
  },

  getReservations() {
    if (useNativeSqlite) {
      return db.prepare('SELECT * FROM reservations_attente ORDER BY id ASC').all();
    } else {
      return readJsonDb().reservations;
    }
  },

  deleteReservations(ids) {
    if (!ids || ids.length === 0) return 0;
    if (useNativeSqlite) {
      const placeholders = ids.map(() => '?').join(',');
      const stmt = db.prepare(`DELETE FROM reservations_attente WHERE id IN (${placeholders})`);
      stmt.run(...ids);
      return ids.length;
    } else {
      const store = readJsonDb();
      store.reservations = store.reservations.filter(r => !ids.includes(r.id));
      writeJsonDb(store);
      return ids.length;
    }
  },

  // PRESENCES
  insertPresence(data) {
    if (useNativeSqlite) {
      const stmt = db.prepare(`
        INSERT INTO presences_attente 
        (atelier_id, incube_id, nom, prenom, pp_numero, time)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        String(data.atelierId),
        data.incubeId ? String(data.incubeId) : null,
        data.nom,
        data.prenom || '—',
        data.ppNumero || '—',
        data.time || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      );
      return { id: Number(result.lastInsertRowid), ...data };
    } else {
      const store = readJsonDb();
      const newId = store.presences.length ? Math.max(...store.presences.map(p => p.id)) + 1 : 1;
      const record = { id: newId, ...data, signed_at: new Date().toISOString() };
      store.presences.push(record);
      writeJsonDb(store);
      return record;
    }
  },

  getPresences() {
    if (useNativeSqlite) {
      return db.prepare('SELECT * FROM presences_attente ORDER BY id ASC').all();
    } else {
      return readJsonDb().presences;
    }
  },

  deletePresences(ids) {
    if (!ids || ids.length === 0) return 0;
    if (useNativeSqlite) {
      const placeholders = ids.map(() => '?').join(',');
      const stmt = db.prepare(`DELETE FROM presences_attente WHERE id IN (${placeholders})`);
      stmt.run(...ids);
      return ids.length;
    } else {
      const store = readJsonDb();
      store.presences = store.presences.filter(p => !ids.includes(p.id));
      writeJsonDb(store);
      return ids.length;
    }
  },

  // EVENEMENTS PUBLICS (Copie synchronisée pour l'affichage de l'atelier sur le cloud)
  upsertEvenements(eventsList) {
    if (!Array.isArray(eventsList)) eventsList = [eventsList];
    if (useNativeSqlite) {
      const stmt = db.prepare(`
        INSERT INTO evenements_publics 
        (id, titre, formateur, intervenant, date, heure_debut, heure_fin, duree, description, statut_ouverture, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          titre = excluded.titre,
          formateur = excluded.formateur,
          intervenant = excluded.intervenant,
          date = excluded.date,
          heure_debut = excluded.heure_debut,
          heure_fin = excluded.heure_fin,
          duree = excluded.duree,
          description = excluded.description,
          statut_ouverture = excluded.statut_ouverture,
          updated_at = datetime('now')
      `);
      for (const ev of eventsList) {
        stmt.run(
          String(ev.id),
          ev.titre || 'Atelier',
          ev.formateur || 'Formateur IDS',
          ev.intervenant || null,
          ev.date,
          ev.heureDebut || ev.heure_debut || '09:30',
          ev.heureFin || ev.heure_fin || '12:30',
          ev.duree || '3h00',
          ev.description || null,
          ev.statutOuverture || ev.statut_ouverture || 'auto'
        );
      }
    } else {
      const store = readJsonDb();
      for (const ev of eventsList) {
        const idStr = String(ev.id);
        const idx = store.evenements.findIndex(e => String(e.id) === idStr);
        const record = {
          id: idStr,
          titre: ev.titre || 'Atelier',
          formateur: ev.formateur || 'Formateur IDS',
          intervenant: ev.intervenant || null,
          date: ev.date,
          heure_debut: ev.heureDebut || ev.heure_debut || '09:30',
          heure_fin: ev.heureFin || ev.heure_fin || '12:30',
          duree: ev.duree || '3h00',
          description: ev.description || null,
          statut_ouverture: ev.statutOuverture || ev.statut_ouverture || 'auto',
          updated_at: new Date().toISOString()
        };
        if (idx >= 0) {
          store.evenements[idx] = record;
        } else {
          store.evenements.push(record);
        }
      }
      writeJsonDb(store);
    }
  },

  getEvenementById(id) {
    const idStr = String(id);
    if (useNativeSqlite) {
      return db.prepare('SELECT * FROM evenements_publics WHERE id = ?').get(idStr) || null;
    } else {
      const store = readJsonDb();
      return store.evenements.find(e => String(e.id) === idStr) || null;
    }
  },

  getAllEvenements() {
    if (useNativeSqlite) {
      return db.prepare('SELECT * FROM evenements_publics ORDER BY date DESC').all();
    } else {
      return readJsonDb().evenements;
    }
  }
};

module.exports = database;
