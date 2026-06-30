import React, { useState } from "react";
import Header from "./header.jsx";
import Sidebar from "./sidebar.jsx";
import Footer from "./footer.jsx";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />


      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />


      <div className={`flex-1 pt-16 transition-all duration-300 ease-in-out flex flex-col ${sidebarOpen ? "lg:ml-72" : "lg:ml-0"}`}>
        <main className="flex-1 px-3 sm:px-4 lg:px-6 py-4">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
