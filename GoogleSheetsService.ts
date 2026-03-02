
/**
 * Utility to fetch and parse Google Sheets data via the Visualization API.
 */

export const parseCSV = (csvText: string) => {
  const cleanText = csvText.replace(/^\uFEFF/, '');
  const lines = cleanText.split(/\r?\n/);
  if (lines.length < 1) return [];

  let headerLineIndex = 0;
  while (headerLineIndex < lines.length && !lines[headerLineIndex].trim()) {
    headerLineIndex++;
  }
  
  if (headerLineIndex >= lines.length) return [];

  const splitCSVLine = (line: string) => {
    const result = [];
    let curValue = "";
    let insideQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        result.push(curValue.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        curValue = "";
      } else {
        curValue += char;
      }
    }
    result.push(curValue.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    return result;
  };

  const rawHeaders = splitCSVLine(lines[headerLineIndex]);
  const headers = rawHeaders.map(h => 
    h.toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
  );
  
  return lines.slice(headerLineIndex + 1)
    .filter(line => line.trim() !== '')
    .map(line => {
      const values = splitCSVLine(line);
      return headers.reduce((obj: any, header, i) => {
        if (header) {
          obj[header] = values[i] || '';
        }
        return obj;
      }, {});
    });
};

export const fetchSheetData = async (sheetId: string, gid: string = '0') => {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Sheet access failed (${response.status}).`);
    }
    
    const text = await response.text();
    if (text.includes('<!DOCTYPE html>') || text.includes('google-signin')) {
      throw new Error("Sheet is private. Set sharing to 'Anyone with the link can view'.");
    }
    
    return parseCSV(text);
  } catch (error: any) {
    console.error('Fetch failed:', error.message);
    throw error;
  }
};

/**
 * Sends data to Google Apps Script.
 * Uses 'text/plain' to avoid CORS preflight (Simple Request).
 */
export const sendDataToSheet = async (url: string, payload: any) => {
  if (!url || !url.startsWith('https://script.google.com')) {
    throw new Error("Invalid Script URL. It must be the Web App URL ending in /exec");
  }

  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(payload) // ✅ no headers, no no-cors
  });

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { success: true };
  }
};

