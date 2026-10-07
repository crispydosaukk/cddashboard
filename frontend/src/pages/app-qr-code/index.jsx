import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import {
  Download,
  Copy,
  ExternalLink,
  Printer,
  Sparkles,
  QrCode,
  FileText,
  Image as ImageIcon,
  Check,
  RotateCcw,
  Palette,
  Layers,
  Share2,
  Loader2,
  Smartphone,
  Save,
  CheckCircle2,
  Info,
  Apple,
  Eye,
  Sliders,
  Type
} from "lucide-react";
import { usePopup } from "../../context/PopupContext";
import { db } from "../../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { generateQRCodeFlyerPdf, generateQRCodeStandeePdf } from "../../utils/qrCodePdfGenerator";

// Color presets tailored for Crispy Dosa
const colorPresets = [
  { name: "Crispy Emerald", color: "#1A4D3A" },
  { name: "Golden Dosa", color: "#D4AF37" },
  { name: "Ruby Maroon", color: "#8B1538" },
  { name: "Slate Black", color: "#111827" },
  { name: "Classic Black", color: "#000000" },
  { name: "Slate Navy", color: "#1E293B" },
];

const bgPresets = [
  { name: "Pure White", color: "#FFFFFF" },
  { name: "Soft Ivory", color: "#FDFBF7" },
  { name: "Light Mint", color: "#F0FDF4" },
];

const defaultSettings = {
  androidUrl: "https://play.google.com/store/apps/details?id=com.crispydosa",
  iosUrl: "https://apps.apple.com/app/crispy-dosa/id6475839201",
  brandName: "CRISPY DOSA",
  brandTagline: "Authentic South Indian Cuisine · London & UK",
  cardTitle: "SCAN TO DOWNLOAD OUR APP",
  cardSubtitle: "Point your phone camera to download on iOS & Android",
  promoRibbon: "★ 100% PURE VEG · EXCLUSIVE APP DISCOUNTS · FAST DELIVERY ★",
  footerText: "Order Online · Fast London-Wide Delivery · crispydosa.co.uk",
};

/**
 * Universal cross-browser rounded rectangle drawer
 */
function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * Generates Pure QR code data URL (with optional Crispy Dosa logo in center)
 */
async function generateQRDataUrl(targetUrl, options) {
  const size = options.size || 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  await QRCode.toCanvas(canvas, targetUrl || window.location.origin + "/app", {
    width: size,
    margin: 2,
    errorCorrectionLevel: options.errorLevel || "H",
    color: {
      dark: options.color || "#1A4D3A",
      light: options.bgColor === "transparent" ? "#00000000" : options.bgColor || "#FFFFFF",
    },
  });

  if (options.includeLogo) {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      await new Promise((resolve) => {
        const logo = new Image();
        logo.src = "/Crispy-Dosalogo.png";

        const drawLogo = (imgElement) => {
          const logoDiameter = size * 0.22;
          const center = size / 2;

          ctx.save();
          // White circular base
          ctx.beginPath();
          ctx.arc(center, center, logoDiameter / 2 + size * 0.012, 0, Math.PI * 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.fill();

          // Gold border
          ctx.lineWidth = Math.max(2, size * 0.008);
          ctx.strokeStyle = "#D4AF37";
          ctx.stroke();

          if (imgElement && imgElement.naturalWidth > 0) {
            ctx.beginPath();
            ctx.arc(center, center, logoDiameter / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(
              imgElement,
              center - logoDiameter / 2,
              center - logoDiameter / 2,
              logoDiameter,
              logoDiameter
            );
          } else {
            // Elegant fallback badge
            ctx.beginPath();
            ctx.arc(center, center, logoDiameter / 2, 0, Math.PI * 2);
            ctx.fillStyle = "#1A4D3A";
            ctx.fill();
            ctx.fillStyle = "#D4AF37";
            ctx.font = `bold ${Math.round(logoDiameter * 0.24)}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("Crispy Dosa", center, center);
          }
          ctx.restore();
          resolve();
        };

        if (logo.complete && logo.naturalWidth > 0) {
          drawLogo(logo);
        } else {
          logo.onload = () => drawLogo(logo);
          logo.onerror = () => drawLogo(null);
          setTimeout(() => drawLogo(null), 800);
        }
      });
    }
  }

  return canvas.toDataURL("image/png");
}

/**
 * Generates Branded Marketing Standee Card data URL with Crispy Dosa branding & app badges
 */
async function generateCardDataUrl(qrDataUrl, targetUrl, content, scale = 1) {
  const cWidth = Math.round(600 * scale);
  const cHeight = Math.round(820 * scale);
  const canvas = document.createElement("canvas");
  canvas.width = cWidth;
  canvas.height = cHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return qrDataUrl;

  // Background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, cWidth, cHeight);

  // Outer Gold Border
  ctx.strokeStyle = "#D4AF37";
  ctx.lineWidth = 3 * scale;
  drawRoundedRect(ctx, 4 * scale, 4 * scale, cWidth - 8 * scale, cHeight - 8 * scale, 18 * scale);
  ctx.stroke();

  // Header Banner (Crispy Emerald: #1A4D3A)
  ctx.fillStyle = "#1A4D3A";
  drawRoundedRect(ctx, 4 * scale, 4 * scale, cWidth - 8 * scale, 125 * scale, 16 * scale);
  ctx.fill();
  ctx.fillRect(4 * scale, 85 * scale, cWidth - 8 * scale, 43 * scale);

  // Gold Trim Line
  ctx.fillStyle = "#D4AF37";
  ctx.fillRect(4 * scale, 128 * scale, cWidth - 8 * scale, 5 * scale);

  // Header Title
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${Math.round(30 * scale)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(content.brandName || "CRISPY DOSA", cWidth / 2, 62 * scale);

  ctx.fillStyle = "#E2E8F0";
  ctx.font = `${Math.round(13 * scale)}px sans-serif`;
  ctx.fillText(content.brandTagline || "Authentic South Indian Cuisine · London & UK", cWidth / 2, 94 * scale);

  ctx.fillStyle = "#F5DE88";
  ctx.font = `bold ${Math.round(11 * scale)}px sans-serif`;
  ctx.fillText("AVAILABLE ON APPLE APP STORE & GOOGLE PLAY", cWidth / 2, 116 * scale);

  // Standee Call to Action
  ctx.fillStyle = "#1A4D3A";
  ctx.font = `bold ${Math.round(20 * scale)}px sans-serif`;
  ctx.fillText(content.cardTitle || "SCAN TO DOWNLOAD OUR APP", cWidth / 2, 180 * scale);

  ctx.fillStyle = "#4B6B5B";
  ctx.font = `${Math.round(13 * scale)}px sans-serif`;
  ctx.fillText(content.cardSubtitle || "Point your phone camera to download on iOS & Android", cWidth / 2, 206 * scale);

  // QR Container Box
  const qrSize = Math.round(340 * scale);
  const qrX = Math.round((cWidth - qrSize) / 2);
  const qrY = Math.round(230 * scale);

  ctx.fillStyle = "#FFFFFF";
  drawRoundedRect(ctx, qrX - 12 * scale, qrY - 12 * scale, qrSize + 24 * scale, qrSize + 24 * scale, 16 * scale);
  ctx.fill();
  ctx.strokeStyle = "#D4AF37";
  ctx.lineWidth = 2 * scale;
  ctx.stroke();

  // Draw QR Image
  await new Promise((resolve) => {
    const qrImg = new Image();
    qrImg.onload = () => {
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      resolve();
    };
    qrImg.onerror = () => resolve();
    qrImg.src = qrDataUrl;
  });

  // App Store Badges Pill Representation
  const badgeY = qrY + qrSize + 24 * scale;
  
  // iOS Badge Pill
  ctx.fillStyle = "#1A1A1A";
  drawRoundedRect(ctx, cWidth / 2 - 170 * scale, badgeY, 160 * scale, 34 * scale, 8 * scale);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${Math.round(11 * scale)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("Download on App Store", cWidth / 2 - 90 * scale, badgeY + 21 * scale);

  // Android Badge Pill
  ctx.fillStyle = "#1A1A1A";
  drawRoundedRect(ctx, cWidth / 2 + 10 * scale, badgeY, 160 * scale, 34 * scale, 8 * scale);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${Math.round(11 * scale)}px sans-serif`;
  ctx.fillText("GET IT ON Google Play", cWidth / 2 + 90 * scale, badgeY + 21 * scale);

  // URL Display
  ctx.fillStyle = "#1A4D3A";
  ctx.font = `bold ${Math.round(14 * scale)}px sans-serif`;
  ctx.fillText(targetUrl, cWidth / 2, badgeY + 62 * scale);

  // Promotional Highlights Ribbon
  ctx.fillStyle = "#FFFBEB";
  drawRoundedRect(ctx, 24 * scale, badgeY + 76 * scale, cWidth - 48 * scale, 30 * scale, 8 * scale);
  ctx.fill();
  ctx.strokeStyle = "#D4AF37";
  ctx.lineWidth = 1 * scale;
  ctx.stroke();

  ctx.fillStyle = "#92400E";
  ctx.font = `bold ${Math.round(11 * scale)}px sans-serif`;
  ctx.fillText(
    content.promoRibbon || "★ 100% PURE VEG · EXCLUSIVE APP DISCOUNTS · FAST DELIVERY ★",
    cWidth / 2,
    badgeY + 95 * scale
  );

  // Footer bar
  ctx.fillStyle = "#1A4D3A";
  drawRoundedRect(ctx, 4 * scale, cHeight - 48 * scale, cWidth - 8 * scale, 44 * scale, 14 * scale);
  ctx.fill();
  ctx.fillRect(4 * scale, cHeight - 48 * scale, cWidth - 8 * scale, 20 * scale);

  ctx.fillStyle = "#D4AF37";
  ctx.fillRect(4 * scale, cHeight - 48 * scale, cWidth - 8 * scale, 2 * scale);

  ctx.fillStyle = "#E2E8F0";
  ctx.font = `${Math.round(11 * scale)}px sans-serif`;
  ctx.fillText(
    content.footerText || "Fast London-Wide Scheduled Delivery · crispydosa.co.uk",
    cWidth / 2,
    cHeight - 20 * scale
  );

  return canvas.toDataURL("image/png");
}

export default function AppQrCode() {
  const { showPopup } = usePopup();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Redirect Targets & URLs
  const smartDefaultLanding = typeof window !== "undefined" ? `${window.location.origin}/app` : "https://crispydosa.co.uk/app";
  const [targetMode, setTargetMode] = useState("smart"); // 'smart' | 'android' | 'ios' | 'custom'
  const [customUrl, setCustomUrl] = useState(smartDefaultLanding);
  const [smartLandingUrl, setSmartLandingUrl] = useState(smartDefaultLanding);
  const [androidUrl, setAndroidUrl] = useState(defaultSettings.androidUrl);
  const [iosUrl, setIosUrl] = useState(defaultSettings.iosUrl);
  const [autoRedirectMobile, setAutoRedirectMobile] = useState(false);

  // Content Customization
  const [content, setContent] = useState({
    brandName: defaultSettings.brandName,
    brandTagline: defaultSettings.brandTagline,
    cardTitle: defaultSettings.cardTitle,
    cardSubtitle: defaultSettings.cardSubtitle,
    promoRibbon: defaultSettings.promoRibbon,
    footerText: defaultSettings.footerText,
  });

  // Visual Styling Customization
  const [qrColor, setQrColor] = useState("#1A4D3A");
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [includeLogo, setIncludeLogo] = useState(true);
  const [errorLevel, setErrorLevel] = useState("H");
  const [previewMode, setPreviewMode] = useState("card"); // 'card' | 'clean' | 'mobile'
  const [downloadSize, setDownloadSize] = useState(1024);
  const [downloadingFormat, setDownloadingFormat] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Active Target URL calculated from mode
  const activeTargetUrl =
    targetMode === "smart"
      ? smartLandingUrl
      : targetMode === "android"
      ? androidUrl
      : targetMode === "ios"
      ? iosUrl
      : customUrl;

  // Previews as data URLs
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [cardDataUrl, setCardDataUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(true);

  // Load existing configuration from Firestore
  useEffect(() => {
    async function loadSettings() {
      try {
        setIsLoadingSettings(true);
        const docRef = doc(db, "settings", "app_links");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.android_url) setAndroidUrl(data.android_url);
          if (data.ios_url) setIosUrl(data.ios_url);
          if (data.smart_landing_url) setSmartLandingUrl(data.smart_landing_url);
          if (data.target_mode) setTargetMode(data.target_mode);
          if (data.custom_url) setCustomUrl(data.custom_url);
          if (data.qr_color) setQrColor(data.qr_color);
          if (data.bg_color) setBgColor(data.bg_color);
          if (typeof data.include_logo === "boolean") setIncludeLogo(data.include_logo);
          if (data.auto_redirect_mobile) setAutoRedirectMobile(data.auto_redirect_mobile);
          if (data.content) {
            setContent((prev) => ({ ...prev, ...data.content }));
          }
        }
      } catch (err) {
        console.warn("Using default settings", err);
      } finally {
        setIsLoadingSettings(false);
      }
    }
    loadSettings();
  }, []);

  // Generate previews whenever settings change
  useEffect(() => {
    let isCancelled = false;
    setIsGenerating(true);

    const generatePreviews = async () => {
      try {
        const qrUrl = await generateQRDataUrl(activeTargetUrl, {
          color: qrColor,
          bgColor,
          includeLogo,
          errorLevel,
          size: 512,
        });

        if (isCancelled) return;
        setQrDataUrl(qrUrl);

        const cardUrl = await generateCardDataUrl(qrUrl, activeTargetUrl, content, 1);
        if (isCancelled) return;
        setCardDataUrl(cardUrl);
      } catch (err) {
        console.error("Error generating previews:", err);
      } finally {
        if (!isCancelled) {
          setIsGenerating(false);
        }
      }
    };

    generatePreviews();

    return () => {
      isCancelled = true;
    };
  }, [activeTargetUrl, qrColor, bgColor, includeLogo, errorLevel, content]);

  // Save Settings & Links to Firestore
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const docRef = doc(db, "settings", "app_links");
      await setDoc(
        docRef,
        {
          android_url: androidUrl,
          ios_url: iosUrl,
          smart_landing_url: smartLandingUrl,
          target_mode: targetMode,
          custom_url: customUrl,
          qr_color: qrColor,
          bg_color: bgColor,
          include_logo: includeLogo,
          auto_redirect_mobile: autoRedirectMobile,
          content,
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );

      showPopup({
        title: "Settings Saved",
        message: "Application store links and QR configuration saved to cloud successfully!",
        type: "success",
      });
    } catch (e) {
      console.error(e);
      showPopup({
        title: "Save Failed",
        message: "Failed to save settings: " + (e.message || "Unknown error"),
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 1. Download as PNG
  const handleDownloadPng = async (isStandeeCard) => {
    try {
      setDownloadingFormat(isStandeeCard ? "png-card" : "png-clean");

      let downloadDataUrl = "";
      if (!isStandeeCard) {
        downloadDataUrl = await generateQRDataUrl(activeTargetUrl, {
          color: qrColor,
          bgColor,
          includeLogo,
          errorLevel,
          size: downloadSize,
        });
      } else {
        const baseQr = await generateQRDataUrl(activeTargetUrl, {
          color: qrColor,
          bgColor,
          includeLogo,
          errorLevel,
          size: Math.round(downloadSize * 0.6),
        });
        downloadDataUrl = await generateCardDataUrl(
          baseQr,
          activeTargetUrl,
          content,
          downloadSize / 600
        );
      }

      const link = document.createElement("a");
      link.download = isStandeeCard
        ? `crispy-dosa-standee-qr-${downloadSize}px.png`
        : `crispy-dosa-app-qr-${downloadSize}px.png`;
      link.href = downloadDataUrl;
      link.click();

      showPopup({
        title: "Download Started",
        message: isStandeeCard
          ? "Branded QR Standee Card downloaded successfully!"
          : "High-resolution Pure QR Code downloaded!",
        type: "success",
      });
    } catch (e) {
      console.error(e);
      showPopup({
        title: "Download Error",
        message: "Failed to generate PNG image.",
        type: "error",
      });
    } finally {
      setDownloadingFormat(null);
    }
  };

  // 2. Download as SVG
  const handleDownloadSvg = async () => {
    try {
      setDownloadingFormat("svg");
      const svgString = await QRCode.toString(activeTargetUrl || window.location.origin + "/app", {
        type: "svg",
        margin: 2,
        errorCorrectionLevel: errorLevel,
        color: {
          dark: qrColor,
          light: bgColor === "transparent" ? "#00000000" : bgColor,
        },
      });

      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = "crispy-dosa-app-qr-vector.svg";
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);

      showPopup({
        title: "Vector Downloaded",
        message: "Vector SVG QR code downloaded for print shops!",
        type: "success",
      });
    } catch (e) {
      console.error(e);
      showPopup({
        title: "SVG Generation Failed",
        message: "Could not generate vector SVG.",
        type: "error",
      });
    } finally {
      setDownloadingFormat(null);
    }
  };

  // 3. Download A4 Flyer PDF
  const handleDownloadFlyerPdf = async () => {
    try {
      setDownloadingFormat("pdf-flyer");
      const qrForPdf = await generateQRDataUrl(activeTargetUrl, {
        color: qrColor,
        bgColor: "#FFFFFF",
        includeLogo,
        errorLevel,
        size: 1024,
      });

      await generateQRCodeFlyerPdf({
        qrDataUrl: qrForPdf,
        targetUrl: activeTargetUrl,
        brandName: content.brandName,
        brandTagline: content.brandTagline,
        title: content.cardTitle,
        subtitle: content.cardSubtitle,
        promoTagline: content.promoRibbon,
        footerText: content.footerText,
        filename: "crispy-dosa-app-promotional-flyer-a4.pdf",
      });

      showPopup({
        title: "PDF Ready",
        message: "Print-ready A4 promotional flyer PDF downloaded!",
        type: "success",
      });
    } catch (e) {
      console.error(e);
      showPopup({
        title: "PDF Error",
        message: "Failed to generate A4 Flyer PDF.",
        type: "error",
      });
    } finally {
      setDownloadingFormat(null);
    }
  };

  // 4. Download Standee / Tent Card PDF
  const handleDownloadStandeePdf = async () => {
    try {
      setDownloadingFormat("pdf-standee");
      const qrForPdf = await generateQRDataUrl(activeTargetUrl, {
        color: qrColor,
        bgColor: "#FFFFFF",
        includeLogo,
        errorLevel,
        size: 1024,
      });

      await generateQRCodeStandeePdf({
        qrDataUrl: qrForPdf,
        targetUrl: activeTargetUrl,
        brandName: content.brandName,
        title: content.cardTitle,
        subtitle: content.cardSubtitle,
        filename: "crispy-dosa-table-standee-a5.pdf",
      });

      showPopup({
        title: "PDF Ready",
        message: "Print-ready Table Standee Tent Card PDF downloaded!",
        type: "success",
      });
    } catch (e) {
      console.error(e);
      showPopup({
        title: "PDF Error",
        message: "Failed to generate Standee PDF.",
        type: "error",
      });
    } finally {
      setDownloadingFormat(null);
    }
  };

  // 5. Copy PNG to Clipboard
  const handleCopyImage = async () => {
    try {
      const dataUrl = previewMode === "card" ? cardDataUrl : qrDataUrl;
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);
      setCopiedImage(true);
      showPopup({
        title: "Image Copied",
        message: "QR code image copied to clipboard. Ready to paste into WhatsApp, Slack or Canva!",
        type: "success",
      });
      setTimeout(() => setCopiedImage(false), 2500);
    } catch (clipErr) {
      showPopup({
        title: "Clipboard Restricted",
        message: "Browser blocked clipboard copy. Please use the Download button instead.",
        type: "info",
      });
    }
  };

  // 6. Copy Target URL
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(activeTargetUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // 7. Instant Print
  const handlePrint = () => {
    const dataUrl = previewMode === "card" ? cardDataUrl : qrDataUrl;
    const printWin = window.open("", "_blank");
    if (!printWin) {
      showPopup({
        title: "Popup Blocked",
        message: "Please allow popups to open the print dialog.",
        type: "info",
      });
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Crispy Dosa QR Code</title>
          <style>
            @page {
              size: auto;
              margin: 15mm;
            }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              text-align: center;
              margin: 0;
              padding: 20px;
              color: #1A4D3A;
            }
            img {
              max-width: 90%;
              max-height: 80vh;
              object-fit: contain;
              border-radius: 8px;
            }
            .info {
              margin-top: 15px;
              font-size: 14px;
              font-weight: 700;
            }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" alt="Crispy Dosa App QR Code" />
          <div class="info">Target: ${activeTargetUrl} · Available on iOS App Store & Google Play</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-teal-800 to-emerald-900 font-sans text-white">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} darkMode={true} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main
        className={`pt-36 lg:pt-24 pb-16 px-4 sm:px-6 transition-all duration-300 ease-in-out ${
          sidebarOpen ? "lg:pl-80 lg:pr-8" : "lg:pl-8 lg:pr-8"
        }`}
      >
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Hero Header Banner */}
          <div className="bg-gradient-to-r from-[#1A4D3A]/90 via-[#23634B]/80 to-[#8B1538]/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 bg-[#D4AF37] text-black text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                  <Sparkles size={14} className="text-black" />
                  Mobile App Marketing Studio
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-lg flex items-center gap-3">
                  <QrCode size={30} className="text-[#D4AF37]" />
                  App QR Code Generator
                </h1>
                <p className="text-sm sm:text-base text-emerald-100/90 max-w-2xl leading-relaxed">
                  Generate print-ready QR codes for table tents, counters, and posters. When customers scan,
                  they are instantly redirected to download the Crispy Dosa app for both <strong className="text-[#F5DE88]">iOS & Android</strong>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={activeTargetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all inline-flex items-center gap-2 backdrop-blur-md border border-white/20 active:scale-95 shadow-md"
                >
                  <ExternalLink size={15} className="text-[#D4AF37]" />
                  Test Destination Link
                </a>
                <button
                  onClick={handlePrint}
                  className="bg-[#D4AF37] hover:bg-[#c29f2f] text-black font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg inline-flex items-center gap-2 active:scale-95"
                >
                  <Printer size={15} />
                  Quick Print
                </button>
              </div>
            </div>
          </div>

          {/* Studio Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: Controls & Flexibility Tabs (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* 1. App Redirection & Links Configuration */}
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h3 className="font-extrabold text-base text-white tracking-wide flex items-center gap-2.5">
                    <Smartphone size={20} className="text-[#D4AF37]" />
                    1. App Store Links & Redirection
                  </h3>
                  <button
                    onClick={() => {
                      setAndroidUrl(defaultSettings.androidUrl);
                      setIosUrl(defaultSettings.iosUrl);
                      setSmartLandingUrl(smartDefaultLanding);
                      setTargetMode("smart");
                    }}
                    className="text-xs text-[#D4AF37] hover:text-yellow-300 font-semibold inline-flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw size={12} />
                    Reset Defaults
                  </button>
                </div>

                {/* Target Mode Selector Tabs */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider block">
                    Choose QR Scanning Destination:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setTargetMode("smart")}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        targetMode === "smart"
                          ? "bg-[#1A4D3A] border-[#D4AF37] ring-2 ring-[#D4AF37]/30 shadow-lg"
                          : "bg-white/5 border-white/10 hover:bg-white/10 text-white/80"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-white flex items-center gap-1.5">
                          🌟 Smart Redirect Page
                        </span>
                        {targetMode === "smart" && <Check size={14} className="text-[#D4AF37]" />}
                      </div>
                      <span className="text-[11px] text-white/60 mt-1">
                        Shows both iOS & Android download options + auto-detection.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetMode("android")}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        targetMode === "android"
                          ? "bg-[#1A4D3A] border-[#D4AF37] ring-2 ring-[#D4AF37]/30 shadow-lg"
                          : "bg-white/5 border-white/10 hover:bg-white/10 text-white/80"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-white">
                          🤖 Direct Google Play
                        </span>
                        {targetMode === "android" && <Check size={14} className="text-[#D4AF37]" />}
                      </div>
                      <span className="text-[11px] text-white/60 mt-1">
                        Scans jump directly into Android Google Play Store.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetMode("ios")}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        targetMode === "ios"
                          ? "bg-[#1A4D3A] border-[#D4AF37] ring-2 ring-[#D4AF37]/30 shadow-lg"
                          : "bg-white/5 border-white/10 hover:bg-white/10 text-white/80"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-white">
                          🍏 Direct Apple App Store
                        </span>
                        {targetMode === "ios" && <Check size={14} className="text-[#D4AF37]" />}
                      </div>
                      <span className="text-[11px] text-white/60 mt-1">
                        Scans jump directly into Apple App Store for iPhones.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetMode("custom")}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        targetMode === "custom"
                          ? "bg-[#1A4D3A] border-[#D4AF37] ring-2 ring-[#D4AF37]/30 shadow-lg"
                          : "bg-white/5 border-white/10 hover:bg-white/10 text-white/80"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-white">
                          🔗 Custom Web Link
                        </span>
                        {targetMode === "custom" && <Check size={14} className="text-[#D4AF37]" />}
                      </div>
                      <span className="text-[11px] text-white/60 mt-1">
                        Provide any custom promotion or menu URL.
                      </span>
                    </button>
                  </div>
                </div>

                {/* Active Encoded QR Destination URL */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/90 uppercase tracking-wider block">
                    Active QR Code Target URL:
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={activeTargetUrl}
                      onChange={(e) => {
                        if (targetMode === "smart") setSmartLandingUrl(e.target.value);
                        else if (targetMode === "android") setAndroidUrl(e.target.value);
                        else if (targetMode === "ios") setIosUrl(e.target.value);
                        else setCustomUrl(e.target.value);
                      }}
                      className="w-full bg-white/10 border-2 border-white/20 rounded-xl pl-4 pr-24 py-3 text-sm font-semibold text-white focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-mono"
                    />
                    <button
                      onClick={handleCopyUrl}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 active:scale-95"
                    >
                      {copiedUrl ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      {copiedUrl ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Individual Store URL Inputs */}
                <div className="space-y-4 pt-2 border-t border-white/10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* iOS URL */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-emerald-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        Apple iOS App Store Link:
                      </label>
                      <input
                        type="url"
                        value={iosUrl}
                        onChange={(e) => setIosUrl(e.target.value)}
                        placeholder="https://apps.apple.com/app/..."
                        className="w-full bg-white/5 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    {/* Android URL */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-emerald-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        Android Google Play Link:
                      </label>
                      <input
                        type="url"
                        value={androidUrl}
                        onChange={(e) => setAndroidUrl(e.target.value)}
                        placeholder="https://play.google.com/store/apps/..."
                        className="w-full bg-white/5 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>

                  {/* Smart Landing URL (optional custom domain override) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white/80 flex items-center justify-between">
                      <span>Smart Landing Page Base URL:</span>
                      <span className="text-[11px] text-white/50 font-normal">
                        (Host on your domain: e.g. crispydosa.co.uk/app)
                      </span>
                    </label>
                    <input
                      type="url"
                      value={smartLandingUrl}
                      onChange={(e) => setSmartLandingUrl(e.target.value)}
                      placeholder={smartDefaultLanding}
                      className="w-full bg-white/5 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  {/* Auto-Redirect Mobile Checkbox */}
                  <div className="flex items-center justify-between p-3.5 bg-white/5 border border-white/10 rounded-xl">
                    <div className="space-y-0.5 pr-4">
                      <p className="text-xs font-bold text-white">
                        Auto-Redirect to Store on Mobile Scans
                      </p>
                      <p className="text-[11px] text-white/60">
                        When enabled, iPhones automatically redirect to App Store, and Android phones to Google Play.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={autoRedirectMobile}
                        onChange={(e) => setAutoRedirectMobile(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D4AF37]"></div>
                    </label>
                  </div>

                  {/* Save to Cloud Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleSaveSettings}
                      disabled={isSaving}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Save size={15} />
                      {isSaving ? "Saving to Cloud..." : "Save Links to Cloud Database"}
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Visual Design & Style Customization */}
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-6 space-y-5">
                <h3 className="font-extrabold text-base text-white tracking-wide flex items-center gap-2.5 border-b border-white/10 pb-4">
                  <Palette size={20} className="text-[#D4AF37]" />
                  2. Visual QR Code & Logo Design
                </h3>

                {/* Logo in Center Toggle */}
                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="space-y-0.5">
                    <div className="font-bold text-sm text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]" />
                      Embed Official Crispy Dosa Logo in Center
                    </div>
                    <p className="text-xs text-white/60">
                      Renders official Crispy Dosa logo with gold rim & high error tolerance.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={includeLogo}
                      onChange={(e) => setIncludeLogo(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D4AF37]"></div>
                  </label>
                </div>

                {/* QR Code Foreground Color */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-emerald-200 uppercase tracking-wide">
                    QR Foreground Color
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {colorPresets.map((preset) => (
                      <button
                        key={preset.color}
                        onClick={() => setQrColor(preset.color)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                          qrColor === preset.color
                            ? "border-[#D4AF37] bg-white/20 text-white shadow-md ring-2 ring-[#D4AF37]/30"
                            : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: preset.color }}
                        />
                        {preset.name}
                      </button>
                    ))}
                    {/* Custom Color Picker */}
                    <div className="flex items-center gap-2 border border-white/20 rounded-xl px-2.5 py-1 bg-white/10">
                      <input
                        type="color"
                        value={qrColor}
                        onChange={(e) => setQrColor(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
                        title="Pick custom hex color"
                      />
                      <span className="text-xs font-mono font-bold text-white uppercase">{qrColor}</span>
                    </div>
                  </div>
                </div>

                {/* QR Code Background Color */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-emerald-200 uppercase tracking-wide">
                    QR Background Color
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {bgPresets.map((preset) => (
                      <button
                        key={preset.color}
                        onClick={() => setBgColor(preset.color)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                          bgColor === preset.color
                            ? "border-[#D4AF37] bg-white/20 text-white shadow-md ring-2 ring-[#D4AF37]/30"
                            : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: preset.color }}
                        />
                        {preset.name}
                      </button>
                    ))}
                    <button
                      onClick={() => setBgColor("transparent")}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        bgColor === "transparent"
                          ? "border-[#D4AF37] bg-white/20 text-white shadow-md ring-2 ring-[#D4AF37]/30"
                          : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      Transparent (Vector/Overlay)
                    </button>
                  </div>
                </div>

                {/* Error Level & Export Resolution */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white/80">Error Correction Level:</label>
                    <select
                      value={errorLevel}
                      onChange={(e) => setErrorLevel(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    >
                      <option value="H" className="bg-slate-900 text-white">High (30% - Best with Logo)</option>
                      <option value="Q" className="bg-slate-900 text-white">Quartile (25%)</option>
                      <option value="M" className="bg-slate-900 text-white">Medium (15%)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white/80">PNG Export Resolution:</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { size: 512, label: "512px", sub: "Web" },
                        { size: 1024, label: "1024px", sub: "HD" },
                        { size: 2048, label: "2048px", sub: "300 DPI" },
                      ].map((s) => (
                        <button
                          key={s.size}
                          onClick={() => setDownloadSize(s.size)}
                          className={`p-2 rounded-xl border text-center transition-all ${
                            downloadSize === s.size
                              ? "bg-[#D4AF37] text-black font-extrabold border-[#D4AF37]"
                              : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 text-xs"
                          }`}
                        >
                          <div className="text-xs">{s.label}</div>
                          <div className="text-[9px] opacity-75">{s.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Standee & Flyer Content Editing */}
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h3 className="font-extrabold text-base text-white tracking-wide flex items-center gap-2.5">
                    <Type size={20} className="text-[#D4AF37]" />
                    3. Standee Card & Flyer Text
                  </h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setContent({
                          brandName: "CRISPY DOSA",
                          brandTagline: "Authentic South Indian Cuisine · London & UK",
                          cardTitle: "GET 15% OFF YOUR FIRST ORDER",
                          cardSubtitle: "Download our official mobile app on iOS & Android",
                          promoRibbon: "★ USE PROMO CODE: WELCOME15 ON APP CHECKOUT ★",
                          footerText: "Fast London-Wide Delivery · crispydosa.co.uk",
                        })
                      }
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition"
                    >
                      Preset: 15% Off Promo
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setContent({
                          brandName: "CRISPY DOSA",
                          brandTagline: "Authentic South Indian Cuisine · London & UK",
                          cardTitle: "JOIN OUR REWARDS & LOYALTY CLUB",
                          cardSubtitle: "Earn points on every order & unlock free dosas",
                          promoRibbon: "★ EARN 10 POINTS FOR EVERY £1 SPENT ★",
                          footerText: "Fast London-Wide Delivery · crispydosa.co.uk",
                        })
                      }
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition"
                    >
                      Preset: Loyalty Club
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/80">Brand Name Header:</label>
                    <input
                      type="text"
                      value={content.brandName}
                      onChange={(e) => setContent((c) => ({ ...c, brandName: e.target.value }))}
                      className="w-full bg-white/5 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/80">Header Subtitle:</label>
                    <input
                      type="text"
                      value={content.brandTagline}
                      onChange={(e) => setContent((c) => ({ ...c, brandTagline: e.target.value }))}
                      className="w-full bg-white/5 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/80">Main Headline Title:</label>
                    <input
                      type="text"
                      value={content.cardTitle}
                      onChange={(e) => setContent((c) => ({ ...c, cardTitle: e.target.value }))}
                      className="w-full bg-white/5 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/80">Call To Action Subtext:</label>
                    <input
                      type="text"
                      value={content.cardSubtitle}
                      onChange={(e) => setContent((c) => ({ ...c, cardSubtitle: e.target.value }))}
                      className="w-full bg-white/5 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-white/80">Highlights Ribbon Banner:</label>
                    <input
                      type="text"
                      value={content.promoRibbon}
                      onChange={(e) => setContent((c) => ({ ...c, promoRibbon: e.target.value }))}
                      className="w-full bg-white/5 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-white/80">Footer Bottom Note:</label>
                    <input
                      type="text"
                      value={content.footerText}
                      onChange={(e) => setContent((c) => ({ ...c, footerText: e.target.value }))}
                      className="w-full bg-white/5 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Download & Export Hub */}
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-6 space-y-4">
                <h3 className="font-extrabold text-base text-white tracking-wide flex items-center gap-2.5 border-b border-white/10 pb-4">
                  <Download size={20} className="text-[#D4AF37]" />
                  4. Download & Print Studio
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Download Standee Card PNG */}
                  <button
                    onClick={() => handleDownloadPng(true)}
                    disabled={downloadingFormat !== null}
                    className="flex items-start gap-3 p-4 rounded-xl border border-white/20 hover:border-[#D4AF37] bg-white/5 hover:bg-white/15 transition-all text-left active:scale-[0.98] disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/30">
                      <ImageIcon size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">Download Standee (.PNG)</div>
                      <div className="text-[11px] text-white/60 mt-0.5">
                        Table standee card with Crispy Dosa header & store badges ({downloadSize}px)
                      </div>
                    </div>
                  </button>

                  {/* Download Pure QR PNG */}
                  <button
                    onClick={() => handleDownloadPng(false)}
                    disabled={downloadingFormat !== null}
                    className="flex items-start gap-3 p-4 rounded-xl border border-white/20 hover:border-[#D4AF37] bg-white/5 hover:bg-white/15 transition-all text-left active:scale-[0.98] disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0 border border-blue-500/30">
                      <QrCode size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">Download Pure QR (.PNG)</div>
                      <div className="text-[11px] text-white/60 mt-0.5">
                        Clean QR code only with logo, ideal for menus, napkins & custom flyers
                      </div>
                    </div>
                  </button>

                  {/* Download A4 Marketing Flyer PDF */}
                  <button
                    onClick={handleDownloadFlyerPdf}
                    disabled={downloadingFormat !== null}
                    className="flex items-start gap-3 p-4 rounded-xl border border-[#D4AF37] bg-[#1A4D3A] hover:bg-[#23634B] text-white transition-all text-left shadow-lg active:scale-[0.98] disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#D4AF37] text-black flex items-center justify-center shrink-0 shadow-md">
                      <FileText size={20} />
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-[#F5DE88]">A4 Marketing Flyer (.PDF)</div>
                      <div className="text-[11px] text-emerald-100/80 mt-0.5">
                        Full-page promotional poster with perks, app store badges & scan instructions
                      </div>
                    </div>
                  </button>

                  {/* Download Table Standee A5 PDF */}
                  <button
                    onClick={handleDownloadStandeePdf}
                    disabled={downloadingFormat !== null}
                    className="flex items-start gap-3 p-4 rounded-xl border border-white/20 hover:border-[#D4AF37] bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 transition-all text-left active:scale-[0.98] disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#D4AF37] text-black flex items-center justify-center shrink-0 shadow-md">
                      <FileText size={20} />
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-white">Table Standee A5 (.PDF)</div>
                      <div className="text-[11px] text-white/70 mt-0.5">
                        Foldable A5 card for restaurant tables, counters & takeout bags
                      </div>
                    </div>
                  </button>

                  {/* Download SVG Vector */}
                  <button
                    onClick={handleDownloadSvg}
                    disabled={downloadingFormat !== null}
                    className="flex items-start gap-3 p-4 rounded-xl border border-white/20 hover:border-[#D4AF37] bg-white/5 hover:bg-white/15 transition-all text-left active:scale-[0.98] disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 border border-purple-500/30">
                      <Layers size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">Vector SVG (.SVG)</div>
                      <div className="text-[11px] text-white/60 mt-0.5">
                        Infinitely scalable vector format for shopfront signage & billboards
                      </div>
                    </div>
                  </button>

                  {/* Copy Image to Clipboard */}
                  <button
                    onClick={handleCopyImage}
                    className="flex items-start gap-3 p-4 rounded-xl border border-white/20 hover:border-[#D4AF37] bg-white/5 hover:bg-white/15 transition-all text-left active:scale-[0.98]"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30">
                      {copiedImage ? <Check size={20} className="text-emerald-400" /> : <Copy size={20} />}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">
                        {copiedImage ? "Copied to Clipboard!" : "Copy Image to Clipboard"}
                      </div>
                      <div className="text-[11px] text-white/60 mt-0.5">
                        Paste instantly into WhatsApp, Slack, emails, or marketing graphics
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Live Interactive Previews (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-6 sticky top-24 space-y-4">
                {/* Preview Mode Selector Tabs */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="font-extrabold text-sm text-white tracking-wider flex items-center gap-2">
                    <Eye size={16} className="text-[#D4AF37]" />
                    Live Visual Preview
                  </h3>
                  <div className="inline-flex p-1 bg-black/40 rounded-xl border border-white/10">
                    <button
                      onClick={() => setPreviewMode("card")}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        previewMode === "card"
                          ? "bg-[#D4AF37] text-black shadow-sm"
                          : "text-white/70 hover:text-white"
                      }`}
                    >
                      Standee
                    </button>
                    <button
                      onClick={() => setPreviewMode("clean")}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        previewMode === "clean"
                          ? "bg-[#D4AF37] text-black shadow-sm"
                          : "text-white/70 hover:text-white"
                      }`}
                    >
                      Pure QR
                    </button>
                    <button
                      onClick={() => setPreviewMode("mobile")}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        previewMode === "mobile"
                          ? "bg-[#D4AF37] text-black shadow-sm"
                          : "text-white/70 hover:text-white"
                      }`}
                    >
                      Phone View
                    </button>
                  </div>
                </div>

                {/* Visual Display Frame */}
                <div className="flex items-center justify-center p-4 bg-black/30 border border-white/10 rounded-2xl min-h-[420px] overflow-hidden">
                  {isGenerating ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-20 text-white/60">
                      <Loader2 className="animate-spin text-[#D4AF37]" size={32} />
                      <span className="text-xs font-semibold">Rendering live preview...</span>
                    </div>
                  ) : previewMode === "card" ? (
                    cardDataUrl ? (
                      <img
                        src={cardDataUrl}
                        alt="Crispy Dosa Standee Card"
                        className="max-w-full h-auto rounded-xl shadow-2xl border border-white/20 object-contain mx-auto"
                        style={{ maxHeight: "440px", aspectRatio: "600/820" }}
                      />
                    ) : null
                  ) : previewMode === "clean" ? (
                    <div className="p-6 bg-white rounded-2xl shadow-2xl border border-white/20 text-center w-full max-w-[320px]">
                      {qrDataUrl && (
                        <img
                          src={qrDataUrl}
                          alt="Crispy Dosa Pure QR"
                          className="w-56 h-56 mx-auto object-contain rounded-lg aspect-square"
                        />
                      )}
                      <div className="text-center mt-3 pt-3 border-t border-gray-200">
                        <p className="font-bold text-xs text-black truncate max-w-[260px] mx-auto">
                          {activeTargetUrl}
                        </p>
                        <p className="text-[11px] text-gray-500 font-medium">Scan with camera to redirect</p>
                      </div>
                    </div>
                  ) : (
                    /* Mobile Phone Simulator */
                    <div className="w-full max-w-[290px] h-[480px] bg-[#12281E] border-4 border-gray-800 rounded-[36px] shadow-2xl p-4 flex flex-col justify-between overflow-hidden relative text-center">
                      {/* Speaker notch */}
                      <div className="w-24 h-4 bg-gray-800 rounded-full mx-auto mb-3" />

                      <div className="space-y-3 flex-1 flex flex-col justify-center">
                        <img
                          src="/Crispy-Dosalogo.png"
                          alt="Logo"
                          className="h-10 mx-auto object-contain drop-shadow"
                        />
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-sm text-white leading-tight">
                            Crispy Dosa App
                          </h4>
                          <p className="text-[10px] text-emerald-200/80">
                            Authentic South Indian Cuisine Delivered
                          </p>
                        </div>

                        {/* Store badges */}
                        <div className="space-y-2 pt-2">
                          <a
                            href={iosUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-black/80 border border-white/20 rounded-xl text-xs font-bold text-white shadow"
                          >
                            <span>Download on App Store</span>
                          </a>
                          <a
                            href={androidUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-black/80 border border-white/20 rounded-xl text-xs font-bold text-white shadow"
                          >
                            <span>GET IT ON Google Play</span>
                          </a>
                        </div>

                        <div className="pt-2 text-[9px] text-[#D4AF37] font-bold">
                          ★ 15% OFF FIRST APP ORDER ★
                        </div>
                      </div>

                      <div className="text-[9px] text-white/40 pt-2 border-t border-white/10">
                        Scan simulation view
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Actions underneath Preview */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => handleDownloadPng(previewMode === "card")}
                    className="w-full bg-[#1A4D3A] hover:bg-[#23634B] text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 border border-white/20"
                  >
                    <Download size={15} />
                    Download Image
                  </button>
                  <button
                    onClick={handleDownloadFlyerPdf}
                    className="w-full bg-[#D4AF37] hover:bg-[#c29f2f] text-black font-extrabold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
                  >
                    <FileText size={15} />
                    Download PDF
                  </button>
                </div>

                {/* Destination verification card */}
                <div className="p-3.5 bg-black/40 rounded-xl border border-white/10 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-white/80">Active QR Scan Destination:</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={13} /> Active
                    </span>
                  </div>
                  <div className="truncate text-[11px] text-[#D4AF37] font-mono bg-white/5 p-1.5 rounded-lg border border-white/5">
                    {activeTargetUrl}
                  </div>
                  <p className="text-[10px] text-white/50 leading-relaxed pt-0.5">
                    Scanning with any iPhone or Android camera automatically leads customers to this destination.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
