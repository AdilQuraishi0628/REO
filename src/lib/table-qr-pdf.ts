import QRCode from "qrcode";

type BuildPdfOptions = {
  venueName: string;
  tableName: string;
  targetUrl: string;
};

export function generateTableStandPdf({ venueName, tableName, targetUrl }: BuildPdfOptions): Buffer {
  const qr = QRCode.create(targetUrl, { errorCorrectionLevel: "H" });
  const size = qr.modules.size;
  const pageWidth = 420;
  const pageHeight = 595;
  const qrBoxSize = 240;
  const cellSize = qrBoxSize / size;
  const qrStartX = (pageWidth - qrBoxSize) / 2;
  const qrStartY = 160;

  // Escape parentheses in PDF text
  const cleanVenue = venueName.replace(/[()]/g, "").slice(0, 40);
  const cleanTable = tableName.replace(/[()]/g, "").slice(0, 30);
  const cleanUrl = targetUrl.replace(/[()]/g, "").slice(0, 80);

  let stream = "";
  // Background card #F7F1E9
  stream += "0.968 0.945 0.914 rg 20 20 380 555 re f\n";
  // Border #D9CBB8
  stream += "0.851 0.796 0.722 RG 2 w 20 20 380 555 re S\n";

  // Header TableTap
  stream += "BT /F1 11 Tf 0.447 0.184 0.216 rg 170 535 Td (TABLETAP) Tj ET\n";
  // Venue Name
  stream += `BT /F2 20 Tf 0.165 0.102 0.114 rg 50 495 Td (${cleanVenue}) Tj ET\n`;
  // Table Name
  stream += `BT /F1 24 Tf 0.447 0.184 0.216 rg 50 460 Td (${cleanTable}) Tj ET\n`;
  // Subtitle
  stream += "BT /F1 12 Tf 0.36 0.28 0.24 rg 50 435 Td (Scan to browse menu and order from your table) Tj ET\n";

  // White background card for QR code
  stream += `1 1 1 rg ${(qrStartX - 10).toFixed(2)} ${(qrStartY - 10).toFixed(2)} ${(qrBoxSize + 20).toFixed(2)} ${(qrBoxSize + 20).toFixed(2)} re f\n`;

  // Draw QR vector cells (#2A1A1D)
  stream += "0.165 0.102 0.114 rg\n";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (qr.modules.get(r, c)) {
        const x = qrStartX + c * cellSize;
        const y = qrStartY + (size - 1 - r) * cellSize;
        stream += `${x.toFixed(2)} ${y.toFixed(2)} ${cellSize.toFixed(2)} ${cellSize.toFixed(2)} re `;
      }
    }
  }
  stream += "f\n";

  // Footer URL
  stream += `BT /F1 10 Tf 0.447 0.184 0.216 rg 50 110 Td (${cleanUrl}) Tj ET\n`;
  stream += "BT /F1 9 Tf 0.5 0.45 0.4 rg 50 90 Td (Powered by TableTap - tabletap.in) Tj ET\n";

  const streamBytes = Buffer.from(stream, "utf-8");
  const objects: string[] = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  objects.push(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n`);
  objects.push(`4 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${stream}endstream\nendobj\n`);
  objects.push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n");
  objects.push("6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>\nendobj\n");

  let pdf = "%PDF-1.4\n";
  const xref = [0];
  for (const obj of objects) {
    xref.push(pdf.length);
    pdf += obj;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(xref[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf-8");
}
