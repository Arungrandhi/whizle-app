const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Uploads a base64 media file (image or audio) to Cloudinary.
 * @param {string} base64Data The base64 file data string (e.g. data:image/png;base64,... or raw base64)
 * @param {string} folder The subfolder name inside Cloudinary.
 * @param {string} [resourceType='auto'] The resource type ('image', 'video', 'raw', 'auto').
 * @returns {Promise<string>} The secure URL of the uploaded asset.
 */
const uploadToCloudinary = async (base64Data, folder, resourceType = 'auto') => {
  try {
    if (!base64Data) return '';
    
    // If it's already a URL, return it as is (useful for re-runs or updates)
    if (base64Data.startsWith('http://') || base64Data.startsWith('https://')) {
      return base64Data;
    }

    // Cloudinary supports direct uploading of base64 data URLs.
    // If the base64Data does not have the prefix data:[type];base64,
    // we could prepend it, but usually standard browser base64 has it.
    const result = await cloudinary.uploader.upload(base64Data, {
      folder: `whistleapp/${folder}`,
      resource_type: resourceType
    });
    
    return result.secure_url;
  } catch (error) {
    console.error(`Error uploading to Cloudinary (${folder}):`, error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadToCloudinary
};
