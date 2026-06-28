const { MongoClient } = require('mongodb');

let client;
let collection;

function buildDbName() {
  return process.env.DB_NAME || 'image_uploader';
}

function buildCollectionName() {
  return process.env.COLLECTION_NAME || 'images';
}

async function connectToDb() {
  if (collection) {
    return collection;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is missing. Put it in server/.env');
  }

  client = new MongoClient(uri);
  await client.connect();
  collection = client.db(buildDbName()).collection(buildCollectionName());
  return collection;
}

function getCollection() {
  if (!collection) {
    throw new Error('MongoDB is not connected yet');
  }

  return collection;
}

async function closeDb() {
  if (client) {
    await client.close();
    client = undefined;
    collection = undefined;
  }
}

module.exports = {
  connectToDb,
  getCollection,
  closeDb
};
