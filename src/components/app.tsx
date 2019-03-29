import * as React from 'react';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';

export default class App extends React.Component<any, object> {

  state: any;

  constructor(props: any) {
    super(props);
  }

  render() {

    const self = this;

    return (
      <MuiThemeProvider>
        <div>
          pizza
        </div>
      </MuiThemeProvider>
    );
  }
}
