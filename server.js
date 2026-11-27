/**
 * Entry point. Vercel imports the default export (Express zero-config: this file must
 * import express itself); `npm run dev` runs this file directly and starts a local server.
 */
import express from 'express';
import { fileURLToPath } from 'node:url';
import { createApp } from './src/create-app.js';
import { buildCardIndex } from './src/game/cards.js';
import { getDb } from './src/db.js';
import { MongoSessionStore } from './src/sessions/mongo-store.js';
import { MemorySessionStore } from './src/sessions/memory-store.js';
// Static import so the file is bundled with the Vercel Function.
import cardData from './data/cards.json' with { type: 'json' };

// Crashes at startup with a clear message if data/cards.json is invalid.
const cards = buildCardIndex(cardData);

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

function createStore() {
  if (process.env.MONGODB_URI || !isMain) return new MongoSessionStore(getDb);

  // Local convenience only: lets the app run before Atlas is configured.
  console.warn('MONGODB_URI is not set: sessions are kept in memory and lost when the server stops.');
  return new MemorySessionStore();
}

const app = express();

// On Vercel, public/ is served by the CDN; locally Express serves the same files.
if (isMain) app.use(express.static(fileURLToPath(new URL('./public', import.meta.url))));

// The root URL (printed in the QR code) is routed to this function on Vercel,
// so the page itself is sent from here.
const indexPage = fileURLToPath(new URL('./public/index.html', import.meta.url));
app.get('/', (req, res) => res.sendFile(indexPage));

app.use(createApp({ cards, store: createStore() }));

if (isMain) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => console.log(`DEVOT... running on http://localhost:${port}`));
}

export default app;
