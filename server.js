import express from "express";
import http from "http";
import mongoose from "mongoose";
import cors from "cors";
import { Server } from "socket.io";
import auth from "./routes/authroute.js";
import category from "./routes/categoryRoute.js";
import car from "./routes/carRoute.js";

import dotenv from "dotenv";
dotenv.config(); // MUST be first

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// this is debug line
console.log("JWT_SECRET loaded:", process.env.JWT_SECRET ? "✅ Yes" : "❌ No");



// ✅ Connect to MongoDB and create default admin
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB Connected");

  
  })
  .catch(err => console.error("Mongo Error:", err.message));

// Routes
app.use("/api",auth);
app.use("/api",category);
app.use("/api",car);


// Socket.IO
const io = new Server(server, { cors: { origin: "*" } });
app.set("io", io);

io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);
  socket.on("disconnect", () => console.log("❌ Socket disconnected:", socket.id));
});

// Server
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
