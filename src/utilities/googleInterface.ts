import axios from 'axios';

import {
  DbAlbum,
  PhotoMetadata,
  DbMediaItem,
  GoogleAlbum,
  GoogleMediaItem,
  AlbumWithDifferences,
} from '../types';
import requestPromise = require('request-promise');

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

export function getAlbumContents(accessToken: string, albumId: string): Promise<string[]> {

  let mediaItemsIds: string[] = [];

  const processFetchAlbumContents = (pageToken: string): any => {

    let apiEndpoint = 'https://photoslibrary.googleapis.com/v1/mediaItems:search?pageSize=100';
    if (pageToken !== '' && (typeof pageToken !== 'undefined')) {
      apiEndpoint = apiEndpoint + '&pageToken=' + pageToken;
    }

    console.log('get album mediaItemIds for albumId: ', albumId, ', pageToken: ', pageToken);

    return requestPromise.post(apiEndpoint, {
      headers: { 'Content-Type': 'application/json' },
      json: true,
      auth: { bearer: accessToken },
      body: { albumId },
    }).then((result) => {

      if (result.mediaItems && result.mediaItems.length > 0) {
        const mediaItemIdsInAlbum: string[] = result.mediaItems.map((mediaItem: any) => {
          return mediaItem.id;
        });
        mediaItemsIds = mediaItemsIds.concat(mediaItemIdsInAlbum);
      }

      if (result.nextPageToken === undefined) {
        return Promise.resolve(mediaItemsIds);
      }
      return processFetchAlbumContents(result.nextPageToken);
    }).catch((error: Error) => {
      debugger;
      return Promise.reject();
    });
  };

  return processFetchAlbumContents('');
}

