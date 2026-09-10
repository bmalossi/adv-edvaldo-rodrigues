export function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_').trim()
}

export function estilosDocumentoCss(): string {
  return `
    * {
      box-sizing: border-box;
    }
    .package-document, .document {
      width: 210mm;
      margin: 0 auto;
      background: #fff;
      font-family: "Century Gothic", "Segoe UI", Arial, sans-serif;
      color: #111;
    }
    .doc-page {
      width: 210mm;
      height: 297mm;
      min-height: 297mm;
      max-height: 297mm;
      box-sizing: border-box;
      padding: 12mm 17mm 18mm 17mm;
      margin: 0 auto 12mm auto;
      position: relative;
      background: #fff;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
      overflow: hidden;
      box-shadow: 0 4px 18px rgba(0,0,0,0.12);
    }
    .doc-page:last-child {
      page-break-after: auto;
      break-after: auto;
      margin-bottom: 0;
    }
    .letterhead {
      text-align: center;
      margin-bottom: 4mm;
    }
    .letterhead img {
      width: 95mm;
      max-height: 25mm;
      object-fit: contain;
    }
    .doc-meta {
      text-align: right;
      font-size: 8pt;
      color: #64748b;
      margin-top: -3mm;
      margin-bottom: 4mm;
    }
    .doc-title {
      text-align: center;
      font-size: 13.5pt;
      text-decoration: underline;
      font-weight: bold;
      margin: 3mm 0 7mm;
      color: #0f172a;
    }
    .contract-title {
      text-align: center;
      font-size: 13pt;
      font-weight: bold;
      margin: 0 0 6mm;
      color: #0f172a;
    }
    .doc-body {
      font-size: 10.2pt;
      line-height: 1.44;
      text-align: justify;
      color: #111;
    }
    .doc-body p {
      margin: 0 0 3.2mm;
    }
    .doc-body strong {
      font-weight: bold;
    }
    .clause {
      margin-bottom: 4mm;
    }
    .clause-title {
      font-weight: bold;
      font-size: 10.5pt;
      margin-bottom: 2mm;
      color: #0f172a;
    }
    .clause p {
      margin-bottom: 2.2mm;
    }
    .signature-block {
      text-align: center;
      margin-top: 14mm;
    }
    .signature-line {
      width: 90mm;
      border-top: 1px solid #111;
      margin: 0 auto 2.5mm;
    }
    .signature-img {
      max-width: 60mm;
      max-height: 18mm;
      object-fit: contain;
      display: block;
      margin: 0 auto 0.5mm;
      mix-blend-mode: multiply;
    }
    .party-signatures {
      display: flex;
      justify-content: space-between;
      width: 100%;
      margin-top: 16mm;
    }
    .sigbox {
      width: 46%;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .sig-space {
      width: 100%;
      height: 18mm;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .sigbox .line {
      border-top: 1px solid #111;
      margin: 0 auto 2.5mm;
      width: 100%;
    }
    .doc-footer {
      position: absolute;
      left: 17mm;
      right: 17mm;
      bottom: 6mm;
      border-top: 1.5px solid #b58a37;
      padding-top: 1.5mm;
      text-align: center;
      font-size: 7.2pt;
      color: #4b5563;
      line-height: 1.35;
    }
    .doc-footer strong {
      color: #0f172a;
    }
  `
}

export function estilosWord(): string {
  return `<style>
    @page {
      size: A4;
      margin: 12mm 16mm 16mm 16mm;
    }
    body {
      font-family: "Century Gothic", Arial, sans-serif;
      color: #111;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .document, .package-document {
      width: 100%;
    }
    .doc-page {
      width: 100%;
      min-height: 265mm;
      padding: 10mm 15mm 15mm;
      position: relative;
      page-break-after: always;
    }
    .doc-page:last-child {
      page-break-after: auto;
    }
    .letterhead {
      text-align: center;
      margin-bottom: 6mm;
    }
    .letterhead img {
      max-width: 95mm;
      max-height: 25mm;
    }
    .doc-title {
      text-align: center;
      font-size: 13.5pt;
      text-decoration: underline;
      font-weight: bold;
      margin: 4mm 0 7mm;
    }
    .contract-title {
      text-align: center;
      font-size: 13pt;
      font-weight: bold;
      margin: 0 0 6mm;
    }
    .doc-body {
      font-size: 10.5pt;
      line-height: 1.45;
      text-align: justify;
    }
    .doc-body p {
      margin: 0 0 3.5mm;
    }
    .clause {
      margin-bottom: 4.5mm;
    }
    .clause-title {
      font-weight: bold;
      font-size: 10.5pt;
      margin-bottom: 2mm;
    }
    .signature-block {
      text-align: center;
      margin-top: 16mm;
    }
    .signature-line {
      width: 90mm;
      border-top: 1px solid #111;
      margin: 0 auto 2.5mm;
    }
    .signature-img {
      max-width: 60mm;
      max-height: 18mm;
      display: block;
      margin: 0 auto 0.5mm;
    }
    .party-signatures {
      display: table;
      width: 100%;
      margin-top: 16mm;
    }
    .sigbox {
      display: table-cell;
      width: 48%;
      padding-right: 8mm;
      vertical-align: top;
      text-align: center;
    }
    .sig-space {
      width: 100%;
      height: 18mm;
      text-align: center;
    }
    .sigbox .line {
      border-top: 1px solid #111;
      margin: 0 auto 2.5mm;
    }
    .doc-footer {
      margin-top: 14mm;
      border-top: 1.5px solid #b58a37;
      padding-top: 2mm;
      text-align: center;
      font-size: 7.2pt;
      color: #4b5563;
    }
    .doc-meta {
      text-align: right;
      font-size: 8pt;
      color: #666;
    }
  </style>`
}

export function downloadWord(htmlContent: string, titulo: string): void {
  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${titulo}</title>
  ${estilosWord()}
</head>
<body>
  ${htmlContent}
</body>
</html>`

  const blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeFileName(titulo)}.doc`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function imprimirDocumento(htmlContent: string, titulo: string): void {
  const w = window.open('', '_blank')
  if (!w) {
    alert('O navegador bloqueou a janela pop-up de impressão. Permita pop-ups para este site.')
    return
  }

  w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${titulo}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0 !important;
    }
    html, body {
      background: white !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: "Century Gothic", "Segoe UI", Arial, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    ${estilosDocumentoCss()}

    @media print {
      body {
        margin: 0 !important;
        padding: 0 !important;
      }
      .doc-page {
        box-shadow: none !important;
        margin: 0 !important;
        width: 210mm !important;
        height: 297mm !important;
        max-height: 297mm !important;
        min-height: 297mm !important;
        padding: 12mm 17mm 18mm 17mm !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        overflow: hidden !important;
      }
      .doc-page:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
      .doc-footer {
        position: absolute !important;
        left: 17mm !important;
        right: 17mm !important;
        bottom: 6mm !important;
      }
    }
  </style>
</head>
<body>
  ${htmlContent}
  <script>
    setTimeout(function() {
      window.print();
    }, 450);
  <\/script>
</body>
</html>`)

  w.document.close()
}
