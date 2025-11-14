import express from 'express';
import { addCar, getAllCars, getCarById, updateCar,getBannerById, deleteCar, createBanner, getBanners, updateBanner, deleteBanner, AllCars } from '../controllers/carController.js'
import upload from "../utils/multer.js";
const router = express.Router();


// Route to add a new car
router.post('/add-cars',upload.any(), addCar);

// Route to get all cars
router.get('/get-cars', getAllCars);
router.get('/allcars', AllCars)

// Route to get a single car by ID
router.get('/getcar/:carId', getCarById);

// Route to update a car by ID
router.put('/updatecar/:carId', updateCar);

// Route to delete a car by ID
router.post('/bannercreate', upload.array("bannerImages"), createBanner);
router.get('/allbanner', getBanners);
router.get('/banner/:bannerId', getBannerById);
router.put('/updatebanner/:bannerId', upload.array("bannerImages"), updateBanner);
router.delete('/deletebanner/:bannerId', deleteBanner);

export default router;