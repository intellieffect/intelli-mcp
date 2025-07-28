/**
 * MCP Server JSON Parser Utility
 * Parses JSON input and extracts MCP server configurations
 */

export interface ParsedServer {
  name: string;
  config: {
    command: string;
    args?: string[];
    env?: Record<string, string>;
  };
  sourceIndex: number;
}

export interface ParseResult {
  servers: ParsedServer[];
  errors: string[];
}

/**
 * Extract JSON blocks from input text
 * Handles multiple JSON objects separated by whitespace
 */
function extractJSONBlocks(input: string): string[] {
  const blocks: string[] = [];
  let currentBlock = '';
  let braceCount = 0;
  let inString = false;
  let escapeNext = false;
  
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    
    if (escapeNext) {
      currentBlock += char;
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      currentBlock += char;
      continue;
    }
    
    if (char === '"' && !escapeNext) {
      inString = !inString;
    }
    
    if (!inString) {
      if (char === '{') {
        if (braceCount === 0 && currentBlock.trim()) {
          // Start new block - save previous if exists
          const trimmed = currentBlock.trim();
          if (trimmed && trimmed !== '{') {
            blocks.push(trimmed);
          }
          currentBlock = char;
        } else {
          currentBlock += char;
        }
        braceCount++;
      } else if (char === '}') {
        currentBlock += char;
        braceCount--;
        if (braceCount === 0) {
          blocks.push(currentBlock.trim());
          currentBlock = '';
        }
      } else if (braceCount > 0) {
        currentBlock += char;
      } else if (char.trim() && braceCount === 0) {
        currentBlock += char;
      }
    } else {
      currentBlock += char;
    }
  }
  
  return blocks.filter(block => block.length > 0);
}

/**
 * Guess server name from configuration
 */
function guessServerName(config: any): string {
  // Try to extract from NPX package name
  if (config.command === 'npx' && config.args && config.args.length >= 2) {
    const pkg = config.args.find((arg: string) => arg.startsWith('@') || arg.includes('/'));
    if (pkg) {
      // Extract package name: @scope/package-name -> package-name
      const match = pkg.match(/@[\w-]+\/([\w-]+)|^([\w-]+)/);
      if (match) {
        const name = match[1] || match[2];
        return name.replace(/^mcp-server-/, '').replace(/-mcp$/, '');
      }
    }
  }
  
  // Try to extract from node file path
  if (config.command === 'node' && config.args && config.args.length > 0) {
    const path = config.args[0];
    // Extract from path: path/to/server-name/index.js -> server-name
    const match = path.match(/([^/\\]+)(?:\/|\\)(?:index|server|main)\.js$/);
    if (match) {
      return match[1];
    }
    
    // Extract from filename: server-name.js -> server-name
    const filenameMatch = path.match(/([^/\\]+)\.js$/);
    if (filenameMatch) {
      return filenameMatch[1].replace(/^mcp-server-/, '').replace(/-server$/, '');
    }
  }
  
  // Fallback to timestamp-based name
  return `imported-server-${Date.now()}`;
}

/**
 * Extract servers from a single JSON string
 */
function extractServersFromJSON(jsonStr: string, sourceIndex: number): ParsedServer[] {
  const parsed = JSON.parse(jsonStr);
  const servers: ParsedServer[] = [];
  
  // Case 1: Full config with mcpServers
  if (parsed.mcpServers && typeof parsed.mcpServers === 'object') {
    Object.entries(parsed.mcpServers).forEach(([name, config]) => {
      if (config && typeof config === 'object') {
        servers.push({
          name,
          config: config as any,
          sourceIndex
        });
      }
    });
  }
  // Case 2: Direct server object (single server config)
  else if (parsed.command && typeof parsed.command === 'string') {
    const name = guessServerName(parsed);
    servers.push({
      name,
      config: parsed,
      sourceIndex
    });
  }
  // Case 3: Object with server-like properties but no mcpServers wrapper
  else if (typeof parsed === 'object' && parsed !== null) {
    // Check if it looks like a collection of servers
    const entries = Object.entries(parsed);
    const allServers = entries.every(([key, value]) => 
      typeof value === 'object' && 
      value !== null && 
      'command' in value
    );
    
    if (allServers && entries.length > 0) {
      entries.forEach(([name, config]) => {
        servers.push({
          name,
          config: config as any,
          sourceIndex
        });
      });
    }
  }
  
  return servers;
}

/**
 * Main parser function
 * Parses input text and extracts all MCP server configurations
 */
export const parseMCPServers = (input: string): ParseResult => {
  const servers: ParsedServer[] = [];
  const errors: string[] = [];
  
  if (!input || !input.trim()) {
    return { servers, errors: ['Input is empty'] };
  }
  
  try {
    const blocks = extractJSONBlocks(input.trim());
    
    if (blocks.length === 0) {
      errors.push('No valid JSON blocks found in input');
      return { servers, errors };
    }
    
    blocks.forEach((block, index) => {
      try {
        const extracted = extractServersFromJSON(block, index);
        if (extracted.length === 0) {
          errors.push(`Block ${index + 1}: No MCP servers found`);
        } else {
          servers.push(...extracted);
        }
      } catch (e) {
        const error = e instanceof Error ? e.message : 'Unknown error';
        errors.push(`Block ${index + 1}: ${error}`);
      }
    });
    
    if (servers.length === 0 && errors.length === 0) {
      errors.push('No valid MCP server configurations found');
    }
    
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    errors.push(`Failed to parse input: ${error}`);
  }
  
  return { servers, errors };
};

/**
 * Example configurations for testing
 */
export const exampleConfigurations = {
  single: `{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"]
    }
  }
}`,
  
  multiple: `{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_TOKEN>"
      }
    }
  }
}

{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=<project-ref>"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "<personal-access-token>"
      }
    }
  }
}`,
  
  direct: `{
  "command": "npx",
  "args": ["-y", "@upstash/context7-mcp"],
  "env": {
    "UPSTASH_REDIS_REST_URL": "your-url",
    "UPSTASH_REDIS_REST_TOKEN": "your-token"
  }
}`
};