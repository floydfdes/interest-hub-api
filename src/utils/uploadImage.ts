import { v2 as cloudinary } from "cloudinary";
import sharp from "sharp";
import { logError } from "./logger";

const configureCloudinary = (): void => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary configuration is missing");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
};

const isRemoteImageUrl = (value: string): boolean => /^https?:\/\/\S+$/i.test(value.trim());

export const uploadImageToCloudinary = async (base64: string, folder: string): Promise<string> => {
  if (isRemoteImageUrl(base64)) {
    return base64.trim();
  }

  configureCloudinary();

  try {
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const resizedBuffer = await sharp(buffer)
      .resize(800, 800, { fit: "inside" })
      .toFormat("jpeg")
      .toBuffer();

    const uploadResult = await new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: "image" },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve(result.secure_url);
        }
      );

      stream.end(resizedBuffer);
    });

    return uploadResult;
  } catch (error) {
    logError("Cloudinary image upload failed", error, {
      folder,
    });
    throw new Error("Image upload failed", { cause: error });
  }
};
