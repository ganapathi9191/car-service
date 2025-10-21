import express from "express";
import http from "http";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import auth from "./routes/authroute.js";


dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// ✅ Connect to MongoDB and create default admin
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB Connected");

  
  })
  .catch(err => console.error("Mongo Error:", err.message));

// Routes
app.use("/api",auth);


// Socket.IO
const io = new Server(server, { cors: { origin: "*" } });
app.set("io", io);

io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);
  socket.on("disconnect", () => console.log("❌ Socket disconnected:", socket.id));
});


// Server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
