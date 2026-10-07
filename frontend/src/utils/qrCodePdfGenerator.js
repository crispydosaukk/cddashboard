import jsPDF from 'jspdf';

/**
 * Loads image from URL and converts to base64
 */
function getBase64ImageFromUrl(imageUrl) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve('');
      return;
    }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);
        } else {
          resolve('');
        }
      } catch (_err) {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
  });
}

/**
 * Generates an A4 promotional flyer PDF with Crispy Dosa branding and high-res App QR code
 */
export async function generateQRCodeFlyerPdf({
  qrDataUrl,
  targetUrl = 'https://crispydosa.co.uk/app',
  title = 'DOWNLOAD THE CRISPY DOSA APP',
  subtitle = 'Order authentic South Indian dosas, curries & veg delicacies with exclusive app rewards',
  brandName = 'CRISPY DOSA',
  brandTagline = 'Authentic South Indian Cuisine · London & UK',
  promoTagline = '🎁 GET 15% OFF YOUR FIRST APP ORDER · EARN LOYALTY POINTS ON EVERY ORDER',
  footerText = 'Website: https://crispydosa.co.uk · Available on iOS App Store & Google Play',
  filename = 'crispy-dosa-app-flyer-a4.pdf',
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm

  // 1. Header Banner (Deep Forest Emerald: #1A4D3A)
  doc.setFillColor(26, 77, 58);
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Gold accent strip (#D4AF37)
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 32, pageWidth, 2.5, 'F');

  // Load logo
  let logoBase64 = '';
  try {
    logoBase64 = await getBase64ImageFromUrl('/Crispy-Dosalogo.png');
  } catch (e) {
    console.error('Could not load logo for flyer PDF:', e);
  }

  let textX = 16;
  if (logoBase64) {
    try {
      // White circular badge with gold rim
      doc.setFillColor(255, 255, 255);
      doc.circle(24, 16, 11, 'F');
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.7);
      doc.circle(24, 16, 11.2, 'S');
      doc.addImage(logoBase64, 'PNG', 14, 6, 20, 20);
      textX = 40;
    } catch (_) {
      textX = 16;
    }
  }

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(brandName, textX, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(230, 235, 232);
  doc.text(brandTagline, textX, 22);

  doc.setFontSize(8.5);
  doc.setTextColor(212, 175, 55);
  doc.text('Available on iOS App Store & Google Play Store', textX, 28);

  // 2. Main Title Section
  let currentY = 46;
  doc.setTextColor(26, 77, 58);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(title, pageWidth / 2, currentY, { align: 'center' });

  currentY += 7;
  doc.setTextColor(80, 110, 95);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.text(subtitle, pageWidth / 2, currentY, { align: 'center' });

  // 3. Central QR Code Card
  currentY += 10;
  const cardWidth = 142;
  const cardHeight = 125;
  const cardX = (pageWidth - cardWidth) / 2;
  const cardY = currentY;

  // Outer border & soft ivory fill
  doc.setFillColor(253, 253, 250);
  doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 6, 6, 'F');
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.8);
  doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 6, 6, 'S');

  // Inner card title
  doc.setTextColor(26, 77, 58);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('SCAN TO GET THE APP', pageWidth / 2, cardY + 12, { align: 'center' });

  doc.setTextColor(100, 130, 115);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Point your smartphone camera to download instantly for iOS & Android', pageWidth / 2, cardY + 18, {
    align: 'center',
  });

  // QR Code Image
  const qrSize = 64;
  const qrX = (pageWidth - qrSize) / 2;
  const qrY = cardY + 23;

  // White base for QR with border
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6, 3, 3, 'F');
  doc.setDrawColor(220, 226, 222);
  doc.setLineWidth(0.5);
  doc.roundedRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6, 3, 3, 'S');

  // Insert QR Code
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

  // App badges representation under QR
  const badgeY = cardY + qrSize + 25;
  
  // iOS Badge pill
  doc.setFillColor(26, 26, 26);
  doc.roundedRect(pageWidth / 2 - 45, badgeY, 40, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('Download on App Store', pageWidth / 2 - 25, badgeY + 5.2, { align: 'center' });

  // Android Badge pill
  doc.setFillColor(26, 26, 26);
  doc.roundedRect(pageWidth / 2 + 5, badgeY, 40, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('GET IT ON Google Play', pageWidth / 2 + 25, badgeY + 5.2, { align: 'center' });

  // URL text under QR
  doc.setTextColor(26, 77, 58);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(targetUrl, pageWidth / 2, cardY + cardHeight - 6, { align: 'center' });

  // Clickable link
  const urlWidth = doc.getTextWidth(targetUrl);
  doc.link((pageWidth - urlWidth) / 2, cardY + cardHeight - 10, urlWidth, 6, { url: targetUrl });

  // 4. Feature Highlights Bento (2x2 Grid)
  currentY = cardY + cardHeight + 8;
  const features = [
    {
      title: '100% Pure Vegetarian South Indian',
      desc: 'Crispy dosas, soft idlis, spicy vadas cooked with pure authentic flavours',
    },
    {
      title: 'Exclusive In-App Discounts',
      desc: 'Special member-only promotional codes, combo deals & seasonal specials',
    },
    {
      title: 'Real-Time Order & Delivery Tracking',
      desc: 'Track your food from the kitchen tawa straight to your table or doorstep',
    },
    {
      title: 'Loyalty Points on Every Order',
      desc: 'Collect reward points and redeem them for free dishes and instant cash-offs',
    },
  ];

  const colWidth = 85;
  const colGap = 10;
  const gridStartX = (pageWidth - (colWidth * 2 + colGap)) / 2;

  features.forEach((feat, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const boxX = gridStartX + col * (colWidth + colGap);
    const boxY = currentY + row * 18;

    doc.setFillColor(245, 248, 246);
    doc.roundedRect(boxX, boxY, colWidth, 15, 2.5, 2.5, 'F');
    doc.setDrawColor(215, 225, 220);
    doc.setLineWidth(0.3);
    doc.roundedRect(boxX, boxY, colWidth, 15, 2.5, 2.5, 'S');

    // Bullet gold circle
    doc.setFillColor(212, 175, 55);
    doc.circle(boxX + 4.5, boxY + 5.5, 1.8, 'F');

    doc.setTextColor(26, 77, 58);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(feat.title, boxX + 8.5, boxY + 6);

    doc.setTextColor(90, 120, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(feat.desc, boxX + 8.5, boxY + 11);
  });

  // 5. Special Offer Banner
  currentY += 40;
  const offerWidth = 180;
  const offerX = (pageWidth - offerWidth) / 2;
  doc.setFillColor(254, 247, 237); // Light amber
  doc.roundedRect(offerX, currentY, offerWidth, 14, 3, 3, 'F');
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.4);
  doc.roundedRect(offerX, currentY, offerWidth, 14, 3, 3, 'S');

  doc.setTextColor(180, 83, 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(
    promoTagline,
    pageWidth / 2,
    currentY + 6,
    { align: 'center' }
  );

  doc.setTextColor(146, 64, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    'Scan the QR code with your camera or search "Crispy Dosa" on App Store & Google Play!',
    pageWidth / 2,
    currentY + 10.5,
    { align: 'center' }
  );

  // 6. Footer Bar
  const footerY = pageHeight - 16;
  doc.setFillColor(26, 77, 58);
  doc.rect(0, footerY, pageWidth, 16, 'F');
  doc.setFillColor(212, 175, 55);
  doc.rect(0, footerY, pageWidth, 0.8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`${brandName} · Authentic South Indian Vegetarian Delights`, pageWidth / 2, footerY + 6, {
    align: 'center',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(210, 225, 218);
  doc.text(
    footerText,
    pageWidth / 2,
    footerY + 11.5,
    { align: 'center' }
  );

  // Save the document
  doc.save(filename);
}

/**
 * Generates an A5 Table Tent / Counter Standee PDF card for restaurant tables & counters
 */
export async function generateQRCodeStandeePdf({
  qrDataUrl,
  targetUrl = 'https://crispydosa.co.uk/app',
  brandName = 'CRISPY DOSA',
  title = 'SCAN TO DOWNLOAD OUR APP',
  subtitle = 'Available on iOS App Store & Google Play',
  filename = 'crispy-dosa-table-standee-a5.pdf',
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 148mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm

  // Outer decorative border
  doc.setDrawColor(212, 175, 55); // Gold
  doc.setLineWidth(1.2);
  doc.roundedRect(6, 6, pageWidth - 12, pageHeight - 12, 5, 5, 'S');

  doc.setDrawColor(26, 77, 58); // Emerald
  doc.setLineWidth(0.4);
  doc.roundedRect(8, 8, pageWidth - 16, pageHeight - 16, 4, 4, 'S');

  // Header Bar
  doc.setFillColor(26, 77, 58);
  doc.roundedRect(12, 12, pageWidth - 24, 26, 3, 3, 'F');

  // Logo
  let logoBase64 = '';
  try {
    logoBase64 = await getBase64ImageFromUrl('/Crispy-Dosalogo.png');
  } catch (e) {
    console.error('Could not load logo for standee PDF:', e);
  }

  if (logoBase64) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.circle(25, 25, 9, 'F');
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.5);
      doc.circle(25, 25, 9.2, 'S');
      doc.addImage(logoBase64, 'PNG', 17, 17, 16, 16);
    } catch (_err) {
      // Ignore
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(brandName, 38, 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(212, 175, 55);
  doc.text('AUTHENTIC SOUTH INDIAN CUISINE', 38, 29);

  doc.setFontSize(6.5);
  doc.setTextColor(220, 230, 225);
  doc.text('Download for iOS & Android', 38, 34);

  // Call to action
  doc.setTextColor(26, 77, 58);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title, pageWidth / 2, 48, { align: 'center' });

  doc.setTextColor(80, 110, 95);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(subtitle, pageWidth / 2, 53, { align: 'center' });

  // Central QR Code Container
  const qrSize = 75;
  const qrX = (pageWidth - qrSize) / 2;
  const qrY = 58;

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 4, 4, 'F');
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.8);
  doc.roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 4, 4, 'S');

  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

  // Store Badges Pill
  const badgeY = qrY + qrSize + 6;
  doc.setFillColor(20, 20, 20);
  doc.roundedRect(pageWidth / 2 - 42, badgeY, 38, 7.5, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('App Store (iOS)', pageWidth / 2 - 23, badgeY + 5, { align: 'center' });

  doc.setFillColor(20, 20, 20);
  doc.roundedRect(pageWidth / 2 + 4, badgeY, 38, 7.5, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('Google Play (Android)', pageWidth / 2 + 23, badgeY + 5, { align: 'center' });

  // Target URL
  doc.setTextColor(26, 77, 58);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(targetUrl, pageWidth / 2, badgeY + 14, { align: 'center' });

  // Highlights ribbon
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(16, badgeY + 18, pageWidth - 32, 10, 2, 2, 'F');
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.4);
  doc.roundedRect(16, badgeY + 18, pageWidth - 32, 10, 2, 2, 'S');

  doc.setTextColor(146, 64, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(
    '★ EXCLUSIVE APP DISCOUNTS · FAST ORDERING · LIVE TRACKING ★',
    pageWidth / 2,
    badgeY + 24.5,
    { align: 'center' }
  );

  // Footer
  doc.setFillColor(26, 77, 58);
  doc.roundedRect(12, pageHeight - 24, pageWidth - 24, 12, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Crispy Dosa · Pure Vegetarian South Indian Restaurant', pageWidth / 2, pageHeight - 17.5, {
    align: 'center',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(212, 175, 55);
  doc.text('Order on table or takeout directly through our mobile app', pageWidth / 2, pageHeight - 14, {
    align: 'center',
  });

  doc.save(filename);
}
