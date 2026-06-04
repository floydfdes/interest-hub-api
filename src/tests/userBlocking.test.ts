import mongoose from "mongoose";

const mockUserFindOne = jest.fn();
const mockUserFindSelect = jest.fn();
const mockUserFind = jest.fn(() => ({ select: mockUserFindSelect }));
const mockPostCountDocuments = jest.fn();
const mockPostFind = jest.fn();
const mockPostFindOnePopulate = jest.fn().mockResolvedValue(null);
const mockPostFindOneSort = jest.fn(() => ({ populate: mockPostFindOnePopulate }));
const mockPostFindOne = jest.fn(() => ({ sort: mockPostFindOneSort }));

jest.mock("../models/User", () => ({
  __esModule: true,
  default: {
    find: mockUserFind,
    findOne: mockUserFindOne,
  },
}));

jest.mock("../models/Post", () => ({
  __esModule: true,
  default: {
    countDocuments: mockPostCountDocuments,
    find: mockPostFind,
    findOne: mockPostFindOne,
  },
}));

jest.mock("../utils/uploadImage", () => ({
  uploadImageToCloudinary: jest.fn(),
}));

import {
  acceptFollowRequest,
  blockUser,
  followUser,
  getBlockedUsers,
  getFollowers,
  getMutedUsers,
  getUserById,
  getUserPosts,
  muteUser,
  unblockUser,
  unmuteUser,
} from "../services/userService";

const userId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");
const targetId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012");

const createUser = (id: mongoose.Types.ObjectId) => ({
  _id: id,
  followers: [] as mongoose.Types.ObjectId[],
  following: [] as mongoose.Types.ObjectId[],
  followRequests: [] as mongoose.Types.ObjectId[],
  blockedUsers: [] as mongoose.Types.ObjectId[],
  mutedUsers: [] as mongoose.Types.ObjectId[],
  isPrivate: false,
  savedPosts: [] as mongoose.Types.ObjectId[],
  save: jest.fn().mockResolvedValue(undefined),
});

describe("personal user muting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPostCountDocuments.mockResolvedValue(3);
    mockUserFindSelect.mockResolvedValue([]);
    mockPostFindOnePopulate.mockResolvedValue(null);
  });

  it("mutes a user without removing a follow relationship", async () => {
    const user = createUser(userId);
    const target = createUser(targetId);
    user.following = [targetId];
    target.followers = [userId];
    mockUserFindOne.mockResolvedValueOnce(user).mockResolvedValueOnce(target);

    await expect(muteUser(userId.toString(), targetId.toString())).resolves.toBe(true);

    expect(user.mutedUsers).toEqual([targetId]);
    expect(user.following).toEqual([targetId]);
    expect(target.followers).toEqual([userId]);
  });

  it("rejects muting yourself", async () => {
    await expect(muteUser(userId.toString(), userId.toString())).rejects.toThrow(
      "Cannot mute yourself"
    );
  });

  it("unmutes a user", async () => {
    const user = createUser(userId);
    const target = createUser(targetId);
    user.mutedUsers = [targetId];
    mockUserFindOne.mockResolvedValueOnce(user).mockResolvedValueOnce(target);

    await expect(unmuteUser(userId.toString(), targetId.toString())).resolves.toBe(true);
    expect(user.mutedUsers).toEqual([]);
  });

  it("returns the authenticated user's paginated muted list", async () => {
    const populate = jest.fn().mockResolvedValue(undefined);
    const select = jest.fn().mockResolvedValue({ mutedUsers: [targetId], populate });
    mockUserFindOne.mockReturnValueOnce({ select });

    const result = await getMutedUsers(userId.toString(), { page: 1, limit: 20, skip: 0 });

    expect(populate).toHaveBeenCalledWith({
      path: "mutedUsers",
      select: "name username profilePic",
      options: { skip: 0, limit: 20 },
    });
    expect(result?.pagination.total).toBe(1);
  });
});

describe("personal user blocking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks another user and removes follow relationships in both directions", async () => {
    const user = createUser(userId);
    const target = createUser(targetId);
    user.following = [targetId];
    user.followers = [targetId];
    target.following = [userId];
    target.followers = [userId];
    mockUserFindOne.mockResolvedValueOnce(user).mockResolvedValueOnce(target);

    await expect(blockUser(userId.toString(), targetId.toString())).resolves.toBe(true);

    expect(user.blockedUsers).toEqual([targetId]);
    expect(user.following).toEqual([]);
    expect(user.followers).toEqual([]);
    expect(target.following).toEqual([]);
    expect(target.followers).toEqual([]);
    expect(user.save).toHaveBeenCalled();
    expect(target.save).toHaveBeenCalled();
  });

  it("does not allow a user to block themselves", async () => {
    await expect(blockUser(userId.toString(), userId.toString())).rejects.toThrow(
      "Cannot block yourself"
    );
    expect(mockUserFindOne).not.toHaveBeenCalled();
  });

  it("does not allow following when either user has blocked the other", async () => {
    const user = createUser(userId);
    const target = createUser(targetId);
    target.blockedUsers = [userId];
    mockUserFindOne.mockResolvedValueOnce(user).mockResolvedValueOnce(target);

    await expect(followUser(userId.toString(), targetId.toString())).rejects.toThrow(
      "You cannot follow this user"
    );
  });

  it("rejects following yourself even when the ID casing differs", async () => {
    const user = createUser(userId);
    const target = createUser(userId);
    mockUserFindOne.mockResolvedValueOnce(user).mockResolvedValueOnce(target);

    await expect(followUser(userId.toString(), userId.toString().toUpperCase())).rejects.toThrow(
      "Cannot follow yourself"
    );
  });

  it("unblocks a user without restoring a follow relationship", async () => {
    const user = createUser(userId);
    const target = createUser(targetId);
    user.blockedUsers = [targetId];
    mockUserFindOne.mockResolvedValueOnce(user).mockResolvedValueOnce(target);

    await expect(unblockUser(userId.toString(), targetId.toString())).resolves.toBe(true);

    expect(user.blockedUsers).toEqual([]);
    expect(user.following).toEqual([]);
    expect(target.followers).toEqual([]);
  });

  it("returns the authenticated user's paginated block list", async () => {
    const populate = jest.fn().mockResolvedValue(undefined);
    const select = jest.fn().mockResolvedValue({ blockedUsers: [targetId], populate });
    mockUserFindOne.mockReturnValueOnce({ select });

    const result = await getBlockedUsers(userId.toString(), { page: 1, limit: 20, skip: 0 });

    expect(select).toHaveBeenCalledWith("blockedUsers");
    expect(populate).toHaveBeenCalledWith({
      path: "blockedUsers",
      select: "name username profilePic",
      options: { skip: 0, limit: 20 },
    });
    expect(result?.pagination.total).toBe(1);
  });
});

describe("private profiles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("turns a follow into a request for a private profile", async () => {
    const user = createUser(userId);
    const target = createUser(targetId);
    target.isPrivate = true;
    mockUserFindOne.mockResolvedValueOnce(user).mockResolvedValueOnce(target);

    await expect(followUser(userId.toString(), targetId.toString())).resolves.toBe("requested");
    expect(target.followRequests).toEqual([userId]);
    expect(target.followers).toEqual([]);
    expect(user.following).toEqual([]);
  });

  it("accepts a pending follow request", async () => {
    const target = createUser(targetId);
    const requester = createUser(userId);
    target.followRequests = [userId];
    mockUserFindOne.mockResolvedValueOnce(target).mockResolvedValueOnce(requester);

    await acceptFollowRequest(targetId.toString(), userId.toString());
    expect(target.followRequests).toEqual([]);
    expect(target.followers).toEqual([userId]);
    expect(requester.following).toEqual([targetId]);
  });

  it("returns a restricted private profile to an unapproved viewer", async () => {
    const target = {
      ...createUser(targetId),
      name: "Private User",
      profilePic: null,
      bio: "secret",
      interests: ["private-interest"],
      isPrivate: true,
    };
    const select = jest.fn().mockResolvedValue(target);
    mockUserFindOne
      .mockReturnValueOnce({ select })
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ following: [] }) });

    const profile = await getUserById(targetId.toString(), userId.toString());
    expect(profile).toEqual(
      expect.objectContaining({ isPrivate: true, canViewProfile: false, name: "Private User" })
    );
    expect(profile).not.toHaveProperty("bio");
    expect(profile).not.toHaveProperty("interests");
    expect(profile).not.toHaveProperty("postsCount");
    expect(mockPostCountDocuments).not.toHaveBeenCalled();
  });

  it("returns visible post count with an accessible profile", async () => {
    const target = {
      ...createUser(targetId),
      name: "Public User",
      profilePic: null,
      bio: "hello",
      interests: ["travel"],
    };
    const select = jest.fn().mockResolvedValue(target);
    mockUserFindOne
      .mockReturnValueOnce({ select })
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ following: [] }) });

    const profile = await getUserById(targetId.toString(), userId.toString());

    expect(profile).toEqual(expect.objectContaining({ canViewProfile: true, postsCount: 3 }));
    expect(mockPostCountDocuments).toHaveBeenCalledWith({
      author: targetId,
      isArchived: { $ne: true },
      isModerationHidden: { $ne: true },
      status: { $ne: "draft" },
      visibility: { $in: ["public"] },
    });
  });

  it("returns mutual followers and the pinned post for an accessible profile", async () => {
    const mutualFollowerId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439019");
    const target = {
      ...createUser(targetId),
      followers: [mutualFollowerId],
      name: "Public User",
      profilePic: null,
    };
    const viewer = { following: [mutualFollowerId] };
    const mutualFollower = {
      _id: mutualFollowerId,
      name: "Alex",
      username: "alex",
      profilePic: null,
    };
    const pinnedPost = {
      _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439020"),
      author: targetId,
      isPinned: true,
      likes: [],
      comments: [],
    };
    mockUserFindOne
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue(target) })
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue(viewer) });
    mockUserFindSelect.mockResolvedValueOnce([mutualFollower]);
    mockPostFindOnePopulate.mockResolvedValueOnce(pinnedPost);

    const profile = await getUserById(targetId.toString(), userId.toString());

    expect(profile).toEqual(
      expect.objectContaining({
        mutualFollowers: [mutualFollower],
        mutualFollowersCount: 1,
        pinnedPost: expect.objectContaining({ _id: pinnedPost._id, isPinned: true }),
      })
    );
    expect(mockPostFindOne).toHaveBeenCalledWith({
      author: targetId,
      isArchived: { $ne: true },
      isModerationHidden: { $ne: true },
      status: { $ne: "draft" },
      visibility: { $in: ["public"] },
      isPinned: true,
    });
  });

  it("returns public posts for an accessible public profile", async () => {
    const target = { ...createUser(targetId) };
    const select = jest.fn().mockResolvedValue(target);
    mockUserFindOne.mockReturnValueOnce({ select });
    const mockPostPopulate = jest.fn().mockResolvedValue([{ _id: new mongoose.Types.ObjectId() }]);
    const mockPostLimit = jest.fn(() => ({ populate: mockPostPopulate }));
    const mockPostSkip = jest.fn(() => ({ limit: mockPostLimit }));
    const mockPostSort = jest.fn(() => ({ skip: mockPostSkip }));
    mockPostFind.mockReturnValueOnce({ sort: mockPostSort });
    mockPostCountDocuments.mockResolvedValueOnce(1);

    const result = await getUserPosts(targetId.toString(), { page: 1, limit: 20, skip: 0 });

    expect(mockPostFind).toHaveBeenCalledWith({
      author: targetId,
      visibility: { $in: ["public"] },
      isArchived: { $ne: true },
      isModerationHidden: { $ne: true },
      status: { $ne: "draft" },
    });
    expect(result && result.pagination.total).toBe(1);
  });

  it("returns followers-only posts to followers", async () => {
    const target = { ...createUser(targetId), followers: [userId] };
    const select = jest.fn().mockResolvedValue(target);
    mockUserFindOne.mockReturnValueOnce({ select });
    const mockPostPopulate = jest.fn().mockResolvedValue([]);
    const mockPostLimit = jest.fn(() => ({ populate: mockPostPopulate }));
    const mockPostSkip = jest.fn(() => ({ limit: mockPostLimit }));
    const mockPostSort = jest.fn(() => ({ skip: mockPostSkip }));
    mockPostFind.mockReturnValueOnce({ sort: mockPostSort });
    mockPostCountDocuments.mockResolvedValueOnce(0);

    await getUserPosts(targetId.toString(), { page: 1, limit: 20, skip: 0 }, userId.toString());

    expect(mockPostFind).toHaveBeenCalledWith(
      expect.objectContaining({ visibility: { $in: ["public", "followersOnly"] } })
    );
  });

  it("does not expose posts for an inaccessible private profile", async () => {
    const target = { ...createUser(targetId), isPrivate: true };
    const select = jest.fn().mockResolvedValue(target);
    mockUserFindOne.mockReturnValueOnce({ select });

    await expect(
      getUserPosts(targetId.toString(), { page: 1, limit: 20, skip: 0 }, userId.toString())
    ).resolves.toBe(false);
  });

  it("does not expose a private profile follower list to a stranger", async () => {
    const target = { ...createUser(targetId), isPrivate: true, populate: jest.fn() };
    const select = jest.fn().mockResolvedValue(target);
    mockUserFindOne.mockReturnValueOnce({ select });

    await expect(
      getFollowers(targetId.toString(), { page: 1, limit: 20, skip: 0 }, userId.toString())
    ).resolves.toBe(false);
    expect(target.populate).not.toHaveBeenCalled();
  });
});
