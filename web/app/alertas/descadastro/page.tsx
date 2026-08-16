import { Suspense } from "react";
import DescadastroContent from "./DescadastroContent";

export const metadata = { title: "Alertas desativados — Busca Leilões Caixa" };

export default function Page() {
  return (
    <Suspense>
      <DescadastroContent />
    </Suspense>
  );
}
