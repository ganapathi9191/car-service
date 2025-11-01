
import express from "express";
import { createCar, getAllCars, getCarById } from "../controllers/carController.js";
import upload from "../utils/multer.js"; // your existing multer config

const router = express.Router();

// Use upload.any() to accept any files
router.post("/create-car", upload.any(), createCar);
router.get("/getall-car", getAllCars);
router.get("/get-car/:id", getCarById);

export default router;