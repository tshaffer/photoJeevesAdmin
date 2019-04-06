import * as fse from 'fs-extra';
import * as path from 'path';

export function fsLocalFolderExists(fullPath: string): Promise<boolean> {
  return Promise.resolve(fse.existsSync(fullPath))
    .then((exists) => {
      if (exists) {
        return fsLocalFileIsDirectory(fullPath);
      }
      return false;
    });
}

export function fsCreateNestedDirectory(dirPath: string) {
  return fse.mkdirp(dirPath);
}

function fsLocalFileIsDirectory(fullPath: string) {
  return fse.stat(fullPath)
    .then((stat) => stat.isDirectory());
}

export function getSuffixFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'image/png':
      return '.png';
    case 'video/mp4':
      return '.mp4';
    case 'image/heif':
      return '.heic';
    case 'image/jpeg':
    default:
      return '.jpg';
  }
}

export function getShardedDirectory(baseDirectory: string, fileName: string): Promise<string> {
  const numChars = fileName.length;
  const targetDirectory = path.join(
    baseDirectory,
    fileName.charAt(numChars - 2),
    fileName.charAt(numChars - 1),
  );
  return fsLocalFolderExists(targetDirectory)
  .then((dirExists: boolean) => {
    if (dirExists) {
      return Promise.resolve(targetDirectory);
    }
    else {
      return fsCreateNestedDirectory(targetDirectory)
        .then(() => {
          return Promise.resolve(targetDirectory);
        });
    }
  })
  .catch((err: Error) => {
    console.log(err);
    return Promise.reject();
  });
}

