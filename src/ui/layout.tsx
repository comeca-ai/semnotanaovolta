import type { Child } from 'hono/jsx';

const CSS = `
:root{--tinta:#111;--suave:#5b5b66;--linha:#e3e3e8;--fundo:#fff;--cartao:#fafafb;--ok:#1f8a3b;--erro:#c62828;--ia:#5b2a86;--ia-fundo:#f4eefa;--info:#1d5fd1;--aviso:#b26a00;--raio:12px}
*{box-sizing:border-box}
body{margin:0;background:var(--fundo);color:var(--tinta);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:880px;margin:0 auto;padding:24px 16px 96px}
h1{font-size:2rem;line-height:1.15;margin:8px 0 16px;letter-spacing:-.02em}
h2{font-size:1.15rem;margin:0 0 8px}
p{margin:0 0 12px}
a{color:inherit}
.topo{display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid var(--linha);padding:12px 16px;font-size:.9rem;color:var(--suave)}
.topo a{text-decoration:none}
.marca{font-weight:700;color:var(--tinta)}
.cartao{border:1px solid var(--linha);border-radius:var(--raio);padding:16px;margin:0 0 16px;background:var(--fundo)}
.grade{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.rotulo{font-size:.85rem;color:var(--suave);margin:0}
.valor{font-size:1.1rem;font-weight:600;margin:0}
.grande{font-size:1.8rem;font-weight:700}
.botao{display:inline-block;background:var(--tinta);color:#fff;border:0;border-radius:10px;padding:14px 28px;font:inherit;font-weight:600;cursor:pointer;text-decoration:none;min-height:48px}
.botao:focus-visible,.secundario:focus-visible,input:focus-visible{outline:3px solid var(--info);outline-offset:2px}
.secundario{display:inline-block;background:transparent;color:var(--tinta);border:1.5px solid var(--tinta);border-radius:10px;padding:12.5px 26px;font:inherit;font-weight:600;cursor:pointer;text-decoration:none}
.acoes{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px}
label{display:block;font-weight:600;margin:12px 0 4px}
input[type=email],input[type=text]{width:100%;max-width:420px;padding:12px;border:1px solid var(--linha);border-radius:10px;font:inherit}
table{width:100%;border-collapse:collapse}
th,td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--linha);vertical-align:top}
th{font-size:.85rem;color:var(--suave);font-weight:500}
.tabela{overflow-x:auto}
.ok{color:var(--ok)} .erro{color:var(--erro)} .aviso{color:var(--aviso)}
.ia{border-color:#d9c8ec;background:var(--ia-fundo)}
.ia h2{color:var(--ia)}
.nota-legal{font-size:.9rem;color:var(--suave)}
.selo{display:inline-block;font-size:.8rem;padding:2px 8px;border-radius:99px;background:var(--cartao);border:1px solid var(--linha)}
.ficticio{background:#fff4e0;border:1px solid #f0c98a;color:#7a4b00;padding:8px 12px;border-radius:8px;font-size:.9rem;margin-bottom:16px}
.rodape{position:fixed;left:0;right:0;bottom:0;background:var(--fundo);border-top:1px solid var(--linha);padding:10px 16px;font-size:.9rem;display:flex;justify-content:center;gap:8px;flex-wrap:wrap}
.drop{border:2px dashed var(--linha);border-radius:var(--raio);padding:32px 16px;text-align:center;background:var(--cartao)}
.drop.ativo{border-color:var(--tinta)}
@media (max-width:600px){h1{font-size:1.6rem}.botao{width:100%;text-align:center}}
`;

export function Layout(props: {
  titulo: string;
  usuario?: { nome: string } | null;
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
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
      </head>
      <body>
        {props.usuario && (
          <nav class="topo">
            <a class="marca" href="/cnpjs">A nota sem volta</a>
            <span>
              {props.usuario.nome} ·{' '}
              <form method="post" action="/sair" style="display:inline">
                <button type="submit" style="background:none;border:0;color:inherit;font:inherit;text-decoration:underline;cursor:pointer;padding:0">Sair</button>
              </form>
            </span>
          </nav>
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
        <span>Plantão agora. Ligue: <strong>{p.telefone}</strong></span>
      ) : (
        <span>Plantão fechado. Sexta, 18h às 22h. Sábado, 9h às 12h. <strong>{p.telefone}</strong></span>
      )}
    </footer>
  );
}
