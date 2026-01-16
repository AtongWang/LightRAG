import { useState, useCallback, useEffect } from 'react'
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
import FileUploader from '@/components/ui/FileUploader'
import { toast } from 'sonner'
import { errorMessage } from '@/lib/utils'
import { uploadDocument, getMultimodalParserStatus, ParserStatus } from '@/api/lightrag'
import { Switch } from '@/components/ui/Switch'
import { Label } from '@/components/ui/Label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip'

import { UploadIcon, Info, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface UploadDocumentsDialogProps {
  onDocumentsUploaded?: () => Promise<void>
}

export default function UploadDocumentsDialog({ onDocumentsUploaded }: UploadDocumentsDialogProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progresses, setProgresses] = useState<Record<string, number>>({})
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({})

  // Multimodal parsing state
  const [useMultimodal, setUseMultimodal] = useState(false)
  const [parserStatus, setParserStatus] = useState<ParserStatus | null>(null)
  const [checkingParser, setCheckingParser] = useState(false)

  // Check parser availability when dialog opens
  useEffect(() => {
    if (open && !parserStatus && !checkingParser) {
      setCheckingParser(true)
      getMultimodalParserStatus()
        .then((status) => {
          setParserStatus(status)
          // Auto-enable if multimodal is available
          if (status.multimodal_enabled && status.parsers.recommended) {
            // Don't auto-enable, let user choose
          }
        })
        .catch((err) => {
          console.debug('Multimodal parser not available:', err)
          setParserStatus({
            status: 'unavailable',
            parsers: {
              mineru_api: false,
              mineru_local: false,
              raganything: false,
              recommended: null
            },
            multimodal_enabled: false
          })
        })
        .finally(() => setCheckingParser(false))
    }
  }, [open, parserStatus, checkingParser])

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

            const result = await uploadDocument(file, (percentCompleted: number) => {
              console.debug(t('documentPanel.uploadDocuments.single.uploading', { name: file.name, percent: percentCompleted }))
              setProgresses((pre) => ({
                ...pre,
                [file.name]: percentCompleted
              }))
            }, undefined, useMultimodal)

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
        }
      } catch (err) {
        console.error('Unexpected error during upload:', err)
        toast.error(t('documentPanel.uploadDocuments.generalError', { error: errorMessage(err) }), { id: toastId })
      } finally {
        setIsUploading(false)
      }
    },
    [setIsUploading, setProgresses, setFileErrors, t, onDocumentsUploaded, useMultimodal]
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
        <Button variant="default" side="bottom" tooltip={t('documentPanel.uploadDocuments.tooltip')} size="sm">
          <UploadIcon /> {t('documentPanel.uploadDocuments.button')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t('documentPanel.uploadDocuments.title')}</DialogTitle>
          <DialogDescription>
            {t('documentPanel.uploadDocuments.description')}
          </DialogDescription>
        </DialogHeader>

        {/* Multimodal Parsing Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="multimodal-toggle" className="text-sm font-medium cursor-pointer">
                {t('documentPanel.uploadDocuments.multimodal.label', 'Enhanced Multimodal Parsing')}
              </Label>
              <span className="text-xs text-muted-foreground">
                {t('documentPanel.uploadDocuments.multimodal.description', 'Extract images, tables and equations with AI descriptions')}
              </span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help ml-1" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>{t('documentPanel.uploadDocuments.multimodal.tooltip', 'Uses MinerU parser for structured document parsing. Requires MinerU Docker service to be running.')}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            {checkingParser && (
              <span className="text-xs text-muted-foreground animate-pulse">
                {t('documentPanel.uploadDocuments.multimodal.checking', 'Checking...')}
              </span>
            )}
            {parserStatus && !parserStatus.multimodal_enabled && !parserStatus.parsers.recommended && !checkingParser && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-destructive cursor-help">
                    {t('documentPanel.uploadDocuments.multimodal.unavailable', 'Unavailable')}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('documentPanel.uploadDocuments.multimodal.unavailableHint', 'Start MinerU Docker service: docker compose --profile api up -d')}</p>
                </TooltipContent>
              </Tooltip>
            )}
            {parserStatus && parserStatus.parsers.recommended && !checkingParser && (
              <span className="text-xs text-green-600 dark:text-green-400">
                ✓ {parserStatus.parsers.recommended}
              </span>
            )}
            <Switch
              id="multimodal-toggle"
              checked={useMultimodal}
              onCheckedChange={setUseMultimodal}
              disabled={isUploading || (parserStatus !== null && !parserStatus.multimodal_enabled && !parserStatus.parsers.recommended)}
            />
          </div>
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
