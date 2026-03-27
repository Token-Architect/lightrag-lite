export type ModelKind = 'llm' | 'embedding'

const DOUBAO_SEED_FULL_CN = '\u8c46\u5305\u5927\u8bed\u8a00\u6a21\u578b\uff08Seed 2.0\uff09'
const DOUBAO_EMB_VISION_FULL_CN = '\u8c46\u5305\u591a\u6a21\u6001\u5411\u91cf\u6a21\u578b\uff08EMB-Vision\uff09'

const normalize = (modelName: string): string =>
  modelName.toLowerCase().replace(/[\s._-]+/g, '')

const isVolcengineEndpointModelId = (modelName: string): boolean =>
  /^ep-[a-z0-9-]+$/i.test(modelName)

export const toModelFullNameCn = (modelName: string, kind: ModelKind): string => {
  const normalized = normalize(modelName)

  if (kind === 'llm') {
    if (normalized.includes('doubao') && normalized.includes('seed2')) {
      return DOUBAO_SEED_FULL_CN
    }
    if (normalized.includes('seed2')) {
      return DOUBAO_SEED_FULL_CN
    }
    if (isVolcengineEndpointModelId(modelName)) {
      return DOUBAO_SEED_FULL_CN
    }
  }

  if (kind === 'embedding') {
    if (normalized.includes('embvision')) {
      return DOUBAO_EMB_VISION_FULL_CN
    }
    if (normalized.includes('doubao') && normalized.includes('emb') && normalized.includes('vision')) {
      return DOUBAO_EMB_VISION_FULL_CN
    }
    if (isVolcengineEndpointModelId(modelName)) {
      return DOUBAO_EMB_VISION_FULL_CN
    }
  }

  return modelName
}

export const toModelDisplay = (
  modelName: string,
  kind: ModelKind,
  options?: { includeModelId?: boolean }
): string => {
  const fullName = toModelFullNameCn(modelName, kind)
  const includeModelId = options?.includeModelId ?? false
  const base = fullName === modelName ? modelName : fullName
  if (!includeModelId) {
    return base
  }
  return `${base}\uff08\u5f53\u524d\u6a21\u578bID: ${modelName}\uff09`
}
