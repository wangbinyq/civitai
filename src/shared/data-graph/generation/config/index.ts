/**
 * Generation Config
 *
 * Unified configuration system for generation workflows.
 */

// Export configs and lookups
export {
  workflowConfigs,
  workflowConfigsArray,
  workflowConfigByKey,
  workflowOptions,
  workflowOptionById,
} from './workflows';

// Export workflow helpers
export {
  isWorkflowAvailable,
  isEnhancementWorkflow,
  getWorkflowsForEcosystem,
  getWorkflowsWithCompatibility,
  getAllWorkflowsGrouped,
  getDefaultEcosystemForWorkflow,
  getEcosystemsForWorkflow,
  getInputTypeForWorkflow,
  getOutputTypeForWorkflow,
  getWorkflowModes,
  workflowGroups,
} from './workflows';

// Export types
export type { WorkflowConfig, WorkflowConfigs, WorkflowCategory, WorkflowGroup } from './types';

export type { WorkflowOption } from './workflows';

// Export sampler/scheduler compatibility
export {
  CompatibilityRating,
  compatibilitySamplers,
  compatibilitySchedulers,
  getEcosystemCompatibility,
  getCompatibilityRating,
} from './sampler-scheduler-compatibility';
export type {
  CompatibilitySampler,
  CompatibilityScheduler,
  SamplerSchedulerEntry,
} from './sampler-scheduler-compatibility';
