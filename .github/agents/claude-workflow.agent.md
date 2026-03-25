---
name: claude-workflow
description: "Use when: you want to run a Claude/Copilot workflow in VS Code for code exploration and refactor tasks."
# Optional: applyTo to limit to certain files or folders.
applyTo: "**/*"

# Steps for the agent; this is a high-level template. The platform may run this as narrative.
# Replace with cycle-specific details if your environment supports structured steps.
steps:
  - name: read-project-file
    action: read_file
    args:
      filePath: "${filePath}" # The user-provided file path (e.g., index.html)
  - name: analyze-findings
    action: respond
    args:
      text: "Read file and summarize structure + possible refactor points."
  - name: propose-changes
    action: respond
    args:
      text: "Generate patch instructions for the requested workflow: remove inline styles, move to CSS, add accessibility labels, etc."
  - name: apply-patch
    action: replace_string_in_file
    args:
      filePath: "${filePath}"
      oldString: "${oldSnippet}"
      newString: "${newSnippet}"

# Example user prompt to invoke this agent:
# runSubagent({ agentName: 'claude-workflow', prompt: 'Refactor index.html by moving inline styles to a shared CSS file', description: 'quick'})
---

Claude workflow template agent created. Use this as a starting point and adjust steps to your project’s tool-binding capabilities.
