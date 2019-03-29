import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { remote } from 'electron';

import App from './components/app';

console.log('index.tsx');
console.log('accessToken');
console.log((remote.app as any).accessToken);

ReactDOM.render(
  <App />,
  document.getElementById('content') as HTMLElement,
);
