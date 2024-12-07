import mongoose from "mongoose";

// Define the cache interface
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Declare global namespace to extend the NodeJS.Global interface
declare global {
  var mongoose: MongooseCache | undefined;
}

const MONGO_URI =
  process.env.MONGO_URI ?? "mongodb://localhost:27017/nextjs_graphql";

if (!MONGO_URI) {
  throw new Error("Please define the MONGO_URI environment variable.");
}

let cached = global.mongoose as {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as mongoose.ConnectOptions);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
