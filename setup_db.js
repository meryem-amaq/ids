const mysql = require('mysql2/promise');

const pool = mysql.createPool('mysql://bz29byzuvhtapgqy:yyfuz1l2suvfe2fd@onnjomlc4vqc55fw.chr7pe7iynqr.eu-west-1.rds.amazonaws.com:3306/dgk72fm1y1p5vthu');

async function setupDatabase() {
    try {
        console.log("Connexion à JawsDB MySQL...");
        
        console.log("Création de la table cloud_reservations...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cloud_reservations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                espace VARCHAR(100) NOT NULL,
                salle VARCHAR(100),
                nomComplet VARCHAR(150) NOT NULL,
                telephone VARCHAR(50),
                email VARCHAR(150),
                dateReservation DATE NOT NULL,
                heureDebut VARCHAR(10) NOT NULL,
                heureFin VARCHAR(10) NOT NULL,
                dureeMinutes INT NOT NULL,
                motif TEXT,
                equipementsUtilises TEXT,
                dateCreation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sync_status ENUM('pending', 'synced') DEFAULT 'pending'
            );
        `);

        console.log("Création de la table cloud_presences...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cloud_presences (
                id INT AUTO_INCREMENT PRIMARY KEY,
                atelierId VARCHAR(50) NOT NULL,
                nom VARCHAR(100) NOT NULL,
                prenom VARCHAR(100) NOT NULL,
                pp_numero VARCHAR(50),
                timeEmargement VARCHAR(10) NOT NULL,
                dateCreation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sync_status ENUM('pending', 'synced') DEFAULT 'pending'
            );
        `);

        console.log("Création de la table cloud_ateliers_status...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cloud_ateliers_status (
                atelierId VARCHAR(50) PRIMARY KEY,
                statutOuverture ENUM('auto', 'ouvert_force', 'cloture') DEFAULT 'auto'
            );
        `);

        console.log("✅ Toutes les tables ont été créées avec succès !");
        
    } catch (error) {
        console.error("❌ Erreur :", error.message);
    } finally {
        pool.end();
    }
}

setupDatabase();
