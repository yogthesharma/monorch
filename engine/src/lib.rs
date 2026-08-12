//! Monorch AI execution engine — **source of truth**.
//!
//! Owns: schema validation, tool auth, agent state, graph/workflow state.
//! Does not own: HTTP, LLM network I/O, app lifecycle.

pub mod agent;
pub mod graph;
pub mod schema;
pub mod tools;
pub mod workflow;

use std::collections::HashMap;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Mutex;

pub use agent::{
    AgentConfig, AgentDecision, AgentMessage, AgentRun, AgentStatus, AgentStepOutcome, AgentStore,
    ToolCall,
};
pub use graph::{
    checkpoint_export, checkpoint_import, def_hash, linear_graph, Checkpoint, GraphAdvance,
    GraphDef, GraphEdge, GraphNode, GraphRun, GraphStatus, END as GRAPH_END,
};
pub use schema::{
    decode, encode, parse as parse_value, to_json_schema, validate, ParseOptions, Schema,
    ValidationIssue, ValidationResult,
};
pub use tools::{prepare_call, Caller, Permission, ToolError, ToolRegistry, ToolSpec};
pub use workflow::{
    WorkflowAdvance, WorkflowDef, WorkflowRun, WorkflowStatus, WorkflowStep,
};

pub struct Engine {
    tools: Mutex<ToolRegistry>,
    agents: Mutex<AgentStore>,
    workflows: Mutex<HashMap<String, WorkflowDef>>,
    workflow_runs: Mutex<HashMap<String, WorkflowRun>>,
    graphs: Mutex<HashMap<String, GraphDef>>,
    graph_runs: Mutex<HashMap<String, GraphRun>>,
    next_id: AtomicU32,
}

impl Engine {
    pub fn new() -> Self {
        Self {
            tools: Mutex::new(ToolRegistry::new()),
            agents: Mutex::new(AgentStore::new()),
            workflows: Mutex::new(HashMap::new()),
            workflow_runs: Mutex::new(HashMap::new()),
            graphs: Mutex::new(HashMap::new()),
            graph_runs: Mutex::new(HashMap::new()),
            next_id: AtomicU32::new(1),
        }
    }

    fn next_id(&self, prefix: &str) -> String {
        format!("{prefix}-{}", self.next_id.fetch_add(1, Ordering::Relaxed))
    }

    // --- tools ---

    pub fn tool_register(&self, spec: ToolSpec) -> Result<(), String> {
        self.tool_register_with(spec, false)
    }

    /// Register a tool. When `replace` is true, overwrites an existing spec.
    pub fn tool_register_with(&self, spec: ToolSpec, replace: bool) -> Result<(), String> {
        self.tools.lock().expect("tools").register_with(spec, replace)
    }

    pub fn tool_list_json(&self) -> serde_json::Value {
        let tools = self.tools.lock().expect("tools");
        serde_json::to_value(tools.list()).unwrap_or_else(|_| serde_json::json!([]))
    }

    pub fn tool_prepare(
        &self,
        name: &str,
        caller: Caller,
        args: serde_json::Value,
    ) -> Result<serde_json::Value, ToolError> {
        let tools = self.tools.lock().expect("tools");
        prepare_call(&tools, name, &caller, args)
    }

    // --- agents ---

    pub fn agent_start(&self, config: AgentConfig, user: String) -> AgentRun {
        let id = self.next_id("agent");
        let run = AgentRun::start(id, config, user);
        self.agents.lock().expect("agents").insert(run.clone());
        run
    }

    pub fn agent_continue(
        &self,
        config: AgentConfig,
        messages: Vec<AgentMessage>,
    ) -> AgentRun {
        let id = self.next_id("agent");
        let run = AgentRun::continue_from(id, config, messages);
        self.agents.lock().expect("agents").insert(run.clone());
        run
    }

    pub fn agent_decide(
        &self,
        run_id: &str,
        decision: AgentDecision,
    ) -> Result<(AgentRun, AgentStepOutcome), String> {
        let mut store = self.agents.lock().expect("agents");
        let run = store
            .get_mut(run_id)
            .ok_or_else(|| format!("unknown agent run {run_id}"))?;
        let outcome = run.apply_decision(decision);
        Ok((run.clone(), outcome))
    }

    pub fn agent_tool_results(
        &self,
        run_id: &str,
        results: Vec<(String, String, String)>,
    ) -> Result<(AgentRun, AgentStepOutcome), String> {
        let mut store = self.agents.lock().expect("agents");
        let run = store
            .get_mut(run_id)
            .ok_or_else(|| format!("unknown agent run {run_id}"))?;
        let outcome = run.apply_tool_results(results);
        Ok((run.clone(), outcome))
    }

    pub fn agent_get(&self, run_id: &str) -> Option<AgentRun> {
        self.agents.lock().expect("agents").get(run_id).cloned()
    }

    // --- graphs ---

    pub fn graph_register(&self, def: GraphDef) -> Result<(), String> {
        self.graph_register_with(def, false)
    }

    /// Register a graph. When `replace` is true, overwrites an existing def.
    /// In-flight runs with a mismatched `def_hash` will fail on the next advance.
    pub fn graph_register_with(&self, def: GraphDef, replace: bool) -> Result<(), String> {
        def.validate()?;
        let mut map = self.graphs.lock().expect("graphs");
        if map.contains_key(&def.name) && !replace {
            return Err(format!("graph already registered: {}", def.name));
        }
        map.insert(def.name.clone(), def);
        Ok(())
    }

    pub fn graph_unregister(&self, name: &str) -> bool {
        self.graphs.lock().expect("graphs").remove(name).is_some()
    }

    pub fn graph_start(
        &self,
        name: &str,
        state: serde_json::Value,
    ) -> Result<GraphRun, String> {
        let defs = self.graphs.lock().expect("graphs");
        let def = defs
            .get(name)
            .ok_or_else(|| format!("unknown graph {name}"))?;
        let run = GraphRun::start(self.next_id("graph"), def, state);
        self.graph_runs
            .lock()
            .expect("graph_runs")
            .insert(run.id.clone(), run.clone());
        Ok(run)
    }

    pub fn graph_advance(
        &self,
        run_id: &str,
    ) -> Result<(GraphRun, GraphAdvance), String> {
        let defs = self.graphs.lock().expect("graphs");
        let mut runs = self.graph_runs.lock().expect("graph_runs");
        let run = runs
            .get_mut(run_id)
            .ok_or_else(|| format!("unknown graph run {run_id}"))?;
        let def = defs
            .get(&run.graph)
            .ok_or_else(|| format!("unknown graph {}", run.graph))?;
        let advance = run.advance(def);
        Ok((run.clone(), advance))
    }

    pub fn graph_complete_node(
        &self,
        run_id: &str,
        node_id: String,
        output: Option<String>,
        state_patch: Option<serde_json::Value>,
    ) -> Result<(GraphRun, GraphAdvance), String> {
        let defs = self.graphs.lock().expect("graphs");
        let mut runs = self.graph_runs.lock().expect("graph_runs");
        let run = runs
            .get_mut(run_id)
            .ok_or_else(|| format!("unknown graph run {run_id}"))?;
        let def = defs
            .get(&run.graph)
            .ok_or_else(|| format!("unknown graph {}", run.graph))?;
        let advance = run.complete_node(def, &node_id, output, state_patch)?;
        Ok((run.clone(), advance))
    }

    pub fn graph_fail_node(
        &self,
        run_id: &str,
        error: String,
    ) -> Result<(GraphRun, GraphAdvance), String> {
        let mut runs = self.graph_runs.lock().expect("graph_runs");
        let run = runs
            .get_mut(run_id)
            .ok_or_else(|| format!("unknown graph run {run_id}"))?;
        let advance = run.fail_node(error);
        Ok((run.clone(), advance))
    }

    pub fn graph_resume_interrupt(&self, run_id: &str) -> Result<GraphRun, String> {
        let defs = self.graphs.lock().expect("graphs");
        let mut runs = self.graph_runs.lock().expect("graph_runs");
        let run = runs
            .get_mut(run_id)
            .ok_or_else(|| format!("unknown graph run {run_id}"))?;
        let def = defs
            .get(&run.graph)
            .ok_or_else(|| format!("unknown graph {}", run.graph))?;
        run.resume_interrupt(def)?;
        Ok(run.clone())
    }

    pub fn graph_complete_interrupt(
        &self,
        run_id: &str,
        decision: String,
    ) -> Result<(GraphRun, GraphAdvance), String> {
        let defs = self.graphs.lock().expect("graphs");
        let mut runs = self.graph_runs.lock().expect("graph_runs");
        let run = runs
            .get_mut(run_id)
            .ok_or_else(|| format!("unknown graph run {run_id}"))?;
        let def = defs
            .get(&run.graph)
            .ok_or_else(|| format!("unknown graph {}", run.graph))?;
        let advance = run.complete_interrupt(def, decision)?;
        Ok((run.clone(), advance))
    }

    pub fn graph_route(
        &self,
        run_id: &str,
        to: String,
    ) -> Result<(GraphRun, GraphAdvance), String> {
        let defs = self.graphs.lock().expect("graphs");
        let mut runs = self.graph_runs.lock().expect("graph_runs");
        let run = runs
            .get_mut(run_id)
            .ok_or_else(|| format!("unknown graph run {run_id}"))?;
        let def = defs
            .get(&run.graph)
            .ok_or_else(|| format!("unknown graph {}", run.graph))?;
        let advance = run.route(def, &to)?;
        Ok((run.clone(), advance))
    }

    pub fn graph_get(&self, run_id: &str) -> Option<GraphRun> {
        self.graph_runs
            .lock()
            .expect("graph_runs")
            .get(run_id)
            .cloned()
    }

    pub fn graph_checkpoint_export(&self, run_id: &str) -> Result<serde_json::Value, String> {
        let runs = self.graph_runs.lock().expect("graph_runs");
        let run = runs
            .get(run_id)
            .ok_or_else(|| format!("unknown graph run {run_id}"))?;
        checkpoint_export(run)
    }

    pub fn graph_checkpoint_restore(&self, blob: serde_json::Value) -> Result<GraphRun, String> {
        let cp = checkpoint_import(blob)?;
        let defs = self.graphs.lock().expect("graphs");
        let def = defs.get(&cp.run.graph).ok_or_else(|| {
            format!(
                "cannot restore: graph '{}' is not registered (compile first)",
                cp.run.graph
            )
        })?;
        let current = def_hash(def);
        // Reject empty hashes: cannot verify definition identity.
        if cp.def_hash.is_empty() {
            return Err(format!(
                "checkpoint missing def_hash for graph '{}' (re-checkpoint after upgrade)",
                cp.run.graph
            ));
        }
        if cp.def_hash != current {
            return Err(format!(
                "checkpoint def_hash mismatch for graph '{}' (definition changed since checkpoint)",
                cp.run.graph
            ));
        }
        let mut run = cp.run;
        if run.input.is_null() {
            run.input = cp.input;
        }
        if run.def_hash.is_empty() {
            run.def_hash = cp.def_hash;
        }
        self.graph_runs
            .lock()
            .expect("graph_runs")
            .insert(run.id.clone(), run.clone());
        Ok(run)
    }

    pub fn graph_drop(&self, run_id: &str) -> bool {
        self.graph_runs
            .lock()
            .expect("graph_runs")
            .remove(run_id)
            .is_some()
    }

    pub fn agent_drop(&self, run_id: &str) -> bool {
        self.agents
            .lock()
            .expect("agents")
            .remove(run_id)
            .is_some()
    }

    // --- workflows (legacy linear API; prefer graphs) ---

    pub fn workflow_register(&self, def: WorkflowDef) -> Result<(), String> {
        let mut map = self.workflows.lock().expect("workflows");
        if map.contains_key(&def.name) {
            return Err(format!("workflow already registered: {}", def.name));
        }
        map.insert(def.name.clone(), def);
        Ok(())
    }

    pub fn workflow_start(&self, name: &str) -> Result<WorkflowRun, String> {
        let defs = self.workflows.lock().expect("workflows");
        let def = defs
            .get(name)
            .ok_or_else(|| format!("unknown workflow {name}"))?;
        let run = WorkflowRun::start(self.next_id("wf"), def);
        self.workflow_runs
            .lock()
            .expect("workflow_runs")
            .insert(run.id.clone(), run.clone());
        Ok(run)
    }

    pub fn workflow_advance(
        &self,
        run_id: &str,
    ) -> Result<(WorkflowRun, WorkflowAdvance), String> {
        let defs = self.workflows.lock().expect("workflows");
        let mut runs = self.workflow_runs.lock().expect("workflow_runs");
        let run = runs
            .get_mut(run_id)
            .ok_or_else(|| format!("unknown workflow run {run_id}"))?;
        let def = defs
            .get(&run.workflow)
            .ok_or_else(|| format!("unknown workflow {}", run.workflow))?;
        let advance = run.advance(def);
        Ok((run.clone(), advance))
    }

    pub fn workflow_complete_step(
        &self,
        run_id: &str,
        key: Option<String>,
        value: Option<String>,
    ) -> Result<WorkflowRun, String> {
        let defs = self.workflows.lock().expect("workflows");
        let mut runs = self.workflow_runs.lock().expect("workflow_runs");
        let run = runs
            .get_mut(run_id)
            .ok_or_else(|| format!("unknown workflow run {run_id}"))?;
        let def = defs
            .get(&run.workflow)
            .ok_or_else(|| format!("unknown workflow {}", run.workflow))?;
        let output = match (key, value) {
            (Some(k), Some(v)) => Some((k, v)),
            _ => None,
        };
        run.complete_step(def, output)?;
        Ok(run.clone())
    }

    pub fn workflow_fail_step(
        &self,
        run_id: &str,
        error: String,
    ) -> Result<(WorkflowRun, WorkflowAdvance), String> {
        let defs = self.workflows.lock().expect("workflows");
        let mut runs = self.workflow_runs.lock().expect("workflow_runs");
        let run = runs
            .get_mut(run_id)
            .ok_or_else(|| format!("unknown workflow run {run_id}"))?;
        let def = defs
            .get(&run.workflow)
            .ok_or_else(|| format!("unknown workflow {}", run.workflow))?;
        let advance = run.fail_step(def, error);
        Ok((run.clone(), advance))
    }

    pub fn workflow_resume_human(&self, run_id: &str) -> Result<WorkflowRun, String> {
        let mut runs = self.workflow_runs.lock().expect("workflow_runs");
        let run = runs
            .get_mut(run_id)
            .ok_or_else(|| format!("unknown workflow run {run_id}"))?;
        run.resume_human()?;
        Ok(run.clone())
    }

    pub fn schema_to_json_schema(&self, schema: &Schema) -> serde_json::Value {
        to_json_schema(schema)
    }

    pub fn validate_value(
        &self,
        schema: &Schema,
        value: &serde_json::Value,
    ) -> ValidationResult {
        validate(schema, value)
    }

    pub fn parse_value(
        &self,
        schema: &Schema,
        value: serde_json::Value,
    ) -> Result<serde_json::Value, ValidationResult> {
        parse_value(schema, value)
    }
}

impl Default for Engine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn engine_tool_and_agent_smoke() {
        let engine = Engine::new();
        engine
            .tool_register(ToolSpec {
                name: "echo".into(),
                description: "echo".into(),
                input_schema: Schema::Object {
                    properties: std::collections::BTreeMap::from([(
                        "text".into(),
                        Schema::String {
                            min_length: Some(1),
                            max_length: None,
                            pattern: None,
                            default_value: None,
                        },
                    )]),
                    required: vec!["text".into()],
                    additional_properties: false,
                    default_value: None,
                },
                output_schema: None,
                permission: Permission::Allow,
            })
            .unwrap();

        let args = engine
            .tool_prepare(
                "echo",
                Caller::default(),
                serde_json::json!({"text": "hi", "extra": 1}),
            )
            .unwrap();
        assert_eq!(args, serde_json::json!({"text": "hi"}));
    }

    #[test]
    fn engine_graph_register_and_run() {
        let engine = Engine::new();
        let def = linear_graph(
            "demo",
            vec![
                GraphNode::Task { id: "a".into() },
                GraphNode::Task { id: "b".into() },
            ],
            8,
        )
        .unwrap();
        engine.graph_register(def).unwrap();
        let run = engine
            .graph_start("demo", serde_json::json!({}))
            .unwrap();
        let (run, adv) = engine.graph_advance(&run.id).unwrap();
        assert!(matches!(adv, GraphAdvance::Next { .. }));
        let (_run, adv) = engine
            .graph_complete_node(&run.id, "a".into(), Some("1".into()), None)
            .unwrap();
        assert!(matches!(adv, GraphAdvance::Next { .. }));
    }

    #[test]
    fn engine_graph_replace_and_def_hash_guard() {
        let engine = Engine::new();
        let v1 = linear_graph(
            "hot",
            vec![GraphNode::Task { id: "a".into() }],
            8,
        )
        .unwrap();
        engine.graph_register(v1).unwrap();
        let run = engine
            .graph_start("hot", serde_json::json!({"n": 1}))
            .unwrap();
        assert!(!run.def_hash.is_empty());
        assert_eq!(run.input, serde_json::json!({"n": 1}));

        let v2 = linear_graph(
            "hot",
            vec![
                GraphNode::Task { id: "a".into() },
                GraphNode::Task { id: "b".into() },
            ],
            8,
        )
        .unwrap();
        assert!(engine.graph_register(v2.clone()).is_err());
        engine.graph_register_with(v2, true).unwrap();

        let (failed_run, adv) = engine.graph_advance(&run.id).unwrap();
        assert!(matches!(adv, GraphAdvance::Failed { .. }));
        assert_eq!(failed_run.status, GraphStatus::Failed);
    }

    #[test]
    fn engine_checkpoint_def_hash_mismatch() {
        let engine = Engine::new();
        let v1 = linear_graph(
            "cp",
            vec![
                GraphNode::Task { id: "a".into() },
                GraphNode::Interrupt {
                    id: "i".into(),
                    prompt: "?".into(),
                },
            ],
            8,
        )
        .unwrap();
        engine.graph_register(v1).unwrap();
        let run = engine
            .graph_start("cp", serde_json::json!({"x": 1}))
            .unwrap();
        let (run, _) = engine.graph_advance(&run.id).unwrap();
        let (_run, _) = engine
            .graph_complete_node(&run.id, "a".into(), Some("ok".into()), None)
            .unwrap();
        let blob = engine.graph_checkpoint_export(&run.id).unwrap();

        let v2 = linear_graph(
            "cp",
            vec![
                GraphNode::Task { id: "a".into() },
                GraphNode::Interrupt {
                    id: "i".into(),
                    prompt: "changed?".into(),
                },
            ],
            8,
        )
        .unwrap();
        engine.graph_register_with(v2, true).unwrap();
        let err = engine.graph_checkpoint_restore(blob).unwrap_err();
        assert!(err.contains("def_hash"));
    }

    #[test]
    fn engine_resume_fails_clean_on_def_mismatch() {
        let engine = Engine::new();
        let v1 = linear_graph(
            "resume_hot",
            vec![
                GraphNode::Task { id: "a".into() },
                GraphNode::Interrupt {
                    id: "i".into(),
                    prompt: "?".into(),
                },
            ],
            8,
        )
        .unwrap();
        engine.graph_register(v1).unwrap();
        let run = engine
            .graph_start("resume_hot", serde_json::json!({}))
            .unwrap();
        let (run, _) = engine.graph_advance(&run.id).unwrap();
        let (_run, adv) = engine
            .graph_complete_node(&run.id, "a".into(), Some("ok".into()), None)
            .unwrap();
        assert!(matches!(adv, GraphAdvance::WaitInterrupt { .. }));

        let v2 = linear_graph(
            "resume_hot",
            vec![
                GraphNode::Task { id: "a".into() },
                GraphNode::Interrupt {
                    id: "i".into(),
                    prompt: "changed?".into(),
                },
            ],
            8,
        )
        .unwrap();
        engine.graph_register_with(v2, true).unwrap();

        let err = engine.graph_resume_interrupt(&run.id).unwrap_err();
        assert!(err.contains("definition changed") || err.contains("hot-reload"));
        let failed = engine.graph_get(&run.id).unwrap();
        assert_eq!(failed.status, GraphStatus::Failed);
    }
}
