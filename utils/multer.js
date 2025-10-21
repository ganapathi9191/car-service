import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    let folder = "kyc_documents";
    if (file.fieldname === "aadhaar") folder = "kyc_documents/aadhaar";
    if (file.fieldname === "drivingLicense") folder = "kyc_documents/driving_license";
    
    return {
      folder,
      allowed_formats: ["jpg", "jpeg", "png", "pdf"],
      resource_type: "auto"
    };
  },
});

const upload = multer({ storage });
export default upload;