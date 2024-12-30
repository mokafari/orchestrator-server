#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TASKS_FILE = join(__dirname, '..', 'data', 'tasks.json');

// Debug logging helper
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
  console.log('-'.repeat(80));
}

// Save tasks to file
function saveTasks(tasks) {
  try {
    writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
  } catch (error) {
    console.error('Error saving tasks:', error);
  }
}

// Get available tools
function getAvailableTools() {
  return [
    {
      name: "create_task",
      description: "Create a new task",
      parameters: {
        id: "Unique identifier for the task",
        description: "Description of the task",
        dependencies: "Optional array of task IDs that must be completed first"
      }
    },
    {
      name: "update_task",
      description: "Update an existing pending task",
      parameters: {
        task_id: "ID of the task to update",
        description: "Optional new description for the task",
        dependencies: "Optional new list of dependency task IDs"
      }
    },
    {
      name: "delete_task",
      description: "Delete a task if it has no dependents",
      parameters: {
        task_id: "ID of the task to delete"
      }
    },
    {
      name: "get_next_task",
      description: "Get the next available task",
      parameters: {
        instance_id: "ID of the instance requesting work"
      }
    },
    {
      name: "complete_task",
      description: "Mark a task as completed",
      parameters: {
        task_id: "ID of the task to complete",
        instance_id: "ID of the instance completing the task",
        result: "Result or output from the task"
      }
    },
    {
      name: "get_task_status",
      description: "Get status of all tasks",
      parameters: {}
    },
    {
      name: "get_task_details",
      description: "Get details of a specific task",
      parameters: {
        task_id: "ID of the task to get details for"
      }
    }
  ];
}

class TestInstance {
  constructor(id, tasks) {
    this.id = id;
    this.tasks = tasks;
  }

  async listTools() {
    log(`[${this.id}] Listing available tools`);
    const tools = getAvailableTools();
    log('Available tools:', tools);
    return tools;
  }

  async createTask(id, description, dependencies) {
    log(`[${this.id}] Creating task ${id}`);

    if (this.tasks[id]) {
      throw new Error(`Task ${id} already exists`);
    }

    if (dependencies) {
      for (const depId of dependencies) {
        if (!this.tasks[depId]) {
          throw new Error(`Dependency task ${depId} not found`);
        }
      }
    }

    const task = {
      id,
      description,
      status: 'pending',
      dependencies
    };

    this.tasks[id] = task;
    saveTasks(this.tasks);
    log(`[${this.id}] Created task:`, task);
    return task;
  }

  async updateTask(taskId, description, dependencies) {
    log(`[${this.id}] Updating task ${taskId}`);

    const task = this.tasks[taskId];
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status !== 'pending') {
      throw new Error(`Cannot update task ${taskId} in ${task.status} state`);
    }

    if (dependencies) {
      // Check for cycles
      const visited = new Set();
      const checkCycle = (id) => {
        if (visited.has(id)) return true;
        visited.add(id);
        return (this.tasks[id]?.dependencies || []).some(depId => checkCycle(depId));
      };

      for (const depId of dependencies) {
        if (!this.tasks[depId]) {
          throw new Error(`Dependency task ${depId} not found`);
        }
        if (depId === taskId || checkCycle(depId)) {
          throw new Error(`Dependencies would create a cycle`);
        }
      }
      task.dependencies = dependencies;
    }

    if (description) {
      task.description = description;
    }

    saveTasks(this.tasks);
    log(`[${this.id}] Updated task:`, task);
    return task;
  }

  async deleteTask(taskId) {
    log(`[${this.id}] Deleting task ${taskId}`);

    const task = this.tasks[taskId];
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Check for dependent tasks
    const dependentTasks = Object.values(this.tasks).filter(t => 
      t.dependencies?.includes(taskId)
    );

    if (dependentTasks.length > 0) {
      throw new Error(
        `Cannot delete task ${taskId} as it has dependent tasks: ${dependentTasks.map(t => t.id).join(', ')}`
      );
    }

    delete this.tasks[taskId];
    saveTasks(this.tasks);
    log(`[${this.id}] Deleted task ${taskId}`);
    return { deleted: taskId };
  }

  async getNextTask() {
    log(`[${this.id}] Requesting next task`);

    const availableTask = Object.values(this.tasks).find(task => {
      if (task.status !== 'pending') return false;
      if (!task.dependencies) return true;
      return task.dependencies.every(depId => this.tasks[depId]?.status === 'completed');
    });

    if (!availableTask) {
      log(`[${this.id}] No tasks available`);
      return { status: 'no_tasks' };
    }

    availableTask.status = 'in_progress';
    availableTask.assignedTo = this.id;
    saveTasks(this.tasks);
    
    log(`[${this.id}] Got task:`, availableTask);
    return availableTask;
  }

  async completeTask(taskId, result) {
    log(`[${this.id}] Completing task ${taskId}`);

    const task = this.tasks[taskId];
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.assignedTo !== this.id) {
      throw new Error(`Task ${taskId} is not assigned to instance ${this.id}`);
    }

    task.status = 'completed';
    task.result = result;
    saveTasks(this.tasks);

    const unlockedTasks = Object.values(this.tasks).filter(t => 
      t.status === 'pending' && 
      t.dependencies?.includes(taskId) &&
      t.dependencies.every(depId => this.tasks[depId]?.status === 'completed')
    );

    const response = {
      completed_task: task,
      unlocked_tasks: unlockedTasks
    };

    log(`[${this.id}] Completed task:`, response);
    return response;
  }

  async checkTaskStatus() {
    log(`[${this.id}] Checking task status`);
    const status = Object.values(this.tasks);
    log(`[${this.id}] Current status:`, status);
    return status;
  }

  async checkTaskDetails(taskId) {
    log(`[${this.id}] Checking details for task ${taskId}`);
    const task = this.tasks[taskId];
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    log(`[${this.id}] Task details:`, task);
    return task;
  }
}

// Run test to demonstrate task management
async function runTest() {
  try {
    // Start with empty tasks
    const tasks = {};
    saveTasks(tasks);
    log('Starting with clean state');

    // Create manager instance
    const manager = new TestInstance('manager', tasks);

    // List available tools
    await manager.listTools();

    // Create initial tasks
    await manager.createTask('setup', 'Initial setup');
    await manager.createTask('config', 'Configuration', ['setup']);
    await manager.createTask('deploy', 'Deployment', ['config']);

    // Try to update a task
    await manager.updateTask('config', 'Update system configuration', ['setup']);

    // Try to delete a task with dependents (should fail)
    try {
      await manager.deleteTask('setup');
    } catch (error) {
      log('Expected error:', error.message);
    }

    // Complete tasks in order
    const setupTask = await manager.getNextTask(); // get setup
    await manager.completeTask('setup', 'System initialized');

    const configTask = await manager.getNextTask(); // get config
    await manager.completeTask('config', 'System configured');

    const deployTask = await manager.getNextTask(); // get deploy
    await manager.completeTask('deploy', 'System deployed');

    // Now we can delete tasks since they're completed and not needed
    await manager.deleteTask('deploy');
    await manager.deleteTask('config');
    await manager.deleteTask('setup');

    // Check final state
    await manager.checkTaskStatus();

    log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test
runTest().catch(console.error);