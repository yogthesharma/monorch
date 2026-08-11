import type { z } from "zod";

/**
 * Compile a Zod schema into the Rust schema IR.
 * Supports common object/string/number/boolean/array/enum/optional shapes.
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
      for (const c of checks) {
        if (c.kind === "min") minLength = c.value;
        if (c.kind === "max") maxLength = c.value;
      }
      return {
        type: "string",
        ...(minLength !== undefined ? { minLength } : {}),
        ...(maxLength !== undefined ? { maxLength } : {}),
      };
    }
    case "ZodNumber": {
      const checks = (schema as z.ZodNumber)._def.checks ?? [];
      let minimum: number | undefined;
      let maximum: number | undefined;
      for (const c of checks) {
        if (c.kind === "min") minimum = c.value;
        if (c.kind === "max") maximum = c.value;
      }
      return {
        type: "number",
        ...(minimum !== undefined ? { minimum } : {}),
        ...(maximum !== undefined ? { maximum } : {}),
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
      throw new Error(
        "zodToIr: ZodEffects (refine/transform/pipe) is unsupported — validate with Zod after parse, or unwrap the inner schema",
      );
    default:
      throw new Error(`zodToIr: unsupported Zod type ${def.typeName ?? "unknown"}`);
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
