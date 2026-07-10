import { useMemo, useState, type CSSProperties } from 'react'

type PreviewImageItem = {
  id: string
  kind: 'image'
  imageUrl: string
  svgUrl?: string
  title: string
  aspectRatio?: string
}

type PreviewPendingItem = {
  id: string
  kind: 'pending'
  title: string
}

type PreviewPlaceholderItem = {
  id: string
  kind: 'placeholder'
  title: string
}

type PreviewItem = PreviewImageItem | PreviewPendingItem | PreviewPlaceholderItem

type PreviewGalleryProps = {
  items: PreviewItem[]
  previewAspectRatio: string
  onOpenLightbox: (imageUrl: string, title: string, items: Array<{ imageUrl: string; title: string; svgUrl?: string }>) => void
  onDownload: (imageUrl: string, title: string) => Promise<void>
  onDownloadMany: (items: Array<{ imageUrl: string; title: string }>) => Promise<void>
  onError: (message: string) => void
}

function DownloadIcon() {
  return (
    <svg className="download-button-icon" aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path d="M8 2.5v6.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="m5.2 6.2 2.8 2.8 2.8-2.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.2 12.6h9.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function PreviewGallery(props: PreviewGalleryProps) {
  const { items, previewAspectRatio, onOpenLightbox, onDownload, onDownloadMany, onError } = props
  const imageItems = items.filter((item): item is PreviewImageItem => item.kind === 'image')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectedItems = useMemo(
    () => imageItems.filter((item) => selectedIds.includes(item.id)),
    [imageItems, selectedIds],
  )

  function toggleSelection(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function startSelection() {
    setSelectionMode(true)
    setSelectedIds([])
  }

  function cancelSelection() {
    setSelectionMode(false)
    setSelectedIds([])
  }

  async function downloadSelected() {
    try {
      await onDownloadMany(selectedItems.map((item) => ({ imageUrl: item.imageUrl, title: item.title })))
      cancelSelection()
    } catch (error) {
      onError(error instanceof Error ? error.message : '下载失败。')
    }
  }

  return (
    <>
      {imageItems.length > 0 && (
        <div className="preview-toolbar">
          {selectionMode ? (
            <>
              <span className="preview-selection-count">{`已选择 ${selectedItems.length} 张`}</span>
              <button
                type="button"
                className="preview-toolbar-button primary"
                disabled={selectedItems.length === 0}
                  onClick={() => {
                    downloadSelected().catch((error) =>
                      onError(error instanceof Error ? error.message : '下载失败。'),
                    )
                  }}
                >
                <DownloadIcon />
                <span>下载已选</span>
              </button>
              <button type="button" className="preview-toolbar-button" onClick={cancelSelection}>
                取消
              </button>
            </>
          ) : (
            <>
              <span className="preview-selection-count">{`共 ${imageItems.length} 张`}</span>
              <button type="button" className="preview-toolbar-button" onClick={startSelection}>
                <DownloadIcon />
                <span>多选下载</span>
              </button>
            </>
          )}
        </div>
      )}
      <div className="preview-strip" aria-label="Generated image queue">
        {items.map((slot) => (
          <div
            className={`preview-frame ${slot.kind === 'pending' ? 'loading' : ''} ${
              slot.kind === 'image' && selectedIds.includes(slot.id) ? 'selected' : ''
            }`}
            key={slot.id}
            style={{ '--preview-aspect-ratio': slot.kind === 'image' ? slot.aspectRatio || previewAspectRatio : previewAspectRatio } as CSSProperties}
          >
            {slot.kind === 'image' ? (
              <>
                {selectionMode && (
                  <button
                    type="button"
                    className={`preview-select-toggle ${selectedIds.includes(slot.id) ? 'active' : ''}`}
                    onClick={() => toggleSelection(slot.id)}
                  >
                    {selectedIds.includes(slot.id) ? '已选' : '选择'}
                  </button>
                )}
                <button
                  type="button"
                  className="preview-image-button"
                  onClick={() =>
                    selectionMode
                      ? toggleSelection(slot.id)
                      : onOpenLightbox(slot.imageUrl, slot.title, imageItems.map((item) => ({ imageUrl: item.imageUrl, title: item.title, svgUrl: item.svgUrl })))
                  }
                >
                  <img src={slot.imageUrl} alt={slot.title} />
                </button>
                {!selectionMode && (
                  <button
                    type="button"
                    className="preview-download"
                    onClick={async () => {
                      try {
                        await onDownload(slot.imageUrl, slot.title)
                      } catch (error) {
                        onError(error instanceof Error ? error.message : '下载失败。')
                      }
                    }}
                  >
                    <DownloadIcon />
                    <span>下载</span>
                  </button>
                )}
              </>
            ) : slot.kind === 'pending' ? (
              <div className="preview-loading">
                <i aria-hidden="true" />
                <span>生成中</span>
                <small>{slot.title}</small>
              </div>
            ) : (
              <span>{slot.title}</span>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
