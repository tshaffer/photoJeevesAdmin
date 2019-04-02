export interface Dict<T> {
  [id: string]: T;
}

export interface AlbumSpec {
  googleAlbumId: string;
  googleAlbumTitle: string;
  dbId?: string;
  dbAlbumId?: string;
  dbAlbumTitle?: string;
}


// investigate map as alternative to Dict
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map

// export type GoogleAlbumsContentsByAlbumIdMap = Dict<GoogleAlbum> | {};

// export interface GoogleAlbumData {
//   googleAlbums: GoogleAlbum[];
//   albumContentsByAlbumId: GoogleAlbumsContentsByAlbumIdMap;
// }

export interface PhotoStatus {
  googleAlbumsNotDownloaded: GoogleAlbum[];
  albumDifferencesByAlbumId: Map<string, AlbumWithDifferences>;
  downloadedAlbumsNotInCloud: DbAlbum[];
}

export interface AlbumWithDifferences {
  googleId: string;
  title: string;
  addedMediaItemIds: string[];
  deletedMediaItemIds: string[];
}

export interface DbAlbum {
  dbId: string;
  googleId: string; // known as id
  title: string;
  mediaItemIds: string[];
}

export interface DbMediaItem {
  googleMediaItemId: string; // id
  fileName: string;
  filePath: string;
  mimeType: string;
  width: number;
  height: number;
  creationTime: Date;
  downloaded: boolean;
  baseUrl?: string;
  productUrl?: string;
}

export interface GoogleAlbum {
  googleAlbumId: string;
  title: string;
  productUrl: string;
  mediaItemsCount: number;
  mediaItemIds: string[];
}

export interface PhotoMetadata {
  apertureFNumber: number;
  cameraMake: string;
  cameraModel: string;
  focalLength: number;
  isoEquivalent: number;
}

export interface MediaMetadata {
  creationTime: string;
  height: number;
  width: number;
  photo?: PhotoMetadata;
}

// export interface GoogleMediaItemDownloadResult {
//   type: GoogleMediaItemDownloadMediaItem | GoogleMediaItemDownloadFailureStatus;
// }

export type GoogleMediaItemDownloadResult = GoogleMediaItemDownloadMediaItem | GoogleMediaItemDownloadFailureStatus;

export interface GoogleMediaItemDownloadMediaItem {
  mediaItem: GoogleMediaItem;
}
export interface GoogleMediaItemDownloadFailureStatus {
  status: object;
}

export interface GoogleMediaPhoto {
  apertureFNumber: number;
  cameraMake: string;
  cameraModel: string;
  focalLength: number;
  isoEquivalent: number;
}

export interface GoogleMediaMetadata {
  creationTime: string;
  width: string;
  height: string;
  photo: GoogleMediaPhoto;
}
export interface GoogleMediaItem {
  baseUrl: string;
  filename: string;
  id: string;
  mediaMetadata: any;
  mimeType: string;
  productUrl: string;
}

export interface CompositeAlbum {
  id: string;
  googleAlbum: GoogleAlbum;
  googleTitle: string;
  googlePhotoCount: number;
  inDb: boolean;
  dbTitle: string;
  dbPhotoCount: number;
  onHd: boolean;
  hdTitle?: string;
  hdPhotoCount?: number;
}

export interface AlbumsByTitle {
  [title: string]: number;
}

export interface CompositeAlbumMap {
  [id: string]: CompositeAlbum;
}


