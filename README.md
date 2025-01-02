# MCP Orchestrator Server

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](CHANGELOG.md)

The MCP Orchestrator Server provides task management and coordination capabilities across MCP enabled LLM instances like Claude Desktop or Cline. In simpler terms it allows for AI agents to create, share and execute tasks across instances 

<a href="https://glama.ai/mcp/servers/6hfxiaiuwg"><img width="380" height="200" src="https://glama.ai/mcp/servers/6hfxiaiuwg/badge" alt="Orchestrator Server MCP server" /></a>

## Features

### Version 1.1.0
- **Task Updates**: Modify pending tasks
- **Safe Deletion**: Delete tasks with dependency checks
- **Cycle Detection**: Prevent dependency cycles
- **Tool Listing**: Comprehensive tool documentation
- **Enhanced State Management**: Improved task state transitions

### Core Features
- Task creation with dependencies
- Multi-instance coordination
- Persistent task storage
- Dependency enforcement
- Task status tracking

## Installation

```bash
npm install
npm run build
```

## Usage

### Create a Task
```javascript
await create_task({
  id: 'setup',
  description: 'Initial setup'
});
```

### Get Next Task
```javascript
const task = await get_next_task({
  instance_id: 'worker-1'
});
```

### Complete Task
```javascript
await complete_task({
  task_id: 'setup',
  instance_id: 'worker-1',
  result: 'System initialized'
});
```

## Documentation

- [API Reference](docs/API.md)
- [Quick Start Guide](docs/QUICK_START.md)
- [Changelog](CHANGELOG.md)

## Roadmap

### Version 1.2.0
- Task priorities
- Timeouts
- Instance management

### Version 1.3.0
- Task groups
- Analytics
- Dashboard

## License
[MIT](LICENSE)
