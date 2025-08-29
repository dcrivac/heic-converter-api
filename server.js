require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
const { Storage } = require('@google-cloud/storage');

const app = express();
app.use(cors());

const storage = new Storage();
const bucket = storage.bucket(process.env.GCS_BUCKET);

const upload = multer({
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 15) * 1024 * 1024 },
  fileFilter: (_, file, cb) => cb(null, ['image/heic','image/heif'].includes(file.mimetype)),
});

app.post('/convert', upload.array('files', 10), async (req, res) => {
  try {
    const urls = await Promise.all(
      req.files.map(async file => {
        const jpeg = await sharp(file.buffer)
          .rotate()
          .toColourspace('srgb')
          .jpeg({ quality: 80, progressive: true })
          .toBuffer();

        const name = `${Date.now()}_${Math.random().toString(36).substr(2)}.jpg`;
        const gcsFile = bucket.file(name);
        await gcsFile.save(jpeg, { metadata:{contentType:'image/jpeg'} });
        const [url] = await gcsFile.getSignedUrl({
          action: 'read',
          expires: Date.now() + 24*60*60*1000,
        });
        return url;
      })
    );
    res.json({ urls });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Conversion failed' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 listening on ${PORT}`));
