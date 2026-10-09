# Sugestão de implementação — POC

Objetivo: em **4 semanas**, com **um escritório real**, provar que **a parada cai**. O motor **sugere com artigo e data**,
o **contador firma** e, quando a nota volta, o sistema **aponta o campo**. O ritmo segue o recorte da mesa: semana 1 com um
escritório, semanas 2–4 com a parada medida, e no dia 1 o cliente renova ou sai.

## 1. Hipóteses que a POC precisa provar
| # | Hipótese | Como medir na POC |
|---|---|---|
| H1 | O motor acerta a classificação IBS/CBS citando artigo real | Conjunto-ouro de 50–100 notas classificadas por contador: % de acerto, 0 artigos inventados |
| H2 | "Não sugere" acontece quando deve (sem alucinar) | Notas fora da base → 100% "não sugere" |
| H3 | O contador confia e firma mais rápido | Tempo leitura→firma; % confirmadas sem edição |
| H4 | Códigos de rejeição viram campo + ação clara | Top 20 códigos de rejeição mapeados; teste com rejeições reais do escritório |
| H5 | O cliente entende teto/excedente | Teste de usabilidade da tela Teto do pacote com 3–5 donos de empresa |
| **H0** | **A parada cai** (métrica-norte) | Rejeições SEFAZ e prefeitura por semana: linha de base × semanas 2–4 |

## 2. Escopo

**Dentro**
- Entrar (login simples) e **escolher o CNPJ do dono**.
- Upload de XML **NF-e e NFS-e**, os que o escritório já emite.
- Base interna curada: trechos da LC 214, portaria com data e ISS dos municípios dos ~20 CNPJs do escritório piloto. Sem busca na web.
- Motor (recuperação + LLM restrito + validador) e tela "Leitura da nota".
- Firma com nome + CRC, log append-only.
- "Nota voltou" com o **retorno que o escritório devolve**, SEFAZ e prefeitura separadas: código, campo e plantão.
- "Teto do pacote" com os tetos Entrada 2.400 / Meio 6.000 / Cheio 12.000, aviso **antes** e Parar/Seguir. Rejeitada devolvida não conta de novo. Sem cobrança real.
- Painel "Contrato de cálculo" (tela escolhida), **sem a fila de contratos**.
- Indicador de **parada** por semana.
- Landing de uma frase: "A nota sem volta", com preço e vencimento na primeira dobra e o botão "Ver na sua nota".

**Fora** (como o próprio diagrama diz: *login, preço e teto ficam fora do motor*)
- ERP, transmissão real para SEFAZ/Prefeitura, emissão de nota, guia, busca de norma na web.
- Cobrança/billing real, multi-plano completo, portal de indicação.
- Login robusto (no POC: usuário fixo ou magic link simples).

## 3. Stack sugerida
| Camada | Escolha | Por quê |
|---|---|---|
| Front | **Next.js (App Router) + Tailwind + shadcn/ui** | Rápido, combina com o visual minimalista das telas |
| Back | Route handlers do Next (ou FastAPI, se o time for Python) | Um repositório só |
| Banco | **Postgres (Supabase)** + `pgvector` | Relacional para log/contratos; vetor para a busca na base legal |
| LLM | **Claude** via API com **saída estruturada (tool use / JSON schema com `enum` de IDs)** | Garante "escolhe só artigo que está na base" |
| Parser XML | `fast-xml-parser` (TS) ou `lxml` (Py) | — |
| Deploy | Vercel + Supabase | Custo zero/baixo para POC |

## 4. O coração: motor com saída fechada
```ts
// 1) recupera candidatos determinísticamente + busca semântica
const candidatos = await baseLegal.buscar({
  ncm, uf, municipio, dataNota,          // filtros duros: vigência e escopo
  texto: descricaoItem, limite: 8,       // ranking semântico
});
if (candidatos.length === 0) return { resultado: "nao_sugere", motivo: "sem norma na base" };

// 2) LLM só pode devolver um ID da lista ou "nao_sugere"
const schema = {
  type: "object",
  properties: {
    norma_id: { type: "string", enum: [...candidatos.map(c => c.id), "nao_sugere"] },
    cst_ibs_cbs: { type: "string" },
    cclass_trib: { type: "string" },
    justificativa: { type: "string", maxLength: 400 },
  },
  required: ["norma_id", "justificativa"],
};

// 3) valida em código: existe, vigente na data da nota, escopo cobre o NCM
const s = await llm.classificar(nota, candidatos, schema);
if (s.norma_id === "nao_sugere" || !validador.ok(s, nota)) return { resultado: "nao_sugere", ... };
return { resultado: "sugere", ...s, norma: candidatos.find(c => c.id === s.norma_id) };
```
Regras: temperatura baixa; prompt proíbe citar algo fora dos candidatos; o texto do artigo exibido vem **do banco**,
nunca do modelo; versão da base gravada junto com a sugestão.

## 5. Estrutura de pastas proposta
```
app/
  page.tsx                      # Landing "A nota sem volta"
  entrar/page.tsx               # login + escolher CNPJ
  contrato/[cnpj]/page.tsx      # Contrato de cálculo
  notas/nova/page.tsx           # upload XML
  notas/[id]/page.tsx           # Leitura da nota
  notas/[id]/firmar/page.tsx    # firma (bloco direito do T1)
  notas/[id]/voltou/page.tsx    # Nota voltou
  pacote/page.tsx               # Teto do pacote
  parada/page.tsx               # indicador semanal
  api/...                       # rotas da SPEC §7.3
lib/
  xml/parse.ts                  # NF-e / NFS-e → campos
  motor/{buscar,classificar,validar}.ts
  rejeicoes/codigos.ts          # código → campo → mensagem
  log/append.ts
db/
  migrations/                   # tabelas da SPEC §7.2
  seed/                         # LC 214 (trechos), portaria 05/10/2026, ISS Campinas, contrato exemplo
eval/
  ouro.csv                      # 50–100 notas classificadas por contador
  rodar.ts                      # mede H1/H2
```

## 6. Cronograma (4 semanas)
| Semana | Entrega |
|---|---|
| 0 (preparo) | Banco + migrations, parser NF-e/NFS-e, base legal do estado e dos municípios do piloto, linha de base de parada do escritório |
| 1 | Entrar/CNPJ, leitura, motor e firma em uso pelo **primeiro escritório** |
| 2 | Nota voltou + retorno do escritório, teto do pacote, indicador de parada |
| 3–4 | Parada medida semanalmente, ajuste da base e da tabela de códigos, relatório H0–H5; dia 1: renova ou sai |

## 7. Critério de "POC aprovada"
- **Parada menor** nas semanas 2–4 do que na linha de base, SEFAZ e prefeitura (meta de referência: 18→2 e 9→1).
- **Renovação** no dia 1.
- ≥ 85% de acerto no conjunto-ouro **e 0 artigo inexistente** citado.
- 100% das notas fora da base retornam "não sugere".
- Contadores firmam ≥ 70% das sugestões sem editar.
- Fluxo T2 → firma → T3 → T2 funciona ponta a ponta com log consultável.

## 8. Riscos
| Risco | Mitigação |
|---|---|
| Regulamentação muda durante a POC | Base versionada por data; sugestão sempre referencia a versão |
| Curadoria da base é o gargalo (não a IA) | Começar com escopo estreito (1 setor/NCMs + 1 município); ter tributarista no time |
| Responsabilidade jurídica da sugestão | "Sugestão, não decisão" na interface + termo de uso + firma por CRC |
| Dados reais de clientes (LGPD) | XMLs anonimizados no conjunto-ouro; consentimento do escritório piloto |
| Base de ISS por município é cara de manter | Começar só pelos municípios dos CNPJs do piloto; é o ativo de longo prazo |
| Sem linha de base, não há prova | Coletar as rejeições das 4 semanas anteriores antes da semana 1 |
