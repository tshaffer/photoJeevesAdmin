// import mongoose from 'mongoose';
import mongoose = require('mongoose');

import {
  DbAlbum,
  PhotoMetadata,
  DbMediaItem,
  GoogleAlbum,
  GoogleMediaItem,
  AlbumWithDifferences,
} from '../types';

import Album from '../models/album';

export function openDb(): Promise<any> {

  const mongoDB = 'mongodb://ted:photoTed0524@ds014648.mlab.com:14648/photos';
  mongoose.connect(mongoDB);
  mongoose.Promise = global.Promise;
  const db = mongoose.connection;

  return new Promise((resolve, reject) => {
    db.once('open', () => {
      console.log('Successfully connected');
      return resolve();
    });

    db.on('error', () => {
      console.error.bind(console, 'MongoDB connection error:');
      reject('db open error');
    });
  });
}

export function getDbAlbums(): Promise<DbAlbum[]> {
  console.log('begin: retrieve downloadedAlbums from mongoose');
  const query = Album.find({});
  return query.exec().then((results: any) => {
    const dbAlbums: DbAlbum[] = results.map((result: any) => {
      return {
        dbId: result._id.toString(),
        googleId: result.id,
        title: result.title,
        mediaItemIds: getDbMediaItemIds(result.mediaItemIds),
      };
    });
    return Promise.resolve(dbAlbums);
  });
}

function getDbMediaItemIds(dbMediaItemIds: any[]): string[] {
  return dbMediaItemIds.map((mediaItemId: any) => {
    return mediaItemId.toString();
  });
}

