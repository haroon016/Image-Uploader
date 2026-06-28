const fs = require('fs/promises');
const path = require('path');
const { ObjectId } = require('mongodb');
const { getCollection } = require('./mongo');

const uploadsDir = path.join(__dirname, '..', 'uploads');

async function ensureUploadsDir() {
  await fs.mkdir(uploadsDir, { recursive: true });
}

function toImageRecord(document) {
  if (!document) {
    return null;
  }

  return {
    id: document._id.toString(),
    name: document.name,
    filename: document.filename,
    originalName: document.originalName,
    mimeType: document.mimeType,
    size: document.size,
    imageUrl: document.imageUrl,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt
  };
}

async function listImages() {
  const collection = getCollection();
  const documents = await collection.find({}).sort({ createdAt: -1 }).toArray();
  return documents.map(toImageRecord);
}

async function getImageById(id) {
  const collection = getCollection();

  if (!ObjectId.isValid(id)) {
    return null;
  }

  const document = await collection.findOne({ _id: new ObjectId(id) });
  return toImageRecord(document);
}

async function createImage({ name, file }) {
  const collection = getCollection();
  const now = new Date().toISOString();
  const document = {
    name,
    filename: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    imageUrl: `/uploads/${file.filename}`,
    createdAt: now,
    updatedAt: now
  };

  const result = await collection.insertOne(document);
  return toImageRecord({ _id: result.insertedId, ...document });
}

async function updateImage(id, updates) {
  const collection = getCollection();

  if (!ObjectId.isValid(id)) {
    return null;
  }

  const _id = new ObjectId(id);
  const existing = await collection.findOne({ _id });

  if (!existing) {
    return null;
  }

  const nextDocument = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  delete nextDocument._id;

  await collection.updateOne({ _id }, { $set: nextDocument });
  return toImageRecord({ _id, ...nextDocument });
}

async function deleteImage(id) {
  const collection = getCollection();

  if (!ObjectId.isValid(id)) {
    return null;
  }

  const _id = new ObjectId(id);
  const document = await collection.findOne({ _id });

  if (!document) {
    return null;
  }

  await collection.deleteOne({ _id });
  return toImageRecord(document);
}

module.exports = {
  uploadsDir,
  ensureUploadsDir,
  listImages,
  getImageById,
  createImage,
  updateImage,
  deleteImage
};
