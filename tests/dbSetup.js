import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "test-secret";

const TEST_URI = process.env.MONGO_URI_TEST || "mongodb://localhost:27017/nabhacare_test";

export async function connectTestDB() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_URI);
  }
}

export async function clearTestDB() {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

export async function disconnectTestDB() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
