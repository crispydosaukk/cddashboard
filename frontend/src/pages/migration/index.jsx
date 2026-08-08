import React, { useState } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import { db, storage } from "../../firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { usePopup } from "../../context/PopupContext";
import { Play, CheckCircle, Loader2 } from "lucide-react";

export default function Migration() {
  const { showPopup } = usePopup();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const addLog = (msg) => {
    setLogs((prev) => [...prev, msg]);
    console.log(msg);
  };

  const migrateImage = async (urlStr, storagePath) => {
    try {
      // 1. Fetch image as blob
      const res = await fetch(urlStr);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const blob = await res.blob();

      // 2. Upload to Firebase Storage
      const fileRef = ref(storage, storagePath);
      await uploadBytes(fileRef, blob);

      // 3. Get new URL
      return await getDownloadURL(fileRef);
    } catch (err) {
      addLog(`❌ Failed to fetch/upload ${urlStr}: ${err.message}`);
      return null;
    }
  };

  const startMigration = async () => {
    if (!window.confirm("Make sure your Firebase Storage Rules allow writes! Ready to start?")) return;
    
    setLoading(true);
    setLogs([]);
    let processed = 0;
    let totalItems = 0;
    
    try {
      addLog("Fetching products and categories...");
      const prodSnap = await getDocs(collection(db, "products"));
      const catSnap = await getDocs(collection(db, "categories"));
      
      const products = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const categories = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      totalItems = products.length + categories.length;
      setProgress({ current: 0, total: totalItems });
      
      addLog(`Found ${products.length} products and ${categories.length} categories.`);
      
      // Process Categories
      for (const cat of categories) {
        let img = cat.category_image || cat.image;
        if (img && typeof img === 'string' && img.includes('api.crispydosa.info/uploads')) {
           // Ensure it's using HTTPS to fetch to avoid mixed content errors if dashboard is HTTPS
           const fetchUrl = img.replace('http://', 'https://');
           addLog(`[Category] Migrating image for ${cat.name}...`);
           
           const newUrl = await migrateImage(fetchUrl, `uploads/category-${cat.id}-${Date.now()}.png`);
           if (newUrl) {
             await updateDoc(doc(db, "categories", cat.id), { category_image: newUrl, image: newUrl });
             addLog(`✅ [Category] Updated ${cat.name}`);
           }
        }
        processed++;
        setProgress({ current: processed, total: totalItems });
      }

      // Process Products
      for (const prod of products) {
        let img = prod.image || prod.product_image;
        if (img && typeof img === 'string' && img.includes('api.crispydosa.info/uploads')) {
           const fetchUrl = img.replace('http://', 'https://');
           addLog(`[Product] Migrating image for ${prod.name || prod.product_name}...`);
           
           const newUrl = await migrateImage(fetchUrl, `uploads/product-${prod.id}-${Date.now()}.png`);
           if (newUrl) {
             await updateDoc(doc(db, "products", prod.id), { image: newUrl });
             addLog(`✅ [Product] Updated ${prod.name || prod.product_name}`);
           }
        }
        processed++;
        setProgress({ current: processed, total: totalItems });
      }

      addLog("🎉 Migration Complete!");
      showPopup({ title: "Success", message: "Migration completed. Check logs for details.", type: "success" });

    } catch (error) {
      console.error(error);
      addLog(`❌ Fatal Error: ${error.message}`);
      showPopup({ title: "Error", message: error.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={`flex-1 transition-all ${sidebarOpen ? "ml-64" : "ml-0"}`}>
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="p-8 pt-24">
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-6">
            <h1 className="text-2xl font-bold mb-4">Image Migration Tool</h1>
            <p className="text-gray-600 mb-6">
              This tool downloads images from your old API server and uploads them directly to Firebase Storage, updating the database records.
            </p>

            <button
              onClick={startMigration}
              disabled={loading}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-white transition-all ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {loading ? <Loader2 className="animate-spin" /> : <Play />}
              {loading ? "Migrating..." : "Start Migration"}
            </button>

            {loading && progress.total > 0 && (
              <div className="mt-6">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm font-medium text-gray-700">{Math.round((progress.current / progress.total) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
                </div>
              </div>
            )}

            <div className="mt-8 bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <span className="text-gray-500">Waiting to start...</span>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={`mb-1 ${log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-green-400' : 'text-gray-300'}`}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
