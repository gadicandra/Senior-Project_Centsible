"use client";

import { createContext, useContext } from "react";

/** Membuka layar tambah transaksi dari mana saja (tombol + navigasi, tombol di Beranda/Transaksi). */
export const CaptureContext = createContext<{ openAdd: () => void }>({ openAdd: () => {} });
export const useCapture = () => useContext(CaptureContext);
