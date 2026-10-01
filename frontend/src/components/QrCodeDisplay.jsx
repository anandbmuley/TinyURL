import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download } from 'lucide-react';

export default function QrCodeDisplay({ url, shortCode }) {
  const qrRef = useRef(null);

  const downloadQr = () => {
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      // White background for QR code
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 20, 20);

      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `tinyurl-${shortCode}-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  return (
    <div className="qr-container">
      <div className="qr-box" ref={qrRef}>
        <QRCodeSVG
          value={url}
          size={180}
          bgColor="#ffffff"
          fgColor="#090d16"
          level="H"
          includeMargin={false}
        />
      </div>
      <button type="button" className="icon-btn" onClick={downloadQr}>
        <Download size={15} />
        Download QR Code (PNG)
      </button>
    </div>
  );
}
