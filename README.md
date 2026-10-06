# TrackDoc

![Editor do TrackDoc](docs/editor.png)

![Tour de exemplo](docs/tour.gif)

Editor e player de tours com capturas de tela, destaque, clique simulado e narração. Inclui uma extensão Chrome para gravar o produto e um app desktop (Electron) com captura embutida.

A interface está em português, espanhol e inglês. O idioma segue o do navegador; se não for um desses três, cai em inglês. No editor, o seletor fica na barra superior (PT, ES, EN). Na extensão, o mesmo seletor fica no popup e vale também para a barra de captura na página.

## Começar no navegador

```bash
npm start
```

Abre em `http://localhost:4173`. O endereço publicado é [https://trackdocumentations.vercel.app](https://trackdocumentations.vercel.app). Na primeira visita a biblioteca recebe o projeto **Como usar o TrackDoc**.

### Voz local

O áudio da narração é gerado no dispositivo pelo Kokoro, sem chave de API. Na primeira geração, o app baixa o modelo quantizado (~95 MB) e o fonemizador local (~18 MB); os arquivos ficam em cache para usos seguintes. O áudio WAV gerado fica salvo no passo e segue junto no projeto/exportação. É necessária uma conexão à internet apenas para o primeiro download do runtime e do modelo.

### Extensão de captura

Instale pela [Chrome Web Store](https://chromewebstore.google.com/detail/bogjjfmcceccnepkpijiohglllbgbofd) ou baixe o [`ZIP da extensão TrackDoc`](downloads/trackdoc-captura.zip). O manual está em [`ajuda.html`](ajuda.html).

Para desenvolver a extensão localmente:

1. `npm run pack:extension` (ou carregue a pasta `extension/`)
2. Em `chrome://extensions`, ative o modo do desenvolvedor e carregue a pasta da extensão
3. No popup, o campo Editor deve ser a mesma origem do site (`https://trackdocumentations.vercel.app`, ou `http://localhost:4173` no desenvolvimento)
4. No popup, escolha PT, ES ou EN se quiser um idioma diferente do navegador
5. Inicie a captura na aba do produto, fotografe, marque o clique e crie o projeto

## App desktop

```bash
npm install
npm run desktop
```

Gera a pasta de distribuição local (sem assinatura):

```bash
npm run dist:desktop
```

No desktop, use **Capturar** no editor: abre uma janela com a página do produto, fotografa e monta o projeto. No navegador continue com a extensão.

## Componentes React

O Dock do editor usa React, TypeScript, Tailwind CSS v4 e a estrutura shadcn. Componentes reutilizáveis ficam em `components/ui/`, os estilos globais do Dock em `components/dock.css` e o alias `@/` está configurado em `tsconfig.json` e `components.json`.

`npm start` compila o Dock antes de abrir o servidor. Para verificar os tipos, execute `npm run typecheck`; para recompilar o Dock continuamente enquanto desenvolve, use `npm run dev:dock` em outro terminal.

## Exportar

- **HTML navegável** — um arquivo único com o tour
- **Vídeo MP4** — frames do tour via WebCodecs; se o encoder não existir, cai em `MediaRecorder` (pode sair WebM)
- **Link do preview** — no menu Compartilhar; publica um endereço curto `/v/…` só para ver o tour (requer Blob na Vercel)

## Testes

```bash
npm test
```

## Licença

MIT — ver [`LICENSE`](LICENSE).

### Terceiros

- [driver.js](https://github.com/kamranahmedse/driver.js) 1.3.6 — MIT © Kamran Ahmed (`vendor/driver/`)
- [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) — MIT (`vendor/mp4-muxer/`)
- [kokoro-js](https://github.com/hexgrad/kokoro) — Apache-2.0; pesos do modelo Kokoro — Apache-2.0
- [eSpeak NG](https://github.com/espeak-ng/espeak-ng) via `espeak-ng` — GPL-3.0-or-later; usado localmente para fonemizar português e espanhol
- O build Electron inclui Chromium; o empacotador gera os avisos em `LICENSES.chromium.html` na pasta de saída

Este repositório não empacota ffmpeg nem libx264.
