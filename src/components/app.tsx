import * as React from 'react';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import RaisedButton from 'material-ui/RaisedButton';
import { getGoogleAlbums } from '../utilities/googleInterface';
import { getDbAlbums, openDb } from '../utilities/dbInterface';
import { GoogleAlbum, DbAlbum } from '../types';
import { isNil } from 'lodash';
import album from '../models/album';

interface AlbumNames {
  googleAlbumId: string;
  googleAlbumTitle: string;
  dbAlbumTitle: string;
}

export default class App extends React.Component<any, object> {

  state: {
    accessToken: string;
    allAlbumNames: AlbumNames[];
    status: string;
  };

  constructor(props: any) {
    super(props);

    this.state = {
      accessToken: '',
      allAlbumNames: [],
      status: '',
    };

    this.handleSynchronizeAlbums = this.handleSynchronizeAlbums.bind(this);
    this.handleSynchronizeAlbumNames = this.handleSynchronizeAlbumNames.bind(this);
    this.handleGeneratePhotoCollectionManifest = this.handleGeneratePhotoCollectionManifest.bind(this);
    this.handleGeneratePhotoJeevesAlbums = this.handleGeneratePhotoJeevesAlbums.bind(this);
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

      const albumsById: Map<string, AlbumNames> = new Map();

      googleAlbums.forEach((googleAlbum: GoogleAlbum) => {
        albumsById.set(googleAlbum.googleAlbumId,
          {
            googleAlbumId: googleAlbum.googleAlbumId,
            googleAlbumTitle: googleAlbum.title,
            dbAlbumTitle: '',
          },
        );
      });

      dbAlbums.forEach((dbAlbum: DbAlbum) => {
        const matchingAlbum: AlbumNames = albumsById.get(dbAlbum.googleId);
        if (!isNil(matchingAlbum)) {
          albumsById.set(matchingAlbum.googleAlbumId,
            {
              googleAlbumId: matchingAlbum.googleAlbumId,
              googleAlbumTitle: matchingAlbum.googleAlbumTitle,
              dbAlbumTitle: dbAlbum.title,
            },
          );
        }
      });

      const allAlbumNames: AlbumNames[] = [];
      albumsById.forEach((albumNames: AlbumNames) => {
        allAlbumNames.push(albumNames);
      });
      this.setState({
        allAlbumNames,
      });
    });
  }

  handleSynchronizeAlbums() {
    console.log('handleSynchronizeAlbums');
  }

  handleSynchronizeAlbumNames() {
    console.log('handleSynchronizeAlbumNames');
  }

  handleGeneratePhotoCollectionManifest() {
    console.log('handleGeneratePhotoCollectionManifest');
  }

  handleGeneratePhotoJeevesAlbums() {
    console.log('handleGeneratePhotoJeevesAlbums');
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
        label='Synchronize albums, album contents'
        onClick={this.handleSynchronizeAlbums}
      />
    );
  }

  renderSynchronizeAlbumNamesButton() {
    return (
      <RaisedButton
        label='Synchronize album names'
        onClick={this.handleSynchronizeAlbumNames}
        style={{
          marginTop: '10px',
        }}
      />
    );
  }

  renderGeneratePhotoCollectionManifestButton() {
    return (
      <RaisedButton
        label='Generate photoCollectionManifest.json'
        onClick={this.handleGeneratePhotoCollectionManifest}
        style={{
          marginTop: '10px',
        }}
      />
    );
  }

  renderGeneratePhotoJeevesAlbumsButton() {
    return (
      <RaisedButton
        label='Generate photoJeevesAlbums.json'
        onClick={this.handleGeneratePhotoJeevesAlbums}
        style={{
          marginTop: '10px',
        }}
      />
    );
  }

  renderConvertHeicFilesButton() {
    return (
      <RaisedButton
        label='Convert Heic files'
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
        label='Perform google photos vs. db photos audit'
        onClick={this.handleAuditPhotos}
        style={{
          marginTop: '10px',
        }}
      />
    );
  }

  renderAlbumRow(albumNames: AlbumNames) {
    return (
      <tr>
        <td>{albumNames.googleAlbumTitle}</td>
        <td>{albumNames.dbAlbumTitle}</td>
      </tr>
    );
  }

  renderAlbumRows() {
    return this.state.allAlbumNames.map( (albumNames: AlbumNames) => {
      return this.renderAlbumRow(albumNames);
    });
  }

  renderAlbumList() {

    if (this.state.allAlbumNames.length === 0) {
      return null;
    }

    return (
      <table>
        <tr>
          <th>Google Album Name</th>
          <th>Db Album Name</th>
        </tr>
        {this.renderAlbumRows()}
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
          {this.renderGeneratePhotoCollectionManifestButton()}
          {this.renderGeneratePhotoJeevesAlbumsButton()}
          {this.renderConvertHeicFilesButton()}
          {this.renderAuditPhotosButton()}
          {this.renderAlbumList()}
        </div>
      </MuiThemeProvider>
    );
  }
}
