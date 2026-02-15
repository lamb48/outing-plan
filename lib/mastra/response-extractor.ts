function getStepText(step: unknown): string {
  if (!step || typeof step !== "object") {
    return "";
  }

  const stepRecord = step as Record<string, unknown>;
  if (typeof stepRecord.text === "string" && stepRecord.text.trim()) {
    return stepRecord.text.trim();
  }

  const content = stepRecord.content;
  if (!Array.isArray(content)) {
    return "";
  }

  for (let i = content.length - 1; i >= 0; i--) {
    const item = content[i];
    if (!item || typeof item !== "object") {
      continue;
    }

    const contentItem = item as Record<string, unknown>;
    if (contentItem.type === "text" && typeof contentItem.text === "string") {
      const text = contentItem.text.trim();
      if (text) {
        return text;
      }
    }
  }

  return "";
}

function unknownToText(value: unknown): string {
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  try {
    const serialized = JSON.stringify(value);
    return serialized && serialized !== "{}" && serialized !== "[]" ? serialized : "";
  } catch {
    return "";
  }
}

/**
 * エージェントレスポンスから下書きテキストを抽出
 */
export function extractDraftText(response: unknown): string {
  if (!response || typeof response !== "object") {
    return "";
  }

  const responseRecord = response as Record<string, unknown>;
  const candidates: string[] = [];

  if (typeof responseRecord.text === "string" && responseRecord.text.trim()) {
    candidates.push(responseRecord.text.trim());
  }

  const objectText = unknownToText(responseRecord.object);
  if (objectText) {
    candidates.push(objectText);
  }

  const steps = responseRecord.steps;
  if (Array.isArray(steps)) {
    for (let i = steps.length - 1; i >= 0; i--) {
      const stepText = getStepText(steps[i]);
      if (stepText) {
        candidates.push(stepText);
      }

      const step = steps[i];
      if (!step || typeof step !== "object") {
        continue;
      }

      const content = (step as Record<string, unknown>).content;
      if (!Array.isArray(content)) {
        continue;
      }

      for (let j = content.length - 1; j >= 0; j--) {
        const item = content[j];
        if (!item || typeof item !== "object") {
          continue;
        }

        const record = item as Record<string, unknown>;
        if (record.type === "tool-result") {
          const outputText = unknownToText(record.output);
          if (outputText) {
            candidates.push(outputText);
          }
        }
      }
    }
  }

  for (const candidate of candidates) {
    if (candidate) {
      return candidate;
    }
  }

  const rawResponseText = unknownToText(response);
  if (rawResponseText) {
    return rawResponseText;
  }

  return "";
}
