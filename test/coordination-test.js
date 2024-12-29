#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { readFileSync } from 'fs';

// Debug logging helper
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
  console.log('-'.repeat(80));
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  try {
    log('Starting coordination test...');

    // Read MCP settings to get server configuration
    const settingsPath = '/Users/gustav/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json';
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    const serverConfig = settings.mcpServers.orchestrator;

    if (!serverConfig) {
      throw new Error('Orchestrator server not found in MCP settings');
    }

    log('Using server config:', serverConfig);

    // Initialize MCP client and connect to server
    const transport = new StdioClientTransport({
      command: serverConfig.command,
      args: serverConfig.args,
      env: {
        ...process.env,
        ...serverConfig.env,
        DEBUG: 'true'
      }
    });

    const client = new Client(
      {
        name: 'coordination-test',
        version: '0.1.0'
      },
      {
        capabilities: {
          resources: true,
          tools: true
        }
      }
    );

    log('Connecting to orchestrator server...');
    await client.connect(transport);
    log('Connected successfully');

    // Create tasks with dependencies
    log('Creating research task...');
    const researchTask = await client.callTool('orchestrator', 'create_task', {
      id: 'research',
      description: 'Research authentication methods'
    });
    log('Research task created:', researchTask);

    log('Creating design task...');
    const designTask = await client.callTool('orchestrator', 'create_task', {
      id: 'design',
      description: 'Design authentication system',
      dependencies: ['research']
    });
    log('Design task created:', designTask);

    log('Creating implementation task...');
    const implementTask = await client.callTool('orchestrator', 'create_task', {
      id: 'implement',
      description: 'Implement authentication system',
      dependencies: ['design']
    });
    log('Implementation task created:', implementTask);

    // Research instance starts working
    log('Research instance requesting task...');
    const researchWork = await client.callTool('orchestrator', 'get_next_task', {
      instance_id: 'research-instance'
    });
    log('Research instance got task:', researchWork);

    // Design instance checks what's available
    log('Design instance checking task status...');
    const designCheck1 = await client.callTool('orchestrator', 'get_task_status', {});
    log('Design instance sees:', designCheck1);

    // Design instance checks its dependencies
    log('Design instance checking dependencies...');
    const designDeps = await client.callTool('orchestrator', 'get_task_details', {
      task_id: 'design'
    });
    log('Design task dependencies:', designDeps);

    // Research instance completes its work
    await sleep(2000);
    log('Research instance completing task...');
    const researchComplete = await client.callTool('orchestrator', 'complete_task', {
      task_id: 'research',
      instance_id: 'research-instance',
      result: 'OAuth 2.0 recommended for authentication'
    });
    log('Research completion unlocked tasks:', researchComplete);

    // Design instance checks again and gets the task
    log('Design instance checking task status again...');
    const designCheck2 = await client.callTool('orchestrator', 'get_task_status', {});
    log('Design instance sees tasks are updated:', designCheck2);

    log('Design instance requesting task...');
    const designWork = await client.callTool('orchestrator', 'get_next_task', {
      instance_id: 'design-instance'
    });
    log('Design instance got task:', designWork);

    // Implementation instance checks status
    log('Implementation instance checking dependencies...');
    const implementDeps = await client.callTool('orchestrator', 'get_task_details', {
      task_id: 'implement'
    });
    log('Implementation task dependencies:', implementDeps);

    // Design instance completes its work
    await sleep(2000);
    log('Design instance completing task...');
    const designComplete = await client.callTool('orchestrator', 'complete_task', {
      task_id: 'design',
      instance_id: 'design-instance',
      result: 'Authentication system design document completed'
    });
    log('Design completion unlocked tasks:', designComplete);

    // Implementation instance gets its task
    log('Implementation instance requesting task...');
    const implementWork = await client.callTool('orchestrator', 'get_next_task', {
      instance_id: 'implement-instance'
    });
    log('Implementation instance got task:', implementWork);

    // Implementation instance completes work
    await sleep(2000);
    log('Implementation instance completing task...');
    const implementComplete = await client.callTool('orchestrator', 'complete_task', {
      task_id: 'implement',
      instance_id: 'implement-instance',
      result: 'Authentication system implemented and tested'
    });
    log('Implementation completion result:', implementComplete);

    // Check final status
    log('Getting final task status...');
    const finalStatus = await client.callTool('orchestrator', 'get_task_status', {});
    log('Final status:', finalStatus);

    log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test
main().catch(console.error);