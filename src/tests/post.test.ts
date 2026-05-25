import request from "supertest";
import mongoose from "mongoose";
import connectDB from "../config/database";
import app from "../index";
import Post from "../models/Post";
import User from "../models/User";
jest.setTimeout(20000);
const API = "/api/posts";
const image =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

let token = "";
let createdPostId = "";

const testUser = {
  name: "Post Tester",
  email: "posttester@interesthub.io",
  password: "strongPass123",
};

beforeAll(async () => {
  await connectDB();
  await User.deleteOne({ email: testUser.email });

  await request(app).post("/api/auth/register").send(testUser);

  await new Promise((res) => setTimeout(res, 300));

  const loginRes = await request(app).post("/api/auth/login").send({
    email: testUser.email,
    password: testUser.password,
  });

  token = loginRes.body.token;
});

afterAll(async () => {
  await User.deleteOne({ email: testUser.email });
  await Post.deleteMany({ title: /Test Post/i });
  await mongoose.disconnect();
});

describe("Post API", () => {
  it("should create the first post", async () => {
    const res = await request(app).post(API).set("Authorization", `Bearer ${token}`).send({
      title: "Test Post 1",
      content: "First post content",
      image,
      category: "testing",
      visibility: "public",
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe("Test Post 1");
    createdPostId = res.body._id;
  });

  it("should create the second post", async () => {
    const res = await request(app).post(API).set("Authorization", `Bearer ${token}`).send({
      title: "Test Post 2",
      content: "Second post content",
      image,
      category: "testing",
      visibility: "private",
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe("Test Post 2");
  });

  it("should get all posts", async () => {
    const res = await request(app).get(API);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.pagination).toEqual(
      expect.objectContaining({ page: 1, limit: 20, total: expect.any(Number) })
    );
  });

  it("should get the first post by ID", async () => {
    const res = await request(app).get(`${API}/${createdPostId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body._id).toBe(createdPostId);
  });

  it("should update the first post", async () => {
    const res = await request(app)
      .put(`${API}/${createdPostId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Test Post 1 Updated",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe("Test Post 1 Updated");
  });

  it("should delete the first post", async () => {
    const res = await request(app)
      .delete(`${API}/${createdPostId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it("should fail to create post without token", async () => {
    const res = await request(app).post(API).send({
      title: "Unauthorized Post",
      content: "No token",
      image,
      category: "testing",
      visibility: "public",
    });
    expect(res.statusCode).toBe(401);
  });
});
