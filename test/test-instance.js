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

// Load tasks from file
function loadTasks() {
  try {
    if (existsSync(TASKS_FILE)) {
      const data = readFileSync(TASKS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Error loading tasks:', error);
    return {};
  }
}

// Save tasks to file
function saveTasks(tasks) {
  try {
    writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
  } catch (error) {
    console.error('Error saving tasks:', error);
  }
}

// Get open tasks (pending or in-progress)
function getOpenTasks(tasks) {
  return Object.values(tasks).filter(task => 
    task.status === 'pending' || task.status === 'in_progress'
  );
}

// Get available tasks (pending with satisfied dependencies)
function getAvailableTasks(tasks) {
  return Object.values(tasks).filter(task => {
    if (task.status !== 'pending') return false;
    if (!task.dependencies) return true;
    return task.dependencies.every(depId => tasks[depId]?.status === 'completed');
  });
}

class TestInstance {
  constructor(id, tasks) {
    this.id = id;
    this.tasks = tasks;
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

// Run test to work on open tasks
async function runTest() {
  try {
    // Load existing tasks
    const tasks = loadTasks();
    log('Loaded existing tasks:', tasks);

    // Check for open and available tasks
    const openTasks = getOpenTasks(tasks);
    log('Open tasks:', openTasks);
    
    const availableTasks = getAvailableTasks(tasks);
    log('Available tasks (dependencies satisfied):', availableTasks);

    // Create instances for different roles
    const contentWriter = new TestInstance('content-writer', tasks);
    const sysAdmin = new TestInstance('sys-admin', tasks);
    const docWriter = new TestInstance('doc-writer', tasks);

    // Content writer works on content task
    const contentTask = await contentWriter.getNextTask();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work
    await contentWriter.completeTask('finalize-casino-content', 'Content guidelines and templates created');

    // System admin works on monitoring and backup
    const monitorTask = await sysAdmin.getNextTask();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work
    await sysAdmin.completeTask('monitor', 'Monitoring system configured and running');

    const backupTask = await sysAdmin.getNextTask();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work
    await sysAdmin.completeTask('backup', 'Backup system configured and tested');

    // Documentation writer works on docs
    const docsTask = await docWriter.getNextTask();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work
    await docWriter.completeTask('docs', 'Documentation updated with deployment and monitoring details');

    // Check final open tasks
    const remainingTasks = getOpenTasks(tasks);
    log('Remaining open tasks:', remainingTasks);

    log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test
runTest().catch(console.error);