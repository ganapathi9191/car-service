import express from "express";
import * as categoey from "../controllers/categoryController.js";

import upload from "../utils/multer.js"; // Your multer-cloudinary middleware

const router = express.Router();

// Routes
router.post("/create-category", upload.single("image"), categoey.createCategory);
router.get("/getall-category",  categoey.getAllCategories);
router.get("/get-category/:id",  categoey.getCategoryById);
router.put("/update-category/:id", upload.single("image"),  categoey.updateCategory);
router.delete("/delete-category/:id",  categoey.deleteCategory);

export default router;