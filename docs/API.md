# API Documentation

## Overview

The MCP Orchestrator Server provides a set of tools for task management and coordination through the Model Context Protocol (MCP). This document details the API endpoints, data structures, and protocols used by the server.

## Data Structures

### Task Object
```typescript
interface Task {
  id: string;              // Unique identifier
  description: string;     // Task description
  status: 'pending' | 'in_progress' | 'completed';  // Current status
  assignedTo?: string;     // Instance ID of assignee
  result?: string;         // Task completion result
  dependencies?: string[]; // IDs of required tasks
}
```

### Task Status Response
```typescript
interface TaskStatusResponse {
  content: [{
    type: "text",
    text: string  // JSON stringified array of Task objects
  }]
}
```

### Task Completion Response
```typescript
interface TaskCompletionResponse {
  content: [{
    type: "text",
    text: string  // JSON stringified object containing completed_task and unlocked_tasks
  }]
}
```

## Tools

### 1. create_task

Creates a new task in the system.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier for the task"
    },
    "description": {
      "type": "string",
      "description": "Description of the task"
    },
    "dependencies": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "IDs of tasks that must be completed first"
    }
  },
  "required": ["id", "description"]
}
```

**Example Request:**
```javascript
await client.callTool('orchestrator', 'create_task', {
  id: 'task1',
  description: 'Example task',
  dependencies: ['dep1', 'dep2']
});
```

**Example Response:**
```json
{
  "content": [{
    "type": "text",
    "text": {
      "id": "task1",
      "description": "Example task",
      "status": "pending",
      "dependencies": ["dep1", "dep2"]
    }
  }]
}
```

### 2. get_next_task

Retrieves and assigns the next available task to an instance.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "instance_id": {
      "type": "string",
      "description": "ID of the instance requesting work"
    }
  },
  "required": ["instance_id"]
}
```

**Example Request:**
```javascript
await client.callTool('orchestrator', 'get_next_task', {
  instance_id: 'worker1'
});
```

**Example Response:**
```json
{
  "content": [{
    "type": "text",
    "text": {
      "id": "task1",
      "description": "Example task",
      "status": "in_progress",
      "assignedTo": "worker1",
      "dependencies": ["dep1", "dep2"]
    }
  }]
}
```

### 3. complete_task

Marks a task as completed with results.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "task_id": {
      "type": "string",
      "description": "ID of the task to complete"
    },
    "instance_id": {
      "type": "string",
      "description": "ID of the instance completing the task"
    },
    "result": {
      "type": "string",
      "description": "Result or output from the task"
    }
  },
  "required": ["task_id", "instance_id", "result"]
}
```

**Example Request:**
```javascript
await client.callTool('orchestrator', 'complete_task', {
  task_id: 'task1',
  instance_id: 'worker1',
  result: 'Task completed successfully'
});
```

**Example Response:**
```json
{
  "content": [{
    "type": "text",
    "text": {
      "completed_task": {
        "id": "task1",
        "description": "Example task",
        "status": "completed",
        "assignedTo": "worker1",
        "result": "Task completed successfully",
        "dependencies": ["dep1", "dep2"]
      },
      "unlocked_tasks": [
        {
          "id": "task2",
          "description": "Dependent task",
          "status": "pending",
          "dependencies": ["task1"]
        }
      ]
    }
  }]
}
```

### 4. get_task_status

Retrieves status of all tasks in the system.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

**Example Request:**
```javascript
await client.callTool('orchestrator', 'get_task_status', {});
```

**Example Response:**
```json
{
  "content": [{
    "type": "text",
    "text": [
      {
        "id": "task1",
        "description": "Example task",
        "status": "completed",
        "assignedTo": "worker1",
        "result": "Task completed successfully"
      },
      {
        "id": "task2",
        "description": "Another task",
        "status": "pending"
      }
    ]
  }]
}
```

### 5. get_task_details

Retrieves detailed information about a specific task.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "task_id": {
      "type": "string",
      "description": "ID of the task to get details for"
    }
  },
  "required": ["task_id"]
}
```

**Example Request:**
```javascript
await client.callTool('orchestrator', 'get_task_details', {
  task_id: 'task1'
});
```

**Example Response:**
```json
{
  "content": [{
    "type": "text",
    "text": {
      "id": "task1",
      "description": "Example task",
      "status": "completed",
      "assignedTo": "worker1",
      "result": "Task completed successfully",
      "dependencies": ["dep1", "dep2"]
    }
  }]
}
```

## Error Handling

The server uses the MCP error system with the following error codes:

- `InvalidRequest`: Invalid input parameters or task not found
- `MethodNotFound`: Unknown tool name
- `InternalError`: Server-side processing error

Example error response:
```json
{
  "error": {
    "code": -1,
    "message": "Task not found: task1",
    "data": {
      "task_id": "task1"
    }
  }
}
```

## Data Persistence

Tasks are stored in `data/tasks.json` using the following format:
```json
{
  "task1": {
    "id": "task1",
    "description": "Example task",
    "status": "completed",
    "assignedTo": "worker1",
    "result": "Task completed successfully",
    "dependencies": ["dep1", "dep2"]
  },
  "task2": {
    "id": "task2",
    "description": "Another task",
    "status": "pending"
  }
}
```

The file is updated atomically to prevent corruption during concurrent access.