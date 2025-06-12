const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../utils/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: "massoudnet",
      resource_type: "image", // ✅ important for image uploads
      allowed_formats: ["jpg", "jpeg", "png"],
      public_id: `${Date.now()}-${file.originalname}`, // optional, unique naming
    };
  },
});

const parser = multer({ storage });

module.exports = parser;
