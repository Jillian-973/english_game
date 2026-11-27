/**
 * Entry point. Vercel imports the default export (Express zero-config);
 * `npm run dev` runs this file directly and starts a local server.
 */
import { fileURLToPath } from 'node:url';
import { createApp } from './src/app.js';
import { loadCards } from './src/game/cards.js';
import { getDb } from './src/db.js';
import { MongoSessionStore } from './src/sessions/mongo-store.js';

// Crashes at startup with a clear message if data/cards.json is invalid.
const cards = loadCards(new URL('./data/cards.json', import.meta.url));

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

const app = createApp({
  cards,
  store: new MongoSessionStore(getDb),
  // On Vercel, public/ is served by the CDN; locally Express serves the same files.
  staticDir: isMain ? fileURLToPath(new URL('./public', import.meta.url)) : undefined,
});

if (isMain) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => console.log(`DEVOT... running on http://localhost:${port}`));
}

export default app;
