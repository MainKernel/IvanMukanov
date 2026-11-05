import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const openapiPath = resolve(__dirname, "../openapi.yaml");
const yamlText = readFileSync(openapiPath, "utf8");

/**
 * Витягує числові обмеження (minimum, maximum, default) із визначення поля/параметра
 * в openapi.yaml (підтримує як компактний flow-стиль `{ minimum: 1, maximum: 50 }`,
 * так і блоковий стиль YAML).
 */
function extractNumericConstraints(contextName, blockPattern) {
  const match = yamlText.match(blockPattern);
  if (!match || !match[1]) {
    throw new Error(
      `[Contract Sync] Не вдалося знайти блок "${contextName}" в openapi.yaml`,
    );
  }
  const block = match[1];
  const minMatch = block.match(/minimum:\s*(-?\d+)/);
  const maxMatch = block.match(/maximum:\s*(-?\d+)/);
  const defMatch = block.match(/default:\s*(-?\d+)/);

  return {
    minimum: minMatch ? Number(minMatch[1]) : undefined,
    maximum: maxMatch ? Number(maxMatch[1]) : undefined,
    defaultValue: defMatch ? Number(defMatch[1]) : undefined,
  };
}

const { listEventsQuery, createOrderBody } = await import("../dist/index.js");

const errors = [];

function verifyField({
  label,
  schema,
  fieldName,
  baseInput,
  constraints,
}) {
  const { minimum, maximum, defaultValue } = constraints;

  if (defaultValue !== undefined) {
    const parsedDefault = schema.safeParse(baseInput);
    if (!parsedDefault.success) {
      errors.push(
        `[${label}] Базовий вхід без поля "${fieldName}" мав застосувати default=${defaultValue}, але схема впала: ${parsedDefault.error.message}`,
      );
    } else if (parsedDefault.data[fieldName] !== defaultValue) {
      errors.push(
        `[${label}] Розбіжність default: openapi.yaml=${defaultValue}, Zod=${parsedDefault.data[fieldName]}`,
      );
    }
  }

  if (minimum !== undefined) {
    const atMin = schema.safeParse({ ...baseInput, [fieldName]: minimum });
    if (!atMin.success) {
      errors.push(
        `[${label}] Розбіжність minimum: openapi.yaml дозволяє ${minimum}, але Zod-схема його відхилила`,
      );
    }
    const belowMin = schema.safeParse({
      ...baseInput,
      [fieldName]: minimum - 1,
    });
    if (belowMin.success) {
      errors.push(
        `[${label}] Розбіжність minimum: openapi.yaml вимагає >= ${minimum}, але Zod-схема прийняла ${minimum - 1}`,
      );
    }
  }

  if (maximum !== undefined) {
    const atMax = schema.safeParse({ ...baseInput, [fieldName]: maximum });
    if (!atMax.success) {
      errors.push(
        `[${label}] Розбіжність maximum: openapi.yaml дозволяє ${maximum}, але Zod-схема його відхилила`,
      );
    }
    const aboveMax = schema.safeParse({
      ...baseInput,
      [fieldName]: maximum + 1,
    });
    if (aboveMax.success) {
      errors.push(
        `[${label}] Розбіжність maximum: openapi.yaml вимагає <= ${maximum}, але Zod-схема прийняла ${maximum + 1}`,
      );
    }
  }
}

// 1. Перевірка GET /events -> query.limit
const limitConstraints = extractNumericConstraints(
  "GET /events parameter limit",
  /- name:\s*limit[\s\S]*?schema:\s*(\{[^\n}]+\}|[\s\S]*?(?=\n\s*responses:))/,
);

verifyField({
  label: "GET /events (query.limit)",
  schema: listEventsQuery,
  fieldName: "limit",
  baseInput: {},
  constraints: limitConstraints,
});

// 2. Перевірка POST /orders -> CreateOrderRequest.quantity
const quantityConstraints = extractNumericConstraints(
  "CreateOrderRequest.quantity",
  /CreateOrderRequest:[\s\S]*?quantity:\s*(\{[^\n}]+\})/,
);

verifyField({
  label: "POST /orders (CreateOrderRequest.quantity)",
  schema: createOrderBody,
  fieldName: "quantity",
  baseInput: {
    eventId: "018f2c1e-4a7b-7c3d-9e1f-2a5b6c7d8e9f",
    buyerId: "018f2c1e-9999-7c3d-9e1f-2a5b6c7d8e11",
  },
  constraints: quantityConstraints,
});

if (errors.length > 0) {
  console.error("\n❌ Виявлено розбіжність між openapi.yaml та Zod-схемами:");
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log(
  `✓ Узгодженість обмежень openapi.yaml ↔ Zod перевірено (limit: ${limitConstraints.minimum}..${limitConstraints.maximum} [default=${limitConstraints.defaultValue}], quantity: ${quantityConstraints.minimum}..${quantityConstraints.maximum})`,
);

