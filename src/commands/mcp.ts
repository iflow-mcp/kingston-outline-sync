import { MCPServer } from '@src/mcp/server.js';
import { getOutlineService } from '@src/services/outline.js';
import { getCollectionConfigs } from '@src/utils/collection-filter.js';
import { getPackageVersion } from '@src/utils/version.js';

import type { Config, McpOptions } from '../types/config.js';
import type { DocumentCollection } from '@src/types/collections.js';

/**
 * Start MCP server for AI assistant integration
 */
export async function mcpCommand(
  config: Config,
  options: McpOptions,
): Promise<void> {
  const service = getOutlineService(config.outline.apiUrl);
  let outlineCollections: DocumentCollection[];

  try {
    outlineCollections = await service.getCollections();
  } catch (error) {
    console.warn('Warning: Failed to fetch collections from Outline API, using config collections');
    outlineCollections = [];
  }

  // Create a modified config for MCP use
  const mcpConfig: Config = { ...config };

  // If no collections in config and command line collections are provided, create virtual collections
  if (config.collections.length === 0 && options.collections && options.collections.length > 0) {
    mcpConfig.collections = options.collections.map((urlId) => ({
      urlId,
      directory: urlId,
      mcp: { enabled: true, readOnly: false },
    }));
  }

  const collections = getCollectionConfigs(outlineCollections, mcpConfig, {
    collectionUrlIdsFilter: options.collections,
    outputDir: options.dir,
  });
  const version = await getPackageVersion();

  // Initialize and start MCP server
  const server = new MCPServer(mcpConfig, collections, version, options);
  await server.start();

  // Keep the process running
  process.on('SIGINT', () => {
    console.error('\nShutting down MCP server...');
    process.exit(0);
  });
}