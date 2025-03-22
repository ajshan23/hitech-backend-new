import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_BUCKET_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Generate a unique file name for uploaded files
function generateUniqueFileName(file: Express.Multer.File) {
  const extension = path.extname(file.originalname);
  const filename = path.basename(file.originalname, extension);
  const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
  return `${filename}-${uniqueSuffix}${extension}`;
}

// Upload a single file to S3
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

// Upload a file to S3 and return the URL, key, and mimetype
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
  const fileUrl = `https://${process.env.AWS_BUCKET_NAME!}.s3.${process.env
    .AWS_BUCKET_REGION!}.amazonaws.com/${uniqueFileName!}`;

  // Return the URL, key, and mimetype
  return {
    url: fileUrl,
    key: uniqueFileName,
    mimetype: file.mimetype, // Include the mimetype here
  };
}

// Process an image file (resize and compress)
async function processImage(file: Express.Multer.File): Promise<Buffer> {
  return await sharp(file.buffer)
    .resize({ width: 500 })
    .jpeg({ quality: 90 })
    .toBuffer();
}

// Compress a PDF file
async function compressPDFBuffer(pdfBuffer: Buffer): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const compressedPDFBytes = await pdfDoc.save(); // Returns Uint8Array
    return Buffer.from(compressedPDFBytes); // Convert Uint8Array to Buffer
  } catch (error) {
    console.error("Error compressing PDF:", error);
    throw new Error("Failed to compress PDF");
  }
}

// Handle multiple file uploads
export async function handleMultipleFileUploads(
  req: Express.Request,
  files: Express.Multer.File[]
) {
  try {
    const uploadResults = await Promise.all(
      files.map(async (file) => {
        let processedFileBuffer: Buffer | undefined;

        // Check if the file is a PDF and compress it
        if (file.mimetype === "application/pdf") {
          processedFileBuffer = await compressPDFBuffer(file.buffer);
        }

        // If the file is an image, process it (resize, etc.)
        if (file.mimetype.startsWith("image/")) {
          processedFileBuffer = await processImage(file);
        }

        // Use the processed buffer (compressed PDF or resized image) or the original buffer
        const finalFileBuffer = processedFileBuffer || file.buffer;

        // Upload the file to S3
        const data = await uploadFileToS3({
          ...file,
          buffer: finalFileBuffer,
        });

        return data;
      })
    );

    return {
      success: true,
      message: "Files uploaded successfully",
      uploadData: uploadResults,
    };
  } catch (err) {
    console.error("Error uploading files:", err);
    return {
      success: false,
      message: "File upload failed",
    };
  }
}

// Delete a file from S3
export async function deleteFileFromS3(key: string): Promise<void> {
  try {
    const deleteParams = {
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key,
    };

    const command = new DeleteObjectCommand(deleteParams);
    await s3.send(command);

    console.log(`File deleted successfully: ${key}`);
  } catch (err) {
    console.error(`Error deleting file from S3: ${err}`);
    throw new Error("Failed to delete file from S3");
  }
}
