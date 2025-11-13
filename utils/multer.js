import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {

    let folder = "docs/aadhar/front";

    if (file.fieldname === "aadharFront") folder = "docs/aadhar/front";
    if (file.fieldname === "aadharBack") folder = "docs/aadhar/back";
    if (file.fieldname === "licenseFront") folder = "docs/license/front";
    if (file.fieldname === "licenseBack") folder = "docs/license/back";

    // ⭐ NEW: profile image upload
    if (file.fieldname === "profileImage") folder = "profile/images";

    // ⭐ NEW: banner image upload
    if (file.fieldname === "bannerImages") folder = "banners";

    return {
      folder,
      allowed_formats: ["jpg", "jpeg", "png", "pdf"],
      resource_type: "auto",
    };
  },
});

const upload = multer({ storage });
export default upload;
