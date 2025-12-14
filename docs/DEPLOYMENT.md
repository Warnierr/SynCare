# Guide de Déploiement SynCare — Vercel + Neon

## 🗄️ Variables d'Environnement

### Backend (API)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | URL de connexion PostgreSQL Neon | `postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/syncare?sslmode=require` |
| `API_KEY` | Clé API pour sécuriser les endpoints | `sk_syncare_xxx` |
| `NODE_ENV` | Environnement d'exécution | `production` |

### Frontend

| Variable | Description | Exemple |
|----------|-------------|---------|
| `VITE_API_URL` | URL de l'API backend | `https://syncare-api.vercel.app` |
| `VITE_API_KEY` | Clé API (même que backend) | `sk_syncare_xxx` |

---

## 📋 Étapes de Déploiement

### 1. Créer la base Neon

1. Aller sur [neon.tech](https://neon.tech)
2. Créer un compte / Se connecter
3. Cliquer **"New Project"**
4. Nom du projet : `syncare`
5. Région : `eu-central-1` (Frankfurt) pour la France
6. Copier la **Connection string** (format PostgreSQL)

```
postgresql://neondb_owner:xxxx@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

### 2. Configurer Vercel — Backend

1. Aller sur [vercel.com](https://vercel.com)
2. Cliquer **"Add New" → "Project"**
3. Importer le repo GitHub `Warnierr/SynCare`
4. Configuration :
   - **Root Directory** : `backend`
   - **Framework Preset** : Other
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`

5. Variables d'environnement :
   ```
   DATABASE_URL = [coller l'URL Neon]
   API_KEY = sk_syncare_votre_cle_secrete
   NODE_ENV = production
   ```

6. Cliquer **Deploy**

### 3. Configurer Vercel — Frontend

1. Créer un **nouveau projet** Vercel
2. Importer le même repo `Warnierr/SynCare`
3. Configuration :
   - **Root Directory** : `frontend`
   - **Framework Preset** : Vite
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`

4. Variables d'environnement :
   ```
   VITE_API_URL = https://syncare-backend.vercel.app
   VITE_API_KEY = sk_syncare_votre_cle_secrete
   ```

5. Cliquer **Deploy**

---

## 🔧 Configuration Locale (.env)

### backend/.env

```env
DATABASE_URL=postgresql://user:pass@ep-xxx.aws.neon.tech/syncare?sslmode=require
API_KEY=sk_syncare_dev_key
NODE_ENV=development
```

### frontend/.env

```env
VITE_API_URL=http://localhost:4000
VITE_API_KEY=sk_syncare_dev_key
```

---

## 🛡️ Génération de Clé API

Pour générer une clé API sécurisée :

```bash
# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Ou Node.js
node -e "console.log('sk_syncare_' + require('crypto').randomBytes(24).toString('hex'))"
```

Exemple de résultat : `sk_syncare_a1b2c3d4e5f6...`

---

## ✅ Checklist Pré-Déploiement

- [ ] Base Neon créée et URL copiée
- [ ] Clé API générée
- [ ] Backend déployé sur Vercel
- [ ] Frontend déployé sur Vercel
- [ ] Variables d'environnement configurées
- [ ] Test de connexion API réussi
- [ ] Test de création de patient réussi
- [ ] Test de création de RDV réussi

---

## 🐛 Dépannage

### Erreur "Connection refused"
→ Vérifier que `DATABASE_URL` est correcte et que SSL est activé

### Erreur "Unauthorized"
→ Vérifier que `API_KEY` est identique frontend/backend

### Erreur "CORS"
→ Vérifier que le backend autorise l'origine du frontend

### Erreur "Build failed"
→ Vérifier les logs Vercel et les dépendances

