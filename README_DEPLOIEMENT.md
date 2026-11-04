# 🚀 Guide de Déploiement Universel — Relais Cloud IDS

Ce serveur est le relais cloud public pour :
1. Le formulaire public de réservation d'espaces (`/reserver-espace`) et l'émargement QR Code.
2. Le portail sécurisé de **validation en 1-clic par email** pour les accompagnateurs (`/confirmer-reservation`).
3. La synchronisation bidirectionnelle automatique avec le serveur local de l'incubateur.

---

## 🛠️ Déploiement sur N'importe quel Hébergeur

### 1. Sur Render / Railway / Heroku
1. Créez un nouveau service Web pointant vers ce dossier `cloud`.
2. Commande de démarrage : `npm start`
3. Renseignez les variables d'environnement suivantes dans le tableau de bord de l'hébergeur :
   - `JAWSDB_URL` : L'URL de connexion MySQL (ou n'importe quel MySQL distant).
   - `SYNC_SECRET` : Votre clé secrète partagée (doit être la même que sur le serveur local).
   - `WHITELIST_SECRET` : Clé secrète pour la liste blanche.
   - `NODE_ENV` : `production`

---

### 2. Sur un VPS Ubuntu (OVH, DigitalOcean, Hetzner, AWS)
```bash
# 1. Cloner et installer les dépendances
cd /var/www/ids-cloud
npm install --production

# 2. Configurer les variables
cp .env.example .env
nano .env

# 3. Lancer avec PM2
pm2 start src/app.js --name "ids-cloud-relay"
pm2 save
pm2 startup
```

---

## 🔒 Sécurité Anti-Bot & Anti-Virus Intégrée
- Le lien de confirmation dans l'email effectue un `GET` vers `/confirmer-reservation?token=...`.
- Les scanners de messagerie (antivirus) effectuent des requêtes `GET` de pré-chargement qui **ne déclenchent aucune modification en base**.
- L'action réelle est effectuée via `POST /api/reservations/confirmer-token` uniquement suite au clic humain sur le bouton.
- Le token est signé cryptographiquement en **HMAC-SHA256** (inviolable, expire sous 48h, usage unique).

