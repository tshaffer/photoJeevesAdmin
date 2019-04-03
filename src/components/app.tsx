import * as React from 'react';
import { isNil } from 'lodash';
import * as fse from 'fs-extra';
import * as path from 'path';

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import RaisedButton from 'material-ui/RaisedButton';
import { getGoogleAlbums } from '../utilities/googleInterface';
import { getDbAlbums, openDb } from '../utilities/dbInterface';
import { GoogleAlbum, DbAlbum, AlbumSpec } from '../types';

import Album from '../models/album';
import MediaItem from '../models/mediaItem';

var ObjectId = require('mongoose').Types.ObjectId; 

export default class App extends React.Component<any, object> {

  state: {
    accessToken: string;
    allAlbums: AlbumSpec[];
    status: string;
  };

  constructor(props: any) {
    super(props);

    this.state = {
      accessToken: '',
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
    const accessToken = (remote.app as any).accessToken;
    this.setState({
      accessToken,
    });

    console.log('componentDidMount');
    console.log('accessToken');
    console.log(accessToken);

    this.updateStatus('Retrieving album information...');

    openDb().then(() => {
      this.getAlbumStatus(accessToken);
    });
  }

  getAlbumStatus(accessToken: string) {

    const promises: Array<Promise<any>> = [];
    promises.push(getGoogleAlbums(accessToken));
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
    this.generatePhotoCollectionManifest(manifestPath).then( () => {
      console.log('photoCollectionManifest.json written');
      const albumsPath = path.join(adminPath, 'photoJeevesAlbums.json');
      this.generateAlbumsList(albumsPath);
    })
  }

  handleSynchronizeAlbums() {
    console.log('handleSynchronizeAlbums');
  }

  handleSynchronizeAlbumNames() {
    console.log('handleSynchronizeAlbumNames');
    console.log(this.state.allAlbums);

    this.state.allAlbums.forEach( (albumSpec: AlbumSpec) => {
      if (!isNil(albumSpec.dbAlbumId)) {
        const dbAlbumTitle: string = albumSpec.dbAlbumTitle as string;
        if (dbAlbumTitle !== albumSpec.googleAlbumTitle) {

          console.log(albumSpec);

          const albumsQuery = Album.find({id: albumSpec.googleAlbumId});
          albumsQuery.exec()
            .then((albumsQueryResults: any) => {
              albumsQueryResults.forEach((album: any) => {
                console.log(album);
                album.title = albumSpec.googleAlbumTitle;
                album.save()
                  .then( (product: any) => {
                    console.log('album saved successfully');
                    console.log(product);
                  })
                  .catch( (err: any) => {
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
          marginTop: '10px',
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
          marginTop: '10px',
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
          marginTop: '10px',
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
          marginTop: '10px',
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
      <table>
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
          <br></br>
          {this.renderSynchronizeAlbumNamesButton()}
          <br></br>
          {this.renderGenerateManifests()}
          <br></br>
          {this.renderConvertHeicFilesButton()}
          <br></br>
          {this.renderAuditPhotosButton()}
          <br></br>
          {this.renderAlbumList()}
          <br></br>
        </div>
      </MuiThemeProvider>
    );
  }
}
