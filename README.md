# MCP Orchestrator Server

A Model Context Protocol (MCP) server that provides task orchestration and coordination capabilities. The server enables multiple instances to work on tasks with dependencies while maintaining a persistent state.

## Features

- Task Management
  - Create tasks with dependencies
  - Track task status (pending → in_progress → completed)
  - Store task results and assignments
  - Enforce dependency order

- Multi-Instance Coordination
  - Multiple instances can work simultaneously
  - Task status visibility across instances
  - Dependency enforcement
  - Role-based task assignment

- Persistence
  - Tasks stored in JSON file
  - Complete task history maintained
  - Survive server restarts
  - New instances can join anytime

## Installation

```bash
# Clone the repository
git clone [repository-url]
cd orchestrator-server

# Install dependencies
npm install

# Build the server
npm run build
```

## Usage

### Server Configuration

Add the server to your MCP settings file (typically `claude_desktop_config.json` or `cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "orchestrator": {
      "command": "node",
      "args": ["/path/to/orchestrator-server/build/index.js"],
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

### Available Tools

1. `create_task`
   - Create a new task with optional dependencies
   - Parameters:
     - id: Unique task identifier
     - description: Task description
     - dependencies: Array of task IDs that must be completed first

2. `get_next_task`
   - Get the next available task (dependencies satisfied)
   - Parameters:
     - instance_id: ID of the instance requesting work

3. `complete_task`
   - Mark a task as completed
   - Parameters:
     - task_id: ID of the task to complete
     - instance_id: ID of the instance completing the task
     - result: Result or output from the task

4. `get_task_status`
   - Get status of all tasks
   - No parameters required

5. `get_task_details`
   - Get details of a specific task
   - Parameters:
     - task_id: ID of the task to get details for

### Example Usage

```javascript
// Create tasks with dependencies
await client.callTool('orchestrator', 'create_task', {
  id: 'research',
  description: 'Research authentication methods'
});

await client.callTool('orchestrator', 'create_task', {
  id: 'implement',
  description: 'Implement authentication system',
  dependencies: ['research']
});

// Get next available task
const task = await client.callTool('orchestrator', 'get_next_task', {
  instance_id: 'worker-1'
});

// Complete a task
await client.callTool('orchestrator', 'complete_task', {
  task_id: 'research',
  instance_id: 'worker-1',
  result: 'OAuth 2.0 recommended'
});
```

## Data Storage

Tasks are stored in `data/tasks.json` with the following structure:

```json
{
  "task-id": {
    "id": "task-id",
    "description": "Task description",
    "status": "pending|in_progress|completed",
    "dependencies": ["dependency-id"],
    "assignedTo": "instance-id",
    "result": "Task result"
  }
}
```

## Testing

Run the test suite:

```bash
# Run basic tests
npm test

# Run coordination test
npm run test:coordination
```

The coordination test demonstrates multiple instances working together on tasks with dependencies.

## Roadmap

### Version 1.1
- [ ] Task Priorities
  - Add priority levels to tasks
  - Priority-based task assignment
  - Urgent task handling

- [ ] Task Timeouts
  - Add timeout settings for tasks
  - Auto-reassign stalled tasks
  - Track task duration

### Version 1.2
- [ ] Instance Management
  - Instance registration/heartbeat
  - Instance capability declaration
  - Smart task routing based on capabilities
  - Handle instance failures

- [ ] Task Templates
  - Predefined task templates
  - Template-based task creation
  - Template versioning

### Version 1.3
- [ ] Task Groups
  - Group related tasks
  - Bulk operations on groups
  - Group-level status tracking
  - Parallel execution within groups

- [ ] Advanced Dependencies
  - Conditional dependencies
  - OR dependencies (any one of multiple tasks)
  - Percentage-based dependencies
  - Dynamic dependency resolution

### Version 1.4
- [ ] Metrics & Analytics
  - Task completion time tracking
  - Instance performance metrics
  - Dependency chain analysis
  - Bottleneck identification

- [ ] Web Dashboard
  - Real-time task monitoring
  - Task management UI
  - Instance status display
  - Dependency visualization

### Version 1.5
- [ ] Event System
  - Task state change notifications
  - Webhook integrations
  - Custom event handlers
  - Event history

- [ ] Access Control
  - Role-based access control
  - Instance authentication
  - Task visibility rules
  - Audit logging

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
