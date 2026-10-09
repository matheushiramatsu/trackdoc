import assert from "node:assert/strict";
import test from "node:test";
import { buildProjectClipboardContent } from "./projectClipboard.js";

test("clipboard formata cada passo como descrição seguida da imagem", () => {
  const { html, text } = buildProjectClipboardContent({
    steps: [
      {
        popover: { description: "Primeira <descrição>" },
        image: "data:image/png;base64,AAA",
      },
      {
        popover: { description: "Segunda descrição" },
        image: "data:image/jpeg;base64,BBB",
      },
    ],
  });

  const firstDescription = html.indexOf("Primeira &lt;descrição&gt;");
  const firstImage = html.indexOf("data:image/png;base64,AAA");
  const secondDescription = html.indexOf("Segunda descrição");
  const secondImage = html.indexOf("data:image/jpeg;base64,BBB");
  assert.ok(firstDescription < firstImage);
  assert.ok(firstImage < secondDescription);
  assert.ok(secondDescription < secondImage);
  assert.equal(text, "Primeira <descrição>\n[Imagem]\n\nSegunda descrição\n[Imagem]");
});

test("clipboard omite telas sem descrição nem imagem e slides sem captura", () => {
  const { html, text } = buildProjectClipboardContent({
    steps: [
      { popover: { description: "" }, image: "" },
      { type: "slide", popover: { description: "Somente texto" }, image: "data:image/png;base64,IGNORADA" },
    ],
  });

  assert.match(html, /Somente texto/);
  assert.doesNotMatch(html, /IGNORADA/);
  assert.equal(text, "Somente texto");
});
