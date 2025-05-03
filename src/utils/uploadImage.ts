import { v2 as cloudinary } from "cloudinary";
import sharp from "sharp";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
) {
    throw new Error(
        "Cloudinary configuration is missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your environment variables."
    );
}

export const uploadImageToCloudinary = async (
    base64: string,
    folder: string
): Promise<string> => {
    try {
        // Remove base64 header if present
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
        console.error("❌ Failed to upload image to Cloudinary:", error);
        throw new Error("Image upload failed");
    }
};
