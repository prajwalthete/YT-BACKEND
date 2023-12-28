import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.COUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    // upload the local file on the cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // file has been successfully uploaded
    console.log("file has been successfully uploaded", response.url);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove temporary or  locally saved file if   the operation get failed
    return null;
  }
};

export { uploadOnCloudinary };
