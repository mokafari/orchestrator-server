#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TASKS_FILE = join(__dirname, '..', 'data', 'tasks.json');

interface Task {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  assignedTo?: string;
  result?: string;
  dependencies?: string[];
}

// Initialize tasks from file or create empty object
let tasks: { [id: string]: Task } = {};

function loadTasks() {
  try {
    if (existsSync(TASKS_FILE)) {
      const data = readFileSync(TASKS_FILE, 'utf8');
      tasks = JSON.parse(data);
      debug('Loaded tasks from file:', tasks);
    } else {
      debug('No tasks file found, starting with empty tasks');
      saveTasks(); // Create the file
    }
  } catch (error) {
    console.error('Error loading tasks:', error);
    process.exit(1);
  }
}

function saveTasks() {
  try {
    // Create data directory if it doesn't exist
    const dataDir = dirname(TASKS_FILE);
    if (!existsSync(dataDir)) {
      const { mkdirSync } = require('fs');
      mkdirSync(dataDir, { recursive: true });
    }
    writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
    debug('Saved tasks to file');
  } catch (error) {
    console.error('Error saving tasks:', error);
  }
}

function debug(message: string, ...args: any[]) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] DEBUG: ${message}`, ...args);
}

// Create MCP server
const server = new Server(
  {
    name: "orchestrator-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// Tool implementations
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  debug(`Handling tool request: ${request.params.name}`);
  debug(`Request arguments:`, request.params.arguments);
  
  try {
    switch (request.params.name) {
      case "create_task": {
        const { id, description, dependencies } = request.params.arguments as {
          id: string;
          description: string;
          dependencies?: string[];
        };

        debug(`Creating task ${id}: ${description}`);

        if (tasks[id]) {
          throw new McpError(ErrorCode.InvalidRequest, `Task ${id} already exists`);
        }

        // Verify dependencies exist
        if (dependencies) {
          for (const depId of dependencies) {
            if (!tasks[depId]) {
              throw new McpError(ErrorCode.InvalidRequest, `Dependency task ${depId} not found`);
            }
          }
        }

        const task: Task = {
          id,
          description,
          status: 'pending',
          dependencies
        };

        tasks[id] = task;
        saveTasks();
        debug(`Created task ${id}`);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(task, null, 2)
          }]
        };
      }

      case "get_next_task": {
        const { instance_id } = request.params.arguments as { instance_id: string };
        debug(`Instance ${instance_id} requesting next task`);
        
        // Find a pending task with no incomplete dependencies
        const availableTask = Object.values(tasks).find(task => {
          if (task.status !== 'pending') return false;
          if (!task.dependencies) return true;
          return task.dependencies.every(depId => tasks[depId]?.status === 'completed');
        });

        if (!availableTask) {
          debug('No tasks available');
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ status: 'no_tasks' }, null, 2)
            }]
          };
        }

        availableTask.status = 'in_progress';
        availableTask.assignedTo = instance_id;
        saveTasks();
        
        debug(`Assigned task ${availableTask.id} to instance ${instance_id}`);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(availableTask, null, 2)
          }]
        };
      }

      case "complete_task": {
        const { task_id, instance_id, result } = request.params.arguments as {
          task_id: string;
          instance_id: string;
          result: string;
        };

        debug(`Instance ${instance_id} completing task ${task_id}`);

        const task = tasks[task_id];
        if (!task) {
          throw new McpError(ErrorCode.InvalidRequest, `Task ${task_id} not found`);
        }

        if (task.assignedTo !== instance_id) {
          throw new McpError(ErrorCode.InvalidRequest, `Task ${task_id} is not assigned to instance ${instance_id}`);
        }

        task.status = 'completed';
        task.result = result;
        saveTasks();

        debug(`Task ${task_id} completed by instance ${instance_id}`);

        // Find tasks that can now be started
        const unlockedTasks = Object.values(tasks).filter(t => 
          t.status === 'pending' && 
          t.dependencies?.includes(task_id) &&
          t.dependencies.every(depId => tasks[depId]?.status === 'completed')
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              completed_task: task,
              unlocked_tasks: unlockedTasks
            }, null, 2)
          }]
        };
      }

      case "get_task_status": {
        debug('Getting task status');
        return {
          content: [{
            type: "text",
            text: JSON.stringify(Object.values(tasks), null, 2)
          }]
        };
      }

      case "get_task_details": {
        const { task_id } = request.params.arguments as { task_id: string };
        debug(`Getting details for task ${task_id}`);

        const task = tasks[task_id];
        if (!task) {
          throw new McpError(ErrorCode.InvalidRequest, `Task ${task_id} not found`);
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify(task, null, 2)
          }]
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, "Unknown tool");
    }
  } catch (error) {
    debug('Error handling request:', error);
    throw error;
  }
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  debug(`Listing tools`);
  return {
    tools: [
      {
        name: "create_task",
        description: "Create a new task",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Unique identifier for the task"
            },
            description: {
              type: "string",
              description: "Description of the task"
            },
            dependencies: {
              type: "array",
              items: {
                type: "string"
              },
              description: "IDs of tasks that must be completed first"
            }
          },
          required: ["id", "description"]
        }
      },
      {
        name: "get_next_task",
        description: "Get the next available task",
        inputSchema: {
          type: "object",
          properties: {
            instance_id: {
              type: "string",
              description: "ID of the instance requesting work"
            }
          },
          required: ["instance_id"]
        }
      },
      {
        name: "complete_task",
        description: "Mark a task as completed",
        inputSchema: {
          type: "object",
          properties: {
            task_id: {
              type: "string",
              description: "ID of the task to complete"
            },
            instance_id: {
              type: "string",
              description: "ID of the instance completing the task"
            },
            result: {
              type: "string",
              description: "Result or output from the task"
            }
          },
          required: ["task_id", "instance_id", "result"]
        }
      },
      {
        name: "get_task_status",
        description: "Get status of all tasks",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "get_task_details",
        description: "Get details of a specific task",
        inputSchema: {
          type: "object",
          properties: {
            task_id: {
              type: "string",
              description: "ID of the task to get details for"
            }
          },
          required: ["task_id"]
        }
      }
    ]
  };
});

// Start server
async function main() {
  try {
    loadTasks(); // Load tasks from file
    const transport = new StdioServerTransport();
    await server.connect(transport);
    debug('MCP server running on stdio');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
