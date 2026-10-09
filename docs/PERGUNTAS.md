# Perguntas em aberto para o time / cliente

Prioridade: 🔴 bloqueia a POC · 🟡 importante · ⚪ pode esperar

## Escopo e documento fiscal
1. 🔴 A POC é sobre **NF-e (mercadoria, NCM, ICMS)**, **NFS-e (serviço, ISS)** ou as duas? A tela mostra NCM 6104.43.00 (vestuário) numa "nota fiscal de serviço" com ISS — o exemplo é ilustrativo?
2. 🔴 Qual o setor/CNAE do primeiro cliente? Isso define quais artigos da LC 214 a base inicial precisa ter.
3. 🔴 O que exatamente a sugestão deve preencher: CST IBS/CBS, `cClassTrib`, alíquota, redução, crédito? Só classificação ou também cálculo?
4. 🟡 O produto **emite** a nota ou só **classifica** antes de outro emissor (ERP)? Qual ERP/emissor o piloto usa?
5. 🟡 Como o XML chega: upload manual, pasta, integração com ERP, API?

## Base legal
6. 🔴 Quem faz a curadoria da base (LC 214, portarias, ISS municipal)? Há tributarista no time?
7. 🟡 Que municípios entram primeiro (Campinas só)? Qual a fonte da regra de ISS?
8. 🟡 "Portaria de 05/10/2026" — é real ou placeholder? Como acompanhar mudanças normativas?

## Firma e responsabilidade
9. 🔴 Basta nome + CRC, ou a firma precisa de **certificado digital** (e-CPF/e-CRC)?
10. 🟡 O CRC é validado contra o CFC/CRC? Contador do escritório ou interno da empresa?
11. 🟡 Quem responde juridicamente se a sugestão firmada estiver errada? Já há termo de uso?

## Rejeição
12. 🔴 Vocês têm histórico real de rejeições (códigos SEFAZ/Prefeitura) para montar a tabela código → campo?
13. 🟡 "18 para 2" e "9 para 1" são metas, resultados de piloto ou exemplos? Em que período?
14. ⚪ O plantão é humano 24h, horário comercial, WhatsApp?

## Comercial
15. 🟡 "Primeiro CNPJ R$ 9.000, próximo cheio": desconto de 50% no 1º CNPJ e R$ 18.000 nos demais? Por grupo econômico ou por indicação?
16. 🟡 Quais planos existem além do "Meio" (6.000 notas)? O teto é por mês ou por ano?
17. 🟡 Excedente R$ 4/nota: cobrado como? "Parar" bloqueia a emissão ou só a sugestão?
18. ⚪ O escritório que indica recebe comissão? Ele vê o painel dos clientes?
19. ⚪ Fila de contratos (pendente/confirmada/parada): o que move um contrato entre os status?

## POC
20. 🔴 Prazo, orçamento e quem valida a POC? Há escritório piloto com contadores disponíveis para o conjunto-ouro?
21. 🟡 Podemos usar XMLs reais (anonimizados)?
22. ⚪ A POC evolui para produto ou é descartável? Preferência de stack/nuvem?
