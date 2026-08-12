import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";


dotenv.config();

connectDB();

const app = express();


app.use(cors());

app.use(express.json());

app.use("/api/profile",profileRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "All-in-One Learning Platform API is running"
  });
});



app.use(
  "/api/auth",
  authRoutes
);


app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});