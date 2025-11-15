
import Car from "../models/carModel.js";
import Banner from "../models/bannerModel.js";
import Category from "../models/categoryModel.js";
import cloudinary from "../config/cloudinary.js";
import User from "../models/authModel.js";

// Add a new car
export const addCar = async (req, res) => {
  try {
    const {
      carName,
      model,
      year,
      pricePerHour,
      pricePerDay,
      delayPerHour,
      delayPerDay,
      extendedPrice,
      type,
      description,
      location,
      carType,
      fuel,
      seats,
      vehicleNumber,
      branchName,
      branchLat,
      branchLng,
      availability = [],
      availabilityStatus = true,
      runningStatus = "Available",
      categoryId,
    } = req.body;

    // ✅ Validate required fields
    if (!branchName || !branchLat || !branchLng) {
      return res.status(400).json({ message: 'Branch name, latitude, and longitude are required' });
    }

    if (!vehicleNumber || vehicleNumber.trim() === '') {
      return res.status(400).json({ message: 'Vehicle number is required' });
    }

    // ✅ Validate category if provided
    if (categoryId) {
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
    }

    // ✅ Check if vehicle number already exists
    const existingCar = await Car.findOne({ vehicleNumber: vehicleNumber.trim() });
    if (existingCar) {
      return res.status(400).json({ message: 'Vehicle number already exists' });
    }

    // ✅ Group files by fieldname when using upload.any()
    let carImageUrls = [];
    let carDocUrls = [];

    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (file.fieldname === 'carImage') {
          carImageUrls.push(file.path);
        } else if (file.fieldname === 'carDocs') {
          carDocUrls.push(file.path);
        }
      });
    }

 
    // ✅ Parse extended price
    let parsedExtendedPrice = extendedPrice;
    if (typeof extendedPrice === 'string') {
      try {
        parsedExtendedPrice = JSON.parse(extendedPrice);
      } catch (err) {
        return res.status(400).json({ message: 'Invalid extendedPrice JSON format' });
      }
    }

    // Convert extendedPrice format if needed
    if (parsedExtendedPrice && !parsedExtendedPrice.perHour) {
      parsedExtendedPrice = {
        perHour: parsedExtendedPrice['6hrs'] || pricePerHour,
        perDay: parsedExtendedPrice['12hrs'] || pricePerDay
      };
    }

    // ✅ Parse availability
    let parsedAvailability = availability;
    if (typeof availability === 'string') {
      try {
        parsedAvailability = JSON.parse(availability);
      } catch (err) {
        return res.status(400).json({ message: 'Invalid availability JSON format' });
      }
    }

    if (!Array.isArray(parsedAvailability)) {
      parsedAvailability = [];
    }

    parsedAvailability = parsedAvailability.map(entry => {
      if (!entry.date || !Array.isArray(entry.timeSlots)) {
        throw new Error('Each availability entry must have a valid "date" and "timeSlots"');
      }

      const d = new Date(entry.date);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const formattedDate = `${yyyy}/${mm}/${dd}`;

      const timeFormat = /^\d{2}:\d{2}$/;
      for (const t of entry.timeSlots) {
        if (!timeFormat.test(t)) {
          throw new Error(`Invalid time format: ${t}`);
        }
      }

      return {
        ...entry,
        date: formattedDate,
      };
    });

    // ✅ Create Car document
    const newCar = new Car({
      carName,
      model,
      year,
      pricePerHour,
      pricePerDay,
      delayPerHour,
      delayPerDay,
      extendedPrice: parsedExtendedPrice || { perHour: pricePerHour, perDay: pricePerDay },
      description,
      carImage: carImageUrls,
      carDocs: carDocUrls,
      location,
      carType,
      fuel,
      type,
      seats,
      vehicleNumber: vehicleNumber.trim(),
      availability: parsedAvailability,
      availabilityStatus: availabilityStatus === 'true' || availabilityStatus === true,
      runningStatus: runningStatus || "Available",
      status: 'active',
      bookedStatus: [],
      branch: {
        name: branchName,
        location: {
          type: 'Point',
          coordinates: [parseFloat(branchLng), parseFloat(branchLat)],
        },
      },
      categoryId: categoryId || null,
    });

    const savedCar = await newCar.save();

    return res.status(201).json({
      message: 'Car added successfully!',
      car: savedCar,
    });

  } catch (err) {
    console.error('Error in addCar:', err);
    
    // Handle duplicate key error specifically
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0];
      return res.status(400).json({ 
        message: `Duplicate ${field}: A car with this ${field} already exists`,
        error: err.message 
      });
    }
    
    return res.status(500).json({ message: 'Error adding car', error: err.message });
  }
};

export const getAllCars = async (req, res) => {
  try {
    const { start, end, time, type, fuel, seats, location, categoryId } = req.query;

    const dateRegex = /^\d{4}\/\d{2}\/\d{2}$/;

    if ((start && !dateRegex.test(start)) || (end && !dateRegex.test(end))) {
      return res.status(400).json({ message: 'Date must be in YYYY/MM/DD format' });
    }

    // Build date range
    let dateRange = [];
    if (start && end) {
      const current = new Date(start.replace(/\//g, '-'));
      const endDate = new Date(end.replace(/\//g, '-'));

      while (current <= endDate) {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        const dd = String(current.getDate()).padStart(2, '0');
        dateRange.push(`${yyyy}/${mm}/${dd}`);
        current.setDate(current.getDate() + 1);
      }
    }

    // Build time slot array
    let timeSlots = [];
    if (time) {
      timeSlots = time.split(',').map(t => t.trim());
      const timeRegex = /^\d{2}:\d{2}$/;

      for (const t of timeSlots) {
        if (!timeRegex.test(t)) {
          return res.status(400).json({ message: `Invalid time format: ${t}` });
        }
      }
    }

    // Base filter
    const filter = { status: 'active' };

    // -------------------------------------
    // YOUR ORIGINAL FILTER (NOT REMOVED)
    // -------------------------------------
    if (dateRange.length > 0 || timeSlots.length > 0) {
      filter.availability = {
        $elemMatch: {
          ...(dateRange.length > 0 && { date: { $in: dateRange } }),
          ...(timeSlots.length > 0 && { timeSlots: { $in: timeSlots } })
        }
      };
    }

    // ---------------------------------------------------------
    // 🔥 UNIVERSAL WORKING FILTER (ADDED — DOES NOT REMOVE OLD)
    // ---------------------------------------------------------
    if (dateRange.length > 0 || timeSlots.length > 0) {
      filter.$expr = {
        $gt: [
          {
            $size: {
              $filter: {
                input: "$availability",
                as: "slot",
                cond: {
                  $and: [
                    // DATE MATCH (convert ANY stored date to YYYY/MM/DD)
                    ...(dateRange.length > 0
                      ? [{
                          $in: [
                            {
                              $dateToString: {
                                format: "%Y/%m/%d",
                                date: { $toDate: "$$slot.date" }
                              }
                            },
                            dateRange
                          ]
                        }]
                      : []),

                    // TIME MATCH (deep nested timeSlots)
                    ...(timeSlots.length > 0
                      ? [{
                          $gt: [
                            {
                              $size: {
                                $setIntersection: ["$$slot.timeSlots", timeSlots]
                              }
                            },
                            0
                          ]
                        }]
                      : [])
                  ]
                }
              }
            }
          },
          0
        ]
      };
    }

    // Other filters
    if (type) filter.type = type;
    if (fuel) filter.fuel = fuel;
    if (seats) filter.seats = parseInt(seats);
    if (location) filter.location = new RegExp(location, 'i');
    if (categoryId) filter.categoryId = categoryId;

    const cars = await Car.find(filter).populate('categoryId', 'name image');

    if (!cars.length) {
      return res.status(404).json({ message: 'No cars found with the provided filters' });
    }

    return res.status(200).json({
      message: 'Available cars fetched successfully',
      total: cars.length,
      cars,
    });

  } catch (err) {
    console.error('Error in getAllCars:', err);
    return res.status(500).json({ message: 'Error fetching cars', error: err.message });
  }
};

export const AllCars = async (req, res) => {
  try {
    const { userId, type, fuel, seats, categoryId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required in query' });
    }

    const user = await User.findById(userId);
    if (!user || !user.location || !Array.isArray(user.location.coordinates)) {
      return res.status(404).json({ message: 'User or location not found' });
    }

    const userCoords = user.location.coordinates; // [lng, lat]

    const filter = {
      status: 'active',
      runningStatus: 'Available',
      'branch.location': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: userCoords,
          },
          $minDistance: 0,
          $maxDistance: 50000, // 50 km
        }
      }
    };

    if (type) filter.type = type;
    if (fuel) filter.fuel = fuel;
    if (seats) filter.seats = parseInt(seats);
    if (categoryId) filter.categoryId = categoryId;

    const nearbyCars = await Car.find(filter).populate('categoryId', 'name image');

    if (!nearbyCars || nearbyCars.length === 0) {
      return res.status(404).json({ message: 'No nearby branch found' });
    }

    return res.status(200).json({
      message: 'Available cars fetched successfully',
      isGuest: false,
      cars: nearbyCars.map(car => ({
        _id: car._id,
        carName: car.carName,
        model: car.model,
        year: car.year,
        pricePerHour: car.pricePerHour,
        pricePerDay: car.pricePerDay,
        extendedPrice: car.extendedPrice,
        delayPerHour: car.delayPerHour,
        delayPerDay: car.delayPerDay,
        vehicleNumber: car.vehicleNumber,
        carImage: car.carImage,
        carDocs: car.carDocs,
        carType: car.carType,
        fuel: car.fuel,
        seats: car.seats,
        type: car.type,
        description: car.description,
        location: car.location,
        status: car.status,
        runningStatus: car.runningStatus,
        availabilityStatus: car.availabilityStatus,
        availability: car.availability || [],
        bookedStatus: car.bookedStatus || [],
        branch: car.branch,
        categoryId: car.categoryId,
        createdAt: car.createdAt,
        updatedAt: car.updatedAt,
        __v: car.__v
      }))
    });

  } catch (error) {
    console.error('Error finding nearby cars:', error);
    return res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

export const getCarsNearUser = async (req, res) => {
  try {
    const { userId, maxDistance = 5000, type, fuel, seats, categoryId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const user = await User.findById(userId);

    if (!user || !user.location || !user.location.coordinates) {
      return res.status(404).json({ message: 'User or user location not found' });
    }

    const userCoords = user.location.coordinates; // [lng, lat]

    const filter = {
      status: 'active',
      runningStatus: { $ne: 'Booked' },
      'branch.location': {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: userCoords,
          },
          $maxDistance: parseInt(maxDistance),
        },
      },
    };

    if (type) filter.type = type;
    if (fuel) filter.fuel = fuel;
    if (seats) filter.seats = parseInt(seats);
    if (categoryId) filter.categoryId = categoryId;

    const cars = await Car.find(filter).populate('categoryId', 'name image');

    if (!cars.length) {
      return res.status(404).json({ message: 'No cars found near your location' });
    }

    res.status(200).json({ 
      message: 'Available cars fetched successfully',
      total: cars.length, 
      cars 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching cars', error: error.message });
  }
};

// Get a car by ID
export const getCarById = async (req, res) => {
  try {
    const car = await Car.findById(req.params.carId).populate('categoryId', 'name image');
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }
    return res.status(200).json(car);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching car' });
  }
};

// Update a car by ID
export const updateCar = async (req, res) => {
  try {
    const { carId } = req.params;
    if (!carId) return res.status(400).json({ message: 'Car ID is required' });

    const {
      carName,
      model,
      year,
      pricePerHour,
      pricePerDay,
      delayPerHour,
      delayPerDay,
      extendedPrice,
      type,
      description,
      location,
      carType,
      fuel,
      seats,
      vehicleNumber,
      availability = [],
      availabilityStatus,
      runningStatus,
      status,
      branchName,
      branchLat,
      branchLng,
      categoryId,
    } = req.body;

    // ✅ Validate category if provided
    if (categoryId) {
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
    }

    // ✅ Group files by fieldname when using upload.any()
    let carImageUrls = [];
    let carDocUrls = [];

    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (file.fieldname === 'carImage') {
          carImageUrls.push(file.path);
        } else if (file.fieldname === 'carDocs') {
          carDocUrls.push(file.path);
        }
      });
    }

    console.log('Updated car images:', carImageUrls);
    console.log('Updated car docs:', carDocUrls);

    // ✅ Parse availability
    let parsedAvailability = availability;
    if (typeof availability === 'string') {
      try {
        parsedAvailability = JSON.parse(availability);
      } catch (err) {
        return res.status(400).json({ message: 'Invalid availability JSON format' });
      }
    }

    if (!Array.isArray(parsedAvailability)) {
      parsedAvailability = [];
    }

    for (const entry of parsedAvailability) {
      if (!entry.date || !Array.isArray(entry.timeSlots)) {
        return res.status(400).json({
          message: 'Invalid availability format. Each entry must have a date and an array of timeSlots.',
        });
      }
    }

    // ✅ Parse extended price
    let parsedExtendedPrice = extendedPrice;
    if (typeof extendedPrice === 'string') {
      try {
        parsedExtendedPrice = JSON.parse(extendedPrice);
      } catch (err) {
        return res.status(400).json({ message: 'Invalid extendedPrice JSON format' });
      }
    }

    // ✅ Prepare fields to update
    const updatedFields = {};

    if (carName !== undefined) updatedFields.carName = carName;
    if (model !== undefined) updatedFields.model = model;
    if (year !== undefined) updatedFields.year = year;
    if (pricePerHour !== undefined) updatedFields.pricePerHour = pricePerHour;
    if (pricePerDay !== undefined) updatedFields.pricePerDay = pricePerDay;
    if (delayPerHour !== undefined) updatedFields.delayPerHour = delayPerHour;
    if (delayPerDay !== undefined) updatedFields.delayPerDay = delayPerDay;
    if (parsedExtendedPrice !== undefined) updatedFields.extendedPrice = parsedExtendedPrice;
    if (description !== undefined) updatedFields.description = description;
    if (location !== undefined) updatedFields.location = location;
    if (carType !== undefined) updatedFields.carType = carType;
    if (fuel !== undefined) updatedFields.fuel = fuel;
    if (type !== undefined) updatedFields.type = type;
    if (seats !== undefined) updatedFields.seats = seats;
    if (vehicleNumber !== undefined) updatedFields.vehicleNumber = vehicleNumber.trim();
    if (parsedAvailability !== undefined) updatedFields.availability = parsedAvailability;
    if (availabilityStatus !== undefined) updatedFields.availabilityStatus = availabilityStatus === 'true' || availabilityStatus === true;
    if (runningStatus !== undefined) updatedFields.runningStatus = runningStatus;
    if (status !== undefined) updatedFields.status = status;
    if (categoryId !== undefined) updatedFields.categoryId = categoryId;

    if (carImageUrls.length > 0) {
      updatedFields.carImage = carImageUrls;
    }

    if (carDocUrls.length > 0) {
      updatedFields.carDocs = carDocUrls;
    }

    // Update branch if provided
    if (branchName && branchLat && branchLng) {
      updatedFields.branch = {
        name: branchName,
        location: {
          type: 'Point',
          coordinates: [parseFloat(branchLng), parseFloat(branchLat)],
        },
      };
    }

    // ✅ Update DB
    const updatedCar = await Car.findByIdAndUpdate(
      carId,
      updatedFields,
      { new: true, runValidators: true }
    ).populate('categoryId', 'name image');

    if (!updatedCar) {
      return res.status(404).json({ message: 'Car not found' });
    }

    return res.status(200).json({
      message: 'Car updated successfully!',
      car: updatedCar,
    });
  } catch (err) {
    console.error(err);
    
    // Handle duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0];
      return res.status(400).json({ 
        message: `Duplicate ${field}: A car with this ${field} already exists`,
        error: err.message 
      });
    }
    
    return res.status(500).json({ message: 'Error updating car', error: err.message });
  }
};

// Delete a car by ID
export const deleteCar = async (req, res) => {
  try {
    const { carId } = req.params;
    if (!carId) return res.status(400).json({ message: 'Car ID is required' });

    const deletedCar = await Car.findByIdAndDelete(carId);

    if (!deletedCar) {
      return res.status(404).json({ message: 'Car not found' });
    }

    // Optional: Delete images from Cloudinary
    if (deletedCar.carImage && deletedCar.carImage.length > 0) {
      for (const imageUrl of deletedCar.carImage) {
        const publicId = imageUrl.split('/').slice(-2).join('/').split('.')[0];
        await cloudinary.uploader.destroy(`cars/${publicId}`);
      }
    }

    if (deletedCar.carDocs && deletedCar.carDocs.length > 0) {
      for (const docUrl of deletedCar.carDocs) {
        const publicId = docUrl.split('/').slice(-2).join('/').split('.')[0];
        await cloudinary.uploader.destroy(`car-docs/${publicId}`, { resource_type: 'auto' });
      }
    }

    return res.status(200).json({
      message: 'Car deleted successfully!',
      car: deletedCar,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error deleting car', error: err.message });
  }
};


export const createDeposit = async (req, res) => {
  try {
    const { userId, bookingId } = req.params;
    const { deposit } = req.body;  // deposit as string

    if (!deposit || typeof deposit !== 'string' || deposit.trim() === '') {
      return res.status(400).json({ message: 'Please provide a valid deposit string' });
    }

    // Find booking matching user and bookingId
    const booking = await Booking.findOne({ _id: bookingId, userId });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found for this user' });
    }

    // Update deposit as string
    booking.deposit = deposit.trim();

    await booking.save();

    return res.status(200).json({
      message: 'Deposit information updated successfully',
      deposit: booking.deposit,
      bookingId: booking._id,
    });
  } catch (error) {
    console.error('Error updating deposit:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


// ⭐ CREATE BANNER
export const createBanner = async (req, res) => {
  try {
    let imageUrls = [];

    // If images uploaded via multer
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map((file) => file.path);
    }

    const banner = await Banner.create({
      images: imageUrls,
    });

    return res.status(201).json({
      message: "Banner created successfully!",
      banner,
    });

  } catch (error) {
    console.error("Create Banner Error:", error);
    return res.status(500).json({ message: "Error creating banner", error: error.message });
  }
};



// ⭐ UPDATE BANNER
export const updateBanner = async (req, res) => {
  try {
    const { bannerId } = req.params;

    if (!bannerId) {
      return res.status(400).json({ message: "Banner ID is required" });
    }

    let imageUrls = [];

    // If new files uploaded (multer handles upload directly to Cloudinary)
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map((file) => file.path);
    }

    // If user sends images in body
    if (req.body.images) {
      if (typeof req.body.images === "string") {
        imageUrls.push(req.body.images);
      } else if (Array.isArray(req.body.images)) {
        imageUrls.push(...req.body.images);
      }
    }

    const updatedBanner = await Banner.findByIdAndUpdate(
      bannerId,
      { images: imageUrls.length > 0 ? imageUrls : undefined },
      { new: true }
    );

    if (!updatedBanner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    return res.status(200).json({
      message: "Banner updated successfully!",
      banner: updatedBanner,
    });

  } catch (error) {
    console.error("Update Banner Error:", error);
    return res.status(500).json({ message: "Error updating banner", error: error.message });
  }
};



// ⭐ DELETE BANNER
export const deleteBanner = async (req, res) => {
  try {
    const { bannerId } = req.params;

    if (!bannerId) {
      return res.status(400).json({ message: "Banner ID is required" });
    }

    const deletedBanner = await Banner.findByIdAndDelete(bannerId);

    if (!deletedBanner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    return res.status(200).json({
      message: "Banner deleted successfully!",
      banner: deletedBanner,
    });

  } catch (error) {
    console.error("Delete Banner Error:", error);
    return res.status(500).json({ message: "Error deleting banner", error: error.message });
  }
};



// ⭐ GET ALL BANNERS
export const getBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Banners fetched successfully!",
      banners,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to fetch banners",
      error: error.message,
    });
  }
};



// ⭐ GET BANNER BY ID (NEW)
export const getBannerById = async (req, res) => {
  try {
    const { bannerId } = req.params;

    const banner = await Banner.findById(bannerId);

    if (!banner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    return res.status(200).json({
      message: "Banner fetched successfully!",
      banner,
    });

  } catch (error) {
    console.error("Get Banner Error:", error);
    return res.status(500).json({
      message: "Failed to fetch banner",
      error: error.message,
    });
  }
};
