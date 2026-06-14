const mockConfig = jest.fn();
const mockUploadStream = jest.fn(
  (_options: unknown, callback: (error: null, result: { secure_url: string }) => void) => {
    callback(null, { secure_url: "https://images.example.test/post.jpg" });
    return { end: jest.fn() };
  }
);

jest.mock("cloudinary", () => ({
  v2: {
    config: mockConfig,
    uploader: { upload_stream: mockUploadStream },
  },
}));

jest.mock("sharp", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    toFormat: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from("image")),
  })),
}));

import { uploadImageToCloudinary } from "../utils/uploadImage";

describe("uploadImageToCloudinary", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      CLOUDINARY_CLOUD_NAME: "interest-hub",
      CLOUDINARY_API_KEY: "api-key",
      CLOUDINARY_API_SECRET: "api-secret",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("configures Cloudinary from environment values available when uploading", async () => {
    const url = await uploadImageToCloudinary("data:image/png;base64,YWJj", "post_images");

    expect(mockConfig).toHaveBeenCalledWith({
      cloud_name: "interest-hub",
      api_key: "api-key",
      api_secret: "api-secret",
    });
    expect(mockUploadStream).toHaveBeenCalledWith(
      { folder: "post_images", resource_type: "image" },
      expect.any(Function)
    );
    expect(url).toBe("https://images.example.test/post.jpg");
  });

  it("returns remote image URLs without re-uploading", async () => {
    const url = await uploadImageToCloudinary(
      "https://images.example.test/existing-post.jpg",
      "post_images"
    );

    expect(url).toBe("https://images.example.test/existing-post.jpg");
    expect(mockConfig).not.toHaveBeenCalled();
    expect(mockUploadStream).not.toHaveBeenCalled();
  });
});
