# Perguntas em aberto

> Atualizado após o [recorte da mesa](recorte-da-mesa.md). Prioridade: 🔴 bloqueia a POC · 🟡 importante · ⚪ pode esperar

## Ainda abertas

### Divergências entre recorte e telas
1. 🔴 **Excedente**: R$ 4 vale acima do teto **de cada pacote** (2.400 / 6.000 / 12.000) ou só acima de **12 mil**? A tela "Teto do pacote" mostra excedente no Meio (6.000).
2. 🟡 **Ticket médio**: "R$ 13,5 mil com metade entrada e metade cheio" não fecha — (9+24)/2 = 16,5. R$ 13,5 mil é entrada + meio. Qual é a premissa?
3. 🟡 **Renovação**: renovar o Entrada vira Meio automaticamente (R$ 9 mil → R$ 18 mil no segundo ano)?
4. 🟡 **Cheio**: "parada já caída" é condição para comprar o Cheio? Quem atesta isso?

### Escopo fiscal (o que a máquina sugere)
5. 🔴 "Cálculo de legado" = quais tributos? ICMS e ISS? PIS/COFINS e IPI entram?
6. 🔴 Para IBS/CBS, a sugestão preenche o quê: CST, `cClassTrib`, alíquota, redução? Só classifica ou também calcula o valor?
7. 🔴 Qual o **estado** da ida ao mercado e quais **municípios** entram primeiro na base de ISS?
8. 🔴 Quem faz a **curadoria da base** (LC 214, portarias, ISS municipal) e com que frequência ela é atualizada?

### Firma e responsabilidade
9. 🔴 Firmar basta com nome + CRC ou precisa de certificado digital? O CRC é validado em algum cadastro?
10. 🟡 "Quem assina responde": que termo o contador e o dono aceitam? Quem responde se a sugestão firmada estiver errada?

### Operação
11. 🔴 Em que formato o escritório **devolve a rejeição**: XML de retorno, print, texto colado? Vocês têm histórico real de códigos de rejeição?
12. 🔴 Como medir a **parada antes** (linha de base) para provar a queda nas semanas 2–4?
13. 🟡 Plantão: horário, quem atende, qual é o SLA da sexta?
14. ⚪ O escritório recebe algo por indicar (comissão)? Ele vê o painel dos CNPJs que indicou?

### POC
15. 🔴 Qual é o **primeiro escritório** (semana 1) e quantos XMLs reais ele pode ceder, anonimizados?
16. 🟡 A POC evolui para o v0 de produção ou é descartável? Há preferência de stack ou nuvem?

## Respondidas pelo recorte
| Pergunta | Resposta |
|---|---|
| NF-e ou NFS-e? | As duas |
| Emite ou classifica? | Classifica a nota que o escritório já emite; ERP não entra |
| Como o XML chega? | Upload do XML que o escritório já emite |
| Quem paga, quem indica? | Dono paga; escritório de 10–30 pessoas indica e não paga |
| Planos e tetos | Entrada 2.400 / R$ 9 mil; Meio 6.000 / R$ 18 mil; Cheio 12.000 / R$ 24 mil |
| Teto é anual ou mensal? | Anual, com vencimento no dia 1 |
| Rejeitada conta de novo? | Não |
| Fila de contratos? | Saiu |
| Busca norma na web? | Não; só base interna |
| Plantão | Gente e telefone |
| Critério de sucesso | Parada caindo nas semanas 2–4; renovação no dia 1 |
