require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool(process.env.JAWSDB_URL || {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ids_cloud_db'
});

async function setupDatabase() {
    try {
        console.log("Connexion à la base de données MySQL du Relais Cloud...");

        console.log("1. Création de la table cloud_porteurs_autorises...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cloud_porteurs_autorises (
                email VARCHAR(150) NOT NULL PRIMARY KEY,
                pp_numero VARCHAR(50) DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        console.log("2. Création de la table cloud_reservations...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cloud_reservations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                espace VARCHAR(100) NOT NULL,
                salle VARCHAR(100) DEFAULT NULL,
                nomComplet VARCHAR(150) NOT NULL,
                telephone VARCHAR(50) DEFAULT NULL,
                email VARCHAR(150) DEFAULT NULL,
                numero_pp VARCHAR(50) DEFAULT NULL,
                dateReservation DATE NOT NULL,
                heureDebut VARCHAR(10) NOT NULL,
                heureFin VARCHAR(10) NOT NULL,
                dureeMinutes INT NOT NULL,
                motif TEXT,
                equipementsUtilises TEXT,
                dateCreation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sync_status ENUM('pending', 'synced', 'cancelled') DEFAULT 'pending',
                decision VARCHAR(20) DEFAULT 'en_attente',
                decision_par VARCHAR(150) DEFAULT NULL,
                decision_date DATETIME DEFAULT NULL,
                decision_motif TEXT DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        console.log("3. Création de la table cloud_presences...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cloud_presences (
                id INT AUTO_INCREMENT PRIMARY KEY,
                atelierId VARCHAR(50) NOT NULL,
                nom VARCHAR(100) NOT NULL,
                prenom VARCHAR(100) NOT NULL,
                email VARCHAR(150) NOT NULL DEFAULT '',
                pp_numero VARCHAR(50) DEFAULT NULL,
                timeEmargement VARCHAR(10) NOT NULL,
                dateCreation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sync_status ENUM('pending', 'synced') DEFAULT 'pending'
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        console.log("4. Création de la table cloud_ateliers_status...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cloud_ateliers_status (
                atelierId VARCHAR(50) PRIMARY KEY,
                statutOuverture ENUM('auto', 'ouvert_force', 'cloture') DEFAULT 'auto'
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        console.log("✅ Toutes les 4 tables du Relais Cloud ont été créées / vérifiées avec succès !");
    } catch (error) {
        console.error("❌ Erreur lors de l'initialisation :", error.message);
    } finally {
        await pool.end();
    }
}

setupDatabase();
