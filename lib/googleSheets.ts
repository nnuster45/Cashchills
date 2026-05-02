export async function createGoogleSheet(accessToken: string, title: string = 'Cashchills Backup'): Promise<string> {
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        {
          properties: { title: 'Transactions' },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Failed to create Google Sheet: ${createRes.status} ${err}`);
  }

  const data = await createRes.json();
  const spreadsheetId = data.spreadsheetId;

  // Append Headers
  await appendToGoogleSheet(accessToken, spreadsheetId, [
    ['Date', 'Type', 'Category', 'Amount', 'Reference No', 'Merchant/Details', 'Receipt Link']
  ]);

  return spreadsheetId;
}

export async function appendToGoogleSheet(accessToken: string, spreadsheetId: string, rows: any[][]): Promise<void> {
  if (rows.length === 0) return;

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transactions!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to append to Google Sheet: ${res.status} ${err}`);
  }
}
