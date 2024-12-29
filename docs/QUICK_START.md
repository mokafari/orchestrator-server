# Quick Start Guide

This guide will help you get started with the MCP Orchestrator Server quickly.

## Installation

1. Clone and build the server:
```bash
git clone [repository-url]
cd orchestrator-server
npm install
npm run build
```

2. Add to MCP settings:
```json
{
  "mcpServers": {
    "orchestrator": {
      "command": "node",
      "args": ["/absolute/path/to/orchestrator-server/build/index.js"],
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

## Basic Usage Example

Here's a simple example of using the orchestrator to manage a website development project:

```javascript
// Create initial tasks
await client.callTool('orchestrator', 'create_task', {
  id: 'design',
  description: 'Design website mockups'
});

await client.callTool('orchestrator', 'create_task', {
  id: 'frontend',
  description: 'Implement frontend',
  dependencies: ['design']
});

await client.callTool('orchestrator', 'create_task', {
  id: 'backend',
  description: 'Implement backend API'
});

await client.callTool('orchestrator', 'create_task', {
  id: 'deploy',
  description: 'Deploy website',
  dependencies: ['frontend', 'backend']
});

// Designer gets and completes their task
const designTask = await client.callTool('orchestrator', 'get_next_task', {
  instance_id: 'designer'
});

await client.callTool('orchestrator', 'complete_task', {
  task_id: 'design',
  instance_id: 'designer',
  result: 'Mockups completed in Figma'
});

// Frontend developer can now start their work
const frontendTask = await client.callTool('orchestrator', 'get_next_task', {
  instance_id: 'frontend-dev'
});

// Backend developer can work in parallel
const backendTask = await client.callTool('orchestrator', 'get_next_task', {
  instance_id: 'backend-dev'
});
```

## Common Patterns

### 1. Linear Dependencies
Tasks that must be completed in sequence:
```javascript
await client.callTool('orchestrator', 'create_task', {
  id: 'step1',
  description: 'First step'
});

await client.callTool('orchestrator', 'create_task', {
  id: 'step2',
  description: 'Second step',
  dependencies: ['step1']
});

await client.callTool('orchestrator', 'create_task', {
  id: 'step3',
  description: 'Third step',
  dependencies: ['step2']
});
```

### 2. Parallel Tasks
Independent tasks that can be worked on simultaneously:
```javascript
await client.callTool('orchestrator', 'create_task', {
  id: 'task1',
  description: 'Independent task 1'
});

await client.callTool('orchestrator', 'create_task', {
  id: 'task2',
  description: 'Independent task 2'
});
```

### 3. Multiple Dependencies
Tasks that depend on multiple others being completed:
```javascript
await client.callTool('orchestrator', 'create_task', {
  id: 'final',
  description: 'Final task',
  dependencies: ['task1', 'task2', 'task3']
});
```

## Monitoring Tasks

### Check All Tasks
```javascript
const status = await client.callTool('orchestrator', 'get_task_status', {});
console.log('All tasks:', status);
```

### Check Specific Task
```javascript
const details = await client.callTool('orchestrator', 'get_task_details', {
  task_id: 'task1'
});
console.log('Task details:', details);
```

## Best Practices

1. **Unique Task IDs**
   - Use descriptive, unique IDs
   - Include project or category prefixes
   - Example: 'auth-research', 'auth-implement'

2. **Clear Descriptions**
   - Be specific about requirements
   - Include acceptance criteria
   - Mention any relevant resources

3. **Smart Dependencies**
   - Only add necessary dependencies
   - Break large tasks into smaller ones
   - Allow parallel work when possible

4. **Meaningful Results**
   - Include relevant links or references
   - Document any important decisions
   - Note any follow-up tasks needed

## Troubleshooting

1. **Task Not Available**
   - Check if dependencies are completed
   - Verify task hasn't been assigned to another instance
   - Ensure task ID is correct

2. **Can't Complete Task**
   - Verify instance ID matches assignee
   - Check if task is in 'in_progress' state
   - Ensure all required result info is provided

3. **Task State Issues**
   - Check data/tasks.json for corruption
   - Verify file permissions
   - Restart server if needed

## Next Steps

- Read the full [README.md](../README.md) for detailed documentation
- Check the [roadmap](../README.md#roadmap) for upcoming features
- Try the test suite to see more examples
- Join the community and contribute