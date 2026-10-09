function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Rich clipboard content in the requested description-then-image order. */
export function buildProjectClipboardContent(demo) {
  const htmlSteps = [];
  const textSteps = [];
  const steps = demo?.steps || [];

  for (let index = 0; index < steps.length; index++) {
    const step = steps[index];
    const description = String(step?.popover?.description || step?.description || "").trim();
    const image = step?.type === "slide" || typeof step?.image !== "string"
      ? ""
      : step.image.startsWith("data:image/")
        ? step.image
        : "";
    const parts = [];

    if (description) {
      parts.push(`<p>${escapeHtml(description).replace(/\r?\n/g, "<br>")}</p>`);
      textSteps.push(description);
    }
    if (image) {
      parts.push(`<p><img src="${escapeHtml(image)}" alt="" style="display:block;max-width:100%;height:auto"></p>`);
      textSteps.push("[Imagem]");
    }
    if (parts.length) htmlSteps.push(`<section>${parts.join("\n")}</section>`);
    if (parts.length && index < steps.length - 1) textSteps.push("");
  }

  return {
    html: `<!doctype html><html><head><meta charset="utf-8"></head><body>${htmlSteps.join("\n")}</body></html>`,
    text: textSteps.join("\n"),
  };
}
