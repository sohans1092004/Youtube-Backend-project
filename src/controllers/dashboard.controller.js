import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
    const channel_id = req.user?.id;

    if (!channel_id) {
        throw new ApiError(401, "Unauthorized access — User not logged in");
    }

    let videos;
    try {
        videos = await Video.find({ owner: new mongoose.Types.ObjectId(channel_id) });
    } catch (error) {
        throw new ApiError(500, "Internal Server Error — Error fetching videos");
    }

    const total_videos = videos.length;
    let likes = 0;
    let views = 0;

    for (let i = 0; i < videos.length; i++) {
        likes += videos[i].likes || 0;
        views += videos[i].views || 0;
    }

    let subscribers;
    try {
        subscribers = await Subscription.aggregate([
            {
                $match: {
                    channel: new mongoose.Types.ObjectId(channel_id),
                },
            },
        ]);
    } catch (error) {
        throw new ApiError(500, "Internal Server Error — Error fetching subscriptions");
    }

    const total_subscribers = subscribers.length;

    return res.status(200).json(
        new ApiResponse(200, {
            total_videos,
            total_likes: likes,
            total_views: views,
            total_subscribers,
        }, "Channel stats fetched successfully")
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
    const user_id = req.user?._id;

    if (!user_id) {
        throw new ApiError(401, "Unauthorized access — User not logged in");
    }

    let videos;
    try {
        videos = await Video.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(user_id),
                },
            },
            {
                $lookup: {
                    from: "likes",
                    localField: "_id",
                    foreignField: "video",
                    as: "likes",
                },
            },
            {
                $project: {
                    videoFile: 1,
                    thumbnail: 1,
                    title: 1,
                    isPublished: 1,
                    createdAt: 1,
                    owner: 1,
                    description: 1,
                    likes: { $size: "$likes" },
                },
            },
            {
                $group: {
                    _id: null,
                    totalLikes: { $sum: "$likes" },
                    videos: {
                        $push: {
                            _id: "$_id",
                            videoFile: "$videoFile",
                            thumbnail: "$thumbnail",
                            title: "$title",
                            isPublished: "$isPublished",
                            createdAt: "$createdAt",
                            owner: "$owner",
                            likes: "$likes",
                            description: "$description",
                        },
                    },
                },
            },
        ]);
    } catch (error) {
        throw new ApiError(500, "Internal Server Error — Error fetching videos");
    }

    if (!videos || videos.length === 0) {
        throw new ApiError(404, "No videos uploaded");
    }

    return res.status(200).json(
        new ApiResponse(200, videos[0], "Videos fetched successfully")
    );
});

export {
    getChannelStats,
    getChannelVideos
};
