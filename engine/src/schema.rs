//! Schema IR + validate / parse (coerce, strip, defaults) + encode/decode.

use serde::{Deserialize, Serialize};
use serde_json::{Map, Number, Value};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Schema {
    #[serde(rename = "string", rename_all = "camelCase")]
    String {
        #[serde(default, skip_serializing_if = "Option::is_none")]
        min_length: Option<usize>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        max_length: Option<usize>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        pattern: Option<String>,
        #[serde(default, rename = "default", skip_serializing_if = "Option::is_none")]
        default_value: Option<Value>,
    },
    #[serde(rename = "number", rename_all = "camelCase")]
    Number {
        #[serde(default, skip_serializing_if = "Option::is_none")]
        minimum: Option<f64>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        maximum: Option<f64>,
        #[serde(default, rename = "default", skip_serializing_if = "Option::is_none")]
        default_value: Option<Value>,
    },
    #[serde(rename = "boolean", rename_all = "camelCase")]
    Boolean {
        #[serde(default, rename = "default", skip_serializing_if = "Option::is_none")]
        default_value: Option<Value>,
    },
    #[serde(rename = "null")]
    Null {},
    #[serde(rename = "enum", rename_all = "camelCase")]
    Enum {
        values: Vec<Value>,
        #[serde(default, rename = "default", skip_serializing_if = "Option::is_none")]
        default_value: Option<Value>,
    },
    #[serde(rename = "object", rename_all = "camelCase")]
    Object {
        #[serde(default)]
        properties: BTreeMap<String, Schema>,
        #[serde(default)]
        required: Vec<String>,
        #[serde(default = "default_true")]
        additional_properties: bool,
        #[serde(default, rename = "default", skip_serializing_if = "Option::is_none")]
        default_value: Option<Value>,
    },
    #[serde(rename = "array", rename_all = "camelCase")]
    Array {
        items: Box<Schema>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        min_items: Option<usize>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        max_items: Option<usize>,
        #[serde(default, rename = "default", skip_serializing_if = "Option::is_none")]
        default_value: Option<Value>,
    },
    #[serde(rename = "union", rename_all = "camelCase")]
    Union {
        any_of: Vec<Schema>,
        #[serde(default, rename = "default", skip_serializing_if = "Option::is_none")]
        default_value: Option<Value>,
    },
    #[serde(rename = "any", rename_all = "camelCase")]
    Any {
        #[serde(default, rename = "default", skip_serializing_if = "Option::is_none")]
        default_value: Option<Value>,
    },
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Copy)]
pub struct ParseOptions {
    pub coerce: bool,
    pub strip: bool,
    pub defaults: bool,
}

impl Default for ParseOptions {
    fn default() -> Self {
        Self {
            coerce: true,
            strip: true,
            defaults: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationIssue {
    pub path: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub ok: bool,
    pub errors: Vec<ValidationIssue>,
}

impl ValidationResult {
    pub fn success() -> Self {
        Self {
            ok: true,
            errors: Vec::new(),
        }
    }

    pub fn failure(errors: Vec<ValidationIssue>) -> Self {
        Self { ok: false, errors }
    }
}

pub fn validate(schema: &Schema, value: &Value) -> ValidationResult {
    let mut errors = Vec::new();
    let _ = transform(
        schema,
        value.clone(),
        "",
        &ParseOptions {
            coerce: false,
            strip: false,
            defaults: false,
        },
        &mut errors,
    );
    if errors.is_empty() {
        ValidationResult::success()
    } else {
        ValidationResult::failure(errors)
    }
}

pub fn parse(schema: &Schema, value: Value) -> Result<Value, ValidationResult> {
    parse_with(schema, value, ParseOptions::default())
}

pub fn parse_with(
    schema: &Schema,
    value: Value,
    opts: ParseOptions,
) -> Result<Value, ValidationResult> {
    let mut errors = Vec::new();
    let out = transform(schema, value, "", &opts, &mut errors);
    if errors.is_empty() {
        Ok(out)
    } else {
        Err(ValidationResult::failure(errors))
    }
}

pub fn encode(schema: &Schema, value: &Value) -> Result<String, ValidationResult> {
    let normalized = parse(schema, value.clone())?;
    serde_json::to_string(&normalized).map_err(|e| {
        ValidationResult::failure(vec![issue("$", format!("serialize failed: {e}"))])
    })
}

pub fn decode(schema: &Schema, bytes: &[u8]) -> Result<Value, ValidationResult> {
    let value: Value = serde_json::from_slice(bytes).map_err(|e| {
        ValidationResult::failure(vec![issue("$", format!("invalid json: {e}"))])
    })?;
    parse(schema, value)
}

pub fn to_json_schema(schema: &Schema) -> Value {
    match schema {
        Schema::String {
            min_length,
            max_length,
            pattern,
            default_value,
        } => {
            let mut m = Map::new();
            m.insert("type".into(), Value::String("string".into()));
            if let Some(v) = min_length {
                m.insert("minLength".into(), Value::Number((*v as u64).into()));
            }
            if let Some(v) = max_length {
                m.insert("maxLength".into(), Value::Number((*v as u64).into()));
            }
            if let Some(p) = pattern {
                m.insert("pattern".into(), Value::String(p.clone()));
            }
            if let Some(d) = default_value {
                m.insert("default".into(), d.clone());
            }
            Value::Object(m)
        }
        Schema::Number {
            minimum,
            maximum,
            default_value,
        } => {
            let mut m = Map::new();
            m.insert("type".into(), Value::String("number".into()));
            if let Some(v) = minimum {
                if let Some(n) = Number::from_f64(*v) {
                    m.insert("minimum".into(), Value::Number(n));
                }
            }
            if let Some(v) = maximum {
                if let Some(n) = Number::from_f64(*v) {
                    m.insert("maximum".into(), Value::Number(n));
                }
            }
            if let Some(d) = default_value {
                m.insert("default".into(), d.clone());
            }
            Value::Object(m)
        }
        Schema::Boolean { default_value } => {
            let mut m = Map::new();
            m.insert("type".into(), Value::String("boolean".into()));
            if let Some(d) = default_value {
                m.insert("default".into(), d.clone());
            }
            Value::Object(m)
        }
        Schema::Null {} => serde_json::json!({ "type": "null" }),
        Schema::Enum {
            values,
            default_value,
        } => {
            let mut m = Map::new();
            m.insert("enum".into(), Value::Array(values.clone()));
            if let Some(d) = default_value {
                m.insert("default".into(), d.clone());
            }
            Value::Object(m)
        }
        Schema::Object {
            properties,
            required,
            additional_properties,
            default_value,
        } => {
            let mut props = Map::new();
            for (k, v) in properties {
                props.insert(k.clone(), to_json_schema(v));
            }
            let mut m = Map::new();
            m.insert("type".into(), Value::String("object".into()));
            m.insert("properties".into(), Value::Object(props));
            if !required.is_empty() {
                m.insert(
                    "required".into(),
                    Value::Array(required.iter().map(|s| Value::String(s.clone())).collect()),
                );
            }
            m.insert(
                "additionalProperties".into(),
                Value::Bool(*additional_properties),
            );
            if let Some(d) = default_value {
                m.insert("default".into(), d.clone());
            }
            Value::Object(m)
        }
        Schema::Array {
            items,
            min_items,
            max_items,
            default_value,
        } => {
            let mut m = Map::new();
            m.insert("type".into(), Value::String("array".into()));
            m.insert("items".into(), to_json_schema(items));
            if let Some(v) = min_items {
                m.insert("minItems".into(), Value::Number((*v as u64).into()));
            }
            if let Some(v) = max_items {
                m.insert("maxItems".into(), Value::Number((*v as u64).into()));
            }
            if let Some(d) = default_value {
                m.insert("default".into(), d.clone());
            }
            Value::Object(m)
        }
        Schema::Union {
            any_of,
            default_value,
        } => {
            let mut m = Map::new();
            m.insert(
                "anyOf".into(),
                Value::Array(any_of.iter().map(to_json_schema).collect()),
            );
            if let Some(d) = default_value {
                m.insert("default".into(), d.clone());
            }
            Value::Object(m)
        }
        Schema::Any { default_value } => {
            let mut m = Map::new();
            if let Some(d) = default_value {
                m.insert("default".into(), d.clone());
            }
            Value::Object(m)
        }
    }
}

fn transform(
    schema: &Schema,
    value: Value,
    path: &str,
    opts: &ParseOptions,
    errors: &mut Vec<ValidationIssue>,
) -> Value {
    let loc = if path.is_empty() { "$" } else { path };

    let value = if matches!(value, Value::Null) {
        if opts.defaults {
            if let Some(d) = schema_default(schema) {
                d.clone()
            } else {
                value
            }
        } else {
            value
        }
    } else {
        value
    };

    match schema {
        Schema::Any { .. } => value,
        Schema::Null {} => {
            if !value.is_null() {
                errors.push(issue(loc, "expected null"));
            }
            value
        }
        Schema::String {
            min_length,
            max_length,
            pattern,
            ..
        } => {
            let v = if opts.coerce {
                coerce_string(&value).unwrap_or(value)
            } else {
                value
            };
            match v.as_str() {
                Some(s) => {
                    if let Some(min) = min_length {
                        if s.len() < *min {
                            errors.push(issue(loc, format!("string shorter than {min}")));
                        }
                    }
                    if let Some(max) = max_length {
                        if s.len() > *max {
                            errors.push(issue(loc, format!("string longer than {max}")));
                        }
                    }
                    if let Some(pat) = pattern {
                        if pat != s && !pat.contains('*') {
                            errors.push(issue(loc, "string does not match pattern"));
                        }
                    }
                    Value::String(s.to_string())
                }
                None => {
                    errors.push(issue(loc, "expected string"));
                    v
                }
            }
        }
        Schema::Number {
            minimum, maximum, ..
        } => {
            let v = if opts.coerce {
                coerce_number(&value).unwrap_or(value)
            } else {
                value
            };
            match v.as_f64() {
                Some(n) => {
                    if let Some(min) = minimum {
                        if n < *min {
                            errors.push(issue(loc, format!("number less than {min}")));
                        }
                    }
                    if let Some(max) = maximum {
                        if n > *max {
                            errors.push(issue(loc, format!("number greater than {max}")));
                        }
                    }
                    v
                }
                None => {
                    errors.push(issue(loc, "expected number"));
                    v
                }
            }
        }
        Schema::Boolean { .. } => {
            let v = if opts.coerce {
                coerce_bool(&value).unwrap_or(value)
            } else {
                value
            };
            if !v.is_boolean() {
                errors.push(issue(loc, "expected boolean"));
            }
            v
        }
        Schema::Enum { values, .. } => {
            if !values.iter().any(|e| e == &value) {
                errors.push(issue(loc, "value not in enum"));
            }
            value
        }
        Schema::Union { any_of, .. } => {
            for branch in any_of {
                let mut branch_errors = Vec::new();
                let out = transform(branch, value.clone(), path, opts, &mut branch_errors);
                if branch_errors.is_empty() {
                    return out;
                }
            }
            errors.push(issue(loc, "value matched no union branch"));
            value
        }
        Schema::Object {
            properties,
            required,
            additional_properties,
            ..
        } => {
            let Some(obj) = value.as_object() else {
                errors.push(issue(loc, "expected object"));
                return value;
            };
            let mut out = Map::new();
            for key in required {
                if !obj.contains_key(key) {
                    if opts.defaults {
                        if let Some(prop) = properties.get(key) {
                            if let Some(d) = schema_default(prop) {
                                let child = format!("{loc}.{key}");
                                out.insert(
                                    key.clone(),
                                    transform(prop, d.clone(), &child, opts, errors),
                                );
                                continue;
                            }
                        }
                    }
                    errors.push(issue(loc, format!("missing required property '{key}'")));
                }
            }
            for (key, prop_schema) in properties {
                if let Some(val) = obj.get(key) {
                    let child = format!("{loc}.{key}");
                    out.insert(
                        key.clone(),
                        transform(prop_schema, val.clone(), &child, opts, errors),
                    );
                } else if !required.contains(key) {
                    if opts.defaults {
                        if let Some(d) = schema_default(prop_schema) {
                            let child = format!("{loc}.{key}");
                            out.insert(
                                key.clone(),
                                transform(prop_schema, d.clone(), &child, opts, errors),
                            );
                        }
                    }
                }
            }
            for (key, val) in obj {
                if properties.contains_key(key) {
                    continue;
                }
                if *additional_properties {
                    out.insert(key.clone(), val.clone());
                } else if !opts.strip {
                    errors.push(issue(loc, format!("unexpected property '{key}'")));
                }
            }
            Value::Object(out)
        }
        Schema::Array {
            items,
            min_items,
            max_items,
            ..
        } => {
            let Some(arr) = value.as_array() else {
                errors.push(issue(loc, "expected array"));
                return value;
            };
            if let Some(min) = min_items {
                if arr.len() < *min {
                    errors.push(issue(loc, format!("array shorter than {min}")));
                }
            }
            if let Some(max) = max_items {
                if arr.len() > *max {
                    errors.push(issue(loc, format!("array longer than {max}")));
                }
            }
            let mut out = Vec::with_capacity(arr.len());
            for (i, item) in arr.iter().enumerate() {
                let child = format!("{loc}[{i}]");
                out.push(transform(items, item.clone(), &child, opts, errors));
            }
            Value::Array(out)
        }
    }
}

fn schema_default(schema: &Schema) -> Option<&Value> {
    match schema {
        Schema::String { default_value, .. }
        | Schema::Number { default_value, .. }
        | Schema::Boolean { default_value, .. }
        | Schema::Enum { default_value, .. }
        | Schema::Object { default_value, .. }
        | Schema::Array { default_value, .. }
        | Schema::Union { default_value, .. }
        | Schema::Any { default_value, .. } => default_value.as_ref(),
        Schema::Null {} => None,
    }
}

fn coerce_string(value: &Value) -> Option<Value> {
    match value {
        Value::String(_) => None,
        Value::Number(n) => Some(Value::String(n.to_string())),
        Value::Bool(b) => Some(Value::String(b.to_string())),
        _ => None,
    }
}

fn coerce_number(value: &Value) -> Option<Value> {
    match value {
        Value::Number(_) => None,
        Value::String(s) => s
            .parse::<f64>()
            .ok()
            .and_then(Number::from_f64)
            .map(Value::Number),
        Value::Bool(b) => Some(Value::Number(Number::from(if *b { 1 } else { 0 }))),
        _ => None,
    }
}

fn coerce_bool(value: &Value) -> Option<Value> {
    match value {
        Value::Bool(_) => None,
        Value::String(s) => match s.as_str() {
            "true" | "1" => Some(Value::Bool(true)),
            "false" | "0" => Some(Value::Bool(false)),
            _ => None,
        },
        Value::Number(n) => n.as_f64().map(|f| Value::Bool(f != 0.0)),
        _ => None,
    }
}

fn issue(path: &str, message: impl Into<String>) -> ValidationIssue {
    ValidationIssue {
        path: path.to_string(),
        message: message.into(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn strip_and_coerce() {
        let schema = Schema::Object {
            properties: BTreeMap::from([
                (
                    "name".into(),
                    Schema::String {
                        min_length: Some(1),
                        max_length: None,
                        pattern: None,
                        default_value: None,
                    },
                ),
                (
                    "n".into(),
                    Schema::Number {
                        minimum: None,
                        maximum: None,
                        default_value: Some(json!(1)),
                    },
                ),
            ]),
            required: vec!["name".into()],
            additional_properties: false,
            default_value: None,
        };
        let out = parse(&schema, json!({"name": "a", "n": "2", "x": 1})).unwrap();
        assert_eq!(out, json!({"name": "a", "n": 2.0}));
    }
}
