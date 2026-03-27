# Sport Tracker

Application web complète de suivi sportif et de santé, conçue comme une **PWA offline-first**. Entraînements, nutrition, sommeil, composition corporelle — tout centralisé, tout synchronisé.

---

## Aperçu

Sport Tracker est une application personnelle de fitness construite avec Next.js 16, Supabase et Tailwind CSS. Elle couvre l'intégralité du suivi d'un athlète amateur : des séances de musculation en temps réel jusqu'aux bilans caloriques et à la composition corporelle, avec un système de badges gamifié et des notifications push pour ne jamais briser sa série.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | Next.js 16.2 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4 |
| Base de données | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (email/password) |
| Graphiques | Recharts 3 |
| Notifications | Web Push API (VAPID) |
| Déploiement | Vercel (Serverless + Cron) |
| Langage | TypeScript 5 strict |

---

## Fonctionnalités

### Entraînement

**Programmes** — Créez des templates de séances réutilisables avec les exercices, séries, répétitions, poids et temps de repos par défaut.

**Séances en direct** — Enregistrez chaque série en temps réel avec comparaison à la série précédente et à votre record personnel. Modes de suivi : répétitions, durée, ou hybride. Support du RPE (1–10), des séries de chauffe, et de la pause/reprise pour le cardio.

**Séances manuelles** — Saisissez a posteriori une séance complète avec tous ses sets en une seule fois.

**Historique** — Consultez les 200 dernières séances avec le détail de chaque set.

**Bibliothèque d'exercices** — Créez vos propres exercices avec groupe musculaire, catégorie et mode de tracking.

### Progression & Statistiques

**Progression** — Graphiques de volume par séance, courbe de progression par exercice, évolution du poids corporel avec conseils personnalisés, composition corporelle, objectif fitness (sèche / prise de masse / maintien / recomposition).

**Records** — Vos records par exercice et groupe musculaire : poids maximum, 1RM estimé (formules Epley, Brzycki, Lander) et meilleure durée cardio.

**Badges** — 30+ trophées répartis en 4 catégories :
- **Régularité** : 1ère séance, 10 / 25 / 50 / 100 séances, séries de 3 / 4 / 8 semaines, semaine parfaite
- **Force** : clubs 60 kg / 100 kg / 140 kg / 180 kg
- **Volume** : séances à 1 / 2 / 5 tonnes, cumul 50 / 200 tonnes
- **Corps** : premières mesures, perte de 2 / 5 kg, prise de 3 kg, perte de 2% de graisse

### Santé

**Mesures corporelles** — Poids, taille, % de graisse, masse musculaire, tour de poitrine / taille / hanches, hydratation, masse osseuse. Calcul IMC automatique.

**Métabolisme (BMR / TDEE)** — Formule Mifflin-St Jeor avec 5 niveaux d'activité. Estime les calories journalières à dépenser selon votre profil.

**Calories** — Saisissez vos apports caloriques quotidiens. Bilan automatique (déficit / surplus) comparé à votre dépense estimée. Conseils adaptés à votre objectif.

**Pas** — Suivi journalier avec estimation des calories brûlées selon le poids.

**Sommeil** — Durée et qualité (1–5) avec historique sur 30 jours.

### Dashboard

Vue d'ensemble journalière : séance en cours, heatmap des 7 derniers jours, statistiques de série, dernier poids, bilan énergétique hebdomadaire, historique récent.

---

## PWA & Offline

Sport Tracker fonctionne **sans connexion internet** pendant les séances.

- **Service Worker** — Cache les assets, affiche une page offline si le réseau est absent
- **File d'attente locale** — Les séries sont stockées dans `localStorage` si le réseau coupe, et synchronisées automatiquement à la reconnexion
- **Indicateur de sync** — Bandeau visuel pendant la synchronisation avec confirmation ou erreur
- **Notifications push** — Rappel chaque soir si votre série est en danger (`/api/cron/streak` via Vercel Cron, 20h00)
- **Installable** — Guide d'installation iOS inclus ("Ajouter à l'écran d'accueil")

---

## Base de données

Toutes les tables sont protégées par des **politiques RLS** (Row-Level Security) — chaque utilisateur n'accède qu'à ses propres données.

```
exercises               — Bibliothèque d'exercices personnalisés
workout_templates       — Programmes de séances
template_exercises      — Exercices dans un programme (ordre, valeurs par défaut)
workout_sessions        — Séances (en cours ou terminées)
workout_sets            — Sets individuels (reps, poids, durée, RPE…)
cardio_segments         — Segments pause/reprise pour le cardio
body_stats              — Mesures corporelles horodatées
daily_steps             — Pas journaliers
daily_sleep             — Sommeil journalier
daily_calories          — Calories ingérées par jour
user_settings           — Profil (objectif, âge, genre, activité, BMR)
push_subscriptions      — Endpoints pour les notifications push
```

---

## API

| Route | Méthode | Description |
|---|---|---|
| `/api/cron/streak` | GET | Vérifie les séries à risque et envoie les notifications push (déclenché par Vercel Cron) |
| `/api/push/send` | POST | Envoi de notifications push en masse (protégé par `CRON_SECRET`) |

---

## Variables d'environnement

Créez un fichier `.env.local` à la racine :

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
ALLOWED_EMAILS=
```

`ALLOWED_EMAILS` est une liste d'adresses séparées par des virgules. Seuls ces comptes peuvent se connecter.

---

## Installation

```bash
# Cloner le dépôt
git clone <url>
cd projetSport

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env.local
# remplir les variables

# Démarrer en développement
npm run dev

# Build production
npm run build
npm run start
```

---

## Déploiement

L'application est prévue pour **Vercel**. Le fichier `vercel.json` configure le cron job de rappel de série :

```json
{
  "crons": [
    {
      "path": "/api/cron/streak",
      "schedule": "0 20 * * *"
    }
  ]
}
```

Ajoutez toutes les variables d'environnement dans les paramètres du projet Vercel avant de déployer.

---

## Architecture

```
app/
├── (auth)/login/         — Page de connexion
├── (app)/
│   ├── dashboard/        — Tableau de bord
│   ├── templates/        — Programmes
│   ├── sessions/         — Séances (historique, active, manuelle)
│   ├── exercises/        — Bibliothèque d'exercices
│   ├── progress/         — Graphiques de progression
│   ├── records/          — Records personnels
│   ├── badges/           — Trophées
│   ├── body-stats/       — Mesures corporelles
│   ├── steps/            — Pas
│   ├── sleep/            — Sommeil
│   ├── calories/         — Calories
│   └── NavBar.tsx        — Navigation principale
├── actions/              — Server Actions Next.js
└── api/                  — Routes API (cron, push)

components/
├── sessions/             — Composants de séances
├── templates/            — Éditeur de programmes
├── charts/               — Graphiques Recharts
├── body-stats/           — Mesures + BMR
├── calories/             — Tracker calorique
├── steps/ sleep/         — Trackers santé
├── exercises/            — Bibliothèque
├── pwa/                  — Service Worker, notifications, install
└── ui/                   — Boutons, inputs, composants réutilisables

lib/
├── db/                   — Requêtes Supabase
├── supabase/             — Clients server/client
├── utils/fitness.ts      — BMI, BMR, 1RM, calories brûlées
├── utils/badges.ts       — Logique des 30+ trophées
├── utils/weight-advice.ts— Conseils de poids adaptatifs
└── sync-queue.ts         — File d'attente offline

supabase/                 — Migrations SQL
types/                    — Types TypeScript partagés
```

---

## Calculs & Formules

**BMR** — Mifflin-St Jeor (1990)
```
Homme : BMR = 10 × poids + 6.25 × taille - 5 × âge + 5
Femme : BMR = 10 × poids + 6.25 × taille - 5 × âge - 161
```

**1RM estimé** — Moyenne de 3 formules
```
Epley   : poids × (1 + reps / 30)
Brzycki : poids × 36 / (37 - reps)
Lander  : (100 × poids) / (101.3 - 2.67123 × reps)
```

**Calories brûlées** — MET (Compendium of Physical Activities)
```
Musculation : MET 4.5–6.0 selon le groupe musculaire
Cardio      : Formule ACSM (tapis : vitesse + inclinaison, vélo : résistance)
kcal = MET × poids(kg) × durée(heures)
```

---

## Licence

Usage personnel. Non distribué publiquement.
