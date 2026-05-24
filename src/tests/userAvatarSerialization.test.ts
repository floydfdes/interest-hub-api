import User from "../models/User";

describe("User avatar serialization", () => {
  it("returns null rather than an empty image source for legacy users", () => {
    const user = new User({
      name: "No Avatar",
      email: "no-avatar@interesthub.io",
      password: "password",
      profilePic: "",
    });

    expect(user.toJSON().profilePic).toBeNull();
  });

  it("defaults new users to a null image source", () => {
    const user = new User({
      name: "New User",
      email: "new-user@interesthub.io",
      password: "password",
    });

    expect(user.toJSON().profilePic).toBeNull();
  });
});
