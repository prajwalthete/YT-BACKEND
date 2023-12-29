import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary with API credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Function to upload a file to Cloudinary
const uploadOnCloudinary = async (localFilePath) => {
  console.log("localFilePath:", localFilePath);

  // Check if localFilePath is truthy (not null or undefined)
  return localFilePath
    ? await cloudinary.uploader
        .upload(localFilePath, { resource_type: "auto" })
        .then((response) => {
          // Log success and remove the local file
          // console.log("file has been successfully uploaded", response.url);
          fs.unlinkSync(localFilePath);
          return response;
        })
        .catch((error) => {
          // Log and handle Cloudinary upload failure
          fs.unlinkSync(localFilePath);
          throw new Error("Cloudinary upload failed");
        })
    : null; // Return null if localFilePath is falsy
};

export { uploadOnCloudinary };

/*

import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  console.log("localFilePath:", localFilePath);
  try {
    if (!localFilePath) return null;

    // upload the local file on Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // file has been successfully uploaded
    console.log("file has been successfully uploaded", response.url);
    fs.unlinkSync(localFilePath);
    // console.log("response object : ", response);
    return response;
  } catch (error) {
    // console.error("Cloudinary upload failed:", error.message);

    // Remove temporary or locally saved file if the operation failed
    fs.unlinkSync(localFilePath);
    throw new Error("Cloudinary upload failed");
  }
};

export { uploadOnCloudinary };

*/
