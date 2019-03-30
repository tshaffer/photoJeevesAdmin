import * as React from 'react';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import RaisedButton from 'material-ui/RaisedButton';

const apiKey = 'AIzaSyB2ydonoEsitNys9u9mSZv5rFAQXW_Bv7k';
const discoveryDocs = ["https://photoslibrary.googleapis.com/$discovery/rest?version=v1"];
const scopes = 'https://www.googleapis.com/auth/photoslibrary.readonly';
const clientId = '1006826584050-9in0fnidubfkeollksdl4k28elq00h9o.apps.googleusercontent.com';

var fs = require('fs');
import gapi = require('googleapis');
import { drive_v3 } from 'googleapis';

export default class App extends React.Component<any, object> {

  state: any;

  constructor(props: any) {
    super(props);
    this.handleSynchronize = this.handleSynchronize.bind(this);
  }

  handleSynchronize = () => {
    handleClientLoad();
  }

  render() {

    const self = this;

    return (
      <MuiThemeProvider>
        <div>
          pizza
          <RaisedButton label='Start Synchronization' onClick={this.handleSynchronize} />
        </div>
      </MuiThemeProvider>
    );
  }
}

export function handleClientLoad() {
  console.log(fs);
  console.log(gapi);
  console.log(drive_v3);

  // Load the API client and auth2 library
  // gapi.load('client:auth2', initClient);
}

function initClient() {
  // gapi.client.init({
  //     apiKey: apiKey,
  //     discoveryDocs: discoveryDocs,
  //     clientId: clientId,
  //     scope: scopes
  // }).then(function () {
  //   // Listen for sign-in state changes.
  //   gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

  //   // Handle the initial sign-in state.
  //   updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
  // }).catch( (err: any) => {
  //   debugger;
  // });
}

function updateSigninStatus(isSignedIn: any) {
  if (isSignedIn) {
    console.log('signed in - begin process');
    makeApiCall();
  }
}

function makeApiCall() {
  console.log(gapi);

  console.log('invoke albums.list()');
}
