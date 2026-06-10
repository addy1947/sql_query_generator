/**
 * Parses a CSV string into headers and rows of objects, adhering to RFC 4180.
 * Handles quoted fields, commas inside quotes, escaped quotes, and newlines in quotes.
 * Detects column types automatically.
 * 
 * @param {string} text The raw CSV text.
 * @returns {{headers: string[], rows: Object[], columnTypes: Record<string, 'numeric' | 'string'>}}
 */
export function parseCSV(text) {
  const result = [];
  let row = [];
  let entry = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped double quote
          entry += '"';
          i++; // skip the next quote
        } else {
          // Closing quote
          inQuotes = false;
        }
      } else {
        entry += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(entry.trim());
        entry = '';
      } else if (char === '\n' || char === '\r') {
        row.push(entry.trim());
        entry = '';
        if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
          result.push(row);
        }
        row = [];
        // Handle CRLF line ending (\r\n)
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
      } else {
        entry += char;
      }
    }
  }

  // Handle last row if CSV didn't end with a newline
  if (entry !== '' || row.length > 0) {
    row.push(entry.trim());
    if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
      result.push(row);
    }
  }

  if (result.length === 0) {
    return { headers: [], rows: [], columnTypes: {} };
  }

  // The first row contains the headers
  const headers = result[0].map((h, i) => h || `Column_${i + 1}`);
  const dataRows = [];

  for (let i = 1; i < result.length; i++) {
    const rawRow = result[i];
    const rowObj = {};
    headers.forEach((header, index) => {
      rowObj[header] = index < rawRow.length ? rawRow[index] : '';
    });
    dataRows.push(rowObj);
  }

  // Detect column types
  const columnTypes = {};
  headers.forEach((header) => {
    let allNumeric = true;
    let hasValues = false;

    for (let i = 0; i < dataRows.length; i++) {
      const val = dataRows[i][header];
      if (val !== undefined && val !== null && val.trim() !== '') {
        hasValues = true;
        // Check if value is a valid number
        const num = Number(val);
        if (isNaN(num)) {
          allNumeric = false;
          break;
        }
      }
    }

    columnTypes[header] = (hasValues && allNumeric) ? 'numeric' : 'string';
  });

  return { headers, rows: dataRows, columnTypes };
}
