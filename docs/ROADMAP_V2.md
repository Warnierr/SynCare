# SynCare V2 — Roadmap IA & Fonctionnalités Avancées

> Document de planification pour les futures évolutions de SynCare

---

## 🎯 Vision

Transformer SynCare en un **agenda intelligent augmenté par l'IA** pour cabinets médicaux.

---

## 🧠 Fonctionnalités IA Prévues

### 1. Assistant Conversationnel (RAG)

**Objectif** : Permettre aux utilisateurs de créer des RDV en langage naturel.

```
💬 "Trouve-moi un créneau pour Mme Dupont avec Dr. Martin, 
    idéalement le matin, cette semaine"

→ IA analyse les disponibilités + préférences patient
→ Propose les 3 meilleurs créneaux automatiquement
```

**Stack technique** :
- LangChain / Vercel AI SDK
- OpenAI GPT-4o ou Claude 3.5 Sonnet
- Vector DB : Pinecone ou Supabase pgvector

**Effort** : Élevé | **Impact** : ⭐⭐⭐⭐⭐

---

### 2. Prédiction No-Show (Machine Learning)

**Objectif** : Anticiper les annulations et optimiser le remplissage.

```
Patient X → Historique de 3 annulations sur 10 RDV
         → Probabilité no-show : 68%
         → ⚠️ Suggestion : Confirmer par SMS 24h avant
```

**Stack technique** :
- scikit-learn (Python) ou TensorFlow.js
- Features : historique patient, jour/heure, météo, distance

**Effort** : Moyen | **Impact** : ⭐⭐⭐

---

### 3. Optimisation Automatique du Planning

**Objectif** : Réorganiser intelligemment les créneaux.

Critères d'optimisation :
- Minimiser les trous dans l'agenda
- Regrouper les pathologies similaires (moins de fatigue mentale praticien)
- Respecter les préférences patients (matin/après-midi)
- Équilibrer la charge entre praticiens

**Stack technique** :
- Algorithme génétique ou programmation par contraintes
- OR-Tools (Google) ou OptaPlanner

**Effort** : Élevé | **Impact** : ⭐⭐⭐⭐

---

### 4. Extraction Automatique des Infos Patient

**Objectif** : Saisie rapide par dictée ou texte libre.

```
Input: "Jean Dupont, 45 ans, diabète type 2, dispo mardi après-midi"

Output structuré:
┌────────────────────────────────────────┐
│ Nom: Jean Dupont                       │
│ Âge: 45 ans                            │
│ Pathologie: Diabète type 2             │
│ Dispo suggérée: Mardi 14:00-18:00      │
└────────────────────────────────────────┘
```

**Stack technique** :
- OpenAI GPT-4 avec function calling
- Zod pour validation du schema

**Effort** : Faible | **Impact** : ⭐⭐⭐⭐

---

### 5. Rappels Intelligents Multicanal

**Objectif** : Réduire les no-shows par des rappels automatisés.

| Canal | Timing | Action |
|-------|--------|--------|
| SMS | J-2 | Rappel simple |
| SMS | J-1 | Lien de confirmation |
| WhatsApp | J-1 | Bot conversationnel pour reporter |
| Email | Hebdo | Résumé des RDV à venir |

**Stack technique** :
- Twilio (SMS/WhatsApp)
- Resend ou SendGrid (Email)
- Cron jobs (Vercel Cron ou Trigger.dev)

**Effort** : Faible | **Impact** : ⭐⭐⭐⭐

---

### 6. Tableau de Bord Prédictif

**Objectif** : Anticiper les tendances et optimiser le remplissage.

```
📊 Dashboard Semaine 51

Prévisions basées sur l'historique :
├─ Lundi    : 85% rempli (normal)
├─ Mardi    : 42% rempli ⚠️ Marketing SMS suggéré
├─ Mercredi : 95% rempli ✓
└─ Vendredi : 60% rempli (congés)

💡 Recommandation : Proposer -10% pour mardi
```

**Effort** : Moyen | **Impact** : ⭐⭐⭐

---

### 7. RAG sur Dossiers Patients

**Objectif** : Recherche sémantique dans l'historique patient.

```
Question: "Quand Mme Martin a-t-elle mentionné des douleurs lombaires ?"

→ IA fouille l'historique des notes
→ Ressort les dates + contexte pertinent
```

**Stack technique** :
- Embeddings : OpenAI ada-002 ou Voyage AI
- Vector DB : Pinecone, Weaviate, ou pgvector
- LangChain pour l'orchestration

**Effort** : Moyen | **Impact** : ⭐⭐⭐⭐

---

## 📋 Roadmap Prioritaire

| Phase | Fonctionnalité | Impact | Effort | Statut |
|-------|---------------|--------|--------|--------|
| 1 | Auth + Multi-cabinets | ⭐⭐⭐⭐⭐ | Moyen | 🔲 À faire |
| 2 | Rappels SMS (Twilio) | ⭐⭐⭐⭐ | Faible | 🔲 À faire |
| 3 | Extraction IA texte libre | ⭐⭐⭐⭐ | Faible | 🔲 À faire |
| 4 | Assistant conversationnel | ⭐⭐⭐⭐⭐ | Élevé | 🔲 À faire |
| 5 | Prédiction no-show | ⭐⭐⭐ | Moyen | 🔲 À faire |
| 6 | Export PDF planning | ⭐⭐ | Faible | 🔲 À faire |
| 7 | App mobile (React Native) | ⭐⭐⭐⭐ | Élevé | 🔲 À faire |

---

## 🛠️ Stack IA Recommandée

| Besoin | Solution | Alternative |
|--------|----------|-------------|
| LLM | OpenAI GPT-4o | Claude 3.5 Sonnet |
| Embeddings | OpenAI ada-002 | Voyage AI |
| Vector DB | Pinecone | Supabase pgvector |
| Orchestration | Vercel AI SDK | LangChain |
| ML prédictif | scikit-learn | TensorFlow.js |
| SMS/WhatsApp | Twilio | MessageBird |
| Email | Resend | SendGrid |
| Cron Jobs | Vercel Cron | Trigger.dev |

---

## 📝 Notes

- Prioriser les fonctionnalités à faible effort / fort impact
- Commencer par l'authentification avant d'ajouter l'IA
- Tester avec un panel de 3-5 cabinets pilotes
- Collecter du feedback utilisateur avant chaque nouvelle feature

---

*Dernière mise à jour : Décembre 2024*

