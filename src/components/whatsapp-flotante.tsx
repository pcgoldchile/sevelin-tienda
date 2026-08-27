"use client";

import { motion } from "framer-motion";

export function WhatsappFlotante() {
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  if (!whatsapp) return null;

  return (
    <motion.a
      href={`https://wa.me/${whatsapp}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-success text-2xl text-white shadow-[0_8px_24px_-4px_rgba(22,163,148,0.55)]"
    >
      💬
    </motion.a>
  );
}
