"use client";

import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

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
      className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-success text-surface-sunken shadow-[0_0_0_1px_rgba(41,255,176,0.4),0_0_24px_-2px_rgba(41,255,176,0.65),0_8px_24px_-4px_rgba(0,0,0,0.55)]"
    >
      <MessageCircle className="h-6 w-6" strokeWidth={2.25} aria-hidden />
    </motion.a>
  );
}
