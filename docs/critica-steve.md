# Crítica de produto — fluxo e telas da POC

> Habilidade `steve`: emulação baseada em declarações públicas de Steve Jobs. Ele nunca viu este produto; onde digo "a régua dele aponta", é extrapolação honesta. Toda frase entre aspas está em `.claude/skills/steve/references/doutrina.md`.
> Entrada: `AGENTS.md`, `decisoes-da-mesa.md`, `recorte-da-mesa.md`, `SPEC.md`, `POC.md`, `PERGUNTAS.md` e as cinco imagens de `docs/telas/`. As decisões da mesa são restrição, não tema de debate: fila de contratos, ERP, OCR, certificado digital e PIS/COFINS não voltam aqui.
> Data: 09/10/2026. Nomes, CNPJs, cidades e telefones dos exemplos são fictícios.

---

## Em uma frase

Para quem paga: **"A nota sem volta."** Já está certa, cabe na boca do dono, não explica a reforma. Fica.

Para quem usa todo dia (o contador, sexta, 18h): **"Sobe o XML, confere o artigo, firma. A nota não volta."** É a frase que cada tela do dia a dia tem de cumprir. Se uma tela não ajuda a subir, conferir ou firmar, ela está no caminho.

Há duas pessoas e dois ritmos: o dono lê o contrato **uma vez por ano**; o contador firma **dez notas por CNPJ por dia** (2.400/ano) e, com 20 CNPJs, umas 200 por dia. O desenho atual mistura os dois ritmos na mesma tela. Esse é o problema central.

## A experiência

Percorrendo como contador novo, na sexta, com o fluxo de 7 passos e as telas desenhadas:

1. Entra. Escolhe o CNPJ numa lista de 20. (2 telas)
2. Aceita um termo. Descobre que o dono também precisa aceitar e o dono não está logado. Trava. (1 tela, parede)
3. Sobe um XML. Um. O desenho é por nota. Tem 200. (1 tela × 200)
4. Às vezes, uma tela de teto no meio. (1 tela)
5. Leitura: cinco campos e um card com "LC 214, art. X". Lê "Sugestão IBS/CBS" e não vê ICMS nem ISS, que são o legado do v0. Não vê CST, cClassTrib, alíquota nem valor. (1 tela)
6. Clica "Ir para firmar". Outra tela, nome e CRC, botão "Firmar". (1 tela)
7. Volta para subir a próxima. Cinco telas por nota. 200 notas. Mil telas numa sexta.

Quando a nota volta: a tela "Nota voltou" diz código e campo, mas o contador chegou nela como? Pela decisão 11, ele tem um arquivo de retorno e precisa subi-lo ou colar código e órgão. Essa tela não existe no desenho. E "Voltar à nota" leva para onde, para a nota inteira ou para o campo NCM?

A tecnologia aparece ao usuário em três lugares, e é defeito nos três: "A IA não inventa norma", "A IA aponta o campo. Não julga o Fisco." e o diagrama do motor. O contador não compra IA; compra artigo, data e a nota autorizada. Na linha do que Jobs defendia, "people really don't have to understand how computers work" (Playboy, 1985).

## O corte

O corte mais importante: **separar a tela de uma vez por ano da tela de 200 vezes por dia.**

1. **"Contrato de cálculo" deixa de ser o caminho do dia a dia.** Ela é a capa do produto para o dono: quem paga, quem indica, preço, vencimento, SEFAZ e prefeitura separadas, plantão. Fica, como a mesa escolheu. Mas o bloco "Nota fiscal de serviço" e o botão "Firmar" saem dela. Contador não firma nota dentro do contrato. Na linha de "Why do we need that screen?" (via Isaacson, HBR 2012): precisamos dela para vender e renovar, não para firmar.
2. **Leitura e Firmar viram uma tela só.** O contador lê, confere o artigo e firma na mesma página. "Ir para firmar" sai. Nome e CRC foram digitados por quem está logado, no termo; na firma aparecem preenchidos, conferíveis, editáveis. Decisão 9 respeitada, um clique a menos por nota.
3. **Upload passa a ser em lote.** Um campo de arquivo que aceita vários XML. A resposta é uma lista com três estados: "Pronta para firmar", "Sem norma na base", "Voltou". Firmar continua uma a uma (quem assina responde), mas ao firmar a próxima já abre. Meta: 5 segundos por nota conferida.
4. **Toda menção a "IA" sai das telas.** No lugar, a fonte: "LC 214, art. 12, portaria de 05/10/2026." A prova de que não inventa é o artigo com data, não a frase dizendo que não inventa. "Sugestão, não decisão." fica, uma vez, pequena, ao lado do artigo.
5. **"Sugestão IBS/CBS" vira "Sugestão", em três linhas: ICMS ou ISS, IBS, CBS.** Cada linha com artigo, data e, se a base tiver, CST, cClassTrib, alíquota e valor. Se não tiver alíquota: "Classifica. Não calcula." A tela desenhada mostra só IBS/CBS e esconde o legado que a mesa pôs no v0.
6. **O check verde do "ISS: sim" sai.** É um fato lido do XML, não um aprovado. Check verde só depois de firmar.
7. **"Nota da sexta passou."** sai como rodapé de card e volta como o momento mais importante do produto: o recibo da firma e a linha da semana.
8. **O diagrama "Motor" não vira tela.** É documento interno. Está certo como está e não aparece ao usuário.

Dos 7 passos ficam 7, mas o caminho diário tem **3 telas**: lote → nota (leitura + firma) → próxima nota. Entrar, CNPJ, termo e contrato são de primeira vez ou de dia 1.

## O que eu não amo

- **A tela 01 está "ok", e "ok" é o inimigo.** Três cards, um painel lateral, um rodapé com três números: parece um dashboard de ERP, exatamente o que o produto diz que não é. A mesa já tirou a fila. Tirando também a nota e o Firmar, o que sobra é um contrato legível em 10 segundos. Isso é o que o dono precisa ver.
- **O card de sugestão é o produto inteiro e é a parte mais vazia da tela.** "LC 214, art. X, portaria 05/10/2026" em uma linha, e embaixo uma frase sobre IA num retângulo lilás. O artigo merece o espaço do título. A frase sobre IA merece zero.
- **O exemplo é incoerente, e exemplo incoerente vira código incoerente.** "Nota fiscal de serviço" com NCM 6104.43.00 (NCM é de mercadoria; serviço usa item da LC 116) e ISS "sim". NF-e vai à SEFAZ; NFS-e, à prefeitura. Uma nota não volta das duas ao mesmo tempo. O programador vai copiar o mock. Corrija o mock: um exemplo de NF-e (NCM, ICMS, SEFAZ) e um de NFS-e (item de serviço, ISS, prefeitura).
- **"Parar" preto e "Seguir" branco.** Dois botões iguais em peso e a decisão é de dinheiro. Um botão principal por tela: o que diz o preço. "Seguir. R$ 4 esta nota." Parar é link.
- **"Usadas 5.980" de 6.000 e "Próxima nota passa do teto".** Faltam 20. A tela mente no próprio exemplo. O aviso de "passa do teto" só aparece quando usadas = teto. Antes disso, um aviso menor: "Faltam 20 notas no pacote."
- **"18 para 2" e "9 para 1" no dia 1 não existem.** Na semana 1 há linha de base e nada mais. Se a tela nascer com os números do mock, o primeiro dono vai ver um número falso ou um buraco. A tela precisa de um estado "medindo".

Vale apertar o reset na tela 01? Sim, parcialmente: ela vira duas (contrato; nota). As telas 02, 04 e 05 estão perto; são ajustes de texto e de estado, não redesenho.

## O invisível

O fundo da gaveta, que ninguém desenhou e onde a sexta à noite acontece:

- **O termo com dois aceites.** Contador aceita e o dono não está ali. A tela precisa dizer com clareza: "Falta o dono aceitar." e dar o caminho (link que o contador manda ao dono). Em português, curto, na tela, sem PDF. "Privacy means people know what they're signing up for. In plain English, and repeatedly" (D8, 2010): aqui vale para responsabilidade.
- **Sem norma na base.** É comportamento esperado, não erro. A tela diz "Sem norma na base para esta nota." e **não oferece Firmar**. Oferece o plantão. Se a tela parecer um erro de sistema, o contador liga para reclamar do sistema; se parecer um limite declarado, ele entende.
- **Classifica e não calcula.** CST e cClassTrib preenchidos, alíquota e valor com "—" e a frase "Sem alíquota na base. Não calcula." O programador precisa deste estado desde a primeira versão.
- **XML do CNPJ errado.** "Esta nota é do CNPJ 00.000.000/0001-00. Você escolheu 11.111.111/0001-11." Recusa, não troca sozinho.
- **XML repetido** (mesma chave), **XML inválido**, **nota já firmada**, **nota com data anterior à vigência da portaria**. Cada um com uma frase.
- **O recibo da firma.** Depois de "Firmar", a pessoa tem de ver o que o log gravou: "Firmada às 18h42 por Maria Souza, CRC 1SP123456. LC 214, art. 12, portaria de 05/10/2026. Base v2026-10-05." É o "o log grava artigo e CRC" virando coisa que ela vê. Jobs falava da cômoda: "you're not going to use a piece of plywood on the back" (Playboy, 1985). O log é o fundo da cômoda.
- **Plantão fora da janela.** Decisão 13: fora de sexta 18h–22h e sábado 9h–12h, a tela mostra o horário, não o telefone como se alguém fosse atender. Dois estados no rodapé.
- **A espera do lote.** 200 XML num Worker: a lista aparece conforme processa ou depois de tudo? HTML server-side: processe por lote pequeno e mostre a lista parcial com "Lendo 37 de 200." Não deixe tela branca.
- **Sessão caindo às 21h de sexta.** Login simples, sessão longa (semana), sem pedir senha de novo no meio de um lote.
- **Semana 1 sem número.** "Semana 1 de 4. Linha de base: SEFAZ 18, Prefeitura 9. Medindo." E só.
- **Dados fictícios em tela.** Enquanto o escritório não for nomeado, todo exemplo em tela leva "exemplo" no nome, como o mock já faz em "Escritório Exemplo".

## A próxima demo

Não é roadmap. É o que mostrar na próxima sexta, rodando no Worker, com XML fictício de `db/seed/`:

- **(A) Caminho diário em 3 telas.** Lote → nota (leitura + firma na mesma página, com os três estados: sugere, sem norma, classifica e não calcula) → próxima nota automática. Mais o recibo da firma. Contrato, termo e teto ficam como estão nos mocks, só ajustados em texto.
- **(B) Os 7 passos como desenhados**, cinco telas por nota, "Ir para firmar" separado, batendo o cronômetro para ver quanto custa.
- **(C) Só a nota.** Uma tela, uma nota, firma. Nada de lote. Prova o motor, não prova a sexta.

Minha aposta é **A**. B serve como controle de tempo numa tarde; C é demo de motor, não de produto. Medida da demo: o tempo de lote-aberto até 10 notas firmadas, cronometrado, com uma pessoa que não é do time. Meta: menos de 1 minuto para 10 notas sem edição.

**Dono (DRI):** quem escreve o Worker. O tributarista entrega as 10 normas fictícias do seed até quinta.

## Steve diria

"you've got to start with the customer experience and work backwards to the technology" (WWDC, 1997). Aqui a experiência é a sexta do contador, não o diagrama do motor.

"It's got one window. You drag your video into the window. Then you click the button that says 'Burn.' That's it." (via Isaacson, HBR 2012). Troque vídeo por XML e Burn por Firmar.

"Why do we need that screen?" (via Isaacson, HBR 2012). Pergunta para "Ir para firmar".

"Can anyone tell me what MobileMe is supposed to do?" (via Lashinsky, Fortune 2011). Se a tela de leitura não mostra ICMS, ISS, CST e alíquota, ela não faz o que o produto promete.

A nota que não volta é a promessa; o artigo com data na tela é a prova; o recibo da firma é o produto.

---

# Espec de telas para o programador

Regras gerais, válidas em todas as telas:

- Português. Frases curtas e afirmativas. Um botão principal por tela, preto. Ações secundárias são links.
- HTML server-side. Formulários com `POST`. Tudo funciona sem JavaScript.
- Rodapé em toda tela logada, dois estados:
  - Dentro da janela: `Plantão agora: (11) 90000-0000`
  - Fora da janela: `Plantão: sexta 18h–22h e sábado 9h–12h. (11) 90000-0000`
- Nenhuma tela usa a palavra "IA" ou "inteligência artificial".
- Nenhum número de imposto vem de texto fixo. Vem da base ou aparece "—".
- Enquanto o escritório não for nomeado, nomes de exemplo levam "Exemplo".
- Largura de celular funciona. O contador atende o dono pelo celular na sexta.

## 1. Landing (`/`)

**Título (H1):** `A nota sem volta.`

**Primeira dobra, nesta ordem:**
- Subtítulo: `Seu contador confirma o imposto na nota, com artigo e data. A nota sai e não volta.`
- Preço: `R$ 9 mil por ano no primeiro CNPJ. R$ 18 mil nos próximos.`
- Vencimento: `Vence dia 1.`
- Botão principal: **`Ver na sua nota`** → `/entrar`

**Segunda dobra (só isto):**
- `Se a nota voltar, você sabe o campo e tem telefone.`
- `Plantão: sexta 18h–22h e sábado 9h–12h.`
- `Quem indica: seu escritório contábil. Quem paga: você.`

**Não entra:** explicação da reforma, LC 214, IBS/CBS, logos de concorrentes, depoimentos.

**Estado "não é cliente" (depois do botão, se o e-mail não tiver CNPJ autorizado):**
- `Ainda não temos o seu CNPJ. Peça ao seu contador para indicar.`
- `Plantão: (11) 90000-0000`

## 2. Entrar e escolher CNPJ (`/entrar`, `/cnpj`)

### 2a. Entrar

**Título:** `Entrar`

**Campos:**
- `E-mail`
- `Senha`

**Botão principal:** **`Entrar`**

**Erros:**
- E-mail ou senha errados: `E-mail ou senha não conferem.`
- Sem acesso: `Este e-mail não tem acesso. Peça ao seu escritório.`

**Sessão:** dura 7 dias. Não pede senha de novo no meio de um lote.

### 2b. Escolher CNPJ

Só aparece se a pessoa tem mais de um CNPJ. Com um só, pula direto para `/notas`.

**Título:** `Qual CNPJ?`

**Lista:** uma linha por CNPJ autorizado, com razão social, CNPJ formatado e pacote. Exemplo: `Exemplo Comércio Ltda · 00.000.000/0001-00 · Entrada · 1.212 de 2.400`.
- CNPJ sem termo completo recebe a etiqueta `Falta termo` e, ao clicar, vai para `/termo`.

**Botão principal:** nenhum botão separado; **a linha do CNPJ é o botão.** Em HTML: cada linha é um `<form method="post">` com um `<button>` do tamanho da linha.

**Estado vazio:** `Nenhum CNPJ autorizado para você. Peça ao seu escritório.`

## 3. Termo (`/termo`)

**Título:** `Termo de uso`

**Texto do termo (inteiro, na tela, sem PDF):**
```
1. O sistema sugere. Não decide. Não é parecer.
2. A sugestão traz artigo e data da norma que está na base.
3. Sem norma na base, o sistema não responde.
4. Quem firma responde pela nota. Firma com nome e CRC digitados.
5. O CRC não é conferido em cadastro oficial nesta versão.
6. O log guarda CRC, artigo, data da norma, horário e versão da base. Não apaga.
7. Pacote por CNPJ: Entrada 2.400 notas por R$ 9 mil, Meio 6.000 por R$ 18 mil, Cheio 12.000 por R$ 24 mil. Acima do teto, R$ 4 por nota, avisado antes.
8. Nota rejeitada e devolvida não conta de novo.
9. Vence dia 1.
```

**Campos (para o contador):**
- `Seu nome`
- `Seu CRC` (exemplo: `1SP123456`)
- Caixa: `Li e aceito.`

**Campos (para o dono):**
- `Seu nome`
- Caixa: `Li e aceito.`

**Botão principal:** **`Aceitar`**

**Estados:**
- Contador aceitou, dono não: `Você aceitou. Falta o dono aceitar.` + link `Copiar link para o dono` (gera `/termo?t=<token>`). Nenhuma nota sobe até o dono aceitar.
- Dono aceitou, contador não: `O dono aceitou. Falta você.`
- Ambos aceitaram: redireciona para `/notas` e mostra `Termo aceito por Maria Souza (CRC 1SP123456) e por João Exemplo em 09/10/2026.`

**Erros:**
- CRC vazio ou fora do formato: `Digite o CRC. Exemplo: 1SP123456.`
- Caixa desmarcada: `Marque "Li e aceito" para continuar.`

## 4. Contrato de cálculo (`/contrato/:cnpj`)

Tela de uma vez por ano. Não está no caminho diário. Link no cabeçalho: `Contrato`.

**Título:** `Contrato de cálculo`

**Linha de cabeçalho:** `Quem paga: dono da empresa` · `Quem indica: Escritório Exemplo` · `Vence dia 1`

**Bloco "Valores":**
- `R$ 18.000 por ano` (ou `R$ 9.000` se Entrada, `R$ 24.000` se Cheio)
- `Pacote: Meio. Até 6.000 notas por ano.`
- `Acima do teto: R$ 4 por nota, avisado antes.`
- `Renovação em 01/01/2027: Meio, R$ 18.000.`

**Bloco "Base legal":**
- `LC 214 e portarias com data. ISS do município.`
- `Sugestão, não decisão. Quem firma responde.`
- `O log grava artigo, data, CRC e horário.`

**Bloco "Semana":**
- Com medição: `SEFAZ: 18 → 2. Prefeitura: 9 → 1. Semana 3 de 4.`
- Semana 1: `Semana 1 de 4. Linha de base: SEFAZ 18, Prefeitura 9. Medindo.`
- Sem linha de base: `Sem linha de base ainda. Peça ao escritório as rejeições das 4 semanas anteriores.`

**Botão principal:** **`Subir notas`** → `/notas`

**Não entra:** fila de contratos, nota de exemplo, botão Firmar.

## 5. Subir XML em lote (`/notas`)

**Título:** `Notas de Exemplo Comércio Ltda` (razão social do CNPJ escolhido). Link pequeno: `Trocar CNPJ`.

**Contador do pacote, uma linha:** `1.212 de 2.400 notas no pacote.`
- A 90% ou mais: `Faltam 20 notas no pacote. Depois, R$ 4 por nota.`

**Campo:** `<input type="file" name="xml" accept=".xml" multiple>` com o rótulo `Escolha os XML. Pode ser vários.`

**Botão principal:** **`Subir`**

**Depois de subir, a mesma tela mostra a lista**, agrupada em três blocos, nesta ordem:
1. `Prontas para firmar (37)` — uma linha por nota: número, data, valor, primeira linha da sugestão. A linha é o link para `/notas/:id`.
2. `Sem norma na base (3)` — número, data, valor, `Sem norma na base.` Linha abre a nota, que não tem botão Firmar.
3. `Voltaram (2)` — número, órgão, código, campo. Linha abre `/notas/:id/voltou`.

E abaixo, `Firmadas hoje (118)`, fechado por padrão.

**Processamento parcial:** se o lote for grande, a página devolve a lista parcial com `Lendo 37 de 200. Atualize a página.` e um link `Atualizar`.

**Estado vazio (sem nenhuma nota):** `Nenhuma nota ainda. Suba o primeiro XML.`

**Erros, por arquivo, listados abaixo do campo:**
- Não é XML de NF-e ou NFS-e: `nota-123.xml: não é NF-e nem NFS-e.`
- CNPJ diferente: `nota-123.xml: esta nota é do CNPJ 11.111.111/0001-11. Você escolheu 00.000.000/0001-00.`
- Repetida: `nota-123.xml: esta nota já subiu em 03/10/2026.`
- Já firmada: `nota-123.xml: já firmada em 03/10/2026 por Maria Souza.`
- Sem termo: redireciona para `/termo` com `Sem termo aceito, não sobe nota.`
- Nota que estoura o teto: não sobe. Redireciona para `/pacote/:cnpj` (tela 8) antes de ler.

## 6. Leitura da nota e firma (`/notas/:id`)

Uma tela. Leitura em cima, sugestão no meio, firma embaixo.

**Título:** `Nota 1234` (número da nota). Linha abaixo: `NF-e · 03/10/2026 · Exemplo Comércio Ltda` ou `NFS-e · 03/10/2026 · ...`

**Bloco "Lido do XML"** (só texto, sem ícone de aprovado):
- NF-e: `NCM 6104.43.00` · `Estado SP` · `Município Campinas` · `Valor R$ 12.450,00`
- NFS-e: `Serviço 17.01` · `Município Campinas` · `ISS sim` · `Valor R$ 12.450,00`

**Bloco "Sugestão"** — uma linha por tributo, só os que se aplicam:
```
ICMS   18%   R$ 2.241,00   LC 214, art. 12 · portaria de 05/10/2026
IBS    CST 000 · cClassTrib 000001 · 0,1%   R$ 12,45   LC 214, art. 12 · portaria de 05/10/2026
CBS    CST 000 · cClassTrib 000001 · 0,9%   R$ 112,05  LC 214, art. 12 · portaria de 05/10/2026
```
Para NFS-e, a primeira linha é `ISS` e cita a lei do município com data.
Rodapé do bloco, pequeno: `Sugestão, não decisão. Base v2026-10-05.`

Cada artigo é um link que abre o texto da norma na própria página, embaixo (`<details>`). Sem sair da tela.

**Estado "classifica e não calcula"** (sem alíquota na base para aquele tributo):
```
IBS    CST 000 · cClassTrib 000001 · alíquota —   valor —   LC 214, art. 12 · portaria de 05/10/2026
       Sem alíquota na base. Não calcula.
```
A nota pode ser firmada assim. O log grava que não calculou.

**Estado "sem norma na base"** (nenhum tributo com norma):
- No lugar do bloco de sugestão: `Sem norma na base para esta nota.`
- Linha abaixo: `NCM 6104.43.00, Campinas, 03/10/2026. Nenhuma norma vigente cobre este caso.`
- **Não há botão Firmar.** Único botão: **`Voltar à lista`**. Rodapé com plantão.

**Bloco "Firmar"** (só quando há sugestão):
- `Nome` — preenchido com o nome do termo, editável.
- `CRC` — preenchido com o CRC do termo, editável.
- Botão principal: **`Firmar`**
- Link secundário: `Recusar sugestão` → abre campo `Por quê?` (opcional, 200 caracteres) e botão `Recusar`. Recusa também vai ao log.

**Depois de firmar, a mesma URL mostra o recibo:**
- `Firmada às 18h42 por Maria Souza, CRC 1SP123456.`
- `ICMS LC 214, art. 12, portaria de 05/10/2026. IBS e CBS LC 214, art. 12, portaria de 05/10/2026. Base v2026-10-05.`
- `Hash do XML: a3f9…c21e`
- Botão principal: **`Próxima nota`** → abre a próxima "Pronta para firmar" do mesmo CNPJ. Se não houver: `Todas as notas de hoje estão firmadas.` e botão **`Subir mais notas`**.

**Erros:**
- CRC vazio: `Digite o CRC.`
- Nota já firmada por outra pessoa entre a leitura e o clique: `Esta nota já foi firmada por Pedro Exemplo às 18h40.` Sem segundo Firmar.
- Data da nota anterior à vigência da norma: isto é tratado antes, pelo validador; a nota cai em "Sem norma na base". Nunca mostre norma fora da vigência.

## 7. Nota voltou (`/notas/:id/retorno` e `/notas/:id/voltou`)

### 7a. Subir o retorno (`/notas/:id/retorno`)

Link em toda nota firmada: `A nota voltou?`

**Título:** `A nota voltou`

**Campos:**
- `Arquivo de retorno (XML)` — `<input type="file" accept=".xml">`
- Linha: `Sem o arquivo? Cole o código.`
- `Órgão` — duas opções em rádio: `SEFAZ` / `Prefeitura`
- `Código` — texto curto

**Botão principal:** **`Registrar`**

**Erros:**
- Nada preenchido: `Suba o arquivo ou cole o código e marque o órgão.`
- Código desconhecido: registra mesmo assim e mostra na próxima tela `Código 999 ainda não está na tabela. O plantão ajuda.`

### 7b. Nota voltou (`/notas/:id/voltou`)

**Título:** `Nota voltou`

**Um card só, do órgão que devolveu** (uma nota volta de um órgão; nunca mostre o outro vazio):
- `Rejeição SEFAZ. Código 999. Campo: NCM.`
- Frase da tabela de códigos, escrita a partir do histórico do escritório: `O NCM não confere com a descrição do item.`
- Se o código não está na tabela: `Código 999. Campo ainda não mapeado.`

**Linha:** `A nota reemitida não conta no pacote.`

**Plantão, destacado nesta tela:**
- Dentro da janela: `Plantão agora: (11) 90000-0000`
- Fora: `Plantão abre sexta às 18h. (11) 90000-0000`

**Botão principal:** **`Ver o campo na nota`** → `/notas/:id#ncm` (a leitura abre com a linha do campo marcada e o texto `Campo apontado pela SEFAZ, código 999.`)

**Não entra:** frase sobre IA. O card com código e campo já diz tudo.

## 8. Teto do pacote (`/pacote/:cnpj`)

Aparece **antes** de ler a nota que estoura, só quando `usadas == teto`. Nunca antes disso.

**Título:** `Teto do pacote`

**Linhas:**
- `Pacote Meio. 6.000 notas por ano.`
- `Usadas: 6.000.`
- `A próxima nota passa do teto.`
- `Custa R$ 4. Escrito no contrato.`
- Se for lote: `Faltam 14 notas neste lote. R$ 56 no total.`

**Botão principal:** **`Seguir. R$ 4 por nota.`** (com o total quando é lote: `Seguir. R$ 56.`)

**Link secundário:** `Parar` → volta a `/notas` com `Lote parado no teto. 14 notas não subiram.`

**Registro:** a decisão (Seguir ou Parar), quem decidiu, horário e valor vão para `decisao_teto`.

**Estados relacionados, em `/notas`:**
- A 90%: `Faltam 600 notas no pacote. Depois, R$ 4 por nota.`
- Depois de seguir: `Acima do teto: 14 notas. R$ 56 neste ano.` em linha fixa no topo da lista.
- Cheio não liberado (o dono pede e o indicador não atesta): não há tela de pedido no v0. Em `/contrato`: `Cheio abre quando a parada cair na semana deste CNPJ.`

---

## Resumo para quem vai codar

- Caminho diário: `/notas` → `/notas/:id` → `Próxima nota`. Três telas.
- Primeira vez: `/entrar` → `/cnpj` → `/termo` (dois aceites) → `/notas`.
- Uma vez por ano: `/contrato/:cnpj`.
- Exceções: `/pacote/:cnpj` (antes da nota que estoura), `/notas/:id/retorno` e `/notas/:id/voltou`.
- Estados que existem desde a primeira versão: sem norma, classifica e não calcula, CNPJ errado, repetida, já firmada, falta o dono aceitar, semana 1 medindo, plantão fora da janela.
- Mock a corrigir antes de codar: exemplo de NF-e (NCM, ICMS, SEFAZ) separado do de NFS-e (serviço, ISS, prefeitura); "5.980 de 6.000" vira "6.000 de 6.000" na tela de teto.
