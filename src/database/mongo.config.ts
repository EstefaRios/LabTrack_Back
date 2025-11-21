import { MongooseModuleOptions } from '@nestjs/mongoose';

export function buildMongoConfig(): MongooseModuleOptions {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGO_URI no está definido en el entorno');
  }

  const dbName = process.env.MONGO_DB_NAME || process.env.DB_NAME;

  return {
    uri,
    dbName,
    authSource: process.env.MONGO_AUTH_SOURCE,
    user: process.env.MONGO_USER,
    pass: process.env.MONGO_PASSWORD,
    retryWrites: true,
    // opciones seguras por defecto
    directConnection: false,
    autoIndex: false,
  } as MongooseModuleOptions;
}