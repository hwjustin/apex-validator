import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { createChildLogger } from './logger.js';
import { config } from '../config.js';

const logger = createChildLogger('checkpoint');

interface CheckpointData {
  lastProcessedBlock: string; // Stored as string for JSON compatibility
}

/**
 * Load the last processed block from checkpoint file
 * Returns undefined if no checkpoint exists
 */
export function loadCheckpoint(): bigint | undefined {
  const filePath = config.checkpointPath;

  if (!existsSync(filePath)) {
    logger.info('No checkpoint file found, will start from latest block');
    return undefined;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const data: CheckpointData = JSON.parse(content);
    const block = BigInt(data.lastProcessedBlock);
    logger.info({ block: block.toString() }, 'Loaded checkpoint');
    return block;
  } catch (error) {
    logger.error({ error }, 'Failed to load checkpoint, will start from latest block');
    return undefined;
  }
}

/**
 * Save the last processed block to checkpoint file
 */
export function saveCheckpoint(block: bigint): void {
  const filePath = config.checkpointPath;

  // Ensure directory exists
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const data: CheckpointData = {
    lastProcessedBlock: block.toString(),
  };

  try {
    writeFileSync(filePath, JSON.stringify(data, null, 2));
    logger.debug({ block: block.toString() }, 'Saved checkpoint');
  } catch (error) {
    logger.error({ error, block: block.toString() }, 'Failed to save checkpoint');
  }
}
