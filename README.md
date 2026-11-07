# MXRF11 · O Número Mágico

Simulador PWA de reinvestimento de dividendos do MXRF11 (360 meses): cenários Nominal, Inflação e Aportes, número mágico, gráficos, tabela com CSV (`;` e vírgula decimal) e funcionamento offline.

## Estrutura (tudo na raiz, sem subpastas)

`index.html`, `style.css`, `calculator.js`, `charts.js`, `app.js`, `manifest.json`, `service-worker.js`, `data.json`, `update_market_data.py`, ícones (`icon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`) e `test_calculator.js` (opcional).

A única pasta é a do workflow: `.github/workflows/update-market-data.yml` (veja o passo 3).

## Publicar pelo iPhone

1. Descompacte o ZIP no app **Arquivos**.
2. No GitHub (Safari), abra seu repositório → **Add file → Upload files** e envie **todos os arquivos da raiz** (substitua os antigos). Apague do repositório `manifest.webmanifest`, `service-worker.js` antigo só se aparecer duplicado, e as pastas `css`, `js`, `icons`, caso existam.
3. **Add file → Create new file**. No campo do nome digite `.github/workflows/update-market-data.yml` (ao digitar `/` o GitHub cria as pastas). Cole o conteúdo do arquivo `update-market-data.yml` (está dentro do ZIP) e faça **Commit**.
4. **Settings → Pages** → *Deploy from a branch* → `main` / `(root)`.
5. **Settings → Actions → General → Workflow permissions** → *Read and write permissions*.
6. Aba **Actions** → *Atualizar dados do MXRF11* → **Run workflow** para testar.
7. Abra `https://SEU-USUARIO.github.io/NOME-DO-REPO/` no Safari → Compartilhar → **Adicionar à Tela de Início**. No Android: menu do Chrome → **Instalar app**.

## Atualização de dados

- O GitHub Actions roda diariamente às 12:00 UTC (09:00 de Brasília), podendo atrasar.
- `update_market_data.py` tenta o Status Invest; se falhar ou os valores forem implausíveis, tenta o Yahoo Finance (MXRF11.SA). Se tudo falhar, **`data.json` não é alterado**.
- O botão "Atualizar dados" do app relê o `data.json` publicado (o navegador não consegue consultar essas fontes diretamente por bloqueio de CORS).
- Valores digitados por você não são sobrescritos ao abrir o app; só o botão "Atualizar dados" os substitui.
- Não foi possível testar as fontes externas durante a construção. Rode o workflow uma vez e confira o `data.json`.

## Regras do cálculo

Número mágico = ⌈cotas desejadas × preço ÷ dividendo⌉. Mês 1 começa com essas cotas. Rendimento e sobra são calculados em centavos inteiros; só se compram cotas inteiras; cotas compradas rendem a partir do mês seguinte; o aporte começa no mês 2 e é reajustado a cada 12 meses; valor real = nominal ÷ (1 + inflação)^(mês/12).

Aviso: simulação educativa, não é recomendação de investimento.
