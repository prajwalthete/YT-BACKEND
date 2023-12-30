import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Define a registration handler using asyncHandler
const registerUser = asyncHandler(async (req, res) => {
  // Extract user details from the request body
  const { fullname, email, username, password } = req.body;

  // Validate if required fields are filled
  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields must be filled");
  }

  // Check if a user with the provided username or email already exists
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with username or email already exists");
  }

  // Get the local path of the avatar file from the request
  const avatarLocalPath = req.files?.avatar[0]?.path;

  // Get the local path of the cover image file from the request
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path || undefined;

  // Ensure that the avatar file is provided
  if (!avatarLocalPath) {
    throw new ApiError(404, "Avatar file is required");
  }

  // Upload avatar and cover image to Cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  // Check if the avatar file is uploaded successfully
  if (!avatar) {
    throw new ApiError(404, "Avatar file upload failed");
  }

  // Create a new user in the database
  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // Retrieve the created user as a plain JavaScript object
  const createdUser = await User.findOne({ _id: user._id }).lean();

  // Remove sensitive fields (password and refreshToken)
  delete createdUser.password;
  delete createdUser.refreshToken;

  // Check for user creation
  if (!createdUser) {
    throw new ApiError(
      500,
      "Something went wrong while creating/registering a new user"
    );
  }

  // Return the response object
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

export { registerUser };

/*
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// const registerUser = asyncHandler(async (req, res) => {
//   res.status(200).json({
//     message: "ok",
//   });
// });

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // check if user already is registered :username ,email
  // validation
  // check for images and avatar
  // upload them to cloudinary ,avatar
  // create user object-create entry in db
  // remove password and refreshToken fields from user object i.e response
  // check for user creation
  // return res

  const { fullname, email, username, password } = req.body;

  // console.log(
  //   "fullname",
  //   fullname,
  //   "email",
  //   email,
  //   "username",
  //   username,
  //   "password",
  //   password
  // );

  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields must be filled");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with username,email already exists");
  }
  // console.log(req.files);

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path || undefined;

  
  // let coverImageLocalPath;
  // if (
  //   req.files &&
  //   Array.isArray(req.files.coverImage) &&
  //   req.files.coverImage.length > 0
  // ) {
  //   coverImageLocalPath = req.files.coverImage[0]?.path;
  // }


  if (!avatarLocalPath) {
    throw new ApiError(404, "avatar file is required");
  }

  // upload them to cloudinary ,avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  // console.log("avatarLocalPath:", avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  // check for avatar
  if (!avatar) {
    throw new ApiError(404, "avatar file is required");
  }

  // create user object-create entry in db
  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // remove password and refreshToken fields from user object i.e response
  // const createdUser = await findById(user._id).select(
  //   "-password -refreshToken"
  // );

  const createdUser = await User.findOne({ _id: user._id }).lean();
  // Remove sensitive fields
  delete createdUser.password;
  delete createdUser.refreshToken;

  
  //if you're using Mongoose, you can use the lean() function to get a plain JavaScript object instead of a Mongoose document. This way, you can modify the object without affecting the database.
  //lean() is used to retrieve a plain JavaScript object, and then the delete operator is used to remove the password and refreshToken fields.
 

  // check for user creation

  if (!createdUser) {
    throw new ApiError(
      500,
      "somthing went wrong while creating/registering  a new user"
    );
  }

  // return response object
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "user registered successfully"));
});

export { registerUser };
*/
