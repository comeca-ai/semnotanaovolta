import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { avaliarTeto, pacoteDeNovoCnpj, pacoteNaRenovacao, podeLiberarCheio } from '../src/lib/pacote';
import { lerXml, paraCentavos, tributosDoItem } from '../src/lib/xml';
import { sugerir, type Norma, type Alvo } from '../src/lib/motor';

const xml = (nome: string) => readFileSync(`db/seed/xml/${nome}`, 'utf8');

describe('pacote', () => {
  it('excedente é R$ 4 acima do teto daquele CNPJ', () => {
    expect(avaliarTeto(6000, 5980, 10).passaDoTeto).toBe(false);
    const a = avaliarTeto(6000, 5980, 25);
    expect(a.excedentes).toBe(5);
    expect(a.valorExcedenteCentavos).toBe(2000);
  });
  it('depois de passar do teto, toda nota nova é excedente', () => {
    expect(avaliarTeto(2400, 2410, 3).excedentes).toBe(3);
  });
  it('primeiro CNPJ em Entrada, os demais no Meio; Entrada renova para Meio', () => {
    expect(pacoteDeNovoCnpj(false)).toBe('entrada');
    expect(pacoteDeNovoCnpj(true)).toBe('meio');
    expect(pacoteNaRenovacao('entrada')).toBe('meio');
    expect(pacoteNaRenovacao('cheio')).toBe('cheio');
  });
  it('Cheio só com parada caída nos dois órgãos', () => {
    expect(podeLiberarCheio({ sefaz: 18, prefeitura: 9 }, { sefaz: 2, prefeitura: 1 })).toBe(true);
    expect(podeLiberarCheio({ sefaz: 18, prefeitura: 9 }, { sefaz: 2, prefeitura: 9 })).toBe(false);
    expect(podeLiberarCheio({ sefaz: 0, prefeitura: 4 }, { sefaz: 0, prefeitura: 1 })).toBe(true);
  });
});

describe('leitor de XML', () => {
  it('lê NF-e', () => {
    const r = lerXml(xml('nfe-vestuario-campinas.xml'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nota).toMatchObject({
      tipo: 'NF-e', cnpjEmitente: '11222333000181', uf: 'SP', municipioIbge: '3509502',
      municipioNome: 'Campinas', incideIss: false, valorCentavos: 1245000, dataEmissao: '2026-10-09',
    });
    expect(r.nota.itens[0].ncm).toBe('61044300');
    expect(tributosDoItem(r.nota, r.nota.itens[0])).toEqual(['ICMS', 'IBS', 'CBS']);
  });
  it('lê NFS-e padrão nacional', () => {
    const r = lerXml(xml('nfse-campinas.xml'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nota).toMatchObject({ tipo: 'NFS-e', uf: 'SP', municipioIbge: '3509502', incideIss: true, valorCentavos: 500000 });
    expect(tributosDoItem(r.nota, r.nota.itens[0])).toEqual(['ISS', 'IBS', 'CBS']);
  });
  it('recusa o que não é nota', () => {
    expect(lerXml('<a>oi</a>')).toEqual({ ok: false, motivo: 'Não é NF-e nem NFS-e.' });
    expect(lerXml('%PDF-1.4').ok).toBe(false);
  });
  it('converte valor sem float', () => {
    expect(paraCentavos('0.1')).toBe(10);
    expect(paraCentavos('12450.00')).toBe(1245000);
    expect(() => paraCentavos('1,00')).toThrow();
  });
});

const norma = (p: Partial<Norma>): Norma => ({
  id: 'N', fonte: 'LC 214', tributo: 'IBS', artigo: 'art. X', texto: '', data_norma: '2026-10-05',
  vigencia_inicio: '2026-01-01', vigencia_fim: null, escopo_ncm: null, escopo_servico: null, uf: null,
  municipio_ibge: null, cst: '000', cclass_trib: '000001', aliquota_cpp: 10, versao_base: 'v1', ficticio: 1, ...p,
});
const alvo: Alvo = { tributo: 'IBS', dataEmissao: '2026-10-09', uf: 'SP', municipioIbge: '3509502', ncm: '61044300', servico: null, baseCentavos: 1245000 };

describe('motor', () => {
  it('sem norma na base, não responde', async () => {
    expect((await sugerir(alvo, [])).resultado).toBe('nao_responde');
    expect((await sugerir(alvo, [norma({ escopo_ncm: '84' })])).resultado).toBe('nao_responde');
  });
  it('fora da vigência, não responde', async () => {
    expect((await sugerir(alvo, [norma({ escopo_ncm: '61', vigencia_inicio: '2027-01-01' })])).resultado).toBe('nao_responde');
  });
  it('calcula só com alíquota da base', async () => {
    const s = await sugerir(alvo, [norma({ escopo_ncm: '61', aliquota_cpp: 10 })]);
    expect(s.resultado === 'sugere' && s.valorCentavos).toBe(1245);
  });
  it('sem alíquota na base, classifica e não calcula', async () => {
    const s = await sugerir(alvo, [norma({ escopo_ncm: '61', aliquota_cpp: null })]);
    expect(s.resultado).toBe('sugere');
    expect(s.resultado === 'sugere' && s.valorCentavos).toBeNull();
  });
  it('a norma mais específica vence', async () => {
    const s = await sugerir(alvo, [norma({ id: 'geral', escopo_ncm: '61' }), norma({ id: 'fina', escopo_ncm: '610443' })]);
    expect(s.resultado === 'sugere' && s.norma.id).toBe('fina');
  });
  it('empate sem IA: o contador decide', async () => {
    const base = [norma({ id: 'a', escopo_ncm: '61' }), norma({ id: 'b', escopo_ncm: '61' })];
    expect((await sugerir(alvo, base)).resultado).toBe('nao_responde');
  });
  it('escolhedor que inventa ID é ignorado', async () => {
    const base = [norma({ id: 'a', escopo_ncm: '61' }), norma({ id: 'b', escopo_ncm: '61' })];
    expect((await sugerir(alvo, base, async () => 'inventado')).resultado).toBe('nao_responde');
    const ok = await sugerir(alvo, base, async () => 'b');
    expect(ok.resultado === 'sugere' && ok.norma.id).toBe('b');
  });
});
