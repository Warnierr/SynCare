# SynCare — Agenda Intelligent pour Cabinets Médicaux

Application de synchronisation d'agenda pour cabinets et cliniques multi-praticiens.

## Fonctionnalités

- **Gestion patients** : Saisie rapide (nom, prénom, pathologie, notes)
- **Gestion praticiens** : Profils avec spécialités
- **Disponibilités** : Plages horaires par praticien
- **RDV intelligents** : Création avec anti-doublons automatique
- **Matching rapide** : Trouve les créneaux libres en 1 clic
- **Calendrier visuel** : Vue semaine interactive
- **Notifications** : Confirmation RDV en temps réel

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | React + TypeScript + Vite |
| Backend | Node.js + Express + TypeScript |
| Base de données | SQLite (dev) / PostgreSQL (prod) |
| Styling | CSS custom avec variables |

## Installation

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

## URLs locales

- Frontend : http://localhost:5173
- Backend API : http://localhost:4000

## Roadmap

- [ ] Authentification utilisateurs
- [ ] Multi-cabinets
- [ ] Rappels SMS/Email
- [ ] Assistant IA pour suggestions
- [ ] Export PDF du planning

## Licence

MIT

