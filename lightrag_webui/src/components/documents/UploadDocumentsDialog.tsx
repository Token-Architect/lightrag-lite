import { useState, useCallback, useEffect, useRef } from 'react'
import { FileRejection } from 'react-dropzone'
import Button from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/Dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover"
import FileUploader from '@/components/ui/FileUploader'
import { toast } from 'sonner'
import { errorMessage, processImageToCircle, cn } from '@/lib/utils'
import { getTrackStatus, uploadDocument } from '@/api/lightrag'

import {
  UploadIcon,
  Plus,
  X,
  Image as ImageIcon,
  User,
  MapPin,
  Building2,
  CalendarDays,
  Lightbulb,
  CircleHelp
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Input from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useSettingsStore } from '@/stores/settings'

interface UploadDocumentsDialogProps {
  onDocumentsUploaded?: () => Promise<void>
}

const MINDMAP_DIRTY_KEY = 'LIGHTRAG_MINDMAP_DIRTY_AT'
const CORPUS_UPDATED_EVENT = 'lightrag:corpus-updated'

// Available icons
const AVAILABLE_ICONS = [
  'person',
  'location',
  'organization',
  'event',
  'concept',
  'unknown'
]

const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  person: User,
  location: MapPin,
  organization: Building2,
  event: CalendarDays,
  concept: Lightbulb,
  unknown: CircleHelp
}

// Icon Picker Component
const IconPicker = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Process image to circle and get base64
      const base64 = await processImageToCircle(file, 256);
      onChange(base64);
    } catch (err) {
      console.error('Failed to process image:', err);
      toast.error('Failed to process image');
    }
    
    // Reset input
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const isDataUri = value.startsWith('data:');
  const IconComp = ICON_COMPONENTS[value] ?? ICON_COMPONENTS.unknown;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
            variant="outline" 
            className="w-[140px] h-8 px-2 justify-start text-left font-normal"
        >
            <div className="flex items-center gap-2 overflow-hidden">
                {isDataUri ? (
                  <img
                    src={value}
                    alt="icon"
                    className="w-4 h-4 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <IconComp className="w-4 h-4 shrink-0" />
                )}
                <span className="truncate">
                    {isDataUri ? 'Custom Image' : value}
                </span>
            </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-3" align="start">
        <div className="space-y-4">
            <div>
                <Label className="text-xs mb-2 block text-muted-foreground">Default Icons</Label>
                <div className="grid grid-cols-4 gap-2">
                    {AVAILABLE_ICONS.map((icon) => {
                      const OptionIcon = ICON_COMPONENTS[icon] ?? ICON_COMPONENTS.unknown
                      return (
                        <button
                          key={icon}
                          onClick={() => onChange(icon)}
                          className={cn(
                            "flex flex-col items-center justify-center p-2 rounded-md hover:bg-accent transition-colors gap-1",
                            value === icon && !isDataUri ? "bg-accent ring-1 ring-primary" : ""
                          )}
                        >
                          <OptionIcon className="w-6 h-6" />
                          <span className="text-[10px] capitalize truncate w-full text-center">{icon}</span>
                        </button>
                      )
                    })}
                </div>
            </div>
            
            <div className="border-t pt-3">
                 <Label className="text-xs mb-2 block text-muted-foreground">Custom Icon</Label>
                 <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                 >
                    <ImageIcon className="w-3 h-3 mr-2" /> Upload Image
                 </Button>
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileUpload}
                 />
                 <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                    Images will be automatically cropped to a circle.
                 </p>
            </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default function UploadDocumentsDialog({ onDocumentsUploaded }: UploadDocumentsDialogProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progresses, setProgresses] = useState<Record<string, number>>({})
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({})
  
  // Custom Entity Types with Icons
  const updateEntityIconMapping = useSettingsStore.use.updateEntityIconMapping()
  const savedEntityTypes = useSettingsStore.use.savedEntityTypes()
  const setSavedEntityTypes = useSettingsStore.use.setSavedEntityTypes()
  const [customEntityTypes, setCustomEntityTypes] = useState<{name: string, icon: string}[]>([])

  const waitForTrackProcessed = useCallback(async (trackIds: string[]): Promise<boolean> => {
    if (!trackIds.length) return false

    const timeoutMs = 180000
    const pollIntervalMs = 3000
    const startedAt = Date.now()
    const pending = new Set(trackIds)
    let hasProcessed = false

    const isTerminal = (status?: string) => {
      const s = (status || '').toLowerCase()
      return s === 'processed' || s === 'failed'
    }

    while (pending.size > 0 && Date.now() - startedAt < timeoutMs) {
      const ids = Array.from(pending)
      for (const trackId of ids) {
        try {
          const res = await getTrackStatus(trackId)
          const docs = Array.isArray(res.documents) ? res.documents : []

          if (docs.some((d) => (d.status || '').toLowerCase() === 'processed')) {
            hasProcessed = true
          }

          if (docs.length > 0 && docs.every((d) => isTerminal(d.status))) {
            pending.delete(trackId)
          }
        } catch {
          // Ignore transient polling errors and continue until timeout.
        }
      }

      if (pending.size === 0) break
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
    }

    return hasProcessed
  }, [])

  // Initialize from store
  useEffect(() => {
    if (savedEntityTypes && savedEntityTypes.length > 0) {
      setCustomEntityTypes(savedEntityTypes)
    } else {
        setCustomEntityTypes([
            { name: 'Person', icon: 'person' },
            { name: 'Location', icon: 'location' },
            { name: 'Organization', icon: 'organization' }
        ])
    }
  }, [savedEntityTypes])

  const handleAddType = () => {
    setCustomEntityTypes([...customEntityTypes, { name: '', icon: 'concept' }])
  }

  const handleRemoveType = (index: number) => {
    const newTypes = [...customEntityTypes]
    newTypes.splice(index, 1)
    setCustomEntityTypes(newTypes)
  }

  const handleTypeChange = (index: number, field: 'name' | 'icon', value: string) => {
    const newTypes = [...customEntityTypes]
    newTypes[index] = { ...newTypes[index], [field]: value }
    setCustomEntityTypes(newTypes)
  }

  const handleRejectedFiles = useCallback(
    (rejectedFiles: FileRejection[]) => {
      // Process rejected files and add them to fileErrors
      rejectedFiles.forEach(({ file, errors }) => {
        // Get the first error message
        let errorMsg = errors[0]?.message || t('documentPanel.uploadDocuments.fileUploader.fileRejected', { name: file.name })

        // Simplify error message for unsupported file types
        if (errorMsg.includes('file-invalid-type')) {
          errorMsg = t('documentPanel.uploadDocuments.fileUploader.unsupportedType')
        }

        // Set progress to 100% to display error message
        setProgresses((pre) => ({
          ...pre,
          [file.name]: 100
        }))

        // Add error message to fileErrors
        setFileErrors(prev => ({
          ...prev,
          [file.name]: errorMsg
        }))
      })
    },
    [setProgresses, setFileErrors, t]
  )

  const handleDocumentsUpload = useCallback(
    async (filesToUpload: File[]) => {
      setIsUploading(true)
      let hasSuccessfulUpload = false
      const successfulTrackIds: string[] = []

      // Only clear errors for files that are being uploaded, keep errors for rejected files
      setFileErrors(prev => {
        const newErrors = { ...prev };
        filesToUpload.forEach(file => {
          delete newErrors[file.name];
        });
        return newErrors;
      });

      // Show uploading toast
      const toastId = toast.loading(t('documentPanel.uploadDocuments.batch.uploading'))

      try {
        // Track errors locally to ensure we have the final state
        const uploadErrors: Record<string, string> = {}

        // Create a collator that supports Chinese sorting
        const collator = new Intl.Collator(['zh-CN', 'en'], {
          sensitivity: 'accent',  // consider basic characters, accents, and case
          numeric: true           // enable numeric sorting, e.g., "File 10" will be after "File 2"
        });
        const sortedFiles = [...filesToUpload].sort((a, b) =>
          collator.compare(a.name, b.name)
        );

        // Upload files in sequence, not parallel
        for (const file of sortedFiles) {
          try {
            // Initialize upload progress
            setProgresses((pre) => ({
              ...pre,
              [file.name]: 0
            }))

            const validTypes = customEntityTypes
                .map(t => t.name.trim())
                .filter(Boolean);

            // Save mappings to store
            const newMapping: Record<string, string> = {};
            customEntityTypes.forEach(t => {
                if (t.name.trim()) {
                    newMapping[t.name.trim().toLowerCase()] = t.icon;
                    newMapping[t.name.trim()] = t.icon; // Also save original case
                }
            });
            updateEntityIconMapping(newMapping);
            
            // Save list to store for next time
            setSavedEntityTypes(customEntityTypes);

            const result = await uploadDocument(file, (percentCompleted: number) => {
              console.debug(t('documentPanel.uploadDocuments.single.uploading', { name: file.name, percent: percentCompleted }))
              setProgresses((pre) => ({
                ...pre,
                [file.name]: percentCompleted
              }))
            }, validTypes)

            if (result.status === 'duplicated') {
              uploadErrors[file.name] = t('documentPanel.uploadDocuments.fileUploader.duplicateFile')
              setFileErrors(prev => ({
                ...prev,
                [file.name]: t('documentPanel.uploadDocuments.fileUploader.duplicateFile')
              }))
            } else if (result.status !== 'success') {
              uploadErrors[file.name] = result.message
              setFileErrors(prev => ({
                ...prev,
                [file.name]: result.message
              }))
            } else {
              // Mark that we had at least one successful upload
              hasSuccessfulUpload = true
              if (result.track_id) {
                successfulTrackIds.push(result.track_id)
              }
            }
          } catch (err) {
            console.error(`Upload failed for ${file.name}:`, err)

            // Handle HTTP errors, including 400 errors
            let errorMsg = errorMessage(err)

            // If it's an axios error with response data, try to extract more detailed error info
            if (err && typeof err === 'object' && 'response' in err) {
              const axiosError = err as { response?: { status: number, data?: { detail?: string } } }
              if (axiosError.response?.status === 400) {
                // Extract specific error message from backend response
                errorMsg = axiosError.response.data?.detail || errorMsg
              }

              // Set progress to 100% to display error message
              setProgresses((pre) => ({
                ...pre,
                [file.name]: 100
              }))
            }

            // Record error message in both local tracking and state
            uploadErrors[file.name] = errorMsg
            setFileErrors(prev => ({
              ...prev,
              [file.name]: errorMsg
            }))
          }
        }

        // Check if any files failed to upload using our local tracking
        const hasErrors = Object.keys(uploadErrors).length > 0

        // Update toast status
        if (hasErrors) {
          toast.error(t('documentPanel.uploadDocuments.batch.error'), { id: toastId })
        } else {
          toast.success(t('documentPanel.uploadDocuments.batch.success'), { id: toastId })
        }

        // Only update if at least one file was uploaded successfully
        if (hasSuccessfulUpload) {
          // Refresh document list
          if (onDocumentsUploaded) {
            onDocumentsUploaded().catch(err => {
              console.error('Error refreshing documents:', err)
            })
          }

          // Auto-trigger mind-map generation only after uploaded docs finish processing.
          void (async () => {
            const hasCorpusReady = await waitForTrackProcessed(successfulTrackIds)
            if (!hasCorpusReady) return
            const dirtyAt = String(Date.now())
            localStorage.setItem(MINDMAP_DIRTY_KEY, dirtyAt)
            window.dispatchEvent(new CustomEvent(CORPUS_UPDATED_EVENT, { detail: { dirtyAt } }))
          })()
        }
      } catch (err) {
        console.error('Unexpected error during upload:', err)
        toast.error(t('documentPanel.uploadDocuments.generalError', { error: errorMessage(err) }), { id: toastId })
      } finally {
        setIsUploading(false)
      }
    },
    [setIsUploading, setProgresses, setFileErrors, t, onDocumentsUploaded, customEntityTypes, updateEntityIconMapping, setSavedEntityTypes, waitForTrackProcessed]
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (isUploading) {
          return
        }
        if (!open) {
          setProgresses({})
          setFileErrors({})
        }
        setOpen(open)
      }}
    >
      <DialogTrigger asChild>
        <Button 
          variant="default" 
          side="bottom" 
          tooltip={t('documentPanel.uploadDocuments.tooltip')} 
          size="sm"
          className="shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 bg-primary hover:bg-primary/90 rounded-full px-5"
        >
          <UploadIcon className="mr-1.5 size-4" /> {t('documentPanel.uploadDocuments.button')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t('documentPanel.uploadDocuments.title')}</DialogTitle>
          <DialogDescription>
            {t('documentPanel.uploadDocuments.description')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 my-4">
          <div className="flex justify-between items-center">
             <Label>Entity Types & Icons</Label>
             <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAddType}
                className="h-7 text-xs"
             >
                <Plus className="size-3 mr-1" /> Add Type
             </Button>
          </div>
          
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
            {customEntityTypes.map((type, index) => (
                <div key={index} className="flex gap-2 items-center">
                    <Input
                        placeholder="Type Name (e.g. Person)"
                        value={type.name}
                        onChange={(e) => handleTypeChange(index, 'name', e.target.value)}
                        className="flex-1 h-8 text-sm"
                    />
                    <IconPicker 
                        value={type.icon}
                        onChange={(val) => handleTypeChange(index, 'icon', val)}
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveType(index)}
                        disabled={customEntityTypes.length <= 1}
                    >
                        <X className="size-4" />
                    </Button>
                </div>
            ))}
          </div>
          
          <p className="text-xs text-muted-foreground">
            Define entity types to extract and their corresponding icons. These settings will be saved for future visualizations.
          </p>
        </div>

        <FileUploader
          maxFileCount={Infinity}
          maxSize={200 * 1024 * 1024}
          description={t('documentPanel.uploadDocuments.fileTypes')}
          onUpload={handleDocumentsUpload}
          onReject={handleRejectedFiles}
          progresses={progresses}
          fileErrors={fileErrors}
          disabled={isUploading}
        />
      </DialogContent>
    </Dialog>
  )
}
