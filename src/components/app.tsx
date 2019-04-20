import * as React from 'react';
import { isNil, union, isObject, isString } from 'lodash';
import * as fs from 'fs-extra';
import * as path from 'path';
import axios from 'axios';
axios.defaults.adapter = require('axios/lib/adapters/http');

const cloudconvert = new (require('cloudconvert'))('njk3d6nMW4YwESyySBwBPDY30DMtwjeXjrvuUMInXBGdG1fWPBO5fgVhDMOsF8LK');

import recursiveReadDir = require('recursive-readdir');

const remote = require('electron').remote;

import { Query, Document } from 'mongoose';

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import RaisedButton from 'material-ui/RaisedButton';
import { getGoogleAlbums, getAlbumContents, downloadMediaItemsMetadata } from '../utilities/googleInterface';
import { getDbAlbums, openDb, addAlbumsToDb, getAllMediaItemsInDb, addMediaItemToDb, getHeicFiles } from '../utilities/dbInterface';
import { GoogleAlbum, DbAlbum, AlbumSpec, CompositeAlbumMap, CompositeAlbum, AlbumsByTitle, GoogleMediaItemDownloadResult, GoogleMediaItem, GoogleMediaItemDownloadFailureStatus, GoogleMediaItemDownloadMediaItem, ShardedFileSpec, HeicFileToConvert } from '../types';

import Album from '../models/album';
import MediaItem from '../models/mediaItem';
import { getShardedDirectory, getSuffixFromMimeType } from '../utilities/utilities';

const ObjectId = require('mongoose').Types.ObjectId;

const userDataBaseDir: string = path.join(remote.app.getPath('userData'), 'appData');
const photoCollectionManifestPath = path.join(userDataBaseDir, 'photoCollectionManifest.json');
const albumsManifestPath = path.join(userDataBaseDir, 'albumsManifest.json');
const portableHDMediaItemsBaseDir = '/Volumes/SHAFFEROTO/mediaItems';

console.log('user data directory: ', userDataBaseDir);
console.log('manifestPath: ', photoCollectionManifestPath);
console.log('albumsManifestPath: ', albumsManifestPath);
console.log('portableHDMediaItemsBaseDir: ', portableHDMediaItemsBaseDir);

export default class App extends React.Component<any, object> {

  accessToken: string = '';
  compositeAlbumsById: CompositeAlbumMap = {};

  state: {
    allAlbums: AlbumSpec[];
    status: string;
  };

  constructor(props: any) {
    super(props);

    this.state = {
      allAlbums: [],
      status: '',
    };

    this.handleSynchronizeAlbums = this.handleSynchronizeAlbums.bind(this);
    this.handleSynchronizeFiles = this.handleSynchronizeFiles.bind(this);
    this.handleSynchronizeAlbumNames = this.handleSynchronizeAlbumNames.bind(this);
    this.handleGenerateManifests = this.handleGenerateManifests.bind(this);
    this.handleConvertHeicFiles = this.handleConvertHeicFiles.bind(this);
    this.handleAuditPhotos = this.handleAuditPhotos.bind(this);
  }

  componentDidMount() {

    this.accessToken = (remote.app as any).accessToken;

    console.log('componentDidMount');
    console.log('accessToken');
    console.log(this.accessToken);

    this.updateStatus('Retrieving album information...');

    openDb().then(() => {
      this.getAlbumStatus();
    });
  }

  updateStatus(status: string) {
    this.setState({
      status
    });
  }

  getAlbumStatus() {

    const promises: Array<Promise<any>> = [];
    promises.push(getGoogleAlbums(this.accessToken));
    promises.push(getDbAlbums());

    Promise.all(promises).then((albumStatusResults: any[]) => {

      const googleAlbums: GoogleAlbum[] = albumStatusResults[0];
      const dbAlbums: DbAlbum[] = albumStatusResults[1];

      const albumsById: Map<string, AlbumSpec> = new Map();

      googleAlbums.forEach((googleAlbum: GoogleAlbum) => {
        albumsById.set(googleAlbum.googleAlbumId,
          {
            googleAlbumId: googleAlbum.googleAlbumId,
            googleAlbumTitle: googleAlbum.title,
          },
        );
      });

      dbAlbums.forEach((dbAlbum: DbAlbum) => {
        const matchingAlbum: AlbumSpec = albumsById.get(dbAlbum.googleId);
        if (!isNil(matchingAlbum)) {
          albumsById.set(matchingAlbum.googleAlbumId,
            {
              googleAlbumId: matchingAlbum.googleAlbumId,
              googleAlbumTitle: matchingAlbum.googleAlbumTitle,
              dbId: dbAlbum.dbId,
              dbAlbumId: dbAlbum.googleId,
              dbAlbumTitle: dbAlbum.title,
            },
          );
        }
      });

      const allAlbumSpecs: AlbumSpec[] = [];
      albumsById.forEach((albumSpec: AlbumSpec) => {
        allAlbumSpecs.push(albumSpec);
      });
      this.setState({
        allAlbums: allAlbumSpecs,
        status: '',
      });
    });
  }

  generatePhotoCollectionManifest(): Promise<void> {
    const mediaItemsQuery = MediaItem.find({});
    return mediaItemsQuery.exec()
      .then((mediaItemQueryResults: any) => {
        const albumsQuery = Album.find({});
        return albumsQuery.exec()
          .then((albumsQueryResults: any) => {

            const mediaItemsById: any = {};
            mediaItemQueryResults.forEach((mediaItem: any) => {
              mediaItemsById[mediaItem.id] = {
                id: mediaItem.id,
                fileName: mediaItem.fileName,
                width: mediaItem.width,
                height: mediaItem.height,
              };
            });

            const albumItemsByAlbumName: any = {};
            albumsQueryResults.forEach((album: any) => {
              const albumName: string = album.title;
              const albumId: string = album.id;
              const mediaItemIdsInAlbum: any[] = [];
              const dbMediaItemIdsInAlbum = album.mediaItemIds;
              // tslint:disable-next-line: prefer-for-of
              for (let j = 0; j < dbMediaItemIdsInAlbum.length; j++) {
                mediaItemIdsInAlbum.push(dbMediaItemIdsInAlbum[j]);
              }
              albumItemsByAlbumName[albumName] = {
                id: albumId,
                mediaItemIds: dbMediaItemIdsInAlbum,
              };
            });
            console.log(albumItemsByAlbumName);

            const manifestFile = {
              mediaItemsById,
              albums: albumItemsByAlbumName,
            };
            const json = JSON.stringify(manifestFile, null, 2);
            return fs.writeFile(photoCollectionManifestPath, json, 'utf8');
          });
      });
  }

  generateAlbumsManifest(): Promise<void> {
    
    const manifestContents = fs.readFileSync(photoCollectionManifestPath);
    // attempt to convert buffer to string resulted in Maximum Call Stack exceeded
    const photoManifest = JSON.parse(manifestContents as any);

    const photoJeevesAlbums: any[] = [];

    const albums = photoManifest.albums;
    for (const albumName in albums) {
      if (albums.hasOwnProperty(albumName)) {
        const title = albumName;
        const albumSpec = albums[albumName];
        const photoIds = albumSpec.mediaItemIds;
        const photoCount = photoIds.length;      
        photoJeevesAlbums.push({
          title,
          photoCount,
        });
      }
    }

    const photoJeevesAlbumsSpec: any = {
      ALBUM_SPECS: photoJeevesAlbums,
    };

    const json = JSON.stringify(photoJeevesAlbumsSpec, null, 2);
    return fs.writeFile(albumsManifestPath, json, 'utf8');
  }

  generateManifests() {
    this.generatePhotoCollectionManifest().then(() => {
      this.generateAlbumsManifest();
    })
  }

  getAlbumsListFromManifest(): AlbumsByTitle {

    const manifestContents = fs.readFileSync(photoCollectionManifestPath);
    // attempt to convert buffer to string resulted in Maximum Call Stack exceeded
    const photoManifest = JSON.parse(manifestContents as any);
    console.log(photoManifest);

    const photoJeevesAlbums: AlbumsByTitle = {};

    const albums = photoManifest.albums;

    for (const albumName in albums) {
      if (albums.hasOwnProperty(albumName)) {
        const title = albumName;
        const photoCount = albums[albumName].length;
        photoJeevesAlbums[title] = photoCount;
      }
    }

    return photoJeevesAlbums;
  }


  getDetailedAlbumData(): Promise<any> {

    const promises: Array<Promise<any>> = [];

    promises.push(getGoogleAlbums(this.accessToken));
    promises.push(getDbAlbums());

    return Promise.all(promises).then((albumStatusResults: any[]) => {
      console.log(albumStatusResults);
      const googleAlbums: GoogleAlbum[] = albumStatusResults[0];
      const dbAlbums: DbAlbum[] = albumStatusResults[1];

      googleAlbums.forEach((googleAlbum: GoogleAlbum) => {
        const allAlbum: CompositeAlbum = {
          googleAlbum,
          id: googleAlbum.googleAlbumId,
          googleTitle: googleAlbum.title,
          googlePhotoCount: googleAlbum.mediaItemsCount,
          inDb: false,
          dbTitle: '',
          dbPhotoCount: 0,
          onHd: false,
        };
        this.compositeAlbumsById[googleAlbum.googleAlbumId] = allAlbum;
      });

      dbAlbums.forEach((dbAlbum: DbAlbum) => {
        if (this.compositeAlbumsById.hasOwnProperty(dbAlbum.googleId)) {
          const compositeAlbum: CompositeAlbum = this.compositeAlbumsById[dbAlbum.googleId];
          compositeAlbum.inDb = true;
          compositeAlbum.dbTitle = dbAlbum.title;
          compositeAlbum.dbPhotoCount = dbAlbum.mediaItemIds.length;
          this.compositeAlbumsById[dbAlbum.googleId] = compositeAlbum;
        }
        else {
          console.log('No matching google album for dbAlbum: ', dbAlbum.title);
        }
      });

      const hdAlbumsByTitle: AlbumsByTitle = this.getAlbumsListFromManifest();

      const allAlbums: CompositeAlbum[] = [];
      for (const albumId in this.compositeAlbumsById) {
        if (this.compositeAlbumsById.hasOwnProperty(albumId)) {
          const compositeAlbum = this.compositeAlbumsById[albumId];
          const compositeAlbumName = compositeAlbum.googleTitle;
          if (hdAlbumsByTitle.hasOwnProperty(compositeAlbumName)) {
            const hdAlbumCount: number = hdAlbumsByTitle[compositeAlbumName];
            compositeAlbum.onHd = true;
            compositeAlbum.hdPhotoCount = hdAlbumCount;
          }
          allAlbums.push(compositeAlbum);
        }
      }

      return Promise.resolve();
    });
  }

  getListOfAlbumsToDownload(): CompositeAlbum[] {
    const compositeAlbumsToDownload: CompositeAlbum[] = [];
    Object.keys(this.compositeAlbumsById).forEach((compositeAlbumId: string) => {
      const compositeAlbum: CompositeAlbum = this.compositeAlbumsById[compositeAlbumId];
      if (!compositeAlbum.inDb) {
        compositeAlbumsToDownload.push(compositeAlbum);
      }
    });
    return compositeAlbumsToDownload;
  }

  fetchNewAlbumsContents(accessToken: string, compositeAlbumsToDownload: CompositeAlbum[]): Promise<void> {

    const processFetchAlbumContents = (index: number): Promise<void> => {

      console.log('fetchNewAlbumsContents for index: ', index);

      if (index >= compositeAlbumsToDownload.length) {
        return Promise.resolve();
      }

      const compositeAlbum: CompositeAlbum = compositeAlbumsToDownload[index];
      const albumId = compositeAlbum.id;
      return getAlbumContents(accessToken, albumId)
        .then((mediaItemIds: string[]) => {

          compositeAlbum.googleAlbum.mediaItemIds = mediaItemIds;

          return processFetchAlbumContents(index + 1);
        });
    };
    return processFetchAlbumContents(0);
  }

  addGoogleAlbumsToDb(compositeAlbums: CompositeAlbum[]): Promise<Document[]> {
    const dbAlbumsToInsert: DbAlbum[] = [];
    compositeAlbums.forEach((compositeAlbum: CompositeAlbum) => {
      const dbAlbum: DbAlbum = {
        dbId: '', // placeholder
        googleId: compositeAlbum.googleAlbum.googleAlbumId,
        title: compositeAlbum.googleAlbum.title,
        mediaItemIds: compositeAlbum.googleAlbum.mediaItemIds,
      };
      dbAlbumsToInsert.push(dbAlbum);
    });
    return addAlbumsToDb(dbAlbumsToInsert);
  }

  getDbMediaItemIds(dbMediaItemIds: any[]): string[] {
    return dbMediaItemIds.map((mediaItemId: any) => {
      return mediaItemId.toString();
    });
  }

  // returns an array of mediaItemIds that represents all the mediaItems in all the albums
  getAlbumMediaItemIds(): Promise<string[]> {
    const query = Album.find({});
    return query.exec().then((results: any) => {
      const mediaItemIdsInAlbums: [any][any] = results.map((result: any) => {
        return this.getDbMediaItemIds(result.mediaItemIds);
      });
      const uniqueMediaItemIdsInAlbums: string[] = union(...mediaItemIdsInAlbums);
      return Promise.resolve(uniqueMediaItemIdsInAlbums);
    });
  }

  /*
    compare all the mediaItemIds in all the albums to the mediaItemIds in the db.
    for each mediaItemId (in the albums), if there's not a corresponding media item in the db,
    add the mediaItemId found in the album to the list of mediaItems
    that need to be downloaded. (albumMediaItemIdsNotInDb). also, add mediaItems that are
    found on the db but whose downloadedProperty is false (rare, if non existent at the moment)
  */
  getMediaItemIdsNotInDb(allMediaItems: Document[], mediaItemIdsInAlbums: string[]): string[] {

    const mediaItemsInDbById: Map<string, any> = new Map();
    allMediaItems.forEach((mediaItem: any) => {
      mediaItemsInDbById.set(mediaItem.id, mediaItem);
    });

    const albumMediaItemsInDbToDownload: Map<string, any> = new Map();
    const albumMediaItemIdsNotInDb: string[] = [];

    mediaItemIdsInAlbums.forEach((mediaItemIdInAlbum) => {
      const matchingMediaItem: any = mediaItemsInDbById.get(mediaItemIdInAlbum);
      if (isNil(matchingMediaItem)) {
        albumMediaItemIdsNotInDb.push(mediaItemIdInAlbum);
      }
      else {
        if (!matchingMediaItem.downloaded) {
          // mediaItem exists in db; add to map
          albumMediaItemsInDbToDownload.set(mediaItemIdInAlbum, matchingMediaItem);
        }
      }
    });
    console.log(albumMediaItemsInDbToDownload);
    console.log(albumMediaItemIdsNotInDb);

    return albumMediaItemIdsNotInDb;
  }

  downloadMediaItems(missingMediaItemResults: GoogleMediaItemDownloadResult[]): Promise<void> {

    const mediaItemsToRetrieve: GoogleMediaItem[] = [];

    missingMediaItemResults.forEach((missingMediaItemResult: GoogleMediaItemDownloadFailureStatus | GoogleMediaItemDownloadMediaItem) => {
      if (isObject((missingMediaItemResult as any).mediaItem)) {
        mediaItemsToRetrieve.push((missingMediaItemResult as GoogleMediaItemDownloadMediaItem).mediaItem);
      }
    });

    const processFetchMediaItem = (index: number): Promise<void> => {

      if (index >= mediaItemsToRetrieve.length) {
        return Promise.resolve();
      }

      const mediaItem: GoogleMediaItem = mediaItemsToRetrieve[index];

      const id = mediaItem.id;
      let baseUrl = mediaItem.baseUrl;

      if (isObject(mediaItem.mediaMetadata)) {
        const mediaMetadata: any = mediaItem.mediaMetadata;
        const { width, height } = mediaMetadata;
        if (isString(width) && isString(height)) {
          baseUrl += '=w' + width + '-h' + height;
        }
      }

      const fileSuffix = getSuffixFromMimeType(mediaItem.mimeType);
      const fileName = mediaItem.id + fileSuffix;

      const baseDir = '/Users/tedshaffer/Documents/Projects/photoJeeves/tmp';

      // https://github.com/axios/axios/issues/1474

      return getShardedDirectory(baseDir, mediaItem.id)
        .then((shardedDirectory) => {
          const filePath = path.join(shardedDirectory, fileName);
          const writer = fs.createWriteStream(filePath);
          return axios({
            method: 'get',
            url: baseUrl,
            responseType: 'stream',
          }).then((response: any) => {
            response.data.pipe(writer);
            writer.on('finish', () => {
              return Promise.resolve();
            });
            writer.on('error', () => {
              return Promise.reject();
            });
          }).then(() => {
            console.log('new media item download successful');
            console.log(mediaItem);
            return addMediaItemToDb(mediaItem);
          }).then(() => {
            return processFetchMediaItem(index + 1);
          }).catch((err: Error) => {
            // output error info to console and move to next item.
            console.log('mediaItem file get/write failed for id:');
            console.log(id);
            console.log(err);
            return processFetchMediaItem(index + 1);
          });
        });
    };

    return processFetchMediaItem(0);
  }


  /* Steps
    get detailed information
    get new albums
    get all the mediaItemIds in all albums
    get all mediaItems that are in the db
    create a mapping from mediaItemId to mediaItem for all mediaItems in db
    compare all the mediaItemIds in all the albums to the mediaItemIds in the db.
    for each mediaItemId (in the albums), if there's not a corresponding media item in the db,
    add the mediaItemId found in the album to the list of mediaItems
    that need to be downloaded. (albumMediaItemIdsNotInDb). also, add mediaItems that are
    found on the db but whose downloadedProperty is false (rare, if non existent at the moment)
    invoke downloadMediaItemsMetadata to get the mediaItem metadata for all the mediaItems in an album but not in the db
    invoke downloadMediaItems, supplying the mediaItem metadata retrieved in the last step.
    New albums are not retrieved. This function assumes that all new albums have been downloaded and added to the db, including
    the media item ids associated with the albums.
  */
  handleSynchronizeAlbums() {

    let compositeAlbumsToDownload: CompositeAlbum[];
    let globalMediaItemIdsInAlbums: string[];

    console.log('handleSynchronizeAlbums');

    // build compositeAlbumsById
    this.getDetailedAlbumData()
      .then(() => {
        console.log(this.compositeAlbumsById);

        // generate a list of compositeAlbums to download
        compositeAlbumsToDownload = this.getListOfAlbumsToDownload();

        // iterate through compositeAlbumsToDownload
        //   get mediaItemIds for each compositeAlbumToDownload
        //   add to compositeAlbumToDownload
        return this.fetchNewAlbumsContents(this.accessToken, compositeAlbumsToDownload)

      }).then(() => {

        // add albums to db
        return this.addGoogleAlbumsToDb(compositeAlbumsToDownload);

      }).then(() => {

        // get all the mediaItemIds in all albums
        return this.getAlbumMediaItemIds()

      }).then((mediaItemIdsInAlbums: string[]) => {

        globalMediaItemIdsInAlbums = mediaItemIdsInAlbums;

        // get all mediaItems that are in the db
        return getAllMediaItemsInDb();

      }).then((allMediaItems: Document[]) => {

        // create a mapping from mediaItemId to mediaItem for all mediaItems in db
        const albumMediaItemIdsNotInDb: string[] = this.getMediaItemIdsNotInDb(allMediaItems, globalMediaItemIdsInAlbums);

        // get the mediaItem metadata for all the mediaItems in an album but not in the db
        return downloadMediaItemsMetadata(this.accessToken, albumMediaItemIdsNotInDb);

      }).then((missingMediaItemResults: any[]) => {

        // downloadMediaItems, supplying the mediaItem metadata retrieved in the last step.
        return this.downloadMediaItems(missingMediaItemResults);

      });

  }

  ignoreFile(file: string): boolean {
    const ext = path.extname(file);
    return ext !== '.jpg' && ext !== '.png' && ext != '.heic' && ext != '.heif';
  }

  getCachedPhotoFiles(): Promise<string[]> {
    const desktopPhotoCacheDir = path.join(userDataBaseDir, 'photoCache');
    return recursiveReadDir(desktopPhotoCacheDir).then((rawFiles) => {
      const cachedPhotoFiles: string[] = [];
      rawFiles.forEach((rawFile: string) => {
        if (!this.ignoreFile(rawFile)) {
          cachedPhotoFiles.push(rawFile);
        }
      });
      return Promise.resolve(cachedPhotoFiles);
    })
  }

  getTargetPaths(shardedFileSpecs: ShardedFileSpec[]): Promise<void> {

    // const baseDir = '/Users/tedshaffer/Documents/Projects/photoJeeves/tmp';
    const hdPhotoDir = '/Volumes/SHAFFEROTO/mediaItems';

    const processFileToCopy = (index: number): Promise<void> => {

      if (index >= shardedFileSpecs.length) {
        return Promise.resolve();
      }

      const shard = shardedFileSpecs[index];

      return getShardedDirectory(hdPhotoDir, shard.baseName)
        .then((shardedDirectory) => {
          shard.shardedDirectory = shardedDirectory;
          shard.targetFilePath = path.join(shardedDirectory, shard.fileName);
          return processFileToCopy(index + 1);
        });
    }

    return processFileToCopy(0);
  }

  getNewFiles(shardedFileSpecs: ShardedFileSpec[]): Promise<string[]> {

    const newFilePaths: string[] = [];

    const processFileToCheck = (index: number): Promise<string[]> => {

      if (index >= shardedFileSpecs.length) {
        return Promise.resolve(newFilePaths);
      }

      const shardedFileSpec = shardedFileSpecs[index];
      const filePathToCheck = shardedFileSpecs[index].targetFilePath;

      return fs.pathExists(filePathToCheck)
        .then(exists => {
          if (!exists) {
            newFilePaths.push(filePathToCheck);
          }
          return processFileToCheck(index + 1);
        }) // => false
    };

    return processFileToCheck(0);
  }

  getFilesToDownload(cachedPhotoFiles: string[]): Promise<ShardedFileSpec[]> {

    const shardedFileSpecs: ShardedFileSpec[] = cachedPhotoFiles.map((cachedPhotoFilePath: string) => {
      const extension: string = path.extname(cachedPhotoFilePath);
      const baseName: string = path.basename(cachedPhotoFilePath, extension);
      return {
        sourceFilePath: cachedPhotoFilePath,
        fileName: baseName + extension,
        baseName,
      };
    });

    return this.getTargetPaths(shardedFileSpecs)
      .then(() => {
        return this.getNewFiles(shardedFileSpecs);
      }).then((filesToDownload: string[]) => {
        return Promise.resolve(shardedFileSpecs);
      });
  }

  downloadPhotos(fileSpecs: ShardedFileSpec[]): Promise<void> {

    const processFileToDownload = (index: number): Promise<void> => {

      if (index >= fileSpecs.length) {
        return Promise.resolve();
      }

      const shardedFileSpec = fileSpecs[index];
      const { sourceFilePath, targetFilePath } = shardedFileSpec;

      fs.copy(sourceFilePath, targetFilePath)
        .then(() => {
          console.log('file copy success: ', sourceFilePath, targetFilePath);
          return fs.remove(sourceFilePath);
        }).then(() => {
          console.log('file remove success!', sourceFilePath)
          return processFileToDownload(index + 1);
        })
        .catch(err => {
          console.log('fs error: ', sourceFilePath, targetFilePath);
          console.error(err);
          return processFileToDownload(index + 1);
        })
    };

    return processFileToDownload(0);
  }

  // synchronize files between the desktop hd and the portable hd
  handleSynchronizeFiles() {

    // get location of contents on desktop hd
    this.getCachedPhotoFiles()
      .then((cachedPhotoFiles: string[]) => {
        console.log(cachedPhotoFiles);
        return this.getFilesToDownload(cachedPhotoFiles);
      })
      .then((photosToDownload: ShardedFileSpec[]) => {
        console.log(photosToDownload);
        return this.downloadPhotos(photosToDownload);
      }).then(() => {
        console.log('synchronize files complete');
      })
  }

  handleSynchronizeAlbumNames() {
    console.log('handleSynchronizeAlbumNames');
    console.log(this.state.allAlbums);

    this.state.allAlbums.forEach((albumSpec: AlbumSpec) => {
      if (!isNil(albumSpec.dbAlbumId)) {
        const dbAlbumTitle: string = albumSpec.dbAlbumTitle as string;
        if (dbAlbumTitle !== albumSpec.googleAlbumTitle) {

          console.log(albumSpec);

          const albumsQuery = Album.find({ id: albumSpec.googleAlbumId });
          albumsQuery.exec()
            .then((albumsQueryResults: any) => {
              albumsQueryResults.forEach((album: any) => {
                console.log(album);
                album.title = albumSpec.googleAlbumTitle;
                album.save()
                  .then((product: any) => {
                    console.log('album saved successfully');
                    console.log(product);
                  })
                  .catch((err: any) => {
                    console.log('album save failed: ', err);
                  })
              });
            });
        }
      }
    })
  }

  handleGenerateManifests() {
    console.log('handleGenerateManifests');
    this.generateManifests();
  }

  convertHeicFiles(heicFilesToConvert: HeicFileToConvert[]) {

    const maxToDownload = 25;

    var convertHeicToJpg = (heicMediaItemIndex: number) => {

      if (heicMediaItemIndex >= heicFilesToConvert.length || heicMediaItemIndex >= maxToDownload) {
        return Promise.resolve();
      }

      const heicFileToConvert: HeicFileToConvert = heicFilesToConvert[heicMediaItemIndex];
      
      const inputFilePath = heicFileToConvert.filePath;

      const extension: string = path.extname(inputFilePath);   // should be .heic
      const baseName: string = path.basename(inputFilePath, extension);
      const fileName: string = baseName + '.jpg';

      const dbFileName = (heicFileToConvert.heicFileDocument as any).fileName;
      const convertedDbFileName = dbFileName.substring(0, dbFileName.length - 4) + 'jpg';
      console.log(convertedDbFileName);

      return getShardedDirectory(portableHDMediaItemsBaseDir, baseName)
        .then((shardedDirectory) => {
          const outputFilePath = path.join(shardedDirectory, fileName);

          console.log('convert file: ', inputFilePath);

          fs.createReadStream(inputFilePath).pipe(cloudconvert.convert({
            "input": "upload",
            "inputformat": "heic",
            "outputformat": "jpg",
            "converteroptions.quality": {
              "quality": "100"
            }
          })).pipe(fs.createWriteStream(outputFilePath)
            .on('finish', function () {
              console.log('conversion complete: ', outputFilePath);
  
              // update the mimeType of the converted file.
              (heicFileToConvert.heicFileDocument as any).mimeType = 'image/jpeg';
              (heicFileToConvert.heicFileDocument as any).fileName = convertedDbFileName;
              heicFileToConvert.heicFileDocument.save();

              convertHeicToJpg(heicMediaItemIndex + 1);
            })
            .on('error', (errorArgument: any) => {
              console.log(errorArgument);
              convertHeicToJpg(heicMediaItemIndex + 1);
            }));
        });
    }

    return convertHeicToJpg(0);
  }

getFilesToConvert(): Promise<HeicFileToConvert[]> {

  const heicFilesToConvert: HeicFileToConvert[] = [];
  
  return this.getCachedPhotoFiles()
    .then((allCachedFiles: string[]) => {
      return getHeicFiles()
    .then((heicFileDocuments: Document[])=> {
      heicFileDocuments.forEach( (heicFileDocument: Document) => {
        const id = heicFileDocument.id;
        allCachedFiles.forEach( (cachedFilePath: string) => {
          const extension: string = path.extname(cachedFilePath);   // should be .heic
          const baseName: string = path.basename(cachedFilePath, extension);
          // const fileName: string = baseName + '.heic';
          if (id === baseName) {
            heicFilesToConvert.push( {
              dbId: id,
              heicFileDocument,
              filePath: cachedFilePath
            });
          }
        })
      });
      return Promise.resolve(heicFilesToConvert);
    })
  });
}

handleConvertHeicFiles() {
  this.getFilesToConvert()
    .then( (heicFilesToConvert: HeicFileToConvert[]) => {
      this.convertHeicFiles(heicFilesToConvert);
    });
}

handleAuditPhotos() {
  console.log('handleAuditPhotos');
}

renderTitle() {
  return (
    <h1>Photo Jeeves</h1>
  )
}

renderWorkflowDescription() {
  return (
    <div>
      <h2>Workflow</h2>
      <p>Use the Photo Jeeves admin tool after making any of the following changes to your Google Photos account: creating a new album;
        modifying the contents of an existing album; or renaming an existing album. After creating a new album or modifying the content
        of an existing album, invoke 'Sync desktop to cloud' followed by 'Generate manifests'. Perform the manual steps indicated after new
        manifest files are generated. Finally invoke 'Sync desktop to portable hd'. 
        In certain circumstances, you'll also need to invoke 'Convert Heic Files'. </p>
    </div>
  )
}

renderStatus() {
  return (
    <p>
      {this.state.status}
    </p>
  )
}

renderSynchronizeAlbumsButton() {
  return (
    <RaisedButton
      label='Sync desktop to cloud'
      onClick={this.handleSynchronizeAlbums}
    />
  );
}

renderSynchronizeAlbumsExplanation() {
  return (
    <p>Invoke this function when you have updated albums and/or content in the cloud and want to see
      updated content in Photo Jeeves. This function detects new and updated albums in the cloud, updates
      the database with the information for the albums as well as the album contents. It determines what photo
      files need to be downloaded from the cloud to the desktop hard drive and downloads them. Does it in fact 
      download new albums, or not as indicated earlier in the code?</p>
  )
}
renderSynchronizeAlbums() {
  return (
    <div>
      {this.renderSynchronizeAlbumsButton()}
      {this.renderSynchronizeAlbumsExplanation()}
    </div>
  )
}

renderSynchronizeFilesButton() {
  return (
    <RaisedButton
      label='Sync desktop to portable hd'
      onClick={this.handleSynchronizeFiles}
      style={{
        marginLeft: '0px',
      }}
    />
  );
}

renderSynchronizeFilesExplanation() {
  return (
    <p>This function synchronizes photo files between the desktop hard drive and the portable hard drive. It does
      not modify or copy the manifest files. Use this function after downloading new content from the cloud. In order to
      see the new files in the alexa app, you will also need to regenerate the manifest files and update them as described in the
      'Generate Manifest Files' description.
       </p>
  )
}

renderSynchronizeFiles() {
  return (
    <div>
      {this.renderSynchronizeFilesButton()}
      {this.renderSynchronizeFilesExplanation()}
    </div>
  )
}

renderSynchronizeAlbumNamesButton() {
  return (
    <RaisedButton
      label='Sync album names'
      onClick={this.handleSynchronizeAlbumNames}
      style={{
        marginLeft: '0px',
      }}
    />
  );
}

renderSynchronizeAlbumNamesExplanation() {
  return (
    <p>Invoke synchronize album names when you have renamed an album in Google Photos 
      that you had already loaded into Photo Jeeves. This function 
      synchronizes the album names in the data base with the album names in the cloud. After 
      performing this step, invoke Generate Manifests to update the associated manifest files.
      This function only updates the database; it does not write to the cloud or the portable
      hard drive.</p>
  )
}

renderSynchronizeAlbumNames() {
  return (
    <div>
      {this.renderSynchronizeAlbumNamesButton()}
      {this.renderSynchronizeAlbumNamesExplanation()}
    </div>
  )
}


renderGenerateManifestsButton() {
  return (
    <RaisedButton
      label='Generate Manifests'
      onClick={this.handleGenerateManifests}
      style={{
        marginLeft: '0px',
      }}
    />
  );
}

renderGenerateManifestsExplanation() {
  return (
    <p>This function generates updated photos and albums manifest files. Use this function after performing any
      functions that update the database, either the photos records or the albums records. This function reads
      from the database and writes to the local application directory. After invoking this function, you must manually
      copy photoCollectionManifest.json to the portable hard drive and copy albumsManifest.json to both the scripts folder
      and the SD card, and to the Alexa app, after which you must reinvoke 'ask deploy' on the Alexa app.
    </p>
  )
}

renderGenerateManifests() {
  return (
    <div>
      {this.renderGenerateManifestsButton()}
      {this.renderGenerateManifestsExplanation()}
    </div>
  )
}


renderConvertHeicFilesButton() {
  return (
    <RaisedButton
      label='Convert Heic Files'
      onClick={this.handleConvertHeicFiles}
      style={{
        marginLeft: '0px',
      }}
    />
  );
}

renderConvertHeicFilesExplanation() {
  return (
    <p>Invoke this function when you have downloaded content that includes heic files. Use it after
      invoking 'Sync content' but before invoking 'Sync files'. In other words, after the files have been
      downloaded to the desktop but before downloading to the portable hard drive. This function invokes
      a cloud service to convert the files, and the converted files are written to the desktop hard drive's 
      photo cache. Once a file is converted and written to the desktop, the database is updated. Note - this function may
      not convert all the Heic files at once, as the cloud service only permits 20 conversions per day.
      The function needs to be updated to delete the original heic files in the photo cache.
    </p>
  )
}

renderConvertHeicFiles() {
  return (
    <div>
      {this.renderConvertHeicFilesButton()}
      {this.renderConvertHeicFilesExplanation()}
    </div>
  )
}

renderAuditPhotosButton() {
  return (
    <RaisedButton
      label='Audit Photos'
      onClick={this.handleAuditPhotos}
      style={{
        marginLeft: '0px',
      }}
    />
  );
}

renderAuditPhotosExplanation() {
  return (
    <p>TBD</p>
  )
}

renderAuditPhotos() {
  return (
    <div>
      {this.renderAuditPhotosButton()}
      {this.renderAuditPhotosExplanation()}
    </div>
  )
}

renderAlbumRow(albumNames: AlbumSpec, index: number) {
  return (
    <tr key={index}>
      <td>{albumNames.googleAlbumTitle}</td>
      <td>{albumNames.dbAlbumTitle}</td>
    </tr>
  );
}

renderAlbumRows() {
  return this.state.allAlbums.map((albumNames: AlbumSpec, index: number) => {
    return this.renderAlbumRow(albumNames, index);
  });
}

renderAlbumList() {

  if (this.state.allAlbums.length === 0) {
    return null;
  }

  return (
    <table
      style={{
        marginTop: '10px',
      }}
    >
      <thead>
        <tr>
          <th>Google Album Name</th>
          <th>Db Album Name</th>
        </tr>
      </thead>
      <tbody>
        {this.renderAlbumRows()}
      </tbody>
    </table>
  );
}

/*
        {this.renderAlbumList()}
        <br></br>
*/
render() {

  return (
    <MuiThemeProvider>
      <div>
        {this.renderTitle()}
        {this.renderStatus()}
        {this.renderWorkflowDescription()}
        {this.renderSynchronizeAlbums()}
        {this.renderGenerateManifests()}
        {this.renderSynchronizeFiles()}
        {this.renderConvertHeicFiles()}
        {this.renderSynchronizeAlbumNames()}
        {this.renderAuditPhotos()}
      </div>
    </MuiThemeProvider>
  );
}
}
