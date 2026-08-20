/**
 * MODULES: PDFBuilder.js
 * Construtor nativo de stream PDF multi-páginas (PDF-1.3) em Vanilla JS.
 * Cria documentos PDF contendo o Canvas visual e Apêndices de notas expandidas sem bibliotecas externas pesadas.
 */

export class PDFBuilder {
  /**
   * Constrói e dispara o download de um arquivo PDF multi-páginas a partir de um array de elementos Canvas HTML5.
   * @param {HTMLCanvasElement|HTMLCanvasElement[]} canvasPaginas - Canvas ou lista de Canvas para cada página.
   * @param {string} filename - Nome do arquivo a ser baixado (ex: "canvas_studio_export.pdf").
   */
  static async exportarComoPDF(canvasPaginas, filename = "canvas_studio_export.pdf") {
    if (!Array.isArray(canvasPaginas)) canvasPaginas = [canvasPaginas];

    const encoder = new TextEncoder();
    const paginasData = [];

    // Prepara dados de imagem JPEG para cada página
    for (const cv of canvasPaginas) {
      const jpegDataUrl = cv.toDataURL("image/jpeg", 0.92);
      const base64Data = jpegDataUrl.split(',')[1];
      const binaryData = atob(base64Data);
      const imgBytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        imgBytes[i] = binaryData.charCodeAt(i);
      }

      const imgW = cv.width;
      const imgH = cv.height;
      const pdfW = Math.round(imgW * 0.75);
      const pdfH = Math.round(imgH * 0.75);

      paginasData.push({
        imgW,
        imgH,
        pdfW,
        pdfH,
        imgBytes,
        imageLength: binaryData.length
      });
    }

    const totalPages = paginasData.length;
    const kidsRefs = [];
    for (let i = 0; i < totalPages; i++) {
      kidsRefs.push(`${3 + i * 3} 0 R`);
    }

    // 1 0 obj: Catalog
    const obj1 = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
    // 2 0 obj: Pages
    const obj2 = `2 0 obj\n<< /Type /Pages /Kids [${kidsRefs.join(' ')}] /Count ${totalPages} >>\nendobj\n`;

    const pdfParts = [
      encoder.encode("%PDF-1.3\n"),
      encoder.encode(obj1),
      encoder.encode(obj2)
    ];

    let currentObjId = 3;
    for (let i = 0; i < totalPages; i++) {
      const page = paginasData[i];
      const pageObjId = currentObjId;
      const xobjId = currentObjId + 1;
      const contentObjId = currentObjId + 2;
      currentObjId += 3;

      // Page Object
      const pageObj = `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.pdfW} ${page.pdfH}] /Resources << /XObject << /Im${i + 1} ${xobjId} 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`;
      pdfParts.push(encoder.encode(pageObj));

      // XObject Image
      const xobjHeader = `${xobjId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${page.imgW} /Height ${page.imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.imageLength} >>\nstream\n`;
      const xobjFooter = `\nendstream\nendobj\n`;
      pdfParts.push(encoder.encode(xobjHeader));
      pdfParts.push(page.imgBytes);
      pdfParts.push(encoder.encode(xobjFooter));

      // Content Stream
      const contentStream = `q ${page.pdfW} 0 0 ${page.pdfH} 0 0 cm /Im${i + 1} Do Q`;
      const contentObj = `${contentObjId} 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`;
      pdfParts.push(encoder.encode(contentObj));
    }

    // Calcula offsets da tabela XREF
    const totalObjs = 2 + totalPages * 3;
    const offsets = [0];
    let currentOffset = pdfParts[0].length;

    // Obj 1
    offsets.push(currentOffset);
    currentOffset += pdfParts[1].length;
    // Obj 2
    offsets.push(currentOffset);
    currentOffset += pdfParts[2].length;

    let partIdx = 3;
    for (let i = 0; i < totalPages; i++) {
      // Page Obj
      offsets.push(currentOffset);
      currentOffset += pdfParts[partIdx].length;
      partIdx++;

      // XObject Image (Header + bytes + Footer)
      offsets.push(currentOffset);
      currentOffset += pdfParts[partIdx].length + pdfParts[partIdx + 1].length + pdfParts[partIdx + 2].length;
      partIdx += 3;

      // Content Obj
      offsets.push(currentOffset);
      currentOffset += pdfParts[partIdx].length;
      partIdx++;
    }

    let xref = `xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= totalObjs; i++) {
      xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }

    const trailer = `trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${currentOffset}\n%%EOF`;
    pdfParts.push(encoder.encode(xref));
    pdfParts.push(encoder.encode(trailer));

    const pdfBlob = new Blob(pdfParts, { type: "application/pdf" });
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
