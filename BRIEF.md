# BRIEF — DEVOT... : application web compagnon du jeu de plateau

> Document de cadrage destiné à l'agent IA qui développe l'application.
> Le jeu de plateau physique est terminé ; ce brief ne couvre **que la partie web**.
> Langue de l'interface : **anglais uniquement**. Langue du code : anglais (noms de variables, commentaires).

---

## 1. Contexte et objectif

Le jeu s'appelle **DEVOT...** (nom à afficher tel quel, points de suspension compris). Les joueurs autour d'une table scannent **un QR code unique** (le même sur toutes les boîtes) qui ouvre une web app **mobile only**. L'app sert uniquement à **gérer une jauge** (de 0 à 10) qui réagit aux réponses données aux cartes du jeu de plateau.

- **Une session = une table** (un seul téléphone gère la partie pour toute la table).
- Chaque carte physique a un **id** ; l'app affiche le texte de la question correspondante et applique les effets sur la jauge.
- À la fin, l'app affiche un **récapitulatif** de toute la partie.
- Les données de session sont conservées en base pour une **future étude utilisateurs** (pas dans cette version, mais il faut tout enregistrer dès maintenant).

## 2. Périmètre

### Inclus (v1)
- Démarrage de session avec un nom (simple étiquette, pas d'unicité, pas de mot de passe).
- Reprise automatique de la session en cours après rechargement / fermeture du navigateur.
- Jauge 0–10, boutons **Movement**, **Fuel**, **Undo**, **End game**.
- Recherche de carte par id, cartes grisées une fois répondues.
- Écran récapitulatif de fin de partie.
- Backend Express + MongoDB, déployé sur Vercel.
- Script de génération du QR code.

### Exclu (ne pas implémenter)
- Fonctionnalité **Event** (seul son emplacement est réservé à l'écran, voir 7.2).
- Comptes utilisateurs, authentification, mots de passe.
- Interface d'administration des cartes (les cartes sont dans le code).
- Export / tableau de bord de statistiques (évolution future).
- Multi-langue, mode hors ligne / PWA, temps réel multi-appareils, durée ou chronomètre.
- Version desktop spécifique.

### Anti-objectifs (échec même si « ça marche »)
- La jauge affichée diffère de l'état en base (désynchronisation).
- Une partie est perdue au rechargement de la page.
- Un coût d'hébergement apparaît (budget = **0 €**).
- L'URL de production change après impression du QR code.

## 3. Stack et contraintes

| Élément | Choix |
|---|---|
| Langage | JavaScript (Node.js, ES modules) |
| Backend | Express |
| Base de données | MongoDB Atlas — cluster **Free** (driver officiel `mongodb` ou Mongoose, au choix de l'agent ; préférer le driver natif pour rester léger) |
| Frontend | HTML / CSS / JavaScript vanilla (pas de framework, pas de build step) |
| Hébergement | **Vercel Hobby** (projet non commercial) — Express déployé en zero-config |
| Budget | 0 € |
| Charge | ~10 parties simultanées |
| Réseau | Obligatoire (site hébergé) |
| Tests | `node:test` (intégré à Node, aucune dépendance) |

Garder le nombre de dépendances au strict minimum : `express`, `mongodb`, `qrcode` (dev), et c'est tout si possible.

## 4. Règles métier (le cœur — à implémenter dans un module pur et testé)

### 4.1 Jauge
- Valeur entière, **démarre à 10**.
- Toujours bornée : `gauge = clamp(gauge + delta, 0, 10)`.
- **0 ne termine pas la partie** : la jauge reste bloquée à 0 et peut remonter ensuite. Rien d'autre ne se passe.
- Elle ne dépasse **jamais 10** (un gain Fuel au-delà est simplement perdu).

### 4.2 Cartes
Deux piles : `movement` et `fuel`. Chaque indice coûte toujours **1 point**. Les autres valeurs sont propres à chaque carte (entiers de **1 à 3**) :

| Action | Carte Movement | Carte Fuel |
|---|---|---|
| `hint` (Indice, par clic) | `-1` | `-1` |
| `correct` (Bonne réponse) | `0` | `+fuelReward` |
| `wrong` (Mauvaise réponse) | `-wrongPenalty` | `-wrongPenalty` |

### 4.3 Enchaînement sur une carte
- Une carte peut recevoir **jusqu'à 3 `hint`** (un par clic, chacun à `-1`), et seulement **avant** d'être répondue.
- Chaque clic révèle **l'indice suivant** de la carte (indice 1, puis 2, puis 3). Une carte peut avoir moins de 3 indices : le nombre maximal de clics est le nombre d'indices de la carte (3 au maximum). Le bouton Hint est désactivé quand tous les indices sont révélés.
- Une carte reçoit **une seule réponse** (`correct` ou `wrong`).
- `hint` ×N puis `wrong` → tous les malus **s'additionnent** (N événements `hint` + un événement `wrong`).
- `hint` ×N puis `correct` → seuls les N malus d'indice s'appliquent (+ le gain Fuel le cas échéant).
- Une carte répondue est **grisée** et ne peut plus recevoir d'action (les `hint` seuls ne la grisent pas).
- Le **texte d'un indice** n'est affiché qu'après avoir été révélé ; les indices déjà révélés restent visibles quand on rouvre la carte.
- Toute action sur une session terminée est refusée.

### 4.4 Delta réellement appliqué
Chaque événement stocke `appliedDelta = gaugeAfter - gaugeBefore` (le delta **après bornage**), pas le delta nominal.
Exemple : jauge à 1, malus de 3 → jauge à 0, `appliedDelta = -1`.

### 4.5 Undo (Annuler)
- Annule la **dernière action non annulée** de la session. Peut être pressé plusieurs fois (remonte la pile).
- Restaure exactement : `gauge = gauge - appliedDelta`.
- Annuler une réponse **dégrise** la carte ; annuler un `hint` masque à nouveau le dernier indice révélé et rend le clic disponible.
- L'événement n'est **pas supprimé** : il est marqué `undone: true` (conservé pour l'étude future), et exclu du calcul d'état et du récap.
- Bouton désactivé s'il n'y a rien à annuler. Impossible après la fin de partie.

### 4.6 Fin de partie
- Bouton **End game** → modale de confirmation : *"Are you sure you want to end the game?"* (`Yes, end the game` / `Cancel`).
- Possible à tout moment (fin normale ou prématurée).
- La session passe en `finished`, `endedAt` est renseigné, puis l'app ouvre la modale récap.

### 4.7 Source de vérité
**Le serveur fait autorité.** Le client envoie une intention (`cardId` + `type`), le serveur valide, calcule avec les valeurs de `cards.json`, enregistre et renvoie l'état complet. Le client ne calcule jamais la jauge lui-même.

## 5. Données

### 5.1 Cartes — `data/cards.json` (dans le code, pas en base)
Le contenu provient d'un Google Doc de l'auteur, à convertir dans ce format. Fournir 3 cartes d'exemple par pile pour le développement ; l'auteur ajoutera les vraies (~50 par pile en v1).

```json
[
  {
    "id": "001",
    "deck": "movement",
    "question": "Sample movement question?",
    "hints": ["First hint.", "Second hint.", "Third hint."],
    "wrongPenalty": 2
  },
  {
    "id": "001",
    "deck": "fuel",
    "question": "Sample fuel question?",
    "hints": ["First hint.", "Second hint.", "Third hint."],
    "wrongPenalty": 1,
    "fuelReward": 3
  }
]
```

- `id` : **chaîne de 3 chiffres** (`"001"`, `"042"`…), exactement comme imprimé sur les cartes. Toujours la stocker en chaîne pour garder les zéros initiaux.
- Un même id peut exister dans les deux piles : une carte est identifiée par le couple **(`deck`, `id`)**. Clé interne : `"movement:001"`, `"fuel:001"`.
- `hints` : tableau de 1 à 3 textes, dans l'ordre de révélation. Le coût d'un indice est fixe (1 point) et n'est donc pas stocké par carte.
- Valider le fichier **au démarrage** (couples deck/id uniques, id au format `^\d{3}$`, `deck` valide, 1 à 3 indices, `wrongPenalty` et `fuelReward` entiers 1–3, `fuelReward` présent pour toutes les cartes fuel) et faire planter le démarrage avec un message clair si invalide.

### 5.2 Session — collection MongoDB `sessions`

```js
{
  _id: "b3f1c2e4-...",          // crypto.randomUUID(), non devinable
  name: "Table of Alice",        // trim, 1–40 caractères
  status: "active",              // "active" | "finished"
  gauge: 10,
  createdAt: ISODate,
  endedAt: ISODate | null,
  events: [
    {
      seq: 1,                    // ordre chronologique
      deck: "movement",
      cardId: "001",
      type: "hint",              // "hint" | "correct" | "wrong"
      hintIndex: 1,              // 1, 2 ou 3 (uniquement pour type "hint")
      appliedDelta: -1,
      gaugeAfter: 9,
      at: ISODate,
      undone: false
    }
  ]
}
```

L'état de chaque carte (nombre d'indices révélés / répondue) est **dérivé** des événements non annulés, pas stocké séparément.
Les écritures doivent être atomiques côté Mongo (une seule `updateOne` par action, avec condition sur `status: "active"`).

## 6. API REST

Toutes les réponses en JSON. Erreurs : `{ "error": "message" }`.

| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| `GET` | `/api/cards` | — | Liste des cartes **sans le texte des indices** : `id`, `deck`, `question`, `hintCount`, valeurs de points |
| `POST` | `/api/sessions` | `{ name }` | État de session (201) |
| `GET` | `/api/sessions/:id` | — | État de session |
| `POST` | `/api/sessions/:id/actions` | `{ deck, cardId, type }` | État de session mis à jour |
| `POST` | `/api/sessions/:id/undo` | — | État de session mis à jour |
| `POST` | `/api/sessions/:id/end` | — | État de session final |

**État de session renvoyé** :
```js
{
  id, name, status, gauge, createdAt, endedAt,
  canUndo: true,
  cards: { "movement:001": { hintsRevealed: ["First hint.", "Second hint."], result: null }, ... }, // seulement les cartes touchées ; result: "correct" | "wrong" | null
  history: [ /* événements non annulés, dans l'ordre */ ]
}
```

Codes d'erreur : `400` (corps invalide, carte inconnue, nom vide), `404` (session inconnue), `409` (action interdite : carte déjà répondue, plus d'indice disponible, session terminée, rien à annuler).

## 7. Interface (mobile, portrait)

Layout centré, largeur max ~480 px. Sur desktop, la même colonne mobile centrée — pas de design dédié. Respecter la **charte graphique existante** de l'auteur (à déposer dans `docs/design/` ; à défaut, design sobre et neutre facilement re-stylable via variables CSS).

### 7.0 Principe : une seule page, tout en modales
- L'app est **une page unique** : l'écran de jeu (jauge + boutons) est toujours affiché en fond.
- **Tout le reste s'ouvre en modale par-dessus** : démarrage de session, piles Movement / Fuel, détail d'une carte, confirmation de fin, récapitulatif.
- Pas de routeur, pas de changement d'URL, pas de navigation entre pages. Une seule URL : celle du QR code.
- **Une seule modale visible à la fois** : ouvrir le détail d'une carte remplace le contenu de la modale de la pile, avec un bouton retour (← Back) vers la liste. Fermer la modale (✕) revient à l'écran de jeu.
- Utiliser l'élément natif `<dialog>` (`showModal()`) : gestion du focus et de l'arrière-plan inerte incluse, accessible, sans dépendance.
- Le bouton retour physique / geste retour du téléphone ferme la modale ouverte plutôt que de quitter le site (via `history.pushState` à l'ouverture et l'événement `popstate`) — sans jamais changer l'URL visible.
- Les modales bloquantes (démarrage de session, récap) ne se ferment ni avec ✕, ni en touchant l'arrière-plan, ni avec le geste retour.

### 7.1 Modale de démarrage de session
- Au chargement, si `localStorage` contient un `sessionId` → `GET /api/sessions/:id` :
  - `active` → reprise directe, aucune modale.
  - `finished` ou `404` → effacer le `localStorage`, ouvrir la modale de démarrage.
- Sinon, ouvrir la modale de démarrage (bloquante) par-dessus l'écran de jeu (jauge à 10, boutons inactifs) : titre du jeu **DEVOT...**, champ **"Session name"**, bouton **"Start game"**.

### 7.2 Écran de jeu (fond permanent)
```
┌──────────────────────────────┐
│  ┌───┐        [ Movement ]   │
│  │   │                       │
│  │███│        [   Fuel   ]   │
│  │███│                       │
│  │███│        (  Event   )   │  ← emplacement réservé, vide en v1
│  │███│                       │
│  │███│        [   Undo   ]   │
│  │███│                       │
│  └───┘        [ End game ]   │
│   7/10                       │
└──────────────────────────────┘
```
- **Gauche** : jauge verticale 0–10 avec la valeur numérique. Animation courte à chaque changement.
- **Droite** : boutons Movement, Fuel, *(emplacement Event)*, Undo, End game. Gros boutons tactiles (≥ 48 px).
- **Emplacement Event** : entre Fuel et Undo, réserver un espace de la même taille qu'un bouton. En v1, il est **vide et invisible** (élément présent dans le HTML, `visibility: hidden`) pour que la mise en page ne bouge pas le jour où l'auteur l'activera. Prévoir un drapeau unique côté frontend (ex. `FEATURES.event = false`) qui, passé à `true`, affiche un bouton **Event** sans action. Ne rien présumer du fonctionnement futur d'Event : pas de route API, pas de données, pas de règles.

### 7.3 Modale Movement / Fuel
- Titre de la modale : nom de la pile.
- Champ de recherche par id (clavier numérique `inputmode="numeric"`, filtre instantané ; taper `1` ou `01` doit trouver `001`) + liste des cartes de la pile, triée par id.
- Cartes répondues : **grisées**, avec l'indication du résultat. Cartes avec indices révélés : petit badge du nombre (ex. *"2/3 hints"*).
- Tap sur une carte → **détail de la carte**, dans la même modale (bouton ← Back vers la liste) :
  - Texte de la question.
  - Boutons **Hint**, **Correct**, **Wrong** (désactivés selon les règles 4.3). Le bouton Hint indique le nombre restant (ex. *"Hint (2 left)"*).
  - Après chaque **Hint** : l'indice révélé s'ajoute sous la question (Hint 1, Hint 2, Hint 3).
  - Après Correct / Wrong : la modale se ferme, retour à l'écran de jeu avec la jauge mise à jour (animation visible).

### 7.4 Undo
Undo agit directement depuis l'écran de jeu, sans modale. Après un undo, afficher un toast bref décrivant l'action annulée (ex. *"Undone: Movement 012 – Wrong (−2)"*).

### 7.5 Fin de partie
Modale de confirmation (4.6), puis **modale récap** (bloquante, contenu scrollable) :
- Nom de la session, jauge finale.
- Liste ordonnée de toutes les actions non annulées, ex. :
  `1. Movement 012 — Hint 1 (−1)` / `2. Movement 012 — Hint 2 (−1)` / `3. Movement 012 — Wrong (−2)` / `4. Fuel 003 — Correct (+3)`
- Bouton **"Start a new game"** → efface le `localStorage`, remet l'écran de jeu à zéro et ouvre la modale de démarrage.

### 7.6 Erreurs réseau
Si une requête échoue : message non bloquant *"Connection problem, please try again"*, l'état affiché reste celui du dernier retour serveur. Désactiver les boutons pendant une requête en cours pour éviter les doubles clics.

## 8. Spécificités Vercel + Atlas

- **Express zero-config** : le fichier d'entrée fait `export default app`. `app.listen()` uniquement en local (script `dev`).
- **Fichiers statiques** : sur Vercel, placer le frontend dans `public/` (servi par le CDN de Vercel ; `express.static` n'y est pas utilisé). En local, `express.static('public')` sert les mêmes fichiers. Vérifier ce point dans la doc Vercel « Express on Vercel » au moment du déploiement.
- **Connexion MongoDB** : l'app tourne en fonction serverless → mettre en cache le client Mongo au niveau du module (réutilisé entre invocations), ne jamais ouvrir une connexion par requête.
- **Variables d'environnement** : `MONGODB_URI` (et `MONGODB_DB`), définies dans les settings du projet Vercel et dans un `.env` local **non commité** (`.env.example` commité).
- **Atlas** : cluster Free ; dans *Network Access*, autoriser `0.0.0.0/0` (Vercel n'a pas d'IP fixe) et utiliser un utilisateur dédié avec mot de passe fort et droits limités à la base de l'app.
- **Nom de projet Vercel** : choisir le nom définitif **avant** d'imprimer le QR code — l'URL `<nom>.vercel.app` doit rester stable pour toujours.
- Index Mongo : `_id` suffit (accès uniquement par id). Ajouter un index sur `createdAt` pour la future étude.

## 9. QR code

- Un seul QR code statique pointant vers l'URL de production.
- Script `scripts/generate-qr.js` utilisant le package npm `qrcode` : prend l'URL en argument, génère `qr/qr-code.svg` et `qr/qr-code.png` (haute résolution, marge suffisante, correction d'erreur niveau `M` ou `Q` pour l'impression).
- Ne **pas** utiliser de service de « QR code dynamique » en ligne (risque d'expiration / paywall).

## 10. Structure du dépôt (proposée)

```
/
├── server.js               # export default app ; listen() en local seulement
├── src/
│   ├── db.js               # client Mongo mis en cache
│   ├── game/
│   │   ├── cards.js        # chargement + validation de data/cards.json
│   │   └── rules.js        # moteur de règles PUR (aucun accès DB)
│   └── routes/
│       ├── cards.js
│       └── sessions.js
├── data/cards.json
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── scripts/generate-qr.js
├── test/
│   ├── rules.test.js
│   └── api.test.js
├── docs/design/            # charte graphique de l'auteur
├── .env.example
└── package.json            # "type": "module", scripts dev / test / qr
```

`rules.js` expose des fonctions pures du type `applyAction(sessionState, card, type) → { event, newGauge }` ou une erreur métier, et `undoLast(sessionState)`. Les routes ne font que : charger la session → appeler les règles → persister → renvoyer l'état.

## 11. Critères d'acceptation

Tests unitaires (`rules.test.js`) — au minimum :
- [ ] La jauge démarre à 10.
- [ ] Movement `correct` → jauge inchangée ; `wrong` → `-wrongPenalty`.
- [ ] Fuel `correct` → `+fuelReward`, plafonné à 10.
- [ ] Chaque `hint` coûte exactement 1 point.
- [ ] 3 `hint` puis `wrong` → jauge à `-3 - wrongPenalty` (bornée à 0).
- [ ] `hint` ×N puis `correct` → seuls les N malus d'indice (et le gain fuel le cas échéant).
- [ ] La jauge ne descend jamais sous 0 ; `appliedDelta` reflète le bornage.
- [ ] 4e `hint` (ou au-delà du nombre d'indices de la carte) → refusé ; `hint` après réponse → refusé ; deuxième réponse → refusée.
- [ ] Les cartes `movement:001` et `fuel:001` sont bien indépendantes.
- [ ] Undo restaure exactement la jauge (y compris après bornage à 0 ou à 10), dégrise la carte, masque le dernier indice révélé, est répétable, et refusé quand la pile est vide.
- [ ] Toute action après `end` → refusée.
- [ ] Le récap exclut les événements annulés et respecte l'ordre chronologique.

Tests manuels / bout en bout :
- [ ] Scan du QR → modale de démarrage sur mobile, création de session, partie complète, modale récap — sans jamais changer de page ni d'URL.
- [ ] Le geste retour du téléphone ferme la modale ouverte au lieu de quitter le site.
- [ ] Rechargement de la page en pleine partie → reprise exacte (jauge, cartes grisées, indices).
- [ ] Session terminée puis rechargement → ouverture de la modale de démarrage.
- [ ] Recherche par id fonctionnelle avec 50 cartes par pile.
- [ ] 10 sessions simultanées sans erreur.
- [ ] Déployé sur Vercel Hobby, coût 0 €.

## 12. Ordre de travail suggéré

1. Moteur de règles `rules.js` + tests (TDD).
2. Chargement / validation de `cards.json`.
3. Connexion Mongo + routes API + tests API.
4. Frontend : accueil → écran de jeu → panneaux de cartes → undo → fin + récap.
5. Reprise de session via `localStorage`.
6. Déploiement Vercel + Atlas, test sur vrai mobile.
7. Script QR code (une fois l'URL définitive fixée).

## 13. Décisions prises par défaut (modifiables par l'auteur)

- Les cartes vivent dans `data/cards.json`, pas en base.
- Frontend en JS vanilla, sans framework ni build.
- Undo multiple (pile), événements annulés conservés avec `undone: true`.
- L'API ne renvoie le texte d'un indice qu'une fois cet indice révélé.
- Chaque clic sur Hint révèle un texte d'indice différent (indice 1, 2, 3).
- Une carte est identifiée par (pile, id), car un même id `001` peut exister dans les deux piles.
- Le nom de session est limité à 40 caractères.

## 14. Points ouverts à confirmer avec l'auteur

- Afficher ou non les valeurs de points sur les boutons Correct / Wrong (ex. *"Wrong (−2)"*) — **par défaut : affichées**.
- Fichiers de la charte graphique (couleurs, polices, logo) à déposer dans `docs/design/`.

## 15. Évolutions futures (ne pas implémenter, mais ne pas bloquer)

- Bouton **Event** entre Fuel et Undo (fonctionnement à définir par l'auteur ; emplacement déjà réservé).
- Export / analyse des sessions pour une étude utilisateurs (les données horodatées sont déjà stockées).
- Interface d'administration des cartes.
- Nom de domaine personnalisé.
