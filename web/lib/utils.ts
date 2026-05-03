export function slugify(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const ESTADO_NOMES: Record<string, string> = {
  AC: "Acre",                AP: "Amapá",            AM: "Amazonas",
  AL: "Alagoas",             BA: "Bahia",             CE: "Ceará",
  DF: "Distrito Federal",    ES: "Espírito Santo",    GO: "Goiás",
  MA: "Maranhão",            MG: "Minas Gerais",      MS: "Mato Grosso do Sul",
  MT: "Mato Grosso",         PA: "Pará",              PB: "Paraíba",
  PE: "Pernambuco",          PI: "Piauí",             PR: "Paraná",
  RJ: "Rio de Janeiro",      RN: "Rio Grande do Norte", RO: "Rondônia",
  RR: "Roraima",             RS: "Rio Grande do Sul", SC: "Santa Catarina",
  SE: "Sergipe",             SP: "São Paulo",         TO: "Tocantins",
};

export const ALL_ESTADOS = Object.keys(ESTADO_NOMES);

export function fmtBRL(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
