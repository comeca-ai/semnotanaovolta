import type { Child } from 'hono/jsx';

// Direção: livro-razão editorial. Papel quente, manchete em serifa, números em mono, verde só no carimbo da firma.
const CSS = `
:root{
  --papel:oklch(0.975 0.008 85);
  --papel-2:oklch(0.955 0.012 85);
  --tinta:oklch(0.2 0.01 60);
  --tinta-2:oklch(0.45 0.012 60);
  --tinta-3:oklch(0.62 0.01 60);
  --fio:oklch(0.86 0.012 80);
  --fio-forte:oklch(0.25 0.01 60);
  --carimbo:oklch(0.47 0.11 150);
  --carimbo-fundo:oklch(0.94 0.035 150);
  --alerta:oklch(0.55 0.13 65);
  --alerta-fundo:oklch(0.95 0.04 85);
  --rejeicao:oklch(0.52 0.18 28);
  --rejeicao-fundo:oklch(0.95 0.03 28);
  --foco:oklch(0.55 0.15 255);
  --serifa:"Fraunces",Georgia,serif;
  --sans:"Inter Tight",system-ui,sans-serif;
  --mono:"JetBrains Mono",ui-monospace,monospace;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--papel);color:var(--tinta);font:16px/1.55 var(--sans);font-feature-settings:"ss01","cv11";-webkit-font-smoothing:antialiased}
main{max-width:760px;margin:0 auto;padding:40px 16px 120px}
h1,h2,.display{font-family:var(--serifa);font-weight:600;letter-spacing:-.02em;font-optical-sizing:auto}
h1{font-size:clamp(2rem,5vw,2.75rem);line-height:1.05;margin:0 0 8px}
h2{font-size:1.3rem;line-height:1.2;margin:0 0 12px}
p{margin:0 0 10px}
a{color:inherit;text-underline-offset:3px;text-decoration-thickness:1px}
.mono,.num{font-family:var(--mono);font-size:.92em;font-feature-settings:"zero"}
.sub{color:var(--tinta-2);margin:0 0 28px}
.mini{font-size:.82rem;color:var(--tinta-3)}
.rotulo{font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:var(--tinta-3);margin:0 0 4px;font-weight:600}

/* topo */
.topo{border-bottom:1px solid var(--fio);background:var(--papel)}
.topo-in{max-width:760px;margin:0 auto;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.marca{font-family:var(--serifa);font-weight:600;font-size:1.05rem;text-decoration:none;letter-spacing:-.01em}
.topo nav{display:flex;gap:18px;align-items:center;font-size:.9rem;color:var(--tinta-2)}
.topo nav a{text-decoration:none}
.topo nav form{display:flex;margin:0}
.topo nav a[aria-current]{color:var(--tinta);font-weight:600;border-bottom:2px solid var(--tinta);padding-bottom:2px}
.link-botao{background:none;border:0;padding:0;font:inherit;color:inherit;cursor:pointer;text-decoration:underline;text-underline-offset:3px}

/* folha: blocos separados por fio, sem caixas */
.folha{border-top:1.5px solid var(--fio-forte);padding-top:18px;margin-top:28px}
.folha:first-of-type{margin-top:0}
.linhas{width:100%;border-collapse:collapse}
.linhas th,.linhas td{text-align:left;padding:11px 0;border-bottom:1px solid var(--fio);vertical-align:baseline}
.linhas th{font-weight:500;color:var(--tinta-2);width:34%;font-size:.92rem}
.linhas td.dir,.linhas th.dir{text-align:right}
.lista{list-style:none;margin:0;padding:0}
.lista li{border-bottom:1px solid var(--fio)}
.lista a,.lista .item{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:13px 0;text-decoration:none}
.lista a:hover{background:var(--papel-2)}
.lista .princ{font-weight:500}
.lista .lado{color:var(--tinta-2);font-size:.9rem;text-align:right;white-space:nowrap}

/* sugestão: o produto inteiro */
.sug{border-bottom:1px solid var(--fio);padding:14px 0}
.sug-topo{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap}
.tributo{font-family:var(--mono);font-weight:700;font-size:1rem;letter-spacing:.04em;min-width:56px;display:inline-block}
.sug-valor{font-family:var(--mono);font-size:1.05rem;font-weight:600}
.sug-codigos{font-family:var(--mono);font-size:.85rem;color:var(--tinta-2);margin:4px 0 2px}
.artigo{font-family:var(--serifa);font-size:1.05rem}
details summary{cursor:pointer;color:var(--tinta-2);font-size:.85rem;margin-top:4px}
details p{background:var(--papel-2);padding:10px 12px;border-left:2px solid var(--fio-forte);font-size:.9rem;margin-top:8px}
.sem-norma{color:var(--alerta)}

/* botões */
.botao{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:var(--tinta);color:var(--papel);border:0;border-radius:6px;padding:15px 30px;font:600 1rem var(--sans);cursor:pointer;text-decoration:none;min-height:52px;transition:transform .08s ease}
.botao:active{transform:translateY(1px)}
.botao:focus-visible,.link-botao:focus-visible,a:focus-visible,input:focus-visible,summary:focus-visible{outline:2px solid var(--foco);outline-offset:3px}
.acoes{display:flex;gap:20px;align-items:center;flex-wrap:wrap;margin-top:24px}

/* formulários */
label{display:block;font-weight:600;font-size:.92rem;margin:16px 0 6px}
input[type=email],input[type=text]{width:100%;max-width:400px;padding:13px 14px;border:1px solid var(--fio-forte);border-radius:6px;font:1rem var(--sans);background:#fffdf8;color:var(--tinta)}
input[name=crc]{font-family:var(--mono)}
.campos{display:grid;grid-template-columns:1fr 1fr;gap:0 16px;max-width:520px}
.campos input{max-width:none}

/* estados */
.aviso{background:var(--alerta-fundo);border-left:3px solid var(--alerta);padding:12px 14px;margin:0 0 20px;font-size:.95rem}
.erro{color:var(--rejeicao)}
.ok{color:var(--carimbo)}
.ficticio{font-size:.82rem;color:var(--alerta);border:1px dashed var(--alerta);padding:6px 10px;display:inline-block;margin-bottom:20px;border-radius:4px}
.etiqueta{font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:3px 8px;border-radius:3px;border:1px solid currentColor;white-space:nowrap}
.carimbo{border:2px solid var(--carimbo);color:var(--carimbo);background:var(--carimbo-fundo);padding:18px 20px;border-radius:4px}
.carimbo .display{font-size:1.5rem;margin:0 0 6px}
.drop{display:block;border:1.5px dashed var(--fio-forte);border-radius:8px;padding:36px 16px;text-align:center;background:#fffdf8;cursor:pointer}
.drop.ativo{background:var(--papel-2);border-style:solid}
.drop input{margin:14px auto 0;display:block;font:inherit;max-width:100%}
.medidor{height:6px;background:var(--fio);border-radius:3px;overflow:hidden;margin:8px 0 4px}
.medidor span{display:block;height:100%;background:var(--tinta)}

/* landing */
.capa{padding:56px 0 40px}
.capa h1{font-size:clamp(3.2rem,11vw,6.5rem);line-height:.92;letter-spacing:-.035em;margin-bottom:28px}
.capa .lead{font-size:1.25rem;max-width:30ch;color:var(--tinta-2)}
.preco{font-family:var(--serifa);font-size:1.6rem;margin:28px 0 0}
.preco .num{font-family:var(--serifa);font-size:inherit}
.tabela-pacotes td,.tabela-pacotes th{padding:12px 8px 12px 0}

/* rodapé de plantão */
.rodape{position:fixed;left:0;right:0;bottom:0;background:var(--tinta);color:var(--papel);padding:10px 16px;font-size:.88rem;text-align:center}
.rodape strong{font-family:var(--mono);font-weight:600}
.rodape .ponto{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:8px;vertical-align:middle;background:var(--tinta-3)}
.rodape .ponto.aberto{background:oklch(0.75 0.15 150)}

@media (max-width:600px){
  main{padding-top:28px}
  .botao{width:100%}
  .campos{grid-template-columns:1fr}
  .linhas th{width:42%}
  .lista a,.lista .item{flex-direction:column;gap:2px}
  .lista .lado{text-align:left}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
`;

export type Aba = 'notas' | 'contrato' | null;

export function Layout(props: {
  titulo: string;
  usuario?: { nome: string } | null;
  cnpj?: { cnpj: string; razao_social: string } | null;
  aba?: Aba;
  plantao?: { aberto: boolean; telefone: string } | null;
  descricao?: string;
  children: Child;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{props.titulo}</title>
        {props.descricao && <meta name="description" content={props.descricao} />}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap"
        />
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
      </head>
      <body>
        {props.usuario && (
          <header class="topo">
            <div class="topo-in">
              <a class="marca" href="/cnpjs">A nota sem volta</a>
              <nav aria-label="Principal">
                {props.cnpj && (
                  <>
                    <a href={`/c/${props.cnpj.cnpj}/notas`} aria-current={props.aba === 'notas' ? 'page' : undefined}>Notas</a>
                    <a href={`/c/${props.cnpj.cnpj}`} aria-current={props.aba === 'contrato' ? 'page' : undefined}>Contrato</a>
                  </>
                )}
                <span>{props.usuario.nome}</span>
                <form method="post" action="/sair">
                  <button class="link-botao" type="submit">Sair</button>
                </form>
              </nav>
            </div>
          </header>
        )}
        <main>{props.children}</main>
        {props.plantao && <Plantao {...props.plantao} />}
      </body>
    </html>
  );
}

export function Plantao(p: { aberto: boolean; telefone: string }) {
  return (
    <footer class="rodape" role="contentinfo">
      {p.aberto ? (
        <span><i class="ponto aberto" aria-hidden="true"></i>Plantão agora: <strong>{p.telefone}</strong></span>
      ) : (
        <span><i class="ponto" aria-hidden="true"></i>Plantão sexta 18h–22h e sábado 9h–12h · <strong>{p.telefone}</strong></span>
      )}
    </footer>
  );
}
