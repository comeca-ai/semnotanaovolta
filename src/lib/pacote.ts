// Regras comerciais. Ficam fora do motor (decisões da mesa 1–4).

export type Pacote = 'entrada' | 'meio' | 'cheio';

export const PACOTES: Record<Pacote, { nome: string; teto: number; precoCentavos: number }> = {
  entrada: { nome: 'Entrada', teto: 2_400, precoCentavos: 900_000 },
  meio: { nome: 'Meio', teto: 6_000, precoCentavos: 1_800_000 },
  cheio: { nome: 'Cheio', teto: 12_000, precoCentavos: 2_400_000 },
};

export const EXCEDENTE_CENTAVOS = 400;

export interface AvaliacaoTeto {
  teto: number;
  usadas: number;
  novas: number;
  excedentes: number;
  valorExcedenteCentavos: number;
  passaDoTeto: boolean;
}

/** Quanto do lote passa do teto do pacote daquele CNPJ. Avisado antes de processar. */
export function avaliarTeto(teto: number, usadas: number, novas: number): AvaliacaoTeto {
  const excedentes = Math.max(0, usadas + novas - Math.max(teto, usadas));
  return {
    teto,
    usadas,
    novas,
    excedentes,
    valorExcedenteCentavos: excedentes * EXCEDENTE_CENTAVOS,
    passaDoTeto: excedentes > 0,
  };
}

/** Primeiro CNPJ do dono nasce em Entrada; os demais já nascem no Meio. */
export function pacoteDeNovoCnpj(donoJaTemCnpj: boolean): Pacote {
  return donoJaTemCnpj ? 'meio' : 'entrada';
}

/** No dia 1 do segundo ano, Entrada vira Meio. Meio e Cheio renovam como estão. */
export function pacoteNaRenovacao(atual: Pacote): Pacote {
  return atual === 'entrada' ? 'meio' : atual;
}

export interface ParadaPorOrgao {
  sefaz: number;
  prefeitura: number;
}

/**
 * Cheio só com parada já caída naquele CNPJ, SEFAZ e prefeitura separadas.
 * Cada órgão precisa estar abaixo da linha de base (ou seguir em zero se a base era zero).
 */
export function podeLiberarCheio(linhaDeBase: ParadaPorOrgao, semana: ParadaPorOrgao): boolean {
  const caiu = (base: number, atual: number) => atual < base || (base === 0 && atual === 0);
  return caiu(linhaDeBase.sefaz, semana.sefaz) && caiu(linhaDeBase.prefeitura, semana.prefeitura);
}

export function reais(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
