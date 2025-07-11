import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    let comments;
    try {
        comments = await Comment.aggregate([
            {
                $match: {
                    video: new mongoose.Types.ObjectId(videoId),
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "details",
                    pipeline: [
                        {
                            $project: {
                                fullname: 1,
                                avatar: 1,
                                username: 1,
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: "likes",
                    localField: "_id",
                    foreignField: "comment",
                    as: "likes",
                },
            },
            {
                $addFields: {
                    details: { $first: "$details" },
                    likes: { $size: "$likes" },
                },
            },
            {
                $sort: { createdAt: -1 } // Optional: newest first
            },
            {
                $skip: (page - 1) * parseInt(limit),
            },
            {
                $limit: parseInt(limit),
            },
        ]);
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while fetching Comments !!"
        );
    }

    if (comments.length === 0) {
        return res
            .status(200)
            .json(new ApiResponse(200, [], "No Comments Found"));
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, comments, "Comments fetched successfully!")
        );
});


const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    
    //obtain all required fields from the request body
    //check if any of the required fields are missing
    //check if the correspondin video exists
    //if all are satified 
    //obtain the user from req.user
    //then use create of dbms
    //return the comment back to log

    const {videoId} = req.params;
    const {content} = req.body();
    const {owner} = req.user?._id;

    if(!content || !isValidObjectId(videoId))
        throw new ApiError(401,"Some of the comment details are missing");

    const newComment = await Comment.create({
        content,
        owner,
        video:videoId
    });

    if(!newComment)
        throw new ApiError(504,"Some issue with comment creation");

    res.status(200).json(new ApiResponse(200,comment,"Comment successfully added"))

})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment

    //Get content from req.body
    //shud also get comment id
    //get user and videoid from params and middleware
    //just update it
    const {comment_id} = req.params;
    const {content} = req.body;

    if(!content || content.trim().length()==0)
        throw new ApiError(404,"content not available");

    if (!comment_id) {
      throw new ApiError(400, "comment Id not provided");
    }
     
    const existingContent = Comment.findByID(comment_id).content;
    if(content === existingContent)
        throw new ApiError(404,"Same content as before");

    const comment = await Comment.findByIdAndUpdate(comment_id , 
    {
        $set:{
            content
        }
    },{new:true})

    if(!comment)
        throw new ApiError(401,"Some issue while updating comment");

    res.status(200).json(new ApiResponse(200,"Successfully updated comment"));
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {comment_id} = req.params;
    if (!comment_id) {
        throw new ApiError(400, "comment Id not provided");
        }

    const comment = await Comment.findByIdAndDelete(comment_id);

    if (!comment) throw new ApiError(500, "Error while deleting comment");
    
    const deleteLikes = await Like.deleteMany({
        comment: new mongoose.Types.ObjectId(comment_id),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, { isDeleted: true }, "Comment deleted successfully")
    );
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }