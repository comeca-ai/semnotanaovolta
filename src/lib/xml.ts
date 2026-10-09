// Leitor de XML de NF-e (modelo 55) e NFS-e (padrão nacional). Só lê; não valida assinatura.

import { XMLParser } from 'fast-xml-parser';

export interface ItemLido {
  codigo: string;
  descricao: string;
  ncm: string | null; // só dígitos
  servico: string | null; // código de tributação nacional
  valorCentavos: number;
  temIssqn: boolean;
}

export interface NotaLida {
  tipo: 'NF-e' | 'NFS-e';
  chave: string;
  cnpjEmitente: string;
  dataEmissao: string; // AAAA-MM-DD
  uf: string;
  municipioIbge: string;
  municipioNome: string;
  incideIss: boolean;
  valorCentavos: number;
  itens: ItemLido[];
}

export type Leitura = { ok: true; nota: NotaLida } | { ok: false; motivo: string };

const UF_POR_IBGE: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
  '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR',
  '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  removeNSPrefix: true,
  parseTagValue: false, // NCM, CNPJ e códigos ficam como texto (zeros à esquerda)
  isArray: (nome) => nome === 'det',
});

const digitos = (v: unknown) => String(v ?? '').replace(/\D/g, '');

/** "12450.00" -> 1245000, sem passar por float. */
export function paraCentavos(v: unknown): number {
  const s = String(v ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new Error(`valor inválido: ${s}`);
  const [inteiro, dec = ''] = s.split('.');
  return Number(inteiro) * 100 + Number(dec.padEnd(2, '0'));
}

export function lerXml(texto: string): Leitura {
  let doc: any;
  try {
    doc = parser.parse(texto);
  } catch {
    return { ok: false, motivo: 'Arquivo não é um XML válido.' };
  }
  try {
    const infNFe = doc?.nfeProc?.NFe?.infNFe ?? doc?.NFe?.infNFe;
    if (infNFe) return { ok: true, nota: lerNFe(infNFe) };
    const infNFSe = doc?.NFSe?.infNFSe;
    if (infNFSe) return { ok: true, nota: lerNFSe(infNFSe) };
  } catch (e) {
    return { ok: false, motivo: `XML incompleto: ${(e as Error).message}.` };
  }
  return { ok: false, motivo: 'Não é NF-e nem NFS-e.' };
}

function exigir<T>(v: T | undefined | null | '', campo: string): T {
  if (v === undefined || v === null || v === '') throw new Error(`falta ${campo}`);
  return v;
}

function lerNFe(inf: any): NotaLida {
  const chave = digitos(exigir(inf['@Id'], 'chave'));
  const ide = exigir(inf.ide, 'ide');
  const emit = exigir(inf.emit, 'emit');
  const ender = exigir(emit.enderEmit, 'enderEmit');
  const itens: ItemLido[] = (inf.det ?? []).map((det: any) => {
    const prod = exigir(det.prod, 'prod');
    return {
      codigo: String(prod.cProd ?? ''),
      descricao: String(prod.xProd ?? ''),
      ncm: digitos(exigir(prod.NCM, 'NCM')),
      servico: null,
      valorCentavos: paraCentavos(exigir(prod.vProd, 'vProd')),
      temIssqn: Boolean(det.imposto?.ISSQN),
    };
  });
  if (itens.length === 0) throw new Error('falta item');
  const cMun = digitos(exigir(ender.cMun, 'cMun'));
  return {
    tipo: 'NF-e',
    chave,
    cnpjEmitente: digitos(exigir(emit.CNPJ, 'CNPJ do emitente')),
    dataEmissao: String(exigir(ide.dhEmi ?? ide.dEmi, 'data de emissão')).slice(0, 10),
    uf: String(exigir(ender.UF, 'UF')),
    municipioIbge: cMun,
    municipioNome: String(ender.xMun ?? ''),
    incideIss: itens.some((i) => i.temIssqn),
    valorCentavos: paraCentavos(exigir(inf.total?.ICMSTot?.vNF, 'vNF')),
    itens,
  };
}

function lerNFSe(inf: any): NotaLida {
  const dps = exigir(inf.DPS?.infDPS, 'infDPS');
  const serv = exigir(dps.serv, 'serv');
  const cMun = digitos(exigir(serv.locPrest?.cLocPrestacao ?? inf.cLocIncid, 'local da prestação'));
  const valor = paraCentavos(exigir(dps.valores?.vServPrest?.vServ, 'vServ'));
  const tribISSQN = String(dps.valores?.trib?.tribMun?.tribISSQN ?? '');
  const codigo = digitos(exigir(serv.cServ?.cTribNac, 'cTribNac'));
  return {
    tipo: 'NFS-e',
    chave: String(exigir(inf['@Id'], 'chave')).replace(/^NFS/, ''),
    cnpjEmitente: digitos(exigir(dps.prest?.CNPJ, 'CNPJ do prestador')),
    dataEmissao: String(exigir(dps.dhEmi, 'data de emissão')).slice(0, 10),
    uf: UF_POR_IBGE[cMun.slice(0, 2)] ?? '??',
    municipioIbge: cMun,
    municipioNome: String(inf.xLocPrestacao ?? inf.xLocIncid ?? ''),
    incideIss: tribISSQN === '1',
    valorCentavos: valor,
    itens: [
      {
        codigo,
        descricao: String(serv.cServ?.xDescServ ?? ''),
        ncm: null,
        servico: codigo,
        valorCentavos: valor,
        temIssqn: tribISSQN === '1',
      },
    ],
  };
}

/** Tributos que o motor avalia por item. Legado no v0: ICMS e ISS. */
export function tributosDoItem(nota: NotaLida, item: ItemLido): Array<'ICMS' | 'ISS' | 'IBS' | 'CBS'> {
  const legado: Array<'ICMS' | 'ISS'> = nota.tipo === 'NFS-e' || item.temIssqn ? ['ISS'] : ['ICMS'];
  return [...legado, 'IBS', 'CBS'];
}
