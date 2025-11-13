import express from 'express';
import { addCar, getAllCars, getCarById, updateCar, deleteCar, createBanner, getBanners, updateBanner, deleteBanner, AllCars } from '../controllers/carController.js'

const router = express.Router();


// Route to add a new car
router.post('/add-cars', addCar);

// Route to get all cars
router.get('/get-cars', getAllCars);
router.get('/allcars', AllCars)

// Route to get a single car by ID
router.get('/getcar/:carId', getCarById);

// Route to update a car by ID
router.put('/updatecar/:carId', updateCar);

// Route to delete a car by ID
router.delete('/deletecar/:carId', deleteCar);
router.post('/bannercreate', createBanner);
router.get('/allbanner', getBanners);
router.put('/updatebanner/:bannerId', updateBanner);
router.delete('/deletebanner/:bannerId', deleteBanner);


export default router;