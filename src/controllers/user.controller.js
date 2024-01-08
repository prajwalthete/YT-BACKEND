import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

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
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this remove the field from document
      },
    },
    {
      new: true,
    }
  );

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

// Middleware to refresh the access token using a valid refresh token
const refreshAccessToken = asyncHandler(async (req, res) => {
  // Get the incoming refresh token from cookies or request body
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  // Check if a refresh token is provided
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    // Verify the incoming refresh token
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // Find the user associated with the refresh token
    const user = await User.findById(decodedToken?._id);

    // Check if the user exists
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    // Check if the incoming refresh token matches the user's refresh token
    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh token is already used or expired");
    }

    // Set options for the new access and refresh tokens
    const option = {
      httpOnly: true,
      secure: true,
    };

    // Generate new access and refresh tokens
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    // Return the response with new tokens and success message
    return res
      .status(200)
      .cookie("accessToken", accessToken, option)
      .cookie("refreshToken", newRefreshToken, option)
      .json({
        status: 200,
        data: { accessToken, newRefreshToken },
        message: "Access token refreshed successfully",
        success: true,
      });
  } catch (error) {
    // Handle token verification errors
    throw new ApiError(201, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "password updated successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;
  if (!fullname || !email) throw new ApiError(404, " All fields are required");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname: fullname,
        email: email,
      },
    },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account Details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar file is missing");
  }

  // TODO - Delete the old avatar file Assignment

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "error while uploading on avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { avatar: avatar.url },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "coverImage  is missing");
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(400, "error while uploading on coverImage");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { coverImage: coverImage.url },
    },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "coverImageupdated successfully"));
});

// Define an asynchronous route handler using asyncHandler middleware
const getUserChannelProfile = asyncHandler(async (req, res) => {
  // Extract the 'username' parameter from the request parameters
  const { username } = req.params;

  // Check if 'username' is missing or empty, and throw a 404 error if true
  if (!username?.trim()) throw new ApiError(404, "username is missing");

  // Use the MongoDB Aggregation Framework to fetch user channel data
  const channel = await User.aggregate([
    {
      // Stage 1: Match documents where the 'username' matches (case-insensitive)
      $match: { username: username?.toLowerCase() },
    },
    {
      // Stage 2: Perform a lookup to get the list of subscribers for the user's channel
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      // Stage 3: Perform a lookup to get the list of channels the user is subscribed to
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      // Stage 4: Add new fields to the document, including counts and subscription status
      $addFields: {
        // Count the number of subscribers for the user's channel
        subscribersCount: {
          $size: "$subscribers",
        },
        // Count the number of channels the user is subscribed to
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        // Check if the requesting user is subscribed to the channel
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      // Stage 5: Project only the desired fields for the response
      $project: {
        fullname: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  // Check if the channel data is not found, and throw a 404 error if true
  if (!channel?.length) throw new ApiError(404, "channel not found");

  // Respond with a JSON containing the channel data and success message
  return res
    .status(200)
    .json(new ApiResponse(channel[0], "user channel fetched successfully"));
});

/*
// from sirs video
const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "watchHistory fetched successfully "
      )
    );
});
*/

const getWatchHistory = asyncHandler(async (req, res) => {
  //you are using new mongoose.Types.ObjectId(),in previus method  which creates a new, empty ObjectId.
  //To fix this, you should use the actual user ID for the match stage. Assuming you want to fetch the watch history
  //for the currently authenticated user (req.user._id), you can modify the $match stage as follows:

  const user = await User.aggregate([
    {
      $match: {
        _id: req.user._id, // Use the actual user ID here
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "watchHistory fetched successfully "
      )
    );
});

// Export registration, login, and logout handlers
export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
