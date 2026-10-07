import React, { useEffect, useState } from "react";
import { 
  Smartphone, 
  Download, 
  Star, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  ExternalLink, 
  CheckCircle2, 
  Flame, 
  ArrowRight,
  Share2,
  UtensilsCrossed
} from "lucide-react";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

const DEFAULT_IOS_URL = "https://apps.apple.com/app/crispy-dosa/id6475839201";
const DEFAULT_ANDROID_URL = "https://play.google.com/store/apps/details?id=com.crispydosa";

export default function AppLanding() {
  const [deviceType, setDeviceType] = useState("unknown"); // 'ios' | 'android' | 'desktop'
  const [iosUrl, setIosUrl] = useState(DEFAULT_IOS_URL);
  const [androidUrl, setAndroidUrl] = useState(DEFAULT_ANDROID_URL);
  const [autoRedirectEnabled, setAutoRedirectEnabled] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isCancelled, setIsCancelled] = useState(false);
  const [copied, setCopied] = useState(false);

  // 1. Detect Device
  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || window.opera || "";
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
      setDeviceType("ios");
    } else if (/android/i.test(ua)) {
      setDeviceType("android");
    } else {
      setDeviceType("desktop");
    }
  }, []);

  // 2. Fetch configured links from Firestore
  useEffect(() => {
    async function loadAppLinks() {
      try {
        const docRef = doc(db, "settings", "app_links");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.ios_url) setIosUrl(data.ios_url);
          if (data.android_url) setAndroidUrl(data.android_url);
          if (data.auto_redirect_mobile === true) {
            // Only auto-redirect if specifically configured
            setAutoRedirectEnabled(true);
          }
        }
      } catch (e) {
        console.warn("Using default app store links", e);
      }
    }
    loadAppLinks();
  }, []);

  // 3. Handle Auto-Redirect if enabled
  useEffect(() => {
    if (!autoRedirectEnabled || isCancelled) return;
    if (deviceType !== "ios" && deviceType !== "android") return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      const target = deviceType === "ios" ? iosUrl : androidUrl;
      if (target) {
        window.location.href = target;
      }
    }
  }, [countdown, autoRedirectEnabled, isCancelled, deviceType, iosUrl, androidUrl]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "Download Crispy Dosa Mobile App",
        text: "Order authentic South Indian food & get exclusive discounts!",
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentDeviceTarget = deviceType === "ios" ? iosUrl : androidUrl;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#12281E] via-[#1A4D3A] to-[#450A1A] text-white flex flex-col justify-between selection:bg-[#D4AF37] selection:text-black font-sans relative overflow-x-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-[#D4AF37]/15 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#1A4D3A]/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-20 w-80 h-80 bg-[#8B1538]/30 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/Crispy-Dosalogo.png"
            alt="Crispy Dosa"
            className="h-12 w-auto object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
          />
          <div className="hidden sm:block">
            <span className="text-lg font-extrabold tracking-tight text-white block leading-none">
              CRISPY DOSA
            </span>
            <span className="text-[11px] font-semibold text-[#D4AF37] tracking-wider uppercase">
              Official Mobile App
            </span>
          </div>
        </div>

        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md text-xs font-bold transition-all active:scale-95 text-white/90"
        >
          <Share2 size={14} className="text-[#D4AF37]" />
          <span>{copied ? "Link Copied!" : "Share App"}</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-xl mx-auto px-4 py-6 w-full text-center flex-1 flex flex-col justify-center">
        {/* Brand Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#F5DE88] text-xs font-bold uppercase tracking-wider mx-auto mb-4 backdrop-blur-md shadow-lg">
          <Sparkles size={13} className="text-[#D4AF37]" />
          Official Mobile Application
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-md leading-tight mb-3">
          Authentic South Indian Food <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F5DE88] via-[#D4AF37] to-[#F1C40F]">
            At Your Fingertips
          </span>
        </h1>

        <p className="text-sm sm:text-base text-emerald-100/80 max-w-md mx-auto mb-6 leading-relaxed">
          Order hot, crispy dosas, fresh idlis, and gourmet vegetarian curries. Enjoy fast delivery, exclusive discounts, and live tracking.
        </p>

        {/* Auto-Redirect Alert Banner (if auto-forward is active on mobile) */}
        {autoRedirectEnabled && (deviceType === "ios" || deviceType === "android") && !isCancelled && (
          <div className="mb-6 p-4 rounded-2xl bg-black/40 border border-[#D4AF37]/50 backdrop-blur-xl shadow-xl animate-fadeIn">
            <div className="flex items-center justify-between gap-3 text-left">
              <div>
                <p className="text-xs font-extrabold text-[#D4AF37] uppercase tracking-wider">
                  Redirecting to {deviceType === "ios" ? "App Store" : "Google Play"} in {countdown}s
                </p>
                <p className="text-xs text-white/80 mt-0.5">
                  Opening official Crispy Dosa app page...
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={currentDeviceTarget}
                  className="px-3 py-1.5 rounded-lg bg-[#D4AF37] text-black text-xs font-extrabold hover:bg-yellow-400 transition"
                >
                  Open Now
                </a>
                <button
                  onClick={() => setIsCancelled(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs font-semibold hover:bg-white/20 transition"
                >
                  Stay
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Download Buttons Section */}
        <div className="space-y-3.5 mb-8">
          {/* iOS App Store Button */}
          <a
            href={iosUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full group flex items-center justify-between p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 backdrop-blur-xl shadow-xl active:scale-[0.98] ${
              deviceType === "ios"
                ? "bg-white/20 border-[#D4AF37] ring-4 ring-[#D4AF37]/20 shadow-[#D4AF37]/10"
                : "bg-black/40 hover:bg-black/60 border-white/20 hover:border-white/40"
            }`}
          >
            <div className="flex items-center gap-4 text-left">
              {/* Apple Icon */}
              <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center shrink-0 border border-white/20 shadow-inner group-hover:scale-105 transition-transform">
                <svg className="w-7 h-7 text-white fill-current" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-6.41-9.78-11.41-20.97-15-33.56-3.59-12.6-5.39-24.64-5.39-36.13 0-14.43 3.8-26.4 11.41-35.91 7.6-9.52 17.06-14.39 28.38-14.61 4.58 0 9.78 1.25 15.6 3.75 5.82 2.5 9.77 3.8 11.85 3.91 1.74-.11 5.86-1.46 12.37-4.05 6.51-2.59 12.04-3.75 16.59-3.48 12.6.65 22.7 5.17 30.3 13.56-11.08 6.74-16.52 16.03-16.3 27.87.22 9.35 3.85 17.17 10.9 23.47 7.05 6.3 15.42 9.94 25.1 10.92-2.17 6.74-4.78 13.25-7.83 19.54zM119.22 31.84c0-7.17 2.61-13.88 7.82-20.12 5.22-6.25 11.73-10.38 19.54-12.4 1.09 7.39-.76 14.18-5.54 20.37-4.79 6.2-11.19 10.27-19.2 12.22-.54-.07-1.41-.07-2.62-.07z" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/70 leading-none mb-1">
                  Download on the
                </p>
                <p className="text-lg sm:text-xl font-extrabold text-white leading-tight">
                  Apple App Store
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[#D4AF37]">
                  <span className="flex">
                    <Star size={11} className="fill-current text-[#D4AF37]" />
                    <Star size={11} className="fill-current text-[#D4AF37]" />
                    <Star size={11} className="fill-current text-[#D4AF37]" />
                    <Star size={11} className="fill-current text-[#D4AF37]" />
                    <Star size={11} className="fill-current text-[#D4AF37]" />
                  </span>
                  <span className="text-[11px] text-white/60">4.9 · iOS Devices</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[#D4AF37] font-bold text-xs uppercase tracking-wider">
              {deviceType === "ios" && (
                <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-[#D4AF37] text-black font-extrabold text-[10px]">
                  Your Device
                </span>
              )}
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </a>

          {/* Android Google Play Store Button */}
          <a
            href={androidUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full group flex items-center justify-between p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 backdrop-blur-xl shadow-xl active:scale-[0.98] ${
              deviceType === "android"
                ? "bg-white/20 border-[#D4AF37] ring-4 ring-[#D4AF37]/20 shadow-[#D4AF37]/10"
                : "bg-black/40 hover:bg-black/60 border-white/20 hover:border-white/40"
            }`}
          >
            <div className="flex items-center gap-4 text-left">
              {/* Google Play Icon */}
              <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center shrink-0 border border-white/20 shadow-inner group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" viewBox="0 0 512 512">
                  <path fill="#4285F4" d="M47.4 22.8c-4.9 5.3-7.7 13.2-7.7 23.3v419.8c0 10.1 2.8 18 7.7 23.3l1.3 1.3L283.3 256v-5.9L48.7 21.5l-1.3 1.3z"/>
                  <path fill="#FBBC04" d="M362.5 335.2l-79.2-79.2V250l79.2-79.2 1.8 1 93.8 53.3c26.8 15.2 26.8 40.2 0 55.4l-93.8 53.3-1.8 1.4z"/>
                  <path fill="#EA4335" d="M283.3 256L47.4 491.9c8.8 9.3 23.3 10.5 39.7 1.2l237.2-134.8-41-41z"/>
                  <path fill="#34A853" d="M283.3 256l41-41L87.1 80.2c-16.4-9.3-30.9-8.1-39.7 1.2L283.3 256z"/>
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/70 leading-none mb-1">
                  GET IT ON
                </p>
                <p className="text-lg sm:text-xl font-extrabold text-white leading-tight">
                  Google Play Store
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[#D4AF37]">
                  <span className="flex">
                    <Star size={11} className="fill-current text-[#D4AF37]" />
                    <Star size={11} className="fill-current text-[#D4AF37]" />
                    <Star size={11} className="fill-current text-[#D4AF37]" />
                    <Star size={11} className="fill-current text-[#D4AF37]" />
                    <Star size={11} className="fill-current text-[#D4AF37]" />
                  </span>
                  <span className="text-[11px] text-white/60">4.8 · Android Phones</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[#D4AF37] font-bold text-xs uppercase tracking-wider">
              {deviceType === "android" && (
                <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-[#D4AF37] text-black font-extrabold text-[10px]">
                  Your Device
                </span>
              )}
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </a>
        </div>

        {/* Deep Link to Open App if Already Installed */}
        <div className="mb-8">
          <a
            href="crispydosa://open"
            onClick={(e) => {
              // fallback if scheme not installed
              setTimeout(() => {
                // Stay on page
              }, 1200);
            }}
            className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-200/90 hover:text-[#D4AF37] transition-colors py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
          >
            <Smartphone size={14} className="text-[#D4AF37]" />
            Already installed? <span className="underline font-bold text-white">Tap to Open Crispy Dosa App</span>
          </a>
        </div>

        {/* Bento Grid: App Features */}
        <div className="grid grid-cols-2 gap-3 text-left mb-6">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
            <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center mb-2">
              <UtensilsCrossed size={16} />
            </div>
            <h4 className="text-xs font-bold text-white">100% Pure Veg</h4>
            <p className="text-[10px] text-white/60 mt-0.5">Authentic South Indian dosas & curries cooked fresh.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-2">
              <Flame size={16} />
            </div>
            <h4 className="text-xs font-bold text-white">Exclusive Discounts</h4>
            <p className="text-[10px] text-white/60 mt-0.5">Save with special app coupons & loyalty cashback.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center mb-2">
              <Clock size={16} />
            </div>
            <h4 className="text-xs font-bold text-white">Live Tracking</h4>
            <p className="text-[10px] text-white/60 mt-0.5">Watch your order progress from kitchen to your table.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center mb-2">
              <ShieldCheck size={16} />
            </div>
            <h4 className="text-xs font-bold text-white">Instant Checkout</h4>
            <p className="text-[10px] text-white/60 mt-0.5">Apple Pay, Google Pay & card payments in 1-tap.</p>
          </div>
        </div>

        {/* Website Link */}
        <div className="text-center pt-2">
          <a
            href="https://crispydosa.co.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
          >
            <span>Or explore our menu at crispydosa.co.uk</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-white/10 py-4 px-4 text-center text-xs text-white/50">
        <p>© {new Date().getFullYear()} Crispy Dosa · London & UK. All rights reserved.</p>
      </footer>
    </div>
  );
}
