const WM = "https://commons.wikimedia.org/wiki/Special:FilePath";

export const ESTADO_BANDEIRAS: Record<string, string> = {
  AC: `${WM}/Bandeira_do_Acre.svg?width=60`,
  AL: `${WM}/Bandeira_de_Alagoas.svg?width=60`,
  AM: `${WM}/Bandeira_do_Amazonas.svg?width=60`,
  AP: `${WM}/Bandeira_do_Amap%C3%A1.svg?width=60`,
  BA: `${WM}/Bandeira_da_Bahia.svg?width=60`,
  CE: `${WM}/Bandeira_do_Cear%C3%A1.svg?width=60`,
  DF: `${WM}/Bandeira_do_Distrito_Federal_(Brasil).svg?width=60`,
  ES: `${WM}/Bandeira_do_Esp%C3%ADrito_Santo.svg?width=60`,
  GO: `${WM}/Bandeira_de_Goi%C3%A1s.svg?width=60`,
  MA: `${WM}/Bandeira_do_Maranh%C3%A3o.svg?width=60`,
  MG: `${WM}/Bandeira_de_Minas_Gerais.svg?width=60`,
  MS: `${WM}/Bandeira_de_Mato_Grosso_do_Sul.svg?width=60`,
  MT: `${WM}/Bandeira_de_Mato_Grosso.svg?width=60`,
  PA: `${WM}/Bandeira_do_Par%C3%A1.svg?width=60`,
  PB: `${WM}/Bandeira_da_Para%C3%ADba.svg?width=60`,
  PE: `${WM}/Bandeira_de_Pernambuco.svg?width=60`,
  PI: `${WM}/Bandeira_do_Piau%C3%AD.svg?width=60`,
  PR: `${WM}/Bandeira_do_Paran%C3%A1.svg?width=60`,
  RJ: `${WM}/Bandeira_do_estado_do_Rio_de_Janeiro.svg?width=60`,
  RN: `${WM}/Bandeira_do_Rio_Grande_do_Norte.svg?width=60`,
  RO: `${WM}/Bandeira_de_Rond%C3%B4nia.svg?width=60`,
  RR: `${WM}/Bandeira_de_Roraima.svg?width=60`,
  RS: `${WM}/Bandeira_do_Rio_Grande_do_Sul.svg?width=60`,
  SC: `${WM}/Bandeira_de_Santa_Catarina.svg?width=60`,
  SE: `${WM}/Bandeira_de_Sergipe.svg?width=60`,
  SP: `${WM}/Bandeira_do_estado_de_S%C3%A3o_Paulo.svg?width=60`,
  TO: `${WM}/Bandeira_do_Tocantins.svg?width=60`,
};

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
