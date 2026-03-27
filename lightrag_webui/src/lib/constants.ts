import { ButtonVariantType } from '@/components/ui/Button'

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, '')

const resolveBackendBaseUrl = (): string => {
  const envBaseUrl = import.meta.env.VITE_BACKEND_URL?.trim()
  if (envBaseUrl) {
    return normalizeBaseUrl(envBaseUrl)
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return normalizeBaseUrl(window.location.origin)
  }

  return 'http://localhost:9621'
}

export const backendBaseUrl = resolveBackendBaseUrl()
export const webuiPrefix = '/webui/'

export const controlButtonVariant: ButtonVariantType = 'ghost'

export const labelColorDarkTheme = '#FFFFFF'
export const LabelColorHighlightedDarkTheme = '#000000'
export const labelColorLightTheme = '#000'

export const nodeColorDisabled = '#D5DEEA'
export const nodeBorderColor = '#DCE5F4'
export const nodeBorderColorMuted = '#C7D3E4'
export const nodeBorderColorFocused = '#7AA7FF'
export const nodeBorderColorSelected = '#245DFF'

export const edgeColorDarkTheme = '#7A8CA8'
export const edgeColorLightTheme = '#93A8C4'
export const edgeColorMuted = '#C7D4E6'
export const edgeColorSelected = '#245DFF'
export const edgeColorHighlightedDarkTheme = '#F57F17'
export const edgeColorHighlightedLightTheme = '#245DFF'

export const searchResultLimit = 50
export const labelListLimit = 100

// Search History Configuration
export const searchHistoryMaxItems = 500
export const searchHistoryVersion = '1.0'

// API Request Limits
export const popularLabelsDefaultLimit = 300
export const searchLabelsDefaultLimit = 50

// UI Display Limits
export const dropdownDisplayLimit = 300

export const minNodeSize = 4
export const maxNodeSize = 20

export const healthCheckInterval = 15 // seconds

export const defaultQueryLabel = '*'

// reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/MIME_types/Common_types
export const supportedFileTypes = {
  'text/plain': [
    '.txt',
    '.md',
    '.rtf',  //# Rich Text Format
    '.odt', // # OpenDocument Text
    '.tex', // # LaTeX
    '.epub', // # Electronic Publication
    '.html', // # HyperText Markup Language
    '.htm', // # HyperText Markup Language
    '.csv', // # Comma-Separated Values
    '.json', // # JavaScript Object Notation
    '.xml', // # eXtensible Markup Language
    '.yaml', // # YAML Ain't Markup Language
    '.yml', // # YAML
    '.log', // # Log files
    '.conf', // # Configuration files
    '.ini', // # Initialization files
    '.properties', // # Java properties files
    '.sql', // # SQL scripts
    '.bat', // # Batch files
    '.sh', // # Shell scripts
    '.c', // # C source code
    '.cpp', // # C++ source code
    '.py', // # Python source code
    '.java', // # Java source code
    '.js', // # JavaScript source code
    '.ts', // # TypeScript source code
    '.swift', // # Swift source code
    '.go', // # Go source code
    '.rb', // # Ruby source code
    '.php', // # PHP source code
    '.css', // # Cascading Style Sheets
    '.scss',  //# Sassy CSS
    '.less'
  ],
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/bmp': ['.bmp'],
  'image/gif': ['.gif'],
  'image/tiff': ['.tif', '.tiff']
}

export const SiteInfo = {
  name: '智能图谱',
  home: '/',
  github: ''
}

