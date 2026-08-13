"use client";

import { useRouter } from "next/navigation";

interface Props {
  onClose: () => void;
}

export default function ModalCompletarCadastro({ onClose }: Props) {
  const router = useRouter();

  function irParaPerfil() {
    onClose();
    router.push("/perfil");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
          style={{ backgroundColor: "#FEF3C7" }}
        >
          📱
        </div>

        <h2 className="text-lg font-bold text-gray-800 mb-2">
          Complete seu cadastro
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Para usar esta funcionalidade, precisamos do seu número de WhatsApp/telefone.
          Leva menos de 1 minuto!
        </p>

        <button
          onClick={irParaPerfil}
          className="w-full py-3 rounded-xl font-bold text-sm text-white transition-opacity hover:opacity-90 mb-3"
          style={{ backgroundColor: "#01304D" }}
        >
          Completar cadastro
        </button>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
