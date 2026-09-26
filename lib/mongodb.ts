import dns from "node:dns";
import mongoose from "mongoose";

// On some Windows networks Node's resolver falls back to 127.0.0.1 (e.g. when the
// router only advertises an IPv6 link-local DNS server), which breaks the SRV lookup
// that mongodb+srv:// URIs require. Use public resolvers in that case.
if (dns.getServers().every((server) => server === "127.0.0.1" || server === "::1")) {
  dns.setServers(["1.1.1.1", "8.8.8.8"]);
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, { bufferCommands: false });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    // Don't cache a failed connection attempt, so the next request retries.
    cached.promise = null;
    throw error;
  }
  return cached.conn;
}
