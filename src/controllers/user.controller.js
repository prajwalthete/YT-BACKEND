import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// Function to generate access and refresh tokens based on user ID
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    // Find the user by ID
    const user = await User.findById(userId);

    // Generate access and refresh tokens
    const accessToken = user.genrateAccessToken();
    const refreshToken = user.genrateRefreshToken();

    // Save the refresh token to the user document
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // Return the generated tokens
    return { accessToken, refreshToken };
  } catch (error) {
    // Handle any errors during token generation
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token"
    );
  }
};

// Registration handler using asyncHandler
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

// Login handler using asyncHandler
const loginUser = asyncHandler(async (req, res) => {
  // Get data from the request body
  const { email, username, password } = req.body;

  // Check if either username or email is provided
  if (!username && !email) {
    throw new ApiError(403, "Username or email is required");
  }

  // Find user by username or email
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  // Check if the user exists
  if (!user) {
    throw new ApiError(403, "User does not exist");
  }

  // Check if the provided password is valid
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  // Generate access and refresh tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // Retrieve the logged-in user as a plain JavaScript object
  const loggedInUser = await User.findOne({ _id: user._id }).lean();

  // Remove sensitive fields
  delete loggedInUser.password;
  delete loggedInUser.refreshToken;

  const option = {
    httpOnly: true,
    secure: true,
  };

  // Send cookies and return the response
  return res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json({
      status: 200,
      data: { user: loggedInUser, accessToken, refreshToken },
      message: "User logged in successfully",
      success: true,
    });
});

// Logout handler using asyncHandler
const logoutUser = asyncHandler(async (req, res) => {
  // Update the user document to remove the refresh token
  await User.findByIdAndUpdate(req.user._id, {
    $set: {
      refreshToken: undefined,
    },
  });

  const option = {
    httpOnly: true,
    secure: true,
  };

  // Clear cookies and return the response
  return res
    .status(200)
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "invald refresh token ");
    }
    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "refresh token is already used or expired");
    }

    const option = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, option)
      .cookie("refreshToken", newRefreshToken, option)
      .json({
        status: 200,
        data: { accessToken, newRefreshToken },
        message: "accessToken Refreshed  successfully",
        success: true,
      });
  } catch (error) {
    throw new ApiError(201, error?.message || "invalid refresh token");
  }
});

// Export registration, login, and logout handlers
export { registerUser, loginUser, logoutUser, refreshAccessToken };
