//! Agent run state machine.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum AgentStatus {
    Running,
    WaitingTool,
    HandedOff,
    Completed,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "role")]
pub enum AgentMessage {
    #[serde(rename = "system", rename_all = "camelCase")]
    System { content: String },
    #[serde(rename = "user", rename_all = "camelCase")]
    User { content: String },
    #[serde(rename = "assistant", rename_all = "camelCase")]
    Assistant {
        content: Option<String>,
        #[serde(default, skip_serializing_if = "Vec::is_empty")]
        tool_calls: Vec<ToolCall>,
    },
    #[serde(rename = "tool", rename_all = "camelCase")]
    Tool {
        tool_call_id: String,
        name: String,
        content: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolCall {
    pub id: String,
    pub name: String,
    pub arguments: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentConfig {
    pub name: String,
    pub system: String,
    pub tools: Vec<String>,
    /// Allowed handoff targets (agent names).
    #[serde(default)]
    pub handoffs: Vec<String>,
    #[serde(default = "default_max_steps")]
    pub max_steps: u32,
}

fn default_max_steps() -> u32 {
    8
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentRun {
    pub id: String,
    pub config: AgentConfig,
    pub messages: Vec<AgentMessage>,
    pub status: AgentStatus,
    pub steps: u32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pending_tool_calls: Option<Vec<ToolCall>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub handed_off_to: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum AgentDecision {
    #[serde(rename = "text", rename_all = "camelCase")]
    Text { content: String },
    #[serde(rename = "tool_calls", rename_all = "camelCase")]
    ToolCalls { calls: Vec<ToolCall> },
    #[serde(rename = "handoff", rename_all = "camelCase")]
    Handoff {
        target: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        message: Option<String>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum AgentStepOutcome {
    #[serde(rename = "continue")]
    Continue,
    #[serde(rename = "need_tools", rename_all = "camelCase")]
    NeedTools { calls: Vec<ToolCall> },
    #[serde(rename = "handoff", rename_all = "camelCase")]
    Handoff {
        target: String,
        messages: Vec<AgentMessage>,
    },
    #[serde(rename = "done", rename_all = "camelCase")]
    Done { content: String },
    #[serde(rename = "failed", rename_all = "camelCase")]
    Failed { error: String },
}

impl AgentRun {
    pub fn start(id: impl Into<String>, config: AgentConfig, user: impl Into<String>) -> Self {
        let system = config.system.clone();
        Self {
            id: id.into(),
            config,
            messages: vec![
                AgentMessage::System { content: system },
                AgentMessage::User {
                    content: user.into(),
                },
            ],
            status: AgentStatus::Running,
            steps: 0,
            error: None,
            pending_tool_calls: None,
            handed_off_to: None,
        }
    }

    /// Continue a run after handoff with a new agent config and transferred messages.
    pub fn continue_from(
        id: impl Into<String>,
        config: AgentConfig,
        prior_messages: Vec<AgentMessage>,
    ) -> Self {
        let system = config.system.clone();
        let mut messages: Vec<AgentMessage> = prior_messages
            .into_iter()
            .filter(|m| !matches!(m, AgentMessage::System { .. }))
            .collect();
        messages.insert(0, AgentMessage::System { content: system });
        Self {
            id: id.into(),
            config,
            messages,
            status: AgentStatus::Running,
            steps: 0,
            error: None,
            pending_tool_calls: None,
            handed_off_to: None,
        }
    }

    pub fn apply_decision(&mut self, decision: AgentDecision) -> AgentStepOutcome {
        if self.status == AgentStatus::Completed
            || self.status == AgentStatus::Failed
            || self.status == AgentStatus::HandedOff
        {
            return AgentStepOutcome::Failed {
                error: "run already finished".into(),
            };
        }
        if self.status == AgentStatus::WaitingTool {
            return AgentStepOutcome::Failed {
                error: "waiting for tool results".into(),
            };
        }
        if self.steps >= self.config.max_steps {
            self.status = AgentStatus::Failed;
            self.error = Some("max steps exceeded".into());
            return AgentStepOutcome::Failed {
                error: "max steps exceeded".into(),
            };
        }
        self.steps += 1;

        match decision {
            AgentDecision::Text { content } => {
                self.messages.push(AgentMessage::Assistant {
                    content: Some(content.clone()),
                    tool_calls: vec![],
                });
                self.status = AgentStatus::Completed;
                AgentStepOutcome::Done { content }
            }
            AgentDecision::ToolCalls { calls } => {
                if calls.is_empty() {
                    self.status = AgentStatus::Failed;
                    self.error = Some("empty tool_calls".into());
                    return AgentStepOutcome::Failed {
                        error: "empty tool_calls".into(),
                    };
                }
                for call in &calls {
                    if !self.config.tools.iter().any(|t| t == &call.name) {
                        self.status = AgentStatus::Failed;
                        let error = format!("tool not allowed for agent: {}", call.name);
                        self.error = Some(error.clone());
                        return AgentStepOutcome::Failed { error };
                    }
                }
                self.messages.push(AgentMessage::Assistant {
                    content: None,
                    tool_calls: calls.clone(),
                });
                self.pending_tool_calls = Some(calls.clone());
                self.status = AgentStatus::WaitingTool;
                AgentStepOutcome::NeedTools { calls }
            }
            AgentDecision::Handoff { target, message } => {
                if !self.config.handoffs.iter().any(|h| h == &target) {
                    self.status = AgentStatus::Failed;
                    let error = format!("handoff target not allowed: {target}");
                    self.error = Some(error.clone());
                    return AgentStepOutcome::Failed { error };
                }
                let note = format!("Handing off to {target}");
                self.messages.push(AgentMessage::Assistant {
                    content: Some(note),
                    tool_calls: vec![],
                });
                if let Some(msg) = message {
                    if !msg.is_empty() {
                        self.messages.push(AgentMessage::User { content: msg });
                    }
                }
                self.status = AgentStatus::HandedOff;
                self.handed_off_to = Some(target.clone());
                AgentStepOutcome::Handoff {
                    target,
                    messages: self.messages.clone(),
                }
            }
        }
    }

    pub fn apply_tool_results(
        &mut self,
        results: Vec<(String, String, String)>,
    ) -> AgentStepOutcome {
        if self.status != AgentStatus::WaitingTool {
            return AgentStepOutcome::Failed {
                error: "not waiting for tools".into(),
            };
        }
        let pending = match &self.pending_tool_calls {
            Some(calls) if !calls.is_empty() => calls.clone(),
            _ => {
                self.status = AgentStatus::Failed;
                self.error = Some("no pending tool calls".into());
                return AgentStepOutcome::Failed {
                    error: "no pending tool calls".into(),
                };
            }
        };
        if results.is_empty() {
            self.status = AgentStatus::Failed;
            self.error = Some("empty tool results".into());
            return AgentStepOutcome::Failed {
                error: "empty tool results".into(),
            };
        }
        let mut seen = std::collections::HashSet::new();
        for (id, name, content) in &results {
            let Some(expected) = pending.iter().find(|c| &c.id == id) else {
                let error = format!("unexpected tool result id: {id}");
                self.status = AgentStatus::Failed;
                self.error = Some(error.clone());
                return AgentStepOutcome::Failed { error };
            };
            if &expected.name != name {
                let error = format!(
                    "tool result name mismatch for {id}: expected {}, got {name}",
                    expected.name
                );
                self.status = AgentStatus::Failed;
                self.error = Some(error.clone());
                return AgentStepOutcome::Failed { error };
            }
            if !seen.insert(id.clone()) {
                let error = format!("duplicate tool result id: {id}");
                self.status = AgentStatus::Failed;
                self.error = Some(error.clone());
                return AgentStepOutcome::Failed { error };
            }
            self.messages.push(AgentMessage::Tool {
                tool_call_id: id.clone(),
                name: name.clone(),
                content: content.clone(),
            });
        }
        if seen.len() != pending.len() {
            let error = format!(
                "incomplete tool results: got {} of {}",
                seen.len(),
                pending.len()
            );
            self.status = AgentStatus::Failed;
            self.error = Some(error.clone());
            return AgentStepOutcome::Failed { error };
        }
        self.pending_tool_calls = None;
        self.status = AgentStatus::Running;
        AgentStepOutcome::Continue
    }
}

#[derive(Debug, Default)]
pub struct AgentStore {
    runs: HashMap<String, AgentRun>,
}

impl AgentStore {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn insert(&mut self, run: AgentRun) {
        self.runs.insert(run.id.clone(), run);
    }

    pub fn get(&self, id: &str) -> Option<&AgentRun> {
        self.runs.get(id)
    }

    pub fn get_mut(&mut self, id: &str) -> Option<&mut AgentRun> {
        self.runs.get_mut(id)
    }

    pub fn remove(&mut self, id: &str) -> Option<AgentRun> {
        self.runs.remove(id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn tool_then_done() {
        let config = AgentConfig {
            name: "a".into(),
            system: "sys".into(),
            tools: vec!["add".into()],
            handoffs: vec![],
            max_steps: 4,
        };
        let mut run = AgentRun::start("1", config, "2+3");
        let step = run.apply_decision(AgentDecision::ToolCalls {
            calls: vec![ToolCall {
                id: "c1".into(),
                name: "add".into(),
                arguments: json!({"a": 2, "b": 3}),
            }],
        });
        assert!(matches!(step, AgentStepOutcome::NeedTools { .. }));
        let _ = run.apply_tool_results(vec![("c1".into(), "add".into(), "5".into())]);
        let step = run.apply_decision(AgentDecision::Text {
            content: "5".into(),
        });
        assert!(matches!(step, AgentStepOutcome::Done { .. }));
    }

    #[test]
    fn reject_decide_while_waiting_tool() {
        let config = AgentConfig {
            name: "a".into(),
            system: "sys".into(),
            tools: vec!["add".into()],
            handoffs: vec![],
            max_steps: 4,
        };
        let mut run = AgentRun::start("1", config, "hi");
        let _ = run.apply_decision(AgentDecision::ToolCalls {
            calls: vec![ToolCall {
                id: "c1".into(),
                name: "add".into(),
                arguments: json!({}),
            }],
        });
        let step = run.apply_decision(AgentDecision::Text {
            content: "nope".into(),
        });
        assert!(matches!(step, AgentStepOutcome::Failed { .. }));
        assert_eq!(run.status, AgentStatus::WaitingTool);
    }

    #[test]
    fn handoff_transfers_messages() {
        let config = AgentConfig {
            name: "triage".into(),
            system: "triage".into(),
            tools: vec![],
            handoffs: vec!["billing".into()],
            max_steps: 4,
        };
        let mut run = AgentRun::start("1", config, "refund please");
        let step = run.apply_decision(AgentDecision::Handoff {
            target: "billing".into(),
            message: Some("Customer wants refund".into()),
        });
        match step {
            AgentStepOutcome::Handoff { target, messages } => {
                assert_eq!(target, "billing");
                assert!(messages.len() >= 3);
                let next = AgentRun::continue_from(
                    "2",
                    AgentConfig {
                        name: "billing".into(),
                        system: "billing sys".into(),
                        tools: vec![],
                        handoffs: vec![],
                        max_steps: 4,
                    },
                    messages,
                );
                assert_eq!(next.config.name, "billing");
                assert!(matches!(next.messages[0], AgentMessage::System { .. }));
                assert_eq!(next.status, AgentStatus::Running);
            }
            other => panic!("expected handoff, got {other:?}"),
        }
    }
}
