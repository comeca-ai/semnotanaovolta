// Motor: escolhe só norma que está na base. Sem norma, não responde. Todo número vem da base.
// A IA é desligável: sem escolhedor de IA, empate entre normas vira "não responde" e o contador decide.

export type Tributo = 'ICMS' | 'ISS' | 'IBS' | 'CBS';

export interface Norma {
  id: string;
  fonte: string;
  tributo: Tributo;
  artigo: string;
  texto: string;
  data_norma: string;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  escopo_ncm: string | null;
  escopo_servico: string | null;
  uf: string | null;
  municipio_ibge: string | null;
  cst: string | null;
  cclass_trib: string | null;
  aliquota_cpp: number | null;
  versao_base: string;
  ficticio: number;
}

export interface Alvo {
  tributo: Tributo;
  dataEmissao: string;
  uf: string;
  municipioIbge: string;
  ncm: string | null;
  servico: string | null;
  baseCentavos: number;
}

export type Sugestao =
  | {
      resultado: 'sugere';
      norma: Norma;
      cst: string | null;
      cclassTrib: string | null;
      aliquotaCpp: number | null;
      valorCentavos: number | null; // null = base sem alíquota: classifica e não calcula
      motivo: string;
    }
  | { resultado: 'nao_responde'; motivo: string };

/** Escolha entre candidatos empatados. Só pode devolver um ID da lista ou "nao_responde". */
export type Escolhedor = (alvo: Alvo, candidatos: Norma[]) => Promise<string>;

export function cobre(n: Norma, a: Alvo): boolean {
  if (n.tributo !== a.tributo) return false;
  if (a.dataEmissao < n.vigencia_inicio) return false;
  if (n.vigencia_fim && a.dataEmissao > n.vigencia_fim) return false;
  if (n.uf && n.uf !== a.uf) return false;
  if (n.municipio_ibge && n.municipio_ibge !== a.municipioIbge) return false;
  if (n.escopo_ncm && !(a.ncm ?? '').startsWith(n.escopo_ncm)) return false;
  if (n.escopo_servico && n.escopo_servico !== a.servico) return false;
  return true;
}

/** Quanto mais específica a norma, maior: município > UF > nacional; NCM mais longo vence. */
export function especificidade(n: Norma): number {
  return (n.municipio_ibge ? 1000 : 0) + (n.uf ? 100 : 0) + (n.escopo_servico ? 50 : 0) + (n.escopo_ncm?.length ?? 0);
}

export function calcular(baseCentavos: number, aliquotaCpp: number | null): number | null {
  if (aliquotaCpp === null) return null;
  return Math.round((baseCentavos * aliquotaCpp) / 10_000);
}

export async function sugerir(alvo: Alvo, base: Norma[], escolhedor?: Escolhedor): Promise<Sugestao> {
  const candidatos = base.filter((n) => cobre(n, alvo));
  if (candidatos.length === 0) return { resultado: 'nao_responde', motivo: 'Sem norma na base para este caso.' };

  const topo = Math.max(...candidatos.map(especificidade));
  const empatados = candidatos.filter((n) => especificidade(n) === topo);

  let escolhida: Norma | undefined;
  if (empatados.length === 1) {
    escolhida = empatados[0];
  } else if (escolhedor) {
    const id = await escolhedor(alvo, empatados);
    escolhida = empatados.find((n) => n.id === id);
    if (!escolhida) return { resultado: 'nao_responde', motivo: 'Mais de uma norma possível. O contador decide.' };
  } else {
    return { resultado: 'nao_responde', motivo: 'Mais de uma norma possível. O contador decide.' };
  }

  // Validação em código, independente de quem escolheu.
  if (!cobre(escolhida, alvo)) return { resultado: 'nao_responde', motivo: 'Norma escolhida não cobre a nota.' };

  const valor = calcular(alvo.baseCentavos, escolhida.aliquota_cpp);
  return {
    resultado: 'sugere',
    norma: escolhida,
    cst: escolhida.cst,
    cclassTrib: escolhida.cclass_trib,
    aliquotaCpp: escolhida.aliquota_cpp,
    valorCentavos: valor,
    motivo: valor === null ? 'Classificou. A base não traz alíquota: não calcula.' : 'Classificou e calculou com a alíquota da base.',
  };
}
