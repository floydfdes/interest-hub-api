import request from "supertest";
import app from "../index";

describe("Contact API", () => {
    it("should accept a valid contact submission", async () => {
        const res = await request(app).post("/api/contact").send({
            name: "Jane Doe",
            email: "jane@example.com",
            message: "I need help with my account.",
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toMatch(/contact/i);
    });

    it("should reject invalid contact submissions", async () => {
        const res = await request(app).post("/api/contact").send({
            name: "",
            email: "not-an-email",
            message: "short",
        });

        expect(res.statusCode).toBe(400);
        expect(Array.isArray(res.body.errors)).toBe(true);
    });
});
