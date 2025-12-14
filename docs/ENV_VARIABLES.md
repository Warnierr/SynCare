# Variables d'Environnement SynCare

## 📋 Récapitulatif Complet

---

## Backend (`backend/.env`)

```env
# ═══════════════════════════════════════════════════════════
# DATABASE - Neon PostgreSQL
# ═══════════════════════════════════════════════════════════
DATABASE_URL=postgresql://neondb_owner:xxxx@ep-cool-name-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require

# ═══════════════════════════════════════════════════════════
# SÉCURITÉ API
# ═══════════════════════════════════════════════════════════
API_KEY=sk_syncare_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

# ═══════════════════════════════════════════════════════════
# ENVIRONNEMENT
# ═══════════════════════════════════════════════════════════
NODE_ENV=production
```

---

## Frontend (`frontend/.env`)

```env
# ═══════════════════════════════════════════════════════════
# API BACKEND
# ═══════════════════════════════════════════════════════════
VITE_API_URL=https://syncare-api.vercel.app

# ═══════════════════════════════════════════════════════════
# CLÉ API (doit correspondre au backend)
# ═══════════════════════════════════════════════════════════
VITE_API_KEY=sk_syncare_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

## 🔧 Variables Vercel

### Projet Backend

| Nom | Valeur |
|-----|--------|
| `DATABASE_URL` | `postgresql://...` (depuis Neon) |
| `API_KEY` | `sk_syncare_...` |
| `NODE_ENV` | `production` |

### Projet Frontend

| Nom | Valeur |
|-----|--------|
| `VITE_API_URL` | `https://[nom-backend].vercel.app` |
| `VITE_API_KEY` | `sk_syncare_...` (même que backend) |

---

## 🛡️ Comment Générer une Clé API

### Option 1 : Node.js
```bash
node -e "console.log('sk_syncare_' + require('crypto').randomBytes(24).toString('hex'))"
```

### Option 2 : PowerShell
```powershell
$bytes = New-Object byte[] 24
(New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes)
"sk_syncare_" + [BitConverter]::ToString($bytes).Replace("-", "").ToLower()
```

### Option 3 : En ligne
Utiliser [generate-secret.vercel.app](https://generate-secret.vercel.app/32)

---

## 📍 Où les Configurer

### Développement Local
1. Créer `backend/.env` avec les variables backend
2. Créer `frontend/.env` avec les variables frontend
3. Redémarrer les serveurs de dev

### Production Vercel
1. Aller dans **Project Settings** → **Environment Variables**
2. Ajouter chaque variable
3. Sélectionner les environnements (Production, Preview, Development)
4. Redéployer le projet

---

## ⚠️ Sécurité

- **NE JAMAIS** commiter les fichiers `.env` (ils sont dans `.gitignore`)
- **NE JAMAIS** exposer `DATABASE_URL` côté frontend
- Utiliser des clés différentes pour dev et production
- Renouveler les clés régulièrement

