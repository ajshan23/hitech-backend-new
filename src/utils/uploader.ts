import { S3Client } from "@aws-sdk/client-s3";
import path from "path";
import { Upload } from "@aws-sdk/lib-storage";
import sharp from "sharp";
import dotenv from "dotenv";

dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_BUCKET_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

function generateUniqueFileName(file: Express.Multer.File) {
  const extension = path.extname(file.originalname);
  const filename = path.basename(file.originalname, extension);
  const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
  return `${filename}-${uniqueSuffix}${extension}`;
}

async function uploadFileToS3(file: Express.Multer.File): Promise<any> {
  const uniqueFileName = generateUniqueFileName(file);
  const uploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: uniqueFileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  const upload = new Upload({
    client: s3,
    params: uploadParams,
  });

  await upload.done();
  console.log("upload...........mone:", upload);
  const fileUrl = `https://${process.env.AWS_BUCKET_NAME!}.s3.${process.env
    .AWS_BUCKET_REGION!}.amazonaws.com/${uniqueFileName!}`;
  const data = {
    url: fileUrl,
    key: uniqueFileName,
  };

  return data; // Returns the S3 key (filename)
}

async function processImage(file: Express.Multer.File): Promise<Buffer> {
  return await sharp(file.buffer)
    .resize({ width: 500 })
    .jpeg({ quality: 90 })
    .toBuffer();
}

export async function handleMultipleFileUploads(
  req: Express.Request,
  files: Express.Multer.File[]
) {
  try {
    const uploadResults = await Promise.all(
      files.map(async (file) => {
        let processedFileBuffer: Buffer | undefined;

        // Check if the file is an image and process it
        if (file.mimetype.startsWith("image/")) {
          processedFileBuffer = await processImage(file);
        }

        // If the file was processed (e.g., image resized), use the processed buffer
        const finalFileBuffer = processedFileBuffer || file.buffer;

        // Upload the file to S3
        const data = await uploadFileToS3({
          ...file,
          buffer: finalFileBuffer, // Use the final buffer (processed or original)
        });
        return data; // Return the S3 key (filename)
      })
    );

    return {
      success: true,
      message: "Files uploaded successfully",
      uploadData: uploadResults, // Return an array of file names (or URLs)
    };
  } catch (err) {
    console.error("Error uploading files:", err);
    return {
      success: false,
      message: "File upload failed",
    };
  }
}

export async function handleSingleFileUpload(
  req: Express.Request,
  file: Express.Multer.File
) {
  try {
    let processedFileBuffer: Buffer | undefined;

    // Check if the file is an image and process it
    if (file.mimetype.startsWith("image/")) {
      processedFileBuffer = await processImage(file);
    }

    // If the file was processed (e.g., image resized), use the processed buffer
    const finalFileBuffer = processedFileBuffer || file.buffer;

    // Upload the file to S3
    const uploadResult = await uploadFileToS3({
      ...file,
      buffer: finalFileBuffer, // Use the final buffer (processed or original)
    });

    return {
      success: true,
      message: "File uploaded successfully",
      uploadData: uploadResult, // Return the S3 key (or URL)
    };
  } catch (err) {
    console.error("Error uploading file:", err);
    return {
      success: false,
      message: "File upload failed",
    };
  }
}
