import axios from 'axios';

import {
  DbAlbum,
  PhotoMetadata,
  DbMediaItem,
  GoogleAlbum,
  GoogleMediaItem,
  AlbumWithDifferences,
} from '../types';

export function getGoogleAlbums(accessToken: string): Promise<GoogleAlbum[]> {

  let allGoogleAlbums: GoogleAlbum[] = [];
  const apiEndpoint = 'https://photoslibrary.googleapis.com';

  const processGetAlbums = (pageToken: string): Promise<GoogleAlbum[]> => {

    let url = apiEndpoint + '/v1/albums?pageSize=50';
    if (pageToken !== '') {
      url = url + '&pageToken=' + pageToken;
    }

    const AuthStr = 'Bearer '.concat(accessToken);
    return axios.get(
      url,
      {
        headers: { Authorization: AuthStr },
      }
    )
      .then((axiosResult: any) => {
        const result: any = axiosResult.data;
        const googleAlbums: GoogleAlbum[] = result.albums.map((downloadedGoogleAlbum: any) => {
          return {
            googleAlbumId: downloadedGoogleAlbum.id,
            title: downloadedGoogleAlbum.title,
            productUrl: downloadedGoogleAlbum.productUrl,
            mediaItemsCount: downloadedGoogleAlbum.mediaItemsCount,
            mediaItemIds: [],
          } as GoogleAlbum;
        });

        allGoogleAlbums = allGoogleAlbums.concat(googleAlbums);

        if (result.albums.length === 0 || result.nextPageToken === undefined) {
          return Promise.resolve(allGoogleAlbums);
        }
        else {
          return processGetAlbums(result.nextPageToken);
        }
      }).catch((err: any) => {
        debugger;
        return Promise.resolve(allGoogleAlbums);
      });
  };

  return processGetAlbums('');
}

