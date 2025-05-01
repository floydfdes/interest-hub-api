import { v2 as cloudinary } from "cloudinary";
import sharp from "sharp";
import { Readable } from "stream";

// Configure Cloudinary directly in this file
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary configuration is missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your environment variables.");
}

export const uploadImageToCloudinary = async (image: any, folder: string): Promise<string> => {
    try {
        console.log(image);

        // Check if the image is a URL
        if (image.type === "url") {
            // Upload the URL directly to Cloudinary
            const result = await cloudinary.uploader.upload(image.file, { folder });
            return result.secure_url;
        }

        // Decode Base64 image
        const buffer = Buffer.from(image.file, "base64");

        // Resize and validate the image using sharp
        const resizedBuffer = await sharp(buffer)
            .resize(800, 800, { fit: "inside" }) // Resize to max 800x800
            .toFormat("jpeg")
            .toBuffer();

        // Convert buffer to a readable stream for Cloudinary
        const stream = cloudinary.uploader.upload_stream({ folder, resource_type: "image" });

        const readableStream = new Readable();
        readableStream.push(resizedBuffer);
        readableStream.push(null);

        return new Promise((resolve, reject) => {
            readableStream.pipe(stream)
                .on("finish", (result: any) => resolve(result.secure_url))
                .on("error", (error: any) => reject(error));
        });
    } catch (error) {
        console.log(error);
        throw new Error("Failed to upload image to Cloudinary");
    }
};