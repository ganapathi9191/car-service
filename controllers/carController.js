import Car from '../models/carModel.js';
import Category from "../models/categoryModel.js";

// Add a new car
export const createCar = async (req, res) => {
 try {
    const {
      name,
      rating,
      carType,
      carSeat,
      carNumber,
      carFuelType,
      perHrCost,
      perDayCost,
      delayCost,
      liveLocation,
      categoryId, // ✅ new
    } = req.body;

    // ✅ Validate category
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Invalid categoryId — Category not found" });
    }

    // ✅ Handle uploaded files (since using upload.any())
    const files = req.files || [];
    const logoFile = files.find((file) => file.fieldname === "logo");
    const carImageFile = files.find((file) => file.fieldname === "carImage");

    const logo = logoFile ? logoFile.path : null;
    const carImage = carImageFile ? carImageFile.path : null;

    if (!logo || !carImage) {
      return res.status(400).json({ message: "Logo and Car image are required" });
    }

    // ✅ Parse location
    let locationCoords;
    try {
      const loc = JSON.parse(liveLocation);
      locationCoords = [parseFloat(loc.lng), parseFloat(loc.lat)];
    } catch (e) {
      return res.status(400).json({ message: "Invalid liveLocation format" });
    }

    // ✅ Create car document
    const newCar = new Car({
      name,
      logo,
      rating: rating ? parseFloat(rating) : 0,
      cartype: carType,
      carseat: parseInt(carSeat, 10),
      carnumber: carNumber,
      carfuel: carFuelType,
      perHrCost: parseFloat(perHrCost),
      perDayCost: parseFloat(perDayCost),
      delayCost: parseFloat(delayCost),
      carImage,
      categoryId, // ✅ linked category
      liveLocation: {
        type: "Point",
        coordinates: locationCoords,
      },
    });

    const savedCar = await newCar.save();
    res.status(201).json({ success: true, car: savedCar });
  } catch (error) {
    console.error("Create Car Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Other controller methods (getAllCars, getCarById) remain unchanged
export const getAllCars = async (req, res) => {
  try {
    const cars = await Car.find()
      .populate("categoryId", "name image") // ✅ Populate category details
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: cars.length, cars });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getCarById = async (req, res) => {
 try {
    const car = await Car.findById(req.params.id).populate("categoryId", "name image");
    if (!car) {
      return res.status(404).json({ message: "Car not found" });
    }
    res.status(200).json({ success: true, car });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};