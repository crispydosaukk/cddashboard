import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, X, Edit, Trash2, Save, Upload, Filter,
  GripVertical, PoundSterling, Tag, Image as ImageIcon, AlertCircle
} from "lucide-react";
import { usePopup } from "../../context/PopupContext";
import { db, storage } from "../../firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, addDoc, query, orderBy, writeBatch, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function ProductPage() {
  const { showPopup } = usePopup();
  const API = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");
  
  const getImageUrl = (img) => {
    if (!img) return null;
    if (img.startsWith("http")) return img;
    return `${API}/uploads/${img}`;
  };
  
  const userObj = JSON.parse(localStorage.getItem("user") || "{}");
  const localUserId = Number(userObj.id);
  const isSuperAdmin = Number(userObj.role_id) === 1;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");

  const CONTAINS_OPTIONS = [
    { key: "Dairy", icon: "/contains/Dairy.png" },
    { key: "Gluten", icon: "/contains/Gluten.png" },
    { key: "Mild", icon: "/contains/Mild.png" },
    { key: "Nuts", icon: "/contains/Nuts.png" },
    { key: "Sesame", icon: "/contains/Sesame.png" },
    { key: "Vegan", icon: "/contains/Vegan.png" },
    { key: "Vegetarian", icon: "/contains/Vegetarian.png" },
  ];

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  // Debounced query to avoid filtering on every keystroke
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // GLOBAL SEARCH STATE
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState([]);

  const [form, setForm] = useState({
    id: null,
    name: "",
    description: "",
    price: "",
    discountPrice: "",
    cat_id: "",
    contains: [],
    image: null, // File or null
    oldImage: null, // existing image filename (for edit)
  });

  // For mobile/desktop modal animation control
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [modalSlideIn, setModalSlideIn] = useState(false); // controls slide animation

  // --- Data loading
  useEffect(() => {
    const fetchData = async () => {
      try {
        let catQuery = collection(db, "categories");
        let prodQuery = collection(db, "products");
        if (!isSuperAdmin && localUserId && !isNaN(localUserId)) {
          catQuery = query(catQuery, where("user_id", "in", [localUserId, String(localUserId)]));
          prodQuery = query(prodQuery, where("user_id", "in", [localUserId, String(localUserId)]));
        }

        const catSnap = await getDocs(catQuery);
        setCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        const prodSnap = await getDocs(prodQuery);
        const rawProds = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const safeData = rawProds.map(p => {
          let c = p.contains;
          try {
            if (typeof c === 'string') c = JSON.parse(c);
            if (typeof c === 'string') c = JSON.parse(c);
          } catch (e) {}
          return { 
            ...p, 
            name: p.name || p.product_name || "Unknown Product", 
            image: p.image || p.product_image || "",
            contains: Array.isArray(c) ? c : [] 
          };
        });
        
        // Exclude soft-deleted or archived items
        const activeData = safeData.filter(d => d.status === undefined || d.status === 1 || d.status === 0);

        setProducts(activeData.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      } catch (err) {
        console.error("Error loading data from Firestore:", err);
      }
    };
    fetchData();
  }, []);

  // handle resize to detect mobile vs desktop
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Debounce the search input (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // =============================
  // GLOBAL SEARCH EFFECT
  // =============================
  useEffect(() => {
    if (!showSearchModal || !globalSearchQuery.trim()) {
      setGlobalSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`${API}/products/search-global?q=${encodeURIComponent(globalSearchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setGlobalSearchResults(Array.isArray(data) ? data : []))
        .catch(err => console.error(err));
    }, 300);
    return () => clearTimeout(t);
  }, [globalSearchQuery, showSearchModal, API, token]);

  // =============================
  // ADD GLOBAL PRODUCT
  // =============================
  const handleAddGlobalProduct = async (item) => {
    showPopup({
      title: "Add Global Product?",
      message: `Do you want to add "${item.name}" to your menu?`,
      type: "confirm",
      onConfirm: async () => {
        try {
          let targetCatId = null;

          // 1. Check Category
          if (item.category_name) {
            const match = categories.find(c => c.name.toLowerCase() === item.category_name.toLowerCase());
            if (match) {
              targetCatId = match.id;
            } else {
              // Create Category
              const catFd = new FormData();
              catFd.append("name", item.category_name);
              if (item.category_image) catFd.append("existingImage", item.category_image);

              const catRes = await fetch(`${API}/category`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: catFd
              });

              if (catRes.ok) {
                const newCat = await catRes.json();
                setCategories(prev => [...prev, newCat].sort((a, b) => a.sort_order - b.sort_order));
                targetCatId = newCat.id;
              }
            }
          }

          if (!targetCatId) {
            if (categories.length > 0) targetCatId = categories[0].id;
            else {
              showPopup({
                title: "No Categories",
                message: "Please create at least one category before adding products.",
                type: "warning"
              });
              return;
            }
          }

          // 2. Create Product
          const fd = new FormData();
          fd.append("name", item.name);
          fd.append("description", item.description || "");
          fd.append("price", item.price || 0);
          fd.append("discountPrice", item.discountPrice || "");
          fd.append("cat_id", targetCatId);
          fd.append("contains", JSON.stringify(item.contains || []));
          if (item.image) fd.append("existingImage", item.image);

          const res = await fetch(`${API}/products`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: fd
          });

          if (!res.ok) {
            const err = await res.json();
            showPopup({
              title: "Import Failed",
              message: res.status === 409 ? "Product already exists in your menu." : (err.message || "Failed to add product"),
              type: "error"
            });
            return;
          }

          const saved = await res.json();
          let savedContains = saved.contains;
          try {
            if (typeof savedContains === 'string') savedContains = JSON.parse(savedContains);
            if (typeof savedContains === 'string') savedContains = JSON.parse(savedContains);
          } catch (e) { }
          saved.contains = Array.isArray(savedContains) ? savedContains : [];

          setProducts(prev => [saved, ...prev].sort((a, b) => a.sort_order - b.sort_order));

          setShowSearchModal(false);
          setGlobalSearchQuery("");
          showPopup({
            title: "Success",
            message: "Product imported and added to menu.",
            type: "success"
          });

        } catch (err) {
          console.error("Add global product error:", err);
          showPopup({
            title: "System Error",
            message: "Something went wrong while importing the product.",
            type: "error"
          });
        }
      }
    });
  };

  // --- Helpers
  const formatGBP = (value) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value || 0);

  // small helper to show image preview from File or existing path
  const imagePreviewUrl = useMemo(() => {
    if (form.image instanceof File) {
      return URL.createObjectURL(form.image);
    }
    if (form.oldImage) {
      return form.oldImage.startsWith("http") ? form.oldImage : `${API}/uploads/${form.oldImage}`;
    }
    return null;
  }, [form.image, form.oldImage, API]);

  // revoke objectURL when image file changes or component unmounts
  useEffect(() => {
    let currentUrl = null;
    if (form.image instanceof File) {
      currentUrl = URL.createObjectURL(form.image);
    }
    return () => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.image]);

  const filteredProducts = useMemo(() => {
    let list = [...products];

    // CATEGORY FILTER
    if (filterCategory !== "all") {
      list = list.filter((p) => String(p.cat_id) === String(filterCategory));
    }

    // SEARCH FILTER
    if (!debouncedQuery) return list;

    const q = debouncedQuery;
    return list.filter((p) => {
      if (p.name?.toLowerCase().includes(q)) return true;
      if (p.description?.toLowerCase().includes(q)) return true;

      const catName = categories.find((c) => c.id == p.cat_id)?.name;
      if (catName?.toLowerCase().includes(q)) return true;

      if (p.price?.toString().includes(q)) return true;
      if (p.discountPrice?.toString().includes(q)) return true;

      return false;
    });
  }, [products, categories, debouncedQuery, filterCategory]);


  const toggleContains = (key) => {
    setForm((prev) => {
      if (prev.contains.includes(key)) {
        return { ...prev, contains: prev.contains.filter((c) => c !== key) };
      } else {
        return { ...prev, contains: [...prev.contains, key] };
      }
    });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    const nameTrim = form.name?.trim();
    if (!nameTrim) {
      showPopup({ title: "Validation Error", message: "Please enter product name", type: "warning" });
      return;
    }

    const localExists = products.some(
      (p) => p.id !== form.id && p.name?.trim().toLowerCase() === nameTrim.toLowerCase()
    );
    if (localExists) {
      showPopup({ title: "Validation Error", message: "Product name already exists", type: "warning" });
      return;
    }

    const rawPrice = parseFloat(form.price || 0);
    if (rawPrice <= 0) {
      showPopup({ title: "Validation Error", message: "Price must be greater than zero", type: "warning" });
      return;
    }

    let finalPrice = rawPrice;
    let discountPriceToSend = ""; // original price

    if (form.discountPrice && form.discountPrice.toString().trim() !== "") {
      const discountInput = parseFloat(form.discountPrice.toString().replace("%", "").trim());

      if (Number.isNaN(discountInput) || discountInput < 0) {
        showPopup({ title: "Validation Error", message: "Invalid discount value", type: "warning" });
        return;
      }

      if (discountInput > 0 && discountInput <= 100) {
        // percentage discount
        finalPrice = +(rawPrice - (rawPrice * discountInput) / 100).toFixed(2);
        discountPriceToSend = rawPrice; // keep original price for display
      } else if (discountInput > 100) {
        // treat as absolute discount price if entered > 100
        finalPrice = rawPrice;
        discountPriceToSend = discountInput;
      }
    }

    try {
      let imageUrl = form.oldImage || "";
      if (form.image instanceof File) {
        const fileRef = ref(storage, `uploads/${Date.now()}-${form.image.name}`);
        await uploadBytes(fileRef, form.image);
        imageUrl = await getDownloadURL(fileRef);
      }
      
      const payload = {
        name: nameTrim,
        description: form.description || "",
        price: finalPrice,
        discountPrice: discountPriceToSend,
        cat_id: form.cat_id || "",
        contains: form.contains,
        image: imageUrl,
        user_id: localUserId || 1
      };

      if (!form.id) {
        // POST
        payload.status = 1;
        payload.sort_order = products.length + 1;
        const docRef = await addDoc(collection(db, "products"), payload);
        const saved = { id: docRef.id, ...payload };
        
        setProducts((prev) => [saved, ...prev].sort((a,b) => (a.sort_order||0)-(b.sort_order||0)));
      } else {
        // PUT
        await updateDoc(doc(db, "products", String(form.id)), payload);
        const saved = { id: form.id, ...payload };
        
        setProducts((prev) => prev.map(p => p.id === form.id ? { ...p, ...payload } : p));
      }

      // Close modal
      if (isMobile) {
        setModalSlideIn(false);
        setTimeout(() => {
          setShowModal(false);
          resetForm();
        }, 300);
      } else {
        setShowModal(false);
        resetForm();
      }
      showPopup({ title: "Success", message: "Product saved successfully", type: "success" });
    } catch (error) {
      console.error("Save product error:", error);
      showPopup({ title: "System Error", message: "Something went wrong. Please try again.", type: "error" });
    }
  };

  const resetForm = () =>
    setForm({
      id: null,
      name: "",
      description: "",
      price: "",
      discountPrice: "",
      cat_id: "",
      contains: [],
      image: null,
      oldImage: null,
    });


  // --- Delete
  const handleDelete = async (id) => {
    showPopup({
      title: "Delete Product?",
      message: "This action cannot be undone. Are you sure you want to delete this item?",
      type: "confirm",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "products", String(id)));
          setProducts((prev) => prev.filter((item) => item.id !== id));
          showPopup({ title: "Deleted", message: "Product has been removed.", type: "success" });
        } catch (err) {
          console.error("Delete product error:", err);
          showPopup({ title: "Error", message: "Something went wrong while deleting.", type: "error" });
        }
      }
    });
  };

  // --- Toggle status (optimistic)
  const handleToggleStatus = async (product) => {
    const newStatus = product.status === 1 ? 0 : 1;
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p)));

    try {
      await updateDoc(doc(db, "products", String(product.id)), { status: newStatus });
    } catch (err) {
      console.error("Error toggling product status:", err);
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, status: product.status } : p)));
      alert("Something went wrong while updating status.");
    }
  };

  // ---- DRAG & DROP SORTING ----
  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(products);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);

    const updated = items.map((p, i) => ({
      ...p,
      sort_order: i + 1
    }));

    setProducts(updated);
    
    try {
      const batch = writeBatch(db);
      updated.forEach(p => {
        const ref = doc(db, "products", String(p.id));
        batch.update(ref, { sort_order: p.sort_order });
      });
      await batch.commit();
    } catch (e) {
      console.error(e);
    }
  };


  const calculateDiscountPercent = (price, discountPrice) => {
    const rawPrice = parseFloat(price || 0);
    const discountedPrice = parseFloat(discountPrice || 0);
    if (rawPrice > 0 && discountedPrice > 0) {
      return Math.round(((rawPrice - discountedPrice) / rawPrice) * 100);
    }
    return 0;
  };

  // Render helpers for small screens: product card
  const ProductCard = ({ p }) => {
    let imgUrl = null;
    if (p.image) {
       imgUrl = getImageUrl(p.image);
    }
    return (
      <div
        className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-lg flex gap-4 items-center ${p.status === 0 ? "opacity-60" : ""}`}
      >
        <div className="h-20 w-20 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
          {imgUrl ? (
            <img
              src={imgUrl}
              alt={p.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs text-white/40">
              No image
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-white truncate">{p.name}</h3>
              <p className="text-sm text-white/60 truncate mt-1">{p.description}</p>
              {Array.isArray(p.contains) && p.contains.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {p.contains.map((c) => {
                    const icon = CONTAINS_OPTIONS.find((i) => i.key === c);
                    return icon ? (
                      <img
                        key={c}
                        src={icon.icon}
                        alt={c}
                        title={c}
                        className="h-4 w-4 drop-shadow-md"
                      />
                    ) : null;
                  })}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="font-semibold text-white">{formatGBP(p.price)}</div>
              {p.discountPrice && Number(p.discountPrice) > 0 && (
                <div className="text-sm text-white/50 line-through">{formatGBP(p.discountPrice)}</div>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 pt-3 border-t border-white/10">
            <div className="text-sm text-white/50">{categories.find((c) => c.id == p.cat_id)?.name || "—"}</div>

            <div className="flex items-center gap-2">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={p.status === 1}
                  onChange={() => handleToggleStatus(p)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-white/20 rounded-full peer-checked:bg-emerald-500 relative transition-colors border border-white/10">
                  <div className="absolute top-[2px] left-[2px] w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-5" />
                </div>
              </label>

              {/* Edit icon (mobile card) */}
              <button
                onClick={() => {
                  setForm({
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    price: p.price,
                    discountPrice: calculateDiscountPercent(p.price, p.discountPrice),
                    cat_id: p.cat_id,
                    contains: p.contains || [],
                    image: null,
                    oldImage: p.image,
                  });
                  // open modal with animation for mobile
                  if (isMobile) {
                    setShowModal(true);
                    setModalSlideIn(false);
                    // allow mount then slide in
                    setTimeout(() => setModalSlideIn(true), 20);
                  } else {
                    setShowModal(true);
                  }
                }}
                className="p-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition shadow-sm"
                type="button"
              >
                <Edit size={16} />
              </button>

              {/* Delete icon (mobile card) */}
              <button
                onClick={() => handleDelete(p.id)}
                className="p-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition shadow-sm"
                type="button"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-teal-800 to-emerald-900 font-sans">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`flex-1 flex flex-col pt-36 lg:pt-24 transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-72" : "lg:pl-0"}`}>
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6"
            >
              <div>
                <h2 className="text-3xl font-bold text-white drop-shadow-lg">Product Management</h2>
                <p className="mt-2 text-white/80 text-base">Manage menu items — prices, categories, and availability.</p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch gap-3">
                <div className="relative flex-grow sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                  <input
                    placeholder="Search products..."
                    className="pl-10 pr-10 h-12 w-full border border-white/10 bg-white/10 backdrop-blur-md rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-lg transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setDebouncedQuery("");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                      type="button"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <div className="relative sm:w-48">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="pl-10 pr-8 h-12 w-full border border-white/10 bg-white/10 backdrop-blur-md rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-lg appearance-none cursor-pointer"
                  >
                    <option value="all" className="bg-slate-800">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-800">{c.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => setShowSearchModal(true)}
                  className="inline-flex items-center justify-center gap-2 px-5 h-12 bg-blue-600/80 hover:bg-blue-600 backdrop-blur-md text-white rounded-xl font-semibold shadow-lg border border-white/20 transition-all transform hover:-translate-y-0.5 whitespace-nowrap"
                >
                  <Search size={18} />
                  <span>Search Global</span>
                </button>

                <button
                  onClick={() => {
                    setForm({
                      id: null,
                      name: "",
                      description: "",
                      price: "",
                      discountPrice: "",
                      cat_id: "",
                      contains: [],
                      image: null,
                      oldImage: null,
                    });
                    if (isMobile) {
                      setShowModal(true);
                      setModalSlideIn(false);
                      setTimeout(() => setModalSlideIn(true), 20);
                    } else {
                      setShowModal(true);
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 px-5 h-12 bg-emerald-600/80 hover:bg-emerald-600 backdrop-blur-md text-white rounded-xl font-semibold shadow-lg border border-white/20 transition-all transform hover:-translate-y-0.5 whitespace-nowrap"
                >
                  <Plus size={18} />
                  <span>Add Product</span>
                </button>
              </div>
            </motion.div>

            {/* Content container */}
            <div className="grid grid-cols-1 gap-6">
              {/* Table (desktop) */}
              <div className="hidden md:block rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                  <h3 className="text-lg font-bold text-white drop-shadow">Products List</h3>
                  <span className="text-sm px-3 py-1 bg-white/10 rounded-full text-white/80 border border-white/10">
                    {filteredProducts.length} items (Showing top 50)
                  </span>
                </div>
                {filteredProducts.length === 0 ? (
                  <div className="py-12 text-center text-white/50">No products match your search.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm table-auto min-w-[900px]">
                      <thead>
                        <tr className="bg-white/5 text-white/80 uppercase text-xs font-bold tracking-wider border-b border-white/10">
                          <th className="py-4 px-6 text-left w-12"></th>
                          <th className="py-4 px-6 text-left">Image</th>
                          <th className="py-4 px-6 text-left">Name</th>
                          <th className="py-4 px-6 text-left">Contains</th>
                          <th className="py-4 px-6 text-left">Price</th>
                          <th className="py-4 px-6 text-left">Category</th>
                          <th className="py-4 px-6 text-center">Status</th>
                          <th className="py-4 px-6 text-center">Actions</th>
                        </tr>
                      </thead>

                      <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="products">
                          {(provided) => (
                            <tbody
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className="divide-y divide-white/5"
                            >
                              {filteredProducts.slice(0, 50).map((p, index) => (
                                <Draggable
                                  key={String(p.id)}
                                  draggableId={String(p.id)}
                                  index={index}
                                >
                                  {(drag, snapshot) => {
                                    const rowContent = (
                                      <tr
                                        ref={drag.innerRef}
                                        {...drag.draggableProps}
                                        className={`transition-colors ${p.status === 0 ? "opacity-60" : ""
                                          } hover:bg-white/5 ${snapshot.isDragging
                                            ? "bg-white/20 backdrop-blur-xl border-y border-white/30 z-[9999]"
                                            : ""
                                          }`}
                                        style={{
                                          ...drag.draggableProps.style,
                                          backgroundColor: snapshot.isDragging
                                            ? "rgba(255, 255, 255, 0.15)"
                                            : undefined,
                                          display: snapshot.isDragging ? "table" : "table-row",
                                          tableLayout: "fixed",
                                          width: snapshot.isDragging
                                            ? drag.draggableProps.style.width || "100%"
                                            : "auto",
                                        }}
                                      >
                                        <td
                                          {...drag.dragHandleProps}
                                          className="px-6 py-4 cursor-grab text-white/30 hover:text-white/60 w-12"
                                        >
                                          <GripVertical size={20} />
                                        </td>

                                        <td className="px-6 py-4 w-24">
                                          <div className="h-12 w-12 rounded-lg bg-white/10 border border-white/10 overflow-hidden flex-shrink-0">
                                            <img
                                              src={getImageUrl(p.image) || ""}
                                              className="h-full w-full object-cover"
                                              alt={p.name}
                                              onError={(e) => (e.target.style.display = "none")}
                                            />
                                          </div>
                                        </td>

                                        <td className="px-6 py-4 max-w-[260px]">
                                          <div className="font-semibold text-white truncate text-base">
                                            {p.name}
                                          </div>
                                          <div className="text-xs text-white/50 truncate mt-0.5">
                                            {p.description}
                                          </div>
                                        </td>
                                        <td className="px-6 py-4">
                                          <div className="flex gap-1.5 flex-wrap">
                                            {Array.isArray(p.contains) &&
                                              p.contains.map((c) => {
                                                const icon = CONTAINS_OPTIONS.find((i) => i.key === c);
                                                return icon ? (
                                                  <img
                                                    key={c}
                                                    src={icon.icon}
                                                    className="h-5 w-5 drop-shadow-sm"
                                                    title={c}
                                                  />
                                                ) : null;
                                              })}
                                          </div>
                                        </td>
                                        <td className="px-6 py-4">
                                          <div className="font-bold text-white text-base">
                                            {formatGBP(p.price)}
                                          </div>
                                          {p.discountPrice && Number(p.discountPrice) > 0 && (
                                            <div className="text-xs text-white/50 line-through">
                                              {formatGBP(p.discountPrice)}
                                            </div>
                                          )}
                                        </td>
                                        <td className="px-6 py-4">
                                          <div className="text-white/70">
                                            {categories.find((c) => c.id == p.cat_id)?.name || "—"}
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                          <label className="inline-flex items-center cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={p.status === 1}
                                              onChange={() => handleToggleStatus(p)}
                                              className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-white/20 rounded-full peer-checked:bg-emerald-500 relative transition-colors border border-white/10 shadow-inner">
                                              <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition transform peer-checked:translate-x-5 shadow-sm" />
                                            </div>
                                          </label>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                          <div className="flex items-center gap-3 justify-center">
                                            <motion.button
                                              whileHover={{ scale: 1.1 }}
                                              whileTap={{ scale: 0.9 }}
                                              onClick={() => {
                                                setForm({
                                                  id: p.id,
                                                  name: p.name,
                                                  description: p.description,
                                                  price: p.price,
                                                  discountPrice: calculateDiscountPercent(
                                                    p.price,
                                                    p.discountPrice
                                                  ),
                                                  cat_id: p.cat_id,
                                                  contains: p.contains || [],
                                                  image: null,
                                                  oldImage: p.image,
                                                });
                                                if (isMobile) {
                                                  setShowModal(true);
                                                  setModalSlideIn(false);
                                                  setTimeout(() => setModalSlideIn(true), 20);
                                                } else {
                                                  setShowModal(true);
                                                }
                                              }}
                                              className="p-2 bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 rounded-lg border border-blue-500/30 transition-all"
                                            >
                                              <Edit size={16} />
                                            </motion.button>
                                            <motion.button
                                              whileHover={{ scale: 1.1 }}
                                              whileTap={{ scale: 0.9 }}
                                              onClick={() => handleDelete(p.id)}
                                              className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg border border-red-500/30 transition-all"
                                            >
                                              <Trash2 size={16} />
                                            </motion.button>
                                          </div>
                                        </td>
                                      </tr>
                                    );

                                    if (snapshot.isDragging) {
                                      return createPortal(
                                        <table
                                          style={{
                                            borderCollapse: "collapse",
                                            width: drag.draggableProps.style.width || "100%",
                                            zIndex: 10000,
                                            position: "fixed",
                                            pointerEvents: "none",
                                          }}
                                        >
                                          <tbody>{rowContent}</tbody>
                                        </table>,
                                        document.body
                                      );
                                    }

                                    return rowContent;
                                  }}
                                </Draggable>
                              ))}


                              {provided.placeholder}
                            </tbody>
                          )}
                        </Droppable>
                      </DragDropContext>
                    </table>
                  </div>
                )}
              </div>


              {/* Cards (mobile) */}
              <div className="md:hidden space-y-4">
                {filteredProducts.length === 0 ? (
                  <div className="py-8 text-center text-white/50">No products match your search.</div>
                ) : (
                  filteredProducts.slice(0, 50).map((p) => <ProductCard key={String(p.id)} p={p} />)
                )}
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>


      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            aria-modal="true"
            role="dialog"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`absolute inset-0 bg-black/60 backdrop-blur-sm ${isMobile ? "" : ""}`}
              onClick={() => !isMobile && setShowModal(false)}
            />

            {/* Desktop / centered modal */}
            {!isMobile ? (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative bg-white/10 backdrop-blur-2xl w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-white/20"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
                  <h3 className="text-xl font-bold text-white">{form.id ? "Edit Product" : "Add Product"}</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-white/50 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-white/80 mb-2 block">Product Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Margherita Pizza"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-white/80 mb-2 block">Description</label>
                    <textarea
                      placeholder="Brief description of the product..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                      rows="3"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-white/80 mb-2 block">Price (£)</label>
                    <div className="relative">
                      <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        required
                        className="w-full pl-10 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                        value={form.price}
                        onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-white/80 mb-2 block">Discount (%)</label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        className="w-full pl-10 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                        value={form.discountPrice}
                        onChange={(e) => setForm((f) => ({ ...f, discountPrice: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-white/80 mb-2 block">Category</label>
                    <select
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all appearance-none cursor-pointer"
                      value={form.cat_id}
                      onChange={(e) => setForm((f) => ({ ...f, cat_id: e.target.value }))}
                    >
                      <option value="" className="bg-slate-800">Select Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id} className="bg-slate-800">
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-white/80 mb-2 block">Contains</label>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                      {CONTAINS_OPTIONS.map((item) => {
                        const active = form.contains.includes(item.key);
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => toggleContains(item.key)}
                            className={`
                            border rounded-xl p-2 flex flex-col items-center gap-1.5 transition-all
                            ${active
                                ? "border-emerald-500/50 bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                                : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"}
                          `}
                          >
                            <img
                              src={item.icon}
                              alt={item.key}
                              className={`h-8 w-8 transition-opacity ${active ? "opacity-100 drop-shadow-md" : "opacity-40"}`}
                            />
                            <span className={`text-[10px] sm:text-xs font-medium ${active ? "text-emerald-300" : "text-white/50"}`}>
                              {item.key}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>


                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-white/80 mb-2 block">Product Image</label>

                    <div className="flex items-center gap-4">
                      <label className="flex-1 flex flex-col items-center justify-center h-24 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:bg-white/5 hover:border-white/40 transition-all group">
                        <div className="flex flex-col items-center justify-center pt-2 pb-3">
                          <Upload className="h-6 w-6 text-white/40 group-hover:text-white/70 mb-1" />
                          <p className="text-xs text-white/40 group-hover:text-white/70">Click to upload image</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              image: e.target.files && e.target.files[0] ? e.target.files[0] : null,
                            }))
                          }
                        />
                      </label>

                      <div className="h-24 w-24 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                        {imagePreviewUrl ? (
                          <img src={imagePreviewUrl} alt="preview" className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="text-white/20 h-8 w-8" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setForm({
                          id: null,
                          name: "",
                          description: "",
                          price: "",
                          discountPrice: "",
                          cat_id: "",
                          contains: [],
                          image: null,
                          oldImage: null,
                        });
                      }}
                      className="px-5 py-2.5 rounded-xl border border-white/10 text-white/70 hover:bg-white/10 transition-all"
                    >
                      Cancel
                    </button>

                    <button type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg border border-white/10 transition-all transform hover:-translate-y-0.5">
                      {form.id ? "Update Product" : "Save Product"}
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              /* Mobile bottom-sheet modal */
              <div
                className={`fixed inset-x-0 bottom-0 z-50 max-h-[92vh] w-full transform transition-transform duration-300 ${modalSlideIn ? "translate-y-0" : "translate-y-full"}`}
              >
                <div className="bg-slate-900 border-t border-white/20 w-full rounded-t-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
                  <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="h-1 w-10 bg-white/20 rounded-full mx-auto" />
                      <h3 className="text-lg font-bold text-white">{form.id ? "Edit Product" : "Add Product"}</h3>
                    </div>
                    <button
                      onClick={() => {
                        setModalSlideIn(false);
                        setTimeout(() => setShowModal(false), 300);
                      }}
                      className="text-white/50 hover:text-white"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Mobile Form content mostly same as desktop but simpler layout if needed, using same structure for consistency */}
                  <form onSubmit={handleSubmit} className="p-4 grid grid-cols-1 gap-4 overflow-y-auto custom-scrollbar">
                    {/* ... Same inputs with mobile styling ... */}
                    <div>
                      <label className="text-sm font-medium text-white/80 mb-1.5 block">Name</label>
                      <input
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-white/80 mb-1.5 block">Description</label>
                      <textarea
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        rows="2"
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-white/80 mb-1.5 block">Price</label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          value={form.price}
                          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-white/80 mb-1.5 block">Discount %</label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          value={form.discountPrice}
                          onChange={(e) => setForm((f) => ({ ...f, discountPrice: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-white/80 mb-1.5 block">Category</label>
                      <select
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none"
                        value={form.cat_id}
                        onChange={(e) => setForm((f) => ({ ...f, cat_id: e.target.value }))}
                      >
                        <option value="" className="bg-slate-800">Select...</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id} className="bg-slate-800">{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-white/80 mb-1.5 block">Contains</label>
                      <div className="grid grid-cols-5 gap-2">
                        {CONTAINS_OPTIONS.map((item) => {
                          const active = form.contains.includes(item.key);
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => toggleContains(item.key)}
                              className={`
                                border rounded-lg p-1.5 flex flex-col items-center gap-1
                                ${active ? "border-emerald-500/50 bg-emerald-500/20" : "border-white/10 bg-white/5"}
                              `}
                            >
                              <img src={item.icon} alt={item.key} className={`h-6 w-6 ${active ? "opacity-100" : "opacity-40"}`} />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-white/80 mb-1.5 block">Image</label>
                      <div className="flex items-center gap-3">
                        <label className="flex-1 border border-dashed border-white/20 rounded-xl h-16 flex items-center justify-center text-white/50 text-sm">
                          Choose
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => setForm((f) => ({ ...f, image: e.target.files ? e.target.files[0] : null }))}
                          />
                        </label>
                        {imagePreviewUrl && (
                          <img src={imagePreviewUrl} className="h-16 w-16 rounded-xl object-cover bg-white/5" />
                        )}
                      </div>
                    </div>

                    <div className="pt-4 space-y-3">
                      <button type="submit" className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg">
                        {form.id ? "Update Product" : "Save Product"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModalSlideIn(false);
                          setTimeout(() => setShowModal(false), 300);
                        }}
                        className="w-full py-3 border border-white/10 text-white/70 rounded-xl"
                      >
                        Cancel
                      </button>
                    </div>

                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* ==========================
          GLOBAL SEARCH MODAL
      ========================== */}
      <AnimatePresence>
        {showSearchModal && (
          <div className="fixed inset-0 z-[60] flex items-start justify-center pt-20 p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowSearchModal(false)}
            />
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="relative w-full max-w-lg bg-white/10 backdrop-blur-2xl rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[80vh] flex flex-col border border-white/20"
            >
              <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h3 className="font-bold text-lg text-white">Search to Add Product</h3>
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="text-white/50 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                <input
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all flex-shrink-0"
                  placeholder="Search available products..."
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                />
              </div>

              <div className="overflow-y-auto space-y-2 flex-1 pr-2 custom-scrollbar">
                {globalSearchResults.length === 0 && globalSearchQuery && (
                  <div className="text-center text-white/50 py-8">
                    No matching products found.
                  </div>
                )}

                {globalSearchResults.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAddGlobalProduct(item)}
                    className="w-full flex items-center gap-4 p-3 hover:bg-white/10 border border-transparent hover:border-white/10 rounded-xl transition-all text-left group"
                  >
                    <div className="h-14 w-14 bg-white/5 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
                      {item.image ? (
                        <img
                          src={item.image || ""}
                          className="h-full w-full object-cover"
                          alt=""
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs text-white/30">?</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate group-hover:text-blue-300 transition">{item.name}</div>
                      <div className="text-xs text-white/40 mb-1">{item.category_name || "No Category"}</div>
                      <div className="text-sm font-medium text-emerald-400">{formatGBP(item.price)}</div>
                    </div>
                    <div className="text-blue-400 opacity-0 group-hover:opacity-100 transition whitespace-nowrap text-sm font-medium flex items-center gap-1">
                      <Plus size={16} /> Add
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
