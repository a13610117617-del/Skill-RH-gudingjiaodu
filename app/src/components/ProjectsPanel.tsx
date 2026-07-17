import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'

type ProjectImage = {
  imageUrl: string
  svgUrl?: string
  title: string
  prompt?: string
  compactPrompt?: string
  debugFinalPrompt?: string
  imageModel?: string
  size?: string
  directionId?: string
  directionTitle?: string
  referenceAnalysis?: string
  referenceImageUrls?: string[]
  createdAt?: string
  favorite?: boolean
}

type ProjectItem = {
  id: string
  skillDisplayName: string
  brief: string
  createdAt?: string
  updatedAt?: string
  images: ProjectImage[]
}


type ProjectsPanelProps = {
  open: boolean
  loading: boolean
  projects: ProjectItem[]
  onClose: () => void
  onOpenLightbox: (imageUrl: string, title: string, items: Array<{ imageUrl: string; title: string; svgUrl?: string }>) => void
  onDownload: (imageUrl: string, title: string) => Promise<void>
  onDownloadMany: (items: Array<{ imageUrl: string; title: string }>) => Promise<void>
  onDeleteProjects: (projectIds: string[]) => Promise<void>
  onDeleteImages: (items: Array<{ projectId: string; imageUrl: string }>) => Promise<void>
  onRefresh: () => Promise<void>
  onReuseImageSettings?: (project: ProjectItem, image: ProjectImage) => void
  onReuseProjectReferences?: (project: ProjectItem, image: ProjectImage) => Promise<void> | void
  onToggleFavorite?: (projectId: string, imageUrl: string, favorite: boolean) => Promise<void>
  onError: (message: string) => void
}

type ProjectDateFilter = 'all' | '7d' | '30d' | '90d' | 'custom'
type ProjectDateField = 'start' | 'end'

type DeleteConfirmState = {
  projectIds: string[]
  imageItems?: Array<{ projectId: string; imageUrl: string }>
  title: string
  message: string
  multi: boolean
  mode?: 'projects' | 'images'
}

type ImageTone = 'light' | 'dark'

function DownloadIcon() {
  return (
    <svg className="project-action-icon" aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path d="M8 2.5v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m4.8 7.2 3.2 3.2 3.2-3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 13.5h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="project-action-icon" aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path d="M2.8 4.2h10.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M6.2 2.5h3.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path
        d="M4.3 6.1v6.1c0 .75.55 1.3 1.3 1.3h4.8c.75 0 1.3-.55 1.3-1.3V6.1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ClearSelectionIcon() {
  return (
    <svg className="project-action-icon" aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path d="M4.3 4.3 11.7 11.7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M11.7 4.3 4.3 11.7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M2.8 8a5.2 5.2 0 1 0 10.4 0 5.2 5.2 0 0 0-10.4 0Z" stroke="currentColor" strokeWidth="1.35" />
    </svg>
  )
}

function ReuseIcon() {
  return (
    <svg className="project-action-icon" aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path d="M4 5.2h6.4c1.45 0 2.6 1.15 2.6 2.6s-1.15 2.6-2.6 2.6H5.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="m5.5 2.9-2.3 2.3 2.3 2.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.2 13.2h9.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg className="project-action-icon" aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path
        d="m8 2.3 1.55 3.15 3.48.5-2.52 2.45.6 3.46L8 10.23l-3.11 1.63.6-3.46-2.52-2.45 3.48-.5L8 2.3Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ExpandPromptIcon() {
  return (
    <svg className="project-action-icon" aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path d="M5.9 3H3v2.9" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.2 3.2 6.4 6.4" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
      <path d="M10.1 13H13v-2.9" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.8 12.8 9.6 9.6" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg className="project-filter-icon" aria-hidden="true" viewBox="0 0 18 18" fill="none">
      <path
        d="M8.1 13.2a5.1 5.1 0 1 0 0-10.2 5.1 5.1 0 0 0 0 10.2Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="m12 12 3.1 3.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg className="project-refresh-icon" aria-hidden="true" viewBox="0 0 18 18" fill="none">
      <path d="M14.2 6.8A5.5 5.5 0 0 0 4 5.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M13.9 3.8v3.2h-3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.8 11.2A5.5 5.5 0 0 0 14 12.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M4.1 14.2V11h3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BackToTopIcon() {
  return (
    <svg className="project-back-top-icon" aria-hidden="true" viewBox="0 0 18 18" fill="none">
      <path d="M9 13.5v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m5.2 8.1 3.8-3.8 3.8 3.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg className="project-calendar-icon" aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path d="M4.2 2.5v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11.8 2.5v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 4h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M3.2 3.5h9.6c.7 0 1.2.5 1.2 1.2v7.6c0 .7-.5 1.2-1.2 1.2H3.2c-.7 0-1.2-.5-1.2-1.2V4.7c0-.7.5-1.2 1.2-1.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateShort(value: string) {
  return value ? value.slice(2) : ''
}

function parseDateInput(value: string) {
  return value ? new Date(`${value}T00:00:00`) : null
}

function isSameDate(first: Date | null, second: Date | null) {
  return Boolean(
    first &&
      second &&
      first.getFullYear() === second.getFullYear() &&
      first.getMonth() === second.getMonth() &&
      first.getDate() === second.getDate(),
  )
}

function getCalendarDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const start = new Date(firstDay)
  start.setDate(firstDay.getDate() - firstDay.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return day
  })
}

function shiftMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function sortDateRange(start: string, end: string) {
  if (!start || !end) return { start, end }
  return start <= end ? { start, end } : { start: end, end: start }
}

function getDateRangeFromPreset(preset: ProjectDateFilter) {
  if (preset === 'all' || preset === 'custom') return { start: '', end: '' }
  const end = new Date()
  const start = new Date(end)
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90
  start.setDate(end.getDate() - days)
  return { start: formatDateInput(start), end: formatDateInput(end) }
}

function getReferenceLabel(url: string, index: number) {
  try {
    const parsed = new URL(url, window.location.origin)
    const tag = parsed.searchParams.get('mergeRef') || ''
    if (tag === 'angle-mask') return '角度'
    if (tag === 'background') return '背景'
    if (tag === 'model-outfit-body-limbs') return '模特'
    if (tag === 'product-shoe') return '产品'
  } catch {
    // Fall through to the generic label.
  }
  return `参考 ${index + 1}`
}

function shouldShowReferenceInProjectRecord(url: string) {
  try {
    const parsed = new URL(url, window.location.origin)
    const tag = parsed.searchParams.get('mergeRef') || ''
    return [
      'angle-mask',
      'original-angle-reference',
      'real-photo-angle-reference',
      'background',
    ].includes(tag) || /^product-shoe(?:-|$)/i.test(tag)
  } catch {
    return true
  }
}

function hasReusableProjectReferences(referenceImageUrls: string[] = []) {
  return referenceImageUrls.some((url) => {
    try {
      const parsed = new URL(url, window.location.origin)
      const tag = (parsed.searchParams.get('mergeRef') || '').toLowerCase()
      return tag === 'background'
        || tag === 'model-outfit-body-limbs'
        || /^product-shoe(?:-|$)/i.test(tag)
    } catch {
      return false
    }
  })
}

function getProjectRecordReferenceLabel(url: string, index: number) {
  try {
    const parsed = new URL(url, window.location.origin)
    const tag = parsed.searchParams.get('mergeRef') || ''
    const productMatch = tag.match(/^product-shoe(?:-reference-(\d+)|-primary)?$/i)
    if (productMatch) return tag === 'product-shoe-primary' ? '产品鞋图 1' : `产品鞋图 ${productMatch[1] || index + 1}`
    if (tag === 'angle-mask' || tag === 'original-angle-reference' || tag === 'real-photo-angle-reference') return '角度图'
    if (tag === 'background') return '背景图'
    if (/^product-shoe(?:-|$)/i.test(tag)) return tag === 'product-shoe-primary' ? '产品鞋图 1' : `产品鞋图 ${index + 1}`
  } catch {
    // Fall through to the generic label.
  }
  return getReferenceLabel(url, index)
}

function getReferenceLightboxItems(referenceImageUrls: string[]) {
  return referenceImageUrls.filter(shouldShowReferenceInProjectRecord).map((referenceUrl, referenceIndex) => ({
    imageUrl: referenceUrl,
    title: getProjectRecordReferenceLabel(referenceUrl, referenceIndex),
  }))
}

function getDisplayPrompt(image: ProjectImage) {
  return image.prompt || image.compactPrompt || image.debugFinalPrompt || ''
}

export function ProjectsPanel(props: ProjectsPanelProps) {
  const { open, loading, projects, onClose, onOpenLightbox, onDownload, onDownloadMany, onDeleteProjects, onDeleteImages, onRefresh, onReuseImageSettings, onReuseProjectReferences, onToggleFavorite, onError } = props
  const [selectionMode, setSelectionMode] = useState(false)
  const [batchOpen, setBatchOpen] = useState(false)
  const [selectedUrls, setSelectedUrls] = useState<string[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [dateFilter, setDateFilter] = useState<ProjectDateFilter>('all')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [activeDateField, setActiveDateField] = useState<ProjectDateField>('start')
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [skillFilter, setSkillFilter] = useState('all')
  const [skillOpen, setSkillOpen] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [imageTones, setImageTones] = useState<Record<string, ImageTone>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null)
  const [expandedPrompt, setExpandedPrompt] = useState<{ title: string; prompt: string } | null>(null)
  const [deletingProjects, setDeletingProjects] = useState(false)
  const panelRef = useRef<HTMLElement | null>(null)
  const searchRef = useRef<HTMLDivElement | null>(null)
  const filterRef = useRef<HTMLDivElement | null>(null)
  const dragSelectActiveRef = useRef(false)
  const suppressSelectionClickRef = useRef(false)
  const lastPointerPositionRef = useRef({ x: 0, y: 0 })
  const skillOptions = useMemo(
    () => Array.from(new Set(projects.map((project) => project.skillDisplayName).filter(Boolean))).sort(),
    [projects],
  )
  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return projects
      .map((project) => ({
        ...project,
        images: favoritesOnly ? project.images.filter((image) => image.favorite) : project.images,
      }))
      .filter((project) => {
      const projectDateValue = project.updatedAt || project.createdAt || project.id
      const projectDate = new Date(projectDateValue)
      const searchableText = [
        project.skillDisplayName,
        project.brief,
        project.createdAt,
        project.updatedAt,
        ...project.images.flatMap((image) => [image.title, image.prompt, image.compactPrompt, image.debugFinalPrompt, image.imageModel, image.size]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      if (query && !searchableText.includes(query)) return false
      if (skillFilter !== 'all' && project.skillDisplayName !== skillFilter) return false
      if (favoritesOnly && project.images.length === 0) return false
      if (dateFilter === 'all' && !dateStart && !dateEnd) return true
      if (Number.isNaN(projectDate.getTime())) return false

      const range = dateFilter === 'custom' ? { start: dateStart, end: dateEnd } : getDateRangeFromPreset(dateFilter)
      if (range.start) {
        const startDate = new Date(`${range.start}T00:00:00`)
        if (projectDate < startDate) return false
      }
      if (range.end) {
        const endDate = new Date(`${range.end}T23:59:59`)
        if (projectDate > endDate) return false
      }
      return true
    })
  }, [dateEnd, dateFilter, dateStart, favoritesOnly, projects, searchQuery, skillFilter])
  const projectDateKeys = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return new Set(
      projects
        .filter((project) => {
          const searchableText = [
            project.skillDisplayName,
            project.brief,
            project.createdAt,
            project.updatedAt,
          ...project.images.flatMap((image) => [image.title, image.prompt, image.compactPrompt, image.debugFinalPrompt, image.imageModel, image.size]),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()

          if (query && !searchableText.includes(query)) return false
          if (skillFilter !== 'all' && project.skillDisplayName !== skillFilter) return false
          return true
        })
        .map((project) => new Date(project.updatedAt || project.createdAt || project.id))
        .filter((date) => !Number.isNaN(date.getTime()))
        .map(formatDateInput),
    )
  }, [projects, searchQuery, skillFilter])
  const allImages = useMemo(
    () => projects.flatMap((project) => project.images.map((image) => ({ image, project }))),
    [projects],
  )
  const selectedItems = useMemo(
    () => allImages.filter(({ image }) => selectedUrls.includes(image.imageUrl)),
    [allImages, selectedUrls],
  )
  const selectedImageDeleteItems = useMemo(
    () => selectedItems.map(({ image, project }) => ({ projectId: project.id, imageUrl: image.imageUrl })),
    [selectedItems],
  )
  const calendarDays = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth])

  useEffect(() => {
    if (!searchOpen) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target
      if (target instanceof Node && searchRef.current?.contains(target)) return
      setSearchOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [searchOpen])

  useEffect(() => {
    if (!filtersOpen) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target
      if (target instanceof Node && filterRef.current?.contains(target)) return
      setFiltersOpen(false)
      setCalendarOpen(false)
      setSkillOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [filtersOpen])

  useEffect(() => {
    if (!selectionMode) return

    function stopDragSelect() {
      dragSelectActiveRef.current = false
    }

    function handlePointerMove(event: PointerEvent) {
      if (!dragSelectActiveRef.current) return
      lastPointerPositionRef.current = { x: event.clientX, y: event.clientY }
      selectImageAtViewportPoint(event.clientX, event.clientY)
    }

    function handleWheel() {
      if (!dragSelectActiveRef.current) return
      window.requestAnimationFrame(() => {
        const point = lastPointerPositionRef.current
        selectImageAtViewportPoint(point.x, point.y)
      })
    }

    document.addEventListener('pointerup', stopDragSelect)
    document.addEventListener('pointercancel', stopDragSelect)
    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('wheel', handleWheel, { passive: true })
    return () => {
      dragSelectActiveRef.current = false
      document.removeEventListener('pointerup', stopDragSelect)
      document.removeEventListener('pointercancel', stopDragSelect)
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('wheel', handleWheel)
    }
  }, [selectionMode])

  if (!open) return null

  function toggleSelection(imageUrl: string) {
    setSelectedUrls((current) =>
      current.includes(imageUrl) ? current.filter((item) => item !== imageUrl) : [...current, imageUrl],
    )
  }

  function addSelection(imageUrl: string) {
    setSelectedUrls((current) => current.includes(imageUrl) ? current : [...current, imageUrl])
  }

  function selectImageAtViewportPoint(clientX: number, clientY: number) {
    const target = document.elementFromPoint(clientX, clientY)
    const imageNode = target instanceof Element ? target.closest<HTMLElement>('[data-project-image-url]') : null
    const imageUrl = imageNode?.dataset.projectImageUrl || ''
    if (imageUrl) addSelection(imageUrl)
  }

  function startDragSelect(event: ReactPointerEvent, imageUrl: string) {
    if (!selectionMode || event.button !== 0) return
    const target = event.target
    if (
      target instanceof Element
      && target.closest('.project-select-toggle, .project-image-star, .project-reference-preview, .project-prompt-expand')
    ) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    dragSelectActiveRef.current = true
    suppressSelectionClickRef.current = true
    lastPointerPositionRef.current = { x: event.clientX, y: event.clientY }
    addSelection(imageUrl)
  }

  function handleSelectionImageClick(event: ReactPointerEvent | ReactMouseEvent, imageUrl: string) {
    if (suppressSelectionClickRef.current) {
      suppressSelectionClickRef.current = false
      event.preventDefault()
      event.stopPropagation()
      return
    }
    toggleSelection(imageUrl)
  }

  function handleProjectImageClick(event: ReactMouseEvent, project: ProjectItem, image: ProjectImage) {
    if (selectionMode) {
      handleSelectionImageClick(event, image.imageUrl)
      return
    }
    onOpenLightbox(
      image.imageUrl,
      image.title || project.skillDisplayName,
      project.images.map((item) => ({
        imageUrl: item.imageUrl,
        title: item.title || project.skillDisplayName,
        svgUrl: item.svgUrl,
      })),
    )
  }

  function updateImageTone(imageUrl: string, element: HTMLImageElement) {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 5
      canvas.height = 5
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) return
      context.drawImage(element, 0, 0, 5, 5)
      const data = context.getImageData(0, 0, 5, 5).data
      let total = 0
      let count = 0
      for (let index = 0; index < data.length; index += 4) {
        const alpha = data[index + 3] / 255
        if (alpha < 0.08) continue
        const luminance = 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2]
        total += luminance
        count += 1
      }
      const tone: ImageTone = count > 0 && total / count > 150 ? 'light' : 'dark'
      setImageTones((current) => current[imageUrl] === tone ? current : { ...current, [imageUrl]: tone })
    } catch {
      setImageTones((current) => current[imageUrl] ? current : { ...current, [imageUrl]: 'dark' })
    }
  }

  function startSelection() {
    setSelectionMode(true)
    setSelectedUrls([])
  }

  function cancelSelection() {
    setSelectionMode(false)
    setSelectedUrls([])
  }

  function clearSelectedImages() {
    setSelectedUrls([])
  }

  function startBatchOperation() {
    setBatchOpen(true)
    startSelection()
  }

  function cancelBatchOperation() {
    setBatchOpen(false)
    cancelSelection()
  }

  function scrollProjectsToTop() {
    panelRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function applyDatePreset(preset: ProjectDateFilter) {
    const range = getDateRangeFromPreset(preset)
    setDateFilter(preset)
    setDateStart(range.start)
    setDateEnd(range.end)
    setCalendarOpen(false)
  }

  function openCalendar(field: ProjectDateField) {
    if (calendarOpen && activeDateField === field) {
      setCalendarOpen(false)
      return
    }
    setActiveDateField(field)
    setCalendarOpen(true)
  }

  function selectCalendarDate(date: Date) {
    const value = formatDateInput(date)
    setDateFilter('custom')
    if (activeDateField === 'start' && dateStart === value) {
      setDateStart(value)
      setDateEnd(value)
      return
    }
    if (activeDateField === 'end' && (dateEnd === value || (dateStart === value && !dateEnd))) {
      setDateStart(value)
      setDateEnd(value)
      return
    }
    if (activeDateField === 'start') {
      const range = sortDateRange(value, dateEnd)
      setDateStart(range.start)
      setDateEnd(range.end)
      setActiveDateField(range.end ? 'start' : 'end')
      return
    }
    const range = sortDateRange(dateStart, value)
    setDateStart(range.start)
    setDateEnd(range.end)
  }

  function requestDeleteProject(project: ProjectItem) {
    setDeleteConfirm({
      projectIds: [project.id],
      title: '删除生成记录',
      message: `确定删除「${project.skillDisplayName}」这条生成记录吗？`,
      multi: false,
      mode: 'projects',
    })
  }

  function requestDeleteSelectedImages() {
    if (selectedImageDeleteItems.length === 0) return
    setDeleteConfirm({
      projectIds: [],
      imageItems: selectedImageDeleteItems,
      title: '批量删除图片',
      message: `确定删除选中的 ${selectedImageDeleteItems.length} 张生成图片吗？`,
      multi: true,
      mode: 'images',
    })
  }

  async function confirmDeleteProjects() {
    if (!deleteConfirm) return
    const isImageDelete = deleteConfirm.mode === 'images'
    const deleteImageItems = deleteConfirm.imageItems || []
    if (isImageDelete && deleteImageItems.length === 0) return
    if (!isImageDelete && deleteConfirm.projectIds.length === 0) return
    setDeletingProjects(true)
    try {
      if (isImageDelete) {
        await onDeleteImages(deleteImageItems)
        setSelectedUrls((current) => current.filter((item) => !deleteImageItems.some((image) => image.imageUrl === item)))
      } else {
        await onDeleteProjects(deleteConfirm.projectIds)
      }
      if (deleteConfirm.multi) cancelBatchOperation()
      setDeleteConfirm(null)
    } catch (error) {
      onError(error instanceof Error ? error.message : '删除失败。')
    } finally {
      setDeletingProjects(false)
    }
  }

  async function deleteSelectedImages() {
    if (selectedImageDeleteItems.length === 0) return
    requestDeleteSelectedImages()
  }

  async function downloadSelected() {
    try {
      await onDownloadMany(
        selectedItems.map(({ image, project }) => ({
          imageUrl: image.imageUrl,
          title: image.title || project.skillDisplayName,
        })),
      )
      cancelBatchOperation()
    } catch (error) {
      onError(error instanceof Error ? error.message : '下载失败。')
    }
  }

  async function downloadProject(project: ProjectItem) {
    if (project.images.length === 0) return
    try {
      await onDownloadMany(
        project.images.map((image) => ({
          imageUrl: image.imageUrl,
          title: image.title || project.skillDisplayName,
        })),
      )
    } catch (error) {
      onError(error instanceof Error ? error.message : '下载失败。')
    }
  }

  return (
    <div className="settings-backdrop utility-backdrop" role="presentation">
      <section className="settings-panel utility-panel projects-panel" aria-label="Projects" ref={panelRef}>
        <div className="settings-head">
          <div>
            <p>Projects</p>
            <h3>生成记录</h3>
          </div>
          <button type="button" className="settings-close-button" aria-label="关闭" onClick={onClose} />
        </div>
        {loading ? (
          <p className="empty-note">正在读取项目...</p>
        ) : projects.length === 0 ? (
          <p className="empty-note">还没有保存的生成项目。</p>
        ) : (
          <div className="project-list">
            <div className="project-tools">
              <button
                type="button"
                className={`project-refresh-button ${loading ? 'loading' : ''}`}
                aria-label="刷新生成记录"
                title="刷新生成记录"
                disabled={loading}
                onClick={() => {
                  onRefresh().catch((error) =>
                    onError(error instanceof Error ? error.message : '刷新生成记录失败。'),
                  )
                }}
              >
                <RefreshIcon />
              </button>
              <div className="project-search-wrap" ref={searchRef}>
                {searchOpen ? (
                  <form
                    className="project-search"
                    onSubmit={(event) => {
                      event.preventDefault()
                      setSearchQuery(searchInput)
                    }}
                  >
                    <SearchIcon />
                    <input
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="搜索"
                      aria-label="搜索生成记录"
                      autoFocus
                    />
                    <button type="submit">搜索</button>
                  </form>
                ) : (
                  <button
                    type="button"
                    className={`project-search-toggle ${searchQuery ? 'active' : ''}`}
                    aria-label="展开搜索"
                    onClick={() => setSearchOpen(true)}
                  >
                    <SearchIcon />
                  </button>
                )}
              </div>
              <div className="project-filter-wrap" ref={filterRef}>
                <button
                  type="button"
                  className={`project-filter-toggle ${filtersOpen ? 'active' : ''}`}
                  onClick={() =>
                    setFiltersOpen((current) => {
                      if (current) setCalendarOpen(false)
                      return !current
                    })
                  }
                  aria-expanded={filtersOpen}
                >
                  筛选
                  <span aria-hidden="true" />
                </button>
                {filtersOpen && (
                  <div className="project-filter-panel">
                    <div className="project-date-range">
                      <button
                        type="button"
                        className={`project-date-input ${activeDateField === 'start' ? 'active' : ''}`}
                        onClick={() => openCalendar('start')}
                      >
                        <span>{formatDateShort(dateStart) || '开始日期'}</span>
                        <CalendarIcon />
                      </button>
                      <button
                        type="button"
                        className={`project-date-input ${activeDateField === 'end' ? 'active' : ''}`}
                        onClick={() => openCalendar('end')}
                      >
                        <span>{formatDateShort(dateEnd) || '结束日期'}</span>
                        <CalendarIcon />
                      </button>
                    </div>
                    {calendarOpen && (
                    <div className="project-calendar">
                      <div className="project-calendar-head">
                        <button type="button" onClick={() => setCalendarMonth((current) => shiftMonth(current, -12))}>
                          «
                        </button>
                        <button type="button" onClick={() => setCalendarMonth((current) => shiftMonth(current, -1))}>
                          ‹
                        </button>
                        <strong>{`${calendarMonth.getFullYear()} 年 ${String(calendarMonth.getMonth() + 1).padStart(2, '0')} 月`}</strong>
                        <button type="button" onClick={() => setCalendarMonth((current) => shiftMonth(current, 1))}>
                          ›
                        </button>
                        <button type="button" onClick={() => setCalendarMonth((current) => shiftMonth(current, 12))}>
                          »
                        </button>
                      </div>
                      <div className="project-calendar-weekdays">
                        {['日', '一', '二', '三', '四', '五', '六'].map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                      </div>
                      <div className="project-calendar-grid">
                        {calendarDays.map((day) => {
                          const isCurrentMonth = day.getMonth() === calendarMonth.getMonth()
                          const hasProject = projectDateKeys.has(formatDateInput(day))
                          const selected =
                            isSameDate(day, parseDateInput(dateStart)) || isSameDate(day, parseDateInput(dateEnd))
                          return (
                            <button
                              type="button"
                              className={[
                                isCurrentMonth ? '' : 'muted',
                                hasProject ? 'has-project' : 'empty-day',
                                selected ? 'selected' : '',
                              ].filter(Boolean).join(' ')}
                              key={day.toISOString()}
                              onClick={() => selectCalendarDate(day)}
                            >
                              {day.getDate()}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    )}
                    <div className="project-date-presets compact">
                      {[
                        { id: 'all', label: '全部' },
                        { id: '7d', label: '最近一周' },
                        { id: '30d', label: '最近一个月' },
                        { id: '90d', label: '最近三个月' },
                      ].map((item) => (
                        <button
                          type="button"
                          className={dateFilter === item.id ? 'active' : ''}
                          key={item.id}
                          onClick={() => applyDatePreset(item.id as ProjectDateFilter)}
                        >
                          {item.label}
                          {dateFilter === item.id && <span aria-hidden="true">✓</span>}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className={`project-favorite-filter ${favoritesOnly ? 'active' : ''}`}
                      onClick={() => setFavoritesOnly((current) => !current)}
                    >
                      <StarIcon />
                      只看收藏
                    </button>
                    <div className="project-skill-filter" role="group" aria-label="Skill">
                      <span>Skill</span>
                      <button
                        type="button"
                        className={`project-skill-trigger ${skillOpen ? 'active' : ''}`}
                        onClick={() => setSkillOpen((current) => !current)}
                        aria-expanded={skillOpen}
                      >
                        <span>{skillFilter === 'all' ? '全部 Skill' : skillFilter}</span>
                        <i aria-hidden="true" />
                      </button>
                      {skillOpen && (
                      <div className="project-skill-options">
                        <button
                          type="button"
                          className={skillFilter === 'all' ? 'active' : ''}
                          onClick={() => {
                            setSkillFilter('all')
                            setSkillOpen(false)
                            setFiltersOpen(false)
                          }}
                        >
                          全部 Skill
                        </button>
                        {skillOptions.map((skill) => (
                          <button
                            type="button"
                            className={skillFilter === skill ? 'active' : ''}
                            key={skill}
                            onClick={() => {
                              setSkillFilter(skill)
                              setSkillOpen(false)
                              setFiltersOpen(false)
                            }}
                          >
                            {skill}
                          </button>
                        ))}
                      </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput('')
                        setSearchQuery('')
                        setSearchOpen(false)
                        setDateFilter('all')
                        setDateStart('')
                        setDateEnd('')
                        setCalendarOpen(false)
                        setSkillFilter('all')
                        setFavoritesOnly(false)
                        setSkillOpen(false)
                        setFiltersOpen(false)
                      }}
                    >
                      重置
                    </button>
                  </div>
                )}
              </div>
              <div className="project-download-toolbar">
                {!batchOpen ? (
                  <button type="button" className="project-batch-toggle" onClick={startBatchOperation}>
                    <span aria-hidden="true">☷</span>
                    批量操作
                  </button>
                ) : (
                  <div className="project-batch-actions">
                    <span className="project-download-count">
                      {`已选择 ${selectedItems.length} 张`}
                    </span>
                    <button
                      type="button"
                      className="project-download-action danger"
                      disabled={selectedItems.length === 0 || loading}
                      onClick={deleteSelectedImages}
                    >
                      <TrashIcon />
                      批量删除
                    </button>
                    <button
                      type="button"
                      className="project-download-action clear"
                      disabled={selectedItems.length === 0}
                      onClick={clearSelectedImages}
                    >
                      <ClearSelectionIcon />
                      一键取消
                    </button>
                    <button
                      type="button"
                      className="project-download-action primary"
                      disabled={selectedItems.length === 0}
                      onClick={() => {
                        downloadSelected().catch((error) =>
                          onError(error instanceof Error ? error.message : '下载失败。'),
                        )
                      }}
                    >
                      <DownloadIcon />
                      批量下载
                    </button>
                    <button type="button" className="project-batch-cancel" onClick={cancelBatchOperation}>
                      取消选择
                    </button>
                  </div>
                )}
              </div>
            </div>
            {filteredProjects.length === 0 ? (
              <p className="empty-note project-empty-results">没有找到匹配的生成记录。</p>
            ) : (
              filteredProjects.map((project) => (
              <article
                className={[
                  'project-card',
                ].filter(Boolean).join(' ')}
                key={project.id}
              >
                <div className="project-card-head">
                  <div>
                    <strong>{project.skillDisplayName}</strong>
                    <span>{project.updatedAt || project.createdAt || project.id}</span>
                  </div>
                  <div className="project-card-actions">
                    <em>{project.images.length} 张图</em>
                    <button
                      type="button"
                      className="project-download-one"
                      disabled={project.images.length === 0}
                      onClick={() => {
                        downloadProject(project).catch((error) =>
                          onError(error instanceof Error ? error.message : '下载失败。'),
                        )
                      }}
                    >
                      <DownloadIcon />
                      一键下载
                    </button>
                    <button type="button" className="project-delete-one" onClick={() => requestDeleteProject(project)}>
                      <TrashIcon />
                      删除
                    </button>
                  </div>
                </div>
                <p>{project.brief}</p>
                {project.images.length > 0 && (
                  <div className="project-image-row">
                    {project.images.map((image) => (
                      <figure
                        key={image.imageUrl}
                        data-project-image-url={image.imageUrl}
                        onPointerDown={(event) => startDragSelect(event, image.imageUrl)}
                        className={[
                          selectionMode ? 'project-generated-card-select-target' : '',
                          selectedUrls.includes(image.imageUrl) ? 'project-image-selected' : '',
                          image.favorite ? 'project-image-favorite' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        <button
                          type="button"
                          className={[
                            'project-image-star',
                            image.favorite ? 'active' : '',
                            imageTones[image.imageUrl] === 'light' ? 'on-light' : 'on-dark',
                          ].filter(Boolean).join(' ')}
                          aria-label={image.favorite ? '取消收藏' : '收藏图片'}
                          title={image.favorite ? '取消收藏' : '收藏图片'}
                          onClick={(event) => {
                            event.stopPropagation()
                            onToggleFavorite?.(project.id, image.imageUrl, !image.favorite).catch((error) =>
                              onError(error instanceof Error ? error.message : '收藏状态保存失败。'),
                            )
                          }}
                        >
                          <StarIcon />
                        </button>
                        {selectionMode && (
                          <button
                            type="button"
                            className={`project-select-toggle ${selectedUrls.includes(image.imageUrl) ? 'active' : ''}`}
                            aria-label={selectedUrls.includes(image.imageUrl) ? '取消选择图片' : '选择图片'}
                            onClick={() => toggleSelection(image.imageUrl)}
                          >
                            <span aria-hidden="true" />
                          </button>
                        )}
                        <button
                          type="button"
                          className={selectionMode ? 'project-image-drag-select-target' : ''}
                          onClick={(event) => handleProjectImageClick(event, project, image)}
                        >
                          <img
                            src={image.imageUrl}
                            alt={image.title || project.skillDisplayName}
                            crossOrigin="anonymous"
                            loading="lazy"
                            decoding="async"
                            onLoad={(event) => updateImageTone(image.imageUrl, event.currentTarget)}
                          />
                        </button>
                        <figcaption>
                          <strong>{image.title || '生成图片'}</strong>
                          <span>
                            {image.imageModel || ''}
                            {image.size ? ` · ${image.size}` : ''}
                          </span>
                        </figcaption>
                        {getReferenceLightboxItems(image.referenceImageUrls || []).length > 0 && (
                          <div className="project-reference-strip" aria-label="生成参考图">
                            {getReferenceLightboxItems(image.referenceImageUrls || []).map((referenceItem, referenceIndex, referenceItems) => (
                              <figure key={`${image.imageUrl}-ref-${referenceItem.imageUrl}-${referenceIndex}`}>
                                <button
                                  type="button"
                                  className="project-reference-preview"
                                  aria-label={`放大查看${referenceItem.title}`}
                                  onClick={() => onOpenLightbox(referenceItem.imageUrl, referenceItem.title, referenceItems)}
                                >
                                  <img src={referenceItem.imageUrl} alt={referenceItem.title} loading="lazy" decoding="async" />
                                </button>
                                <figcaption>{referenceItem.title}</figcaption>
                              </figure>
                            ))}
                          </div>
                        )}
                        {getDisplayPrompt(image) && (
                          <div className="project-prompt-preview">
                            <button
                              type="button"
                              className="project-prompt-expand"
                              aria-label="放大查看提示词"
                              title="放大查看提示词"
                              onClick={(event) => {
                                event.stopPropagation()
                                setExpandedPrompt({
                                  title: image.title || project.skillDisplayName,
                                  prompt: getDisplayPrompt(image),
                                })
                              }}
                            >
                              <ExpandPromptIcon />
                            </button>
                            <textarea readOnly value={getDisplayPrompt(image)} />
                          </div>
                        )}
                        {!selectionMode && (
                          <div className="project-image-actions">
                            {onReuseProjectReferences && hasReusableProjectReferences(image.referenceImageUrls || []) && (
                              <button
                                className="project-image-reference-reuse"
                                type="button"
                                onClick={() => {
                                  Promise.resolve(onReuseProjectReferences(project, image)).catch((error) =>
                                    onError(error instanceof Error ? error.message : '复用参考图失败。'),
                                  )
                                }}
                              >
                                <ReuseIcon />
                                复用参考图
                              </button>
                            )}
                            {onReuseImageSettings && (
                              <button
                                className="project-image-reuse"
                                type="button"
                                onClick={() => onReuseImageSettings(project, image)}
                              >
                                <ReuseIcon />
                                沿用到需求
                              </button>
                            )}
                            <button
                              className="project-image-download"
                              type="button"
                              onClick={async () => {
                                try {
                                  await onDownload(image.imageUrl, image.title || project.skillDisplayName)
                                } catch (error) {
                                  onError(error instanceof Error ? error.message : '下载失败。')
                                }
                              }}
                            >
                              <DownloadIcon />
                              下载
                            </button>
                          </div>
                        )}
                      </figure>
                    ))}
                  </div>
                )}
              </article>
              ))
            )}
          </div>
        )}
        <button type="button" className="project-back-top" aria-label="返回顶部" onClick={scrollProjectsToTop}>
          <BackToTopIcon />
        </button>
      </section>
      {expandedPrompt && (
        <div className="project-prompt-modal-backdrop" role="presentation">
          <section className="project-prompt-modal" role="dialog" aria-modal="true" aria-label="提示词放大查看">
            <header>
              <div>
                <strong>{expandedPrompt.title}</strong>
                <span>提示词</span>
              </div>
              <button type="button" onClick={() => setExpandedPrompt(null)} aria-label="关闭提示词放大查看">
                ×
              </button>
            </header>
            <textarea readOnly value={expandedPrompt.prompt} />
          </section>
        </div>
      )}
      {deleteConfirm && (
        <div className="project-confirm-backdrop" role="presentation">
          <section className="project-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="project-delete-title">
            <div>
              <p>Confirm</p>
              <h3 id="project-delete-title">{deleteConfirm.title}</h3>
            </div>
            <p>{deleteConfirm.message}</p>
            <div className="project-confirm-actions">
              <button
                type="button"
                className="project-confirm-cancel"
                disabled={deletingProjects}
                onClick={() => setDeleteConfirm(null)}
              >
                取消
              </button>
              <button type="button" className="project-confirm-delete" disabled={deletingProjects} onClick={confirmDeleteProjects}>
                <TrashIcon />
                {deletingProjects ? '删除中' : '确认删除'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
