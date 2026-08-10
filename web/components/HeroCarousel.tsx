"use client";

import { Fragment, useCallback, useEffect, useState } from "react";

const AMBER      = "#F59E0B";
const AMBER_TEXT = "#1C1917";
const MUTED      = "rgba(255,255,255,0.70)";
const STAT_LABEL = "rgba(255,255,255,0.50)";
const DIV_COLOR  = "rgba(255,255,255,0.20)";

interface Stat  { value: string; label: string; }
interface Cta   { href: string;  label: string; primary: boolean; }
interface Slide {
  eyebrow: string;
  title:   [string, string]; // [texto comum, trecho âmbar]
  desc:    string;
  stats:   Stat[];
  ctas:    Cta[];
}

function fmtNum(n: number) {
  return n.toLocaleString("pt-BR");
}

interface Props {
  totalImoveis: number;
  totalBusca:   number;
}

export default function HeroCarousel({ totalImoveis, totalBusca }: Props) {
  const [current, setCurrent] = useState(0);
  const [paused,  setPaused]  = useState(false);

  const slides: Slide[] = [
    /* ── 1: busca principal ── */
    {
      eyebrow: `${fmtNum(totalImoveis)} imóveis disponíveis agora`,
      title:   ["Imóveis da Caixa com ", "até 50% de desconto"],
      desc:    "Busque entre os imóveis da Caixa Econômica Federal em todo o Brasil. Atualizado 3× ao dia.",
      stats:   [
        { value: fmtNum(totalImoveis), label: "imóveis"  },
        { value: "27",                 label: "estados"  },
        { value: fmtNum(totalBusca),   label: "na busca" },
      ],
      ctas: [
        { href: "#busca", label: "Buscar Imóveis →", primary: true  },
        { href: "/mapa",  label: "Ver no Mapa",      primary: false },
      ],
    },

    /* ── 2: cashback BLC ── */
    {
      eyebrow: "Clube de Benefícios BLC",
      title:   ["Comprou um imóvel? Receba ", "até 1% de volta"],
      desc:    "Compradores que finalizam em Venda Online ou Venda Direta pelo BLC podem receber cashback sobre o valor do imóvel — grátis, sem burocracia.",
      stats:   [
        { value: "1%",   label: "cashback"    },
        { value: "2",    label: "modalidades" },
        { value: "R$ 0", label: "sem taxa"    },
      ],
      ctas: [
        { href: "#busca",       label: "Buscar Imóveis →", primary: true  },
        { href: "/ferramentas", label: "Saiba mais →",     primary: false },
      ],
    },

    /* ── 3: investidor / desconto ── */
    {
      eyebrow: "Para quem quer investir",
      title:   ["Compre com desconto de ", "até 90% sobre a avaliação"],
      desc:    "Filtre por desconto mínimo, use o FGTS ou financiamento pela própria Caixa. Mapa interativo e dados atualizados 3× ao dia.",
      stats:   [
        { value: "-90%",   label: "máx desconto" },
        { value: "FGTS",   label: "aceito"       },
        { value: "3×/dia", label: "atualizado"   },
      ],
      ctas: [
        { href: "/?descontoMin=30&ordenar=desconto_desc", label: "Ver maiores descontos →", primary: true  },
        { href: "/?fgts=sim",                             label: "Filtrar por FGTS",        primary: false },
      ],
    },
  ];

  const advance = useCallback(
    () => setCurrent((c) => (c + 1) % slides.length),
    [slides.length],
  );

  useEffect(() => {
    if (paused) return;
    const id = setInterval(advance, 15000);
    return () => clearInterval(id);
  }, [paused, advance]);

  return (
    <div
      className="-mt-6"
      style={{
        position:    "relative",
        left:        "50%",
        marginLeft:  "-50vw",
        width:       "100vw",
        backgroundColor: "#01304D",
        borderBottom:    "3px solid #F59E0B",
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">

        {/*
          CSS-grid stack: todos os slides ficam na mesma célula (row 1 / col 1).
          A altura do container é ditada pelo slide mais alto — sem flickering.
        */}
        <div style={{ display: "grid" }}>
          {slides.map((slide, i) => (
            <div
              key={i}
              style={{
                gridRow:      1,
                gridColumn:   1,
                opacity:      current === i ? 1 : 0,
                transition:   "opacity 0.7s ease",
                pointerEvents: current === i ? "auto" : "none",
              }}
            >
              {/* Eyebrow */}
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: AMBER }}>
                {slide.eyebrow}
              </p>

              {/* Título */}
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight mb-3 max-w-xl">
                {slide.title[0]}
                <span style={{ color: AMBER }}>{slide.title[1]}</span>
              </h1>

              {/* Descrição */}
              <p className="text-sm mb-7 max-w-md" style={{ color: MUTED }}>
                {slide.desc}
              </p>

              {/* Stats */}
              <div className="flex items-start mb-8" style={{ gap: "1.5rem" }}>
                {slide.stats.map((stat, j) => (
                  <Fragment key={j}>
                    {j > 0 && (
                      <div className="w-px self-stretch" style={{ backgroundColor: DIV_COLOR }} />
                    )}
                    <div>
                      <div className="text-2xl font-black text-white">{stat.value}</div>
                      <div className="text-xs uppercase tracking-widest mt-0.5" style={{ color: STAT_LABEL }}>
                        {stat.label}
                      </div>
                    </div>
                  </Fragment>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex gap-3 flex-wrap">
                {slide.ctas.map((cta) => (
                  <a
                    key={cta.href + cta.label}
                    href={cta.href}
                    className="px-6 py-3 text-sm font-bold rounded-lg transition-opacity hover:opacity-90"
                    style={
                      cta.primary
                        ? { backgroundColor: AMBER, color: AMBER_TEXT }
                        : { border: "2px solid rgba(255,255,255,0.4)", color: "white" }
                    }
                  >
                    {cta.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Navegação: setas + dots + barra */}
        <div className="flex items-center mt-8" style={{ gap: "0.75rem" }}>

          {/* Seta anterior */}
          <button
            onClick={() => setCurrent((c) => (c + slides.length - 1) % slides.length)}
            aria-label="Slide anterior"
            style={{
              width: 32, height: 32, borderRadius: 99, border: "2px solid rgba(255,255,255,0.30)",
              backgroundColor: "transparent", color: "white", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, transition: "border-color 0.2s, background-color 0.2s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = AMBER; (e.currentTarget as HTMLButtonElement).style.color = AMBER; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.30)"; (e.currentTarget as HTMLButtonElement).style.color = "white"; }}
          >‹</button>

          {/* Dots */}
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Slide ${i + 1}`}
              style={{
                height:          8,
                width:           current === i ? 28 : 8,
                borderRadius:    99,
                border:          "none",
                padding:         0,
                cursor:          "pointer",
                transition:      "width 0.35s ease, background-color 0.35s ease",
                backgroundColor: current === i ? AMBER : "rgba(255,255,255,0.30)",
              }}
            />
          ))}

          {/* Seta próximo */}
          <button
            onClick={() => setCurrent((c) => (c + 1) % slides.length)}
            aria-label="Próximo slide"
            style={{
              width: 32, height: 32, borderRadius: 99, border: "2px solid rgba(255,255,255,0.30)",
              backgroundColor: "transparent", color: "white", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, transition: "border-color 0.2s, background-color 0.2s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = AMBER; (e.currentTarget as HTMLButtonElement).style.color = AMBER; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.30)"; (e.currentTarget as HTMLButtonElement).style.color = "white"; }}
          >›</button>

          {/* Barra de progresso */}
          <div
            style={{ height: 2, flex: 1, maxWidth: 80, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 99, overflow: "hidden" }}
          >
            <div
              key={current}
              style={{
                height: "100%", width: "100%",
                backgroundColor: AMBER, borderRadius: 99,
                transformOrigin: "left",
                animation: paused ? "none" : "hero-progress 15s linear forwards",
              }}
            />
          </div>

        </div>

      </div>

      <style>{`
        @keyframes hero-progress {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}
