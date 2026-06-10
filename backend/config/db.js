import mongoose from "mongoose";

const resolveMongoUri = () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (uri && typeof uri === "string" && uri.trim()) {
    return uri.trim();
  }
  console.error(
    "Missing MONGO_URI. In the backend folder, copy .env.example to .env and set:\n" +
      "  MONGO_URI=mongodb://127.0.0.1:27017/ai-mock-interview\n" +
      "(Or use your Atlas connection string.)"
  );
  process.exit(1);
};

const connectDB = async () => {
  try {
    const uri = resolveMongoUri();
    const dbName = process.env.DB_NAME || "ai-mock-interview";
    const conn = await mongoose.connect(uri, { dbName });
    console.log(`Mongo connected: ${conn.connection.host} | DB: ${conn.connection.name}`);
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;
