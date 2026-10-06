# Revisão de desempenho — 05/10/2026

As alterações preservam o formato dos projetos e a versão dos bancos IndexedDB.

## Alterações aplicadas

| Fluxo | Problema encontrado | Alteração |
| --- | --- | --- |
| Player público | Importava todo o editor para duas funções de layout | Layout extraído para `js/slideLayout.js`; editor e funções de IA saíram das dependências do preview |
| Edição de campos | Reconstruía todas as miniaturas a cada tecla e repetia o processamento no evento `change` | Atualização do título apenas na miniatura selecionada; uma única assinatura de `input` nos campos comuns |
| Imagem no canvas | Reatribuía `src` quando o mesmo arquivo ainda estava carregando | Preserva o carregamento em andamento e atualiza o callback |
| Layout de slides | Criava consultas de imagem concorrentes e mantinha cache sem limite | Compartilha a promessa de dimensões, limita o cache a 64 entradas e ignora resultados de layouts antigos |
| Banco local | Abria e fechava uma conexão por operação; repetia código de transações | Helper compartilhado em `js/database.js`, conexão reutilizada, fechamento em mudança de versão e aborto em falha do callback |
| Inicialização | Lia o projeto ativo duas vezes | Reutiliza o projeto já carregado |
| Biblioteca | Ordenava e pesquisava o índice repetidamente durante a reconciliação | Reconstrói os resumos e ordena uma única vez |
| Histórico | Serializava imagens e áudios inteiros para comparar estados | Compara a estrutura e os valores diretamente, evitando a serialização em JSON |
| Salvamento | Clonava novamente todas as entradas do histórico; capturava pilhas dentro da fila assíncrona | Captura o projeto e as pilhas no momento do salvamento; reaproveita entradas imutáveis, que o IndexedDB já copia ao gravar |
| Exportação | Recarregava screenshots repetidos, copiava buffers de áudio e acumulava listeners de cancelamento | Cache por URL resolvida, ignora imagens de slides, remove cópia do buffer e limpa listeners ao concluir cada espera |
| Exportação de HTML | Clonava o projeto com serialização e parse de JSON | Usa `structuredClone` |
| Compartilhamento | Fazia `head` mesmo com URL disponível no meta e podia ler o meta novamente | Reutiliza o meta validado e mantém o fallback para publicações sem URL registrada |
| Revogação | Fazia duas consultas preparatórias para descobrir URLs | Envia os dois pathnames diretamente a `del`, suportado pelo SDK instalado |

## Medições

Dependências estáticas locais a partir de `js/viewApp.js`, somando os arquivos JavaScript sem compressão:

| Medida | Antes | Depois |
| --- | ---: | ---: |
| Módulos | 18 | 12 |
| Bytes de origem | 306.307 | 163.608 |

Redução aproximada de 47% no JavaScript desse grafo. Essa soma exclui driver.js, imagens e bibliotecas carregadas dinamicamente e não equivale ao tamanho transferido com compressão HTTP.

Benchmark no Node 24.14.1, na mesma máquina: 100 passos, uma imagem sintética de 2 MiB, 20 entradas de histórico e mediana de 15 amostras após aquecimento:

| Operação | Antes | Depois |
| --- | ---: | ---: |
| Consolidar edição no histórico | 9,388 ms | 3,260 ms |
| Preparar captura para salvamento | 68,813 ms | 3,250 ms |

A captura posterior inclui a nova cópia isolada do projeto. O benchmark mede processamento em memória, não escrita real no IndexedDB, rede, FPS ou o desempenho total da aplicação.

Executar a medição atual:

```powershell
node scripts/benchmark-history.mjs
```

Para comparar com uma versão anterior, informar o caminho de seu `history.js` como argumento adicional.

## Validação

- `npm test`: 96 testes; cobertura adicionada para conexão compartilhada, reabertura, aborto de transação, histórico, imagem em carregamento, layout assíncrono, preparação das imagens de exportação e consultas do compartilhamento.
- Sintaxe dos 14 arquivos de implementação e benchmark alterados ou criados verificada com `node --check`.
- Chrome, aplicação local em porta isolada: edição de título, atualização da miniatura, desfazer, refazer, persistência e restauração do histórico após reload, preview de slide e de screenshot.
- Consultas da API verificadas com SDK simulado; as operações de Blob em produção e a geração completa de vídeo com WebCodecs/MediaRecorder não foram executadas nesta revisão.

## Próximos pontos com maior potencial

1. **Separar mídias do histórico.** Imagens e áudios ainda ficam como data URLs nos projetos. Um armazenamento de mídia por identificador permitiria compartilhar os mesmos arquivos entre snapshots, reduzindo memória e espaço no banco. Exige migração dos dados e revisão de importação/exportação.
2. **Criar um store de resumos de projetos.** A reconciliação inicial ainda usa `getAll()` dos projetos completos. Bibliotecas grandes poderiam carregar apenas metadados e miniaturas reduzidas. Exige migração do schema e tratamento de recuperação do índice.
3. **Atualizar a filmstrip por identidade e virtualizar listas grandes.** Mudanças estruturais e seleção ainda podem reconstruir a lista. O maior ganho viria em projetos com centenas de passos, mediante atualização dos elementos existentes e renderização apenas dos itens visíveis.
