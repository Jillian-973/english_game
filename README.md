# DEVOT... — application compagnon

Application web **mobile** du jeu de plateau **DEVOT...**. Les joueurs scannent le QR code imprimé sur la boîte : un seul téléphone par table gère la **jauge de fuel** (0 à 10), qui réagit aux réponses données aux cartes du jeu. En fin de partie, l'app affiche le récapitulatif de toutes les actions.

- **Production :** https://devot-psi.vercel.app
- **Cahier des charges complet :** [BRIEF.md](BRIEF.md)
- **Charte graphique :** [docs/design/](docs/design/) · **Contenu des cartes :** [docs/cards/](docs/cards/)

L'interface est en anglais, le code et ses commentaires aussi.

---

## Sommaire

1. [Stack](#stack)
2. [Démarrage rapide](#démarrage-rapide)
3. [Scripts](#scripts)
4. [Structure du projet](#structure-du-projet)
5. [Règles du jeu (jauge)](#règles-du-jeu-jauge)
6. [Ajouter ou modifier des cartes](#ajouter-ou-modifier-des-cartes)
7. [API](#api)
8. [Déploiement (Vercel + MongoDB Atlas)](#déploiement-vercel--mongodb-atlas)
9. [QR code](#qr-code)
10. [Points ouverts](#points-ouverts)

---

## Stack

| Élément | Choix |
|---|---|
| Backend | Node.js 24 (ES modules) + Express 5 |
| Base de données | MongoDB Atlas (cluster Free), driver officiel `mongodb` |
| Frontend | HTML / CSS / JavaScript sans framework ni étape de build |
| Hébergement | Vercel (Hobby), déploiement automatique à chaque push sur `main` |
| Tests | `node:test`, intégré à Node (aucune dépendance) |

Le **serveur fait autorité** : le téléphone envoie une intention (« indice sur la carte 031 »), le serveur applique les règles, enregistre l'action et renvoie l'état complet. Le navigateur ne calcule jamais la jauge.

---

## Démarrage rapide

Prérequis : **Node.js 24** (ou plus récent).

```bash
npm install
cp .env.example .env    # puis renseigner MONGODB_URI et MONGODB_DB
npm run dev
```

Ouvrir http://localhost:3000, puis passer en affichage téléphone (F12, puis Ctrl+Maj+M).

> **Sans base de données :** si `MONGODB_URI` n'est pas renseigné, le serveur local garde les parties **en mémoire** (un avertissement s'affiche dans la console). C'est pratique pour travailler sur l'interface, mais les parties sont perdues à l'arrêt du serveur. En production, la base est obligatoire.

### Variables d'environnement

| Variable | Rôle |
|---|---|
| `MONGODB_URI` | Chaîne de connexion MongoDB Atlas (contient un mot de passe : ne jamais la commiter) |
| `MONGODB_DB` | Nom de la base (`devot` par défaut) |
| `PORT` | Port local de `npm run dev` (`3000` par défaut) |

Le fichier `.env` est ignoré par git ; seul `.env.example` est versionné.

---

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur local avec rechargement automatique quand un fichier change |
| `npm start` | Serveur local sans rechargement |
| `npm test` | Lance tous les tests (règles, validation des cartes, API) avec une base en mémoire |
| `npm run qr -- <url>` | Génère le QR code dans `qr/` (voir [QR code](#qr-code)) |

---

## Structure du projet

```
├── server.js                  Point d'entrée (Vercel importe l'export par défaut)
├── data/cards.json            Toutes les cartes du jeu, validées au démarrage
├── src/
│   ├── create-app.js          Assemble l'API Express (dépendances injectées)
│   ├── db.js                  Connexion MongoDB, réutilisée entre les requêtes
│   ├── game/
│   │   ├── rules.js           Moteur de règles PUR (aucun accès à la base)
│   │   ├── cards.js           Chargement et validation des cartes
│   │   └── session-view.js    État de partie renvoyé au téléphone
│   ├── sessions/
│   │   ├── session-service.js Cas d'usage : charger → règles → enregistrer → répondre
│   │   ├── mongo-store.js     Enregistrement dans MongoDB
│   │   └── memory-store.js    Même contrat, en mémoire (tests, dev sans base)
│   ├── routes/                Routes HTTP (traduction HTTP ↔ service)
│   └── http/errors.js         Erreurs HTTP et réponses `{ error }`
├── public/                    Frontend, servi tel quel par le CDN de Vercel
│   ├── index.html             Page unique : écran de jeu + une fenêtre <dialog>
│   ├── css/                   Un fichier par composant ; couleurs et tailles dans tokens.css
│   ├── js/
│   │   ├── main.js            Relie les écrans à l'API
│   │   ├── api.js             Appels au serveur
│   │   ├── components/        Jauge, fenêtre modale, message bref (toast)
│   │   ├── views/             Un fichier par écran (départ, liste, carte, récap…)
│   │   └── data/events.js     Cartes Event (affichage seulement, sans règles)
│   ├── assets/                Images de la charte
│   └── fonts/                 Police Jersey 10, hébergée avec le site
├── test/                      Tests node:test
├── scripts/generate-qr.js     Génération du QR code
├── qr/                        QR code imprimé (SVG + PNG), versionné
└── docs/                      Charte graphique, PDF des cartes, assets d'origine
```

---

## Règles du jeu (jauge)

La jauge **démarre à 10** et reste toujours entre **0 et 10**. Arriver à 0 ne termine pas la partie : la jauge peut remonter.

| Action | Carte Question (`movement`) | Carte Fuel (`fuel`) |
|---|---|---|
| Indice (par clic, 3 maximum) | −1 | −1 |
| Bonne réponse | −1 | +`fuelReward` |
| Mauvaise réponse | −`wrongPenalty` | 0 |

- Une carte reçoit **une seule réponse** ; ensuite elle est grisée et n'accepte plus aucune action.
- Les indices se prennent **avant** de répondre, un par clic, dans l'ordre.
- **Undo** annule la dernière action (et peut remonter plusieurs actions). Les actions annulées restent enregistrées avec `undone: true`, pour une future étude, mais sont exclues de la jauge et du récap.
- Chaque action enregistre le **delta réellement appliqué** après bornage (exemple : jauge à 1, malus de 3 → jauge à 0, delta −1), ce qui permet un Undo exact.

Toute la logique se trouve dans [src/game/rules.js](src/game/rules.js) et elle est couverte par [test/rules.test.js](test/rules.test.js).

---

## Ajouter ou modifier des cartes

Les cartes sont dans [data/cards.json](data/cards.json), pas en base de données. Après une modification, lancer `npm test` puis pousser sur `main`.

```json
{
  "id": "031",
  "deck": "movement",
  "level": "medium",
  "question": "What is the purpose of the HTML <br> tag?",
  "options": ["Create a horizontal line.", "Make text bold.", "Insert a line break.", "Create a new paragraph."],
  "answer": "C",
  "hints": ["It is a self-closing tag.", "It moves what follows to the next line.", "Like pressing Enter in a poem."],
  "wrongPenalty": 2
}
```

| Champ | Règle |
|---|---|
| `id` | 3 chiffres, **en texte**, exactement comme imprimé sur la carte (`"008"`, pas `8`) |
| `deck` | `"movement"` (carte Question) ou `"fuel"` |
| `level` | `"easy"`, `"medium"` ou `"hard"` |
| `question` | Texte de la question |
| `options` | Exactement 4 réponses, dans l'ordre A, B, C, D |
| `answer` | Lettre de la bonne réponse : `"A"` à `"D"` |
| `hints` | 1 à 3 indices, dans l'ordre de révélation |
| `wrongPenalty` | **Cartes Question uniquement** : entier de 1 à 3 |
| `fuelReward` | **Cartes Fuel uniquement** : entier de 1 à 3 |

Le même `id` peut exister dans les deux piles (`movement:001` et `fuel:001` sont deux cartes différentes).

Le fichier est **vérifié au démarrage** : en cas d'erreur (numéro en double, champ manquant, valeur hors limites…), le serveur refuse de démarrer et liste les problèmes. Une carte invalide ne peut donc pas arriver en production.

Les valeurs actuelles suivent le niveau de la carte : facile = 1, moyen = 2, difficile = 3.

---

## API

Toutes les réponses sont en JSON. En cas d'erreur : `{ "error": "message" }`.

| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| `GET` | `/api/cards` | — | Toutes les cartes, **sans le texte des indices** (seulement `hintCount`) |
| `POST` | `/api/sessions` | `{ "name": "Table 3" }` | Nouvelle partie (201) |
| `GET` | `/api/sessions/:id` | — | État de la partie |
| `POST` | `/api/sessions/:id/actions` | `{ "deck", "cardId", "type" }` | État mis à jour (`type` : `hint`, `correct` ou `wrong`) |
| `POST` | `/api/sessions/:id/undo` | — | État mis à jour |
| `POST` | `/api/sessions/:id/end` | — | État final |

Codes d'erreur : `400` corps invalide ou carte inconnue · `404` partie inconnue · `409` action interdite (carte déjà répondue, plus d'indice, partie terminée, rien à annuler, ou deux écritures en même temps).

L'état renvoyé contient la jauge, `canUndo`, l'état de chaque carte touchée (indices révélés avec leur texte, résultat) et l'historique des actions non annulées.

Chaque écriture en base est **atomique** et conditionnée à la version de la partie lue juste avant : si deux actions arrivent en même temps, la seconde est refusée (409) au lieu de fausser la jauge.

---

## Déploiement (Vercel + MongoDB Atlas)

Le projet Vercel **`devot`** est relié au dépôt GitHub : **chaque push sur `main` déploie en production**. Les autres branches donnent des déploiements de prévisualisation.

Réglages en place :

- **Framework :** Express. Le point d'entrée est `server.js`, qui doit importer `express` lui-même (exigence de Vercel).
- **Node.js :** 24, fixé par `engines` dans `package.json`.
- **Fichiers statiques :** `public/` est servi par le CDN de Vercel. La racine `/` est renvoyée par Express (`public/index.html`), car Vercel transmet cette adresse à la fonction.
- **Variables d'environnement :** `MONGODB_URI` et `MONGODB_DB` (environnement Production).
- **Protection :** la connexion Vercel n'est demandée que pour les prévisualisations ; l'adresse de production est publique.

Côté **MongoDB Atlas** :

- **Network Access :** `0.0.0.0/0`, car Vercel n'a pas d'adresse IP fixe.
- **Utilisateur dédié** à l'application, avec un mot de passe fort et des droits limités à sa base.
- Collection `sessions`, avec un index sur `createdAt` (créé automatiquement).

> ⚠️ **Ne pas renommer ni supprimer le projet Vercel :** l'adresse `devot-psi.vercel.app` est imprimée dans le QR code et doit rester valide pour toujours.

---

## QR code

Le QR code des boîtes est dans [qr/](qr/) : `qr-code.svg` (vectoriel, à donner à l'imprimeur) et `qr-code.png` (2048 × 2048 px).

```bash
npm run qr -- https://devot-psi.vercel.app
```

C'est un QR code **statique** (il contient directement l'adresse), avec une correction d'erreur de niveau Q (environ 25 % du code peut être abîmé) et une marge blanche de 4 modules. Aucun service de « QR dynamique » n'est utilisé, car il pourrait expirer ou devenir payant.

Avant une impression en série : imprimer un exemplaire à la taille réelle (au moins 2 × 2 cm) et le scanner avec plusieurs téléphones.

---

## Points ouverts

- **Question 42 :** le PDF source est incohérent (l'énoncé porte sur l'attribut `id`, les indices et la réponse sur `target`). Elle est recopiée telle quelle et doit être corrigée.
- **Cartes Story / Event :** la section est vide dans le PDF. Le bouton « Story Card » affiche les 3 cartes Event du design, sans règle de jeu ni API. Il peut être masqué avec `FEATURES.event` dans [public/js/config.js](public/js/config.js) ; son emplacement reste réservé à l'écran.
- **Nombre de cartes :** 24 aujourd'hui (18 Question, 6 Fuel). Il suffit de compléter `data/cards.json`.
- **Évolutions prévues par le brief :** export des parties pour une étude utilisateurs (toutes les actions sont déjà horodatées en base), interface d'administration des cartes, nom de domaine personnalisé.
