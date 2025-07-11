import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = req.query;

    if (!userId) {
        throw new ApiError(400, "userIds is required");
    }

    const existedUser = await User.findById(userId);
    if (!existedUser) {
        throw new ApiError(404, "User not found");
    }

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "owner",
                as: "videos",
            },
        },
        {
            $unwind: "$videos",
        },
        {
            $match: {
                ...(query && { "videos.title": { $regex: query, $options: "i" } }),
            },
        },
        {
            $sort: {
                [`videos.${sortBy}`]: sortType === "asc" ? 1 : -1,
            },
        },
        {
            $skip: (pageNumber - 1) * limitNumber,
        },
        {
            $limit: limitNumber,
        },
        {
            $group: {
                _id: "$_id",
                videos: { $push: "$videos" },
            },
        },
    ]);

    if (!user.length) {
        throw new ApiError(404, "No videos found");
    }

    const videos = user[0].videos;

    return res.status(200).json(
        new ApiResponse(200, {
            currentPage: pageNumber,
            totalVideos: videos.length,
            videos,
        }, "Videos fetched successfully")
    );
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if ([title, description].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "Title and description are required");
    }

    if (!req.files?.videoFile || !req.files?.thumbnail) {
        throw new ApiError(400, "Video file and thumbnail are required");
    }

    let videoFileUrl;
    if (req.files && Array.isArray(req.files.videoFile) && req.files.videoFile.length > 0) {
        videoFileUrl = req.files.videoFile[0].path;
    }

    if (!videoFileUrl) {
        throw new ApiError(400, "Video file is required");
    }

    let thumbnailUrl;
    if (req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0) {
        thumbnailUrl = req.files.thumbnail[0].path;
    }
    if (!thumbnailUrl) {
        throw new ApiError(400, "Thumbnail is required");
    }

    const videoFileUploadResult = await uploadOnCloudinary(videoFileUrl);
    const thumbnailUploadResult = await uploadOnCloudinary(thumbnailUrl);

    if (!videoFileUploadResult || !thumbnailUploadResult) {
        throw new ApiError(500, "Failed to upload video or thumbnail");
    }

    const video = await Video.create({
        title: title,
        description: description,
        videoFile: videoFileUploadResult.url,
        thumbnail: thumbnailUploadResult.url,
        owner: req.user._id,
        ispublished: true,
        duration: videoFileUploadResult.duration,
        views: 0,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId?.trim()) {
        throw new ApiError(400, "videoId is required");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId?.trim()) {
        throw new ApiError(400, "videoId is required");
    }

    const isVideoExisted = await Video.findById(videoId);
    if (!isVideoExisted) {
        throw new ApiError(404, "Video not found");
    }

    const { title, description } = req.body;

    if ([title, description].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "Title, description and thumbnail are required");
    }

    const thumbnailPath = req.file?.path;
    if (!thumbnailPath) {
        throw new ApiError(400, "Thumbnail is required");
    }

    const thumbnailUploadResult = await uploadOnCloudinary(thumbnailPath);
    if (!thumbnailUploadResult) {
        throw new ApiError(500, "Failed to upload thumbnail");
    }

    const video = await Video.findByIdAndUpdate(videoId,
        {
            title: title,
            description: description,
            thumbnail: thumbnailUploadResult.url,
        },
        {
            new: true,
        }
    );

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId?.trim()) {
        throw new ApiError(400, "videoId is required");
    }

    const isVideoExisted = await Video.findById(videoId);
    if (!isVideoExisted) {
        throw new ApiError(404, "Video not found");
    }

    const video = await Video.findByIdAndDelete(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId?.trim()) {
        throw new ApiError(400, "videoId is required");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    video.ispublished = !video.ispublished;
    await video.save();

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video publish status updated successfully"));
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};
