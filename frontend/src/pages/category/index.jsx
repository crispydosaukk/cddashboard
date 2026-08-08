// src/pages/admin/Category.jsx
import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2, GripVertical, Search, Plus, X, Upload, Save, Check } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { usePopup } from "../../context/PopupContext";
import { db, storage } from "../../firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, addDoc, query, orderBy, writeBatch, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function Category() {
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
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  const [form, setForm] = useState({
    id: null,
    name: "",
    image: null,
    oldImage: "",
  });

  const [previewUrl, setPreviewUrl] = useState("");
  const [categories, setCategories] = useState([]);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // GLOBAL SEARCH STATE
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState([]);

  // =============================
  // FETCH ALL CATEGORIES (SORT SAFE)
  // =============================
  useEffect(() => {
    const fetchCats = async () => {
      try {
        let q = collection(db, "categories");
        if (!isSuperAdmin && localUserId && !isNaN(localUserId)) {
          q = query(q, where("user_id", "in", [localUserId, String(localUserId)]));
        }
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Map category_image to image for frontend consistency if needed
        const mappedData = data.map(d => ({
          ...d,
          name: d.category_name || d.name || "Unknown Category",
          image: d.category_image || d.image
        }));
        
        // Exclude soft-deleted or archived items
        const activeData = mappedData.filter(d => d.status === undefined || d.status === 1 || d.status === 0);
        
        setCategories(activeData.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    fetchCats();
  }, []);

  // =============================
  // SEARCH DEBOUNCE
  // =============================
  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedQuery(searchQuery.trim().toLowerCase()),
      300
    );
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
      fetch(`${API}/category/search-global?q=${encodeURIComponent(globalSearchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setGlobalSearchResults(Array.isArray(data) ? data : []))
        .catch(err => console.error(err));
    }, 300);
    return () => clearTimeout(t);
  }, [globalSearchQuery, showSearchModal, API, token]);

  // =============================
  // IMPORT PRODUCTS HELPER
  // =============================
  const handleImportProducts = async (categoryName, targetCategoryId) => {
    try {
      const res = await fetch(`${API}/products/import-global`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ categoryName, targetCategoryId }),
      });
      const data = await res.json();
      if (data.count > 0) {
        showPopup({
          title: "Import Success",
          message: `Successfully imported ${data.count} products for "${categoryName}".`,
          type: "success"
        });
      } else {
        showPopup({
          title: "Import Info",
          message: `No new products found for "${categoryName}" to import.`,
          type: "info"
        });
      }
    } catch (err) {
      console.error("Import products error:", err);
      showPopup({ title: "Import Failed", message: "Failed to import products.", type: "error" });
    }
  };

  // =============================
  // ADD GLOBAL CATEGORY
  // =============================
  const handleAddGlobalCategory = async (cat) => {
    // Check if it already exists in the user's list
    const existingCat = categories.find(
      (c) => c.name.trim().toLowerCase() === cat.name.trim().toLowerCase()
    );

    if (existingCat) {
      showPopup({
        title: "Duplicate Category",
        message: `Category "${cat.name}" already exists. Do you want to check and add any remaining products for it?`,
        type: "confirm",
        onConfirm: async () => {
          await handleImportProducts(cat.name, existingCat.id);
          setShowSearchModal(false);
          setGlobalSearchQuery("");
        }
      });
      return;
    }

    showPopup({
      title: "Add Global Category?",
      message: `Add "${cat.name}" and its products to your list?`,
      type: "confirm",
      onConfirm: async () => {
        const fd = new FormData();
        fd.append("name", cat.name.trim());
        if (cat.image) fd.append("existingImage", cat.image);

        try {
          const res = await fetch(`${API}/category`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
          });

          if (!res.ok) {
            const err = await res.json();
            showPopup({ title: "Failed", message: err.message || "Failed to add", type: "error" });
            return;
          }

          const newData = await res.json();
          setCategories((prev) =>
            [...prev, newData].sort((a, b) => a.sort_order - b.sort_order)
          );
          setShowSearchModal(false);
          setGlobalSearchQuery("");

          // ASK TO ADD PRODUCTS for NEWly added
          showPopup({
            title: "Category Added",
            message: `Category "${cat.name}" added. Do you want to add all related products to it?`,
            type: "confirm",
            onConfirm: async () => {
              await handleImportProducts(cat.name, newData.id);
            }
          });
        } catch (err) {
          console.error("Add global error:", err);
          showPopup({ title: "Error", message: "Something went wrong", type: "error" });
        }
      }
    });
  };

  // =============================
  // FILTERED LIST
  // =============================
  const filteredCategories = useMemo(() => {
    if (!debouncedQuery) return categories;
    const q = debouncedQuery;

    return categories.filter((c) => {
      if (!c) return false;
      if (c.name?.toLowerCase().includes(q)) return true;
      if (String(c.id).includes(q)) return true;
      return false;
    });
  }, [categories, debouncedQuery]);

  // =============================
  // IMAGE PREVIEW
  // =============================
  useEffect(() => {
    if (form.image instanceof File) {
      const url = URL.createObjectURL(form.image);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl("");
  }, [form.image]);

  // =============================
  // SAVE / UPDATE CATEGORY
  // =============================
  const handleSubmit = async (e) => {
    e.preventDefault();

    const nameTrim = form.name.trim();
    if (!nameTrim) return showPopup({ title: "Input Required", message: "Please enter a category name", type: "warning" });

    const exists = categories.some(
      (c) =>
        c.id !== form.id &&
        c.name.trim().toLowerCase() === nameTrim.toLowerCase()
    );
    if (exists) return showPopup({ title: "Duplicate Name", message: "Category name already exists", type: "warning" });

    try {
      let imageUrl = form.oldImage || "";
      if (form.image) {
        const fileRef = ref(storage, `uploads/${Date.now()}-${form.image.name}`);
        await uploadBytes(fileRef, form.image);
        imageUrl = await getDownloadURL(fileRef);
      }

      if (!isEdit) {
        // CREATE
        const newDoc = {
          name: nameTrim,
          category_image: imageUrl,
          status: 1,
          sort_order: categories.length + 1,
          user_id: localUserId || 1
        };
        const docRef = await addDoc(collection(db, "categories"), newDoc);
        const newData = { id: docRef.id, image: imageUrl, ...newDoc };

        setCategories((prev) =>
          [...prev, newData].sort((a, b) => (a.sort_order||0) - (b.sort_order||0))
        );

      } else {
        // UPDATE
        const updateData = { name: nameTrim };
        if (form.image) updateData.category_image = imageUrl;
        
        await updateDoc(doc(db, "categories", String(form.id)), updateData);

        setCategories((prev) =>
          prev
            .map((c) =>
              c.id === form.id
                ? { ...c, ...updateData, image: updateData.category_image || c.image }
                : c
            )
            .sort((a, b) => (a.sort_order||0) - (b.sort_order||0))
        );
        showPopup({ title: "Success", message: "Category updated successfully", type: "success" });
      }

      // RESET
      setShowModal(false);
      setIsEdit(false);
      setForm({ id: null, name: "", image: null, oldImage: "" });
      setPreviewUrl("");
    } catch (err) {
      console.error("Save error:", err);
      showPopup({ title: "Error", message: "Something went wrong.", type: "error" });
    }
  };

  // =============================
  // EDIT CATEGORY
  // =============================
  const handleEdit = (item) => {
    setIsEdit(true);
    setForm({
      id: item.id,
      name: item.name,
      image: null,
      oldImage: item.image || "",
    });
    setPreviewUrl("");
    setShowModal(true);
  };

  // =============================
  // DELETE CATEGORY
  // =============================
  const handleDelete = async (id) => {
    showPopup({
      title: "Delete Category?",
      message: "This will permanently remove the category. Are you sure?",
      type: "confirm",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "categories", String(id)));
          setCategories((prev) => prev.filter((c) => c.id !== id));
          showPopup({ title: "Deleted", message: "Category has been removed.", type: "success" });
        } catch (e) {
          console.error("Delete error:", e);
          showPopup({ title: "Error", message: "Failed to delete category.", type: "error" });
        }
      }
    });
  };

  // =============================
  // STATUS TOGGLE
  // =============================
  const handleToggleStatus = async (cat) => {
    const newStatus = cat.status === 1 ? 0 : 1;

    setCategories((prev) =>
      prev.map((c) =>
        c.id === cat.id ? { ...c, status: newStatus } : c
      )
    );

    try {
      await updateDoc(doc(db, "categories", String(cat.id)), { status: newStatus });
    } catch (err) {
      console.error("Status update failed");
    }
  };

  // =============================
  // DRAG & DROP SAVE ORDER
  // =============================
  const saveOrder = async (newList) => {
    try {
      const batch = writeBatch(db);
      newList.forEach((item, index) => {
        const ref = doc(db, "categories", String(item.id));
        batch.update(ref, { sort_order: index + 1 });
      });
      await batch.commit();
      
      // Reload just to be safe (optional, since state is already updated optimally)
    } catch (err) {
      console.error("Reorder save failed:", err);
    }
  };

  // =============================
  // DRAG END FUNCTION
  // =============================
  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(categories);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);

    // Assign new sort_order
    const updated = items.map((cat, index) => ({
      ...cat,
      sort_order: index + 1,
    }));

    setCategories(updated);
    saveOrder(updated);
  };
  // =============================
  // MOBILE CATEGORY CARD
  // =============================
  const CategoryCard = ({ item }) => {
    const imgUrl = getImageUrl(item.image);

    return (
      <div
        className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 shadow-lg ${item.status === 0 ? "opacity-70" : ""
          }`}
      >
        <div className="flex items-start gap-3">
          {/* IMAGE */}
          <div className="h-16 w-16 rounded-lg overflow-hidden bg-white/5 border border-white/10">
            {imgUrl ? (
              <img
                src={imgUrl}
                alt={item.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="text-xs text-white/40 p-2 text-center flex items-center justify-center h-full">
                No image
              </div>
            )}
          </div>

          {/* DETAILS */}
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">{item.name}</div>
            <div className="text-xs text-white/50">ID: {item.id}</div>

            {/* ACTIONS */}
            <div className="flex items-center gap-4 mt-3">
              {/* TOGGLE */}
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.status === 1}
                  onChange={() => handleToggleStatus(item)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-white/20 rounded-full peer-checked:bg-emerald-500 relative transition-colors border border-white/10">
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transform transition peer-checked:translate-x-5" />
                </div>
              </label>

              {/* EDIT */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  if (confirm(`Add remaining products for "${item.name}"?`)) {
                    handleImportProducts(item.name, item.id);
                  }
                }}
                className="text-blue-400 hover:text-blue-300 transition-colors"
                title="Import products"
              >
                <Upload size={18} />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleEdit(item)}
                className="text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <Pencil size={18} />
              </motion.button>

              {/* DELETE */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleDelete(item.id)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 size={18} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // =============================
  // RETURN JSX (FULL UI)
  // =============================
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-teal-800 to-emerald-900 font-sans">
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`flex-1 flex flex-col pt-36 lg:pt-24 transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-72" : "lg:pl-0"}`}>
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8">
          <div className="max-w-7xl mx-auto">
            {/* PAGE HEADER */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-8"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h2 className="font-bold text-white text-3xl drop-shadow-lg">
                    Categories
                  </h2>
                  <p className="text-white/80 mt-1 max-w-lg text-base shadow-sm">
                    Manage categories — drag to reorder, toggle visibility, edit or delete.
                  </p>
                </div>

                {/* SEARCH + ADD */}
                <div className="flex flex-col md:flex-row gap-3">
                  {/* SEARCH */}
                  <div className="relative">
                    <input
                      className="pl-10 pr-10 py-3 border-2 border-white/10 rounded-xl w-full md:w-64 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/20 bg-white/10 backdrop-blur-md text-white placeholder-white/50 shadow-xl transition-all"
                      placeholder="Search category or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50"
                      size={18}
                    />

                    {searchQuery !== "" && (
                      <button
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                        onClick={() => setSearchQuery("")}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>


                  {/* GLOBAL SEARCH BUTTON */}
                  <button
                    onClick={() => setShowSearchModal(true)}
                    className="bg-blue-600/80 hover:bg-blue-600 hover:-translate-y-0.5 transform backdrop-blur-md text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-lg border border-white/20 flex items-center gap-2 transition-all"
                  >
                    <Search size={18} />
                    Search & Add
                  </button>

                  {/* ADD BUTTON */}
                  <button
                    onClick={() => {
                      setIsEdit(false);
                      setForm({ id: null, name: "", image: null, oldImage: "" });
                      setShowModal(true);
                    }}
                    className="bg-emerald-600/80 hover:bg-emerald-600 hover:-translate-y-0.5 transform backdrop-blur-md text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-lg border border-white/20 flex items-center gap-2 transition-all"
                  >
                    <Plus size={18} />
                    Add Category
                  </button>
                </div>
              </div>
            </motion.div>

            {/* ===========================
                CATEGORY LIST WRAPPER
            ============================ */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h3 className="text-lg font-bold text-white drop-shadow">All Categories</h3>
                <span className="text-sm px-3 py-1 bg-white/10 rounded-full text-white/80 border border-white/10">
                  {filteredCategories.length} total (Showing top 50)
                </span>
              </div>

              {/* DESKTOP TABLE WITH DRAG-DROP */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10">
                  <thead className="bg-white/5 text-white/80 uppercase text-xs font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-4 w-10"></th>
                      <th className="px-6 py-4 text-left">Image</th>
                      <th className="px-6 py-4 text-left">Name</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>

                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="categoryTable">
                      {(provided) => (
                        <tbody
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="divide-y divide-white/5"
                        >
                          {filteredCategories.slice(0, 50).map((item, index) => (
                            <Draggable
                              key={String(item.id)}
                              draggableId={String(item.id)}
                              index={index}
                            >
                              {(dragProvided, snapshot) => {
                                const rowContent = (
                                  <tr
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    className={`${item.status === 0 ? "opacity-60" : ""
                                      } hover:bg-white/5 transition-colors ${snapshot.isDragging
                                        ? "bg-white/20 backdrop-blur-xl border-y border-white/30 z-[9999]"
                                        : ""
                                      }`}
                                    style={{
                                      ...dragProvided.draggableProps.style,
                                      backgroundColor: snapshot.isDragging
                                        ? "rgba(255, 255, 255, 0.15)"
                                        : undefined,
                                      display: snapshot.isDragging ? "table" : "table-row",
                                      tableLayout: "fixed",
                                      width: snapshot.isDragging
                                        ? dragProvided.draggableProps.style.width || "100%"
                                        : "auto",
                                    }}
                                  >
                                    <td
                                      {...dragProvided.dragHandleProps}
                                      className="px-6 py-4 cursor-grab text-white/30 hover:text-white/60 w-10"
                                    >
                                      <GripVertical size={20} />
                                    </td>

                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-4">
                                        <div className="h-14 w-14 rounded-lg overflow-hidden bg-white/10 border border-white/10 shadow-md flex-shrink-0">
                                          {item.image ? (
                                            <img
                                              src={getImageUrl(item.image) || ""}
                                              className="h-full w-full object-cover"
                                              alt={item.name}
                                            />
                                          ) : (
                                            <div className="h-full w-full flex items-center justify-center text-xs text-white/30">
                                              No img
                                            </div>
                                          )}
                                        </div>
                                        <div className="text-sm min-w-0">
                                          <div className="font-semibold text-white truncate">
                                            {item.name}
                                          </div>
                                          <div className="text-white/40 text-xs">
                                            ID: {item.id}
                                          </div>
                                        </div>
                                      </div>
                                    </td>

                                    <td className="px-6 py-4 text-white font-medium truncate">
                                      {item.name}
                                    </td>

                                    <td className="px-6 py-4 text-center">
                                      <label className="inline-flex items-center cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={item.status === 1}
                                          onChange={() => handleToggleStatus(item)}
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
                                            if (confirm(`Add remaining products for "${item.name}"?`)) {
                                              handleImportProducts(item.name, item.id);
                                            }
                                          }}
                                          className="p-2 bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 rounded-lg border border-blue-500/30 transition-all"
                                          title="Import missing products"
                                        >
                                          <Upload size={16} />
                                        </motion.button>
                                        <motion.button
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                          onClick={() => handleEdit(item)}
                                          className="p-2 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 rounded-lg border border-emerald-500/30 transition-all"
                                        >
                                          <Pencil size={16} />
                                        </motion.button>
                                        <motion.button
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                          onClick={() => handleDelete(item.id)}
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
                                        width: dragProvided.draggableProps.style.width || "100%",
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

              {/* MOBILE VIEW */}
              <div className="md:hidden p-4 space-y-4">
                {filteredCategories.slice(0, 50).map((item) => (
                  <CategoryCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div >

      {/* ==========================
          ADD / EDIT MODAL
      ========================== */}
      < AnimatePresence >
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                setShowModal(false);
                setIsEdit(false);
                setForm({ id: null, name: "", image: null, oldImage: "" });
              }}
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h3 className="font-bold text-xl text-white">
                  {isEdit ? "Edit Category" : "Add Category"}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white/50 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* NAME */}
                <div>
                  <label className="text-sm font-medium text-white/80 block mb-2">Category Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    required
                    placeholder="e.g. Appetizers"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                  />
                </div>

                {/* IMAGE */}
                <div>
                  <label className="text-sm font-medium text-white/80 block mb-2">Image</label>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          className="h-full w-full object-cover"
                          alt="Preview"
                        />
                      ) : form.oldImage ? (
                        <img
                          src={`${API_BASE}/uploads/${form.oldImage}`}
                          className="h-full w-full object-cover"
                          alt="Current"
                        />
                      ) : (
                        <span className="text-xs text-white/30">No Image</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setForm({
                            ...form,
                            image: e.target.files ? e.target.files[0] : null,
                          })
                        }
                        className="block w-full text-sm text-white/60
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-xl file:border-0
                          file:text-sm file:font-semibold
                          file:bg-white/10 file:text-white
                          hover:file:bg-white/20
                          cursor-pointer"
                      />
                      <p className="mt-1 text-xs text-white/40">Expected format: JPG, PNG</p>
                    </div>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 rounded-xl border border-white/10 text-white/70 hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5"
                  >
                    {isEdit ? "Update Category" : "Save Category"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )
        }
      </AnimatePresence >

      {/* ==========================
          GLOBAL SEARCH MODAL
      ========================== */}
      < AnimatePresence >
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
              className="relative w-full max-w-lg bg-white/10 backdrop-blur-2xl rounded-2xl shadow-2xl p-6 border border-white/20 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-xl text-white">Search to Add</h3>
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="text-white/50 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                <input
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  placeholder="Search available categories..."
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                />
              </div>

              <div className="mt-4 max-h-[50vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {globalSearchResults.length === 0 && globalSearchQuery && (
                  <div className="text-center text-white/50 py-8">
                    No matching categories found.
                  </div>
                )}

                {globalSearchResults.map((game, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAddGlobalCategory(game)}
                    className="w-full flex items-center gap-4 p-3 hover:bg-white/10 border border-transparent hover:border-white/10 rounded-xl transition-all text-left group"
                  >
                    <div className="h-12 w-12 bg-white/5 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
                      {game.image ? (
                        <img
                          src={game.image || ""}
                          className="h-full w-full object-cover"
                          alt=""
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs text-white/30">?</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white group-hover:text-blue-300 transition">{game.name}</div>
                      <div className="text-xs text-white/40">Click to add</div>
                    </div>
                    <div className="text-blue-300 opacity-0 group-hover:opacity-100 transition">
                      <Plus size={18} />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence >
    </div >
  );
}
