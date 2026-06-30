import React, { createContext, useContext, useState, useCallback } from "react";
import GlobalPopup from "../components/common/GlobalPopup";

const PopupContext = createContext(null);

export const usePopup = () => {
    const context = useContext(PopupContext);
    if (!context) {
        throw new Error("usePopup must be used within a PopupProvider");
    }
    return context;
};

export const PopupProvider = ({ children }) => {
    const [popup, setPopup] = useState({
        isOpen: false,
        title: "",
        message: "",
        type: "success", // success, error, warning, info
        onConfirm: null,
    });

    const showPopup = useCallback(({ title, message, type = "success", onConfirm = null }) => {
        setPopup({
            isOpen: true,
            title,
            message,
            type,
            onConfirm,
        });
    }, []);

    const hidePopup = useCallback(() => {
        setPopup((prev) => ({ ...prev, isOpen: false }));
    }, []);

    return (
        <PopupContext.Provider value={{ showPopup, hidePopup }}>
            {children}
            <GlobalPopup
                isOpen={popup.isOpen}
                onClose={hidePopup}
                title={popup.title}
                message={popup.message}
                type={popup.type}
                onConfirm={popup.onConfirm}
            />
        </PopupContext.Provider>
    );
};
