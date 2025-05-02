import "../models/Comment";

import Post, { IPost } from "../models/Post";

import { uploadImageToCloudinary } from "../utils/uploadImage";

export const createPostService = async (postData: Partial<IPost>) => {
    if (postData.image) {
        const cloudinaryUrl = await uploadImageToCloudinary(postData.image, "post_images");
        postData.image.url = cloudinaryUrl;
        postData.image.file = null;
    }

    return await Post.create(postData);
};

export const getAllPostsService = async () => {
    return await Post.find()
        .populate("author", "name profilePic");
};

export const getPostByIdService = async (id: string) => {
    const post = await Post.findById(id)
        .populate("author", "name profilePic")
        .populate({
            path: "comments",
            populate: {
                path: "user",
                select: "name profilePic"
            }
        });

    if (post) {
        post.viewCount += 1;
        await post.save();
    }

    return post;
};

export const updatePostService = async (id: string, userId: string, updates: Partial<IPost>) => {
    const post = await Post.findById(id);
    if (!post) return null;
    if (post.author.toString() !== userId) return false;

    if (updates.image) {
        const cloudinaryUrl = await uploadImageToCloudinary(updates.image, "post_images");
        updates.image.url = cloudinaryUrl;
        updates.image.file = null;
    }

    Object.assign(post, updates, { isEdited: true });
    await post.save();
    return post;
};

export const deletePostService = async (id: string, userId: string) => {
    const post = await Post.findById(id);
    if (!post) return null;
    if (post.author.toString() !== userId) return false;

    await post.deleteOne();
    return true;
};

export const likePostService = async (postId: string, userId: string) => {
    const post = await Post.findByIdAndUpdate(
        postId,
        { $addToSet: { likes: userId } },
        { new: true }
    );
    return post;
};

export const unlikePostService = async (postId: string, userId: string) => {
    const post = await Post.findByIdAndUpdate(
        postId,
        { $pull: { likes: userId } },
        { new: true }
    );
    return post;
};
