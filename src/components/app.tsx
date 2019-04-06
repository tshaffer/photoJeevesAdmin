import * as React from 'react';
import { isNil } from 'lodash';
import * as fse from 'fs-extra';
import * as path from 'path';

import { Query, Document } from 'mongoose';

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import RaisedButton from 'material-ui/RaisedButton';
import { getGoogleAlbums, getAlbumContents } from '../utilities/googleInterface';
import { getDbAlbums, openDb, addAlbumsToDb } from '../utilities/dbInterface';
import { GoogleAlbum, DbAlbum, AlbumSpec, CompositeAlbumMap, CompositeAlbum, AlbumsByTitle } from '../types';

import Album from '../models/album';
import MediaItem from '../models/mediaItem';

var ObjectId = require('mongoose').Types.ObjectId;

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
    this.handleSynchronizeAlbumNames = this.handleSynchronizeAlbumNames.bind(this);
    this.handleGeneratePhotoCollectionManifest = this.handleGeneratePhotoCollectionManifest.bind(this);
    this.handleConvertHeicFiles = this.handleConvertHeicFiles.bind(this);
    this.handleAuditPhotos = this.handleAuditPhotos.bind(this);
  }

  componentDidMount() {

    const remote = require('electron').remote;
    this.accessToken = (remote.app as any).accessToken;

    console.log('componentDidMount');
    console.log('accessToken');
    console.log(this.accessToken);

    this.updateStatus('Retrieving album information...');

    openDb().then(() => {
      this.getAlbumStatus();
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

  generatePhotoCollectionManifest(filePath: string): Promise<void> {

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
            fse.writeFile(filePath, json, 'utf8', (err) => {
              if (err) {
                console.log('err');
                console.log(err);
              }
              else {
                console.log('photoCollectionManifest.json successfully written');
              }
              return;
            });
          });
      });

  }

  generateAlbumsList(filePath: string) {

    const manifestPath = '/Users/tedshaffer/Documents/Projects/sinker/photoCollectionManifest.json';

    const manifestContents = fse.readFileSync(manifestPath);
    // attempt to convert buffer to string resulted in Maximum Call Stack exceeded
    const photoManifest = JSON.parse(manifestContents as any);
    console.log(photoManifest);

    const photoJeevesAlbums: any[] = [];

    const albums = photoManifest.albums;

    for (const albumName in albums) {
      if (albums.hasOwnProperty(albumName)) {
        const title = albumName;
        const photoCount = albums[albumName].length;
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
    fse.writeFile('photoJeevesAlbums.json', json, 'utf8', (err) => {
      if (err) {
        console.log('err');
        console.log(err);
      }
      else {
        console.log('photoJeevesAlbums.json successfully written');
      }
    });
  }

  generateManifestFiles() {
    const adminPath = '/Users/tedshaffer/Documents/Projects/photoJeeves/admin';
    const manifestPath = path.join(adminPath, 'photoCollectionManifest.json');
    this.generatePhotoCollectionManifest(manifestPath).then(() => {
      console.log('photoCollectionManifest.json written');
      const albumsPath = path.join(adminPath, 'photoJeevesAlbums.json');
      this.generateAlbumsList(albumsPath);
    })
  }

  getAlbumsListFromManifest(): AlbumsByTitle {

    const manifestPath = '/Users/tedshaffer/Documents/Projects/photoJeeves/admin/photoCollectionManifest.json';

    const manifestContents = fse.readFileSync(manifestPath);
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
        debugger;
      });

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

  handleGeneratePhotoCollectionManifest() {
    console.log('handleGeneratePhotoCollectionManifest');
    this.generateManifestFiles();
  }

  handleConvertHeicFiles() {
    console.log('handleConvertHeicFiles');
  }

  handleAuditPhotos() {
    console.log('handleAuditPhotos');
  }

  updateStatus(status: string) {
    this.setState({
      status
    });
  }

  renderTitle() {
    return (
      <h1>Photo Jeeves</h1>
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
        label='Sync content'
        onClick={this.handleSynchronizeAlbums}
      />
    );
  }

  renderSynchronizeAlbumNamesButton() {
    return (
      <RaisedButton
        label='Sync album names'
        onClick={this.handleSynchronizeAlbumNames}
        style={{
          marginLeft: '10px',
        }}
      />
    );
  }

  renderGenerateManifests() {
    return (
      <RaisedButton
        label='Generate Manifests'
        onClick={this.handleGeneratePhotoCollectionManifest}
        style={{
          marginLeft: '10px',
        }}
      />
    );
  }

  renderConvertHeicFilesButton() {
    return (
      <RaisedButton
        label='Convert Heic'
        onClick={this.handleConvertHeicFiles}
        style={{
          marginLeft: '10px',
        }}
      />
    );
  }

  renderAuditPhotosButton() {
    return (
      <RaisedButton
        label='Audit Photos'
        onClick={this.handleAuditPhotos}
        style={{
          marginLeft: '10px',
        }}
      />
    );
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

  render() {

    const self = this;

    return (
      <MuiThemeProvider>
        <div>
          {this.renderTitle()}
          {this.renderStatus()}
          {this.renderSynchronizeAlbumsButton()}
          {this.renderSynchronizeAlbumNamesButton()}
          {this.renderGenerateManifests()}
          {this.renderConvertHeicFilesButton()}
          {this.renderAuditPhotosButton()}
          <br></br>
          {this.renderAlbumList()}
          <br></br>
        </div>
      </MuiThemeProvider>
    );
  }
}
