import mongoose from "mongoose";

const likeSchema = new mongoose.Schema({
    video:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Video",
    },
    comment:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Comment",
    },
    tweet:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Tweet",
    },
    likedBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    }
},{timestamps:true})

export const like = mongoose.model("Like",likeSchema)