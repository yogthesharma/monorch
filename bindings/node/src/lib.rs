//! Thin Node-API surface over monorch-engine. No business logic.

use monorch_engine::{
  AgentConfig, AgentDecision, Caller, Engine as CoreEngine, GraphDef, Schema, ToolSpec,
  WorkflowDef,
};
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
pub struct Engine {
  inner: CoreEngine,
}

#[napi]
impl Engine {
  #[napi(constructor)]
  pub fn new() -> Self {
    Self {
      inner: CoreEngine::new(),
    }
  }

  #[napi]
  pub fn parse(&self, schema: serde_json::Value, value: serde_json::Value) -> Result<serde_json::Value> {
    let schema: Schema = serde_json::from_value(schema)
      .map_err(|e| Error::from_reason(format!("invalid schema: {e}")))?;
    match self.inner.parse_value(&schema, value) {
      Ok(v) => Ok(serde_json::json!({ "ok": true, "value": v })),
      Err(err) => Ok(serde_json::json!({ "ok": false, "errors": err.errors })),
    }
  }

  #[napi]
  pub fn to_json_schema(&self, schema: serde_json::Value) -> Result<serde_json::Value> {
    let schema: Schema = serde_json::from_value(schema)
      .map_err(|e| Error::from_reason(format!("invalid schema: {e}")))?;
    Ok(self.inner.schema_to_json_schema(&schema))
  }

  #[napi]
  pub fn tool_register(&self, spec: serde_json::Value) -> Result<()> {
    self.tool_register_with(spec, false)
  }

  #[napi]
  pub fn tool_register_with(&self, spec: serde_json::Value, replace: bool) -> Result<()> {
    let spec: ToolSpec = serde_json::from_value(spec)
      .map_err(|e| Error::from_reason(format!("invalid tool spec: {e}")))?;
    self.inner
      .tool_register_with(spec, replace)
      .map_err(Error::from_reason)
  }

  #[napi]
  pub fn tool_list(&self) -> Result<serde_json::Value> {
    Ok(self.inner.tool_list_json())
  }

  #[napi]
  pub fn tool_prepare(
    &self,
    name: String,
    caller: serde_json::Value,
    args: serde_json::Value,
  ) -> Result<serde_json::Value> {
    let caller: Caller = serde_json::from_value(caller)
      .map_err(|e| Error::from_reason(format!("invalid caller: {e}")))?;
    match self.inner.tool_prepare(&name, caller, args) {
      Ok(value) => Ok(serde_json::json!({ "ok": true, "value": value })),
      Err(err) => Ok(serde_json::json!({ "ok": false, "error": err })),
    }
  }

  #[napi]
  pub fn agent_start(&self, config: serde_json::Value, user: String) -> Result<serde_json::Value> {
    let config: AgentConfig = serde_json::from_value(config)
      .map_err(|e| Error::from_reason(format!("invalid agent config: {e}")))?;
    let run = self.inner.agent_start(config, user);
    serde_json::to_value(run).map_err(|e| Error::from_reason(e.to_string()))
  }

  #[napi]
  pub fn agent_continue(
    &self,
    config: serde_json::Value,
    messages: serde_json::Value,
  ) -> Result<serde_json::Value> {
    let config: AgentConfig = serde_json::from_value(config)
      .map_err(|e| Error::from_reason(format!("invalid agent config: {e}")))?;
    let messages: Vec<monorch_engine::AgentMessage> = serde_json::from_value(messages)
      .map_err(|e| Error::from_reason(format!("invalid messages: {e}")))?;
    let run = self.inner.agent_continue(config, messages);
    serde_json::to_value(run).map_err(|e| Error::from_reason(e.to_string()))
  }

  #[napi]
  pub fn agent_decide(
    &self,
    run_id: String,
    decision: serde_json::Value,
  ) -> Result<serde_json::Value> {
    let decision: AgentDecision = serde_json::from_value(decision)
      .map_err(|e| Error::from_reason(format!("invalid decision: {e}")))?;
    let (run, outcome) = self
      .inner
      .agent_decide(&run_id, decision)
      .map_err(Error::from_reason)?;
    Ok(serde_json::json!({ "run": run, "outcome": outcome }))
  }

  #[napi]
  pub fn agent_tool_results(
    &self,
    run_id: String,
    results: serde_json::Value,
  ) -> Result<serde_json::Value> {
    let parsed: Vec<serde_json::Value> = serde_json::from_value(results)
      .map_err(|e| Error::from_reason(format!("invalid tool results: {e}")))?;
    let mut tuples = Vec::new();
    for item in parsed {
      let id = item
        .get("toolCallId")
        .and_then(|v| v.as_str())
        .ok_or_else(|| Error::from_reason("tool result missing toolCallId"))?
        .to_string();
      let name = item
        .get("name")
        .and_then(|v| v.as_str())
        .ok_or_else(|| Error::from_reason("tool result missing name"))?
        .to_string();
      let content = item
        .get("content")
        .map(|v| match v {
          serde_json::Value::String(s) => s.clone(),
          other => other.to_string(),
        })
        .unwrap_or_default();
      tuples.push((id, name, content));
    }
    let (run, outcome) = self
      .inner
      .agent_tool_results(&run_id, tuples)
      .map_err(Error::from_reason)?;
    Ok(serde_json::json!({ "run": run, "outcome": outcome }))
  }

  #[napi]
  pub fn agent_get(&self, run_id: String) -> Result<Option<serde_json::Value>> {
    match self.inner.agent_get(&run_id) {
      Some(run) => Ok(Some(
        serde_json::to_value(run).map_err(|e| Error::from_reason(e.to_string()))?,
      )),
      None => Ok(None),
    }
  }

  #[napi]
  pub fn graph_register(&self, def: serde_json::Value) -> Result<()> {
    self.graph_register_with(def, false)
  }

  #[napi]
  pub fn graph_register_with(&self, def: serde_json::Value, replace: bool) -> Result<()> {
    let def: GraphDef = serde_json::from_value(def)
      .map_err(|e| Error::from_reason(format!("invalid graph: {e}")))?;
    self.inner
      .graph_register_with(def, replace)
      .map_err(Error::from_reason)
  }

  #[napi]
  pub fn graph_unregister(&self, name: String) -> Result<bool> {
    Ok(self.inner.graph_unregister(&name))
  }

  #[napi]
  pub fn graph_start(&self, name: String, state: serde_json::Value) -> Result<serde_json::Value> {
    let run = self
      .inner
      .graph_start(&name, state)
      .map_err(Error::from_reason)?;
    serde_json::to_value(run).map_err(|e| Error::from_reason(e.to_string()))
  }

  #[napi]
  pub fn graph_advance(&self, run_id: String) -> Result<serde_json::Value> {
    let (run, advance) = self
      .inner
      .graph_advance(&run_id)
      .map_err(Error::from_reason)?;
    Ok(serde_json::json!({ "run": run, "advance": advance }))
  }

  #[napi]
  pub fn graph_complete_node(
    &self,
    run_id: String,
    node_id: String,
    output: Option<String>,
    state_patch: Option<serde_json::Value>,
  ) -> Result<serde_json::Value> {
    let (run, advance) = self
      .inner
      .graph_complete_node(&run_id, node_id, output, state_patch)
      .map_err(Error::from_reason)?;
    Ok(serde_json::json!({ "run": run, "advance": advance }))
  }

  #[napi]
  pub fn graph_fail_node(&self, run_id: String, error: String) -> Result<serde_json::Value> {
    let (run, advance) = self
      .inner
      .graph_fail_node(&run_id, error)
      .map_err(Error::from_reason)?;
    Ok(serde_json::json!({ "run": run, "advance": advance }))
  }

  #[napi]
  pub fn graph_resume_interrupt(&self, run_id: String) -> Result<serde_json::Value> {
    let run = self
      .inner
      .graph_resume_interrupt(&run_id)
      .map_err(Error::from_reason)?;
    serde_json::to_value(run).map_err(|e| Error::from_reason(e.to_string()))
  }

  #[napi]
  pub fn graph_complete_interrupt(
    &self,
    run_id: String,
    decision: String,
  ) -> Result<serde_json::Value> {
    let (run, advance) = self
      .inner
      .graph_complete_interrupt(&run_id, decision)
      .map_err(Error::from_reason)?;
    Ok(serde_json::json!({ "run": run, "advance": advance }))
  }

  #[napi]
  pub fn graph_route(&self, run_id: String, to: String) -> Result<serde_json::Value> {
    let (run, advance) = self
      .inner
      .graph_route(&run_id, to)
      .map_err(Error::from_reason)?;
    Ok(serde_json::json!({ "run": run, "advance": advance }))
  }

  #[napi]
  pub fn graph_get(&self, run_id: String) -> Result<Option<serde_json::Value>> {
    match self.inner.graph_get(&run_id) {
      Some(run) => Ok(Some(
        serde_json::to_value(run).map_err(|e| Error::from_reason(e.to_string()))?,
      )),
      None => Ok(None),
    }
  }

  #[napi]
  pub fn graph_checkpoint_export(&self, run_id: String) -> Result<serde_json::Value> {
    self.inner
      .graph_checkpoint_export(&run_id)
      .map_err(Error::from_reason)
  }

  #[napi]
  pub fn graph_checkpoint_restore(&self, blob: serde_json::Value) -> Result<serde_json::Value> {
    let run = self
      .inner
      .graph_checkpoint_restore(blob)
      .map_err(Error::from_reason)?;
    serde_json::to_value(run).map_err(|e| Error::from_reason(e.to_string()))
  }

  #[napi]
  pub fn graph_drop(&self, run_id: String) -> Result<bool> {
    Ok(self.inner.graph_drop(&run_id))
  }

  #[napi]
  pub fn agent_drop(&self, run_id: String) -> Result<bool> {
    Ok(self.inner.agent_drop(&run_id))
  }

  #[napi]
  pub fn workflow_register(&self, def: serde_json::Value) -> Result<()> {
    let def: WorkflowDef = serde_json::from_value(def)
      .map_err(|e| Error::from_reason(format!("invalid workflow: {e}")))?;
    self.inner
      .workflow_register(def)
      .map_err(Error::from_reason)
  }

  #[napi]
  pub fn workflow_start(&self, name: String) -> Result<serde_json::Value> {
    let run = self
      .inner
      .workflow_start(&name)
      .map_err(Error::from_reason)?;
    serde_json::to_value(run).map_err(|e| Error::from_reason(e.to_string()))
  }

  #[napi]
  pub fn workflow_advance(&self, run_id: String) -> Result<serde_json::Value> {
    let (run, advance) = self
      .inner
      .workflow_advance(&run_id)
      .map_err(Error::from_reason)?;
    Ok(serde_json::json!({ "run": run, "advance": advance }))
  }

  #[napi]
  pub fn workflow_complete_step(
    &self,
    run_id: String,
    key: Option<String>,
    value: Option<String>,
  ) -> Result<serde_json::Value> {
    let run = self
      .inner
      .workflow_complete_step(&run_id, key, value)
      .map_err(Error::from_reason)?;
    serde_json::to_value(run).map_err(|e| Error::from_reason(e.to_string()))
  }

  #[napi]
  pub fn workflow_fail_step(&self, run_id: String, error: String) -> Result<serde_json::Value> {
    let (run, advance) = self
      .inner
      .workflow_fail_step(&run_id, error)
      .map_err(Error::from_reason)?;
    Ok(serde_json::json!({ "run": run, "advance": advance }))
  }

  #[napi]
  pub fn workflow_resume_human(&self, run_id: String) -> Result<serde_json::Value> {
    let run = self
      .inner
      .workflow_resume_human(&run_id)
      .map_err(Error::from_reason)?;
    serde_json::to_value(run).map_err(|e| Error::from_reason(e.to_string()))
  }
}
