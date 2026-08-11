//! Linear workflow engine with HITL + retries.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum WorkflowStatus {
    Pending,
    Running,
    WaitingHuman,
    Completed,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum WorkflowStep {
    #[serde(rename = "task", rename_all = "camelCase")]
    Task { id: String, name: String },
    #[serde(rename = "agent", rename_all = "camelCase")]
    Agent { id: String, agent: String },
    #[serde(rename = "human", rename_all = "camelCase")]
    Human { id: String, prompt: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowDef {
    pub name: String,
    pub steps: Vec<WorkflowStep>,
    #[serde(default = "default_max_retries")]
    pub max_retries: u32,
}

fn default_max_retries() -> u32 {
    2
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowRun {
    pub id: String,
    pub workflow: String,
    pub status: WorkflowStatus,
    pub cursor: usize,
    pub checkpoint: Option<String>,
    pub retries: u32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(default)]
    pub outputs: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum WorkflowAdvance {
    #[serde(rename = "next", rename_all = "camelCase")]
    Next { step: WorkflowStep },
    #[serde(rename = "wait_human", rename_all = "camelCase")]
    WaitHuman { step: WorkflowStep },
    #[serde(rename = "done")]
    Done,
    #[serde(rename = "failed", rename_all = "camelCase")]
    Failed { error: String },
}

impl WorkflowRun {
    pub fn start(id: impl Into<String>, def: &WorkflowDef) -> Self {
        Self {
            id: id.into(),
            workflow: def.name.clone(),
            status: WorkflowStatus::Running,
            cursor: 0,
            checkpoint: None,
            retries: 0,
            error: None,
            outputs: HashMap::new(),
        }
    }

    pub fn advance(&mut self, def: &WorkflowDef) -> WorkflowAdvance {
        if self.status == WorkflowStatus::Completed || self.status == WorkflowStatus::Failed {
            return WorkflowAdvance::Failed {
                error: "run finished".into(),
            };
        }
        if self.status == WorkflowStatus::WaitingHuman {
            return WorkflowAdvance::Failed {
                error: "waiting for human; call resume first".into(),
            };
        }
        if self.cursor >= def.steps.len() {
            self.status = WorkflowStatus::Completed;
            return WorkflowAdvance::Done;
        }
        let step = def.steps[self.cursor].clone();
        self.checkpoint = Some(step_id(&step).to_string());
        match &step {
            WorkflowStep::Human { .. } => {
                self.status = WorkflowStatus::WaitingHuman;
                WorkflowAdvance::WaitHuman { step }
            }
            _ => WorkflowAdvance::Next { step },
        }
    }

    pub fn complete_step(
        &mut self,
        def: &WorkflowDef,
        output: Option<(String, String)>,
    ) -> Result<(), String> {
        if self.status == WorkflowStatus::WaitingHuman {
            return Err("waiting for human; call resume first".into());
        }
        if self.status == WorkflowStatus::Completed || self.status == WorkflowStatus::Failed {
            return Err("run finished".into());
        }
        if self.status != WorkflowStatus::Running {
            return Err(format!("cannot complete step in status {:?}", self.status));
        }
        if self.checkpoint.is_none() {
            return Err("no active step to complete".into());
        }
        if let Some((k, v)) = output {
            self.outputs.insert(k, v);
        }
        self.cursor += 1;
        self.checkpoint = None;
        self.retries = 0;
        if self.cursor >= def.steps.len() {
            self.status = WorkflowStatus::Completed;
        } else {
            self.status = WorkflowStatus::Running;
        }
        Ok(())
    }

    pub fn fail_step(&mut self, def: &WorkflowDef, error: impl Into<String>) -> WorkflowAdvance {
        let error = error.into();
        self.retries += 1;
        self.checkpoint = None;
        if self.retries > def.max_retries {
            self.status = WorkflowStatus::Failed;
            self.error = Some(error.clone());
            return WorkflowAdvance::Failed { error };
        }
        self.status = WorkflowStatus::Running;
        if let Some(step) = def.steps.get(self.cursor).cloned() {
            self.checkpoint = Some(step_id(&step).to_string());
            match &step {
                WorkflowStep::Human { .. } => {
                    self.status = WorkflowStatus::WaitingHuman;
                    WorkflowAdvance::WaitHuman { step }
                }
                _ => WorkflowAdvance::Next { step },
            }
        } else {
            self.status = WorkflowStatus::Failed;
            self.error = Some(error.clone());
            WorkflowAdvance::Failed { error }
        }
    }

    pub fn resume_human(&mut self) -> Result<(), String> {
        if self.status != WorkflowStatus::WaitingHuman {
            return Err(format!(
                "not waiting for human (status={:?})",
                self.status
            ));
        }
        self.status = WorkflowStatus::Running;
        Ok(())
    }
}

fn step_id(step: &WorkflowStep) -> &str {
    match step {
        WorkflowStep::Task { id, .. }
        | WorkflowStep::Agent { id, .. }
        | WorkflowStep::Human { id, .. } => id,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn human_gate() {
        let def = WorkflowDef {
            name: "demo".into(),
            max_retries: 1,
            steps: vec![
                WorkflowStep::Task {
                    id: "t1".into(),
                    name: "prep".into(),
                },
                WorkflowStep::Human {
                    id: "h1".into(),
                    prompt: "ok?".into(),
                },
            ],
        };
        let mut run = WorkflowRun::start("r1", &def);
        assert!(matches!(run.advance(&def), WorkflowAdvance::Next { .. }));
        run.complete_step(&def, Some(("t1".into(), "ok".into())))
            .unwrap();
        assert!(matches!(
            run.advance(&def),
            WorkflowAdvance::WaitHuman { .. }
        ));
        run.resume_human().unwrap();
        run.complete_step(&def, Some(("h1".into(), "approved".into())))
            .unwrap();
        assert_eq!(run.status, WorkflowStatus::Completed);
        assert_eq!(run.outputs.get("t1").map(String::as_str), Some("ok"));
        assert_eq!(
            run.outputs.get("h1").map(String::as_str),
            Some("approved")
        );
    }

    #[test]
    fn resume_without_wait_errors() {
        let def = WorkflowDef {
            name: "demo".into(),
            max_retries: 1,
            steps: vec![WorkflowStep::Task {
                id: "t1".into(),
                name: "prep".into(),
            }],
        };
        let mut run = WorkflowRun::start("r1", &def);
        assert!(run.resume_human().is_err());
        assert!(run.complete_step(&def, None).is_err());
        assert!(matches!(run.advance(&def), WorkflowAdvance::Next { .. }));
        run.complete_step(&def, Some(("t1".into(), "ok".into())))
            .unwrap();
        assert_eq!(run.status, WorkflowStatus::Completed);
    }
}
