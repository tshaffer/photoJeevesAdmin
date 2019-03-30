import * as React from 'react';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import RaisedButton from 'material-ui/RaisedButton';

export default class App extends React.Component<any, object> {

  state: {
    status: string;
  };

  constructor(props: any) {
    super(props);

    this.state = { 
      status: '' 
    };

    this.handleSynchronizeAlbums = this.handleSynchronizeAlbums.bind(this);
    this.handleSynchronizeAlbumNames = this.handleSynchronizeAlbumNames.bind(this);
    this.handleGeneratePhotoCollectionManifest = this.handleGeneratePhotoCollectionManifest.bind(this);
    this.handleGeneratePhotoJeevesAlbums = this.handleGeneratePhotoJeevesAlbums.bind(this);
    this.handleConvertHeicFiles = this.handleConvertHeicFiles.bind(this);
    this.handleAuditPhotos = this.handleAuditPhotos.bind(this);
  }

  componentDidMount() {
    this.updateStatus('Retrieving album information...');
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
    this.setState( {
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
        </div>
      </MuiThemeProvider>
    );
  }
}
