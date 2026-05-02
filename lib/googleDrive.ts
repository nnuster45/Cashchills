export async function getOrCreateDriveFolder(accessToken: string, folderName: string = 'Cashchills Receipts'): Promise<string> {
  // Check if folder exists
  const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!searchRes.ok) {
    throw new Error(`Failed to search drive folder: ${searchRes.statusText}`);
  }

  const data = await searchRes.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Create folder
  const createRes = await fetch(`https://www.googleapis.com/drive/v3/files?fields=id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create drive folder: ${createRes.statusText}`);
  }

  const createData = await createRes.json();
  return createData.id;
}

export async function uploadFileToDrive(
  accessToken: string,
  base64Data: string,
  fileName: string,
  mimeType: string,
  parentFolderId?: string
): Promise<{ id: string; webViewLink: string }> {
  const metadata: any = { name: fileName };
  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  
  // Convert base64 back to binary Blob for FormData
  const buffer = Buffer.from(base64Data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  form.append('file', new Blob([buffer], { type: mimeType }));

  const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to upload file to drive: ${res.status} ${errorText}`);
  }

  return res.json() as Promise<{ id: string; webViewLink: string }>;
}
