//! Graph execution engine — source of truth for orchestration.
//!
//! Supports task/agent/interrupt nodes, edges (incl. conditional),
//! cycle limits, and serializable run snapshots (checkpoints).

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{HashMap, HashSet};

pub const END: &str = "__end__";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum GraphStatus {
    Pending,
    Running,
    /// Node has been issued via advance; waiting for complete_node / complete_interrupt.
    AwaitingNode,
    WaitingInterrupt,
    NeedsRoute,
    Completed,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum GraphNode {
    #[serde(rename = "task", rename_all = "camelCase")]
    Task { id: String },
    #[serde(rename = "agent", rename_all = "camelCase")]
    Agent { id: String, agent: String },
    #[serde(rename = "interrupt", rename_all = "camelCase")]
    Interrupt { id: String, prompt: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphEdge {
    pub from: String,
    pub to: String,
    /// Opaque condition id evaluated in TS. `None` = always.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub condition: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphDef {
    pub name: String,
    pub entry: String,
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
    #[serde(default = "default_max_steps")]
    pub max_steps: u32,
}

fn default_max_steps() -> u32 {
    64
}

impl GraphDef {
    pub fn validate(&self) -> Result<(), String> {
        if self.name.is_empty() {
            return Err("graph name required".into());
        }
        if self.nodes.is_empty() {
            return Err("graph needs at least one node".into());
        }
        if self.max_steps == 0 {
            return Err("max_steps must be > 0".into());
        }
        let mut ids = HashSet::new();
        for n in &self.nodes {
            let id = node_id(n);
            if !ids.insert(id.to_string()) {
                return Err(format!("duplicate node id: {id}"));
            }
        }
        if !ids.contains(&self.entry) {
            return Err(format!("entry node missing: {}", self.entry));
        }
        for e in &self.edges {
            if !ids.contains(&e.from) {
                return Err(format!("edge.from unknown: {}", e.from));
            }
            if e.to != END && !ids.contains(&e.to) {
                return Err(format!("edge.to unknown: {}", e.to));
            }
        }
        Ok(())
    }

    pub fn node(&self, id: &str) -> Option<&GraphNode> {
        self.nodes.iter().find(|n| node_id(n) == id)
    }

    pub fn edges_from(&self, from: &str) -> Vec<&GraphEdge> {
        self.edges.iter().filter(|e| e.from == from).collect()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphRun {
    pub id: String,
    pub graph: String,
    pub status: GraphStatus,
    /// Node currently active (being executed or waiting).
    pub cursor: Option<String>,
    pub steps: u32,
    /// Original start input (preserved across patches to `state`).
    #[serde(default)]
    pub input: Value,
    #[serde(default)]
    pub state: Value,
    /// Hash of GraphDef at start — used to detect hot-reload drift.
    #[serde(default)]
    pub def_hash: String,
    #[serde(default)]
    pub outputs: HashMap<String, String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    /// When NeedsRoute, the node we just finished.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub route_from: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum GraphAdvance {
    #[serde(rename = "next", rename_all = "camelCase")]
    Next { node: GraphNode },
    #[serde(rename = "wait_interrupt", rename_all = "camelCase")]
    WaitInterrupt { node: GraphNode },
    #[serde(rename = "need_route", rename_all = "camelCase")]
    NeedRoute {
        from: String,
        edges: Vec<GraphEdge>,
    },
    #[serde(rename = "done")]
    Done,
    #[serde(rename = "failed", rename_all = "camelCase")]
    Failed { error: String },
}

impl GraphRun {
    pub fn start(id: impl Into<String>, def: &GraphDef, state: Value) -> Self {
        Self {
            id: id.into(),
            graph: def.name.clone(),
            status: GraphStatus::Running,
            cursor: Some(def.entry.clone()),
            steps: 0,
            input: state.clone(),
            state,
            def_hash: def_hash(def),
            outputs: HashMap::new(),
            error: None,
            route_from: None,
        }
    }

    fn ensure_def(&self, def: &GraphDef) -> Result<(), String> {
        let now = def_hash(def);
        if self.def_hash.is_empty() {
            return Err(format!(
                "graph '{}' run is missing def_hash (corrupt or unsupported checkpoint)",
                self.graph
            ));
        }
        if self.def_hash != now {
            return Err(format!(
                "graph '{}' definition changed since run started (hot-reload). Start a new run or restore a matching checkpoint.",
                self.graph
            ));
        }
        Ok(())
    }

    /// Like ensure_def, but marks the run Failed on mismatch so callers cannot leave it half-mutated.
    fn ensure_def_or_fail(&mut self, def: &GraphDef) -> Result<(), String> {
        if let Err(e) = self.ensure_def(def) {
            self.status = GraphStatus::Failed;
            self.error = Some(e.clone());
            return Err(e);
        }
        Ok(())
    }

    pub fn advance(&mut self, def: &GraphDef) -> GraphAdvance {
        if let Err(e) = self.ensure_def(def) {
            self.status = GraphStatus::Failed;
            self.error = Some(e.clone());
            return GraphAdvance::Failed { error: e };
        }
        if self.status == GraphStatus::Completed || self.status == GraphStatus::Failed {
            return GraphAdvance::Failed {
                error: "run finished".into(),
            };
        }
        if self.status == GraphStatus::WaitingInterrupt {
            // Idempotent: re-emit wait so drive()/restore don't treat this as a hard failure.
            let cursor = self.cursor.clone().unwrap_or_default();
            return match def.node(&cursor).cloned() {
                Some(node @ GraphNode::Interrupt { .. }) => {
                    GraphAdvance::WaitInterrupt { node }
                }
                _ => GraphAdvance::Failed {
                    error: "waiting for interrupt; call resume first".into(),
                },
            };
        }
        if self.status == GraphStatus::NeedsRoute {
            let from = self.route_from.clone().unwrap_or_default();
            let edges = def
                .edges_from(&from)
                .into_iter()
                .cloned()
                .collect::<Vec<_>>();
            return GraphAdvance::NeedRoute { from, edges };
        }
        if self.steps >= def.max_steps && self.status != GraphStatus::AwaitingNode {
            self.status = GraphStatus::Failed;
            self.error = Some("max steps exceeded (cycle limit)".into());
            return GraphAdvance::Failed {
                error: "max steps exceeded (cycle limit)".into(),
            };
        }

        let Some(cursor) = self.cursor.clone() else {
            self.status = GraphStatus::Completed;
            return GraphAdvance::Done;
        };
        if cursor == END {
            self.status = GraphStatus::Completed;
            self.cursor = None;
            return GraphAdvance::Done;
        }
        let Some(node) = def.node(&cursor).cloned() else {
            self.status = GraphStatus::Failed;
            let error = format!("unknown cursor node: {cursor}");
            self.error = Some(error.clone());
            return GraphAdvance::Failed { error };
        };

        // Idempotent re-emit while awaiting completion (no double step count / exec).
        if self.status == GraphStatus::AwaitingNode {
            return match &node {
                GraphNode::Interrupt { .. } => GraphAdvance::WaitInterrupt { node },
                _ => GraphAdvance::Next { node },
            };
        }

        self.steps += 1;
        match &node {
            GraphNode::Interrupt { .. } => {
                self.status = GraphStatus::WaitingInterrupt;
                GraphAdvance::WaitInterrupt { node }
            }
            _ => {
                self.status = GraphStatus::AwaitingNode;
                GraphAdvance::Next { node }
            }
        }
    }

    pub fn complete_node(
        &mut self,
        def: &GraphDef,
        node_id: &str,
        output: Option<String>,
        state_patch: Option<Value>,
    ) -> Result<GraphAdvance, String> {
        self.ensure_def_or_fail(def)?;
        if self.status == GraphStatus::WaitingInterrupt {
            return Err("waiting for interrupt; call resume first".into());
        }
        if self.status == GraphStatus::Completed || self.status == GraphStatus::Failed {
            return Err("run finished".into());
        }
        if self.status == GraphStatus::NeedsRoute {
            return Err("needs route; call graph_route first".into());
        }
        if self.status != GraphStatus::AwaitingNode {
            return Err(format!(
                "cannot complete node in status {:?} (expected awaitingNode)",
                self.status
            ));
        }
        if self.cursor.as_deref() != Some(node_id) {
            return Err(format!(
                "cursor mismatch: expected {:?}, got {node_id}",
                self.cursor
            ));
        }
        if let Some(out) = output {
            self.outputs.insert(node_id.to_string(), out);
        }
        if let Some(patch) = state_patch {
            merge_state(&mut self.state, patch);
        }
        self.route_after(def, node_id)
    }

    pub fn fail_node(&mut self, error: impl Into<String>) -> GraphAdvance {
        let error = error.into();
        self.status = GraphStatus::Failed;
        self.error = Some(error.clone());
        GraphAdvance::Failed { error }
    }

    pub fn resume_interrupt(&mut self, def: &GraphDef) -> Result<(), String> {
        self.ensure_def_or_fail(def)?;
        if self.status != GraphStatus::WaitingInterrupt {
            return Err(format!(
                "not waiting for interrupt (status={:?})",
                self.status
            ));
        }
        let Some(node_id) = self.cursor.clone() else {
            return Err("no active interrupt node".into());
        };
        // Mark awaiting completion so advance cannot re-enter the interrupt.
        self.status = GraphStatus::AwaitingNode;
        let _ = node_id;
        Ok(())
    }

    /// After resume, complete the interrupt node (records decision) then route.
    pub fn complete_interrupt(
        &mut self,
        def: &GraphDef,
        decision: impl Into<String>,
    ) -> Result<GraphAdvance, String> {
        self.ensure_def_or_fail(def)?;
        if self.status != GraphStatus::AwaitingNode {
            return Err("resume interrupt before completing".into());
        }
        let Some(node_id) = self.cursor.clone() else {
            return Err("no active interrupt node".into());
        };
        match def.node(&node_id) {
            Some(GraphNode::Interrupt { .. }) => {}
            _ => {
                return Err(format!(
                    "cursor {node_id} is not an interrupt node"
                ));
            }
        }
        self.outputs.insert(node_id.clone(), decision.into());
        self.route_after(def, &node_id)
    }

    pub fn route(&mut self, def: &GraphDef, to: &str) -> Result<GraphAdvance, String> {
        self.ensure_def_or_fail(def)?;
        if self.status != GraphStatus::NeedsRoute {
            return Err(format!("not needs route (status={:?})", self.status));
        }
        let from = self
            .route_from
            .clone()
            .ok_or_else(|| "missing route_from".to_string())?;
        let edges = def.edges_from(&from);
        let ok = edges.iter().any(|e| e.to == to);
        if !ok {
            return Err(format!("invalid route {from} -> {to}"));
        }
        self.route_from = None;
        self.cursor = if to == END { None } else { Some(to.to_string()) };
        if to == END || self.cursor.is_none() {
            self.status = GraphStatus::Completed;
            return Ok(GraphAdvance::Done);
        }
        self.status = GraphStatus::Running;
        Ok(self.advance(def))
    }

    fn route_after(&mut self, def: &GraphDef, from: &str) -> Result<GraphAdvance, String> {
        let edges = def.edges_from(from);
        if edges.is_empty() {
            self.cursor = None;
            self.status = GraphStatus::Completed;
            self.route_from = None;
            return Ok(GraphAdvance::Done);
        }
        let unconditional: Vec<_> = edges
            .iter()
            .filter(|e| e.condition.is_none())
            .copied()
            .collect();
        if edges.len() == 1 && edges[0].condition.is_none() {
            let to = &edges[0].to;
            if to == END {
                self.cursor = None;
                self.status = GraphStatus::Completed;
                return Ok(GraphAdvance::Done);
            }
            self.cursor = Some(to.clone());
            self.status = GraphStatus::Running;
            return Ok(self.advance(def));
        }
        if unconditional.len() == 1 && edges.iter().all(|e| e.condition.is_none()) {
            // multiple unconditional — ambiguous
            self.status = GraphStatus::NeedsRoute;
            self.route_from = Some(from.to_string());
            return Ok(GraphAdvance::NeedRoute {
                from: from.to_string(),
                edges: edges.into_iter().cloned().collect(),
            });
        }
        // conditional or multiple — TS must choose
        self.status = GraphStatus::NeedsRoute;
        self.route_from = Some(from.to_string());
        Ok(GraphAdvance::NeedRoute {
            from: from.to_string(),
            edges: edges.into_iter().cloned().collect(),
        })
    }
}

fn node_id(node: &GraphNode) -> &str {
    match node {
        GraphNode::Task { id }
        | GraphNode::Agent { id, .. }
        | GraphNode::Interrupt { id, .. } => id,
    }
}

fn merge_state(state: &mut Value, patch: Value) {
    match (state, patch) {
        (Value::Object(base), Value::Object(p)) => {
            for (k, v) in p {
                base.insert(k, v);
            }
        }
        (state, patch) => {
            *state = patch;
        }
    }
}

/// Checkpoint blob: versioned GraphRun snapshot (+ original input / def hash).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Checkpoint {
    pub version: u32,
    pub run: GraphRun,
    /// Explicit original input (v2+). For v1 importers, falls back to run.input/state.
    #[serde(default)]
    pub input: Value,
    #[serde(default)]
    pub def_hash: String,
}

pub fn def_hash(def: &GraphDef) -> String {
    // Stable FNV-1a 64-bit — DefaultHasher is not stable across Rust versions.
    let encoded = serde_json::to_string(def).unwrap_or_default();
    let mut hash: u64 = 0xcbf29ce484222325;
    for b in encoded.as_bytes() {
        hash ^= u64::from(*b);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("{hash:016x}")
}

pub fn checkpoint_export(run: &GraphRun) -> Result<Value, String> {
    serde_json::to_value(Checkpoint {
        version: 2,
        input: run.input.clone(),
        def_hash: run.def_hash.clone(),
        run: run.clone(),
    })
    .map_err(|e| e.to_string())
}

pub fn checkpoint_import(value: Value) -> Result<Checkpoint, String> {
    let mut cp: Checkpoint = serde_json::from_value(value).map_err(|e| e.to_string())?;
    if cp.version != 1 && cp.version != 2 {
        return Err(format!("unsupported checkpoint version {}", cp.version));
    }
    // Backfill v1 / empty fields from run.
    if cp.input.is_null() {
        cp.input = if !cp.run.input.is_null() {
            cp.run.input.clone()
        } else {
            cp.run.state.clone()
        };
    }
    if cp.def_hash.is_empty() {
        cp.def_hash = cp.run.def_hash.clone();
    }
    if cp.run.input.is_null() {
        cp.run.input = cp.input.clone();
    }
    if cp.run.def_hash.is_empty() {
        cp.run.def_hash = cp.def_hash.clone();
    }
    Ok(cp)
}

/// Build a linear path graph (workflow sugar).
pub fn linear_graph(
    name: impl Into<String>,
    nodes: Vec<GraphNode>,
    max_steps: u32,
) -> Result<GraphDef, String> {
    if nodes.is_empty() {
        return Err("linear graph needs nodes".into());
    }
    let entry = node_id(&nodes[0]).to_string();
    let mut edges = Vec::new();
    for i in 0..nodes.len() {
        let from = node_id(&nodes[i]).to_string();
        let to = if i + 1 < nodes.len() {
            node_id(&nodes[i + 1]).to_string()
        } else {
            END.to_string()
        };
        edges.push(GraphEdge {
            from,
            to,
            condition: None,
        });
    }
    let def = GraphDef {
        name: name.into(),
        entry,
        nodes,
        edges,
        max_steps,
    };
    def.validate()?;
    Ok(def)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn refund_graph() -> GraphDef {
        linear_graph(
            "refund",
            vec![
                GraphNode::Task {
                    id: "lookup".into(),
                },
                GraphNode::Interrupt {
                    id: "approve".into(),
                    prompt: "ok?".into(),
                },
                GraphNode::Task { id: "pay".into() },
            ],
            32,
        )
        .unwrap()
    }

    #[test]
    fn linear_hitl_and_checkpoint() {
        let def = refund_graph();
        let mut run = GraphRun::start("g1", &def, serde_json::json!({"orderId": "ord_9"}));

        assert!(matches!(run.advance(&def), GraphAdvance::Next { .. }));
        let adv = run
            .complete_node(&def, "lookup", Some("order:ord_9".into()), None)
            .unwrap();
        assert!(matches!(adv, GraphAdvance::WaitInterrupt { .. }));

        let blob = checkpoint_export(&run).unwrap();
        let restored_cp = checkpoint_import(blob).unwrap();
        let mut restored = restored_cp.run;
        assert_eq!(restored.status, GraphStatus::WaitingInterrupt);
        assert_eq!(restored_cp.version, 2);
        assert!(!restored_cp.def_hash.is_empty());
        assert_eq!(restored.input, serde_json::json!({"orderId": "ord_9"}));

        restored.resume_interrupt(&def).unwrap();
        let adv = restored
            .complete_interrupt(&def, "approved")
            .unwrap();
        assert!(matches!(adv, GraphAdvance::Next { .. }));
        let adv = restored
            .complete_node(&def, "pay", Some("refunded:order:ord_9".into()), None)
            .unwrap();
        assert!(matches!(adv, GraphAdvance::Done));
        assert_eq!(restored.status, GraphStatus::Completed);
        assert_eq!(
            restored.outputs.get("pay").map(String::as_str),
            Some("refunded:order:ord_9")
        );
    }

    #[test]
    fn checkpoint_v1_import_backfills_input_and_def_hash() {
        let def = refund_graph();
        let mut run = GraphRun::start("g-v1", &def, serde_json::json!({"orderId": "legacy"}));
        assert!(matches!(run.advance(&def), GraphAdvance::Next { .. }));
        let _ = run
            .complete_node(&def, "lookup", Some("order:legacy".into()), None)
            .unwrap();
        assert_eq!(run.status, GraphStatus::WaitingInterrupt);

        // Historical v1 shape: version + run only (no top-level input / defHash).
        let v1 = serde_json::json!({
            "version": 1,
            "run": run,
        });
        let cp = checkpoint_import(v1).unwrap();
        assert_eq!(cp.version, 1);
        assert_eq!(cp.input, serde_json::json!({"orderId": "legacy"}));
        assert!(!cp.def_hash.is_empty());
        assert_eq!(cp.def_hash, run.def_hash);
        assert_eq!(cp.run.input, serde_json::json!({"orderId": "legacy"}));
        assert!(!cp.run.def_hash.is_empty());
    }

    #[test]
    fn checkpoint_rejects_unknown_version() {
        let err = checkpoint_import(serde_json::json!({
            "version": 99,
            "run": {
                "id": "x",
                "graph": "g",
                "status": "running",
                "cursor": null,
                "steps": 0
            }
        }))
        .unwrap_err();
        assert!(err.contains("unsupported checkpoint version"));
    }

    #[test]
    fn conditional_need_route() {
        let def = GraphDef {
            name: "branch".into(),
            entry: "a".into(),
            max_steps: 16,
            nodes: vec![
                GraphNode::Task { id: "a".into() },
                GraphNode::Task { id: "b".into() },
                GraphNode::Task { id: "c".into() },
            ],
            edges: vec![
                GraphEdge {
                    from: "a".into(),
                    to: "b".into(),
                    condition: Some("toB".into()),
                },
                GraphEdge {
                    from: "a".into(),
                    to: "c".into(),
                    condition: Some("toC".into()),
                },
                GraphEdge {
                    from: "b".into(),
                    to: END.into(),
                    condition: None,
                },
                GraphEdge {
                    from: "c".into(),
                    to: END.into(),
                    condition: None,
                },
            ],
        };
        def.validate().unwrap();
        let mut run = GraphRun::start("g2", &def, Value::Null);
        let _ = run.advance(&def);
        let adv = run.complete_node(&def, "a", Some("ok".into()), None).unwrap();
        assert!(matches!(adv, GraphAdvance::NeedRoute { .. }));
        let adv = run.route(&def, "c").unwrap();
        assert!(matches!(adv, GraphAdvance::Next { .. }));
    }
}
