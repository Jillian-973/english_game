/**
 * MongoDB connection, cached at module level so serverless invocations on Vercel
 * reuse the same client instead of opening a connection per request.
 */
import { MongoClient } from 'mongodb';

let clientPromise = null;

export function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set (see .env.example).');
  }

  clientPromise ??= new MongoClient(uri, { maxPoolSize: 5 })
    .connect()
    .catch((error) => {
      clientPromise = null; // allow a retry on the next request
      throw error;
    });

  return clientPromise.then((client) => client.db(process.env.MONGODB_DB || 'devot'));
}
