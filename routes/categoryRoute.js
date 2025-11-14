import express from "express";
import * as category from "../controllers/categoryController.js";
import upload from "../utils/multer.js";

const router = express.Router();

// Routes
router.post("/create-category", upload.single("image"), category.createCategory);
router.get("/getall-category", category.getAllCategories);
router.get("/get-category/:id", category.getCategoryById);
router.put("/update-category/:id", upload.single("image"), category.updateCategory);
router.delete("/delete-category/:id", category.deleteCategory);

export default router;
