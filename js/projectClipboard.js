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
    const rows = [];

    if (description) {
      rows.push(`<tr><td style="padding:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#252525">${escapeHtml(description).replace(/\r?\n/g, "<br>")}</td></tr>`);
      textSteps.push(description);
    }
    if (image) {
      const alt = step?.popover?.title || step?.label || "";
      const imageWidth = Number.isFinite(Number(step?.clipboardImageWidth))
        ? Math.min(720, Math.max(1, Math.round(Number(step.clipboardImageWidth))))
        : 720;
      rows.push(`<tr><td align="center" style="padding:0;text-align:center"><img src="${escapeHtml(image)}" alt="${escapeHtml(alt)}" width="${imageWidth}" style="display:block;width:${imageWidth}px;max-width:100%;height:auto;border:1px solid #dedede;border-radius:4px"></td></tr>`);
      textSteps.push("[Imagem]");
    }
    if (rows.length) {
      htmlSteps.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:720px;border-collapse:collapse;margin:0 0 24px"><tbody>${rows.join("")}</tbody></table>`);
    }
    if (rows.length && index < steps.length - 1) textSteps.push("");
  }

  return {
    html: `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#252525">${htmlSteps.join("\n")}</body></html>`,
    text: textSteps.join("\n"),
  };
}
