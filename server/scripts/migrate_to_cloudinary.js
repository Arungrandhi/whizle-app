require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Business = require('../models/Business');
const Ad = require('../models/Ad');
const Ringtone = require('../models/Ringtone');
const { uploadToCloudinary } = require('../config/cloudinary');

const migrate = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Database connected.');

    // 1. Migrate Businesses (logo, backgroundImage)
    console.log('Checking Businesses for base64 media...');
    const businesses = await Business.find();
    console.log(`Found ${businesses.length} business documents.`);
    let businessCount = 0;
    for (const biz of businesses) {
      let updated = false;
      if (biz.logo && (biz.logo.startsWith('data:') || biz.logo.length > 500)) {
        console.log(`Uploading logo for business: ${biz.name} (${biz._id})...`);
        biz.logo = await uploadToCloudinary(biz.logo, 'logos');
        updated = true;
      }
      if (biz.backgroundImage && (biz.backgroundImage.startsWith('data:') || biz.backgroundImage.length > 500)) {
        console.log(`Uploading backgroundImage for business: ${biz.name} (${biz._id})...`);
        biz.backgroundImage = await uploadToCloudinary(biz.backgroundImage, 'backgrounds');
        updated = true;
      }
      if (updated) {
        await biz.save();
        businessCount++;
        console.log(`Business ${biz.name} updated with Cloudinary URLs.`);
      }
    }
    console.log(`Updated ${businessCount} business profiles.`);

    // 2. Migrate Ads (file)
    console.log('Checking Ads for base64 media...');
    const ads = await Ad.find();
    console.log(`Found ${ads.length} ad documents.`);
    let adCount = 0;
    for (const ad of ads) {
      if (ad.file && (ad.file.startsWith('data:') || ad.file.length > 500)) {
        console.log(`Uploading file for ad campaign: ${ad.name} (${ad._id})...`);
        ad.file = await uploadToCloudinary(ad.file, 'ads');
        await ad.save();
        adCount++;
        console.log(`Ad ${ad.name} updated with Cloudinary URL.`);
      }
    }
    console.log(`Updated ${adCount} ads.`);

    // 3. Migrate Ringtones (file)
    console.log('Checking Ringtones for base64 media...');
    const ringtones = await Ringtone.find();
    console.log(`Found ${ringtones.length} ringtone documents.`);
    let ringtoneCount = 0;
    for (const rt of ringtones) {
      if (rt.file && (rt.file.startsWith('data:') || rt.file.length > 500)) {
        console.log(`Uploading audio for ringtone: ${rt.name} (${rt._id})...`);
        rt.file = await uploadToCloudinary(rt.file, 'ringtones', 'video');
        await rt.save();
        ringtoneCount++;
        console.log(`Ringtone ${rt.name} updated with Cloudinary URL.`);
      }
    }
    console.log(`Updated ${ringtoneCount} ringtones.`);

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
