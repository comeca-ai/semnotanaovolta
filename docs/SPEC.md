# A nota sem volta — Especificação (negócio + técnica)

> Versão 0.3 — 09/10/2026. Fontes, em ordem de precedência: [decisões da mesa](decisoes-da-mesa.md), [recorte da mesa](recorte-da-mesa.md) e [modelos de tela](telas/).
> Onde recorte e tela brigavam, valem as decisões. 🔎 = inferência minha; perguntas em [`PERGUNTAS.md`](PERGUNTAS.md).
> Nome em discussão: **anotasemvolta.com.br**.

---

## 1. O que se vende
Cálculo do **imposto legado** (**ICMS e ISS** no v0; PIS/COFINS e IPI fora), de **IBS/CBS** e de **ISS** na nota que o escritório **já emite**.
A máquina **sugere, com artigo e data**. O **contador confirma** e o **CRC fica no log**.

O que se compra: **a nota que não volta, com plantão na rejeição de sexta** — "a sexta sem susto".

**Não é**: troca de ERP; a máquina decidindo o imposto; projeto de implantação; guia de recolhimento; motor para grupo com departamento fiscal.

## 2. Para quem

| | Definição |
|---|---|
| **ICP (quem paga)** | Dono de empresa média — faturamento de alguns milhões a algumas dezenas de milhões, **mais de um município**, **sem departamento fiscal** |
| **Canal único (quem indica)** | Escritório contábil de **um estado**, **10 a 30 pessoas**. Indica, **não paga** |
| **Quem firma** | Contador (CRC) — "quem assina responde" |
| **Fora** | MEI; grupos que já têm Synchro ou Sovos |

Referência de preço × porte (FDC): médias entre R$ 4,8 mi e R$ 300 mi de faturamento; R$ 18 mil/ano ≈ 0,4% no piso e 0,02% na média (R$ 77,9 mi).

## 3. Oferta e pacotes (regra comercial)

| Pacote | Quando | Notas/ano | Preço/ano |
|---|---|---|---|
| **Entrada** | Primeiro CNPJ do dono | até 2.400 | R$ 9 mil |
| **Meio** | Segundo CNPJ ou renovação | até 6.000 | R$ 18 mil |
| **Cheio** | Vários estados, parada já caída | até 12.000 | R$ 24 mil |

Regras:
- R1 Fee **anual**, **vencimento no dia 1**. Preço **escrito**, sem projeto.
- R2 **Excedente R$ 4 por nota autorizada acima do teto do pacote daquele CNPJ** (2.400, 6.000 ou 12.000), escrito antes. O aviso aparece **na tela antes da próxima** nota.
- R3 **Nota rejeitada que o sistema devolveu não conta de novo** (a reemissão não consome pacote).
- R4 Conta **notas autorizadas**.
- R5 **Renovação**: o 1º CNPJ **não** renova a R$ 9 mil; no dia 1 do 2º ano vai ao **Meio** (R$ 18 mil, 6.000). Os demais CNPJs do mesmo dono **já nascem no Meio**.
- R6 **Cheio** só é liberado quando a **parada já caiu na semana daquele CNPJ**, SEFAZ e prefeitura separadas. Quem atesta é o **indicador do sistema**, não o vendedor.
- R7 Escala pelo **segundo CNPJ do mesmo dono**, não pelo segundo estado.
- R8 Ticket médio de trabalho: **R$ 13,5 mil = (Entrada 9 + Meio 18) / 2**. O Cheio não entra nessa média.
- R9 Escritório **não recebe comissão** no v0.

## 4. Tese e prova
- **Métrica-norte: "parada"** = notas rejeitadas/paradas por SEFAZ ou prefeitura. "Sem parada caindo, não há empresa."
- **Prova = a semana**: semana 1 com um escritório; semanas 2–4 com parada **medida**; dia 1 do mês seguinte **renova ou sai**.
- Exemplo de meta nas telas: SEFAZ 18→2, Prefeitura 9→1.
- **Ativo de longo prazo**: a **base de ISS municipal**, se a regra municipal não simplificar até 2033 (transição EC 132/2023).

## 5. Princípios do produto
1. **Sugestão, não decisão.** A IA não decide o imposto.
2. **Só artigo que está na base.** Sem artigo, **não responde**. A IA não inventa norma.
3. **Base interna, não web**: LC 214, portaria **com data**, ISS do município. **Não busca em site na hora.**
4. **Sem artigo aberto e CRC no log, não sobe.**
5. **A IA aponta o campo. Não julga o Fisco.**
6. **SEFAZ e prefeitura no mesmo peso** (município do mesmo tamanho que o estado).
7. **Plantão é gente e telefone.**
8. **IA é uma função, na leitura.** Regra no servidor.

## 6. Fluxo (decidido)
1. **Entrar.**
2. **Escolher o CNPJ do dono.**
3. **Subir o XML** (NF-e ou NFS-e que o escritório já emite).
4. **Se estourar o pacote, avisar antes** (Parar / Seguir, com R$ 4 escrito).
5. **Leitura da nota**: NCM, estado, município, ISS, valor + **sugestão com artigo e data**.
6. **Firmar** (contador, CRC → log).
7. **Se a nota voltar**: SEFAZ e prefeitura **separadas**, com **campo, código e plantão** → voltar à nota.

Experiência: *entra, lê, confirma, a nota não volta. Se voltar, sabe o campo e tem telefone.*

## 7. Telas

| # | Tela | Modelo | Status | Conteúdo |
|---|---|---|---|---|
| T0 | Entrar + escolher CNPJ | — (novo) | criar | Login simples; lista dos CNPJs do dono autorizados |
| T1 | **Contrato de cálculo** (tela escolhida) | [01](telas/01-contrato-de-calculo.jpg) | ajustar | Quem paga (dono), quem indica (escritório), preço R$ 18 mil, 1º CNPJ R$ 9 mil, próximo cheio, vencimento dia 1; nota (NCM, UF, município, ISS, valor); base legal aberta (LC 214 + portaria, "sugestão, não decisão"); CRC de quem confirma; SEFAZ e prefeitura com mesmo peso; plantão no rodapé. **Remover a "Fila de contratos"** (saiu do acordo). |
| T2 | Teto do pacote | [05](telas/05-teto-do-pacote.jpg) | manter | Pacote, autorizadas, usadas, "próxima passa do teto", "Excedente R$ 4, escrito antes", Parar / Seguir |
| T3 | Leitura da nota | [04](telas/04-leitura-da-nota.jpg) | manter | Campos lidos + card "Sugestão IBS/CBS" com artigo e data; "Ir para firmar" |
| T4 | Firmar | bloco direito da [01](telas/01-contrato-de-calculo.jpg) | extrair | Base legal aberta, nome + CRC, botão Firmar |
| T5 | Nota voltou | [02](telas/02-nota-voltou.jpg) | manter | Rejeição SEFAZ e Prefeitura separadas (código, campo), "A IA aponta o campo. Não julga o Fisco.", plantão, "Voltar à nota" |
| L1 | Landing | — (novo) | criar | Uma frase: **"A nota sem volta."** Preço e vencimento na primeira dobra. Botão **"Ver na sua nota"**. Sem explicar a reforma. |

Linguagem: português curto, afirmativo, sem jargão de compliance.

## 8. Requisitos funcionais

**Acesso e contrato** (fora do motor)
- RF01 Login simples. RF02 Dono autoriza CNPJs; usuário escolhe o CNPJ antes de subir XML.
- RF03 Contrato por CNPJ: pacote, preço, vencimento dia 1, quem paga, escritório que indica.

**Leitura**
- RF04 Upload de XML **NF-e e NFS-e**; extrair NCM (ou item de serviço), UF, município, ISS, valor, data, CNPJ.
- RF05 Validar que o CNPJ do XML é o CNPJ escolhido.

**Motor**
- RF06 Recuperar candidatos na base interna por **vigência (data da nota) × UF × município × NCM/serviço**.
- RF07 O modelo escolhe **um ID da base** ou **não responde**. Saída fechada.
- RF08 Validação determinística: artigo existe, vigente, cobre o item.
- RF09 Sugestão de: **ICMS e ISS** (legado) e **IBS/CBS** — cada um com **artigo e data**.
- RF09a IBS/CBS: **CST, `cClassTrib` e alíquota só se estiverem na base**. O valor só é calculado com alíquota da base; **sem alíquota, classifica e não calcula**. Nenhum número vem do modelo.

**Firma e log**
- RF10 Contador confirma com **nome + CRC digitados por quem está logado**; pode editar ou recusar. Sem certificado digital e sem consulta do CRC em cadastro oficial no v0 (coberto pelo termo).
- RF10a **Termo** aceito pelo contador **e** pelo dono **antes do primeiro XML**: o sistema não é parecer; sugestão errada e firmada é responsabilidade de quem assinou. **Sem termo, não sobe nota.**
- RF11 Log **imutável**: CRC, artigo, data da norma, horário (+ versão da base, hash do XML, usuário, decisão).

**Pacote**
- RF12 Contador de notas autorizadas por CNPJ/ano; tetos 2.400 / 6.000 / 12.000; renovação e liberação do Cheio conforme R5–R6.
- RF13 **Avisar antes** da nota que estoura; registrar Parar/Seguir e o valor do excedente.
- RF14 Reemissão de nota rejeitada devolvida **não consome** pacote (vínculo nota original ↔ reemissão).

**Rejeição**
- RF15 Rejeição entra pelo **arquivo de retorno que o escritório já guarda**: XML de retorno, se existir; senão **código e órgão colados** (SEFAZ ou prefeitura).
- RF16 Tabela código → campo → frase curta, **escrita a partir do histórico real do escritório**; destacar o campo na leitura.
- RF17 Indicador de **parada** por CNPJ e semana, SEFAZ e prefeitura separadas, com **linha de base** = 4 semanas anteriores do mesmo lote de CNPJs. É ele que libera o Cheio (R6).

**Plantão**
- RF18 Telefone do plantão no rodapé e na tela de rejeição. POC: **sexta 18h–22h e sábado 9h–12h**, uma pessoa, resposta na hora dentro da janela. Fora dela, a tela **mostra o horário**, sem prometer SLA.

**Base legal (curadoria)**
- RF19 Curadoria feita pelo **tributarista do time**, não pelo modelo. Toda portaria que mexa em IBS/CBS ou ISS dos municípios do piloto entra **antes do dia útil seguinte**, com data de vigência. Site de prefeitura não é fonte na hora.
- RF20 Cobertura: **estado do primeiro escritório que ceder XML** e **municípios dos CNPJs dele** — não o mapa do Brasil. Sem escritório nomeado, a base não começa.

## 9. Fora do v0
ERP e integrações; PIS/COFINS e IPI; busca na web em tempo real; emissão/transmissão da nota; guia de recolhimento; cobrança automatizada; fila de contratos; segundo estado; certificado digital e consulta de CRC; comissão e painel do escritório (só após a 1ª renovação); SLA fora da janela de plantão.

## 10. Requisitos não funcionais
- Log append-only e retenção ≥ 5 anos 🔎; base legal versionada por data.
- Regras (pacote, preço, vigência, validação) **no servidor**, em código; LLM só escolhe dentro de opções fechadas.
- LGPD: XML com dados de terceiros → criptografia em repouso e isolamento por escritório/dono.
- Disclaimer em toda sugestão: não é parecer e não substitui contador.

## 11. Arquitetura

### 11.1 Motor
```
XML (NF-e | NFS-e) ─► Parser ─► campos (NCM/serviço, UF, município, ISS, valor, data)
                                   │
                                   ▼
                BASE INTERNA (LC 214 · portaria com data · ISS do município)
                filtro duro: vigência × UF × município × NCM/serviço  → candidatos[]
                                   │
                                   ▼
                LLM, saída estruturada: art_id ∈ candidatos | "nao_responde"
                                   │
                                   ▼
                Validador em código ─ ok ─► SUGESTÃO (tributo, artigo, data)
                                   └ falha ─► NÃO RESPONDE
                                   │
                                   ▼
                CONTADOR CONFIRMA (CRC) ─► LOG IMUTÁVEL (CRC, artigo, data, horário)

Fora do motor: login · preço · teto
```

### 11.2 Modelo de dados
- `dono`, `escritorio` (UF, porte), `cnpj` (dono_id, escritorio_id, autorizado_em)
- `contrato` (cnpj_id, pacote: entrada|meio|cheio, preco, teto_notas, vencimento_dia=1, inicio, fim, renovado_de_id)
- `termo_aceite` (cnpj_id, papel: contador|dono, usuario_id, versao_termo, aceito_em)
- `norma` (id, fonte: LC214|portaria|ISS, tributo: ICMS|ISS|IBS|CBS, artigo, texto, data_publicacao, vigencia_inicio/fim, escopo: NCM/serviço/UF/município, cst?, cclass_trib?, aliquota?, curador, versao_base)
- `nota` (cnpj_id, tipo NF-e|NFS-e, chave, xml_hash, campos, status: lida|sugerida|firmada|autorizada|voltou, nota_origem_id)
- `sugestao` (nota_id, tributo, norma_id|null, resultado, justificativa, versao_base)
- `firma` (nota_id, sugestao_id, decisao, contador_nome, crc, usuario_id, firmado_em) — **append-only**
- `rejeicao` (nota_id, orgao: SEFAZ|PREFEITURA, codigo, campo, mensagem, origem: xml_retorno|colado, recebida_em)
- `linha_de_base` (cnpj_id, semana, orgao, rejeicoes)
- `consumo` (contrato_id, autorizadas) e `decisao_teto` (contrato_id, nota_id, parar|seguir, excedente_valor, em)

### 11.3 API (v0)
| Método | Rota | Função |
|---|---|---|
| GET | `/cnpjs` | CNPJs autorizados do dono |
| GET | `/contratos/{cnpj}` | Tela T1 |
| GET | `/contratos/{cnpj}/pacote` | Uso e teto; POST `/pacote/decisao` (Parar/Seguir) |
| POST | `/notas` | Sobe XML → leitura (checa teto antes) |
| POST | `/notas/{id}/sugestao` | Motor |
| POST | `/notas/{id}/firma` | Contador firma |
| POST | `/notas/{id}/retorno` | Escritório devolve rejeição |
| GET | `/parada?cnpj=&semana=` | Indicador de parada |
| GET | `/log` | Trilha de auditoria |

## 12. Mercado e concorrência
| Player | Foco | Por que não é o alvo |
|---|---|---|
| Synchro | ~400 grupos, 44 mil estabelecimentos | Projeto em ERP |
| Sovos | Milhares de empresas | Motor de cálculo para grupo |
| Dootax | >1.000 grupos, R$ 6 bi/mês | Forte em guia |
| Domínio | >30 mil escritórios | Sistema do escritório (potencial fonte do XML 🔎) |

Buraco mirado: **a nota do médio que a prefeitura devolve na sexta.**
Contexto: 1.501 h/ano de conformidade no Brasil (Banco Mundial) vs. ~233 média mundial; custo de conformidade ~R$ 228 bi/ano (IBPT); transição até 2033.

## 13. Ida ao mercado
- Um estado → **10 escritórios** antes de abrir outro → **~20 CNPJs** autorizados por escritório (≈ 200 CNPJs).
- Ciclo: semana 1 um escritório; semanas 2–4 parada medida; dia 1 renova ou sai.
- Conta do US$ 1 bi: dezenas de milhões de US$ de receita recorrente → a ~US$ 3 mil/CNPJ, dezenas de milhares de CNPJs. Ano 1 é amostra; o número mora na **renovação do dia 1** e em **não ter implantação por prefeitura**.

## 14. Bloqueio atual
**O primeiro escritório não está nomeado.** Sem nome, XML e municípios, não há base, tabela de códigos nem linha de base — a semana 1 não existe.

## 15. Destino da POC
Vira v0 se a parada cair **e** houver renovação no dia 1. Se não cair, **descarta o fluxo, não a base**.

## 16. Riscos
- Curadoria da base (sobretudo ISS por município) é o gargalo e o ativo.
- Responsabilidade: "quem assina responde" → termo claro, firma por CRC, disclaimer.
- Se a parada não cair na semana, não há venda — a medição tem de ser confiável desde o dia 1.
