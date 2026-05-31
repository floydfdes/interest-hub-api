import mongoose from "mongoose";

const mockShareCreate = jest.fn();
const mockShareCountDocuments = jest.fn();
const mockSharePopulateTargetUser = jest.fn().mockResolvedValue([]);
const mockSharePopulatePost = jest.fn(() => ({ populate: mockSharePopulateTargetUser }));
const mockSharePopulateRecipient = jest.fn(() => ({ populate: mockSharePopulatePost }));
const mockSharePopulateSender = jest.fn(() => ({ populate: mockSharePopulateRecipient }));
const mockShareLimit = jest.fn(() => ({ populate: mockSharePopulateSender }));
const mockShareSkip = jest.fn(() => ({ limit: mockShareLimit }));
const mockShareSort = jest.fn(() => ({ skip: mockShareSkip }));
const mockShareFind = jest.fn(() => ({ sort: mockShareSort }));

const mockPostSelect = jest.fn();
const mockPostFindOne = jest.fn(() => ({ select: mockPostSelect }));

const mockUserFindOne = jest.fn();

const mockCreateNotification = jest.fn();

jest.mock("../models/Share", () => ({
  __esModule: true,
  default: {
    create: mockShareCreate,
    countDocuments: mockShareCountDocuments,
    find: mockShareFind,
  },
}));

jest.mock("../models/Post", () => ({
  __esModule: true,
  default: {
    findOne: mockPostFindOne,
  },
}));

jest.mock("../models/User", () => ({
  __esModule: true,
  default: {
    findOne: mockUserFindOne,
  },
}));

jest.mock("../services/notificationService", () => ({
  createNotification: mockCreateNotification,
}));

import {
  createShareService,
  getReceivedSharesService,
  getSentSharesService,
} from "../services/shareService";

describe("shareService", () => {
  const senderId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");
  const recipientId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012");
  const postId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439013");
  const profileId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439014");

  const createUser = (id: mongoose.Types.ObjectId, overrides = {}) => ({
    _id: id,
    blockedUsers: [],
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockShareCountDocuments.mockResolvedValue(2);
    mockSharePopulateTargetUser.mockResolvedValue([]);
    mockCreateNotification.mockResolvedValue({});
    mockShareCreate.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      populate: jest.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId() }),
    });
    mockUserFindOne.mockImplementation((filter: { _id?: string; followers?: string }) => {
      const select = jest.fn();
      if (filter.followers) {
        select.mockResolvedValue(null);
      } else if (filter._id === senderId.toString()) {
        select.mockResolvedValue(createUser(senderId));
      } else if (filter._id === recipientId.toString()) {
        select.mockResolvedValue(createUser(recipientId));
      } else if (filter._id === profileId.toString()) {
        select.mockResolvedValue({ _id: profileId });
      } else {
        select.mockResolvedValue(null);
      }

      return { select };
    });
  });

  it("does not allow sharing with yourself", async () => {
    await expect(
      createShareService({
        senderId: senderId.toString(),
        recipientId: senderId.toString(),
        targetType: "post",
        targetId: postId.toString(),
      })
    ).rejects.toThrow("Cannot share with yourself");
  });

  it("shares a public post and notifies the recipient", async () => {
    mockPostSelect.mockResolvedValueOnce({
      _id: postId,
      author: senderId,
      visibility: "public",
    });

    await createShareService({
      senderId: senderId.toString(),
      recipientId: recipientId.toString(),
      targetType: "post",
      targetId: postId.toString(),
      message: "Check this out",
    });

    expect(mockShareCreate).toHaveBeenCalledWith({
      sender: senderId,
      recipient: recipientId,
      targetType: "post",
      post: postId,
      message: "Check this out",
    });
    expect(mockCreateNotification).toHaveBeenCalledWith({
      recipientId: recipientId.toString(),
      actorId: senderId.toString(),
      type: "post_shared",
      postId,
      message: "Someone shared a post with you.",
    });
  });

  it("does not share a followers-only post with a non-follower recipient", async () => {
    mockPostSelect.mockResolvedValueOnce({
      _id: postId,
      author: senderId,
      visibility: "followersOnly",
    });
    await expect(
      createShareService({
        senderId: senderId.toString(),
        recipientId: recipientId.toString(),
        targetType: "post",
        targetId: postId.toString(),
      })
    ).rejects.toThrow("Recipient cannot view this post");
  });

  it("shares a profile and notifies the recipient", async () => {
    await createShareService({
      senderId: senderId.toString(),
      recipientId: recipientId.toString(),
      targetType: "profile",
      targetId: profileId.toString(),
    });

    expect(mockShareCreate).toHaveBeenCalledWith({
      sender: senderId,
      recipient: recipientId,
      targetType: "profile",
      targetUser: profileId,
    });
    expect(mockCreateNotification).toHaveBeenCalledWith({
      recipientId: recipientId.toString(),
      actorId: senderId.toString(),
      type: "profile_shared",
      targetUserId: profileId,
      message: "Someone shared a profile with you.",
    });
  });

  it("returns received shares with pagination", async () => {
    const result = await getReceivedSharesService(recipientId.toString(), {
      page: 1,
      limit: 20,
      skip: 0,
    });

    expect(mockShareFind).toHaveBeenCalledWith({ recipient: recipientId.toString() });
    expect(mockShareSort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(result.pagination.total).toBe(2);
  });

  it("returns sent shares with pagination", async () => {
    const result = await getSentSharesService(senderId.toString(), {
      page: 1,
      limit: 20,
      skip: 0,
    });

    expect(mockShareFind).toHaveBeenCalledWith({ sender: senderId.toString() });
    expect(result.pagination.total).toBe(2);
  });
});
