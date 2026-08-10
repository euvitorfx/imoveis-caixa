import { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Clube de Benefícios BLC",
  description: "Compre um imóvel da Caixa e receba até 1% de cashback. Venda Online e Venda Direta. Grátis, sem burocracia.",
  openGraph: {
    title: `Clube de Benefícios BLC | ${SITE_NAME}`,
    url: `${SITE_URL}/clube`,
  },
  alternates: { canonical: `${SITE_URL}/clube` },
};

const STEPS = [
  {
    num: "1",
    title: "Encontre seu imóvel",
    desc: "Use os filtros para buscar entre mais de 25 mil imóveis da Caixa disponíveis em todo o Brasil.",
    icon: "🔍",
  },
  {
    num: "2",
    title: "Indique o assessor parceiro BLC",
    desc: "Ao finalizar a compra em Venda Online ou Venda Direta, informe que você chegou pelo BLC e indique o assessor parceiro.",
    icon: "🤝",
  },
  {
    num: "3",
    title: "Receba o cashback",
    desc: "Após a conclusão da compra, você pode receber até 1% do valor do imóvel de volta. Grátis, sem taxa de adesão.",
    icon: "💰",
  },
];

const MODALIDADES = [
  { nome: "Venda Online",  elegivel: true  },
  { nome: "Venda Direta",  elegivel: true  },
  { nome: "Leilão",        elegivel: false },
];

const BENEFICIOS = [
  { label: "Até 1%",   desc: "de cashback sobre o valor do imóvel" },
  { label: "R$ 0",     desc: "sem taxa de adesão ou mensalidade"   },
  { label: "Simples",  desc: "sem burocracia, sem formulários complexos" },
];

export default function ClubePage() {
  return (
    <div>

      {/* ── HERO ── */}
      <div
        className="-mt-6"
        style={{
          position: "relative", left: "50%", marginLeft: "-50vw", width: "100vw",
          backgroundColor: "#01304D", borderBottom: "3px solid #F59E0B",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <p className="text-sm font-bold tracking-widest uppercase mb-4" style={{ color: "#F59E0B" }}>
            Clube de Benefícios BLC
          </p>
          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4 max-w-2xl">
            Comprou um imóvel?{" "}
            <span style={{ color: "#F59E0B" }}>Receba até 1% de volta.</span>
          </h1>
          <p className="text-base sm:text-lg max-w-xl mb-8" style={{ color: "rgba(255,255,255,0.70)" }}>
            O Clube BLC recompensa compradores que finalizam em Venda Online ou Venda Direta
            e indicam o assessor parceiro. Grátis, sem burocracia.
          </p>
          <a
            href="/#busca"
            className="inline-block px-8 py-4 text-base font-bold rounded-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#F59E0B", color: "#1C1917" }}
          >
            Buscar Imóveis →
          </a>
        </div>
      </div>

      {/* ── COMO FUNCIONA ── */}
      <section className="py-14">
        <h2 className="text-2xl font-black mb-10 text-center" style={{ color: "#01304D" }}>
          Como funciona
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {STEPS.map((step) => (
            <div key={step.num} className="flex flex-col items-center text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-4"
                style={{ backgroundColor: "#01304D" }}
              >
                {step.icon}
              </div>
              <div
                className="text-xs font-bold tracking-widest uppercase mb-2"
                style={{ color: "#F59E0B" }}
              >
                Passo {step.num}
              </div>
              <h3 className="text-base font-black text-gray-800 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── VÍDEO PLACEHOLDER ── */}
      <section className="py-10">
        <div
          className="max-w-2xl mx-auto rounded-2xl flex flex-col items-center justify-center py-16 px-8"
          style={{
            border: "2px dashed #01304D",
            backgroundColor: "#F0F7FF",
          }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
            style={{ border: "2px solid #01304D" }}
          >
            <span style={{ color: "#01304D", fontSize: 26, paddingLeft: 4 }}>▶</span>
          </div>
          <p className="text-lg font-black text-center" style={{ color: "#01304D" }}>
            Vídeo explicativo
          </p>
          <p className="text-sm text-center mt-2" style={{ color: "rgba(1,48,77,0.55)" }}>
            Em breve disponibilizaremos um vídeo completo explicando como funciona o Clube de Benefícios BLC.
          </p>
        </div>
      </section>

      {/* ── MODALIDADES ELEGÍVEIS ── */}
      <section className="py-10 border-t border-gray-100">
        <h2 className="text-2xl font-black mb-8 text-center" style={{ color: "#01304D" }}>
          Modalidades elegíveis
        </h2>
        <div className="flex flex-wrap justify-center gap-4 max-w-lg mx-auto">
          {MODALIDADES.map((m) => (
            <div
              key={m.nome}
              className="flex items-center gap-3 px-6 py-3 rounded-full border text-sm font-semibold"
              style={
                m.elegivel
                  ? { backgroundColor: "#01304D", color: "white", borderColor: "#01304D" }
                  : { backgroundColor: "white", color: "#9CA3AF", borderColor: "#E5E7EB" }
              }
            >
              <span>{m.elegivel ? "✓" : "✗"}</span>
              {m.nome}
            </div>
          ))}
        </div>
      </section>

      {/* ── BENEFÍCIOS ── */}
      <section className="py-10 border-t border-gray-100">
        <h2 className="text-2xl font-black mb-8 text-center" style={{ color: "#01304D" }}>
          Seus benefícios
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {BENEFICIOS.map((b) => (
            <div key={b.label} className="bg-white rounded-xl border border-gray-200 p-6 text-center shadow-sm">
              <div className="text-3xl font-black mb-2" style={{ color: "#F59E0B" }}>{b.label}</div>
              <p className="text-sm text-gray-500">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section
        className="py-14 -mx-4 px-4 text-center mt-10"
        style={{ backgroundColor: "#01304D" }}
      >
        <h2 className="text-2xl font-black text-white mb-3">
          Pronto para começar?
        </h2>
        <p className="text-base mb-8" style={{ color: "rgba(255,255,255,0.70)" }}>
          Busque seu imóvel, indique o assessor BLC e garanta seu cashback.
        </p>
        <a
          href="/#busca"
          className="inline-block px-8 py-4 text-base font-bold rounded-lg hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#F59E0B", color: "#1C1917" }}
        >
          Buscar Imóveis →
        </a>
      </section>

    </div>
  );
}
