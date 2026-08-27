export function WhatsappFlotante() {
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  if (!whatsapp) return null;

  return (
    <a
      href={`https://wa.me/${whatsapp}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-2xl text-white shadow-lg hover:bg-green-600"
    >
      💬
    </a>
  );
}
