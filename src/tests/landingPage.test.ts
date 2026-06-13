import request from "supertest";
import app from "../index";

describe("landing page", () => {
  it("serves a helpful API landing page at root", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.text).toContain("InterestHub API");
    expect(response.text).toContain("href=\"/api-docs\"");
    expect(response.text).toContain("Go to API Docs");
  });
});
