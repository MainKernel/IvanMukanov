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

// 2. Перевірка POST /orders -> CreateOrderRequest.seatIds (minItems / maxItems / uniqueItems, тиждень 7)
const seatIdsBlock = yamlText.match(
  /CreateOrderRequest:[\s\S]*?seatIds:([\s\S]*?)(?=\n\n|\n\s{4}[A-Z])/,
);
if (!seatIdsBlock || !seatIdsBlock[1]) {
  throw new Error(
    '[Contract Sync] Не вдалося знайти блок "CreateOrderRequest.seatIds" в openapi.yaml',
  );
}
const minItems = Number(seatIdsBlock[1].match(/minItems:\s*(\d+)/)?.[1]);
const maxItems = Number(seatIdsBlock[1].match(/maxItems:\s*(\d+)/)?.[1]);
if (Number.isNaN(minItems) || Number.isNaN(maxItems)) {
  errors.push("[POST /orders (CreateOrderRequest.seatIds)] В openapi.yaml очікуються minItems і maxItems");
} else {
  const makeUuid = (idx) =>
    `018f2c1e-5000-7c3d-9e1f-${String(idx).padStart(12, "0")}`;
  const checkSeatIds = (ids, shouldPass, desc) => {
    const ok = createOrderBody.safeParse({
      eventId: "018f2c1e-4a7b-7c3d-9e1f-2a5b6c7d8e9f",
      seatIds: ids,
    }).success;
    if (ok !== shouldPass) {
      errors.push(
        `[POST /orders (CreateOrderRequest.seatIds)] ${desc} мав бути ${shouldPass ? "прийнятий" : "відхилений"}`,
      );
    }
  };
  if (minItems > 0) {
    checkSeatIds(
      Array.from({ length: minItems - 1 }, (_, i) => makeUuid(i + 1)),
      false,
      `масив довжиною ${minItems - 1}`,
    );
  }
  checkSeatIds(
    Array.from({ length: minItems }, (_, i) => makeUuid(i + 1)),
    true,
    `масив довжиною ${minItems}`,
  );
  checkSeatIds(
    Array.from({ length: maxItems }, (_, i) => makeUuid(i + 1)),
    true,
    `масив довжиною ${maxItems}`,
  );
  checkSeatIds(
    Array.from({ length: maxItems + 1 }, (_, i) => makeUuid(i + 1)),
    false,
    `масив довжиною ${maxItems + 1}`,
  );
  checkSeatIds(
    [makeUuid(1), makeUuid(1)],
    false,
    "масив із дублікатами seatIds",
  );
}


// 3. Перевірка GET /events -> query.q (рядкові межі minLength / maxLength, ДЗ ЛР №4)
const qBlock = yamlText.match(
  /- name:\s*q\n[\s\S]*?schema:([\s\S]*?)(?=\n\s*- name:)/,
);
if (!qBlock || !qBlock[1]) {
  throw new Error('[Contract Sync] Не вдалося знайти блок "GET /events parameter q" в openapi.yaml');
}
const qMin = Number(qBlock[1].match(/minLength:\s*(\d+)/)?.[1]);
const qMax = Number(qBlock[1].match(/maxLength:\s*(\d+)/)?.[1]);
if (Number.isNaN(qMin) || Number.isNaN(qMax)) {
  errors.push("[GET /events (query.q)] В openapi.yaml очікуються minLength і maxLength");
} else {
  const check = (len, shouldPass) => {
    const ok = listEventsQuery.safeParse({ q: "я".repeat(len) }).success;
    if (ok !== shouldPass) {
      errors.push(
        `[GET /events (query.q)] Рядок довжиною ${len} мав бути ${shouldPass ? "прийнятий" : "відхилений"} (openapi.yaml: ${qMin}..${qMax})`,
      );
    }
  };
  if (qMin > 0) check(qMin - 1, false);
  check(qMin, true);
  check(qMax, true);
  check(qMax + 1, false);
}

if (errors.length > 0) {
  console.error("\n❌ Виявлено розбіжність між openapi.yaml та Zod-схемами:");
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log(
  `✓ Узгодженість обмежень openapi.yaml ↔ Zod перевірено (limit: ${limitConstraints.minimum}..${limitConstraints.maximum} [default=${limitConstraints.defaultValue}], seatIds: ${minItems}..${maxItems} [unique], q: ${qMin}..${qMax} символів)`,
);

