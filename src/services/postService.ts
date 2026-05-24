import Comment from "../models/Comment";
import Post, { IPost, Visibility } from "../models/Post";

import { uploadImageToCloudinary } from "../utils/uploadImage";

type CreatePostData = Pick<IPost, "title" | "content" | "category" | "author"> & {
  image: string;
  tags?: string[];
  visibility?: Visibility;
};

type UpdatePostData = Partial<
  Pick<IPost, "title" | "content" | "category" | "tags" | "visibility">
> & {
  image?: string;
};

export interface AdvancedPostSearchFilters {
  category?: string;
  title?: string;
  content?: string;
  tags?: string[];
}

const normalizeTags = (tags: string[] = []): string[] => [
  ...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean)),
];

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const createPostService = async (postData: CreatePostData) => {
  if (!postData.image) throw new Error("Image is required");

  const cloudinaryUrl = await uploadImageToCloudinary(postData.image, "post_images");

  return await Post.create({
    title: postData.title,
    content: postData.content,
    category: postData.category,
    tags: normalizeTags(postData.tags),
    visibility: postData.visibility,
    author: postData.author,
    image: cloudinaryUrl,
  });
};

export const getAllPostsService = async () => {
  return Post.find({ visibility: "public" }).populate("author", "name profilePic");
};

export const searchPostsService = async (query: string) => {
  const filters: Record<string, unknown> = { visibility: "public" };
  const trimmedQuery = query.trim();

  if (trimmedQuery) {
    const searchTerm = new RegExp(escapeRegExp(trimmedQuery), "i");
    filters.$or = [
      { title: searchTerm },
      { content: searchTerm },
      { category: searchTerm },
      { tags: searchTerm },
    ];
  }

  return Post.find(filters).populate("author", "name profilePic");
};

export const advancedSearchPostsService = async ({
  category,
  title,
  content,
  tags,
}: AdvancedPostSearchFilters) => {
  const filters: Record<string, unknown> = { visibility: "public" };
  const trimmedCategory = category?.trim();
  const trimmedTitle = title?.trim();
  const trimmedContent = content?.trim();

  if (trimmedCategory) {
    filters.category = new RegExp(escapeRegExp(trimmedCategory), "i");
  }

  if (trimmedTitle) {
    filters.title = new RegExp(escapeRegExp(trimmedTitle), "i");
  }

  if (trimmedContent) {
    filters.content = new RegExp(escapeRegExp(trimmedContent), "i");
  }

  const normalizedTags = normalizeTags(tags);
  if (normalizedTags.length > 0) {
    filters.tags = {
      $all: normalizedTags.map((tag) => new RegExp(escapeRegExp(tag), "i")),
    };
  }

  return Post.find(filters).populate("author", "name profilePic");
};

export const getPostByIdService = async (id: string) => {
  const post = await Post.findOne({ _id: id, visibility: "public" })
    .populate("author", "name profilePic")
    .populate({
      path: "comments",
      model: "Comment",
      populate: [
        {
          path: "user",
          select: "name profilePic",
        },
        {
          path: "replies.user",
          select: "name profilePic",
        },
      ],
    });

  if (post) {
    post.viewCount += 1;
    await post.save();
  }

  return post;
};

export const updatePostService = async (id: string, userId: string, updates: UpdatePostData) => {
  const post = await Post.findById(id);
  if (!post) return null;
  if (post.author.toString() !== userId) return false;

  if (updates.image) {
    const cloudinaryUrl = await uploadImageToCloudinary(updates.image, "post_images");
    updates.image = cloudinaryUrl;
  }

  const allowedUpdates: UpdatePostData = {
    ...(typeof updates.title === "string" && { title: updates.title }),
    ...(typeof updates.content === "string" && { content: updates.content }),
    ...(typeof updates.category === "string" && { category: updates.category }),
    ...(Array.isArray(updates.tags) && { tags: normalizeTags(updates.tags) }),
    ...(updates.visibility && { visibility: updates.visibility }),
    ...(updates.image && { image: updates.image }),
  };

  Object.assign(post, allowedUpdates, { isEdited: true });
  await post.save();
  return post;
};

export const deletePostService = async (id: string, userId: string) => {
  const post = await Post.findById(id);
  if (!post) return null;
  if (post.author.toString() !== userId) return false;

  await post.deleteOne();
  await Comment.deleteMany({ post: id });
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
  const post = await Post.findByIdAndUpdate(postId, { $pull: { likes: userId } }, { new: true });
  return post;
};
