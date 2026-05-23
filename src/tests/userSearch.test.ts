import mongoose from "mongoose";
import request from "supertest";
import connectDB from "../config/database";
import app from "../index";
import User from "../models/User";

const testUser = {
    name: "Floyd Search Test",
    email: "floyd-search-test@interesthub.io",
    password: "securePass123",
};

beforeAll(async () => {
    await connectDB();
    await User.deleteOne({ email: testUser.email });
    await User.create({
        name: testUser.name,
        email: testUser.email,
        password: "hashed-password",
        profilePic: "",
    });
});

afterAll(async () => {
    await User.deleteOne({ email: testUser.email });
    await mongoose.disconnect();
});

describe("User search API", () => {
    it("should accept the frontend q query parameter", async () => {
        const res = await request(app).get("/api/users/search?q=Floyd");

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.some((user: { email?: string; name: string }) => user.name === testUser.name)).toBe(true);
    });
});
