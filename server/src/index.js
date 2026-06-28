const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
require('dotenv').config();
const {
  uploadsDir,
  ensureUploadsDir,
  listImages,
  getImageById,
  createImage,
  updateImage,
  deleteImage
} = require('./store');
const { connectToDb } = require('./mongo');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await ensureUploadsDir();
      cb(null, uploadsDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const safeBase = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeBase}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

function validateName(name) {
  return typeof name === 'string' && name.trim().length > 0;
}

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/images', async (req, res, next) => {
  try {
    const { name } = req.query;
    let images = await listImages();

    if (typeof name === 'string' && name.trim()) {
      const needle = name.trim().toLowerCase();
      images = images.filter((image) => image.name.toLowerCase().includes(needle));
    }

    res.json(images);
  } catch (error) {
    next(error);
  }
});

app.get('/api/images/:id', async (req, res, next) => {
  try {
    const image = await getImageById(req.params.id);

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    res.json(image);
  } catch (error) {
    next(error);
  }
});

app.post('/api/images', upload.single('image'), async (req, res, next) => {
  try {
    if (!validateName(req.body.name)) {
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      return res.status(400).json({ message: 'Name is required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    const record = await createImage({
      name: req.body.name.trim(),
      file: req.file
    });

    res.status(201).json(record);
  } catch (error) {
    next(error);
  }
});

app.put('/api/images/:id', upload.single('image'), async (req, res, next) => {
  try {
    const existing = await getImageById(req.params.id);

    if (!existing) {
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      return res.status(404).json({ message: 'Image not found' });
    }

    const nextName = validateName(req.body.name) ? req.body.name.trim() : existing.name;
    let nextRecord = { name: nextName };

    if (req.file) {
      await fs.unlink(path.join(uploadsDir, existing.filename)).catch(() => {});
      nextRecord = {
        ...nextRecord,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        imageUrl: `/uploads/${req.file.filename}`
      };
    }

    const updated = await updateImage(req.params.id, nextRecord);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/images/:id', async (req, res, next) => {
  try {
    const removed = await deleteImage(req.params.id);

    if (!removed) {
      return res.status(404).json({ message: 'Image not found' });
    }

    await fs.unlink(path.join(uploadsDir, removed.filename)).catch(() => {});
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: 'Something went wrong' });
});

async function start() {
  await ensureUploadsDir();
  await connectToDb();
  app.listen(port, '127.0.0.1', () => {
    console.log(`Server running on http://127.0.0.1:${port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
