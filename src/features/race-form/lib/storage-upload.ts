type StorageError = Error & { code?: string };

export function uploadVoiceViaStorageRest(
  bucketName: string,
  objectPath: string,
  blob: Blob,
  contentType: string
): Promise<string> {
  if (!bucketName) {
    const err: StorageError = new Error('Storage bucket is not configured');
    err.code = 'storage/no-bucket';
    return Promise.reject(err);
  }

  const url = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucketName)}/o?name=${encodeURIComponent(objectPath)}&uploadType=media`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', contentType);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const body = JSON.parse(xhr.responseText) as {
            downloadTokens?: string;
            name?: string;
          };
          const rawToken = body.downloadTokens;
          const token =
            typeof rawToken === 'string' ? rawToken.split(',')[0]?.trim() : '';
          const objectName = typeof body.name === 'string' ? body.name : objectPath;
          if (!token) {
            const err: StorageError = new Error('Storage returned no download token');
            err.code = 'storage/unknown';
            reject(err);
            return;
          }
          const mediaUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(objectName)}?alt=media&token=${encodeURIComponent(token)}`;
          resolve(mediaUrl);
        } catch (parseError) {
          reject(parseError);
        }
        return;
      }
      if (xhr.status === 404) {
        const err: StorageError = new Error('Storage bucket not found');
        err.code = 'storage/bucket-not-found';
        reject(err);
        return;
      }
      if (xhr.status === 403) {
        const err: StorageError = new Error('Storage upload forbidden');
        err.code = 'storage/unauthorized';
        reject(err);
        return;
      }
      const err: StorageError = new Error(`Storage upload failed (${xhr.status})`);
      err.code = 'storage/unknown';
      reject(err);
    };

    xhr.onerror = () => {
      const err: StorageError = new Error('Storage is not reachable from the browser');
      err.code = 'storage/unavailable';
      reject(err);
    };

    xhr.onabort = () => {
      const err: StorageError = new Error('Upload canceled');
      err.code = 'storage/canceled';
      reject(err);
    };

    xhr.send(blob);
  });
}
