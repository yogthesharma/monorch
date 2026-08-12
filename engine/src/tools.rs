//! Tool registry, permissions, schema-backed prepare.

use crate::schema::{parse, Schema, ValidationResult};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum Permission {
    Allow,
    Deny,
    Roles(Vec<String>),
}

impl Default for Permission {
    fn default() -> Self {
        Self::Allow
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolSpec {
    pub name: String,
    pub description: String,
    pub input_schema: Schema,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_schema: Option<Schema>,
    #[serde(default)]
    pub permission: Permission,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Caller {
    #[serde(default)]
    pub roles: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub subject: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ToolError {
    #[serde(rename = "not_found", rename_all = "camelCase")]
    NotFound { tool: String },
    #[serde(rename = "denied", rename_all = "camelCase")]
    Denied { tool: String, message: String },
    #[serde(rename = "invalid_input", rename_all = "camelCase")]
    InvalidInput { tool: String, errors: ValidationResult },
}

#[derive(Debug, Default)]
pub struct ToolRegistry {
    tools: HashMap<String, ToolSpec>,
}

impl ToolRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn register(&mut self, spec: ToolSpec) -> Result<(), String> {
        self.register_with(spec, false)
    }

    /// Register a tool. When `replace` is true, overwrites an existing spec.
    pub fn register_with(&mut self, spec: ToolSpec, replace: bool) -> Result<(), String> {
        if self.tools.contains_key(&spec.name) && !replace {
            return Err(format!("tool already registered: {}", spec.name));
        }
        self.tools.insert(spec.name.clone(), spec);
        Ok(())
    }

    pub fn get(&self, name: &str) -> Option<&ToolSpec> {
        self.tools.get(name)
    }

    pub fn list(&self) -> Vec<&ToolSpec> {
        let mut out: Vec<_> = self.tools.values().collect();
        out.sort_by(|a, b| a.name.cmp(&b.name));
        out
    }

    pub fn authorize(&self, name: &str, caller: &Caller) -> Result<(), ToolError> {
        let Some(tool) = self.tools.get(name) else {
            return Err(ToolError::NotFound {
                tool: name.to_string(),
            });
        };
        match &tool.permission {
            Permission::Allow => Ok(()),
            Permission::Deny => Err(ToolError::Denied {
                tool: name.to_string(),
                message: "tool denied".into(),
            }),
            Permission::Roles(required) => {
                if required.iter().any(|r| caller.roles.iter().any(|c| c == r)) {
                    Ok(())
                } else {
                    Err(ToolError::Denied {
                        tool: name.to_string(),
                        message: format!("missing required role (need one of {required:?})"),
                    })
                }
            }
        }
    }

    pub fn validate_input(&self, name: &str, value: Value) -> Result<Value, ToolError> {
        let tool = self.tools.get(name).ok_or_else(|| ToolError::NotFound {
            tool: name.to_string(),
        })?;
        parse(&tool.input_schema, value).map_err(|e| ToolError::InvalidInput {
            tool: name.to_string(),
            errors: e,
        })
    }
}

pub fn prepare_call(
    registry: &ToolRegistry,
    name: &str,
    caller: &Caller,
    args: Value,
) -> Result<Value, ToolError> {
    registry.authorize(name, caller)?;
    registry.validate_input(name, args)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::schema::Schema;
    use serde_json::json;

    fn echo_spec(permission: Permission) -> ToolSpec {
        ToolSpec {
            name: "echo".into(),
            description: "echo".into(),
            input_schema: Schema::Object {
                properties: std::collections::BTreeMap::from([(
                    "text".into(),
                    Schema::String {
                        min_length: None,
                        max_length: None,
                        pattern: None,
                        default_value: None,
                    },
                )]),
                required: vec![],
                additional_properties: true,
                default_value: None,
            },
            output_schema: None,
            permission,
        }
    }

    #[test]
    fn authorize_allow_and_deny() {
        let mut reg = ToolRegistry::new();
        reg.register(echo_spec(Permission::Allow)).unwrap();
        assert!(reg.authorize("echo", &Caller::default()).is_ok());

        reg.register(ToolSpec {
            name: "secret".into(),
            description: "secret".into(),
            input_schema: Schema::Null {},
            output_schema: None,
            permission: Permission::Deny,
        })
        .unwrap();
        let err = reg.authorize("secret", &Caller::default()).unwrap_err();
        assert!(matches!(err, ToolError::Denied { .. }));
    }

    #[test]
    fn authorize_roles() {
        let mut reg = ToolRegistry::new();
        reg.register(echo_spec(Permission::Roles(vec!["agent".into(), "admin".into()])))
            .unwrap();

        assert!(
            reg.authorize("echo", &Caller { roles: vec!["agent".into()], subject: None })
                .is_ok()
        );
        assert!(
            reg.authorize("echo", &Caller { roles: vec!["viewer".into()], subject: None })
                .is_err()
        );
    }

    #[test]
    fn prepare_call_denied_before_validate() {
        let mut reg = ToolRegistry::new();
        reg.register(echo_spec(Permission::Deny)).unwrap();
        let err = prepare_call(&reg, "echo", &Caller::default(), json!({})).unwrap_err();
        assert!(matches!(err, ToolError::Denied { .. }));
    }
}
