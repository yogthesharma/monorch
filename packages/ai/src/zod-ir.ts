import type { z } from "zod";
import { AiError } from "./errors.js";

/**
 * Patterns must be valid for Rust's `regex` crate (no look-around / backrefs).
 * Pragmatic — not full RFC / WHATWG.
 */
const EMAIL_PATTERN = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";
const UUID_PATTERN =
  "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$";
const URL_PATTERN = "^https?://\\S+$";

/**
 * Compile a Zod schema into the Rust schema IR.
 * Supports common object/string/number/boolean/array/enum/optional shapes,
 * plus string email/uuid/url/regex and number.int().
 */
export function zodToIr(schema: z.ZodTypeAny): unknown {
  return convert(schema);
}

function convert(schema: z.ZodTypeAny): unknown {
  const def = schema._def as { typeName?: string; innerType?: z.ZodTypeAny; description?: string };

  switch (def.typeName) {
    case "ZodString": {
      const checks = (schema as z.ZodString)._def.checks ?? [];
      let minLength: number | undefined;
      let maxLength: number | undefined;
      let pattern: string | undefined;
      for (const c of checks) {
        switch (c.kind) {
          case "min":
            minLength = c.value;
            break;
          case "max":
            maxLength = c.value;
            break;
          case "length":
            minLength = c.value;
            maxLength = c.value;
            break;
          case "email":
            pattern = EMAIL_PATTERN;
            break;
          case "uuid":
            pattern = UUID_PATTERN;
            break;
          case "url":
            pattern = URL_PATTERN;
            break;
          case "regex":
            pattern = c.regex.source;
            break;
          case "startsWith":
            pattern = `^${escapeRegex(c.value)}`;
            break;
          case "endsWith":
            pattern = `${escapeRegex(c.value)}$`;
            break;
          case "includes":
            pattern = escapeRegex(c.value);
            break;
          case "trim":
          case "toLowerCase":
          case "toUpperCase":
            // transforms — IR validates the post-transform shape; ignore here
            break;
          default:
            throw new AiError(
              "SCHEMA_UNSUPPORTED",
              `zodToIr: unsupported ZodString check '${(c as { kind: string }).kind}'`,
              { kind: (c as { kind: string }).kind },
            );
        }
      }
      return {
        type: "string",
        ...(minLength !== undefined ? { minLength } : {}),
        ...(maxLength !== undefined ? { maxLength } : {}),
        ...(pattern !== undefined ? { pattern } : {}),
      };
    }
    case "ZodNumber": {
      const checks = (schema as z.ZodNumber)._def.checks ?? [];
      let minimum: number | undefined;
      let maximum: number | undefined;
      let integer = false;
      for (const c of checks) {
        switch (c.kind) {
          case "min":
            minimum = c.value;
            break;
          case "max":
            maximum = c.value;
            break;
          case "int":
            integer = true;
            break;
          case "finite":
            break;
          default:
            throw new AiError(
              "SCHEMA_UNSUPPORTED",
              `zodToIr: unsupported ZodNumber check '${(c as { kind: string }).kind}'`,
              { kind: (c as { kind: string }).kind },
            );
        }
      }
      return {
        type: "number",
        ...(minimum !== undefined ? { minimum } : {}),
        ...(maximum !== undefined ? { maximum } : {}),
        ...(integer ? { integer: true } : {}),
      };
    }
    case "ZodBoolean":
      return { type: "boolean" };
    case "ZodNull":
      return { type: "null" };
    case "ZodAny":
    case "ZodUnknown":
      return { type: "any" };
    case "ZodEnum": {
      const values = (schema as z.ZodEnum<[string, ...string[]]>)._def.values;
      return { type: "enum", values };
    }
    case "ZodLiteral": {
      const value = (schema as z.ZodLiteral<unknown>)._def.value;
      return { type: "enum", values: [value] };
    }
    case "ZodArray": {
      const items = convert((schema as z.ZodArray<z.ZodTypeAny>)._def.type);
      return { type: "array", items };
    }
    case "ZodObject": {
      const obj = schema as z.ZodObject<z.ZodRawShape>;
      const shape = obj.shape;
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const [key, child] of Object.entries(shape)) {
        const { ir, optional } = unwrapOptional(child as z.ZodTypeAny);
        properties[key] = ir;
        if (!optional) required.push(key);
      }
      const unknownKeys = (obj._def as { unknownKeys?: string }).unknownKeys ?? "strip";
      return {
        type: "object",
        properties,
        required,
        additionalProperties: unknownKeys === "passthrough",
      };
    }
    case "ZodRecord":
      return { type: "object", properties: {}, required: [], additionalProperties: true };
    case "ZodOptional":
      return convert((def as { innerType: z.ZodTypeAny }).innerType);
    case "ZodDefault": {
      const inner = (schema as z.ZodDefault<z.ZodTypeAny>)._def.innerType;
      const defaultValue = (schema as z.ZodDefault<z.ZodTypeAny>)._def.defaultValue();
      const ir = convert(inner) as Record<string, unknown>;
      return { ...ir, default: defaultValue };
    }
    case "ZodNullable": {
      const inner = convert((schema as z.ZodNullable<z.ZodTypeAny>)._def.innerType);
      return { type: "union", anyOf: [inner, { type: "null" }] };
    }
    case "ZodUnion": {
      const options = (schema as z.ZodUnion<[z.ZodTypeAny, ...z.ZodTypeAny[]]>)._def.options;
      return { type: "union", anyOf: options.map(convert) };
    }
    case "ZodEffects":
      throw new AiError(
        "SCHEMA_UNSUPPORTED",
        "zodToIr: ZodEffects (refine/transform/pipe) is unsupported — validate with Zod after parse, or unwrap the inner schema",
      );
    default:
      throw new AiError(
        "SCHEMA_UNSUPPORTED",
        `zodToIr: unsupported Zod type ${def.typeName ?? "unknown"}`,
        { typeName: def.typeName ?? "unknown" },
      );
  }
}

function unwrapOptional(schema: z.ZodTypeAny): { ir: unknown; optional: boolean } {
  const typeName = (schema._def as { typeName?: string }).typeName;
  if (typeName === "ZodOptional") {
    const inner = (schema._def as { innerType: z.ZodTypeAny }).innerType;
    return { ir: convert(inner), optional: true };
  }
  if (typeName === "ZodDefault") {
    return { ir: convert(schema), optional: true };
  }
  return { ir: convert(schema), optional: false };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
