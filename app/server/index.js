import express from 'express'
import multer from 'multer'
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { deflateSync, inflateSync } from 'node:zlib'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')
const workspaceRoot = path.resolve(appRoot, '..')
const skillsRoot = path.resolve(process.env.SKILLS_ROOT || path.resolve(workspaceRoot, 'outputs/d-design-skills'))
const dataRoot = path.resolve(process.env.DATA_ROOT || path.resolve(appRoot, 'data'))
const projectsRoot = path.resolve(process.env.PROJECTS_ROOT || path.resolve(dataRoot, 'projects'))
const settingsPath = path.resolve(dataRoot, 'settings.local.json')
const skillOrderPath = path.resolve(dataRoot, 'skill-order.json')
const downloadsRoot = path.resolve(process.env.DOWNLOADS_ROOT || path.resolve(process.env.HOME || workspaceRoot, 'Downloads', 'Skills Expert'))
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })
const skillImportUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024, files: 80 } })
const execFileAsync = promisify(execFile)
const MERGE_IMAGE_DISPLAY_NAME = '产品控制融合专家-固定角度'

const app = express()
app.use(express.json({ limit: '2mb' }))
app.use('/files', express.static(projectsRoot))
const transparentOptionSupportCache = new Map()

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse((await fs.readFile(file, 'utf8')).replace(/^\uFEFF/, ''))
  } catch {
    return fallback
  }
}

async function writeJson(file, data) {
  await ensureDir(path.dirname(file))
  await fs.writeFile(file, JSON.stringify(data, null, 2))
}

function mask(value) {
  if (!value) return ''
  return `${value.slice(0, 4)}••••${value.slice(-4)}`
}

function stripFrontmatter(content) {
  return content.replace(/^---[\s\S]*?---\s*/m, '').trim()
}

function summarize(content, max = 180) {
  return stripFrontmatter(content).replace(/\s+/g, ' ').slice(0, max)
}

function compactSkillContentForReasoning(skillContent = '') {
  return stripFrontmatter(skillContent)
    .split(/\n/)
    .filter((line) => !/^\s*```/.test(line))
    .slice(0, 70)
    .join('\n')
    .slice(0, 1800)
}

function compactReferencesForReasoning(references = []) {
  return references.map((reference) => ({
    file: reference.file,
    title: reference.title,
    summary: summarize(reference.summary || reference.content, 80),
  }))
}

function extractReadmeSummary(content) {
  const normalized = content.replace(/\r/g, '')
  const match = normalized.match(/## 能干什么\s*\n+([\s\S]*?)(?:\n## |\n# |\nlicense:|$)/i)
  if (!match) return ''
  return match[1].replace(/\s+/g, ' ').trim()
}

function safeFileName(value) {
  return value.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'output'
}

function createTimingLogger(scope, id = '') {
  const startedAt = performance.now()
  let lastAt = startedAt
  const steps = []
  const prefix = id ? `[${scope}:${id}]` : `[${scope}]`
  return {
    mark(label, extra = {}) {
      const now = performance.now()
      const step = {
        label,
        elapsedMs: Math.round(now - startedAt),
        deltaMs: Math.round(now - lastAt),
        ...extra,
      }
      steps.push(step)
      lastAt = now
      console.log(`${prefix} ${label} +${step.deltaMs}ms total=${step.elapsedMs}ms${Object.keys(extra).length ? ` ${JSON.stringify(extra)}` : ''}`)
      return step
    },
    summary(extra = {}) {
      return {
        totalMs: Math.round(performance.now() - startedAt),
        steps,
        ...extra,
      }
    },
  }
}

const MULTI_ANGLE_VIEW_LABELS = {
  front: '正视图',
  left: '左侧视图',
  back: '背面',
  right: '右侧视图',
  top: '顶部',
  bottom: '底部',
  detail: '细节特写',
  package: '包装/配件',
  other: '其他视角',
}

function describeMultiAngleUploadedFiles(files = []) {
  const lines = []
  for (const file of files) {
    const name = String(file.originalName || file.fileName || '')
    const productMatch = name.match(/product-view-([a-z]+)-(\d+)/i)
    if (productMatch) {
      const viewId = productMatch[1].toLowerCase()
      const index = productMatch[2]
      lines.push(`${name}：这是用户上传的${MULTI_ANGLE_VIEW_LABELS[viewId] || viewId}参考图，第 ${index} 张。生成时必须按这个视图身份读取它。`)
      continue
    }
    const layoutMatch = name.match(/view-layout-reference-(\d+)/i)
    if (layoutMatch) {
      lines.push(`${name}：这是用户上传的角度/构图参考图，第 ${layoutMatch[1]} 张，只用于决定生成视角和构图，不得替换产品主体。`)
    }
  }
  return lines.join('\n')
}

function isMultiAngleSkillId(skillId = '') {
  return skillId === 'ai-multi-angle-skill-local' || skillId === 'ai-multi-angle-skill' || /multi-angle/i.test(String(skillId || ''))
}

function isMergeImageSkillId(skillId = '') {
  return skillId === 'ai-merge-image-skill-local' || skillId === 'ai-merge-image-skill' || /merge-image/i.test(String(skillId || ''))
}

function isRealPhotoAngleSource(angleSource = '') {
  return /real\s*photo|真实照片|真人照片|非色块|non[-\s]*color[-\s]*block/i.test(String(angleSource || ''))
}

function isMultiAngleProductViewFile(file = {}) {
  return /product-view-(front|left|back|right|top|bottom|detail|package|other)-\d+/i.test(String(file.originalName || file.fileName || ''))
}

function mergeImageRole(file = {}, index = -1) {
  const name = String(file.originalName || file.fileName || '')
  if (/merge-product-/i.test(name)) return 'product'
  if (/merge-background-/i.test(name)) return 'background'
  if (/merge-angle-control-/i.test(name)) return 'angleControl'
  if (/merge-angle-hand-/i.test(name)) return 'angle'
  if (/merge-angle-/i.test(name)) return 'angle'
  if (/merge-model-/i.test(name)) return 'model'
  if (index === 0) return 'product'
  if (index === 1) return 'background'
  if (index === 2) return 'angle'
  return 'extra'
}

function describeMergeImageUploadedFiles(files = []) {
  if (!files.length) return ''
  const roleLabels = {
    product: 'product shoe reference: only source for shoe appearance and details',
    background: 'background reference: only source for the exact uploaded environment, visible existing elements, light, and perspective',
    angleControl: 'cleaned angle control reference: simplified hard layout mask for shoe count, shoe placement, pose, and region boundaries',
    angle: 'angle / semantic mask reference: yellow=shoes, blue=body limbs identified by silhouette as legs/ankles/feet or arms/hands/wrists, red=clothing, black=background; controls pose/composition/camera',
    model: 'model reference: only source for outfit, body limbs, skin tone, lower-body proportions, and styling; do not copy model shoes, model background, wall, floor, props, watermark, light pattern, or scene',
    extra: 'extra reference image',
  }
  return files.map((file, index) => {
    const name = file.originalName || file.fileName || `image-${index + 1}`
    const fixedLegLabel = /merge-model-fixed-angle-leg-reference/i.test(String(name || ''))
      ? 'fixed leg and magenta auxiliary reference: only source for leg anatomy, unified skin tone, lower-leg size, ankle contact, and rough auxiliary shoe zone; do not copy its shoe appearance, magenta color, white background, props, lighting, or scene'
      : ''
    return `${name}: ${fixedLegLabel || roleLabels[mergeImageRole(file, index)]}`
  }).join('\n')
}

function tagReferenceUrl(url = '', tag = '') {
  if (!url || !tag) return url
  const separator = String(url).includes('?') ? '&' : '?'
  return `${url}${separator}mergeRef=${encodeURIComponent(tag)}`
}

function roleFileMap(files = []) {
  const map = new Map()
  files.forEach((file, index) => {
    const role = mergeImageRole(file, index)
    if (!map.has(role)) map.set(role, [])
    map.get(role).push(file)
  })
  return map
}

function buildMergeImageGenerationReferenceUrls(files = [], angleSource = '') {
  const map = roleFileMap(files)
  const firstUrl = (role) => (map.get(role) || []).map((file) => file.url).find(Boolean) || ''
  const angleControlUrl = firstUrl('angleControl')
  const angleUrl = firstUrl('angle')
  const modelUrl = firstUrl('model')
  const productUrls = (map.get('product') || []).map((file) => file.url).filter(Boolean)
  const backgroundUrl = firstUrl('background')
  const angleReferences = angleControlUrl
    ? [
        tagReferenceUrl(angleControlUrl, 'cleaned-angle-control-mask'),
        tagReferenceUrl(angleUrl, 'original-angle-reference'),
      ]
    : [
        tagReferenceUrl(angleUrl, isRealPhotoAngleSource(angleSource) ? 'real-photo-angle-reference' : 'angle-mask'),
      ]
  return [
    ...angleReferences,
    tagReferenceUrl(backgroundUrl, 'background'),
    tagReferenceUrl(
      modelUrl,
      /angle-0[34]|瑙掑害\s*[34]/i.test(String(angleSource || ''))
        ? 'fixed-leg-magenta-auxiliary-reference'
        : 'model-outfit-body-limbs',
    ),
    ...productUrls.map((url, index) => tagReferenceUrl(url, index === 0 ? 'product-shoe-primary' : `product-shoe-reference-${index + 1}`)),
  ].filter(Boolean)
}

function buildProductReferenceAssignmentHardInstruction({ productReferenceCount = 0, angleSource = '', productImageStartIndex = 3 } = {}) {
  if (productReferenceCount <= 1) return ''
  const image1 = `image ${productImageStartIndex}`
  const image2 = `image ${productImageStartIndex + 1}`
  const base = [
    `MULTI PRODUCT COLORWAY LOCK: ${productReferenceCount} product shoe references are uploaded.`,
    `Each visible shoe position must preserve its assigned product reference exactly, including shoe color, material, outsole, strap/lace/buckle, stitching, texture, and proportions.`,
    `If ${image1} and ${image2} show different colors or variants, the final image must show different-colored shoes in the assigned positions.`,
    'Different product colors are intentional in this workflow. A natural left/right shoe pair may still be different colorways when the uploaded product references differ.',
    'Any instruction about a natural left-shoe/right-shoe pair controls shoe side geometry only; it must never force the two shoes to become the same color.',
    'Do not unify shoe colors, do not average colors, do not recolor one product reference to match another, and do not merge multiple product references into one hybrid shoe.',
  ]
  if (/angle-01|角度\s*1|手持\+脚穿|手持.*脚穿/i.test(String(angleSource || ''))) {
    return [
      ...base,
      `ANGLE-01 EXACT PRODUCT ASSIGNMENT: ${image1} / product reference 1 controls the single worn shoe on the visible foot/leg in the upper-right area.`,
      `${image2} / product reference 2 controls the hand-held or hand-supported display shoe in the lower-left foreground.`,
      'The worn shoe and the hand-supported display shoe must keep their separate assigned product colors when the references differ.',
      'Final visible check before output: the upper/right worn shoe must visibly match product reference 1 color, and the lower-left hand-supported shoe must visibly match product reference 2 color. If both shoes appear the same color, the result is wrong.',
      'Never swap these two assignments, never make both shoes the same color, and never turn the hand-supported display shoe into a second worn shoe.',
    ].join('\n')
  }
  return [
    ...base,
    'PRODUCT POSITION ASSIGNMENT: product reference 1 controls the first visible shoe position, product reference 2 controls the second visible shoe position, product reference 3 controls the third visible shoe position, continuing in upload order while preserving the selected angle shoe roles.',
  ].join('\n')
}

function buildMergeImageLockInstruction(files = [], angleSource = '') {
  if (!files.length) return ''
  const roleMap = new Map()
  files.forEach((file, index) => {
    const role = mergeImageRole(file, index)
    if (!roleMap.has(role)) roleMap.set(role, [])
    roleMap.get(role).push(file)
  })
  const productReferenceCount = (roleMap.get('product') || []).length
  const productReferenceAssignmentLock = productReferenceCount > 1
    ? `PRODUCT REFERENCE ASSIGNMENT LOCK: ${productReferenceCount} product shoe references are uploaded. If these product references show different shoes, different colors, or different variants, do not merge them into one hybrid shoe. Assign them to visible shoe positions one-by-one in upload order: product reference 1 controls one visible shoe position, product reference 2 controls another visible shoe position, product reference 3 controls another visible shoe position, following the visible shoe count, placement, and worn/handheld/display role from the selected angle. Product-reference assignment must never change the selected angle role: a hand-held or hand-supported display shoe must stay hand-held/hand-supported, a worn shoe must stay worn, and a standalone display shoe must stay standalone. Never convert a hand-supported shoe into a second worn shoe, never add an extra foot/leg for a hand-supported or standalone display shoe, and never remove a required hand. If there are more visible shoe positions than product references, repeat the product references in order.`
    : 'PRODUCT REFERENCE ASSIGNMENT LOCK: only one product shoe reference is uploaded, so every visible shoe in the final image must use that same shoe identity, color, material, sole, toe, heel, straps/laces/buckles, texture, stitching, lining, and proportions.'
  const backgroundElementLock = 'BACKGROUND LOCK: the uploaded background is the only environment source. Preserve the uploaded background exactly as it is, including only the environment elements that are already visible in that image, their relative positions, scale, crop, perspective, occlusion, light direction, color temperature, and shadow mood. Do not create any new background structure, edge line, room feature, prop, texture, or pattern that is not already visible in the uploaded background. Only blend the product, body parts, and contact shadows into the existing uploaded background lighting and perspective.'
  const hasAngleControl = roleMap.has('angleControl')
  const isFixedAngle03Or04 = /angle-0[34]|瑙掑害\s*[34]/i.test(String(angleSource || ''))
  if (hasAngleControl) {
    return [
      'AI PRODUCT BACKGROUND FUSION HARD RULES: output one final realistic composite image, not a triptych, collage, or explanation.',
      describeMergeImageUploadedFiles(files),
      roleMap.has('product') ? 'PRODUCT SHOE LOCK: the uploaded product shoe is the only and 100% authoritative shoe identity source. Preserve shoe shape, color, material, texture, strap/buckle/lace, toe, heel, sole, stitching, lining, shine, and proportions.' : 'Missing product shoe image; do not invent a product shoe.',
      roleMap.has('product') ? productReferenceAssignmentLock : '',
      roleMap.has('background') ? backgroundElementLock : 'Missing background image; do not invent a separate scene.',
      'ANGLE STRUCTURE LOCK: follow the structured angle schema and S/B object map for pose, shoe count, worn/handheld/display role, camera, coordinates, and occlusion. The cleaned control image is only a layout guide, not a visual style reference.',
      roleMap.has('model')
        ? isFixedAngle03Or04
          ? 'FIXED LEG REFERENCE LOCK: use the uploaded fixed leg/magenta auxiliary reference only for leg anatomy, calf shape, unified skin tone, lower-leg size, ankle contact, and rough auxiliary shoe-zone confirmation. The original angle yellow/S region remains the exact shoe placement authority. Do not copy fixed-reference shoe appearance, magenta color, white background, props, lighting, or scene.'
          : 'MODEL REFERENCE LOCK: use the uploaded model reference only for outfit category, clothing color/material/drape, body limbs, skin tone, lower-body proportions, and styling. Do not copy model shoes, background, props, or watermark.'
        : 'No model reference image was uploaded; keep clothing/body limbs simple and driven by the angle schema only.',
      'LOWER-BODY CROP LOCK: show only the lower body needed for the shoe display. Do not generate face, head, portrait, or full upper body.',
      'FAIL CONDITIONS: mask colors or guide marks visible; extra shoes or limbs; hand regions turned into legs; display shoes turned into worn shoes; product shoe design changed; background replaced; flat control-image look instead of realistic photography.',
    ].filter(Boolean).join('\n')
  }
  if (isRealPhotoAngleSource(angleSource)) {
    return [
      'AI PRODUCT BACKGROUND FUSION HARD RULES: output one final realistic composite image, not a triptych, collage, or explanation.',
      describeMergeImageUploadedFiles(files),
      roleMap.has('product') ? 'PRODUCT SHOE LOCK: the uploaded product shoe is the only and 100% authoritative shoe identity source. Preserve shoe shape, color, material, texture, strap/buckle/lace, toe, heel, sole, stitching, lining, shine, and proportions.' : 'Missing product shoe image; do not invent a product shoe.',
      roleMap.has('product') ? productReferenceAssignmentLock : '',
      roleMap.has('background') ? backgroundElementLock : 'Missing background image; do not invent a separate scene.',
      roleMap.has('angle') ? 'REAL PHOTO ANGLE LOCK: image 1 is a real photo angle reference, not a semantic color-block mask. Directly follow image 1 for camera viewpoint, shooting height, lens perspective, crop, body pose, hand/foot relationship, shoe count, shoe placement, shoe direction, scale, overlap, occlusion, and overall composition. Do not look for yellow/blue/red/black mask regions in this real photo. Do not render any mask colors or color-block artifacts.' : 'Missing angle reference; pose control will fail.',
      roleMap.has('model') ? 'MODEL REFERENCE LOCK: use the uploaded model reference only for outfit category, clothing color/material/drape, body limbs, skin tone, lower-body proportions, and styling. Do not copy model shoes, background, props, or watermark.' : 'No model reference image was uploaded; keep clothing/body limbs simple and driven by the real photo angle reference only.',
      'LOWER-BODY CROP LOCK: show only the lower body needed for the shoe display. Do not generate face, head, portrait, or full upper body unless the real angle reference explicitly requires a cropped body part, and even then keep focus on shoes.',
      'FAIL CONDITIONS: treating the real photo as a color mask; visible yellow/blue/red/black control colors; extra shoes or limbs; product shoe design changed; camera/viewpoint not matching the real photo angle reference; background replaced.',
    ].filter(Boolean).join('\n')
  }
  return [
    'AI PRODUCT BACKGROUND FUSION HARD RULES: output one final realistic composite image, not a triptych, collage, or explanation.',
    describeMergeImageUploadedFiles(files),
    roleMap.has('product') ? 'PRODUCT SHOE LOCK: the uploaded product shoe is the only and 100% authoritative shoe identity source. Preserve shoe shape, color, material, texture, strap/buckle/lace, toe, heel, sole, stitching, lining, shine, and proportions. The angle-library image and yellow mask are only placement, angle, scale, perspective, and occlusion references; never use them as shoe exterior appearance, silhouette, color, material, style, shape, sole, heel, toe, strap, lace, buckle, or design references.' : 'Missing product shoe image; do not invent a product shoe.',
    roleMap.has('product') ? productReferenceAssignmentLock : '',
    roleMap.has('background') ? backgroundElementLock : 'Missing background image; do not invent a separate scene.',
    roleMap.has('angleControl') ? 'CLEANED ANGLE CONTROL LOCK: the cleaned angle control reference is the strongest layout control. It contains a coordinate grid: X axis left-to-right from X0 to X100, Y axis top-to-bottom from Y0 to Y100. Follow its exact final shoe count, shoe bounding boxes, shoe placement, toe/heel direction, region boundaries, body-limb placement, clothing area, background area, scale, camera inference, and occlusion before interpreting the original angle reference. The final shoe count may include complete yellow shoe masses plus worn-shoe supplements detected from yellow straps, edges, or sole fragments around blue foot/ankle regions; these supplement shoes must not be omitted. Follow the code-generated blue-region classification in the angle layout notes: blue regions classified as LEG/FOOT/ANKLE are legs/feet; blue regions classified as HAND/HANDWRIST/FINGER are hands/fingers; minor blue details must not become extra limbs. Follow the code-generated worn shoe foot-side map exactly: each worn shoe belongs to its assigned left-foot/right-foot or single-foot side, and each connected blue leg/foot region must keep that assignment. If exactly two product shoes are visible, they must be a natural left-shoe/right-shoe pair across all roles, including worn + display and worn + hand-supported; never render two visible shoes as same-side copies. This left/right side requirement must not change the cleaned control layout: do not flip, rotate, recenter, mirror the composition, change camera angle, or change any toe/heel axis to satisfy it. If multiple worn shoes are visible, they must be a natural left-foot/right-foot pair with separate foot-side identities and their own toe/heel axes; never duplicate the same-side shoe direction onto both feet, never swap left/right, and never make two worn shoes face as identical copies unless the angle layout explicitly says so. The camera direction must come from the code-generated camera inference in the angle layout notes; do not replace it with a generic eye-level, front, or side product camera. Only yellow shoe regions connected to blue LEG/FOOT/ANKLE regions are worn shoes; yellow shoe regions connected to blue HAND/HANDWRIST/FINGER regions are handheld or hand-supported display shoes, not worn shoes. Yellow shoe regions not touching blue are standalone display shoes and must not have a foot, ankle, leg, or body limb inside or attached. The cleaned control is not final visual style and its colors, labels, grid, and boxes must never appear in the final image.' : '',
    roleMap.has('angle') ? 'ANGLE MASK LOCK: the original angle reference / angle-library image controls composition, camera angle, shoe placement, shoe angle, shoe scale, body-limb pose, clothing area, occlusion, and perspective. Yellow=shoe angle and placement reference only: it controls shoe position, size, orientation, toe direction, heel position, perspective, scale, and occlusion, but it is not the shoe appearance/design/silhouette source. The final shoe exterior must match the uploaded product shoe image 100%. Do not borrow any shoe outline, sole shape, heel shape, toe shape, strap/lace/buckle design, color, material, or proportions from the angle-library image. Yellow regions connected to blue leg/ankle/foot regions are worn shoes; yellow regions connected to blue hand/arm/wrist/finger regions are hand-held or hand-supported display shoes, not worn shoes; yellow regions not connected to blue limbs are ground or foreground display shoes only, so do not generate extra legs or feet for them. Blue=body limbs that must be identified by silhouette as legs/ankles/feet or arms/hands/wrists, red=secondary model outfit/clothing support area, black=background. The angle-library colors are invisible metadata only: never render saturated yellow, blue, red, black mask fill, gray/white guide marks, flat color-block silhouettes, tinted remnants, stains, overlays, reflections, shadows, or edge tints from the angle reference. Natural product/background colors are allowed only when they come from the uploaded product or background image, never from the angle-library colors.' : 'Missing angle mask; pose control will fail.',
    isFixedAngle03Or04 ? 'FIXED ANGLE 3 / 4 LOCK WITHOUT CLEANED CONTROL: even if no cleaned angle-control image is present, this angle-03 / angle-04 generation must use the original angle yellow/S region as the exact shoe placement, size, angle, toe/heel direction, perspective, scale, occlusion, and visual-center authority. The uploaded product photo camera, product photo crop, product photo perspective, and product photo pair layout must not change the final shoe angle or composition; product photos provide shoe appearance only.' : '',
    roleMap.has('model')
      ? isFixedAngle03Or04
        ? 'FIXED LEG REFERENCE LOCK: use the uploaded fixed leg/magenta auxiliary reference only for leg anatomy, calf shape, unified skin tone, lower-leg size, ankle contact, and rough auxiliary shoe-zone confirmation. It is not a model outfit reference. The original angle yellow/S region remains the exact shoe placement authority. Do not copy fixed-reference shoe appearance, magenta color, white background, props, lighting, or scene.'
        : 'MODEL REFERENCE LOCK: use the uploaded model reference for actual outfit category, clothing color, clothing material/drape, body limbs, skin tone, lower-body proportions, and elegant fashion feeling, but keep clothing secondary to the product shoes. Do not copy or generate the model reference shoes, model reference background, wall, floor, light/shadow pattern, props, basket, flowers, watermark, or scene. Place model outfit into red regions and matching natural body limbs into blue regions without making clothing the main subject.'
      : 'No model reference image was uploaded; keep clothing/body limbs simple and driven by the angle mask only.',
    'LOWER-BODY CROP LOCK: final image must show only the lower body needed for the shoe display. Do not generate the model face, head, portrait, or full upper body. Keep framing on product shoes, feet, legs, hands if present in the angle mask, and only the clothing portion required around the lower body.',
    'FAIL CONDITIONS: any visible semantic mask color or control-color artifact from the angle reference; saturated yellow/blue/red blocks; black mask fill; gray/white guide marks; flat colored silhouettes; tinted mask remnants; mask-color stains, overlays, reflections, shadows, or edge tints; model face, head, portrait, or full upper body; outfit becoming the main visual subject instead of the product shoes; outfit not from model reference when model is uploaded; model reference background copied; background not from uploaded background image; body-limb pose not matching blue mask; shoe placement, angle, scale, or perspective not matching yellow placement reference; blue hand/arm regions mistaken as legs; blue leg/ankle regions mistaken as hands; clothing not placed in red mask; copied model shoes; extra shoes/limbs; deformed hands or feet; product shoe design changed; background replaced.',
  ].filter(Boolean).join('\n')
}
function buildMergeImageReferenceOrderInstruction(files = [], angleSource = '') {
  const ordered = files
    .map((file, index) => ({ file, index, role: mergeImageRole(file, index) }))
    .filter(({ role }) => ['product', 'background', 'angleControl', 'angle', 'model'].includes(role))
  const roleNames = {
    product: 'product shoe reference',
    background: 'background reference',
    angleControl: 'cleaned angle control reference',
    angle: 'angle / semantic mask reference',
    model: 'model outfit and body-limb reference',
  }
  const lines = ordered.map(({ file, index, role }) => {
    const source = role === 'angle' && angleSource ? `, source: ${angleSource}` : ''
    return `Original upload ${index + 1}: ${roleNames[role]}${source}, filename ${file.originalName || file.fileName || `image-${index + 1}`}`
  })
  const hasModel = ordered.some(({ role }) => role === 'model')
  const hasAngleControl = ordered.some(({ role }) => role === 'angleControl')
  const hasRealPhotoAngle = isRealPhotoAngleSource(angleSource)
  const productReferenceCount = ordered.filter(({ role }) => role === 'product').length
  const productReferenceText = productReferenceCount > 1 ? 'product shoe references' : 'product shoe reference'
  const productReferenceUseText = productReferenceCount > 1 ? 'all product shoe references' : 'the product shoe reference'
  return [
    'Original upload roles, for identification only:',
    ...lines,
    hasAngleControl
      ? hasModel
        ? `Important: the image model receives reordered references in this exact order: image 1 is the cleaned angle control mask, image 2 is the original uploaded angle reference, image 3 is the background environment, image 4 is model outfit and body-limb reference, image 5 and later are ${productReferenceText}.`
        : `Important: the image model receives reordered references in this exact order: image 1 is the cleaned angle control mask, image 2 is the original uploaded angle reference, image 3 is the background environment, image 4 and later are ${productReferenceText}.`
      : hasModel
        ? `Important: the image model receives reordered references in this exact order: image 1 is the ${hasRealPhotoAngle ? 'real photo angle reference' : 'angle mask'}, image 2 is the background environment, image 3 is model outfit and body-limb reference, image 4 and later are ${productReferenceText}.`
        : `Important: the image model receives reordered references in this exact order: image 1 is the ${hasRealPhotoAngle ? 'real photo angle reference' : 'angle mask'}, image 2 is the background environment, image 3 and later are ${productReferenceText}.`,
    hasAngleControl
      ? hasModel
        ? `Use image 1 cleaned angle control first and most strongly to determine exact pose/layout, final main shoe count, yellow shoe-region placement/angle/scale, worn-shoe supplements around blue feet, and each blue region classification as LEG/FOOT/ANKLE, HAND/HANDWRIST/FINGER, or minor detail. Use image 2 original angle reference only to verify fine pose and occlusion. Use image 3 background reference for the exact uploaded environment, visible existing elements, light, perspective, and shadows only; do not add any background structure, edge line, room feature, prop, texture, or pattern that is not already visible. Use image 4 model reference only for outfit, skin tone, and body-limb styling; ignore background, props, watermark, and shoes. Use ${productReferenceUseText} from image 5 and later for shoe identity.`
        : `Use image 1 cleaned angle control first and most strongly to determine exact pose/layout, final main shoe count, yellow shoe-region placement/angle/scale, worn-shoe supplements around blue feet, and each blue region classification as LEG/FOOT/ANKLE, HAND/HANDWRIST/FINGER, or minor detail. Use image 2 original angle reference only to verify fine pose and occlusion. Use image 3 background reference for the exact uploaded environment, visible existing elements, light, perspective, and shadows only; do not add any background structure, edge line, room feature, prop, texture, or pattern that is not already visible. Use ${productReferenceUseText} from image 4 and later for shoe identity.`
      : hasModel
        ? hasRealPhotoAngle
          ? `Use image 1 real photo angle reference first and most strongly to determine pose/layout, real camera viewpoint, crop, shoe count, shoe placement, body/hand/foot relationship, scale, perspective, and occlusion. Use image 2 background reference for the exact uploaded environment, visible existing elements, light, perspective, and shadows only; do not add any background structure, edge line, room feature, prop, texture, or pattern that is not already visible. Use image 3 model reference only for outfit, skin tone, and body-limb styling; ignore background, props, watermark, and shoes. Use ${productReferenceUseText} from image 4 and later for shoe identity.`
          : `Use image 1 angle mask first and most strongly to determine pose/layout, yellow shoe-region count/placement/angle/scale, and each blue region silhouette as leg/ankle/foot or arm/hand/wrist. Use image 2 background reference for the exact uploaded environment, visible existing elements, light, perspective, and shadows only; do not add any background structure, edge line, room feature, prop, texture, or pattern that is not already visible. Use image 3 model reference only for outfit, skin tone, and body-limb styling; ignore background, props, watermark, and shoes. Use ${productReferenceUseText} from image 4 and later for shoe identity.`
        : hasRealPhotoAngle
          ? `Use image 1 real photo angle reference first and most strongly to determine pose/layout, real camera viewpoint, crop, shoe count, shoe placement, body/hand/foot relationship, scale, perspective, and occlusion. Use image 2 background reference for the exact uploaded environment, visible existing elements, light, perspective, and shadows only; do not add any background structure, edge line, room feature, prop, texture, or pattern that is not already visible. Use ${productReferenceUseText} from image 3 and later for shoe identity.`
          : `Use image 1 angle mask first and most strongly to determine pose/layout, yellow shoe-region count/placement/angle/scale, and each blue region silhouette as leg/ankle/foot or arm/hand/wrist. Use image 2 background reference for the exact uploaded environment, visible existing elements, light, perspective, and shadows only; do not add any background structure, edge line, room feature, prop, texture, or pattern that is not already visible. Use ${productReferenceUseText} from image 3 and later for shoe identity.`,
  ].filter(Boolean).join('\n')
}
function buildMergeImageRolePriorityInstruction() {
  return [
    'You are an ecommerce product scene compositing assistant. Strictly classify and obey uploaded references by role before generating.',
    'Angle reference or selected angle-library image itself is the primary pose and composition control. Directly observe this image for body pose, foot/shoe spatial relationship, camera angle, perspective, scale, and occlusion. Any pose text, coordinate notes, or region analysis is auxiliary explanation only; if the text conflicts with the angle image, follow the angle image.',
    'Angle reference or selected angle-library image: semantic region mask and pose/composition reference, not a style reference. Yellow=shoe angle and placement reference only, blue=body limbs identified from silhouette as legs/ankles/feet or arms/hands/wrists, red=secondary model outfit/clothing support area, black=background. Yellow controls where shoes appear and how they are placed: position, size, orientation, toe direction, heel position, perspective, scale, and occlusion. Yellow and the angle-library image do not control shoe exterior appearance, silhouette, color, material, style, shape, sole, heel, toe, strap, lace, buckle, or design. None of the yellow/blue/red/black color blocks, flat silhouettes, or tinted mask colors may appear in the final image.',
    'Model reference image: source only for actual outfit category, outfit color, fabric/drape, body-limb styling, skin tone, lower-body proportions, and elegant feeling. Put the model outfit into red regions and matching natural body limbs into blue regions, but keep outfit and clothing secondary to the product shoes. Model skin should look fair, bright, translucent, and natural, with refined clean texture and delicate visible skin detail. Do not copy model reference shoes, background, wall, floor, props, basket, flowers, watermark, lighting pattern, or scene.',
    'Product shoe image: only and 100% authoritative source for final shoe identity and details. Preserve shoe shape, color, material, texture, straps, buckle, heel, sole, toe shape, stitching, lining, and overall proportions. If multiple product shoe references show different shoes or different colorways, assign them to visible shoe positions one-by-one in upload order instead of merging them into one hybrid shoe, while preserving each selected-angle shoe role exactly. If only one product reference is uploaded, every visible shoe uses that same shoe identity. Yellow regions connected to blue leg/ankle/foot regions are worn shoes; yellow regions connected to blue hand/arm/wrist/finger regions are hand-held or hand-supported display shoes, not worn shoes; yellow regions not connected to blue limbs are ground or foreground display shoes only, with no extra legs or feet.',
    'Background image: only source for the final environment. Put the uploaded background exactly as it is into all black/background regions, preserving only the elements already visible in the uploaded background image, their relative positions, scale, crop, perspective, occlusion, light direction, atmosphere, and shadows. Do not create any new background structure, edge line, room feature, prop, texture, or pattern that is not already visible in the uploaded background. The model-reference background must never appear.',
    'Priority order for this workflow: uploaded product shoes as the main visual subject > angle mask pose/composition and yellow shoe placement/angle reference > body limbs that support the shoe display > model outfit as secondary styling only > background realism. If references conflict, angle mask wins for pose, shoe placement, shoe angle, scale, perspective, and occlusion; product shoe image always wins for shoe appearance, color, material, style, shape, and details; model wins for outfit type and body-limb styling only when it does not reduce product shoe prominence.',
    'Final image goal: one realistic ecommerce product-shoe hero photo with lower-body-only framing. The uploaded product shoes must be the clearest main subject and visual focus. The woman/model, body limbs, and clothing exist to support the shoe display, not to become a fashion outfit image. Background comes only from the background reference.',
    'Lower-body crop rule: do not generate the model face, head, portrait, or full upper body. Show only shoes, feet, legs, hands if present in the angle mask, skirt hem, pants hem, or partial waist when required by the angle mask.',
    'Forbidden: any visible semantic mask colors or color-block shapes from the angle reference, including yellow blocks, blue blocks, red blocks, black blocks, flat colored silhouettes, tinted mask remnants, model face, head, portrait, full upper body, copied model shoes, copied model-reference background/wall/floor/props/watermark/light pattern, outfit-dominant composition, extra shoes, extra limbs, deformed hands or feet, wrong toes or fingers, text, watermark, logo, collage look, black mask background.',
  ].join('\n')
}

function buildMergeImageRealPhotoAnglePriorityInstruction() {
  return [
    'You are an ecommerce product scene compositing assistant. Strictly classify and obey uploaded references by role before generating.',
    'Real photo angle reference: image 1 itself is the primary pose, camera, and composition control. Directly observe this real photo for camera viewpoint, shooting height, lens perspective, crop, shoe count, shoe placement, shoe direction, foot/leg/hand/body relationship, scale, overlap, occlusion, and overall spatial composition.',
    'Do not treat image 1 as a yellow/blue/red/black semantic mask. Do not look for mask colors, do not preserve color-block regions, and do not generate flat color silhouettes.',
    'Product shoe image: only and 100% authoritative source for final shoe identity and details. Preserve shoe shape, color, material, texture, straps, buckle, heel, sole, toe shape, stitching, lining, and overall proportions. If multiple product shoe references show different shoes or different colorways, assign them to visible shoe positions one-by-one in upload order instead of merging them into one hybrid shoe, while preserving each real-photo shoe role exactly. If only one product reference is uploaded, every visible shoe uses that same shoe identity. Replace real-photo shoe identities while preserving the real-photo placement, angle, size, perspective, worn/display/hand-supported role, hand/foot relationship, and occlusion. Never convert a hand-held or hand-supported display shoe into a second worn shoe.',
    'Model reference image: source only for actual outfit category, outfit color, fabric/drape, body-limb styling, skin tone, lower-body proportions, and elegant feeling. Model skin should look fair, bright, translucent, and natural, with refined clean texture and delicate visible skin detail. Do not copy model reference shoes, background, wall, floor, props, basket, flowers, watermark, lighting pattern, or scene.',
    'Background image: only source for the final environment. Preserve the uploaded background exactly as it is, including only the elements already visible in that image, their relative positions, scale, crop, perspective, occlusion, light direction, atmosphere, and shadows. Do not create any new background structure, edge line, room feature, prop, texture, or pattern that is not already visible in the uploaded background. The model-reference background must never appear.',
    'Priority order for this workflow: uploaded product shoes as the main visual subject > real photo angle reference camera/pose/composition > body limbs that support the shoe display > model outfit as secondary styling only > background realism.',
    'Final image goal: one realistic ecommerce product-shoe hero photo with lower-body-only framing. The uploaded product shoes must be the clearest main subject and visual focus.',
    'Forbidden: treating the real angle photo as a mask; visible semantic mask colors or color-block shapes; model face, head, portrait, or full upper body; copied model shoes; copied model-reference background; outfit-dominant composition; extra shoes; extra limbs; deformed hands or feet; wrong toes or fingers; text; watermark; logo; collage look.',
  ].join('\n')
}

function buildMergeImageChineseRecordPrompt({ files = [], angleSource = '', requestedSize = '', apiSize = '', hasModelReference = false } = {}) {
  const roleMap = roleFileMap(files)
  const fileNameForRole = (role) => {
    const file = (roleMap.get(role) || [])[0]
    return file ? (file.originalName || file.fileName || '已上传参考图') : '未上传'
  }
  return [
    'AI产品背景融合 - 实际生图提示词记录（中文整理版）',
    '',
    '参考图读取顺序：',
    `1. 角度参考图/角度库图：${angleSource || fileNameForRole('angle')}`,
    `2. 背景图：${fileNameForRole('background')}`,
    hasModelReference ? `3. 模特参考图：${fileNameForRole('model')}` : '3. 模特参考图：未上传',
    hasModelReference ? `4. 产品鞋图：${fileNameForRole('product')}` : `3. 产品鞋图：${fileNameForRole('product')}`,
    '',
    '核心生成逻辑：',
    '生成一张真实自然的电商女鞋上脚/展示场景图，画面主角必须是上传的产品鞋，不是服装大片。',
    '产品鞋图是鞋子外观的唯一来源：鞋型、颜色、材质、纹理、扣环、鞋跟、鞋底、鞋头、缝线、内里和整体比例都必须参考产品鞋图。',
    '角度参考图/角度库图是语义分区和构图参考，不是风格图，也不是颜色图。黄色区域只作为鞋子的角度、位置、大小、鞋头方向、鞋跟位置、透视和摆放参考，不能作为鞋子的颜色、材质、款式或外观来源。',
    '蓝色区域根据轮廓识别为腿、脚踝、脚、手臂、手或手腕，并生成真实自然的人体部位；姿势、关节方向、遮挡和身体角度以角度参考图为准。',
    '红色区域只是模特穿搭的辅助区域：服装参考上传的模特图，但服装不能成为画面主体，不能抢产品鞋的视觉焦点。',
    '黑色区域只使用上传背景图本身生成真实背景：完全保留上传背景里已经可见的环境元素、位置、裁切、透视、光线方向、色温和阴影氛围；不要额外增加任何上传背景图里没有的背景结构、边缘线、空间特征、道具或纹理。',
    '',
    '优先级：',
    '产品鞋作为主视觉 > 角度参考图的姿势/构图/鞋子摆放 > 支撑鞋子展示的人体肢体 > 模特服装辅助风格 > 背景真实感。',
    '如果参考图互相冲突：角度参考图决定姿势、构图、鞋子摆放、透视和遮挡；产品鞋图决定鞋子外观；模特图只决定服装和人体风格；背景图只决定环境。',
    '',
    '禁止内容：',
    '最终图中不要出现角度库参考图里的黄色、蓝色、红色、黑色色块，不要出现平面色块轮廓、染色残留或语义遮罩痕迹。',
    '不要复制模特图里的鞋子、背景、墙面、地面、道具、水印或光影；不要生成多余肢体、畸形脚、错误脚趾、文字、水印、logo 或拼贴感。',
    '',
    `输出尺寸：${requestedSize || '未指定'}${apiSize && apiSize !== requestedSize ? `（API尺寸：${apiSize}）` : ''}`,
  ].join('\n')
}

function buildMergeImageChineseBrief({ files = [], angleSource = '', requestedSize = '', hasModelReference = false } = {}) {
  const roleMap = roleFileMap(files)
  const hasRole = (role) => (roleMap.get(role) || []).length > 0
  return [
    'AI产品背景融合',
    `产品鞋图：${hasRole('product') ? '已上传，锁定鞋款、颜色、材质和细节' : '未上传'}`,
    `背景图：${hasRole('background') ? '已上传，锁定墙面、地面、空间和光影' : '未上传'}`,
    `角度参考图：${angleSource || (hasRole('angle') ? '已上传/已选择，用于鞋子摆放、姿势和构图' : '未上传')}`,
    `模特参考图：${hasModelReference ? '已上传，只参考服装、肢体和比例' : '未上传'}`,
    `输出尺寸：${requestedSize || '未指定'}`,
    '生成目标：以产品鞋为主视觉，生成真实自然的电商女鞋上脚/展示场景图；角度库色块只做语义参考，最终图不能出现色块。',
  ].join('\n')
}

function extractConciseAngleLayout(angleLayout = '') {
  const lines = String(angleLayout || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const keepPattern = /HAND ANGLE CONTROL|SINGLE-FOOT ANGLE CHANNEL|singleFootCodeCount|SINGLE-FOOT SINGLE-VISIBLE-FOOT LOCK|SINGLE-FOOT CAMERA DESCRIPTION BY CODE|SINGLE-FOOT CAMERA SIDE LOCK BY CODE|SINGLE-FOOT TOE DIRECTION SAME LOCK BY CODE|SINGLE-FOOT SIDE PAIR ANALYSIS BY CODE|SINGLE-FOOT INDEPENDENT SHOE MAP BY CODE|SINGLE-FOOT PAIR GUIDE VISUAL RULE|S1 WORN x1|S2 DISPLAY x1|S2 toeDirection|toeDirection|single-foot override|footX1|SHOE\/YELLOW MAP|BLUE LEG\/FOOT MAP|BLUE HAND-OR-LEG|GREEN HAND MAP|RED CLOTHING MAP|greenHandCount|mainShoeObjectCount|blueHandOrLegCandidateCount|blueHandCount|blueFootLegCount|instanceRoleSplit|instanceSubregions|mixed-role|VISIBLE TWO-SHOE LEFT\/RIGHT PAIR LOCK|VISIBLE MULTI-SHOE PAIRING LOCK|CONTROL IMAGE EXPLANATION|Dynamic explanation|Visual warning|For this image|S object explanation|B object explanation|G object explanation|R object explanation|Generation instruction from this explanation|STRUCTURED ANGLE SCHEMA|poseType|mainShoeCount|wornShoeCount|handheldOrHandSupported|standaloneDisplay|blueLegFoot|blueHand|greenHand|redClothing|cameraView|cropFocus|wornShoes|handheldOrHandSupportedShoes|standaloneDisplayShoes|DEPTH LAYER MAP|CLOTHING REGION MAP|SKELETON MAP|HAND FOOT CANDIDATES|SHOE LIMB BINDINGS|BODY DIRECTION LOCK|CAMERA LOCK|CODE CONTROL SCOPE|Clothing rule|Product-shoe crop rule|Final image must not show|control colors|mask colors|flat color-block|gray|grey|^S\d+:|^B\d+:|^G\d+:|^R\d+:|^Layer|^Skeleton|^Candidate|^Binding/i
  const kept = []
  let inSchema = false
  for (const line of lines) {
    if (/STRUCTURED ANGLE SCHEMA/i.test(line)) inSchema = true
    if (inSchema || keepPattern.test(line)) kept.push(line)
    if (inSchema && /This schema overrides/i.test(line)) inSchema = false
  }
  return kept.join('\n').slice(0, 7000)
}

function buildStrictPositionLock(angleLayout = '') {
  const lines = String(angleLayout || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const objectLines = []
  const bboxPattern = /^(S\d+|B\d+|G\d+|R\d+)[^:]*:\s*([^,]*?)(?:,|\s) .*?bbox left\s+(-?\d+(?:\.\d+)?)%,\s*top\s+(-?\d+(?:\.\d+)?)%,\s*width\s+(-?\d+(?:\.\d+)?)%,\s*height\s+(-?\d+(?:\.\d+)?)%,\s*center\s*\(\s*(-?\d+(?:\.\d+)?)%\s*,\s*(-?\d+(?:\.\d+)?)%\s*\)/i
  for (const line of lines) {
    const match = line.match(bboxPattern)
    if (!match) continue
    const [, id, roleRaw, leftRaw, topRaw, widthRaw, heightRaw, centerXRaw, centerYRaw] = match
    const left = Number(leftRaw)
    const top = Number(topRaw)
    const boxWidth = Number(widthRaw)
    const boxHeight = Number(heightRaw)
    const centerX = Number(centerXRaw)
    const centerY = Number(centerYRaw)
    if (![left, top, boxWidth, boxHeight, centerX, centerY].every(Number.isFinite)) continue
    const right = Math.round(left + boxWidth)
    const bottom = Math.round(top + boxHeight)
    const role = String(roleRaw || '').replace(/\s+/g, ' ').trim() || 'object'
    objectLines.push(`[POSITION] ${id} ${role}: must occupy X${Math.round(left)}-X${right} and Y${Math.round(top)}-Y${bottom}; center must remain near X${Math.round(centerX)},Y${Math.round(centerY)}.`)
  }
  if (!objectLines.length) return ''
  return [
    '[STRICT POSITION LOCK - HIGHEST PRIORITY]',
    '[MUST] Treat the code-generated control image as a fixed X0-X100 / Y0-Y100 coordinate canvas. Preserve every S/B/G/R object bbox, center, relative scale, overlap, and depth position before applying aesthetics.',
    '[MUST] A generated object that moves more than about 6 percentage points from its required X/Y bbox or center is a failed layout. Do not recenter, rebalance, beautify, enlarge, shrink, straighten, flip, or move objects for a nicer commercial composition.',
    '[MUST] Do not paraphrase these coordinates into vague phrases such as left-middle, lower-left, upper-right, balanced pose, similar angle, or farther back. Those vague phrases are not enough. Follow the numeric X/Y locks below.',
    ...objectLines,
  ].join('\n').slice(0, 2600)
}

function buildHardAngleLayoutSummary(angleLayout = '') {
  const lines = String(angleLayout || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.some((line) => /STRUCTURED ANGLE SCHEMA|HAND ANGLE CONTROL/i.test(line))) return ''
  const isHandAngleControl = lines.some((line) => /HAND ANGLE CONTROL/i.test(line))
  const isSingleFootControl = lines.some((line) => /SINGLE-FOOT ANGLE CHANNEL|singleFootCodeCount\s*=\s*footX1|single-foot override/i.test(line))

  const valueFor = (key) => {
    const pattern = new RegExp(`^${key}\\s*=\\s*(.+)$`, 'i')
    const line = lines.find((item) => pattern.test(item))
    return line ? line.replace(pattern, '$1').trim() : ''
  }
  const pickLines = (pattern, limit = 12) => lines.filter((line) => pattern.test(line)).slice(0, limit)
  const mainShoeCount = valueFor('mainShoeCount')
  const handAngleShoeObjectCount = valueFor('mainShoeObjectCount')
  const greenHandCount = valueFor('greenHandCount')
  const handAngleHandCount = valueFor('blueHandCount')
  const handAngleFootLegCount = valueFor('blueFootLegCount')
  const shoeObjectCount = valueFor('shoeObjectCount')
  const wornShoeCount = valueFor('wornShoeCount')
  const handShoeCount = valueFor('handheldOrHandSupportedShoeCount')
  const displayShoeCount = valueFor('standaloneDisplayShoeCount')
  const legFootCount = valueFor('blueLegFootRegionCount')
  const handRegionCount = valueFor('blueHandRegionCount')
  const clothingCount = valueFor('redClothingRegionCount')
  const cameraView = valueFor('cameraView')
  const cropFocus = valueFor('cropFocus')
  const wornShoes = valueFor('wornShoes')
  const handShoes = valueFor('handheldOrHandSupportedShoes')
  const displayShoes = valueFor('standaloneDisplayShoes')
  const normalizeSingleFootRoleList = (value) => isSingleFootControl ? String(value || '').replace(/\sx\d+/gi, ' x1') : value
  const normalizedWornShoes = normalizeSingleFootRoleList(wornShoes)
  const normalizedDisplayShoes = normalizeSingleFootRoleList(displayShoes)
  const shoeLines = pickLines(/^(SINGLE-FOOT INDEPENDENT SHOE MAP BY CODE|SINGLE-FOOT PAIR GUIDE VISUAL RULE|S1 WORN x1|S2 DISPLAY x1|S2 toeDirection|S object explanation|S\d+:|Binding S\d+:|SHOE\/YELLOW MAP)/i, 18)
  const bodyLines = pickLines(/^(B object explanation|B\d+:|G object explanation|G\d+:|Skeleton B\d+:|Candidate B\d+|BLUE HAND-OR-LEG|GREEN HAND MAP)/i, 14)
  const clothingLines = pickLines(/^(R object explanation|R\d+:|redClothingRegionCount|Clothing rule|RED CLOTHING MAP)/i, 8)
  const directionLines = pickLines(/^(BODY DIRECTION LOCK|CAMERA LOCK|SINGLE-FOOT SINGLE-VISIBLE-FOOT LOCK|SINGLE-FOOT CAMERA DESCRIPTION BY CODE|SINGLE-FOOT CAMERA SIDE LOCK BY CODE|SINGLE-FOOT TOE DIRECTION SAME LOCK BY CODE|SINGLE-FOOT SIDE PAIR ANALYSIS BY CODE|SINGLE-FOOT INDEPENDENT SHOE MAP BY CODE|SINGLE-FOOT PAIR GUIDE VISUAL RULE|S1 WORN x1|S2 DISPLAY x1|S2 toeDirection|VISIBLE TWO-SHOE LEFT\/RIGHT PAIR LOCK|VISIBLE MULTI-SHOE PAIRING LOCK|Product-shoe crop rule|Binding rule|Clothing rule)/i, 18)
  const noClothingLock = isHandAngleControl && clothingCount === '0'
  const strictPositionLock = (isHandAngleControl || isSingleFootControl) ? buildStrictPositionLock(angleLayout) : ''
  const singleFootTopDownGroundLock = isSingleFootControl
    && /first-person downward|true top-down|top-down try-on|camera is above|looking down at the foot/i.test(cameraView)
    && !/eye-level|side-view|do not convert it to .*top-down|do not add top-down/i.test(cameraView)
    ? '[MUST] SINGLE-FOOT TOP-DOWN GROUND LOCK: this single-foot reference is a first-person downward photo. The camera must look down from above the wearer at the foot and shoes on the floor/ground plane. The one visible foot wearing the shoe must be planted flat on the floor with contact shadow; the display shoe must also lie on the same floor plane. The worn shoe and display shoe must point their toes/fronts toward the same canvas direction. Do not generate an eye-level, side-view, front-view, standing catalog pose, floating foot, raised leg, or side-profile shoe view.'
    : ''

  return [
    strictPositionLock,
    '[TOP PRIORITY CODE LAYOUT SUMMARY - FOLLOW BEFORE ANY STYLE TEXT]',
    '[MUST] This summary is the hard layout contract extracted from the uploaded angle-control code. Match the counts, roles, coordinates, camera, and crop below before considering general photo style.',
    handAngleShoeObjectCount && !mainShoeCount ? `[MUST] handAngleShoeObjectCount=${handAngleShoeObjectCount}; greenHandCount=${greenHandCount || '0'}; blueHandCount=0; blueFootLegCount=${handAngleFootLegCount || '0'}. This is a dedicated hand-angle control layout: yellow/S are shoes, green/G are explicit hands, blue/B are legs/feet/ankles only, red/R is clothing. Never treat blue/B as hands in this channel; all hand regions must be green/G only.` : '',
    mainShoeCount
      ? isHandAngleControl
        ? `[MUST] mainShoeCount=${mainShoeCount}; shoeObjectCount=${shoeObjectCount || mainShoeCount}; wornShoeCount=${wornShoeCount || '0'}; handSupportedShoeCount=${handShoeCount || '0'}; standaloneDisplayShoeCount=${displayShoeCount || '0'}. If an S object says x2 or representedShoeCount=2, it represents two actual product shoes inside that one layout object. If mainShoeCount=2, the two visible product shoes must be a matching left-shoe/right-shoe pair, never two same-side shoe copies, regardless of worn/display/hand-supported roles. This shoe-side pairing must not change the coordinate layout, camera, rotation, or toe/heel axis from the control image.`
        : isSingleFootControl
          ? `[MUST] SINGLE-FOOT OVERRIDE ACTIVE: this is the dedicated single-foot channel. Generate exactly one visible worn foot/leg (footX1) with exactly one worn product shoe, plus only the detected bare display shoe(s). Raw x2 suffixes from the normal angle parser are not allowed to create two worn feet or four shoes. Use the cleaned single-foot roles instead: wornShoeCount=1; standalone display shoes stay bare. mainShoeCount=${mainShoeCount}; shoeObjectCount=${shoeObjectCount || mainShoeCount}; handSupportedShoeCount=${handShoeCount || '0'}.`
        : `[MUST] mainShoeCount=${mainShoeCount}; shoeObjectCount=${shoeObjectCount || mainShoeCount}; wornShoeCount=${wornShoeCount || '0'}; handSupportedShoeCount=${handShoeCount || '0'}; standaloneDisplayShoeCount=${displayShoeCount || '0'}. If an S object says x2 or representedShoeCount=2, it represents two actual product shoes inside that one layout object.`
      : '',
    legFootCount || handRegionCount || clothingCount ? `[MUST] blueLegFootRegionCount=${legFootCount || '0'}; blueHandRegionCount=${handRegionCount || '0'}; redClothingRegionCount=${clothingCount || '0'}.` : '',
    noClothingLock ? '[MUST] redClothingRegionCount=0 means there is no clothing region in this angle control. Do not generate clothing, garment, skirt hem, pants hem, sleeve, fabric panel, torso, outfit area, or any red/R-region substitute.' : '',
    isSingleFootControl ? '[MUST] In this single-foot channel, only footX1 may contain foot, ankle, leg, skin, or toes. Every display shoe must stay bare with no foot/leg inside.' : '',
    normalizedWornShoes ? (isSingleFootControl
      ? `[MUST] wornShoes=${normalizedWornShoes}. Only this one worn shoe may contain footX1, ankle, or leg in the single-foot channel.`
      : `[MUST] wornShoes=${normalizedWornShoes}. Only these shoes may contain a foot, ankle, or leg.`) : '',
    handShoes ? `[MUST] handheldOrHandSupportedShoes=${handShoes}. These shoes may touch hands only; do not turn them into worn shoes.` : '',
    normalizedDisplayShoes ? `[MUST] standaloneDisplayShoes=${normalizedDisplayShoes}. These are bare product display shoes only; do not add feet, ankles, legs, or body limbs inside or attached to them.` : '',
    cameraView ? `[MUST] cameraView=${cameraView}. Do not replace it with a generic eye-level, front, or side catalog camera.` : '',
    singleFootTopDownGroundLock,
    cropFocus ? `[MUST] cropFocus=${cropFocus}.` : '',
    isHandAngleControl
      ? '[MUST NOT] Do not invent extra shoes, remove detected shoes, swap worn/display roles, convert display shoes into worn shoes, convert hands into legs, duplicate one shoe direction onto both feet, or render two visible shoes as the same left/right side.'
      : '[MUST NOT] Do not invent extra shoes, remove detected shoes, swap worn/display roles, convert display shoes into worn shoes, convert hands into legs, or duplicate one shoe direction onto both feet.',
    isSingleFootControl && directionLines.length ? 'DIRECTION / BINDING LOCKS:\n' + directionLines.join('\n') : '',
    shoeLines.length ? 'SHOE ROLE MAP:\n' + shoeLines.join('\n') : '',
    bodyLines.length ? 'BODY / LEG / HAND MAP:\n' + bodyLines.join('\n') : '',
    clothingLines.length ? 'CLOTHING R REGION MAP:\n' + clothingLines.join('\n') : '',
    !isSingleFootControl && directionLines.length ? 'DIRECTION / BINDING LOCKS:\n' + directionLines.join('\n') : '',
  ].filter(Boolean).join('\n').slice(0, 5200)
}

function isFixedSingleFootLibraryAngle({ angleSource = '', angleLayout = '', prompt = '' } = {}) {
  const text = [angleSource, angleLayout, prompt].filter(Boolean).join('\n')
  return /angle-0[34]|角度\s*[34]|单脚侧面试穿|FIXED REFERENCE GEOMETRY BY CODE|Fixed shoe region|Fixed leg region|LEG SKIN CONSISTENCY LOCK/i.test(text)
}

function buildFixedSingleFootLibraryFinalLock(angleSource = '') {
  const angleLabel = /angle-04|角度\s*4/i.test(String(angleSource || '')) ? 'ANGLE-04' : 'ANGLE-03'
  return [
    `[${angleLabel} HIGHEST PRIORITY FIXED LEG AND SHOE GEOMETRY LOCK]`,
    '[MUST] A fixed leg and magenta auxiliary reference may be provided as the model/body reference. Use the leg area only for model leg anatomy, calf shape, leg skin tone, leg width, ankle size, leg curvature, and natural leg structure. Use the magenta region only as a secondary rough shoe-area hint to support ankle-to-shoe contact. The magenta region is not the primary placement authority. Do not use this reference for shoe identity, shoe material, shoe color, final background, props, wall, floor, lighting, or scene.',
    '[MUST] BACKGROUND ABSOLUTE LOCK: the uploaded background image is the only environment source and must be followed completely as-is. Preserve only the environment elements already visible in the uploaded background, their perspective, crop, color temperature, lighting direction, and shadow mood. Do not create any new background structure, edge line, room feature, prop, texture, or pattern that is not already visible in the uploaded background. The final image should look like the fixed leg and uploaded product shoe were light-matched into the uploaded background, not like a new environment was created.',
    '[MUST NOT] The fixed leg/magenta model reference, angle reference, cleaned control image, product reference, and previous successful examples must never control the final background, wall/floor style, props, horizon, light pattern, color temperature, shadows, scene layout, white background, room layout, or any non-current-background scene element.',
    '[MUST] This is a fixed single-foot side-view try-on template. The uploaded product shoe may change only the shoe appearance, design, material, color, sole, laces/straps/buckles, logo, and texture. It must never change the final leg direction, leg size, angle-yellow/S shoe direction, angle-yellow/S shoe size, angle-yellow/S shoe center, camera angle, crop, or proportion.',
    '[MUST] The uploaded product shoe reference is the only source for the final shoe exterior. Never render the magenta region color. Never copy any shoe color, material, heel shape, buckle, strap, toe shape, sole shape, texture, or shoe style from the fixed leg/magenta reference. The fixed leg/magenta reference controls only human leg anatomy, while the original angle yellow/S region controls precise shoe placement, size, angle, direction, perspective, and bounding area.',
    '[MUST] PRIMARY SHOE PLACEMENT AUTHORITY: the original angle reference yellow/S shoe region is the exact and highest authority for the final shoe position, shoe size, shoe angle, shoe direction, toe direction, heel position, perspective, scale, occlusion, visual center, and crop. The magenta region and all text size-memory rules are only secondary auxiliary hints and must never override, enlarge, lower, recenter, or move the angle yellow/S region.',
    '[MUST] Use the angle yellow/S region as a fixed X0-Y0 to X100-Y100 canvas. The one worn shoe must fit inside the yellow/S shoe region exactly, not merely near it. The heel/body side remains on the left side of that yellow/S region, the toe/front follows the right-facing yellow/S direction, and the outsole follows the yellow/S perspective. Use the magenta region only to confirm the rough shoe zone and ankle contact. Do not move the shoe to a generic lower-middle product-photo position, do not make it a larger close-up, and do not change the composition scale to satisfy aesthetic centering.',
    '[MUST] The one lower leg must stay fixed to the reference: it enters from the upper-left / upper-center area around X22-X44 at Y0, curves slightly rightward downward through X34-X52, and inserts into the shoe opening around X40-X54 and Y43-Y58. Keep the ankle seated inside the shoe opening. Do not straighten, mirror, thicken, shrink, detach, recenter, rotate, or move the leg.',
    '[MUST] The leg-to-shoe proportion is fixed: one continuous slim female lower leg, one ankle, one worn shoe. Do not add a second leg, second foot, second ankle, hand, display shoe, floating shoe, pair display, standing pose, front-view pose, overhead pose, or full-body shot.',
    '[MUST] APPROVED SHOE SIZE MEMORY IS SOFT AND SUBORDINATE: it may only help keep angle-03 and angle-04 visually consistent after the shoe has already been fitted into the original angle yellow/S region. This memory provides only pair consistency, outsole baseline feeling, ankle-contact feeling, and contact-shadow footprint; it must not provide any background, prop, room layout, wall/floor style, color temperature, or scene element. Do not enlarge, shrink, lower, raise, or recenter the shoe to match an old numeric size range. If text-derived size memory conflicts with the angle yellow/S region, ignore the size memory completely and follow the yellow/S region.',
    '[MUST] ANGLE-03 / ANGLE-04 MATCHED-PAIR CALIBRATION: angle-03 and angle-04 are a matched pair and must use the same invisible calibration grid. After each shoe is fitted into the original angle yellow/S region, keep the shoe outer bounding box, shoe center, heel position, toe endpoint, outsole contact line, ankle opening height, leg entry point, camera crop, floor contact shadow footprint, shadow softness, shadow direction, highlight direction, exposure, and overall light intensity visually consistent across the two outputs. Only shoe appearance, color, material, logo, stitching, sole details, and product identity may differ. If product reference 1 and product reference 2 have different shapes or thickness, fit both into the same outer placement envelope instead of letting one become larger, lower, brighter, darker, or differently lit.',
    '[MUST] GROUNDED CONTACT SHADOW LOCK: the shoe must sit on the uploaded background floor with a soft realistic contact shadow. Keep a slightly deeper shadow directly under the outsole and heel, fading naturally outward along the floor plane. Shadow direction, brightness, softness, and color must follow the current uploaded background lighting only.',
    '[MUST NOT] Do not copy or recreate any non-current-background object, prop, room layout, wall/floor style, text, label, or scene element from any previous output, fixed reference, angle reference, product photo, or text-derived size-memory example. The approved 2026-07-13 examples are used only as text-derived shoe-size and contact-shadow footprint memory; the current uploaded background remains the only environment source.',
    '[MUST] The entire visible leg must have one unified fair natural skin tone with translucent realistic skin texture. The thigh/calf/ankle/foot skin must be the same complexion from top to shoe opening. Shadows may change brightness only, not hue or ethnicity. Do not generate mismatched skin patches, two skin tones, blue/yellow/red mask tint, color bands, stocking-like breaks, socks, leggings, bruised/dark patches, or a second different-complexion limb.',
    '[MUST] Before final output, check: if the shoe does not match the angle yellow/S region position, size, direction, toe/heel axis, perspective, and visual center, if the leg does not enter from the upper-left/top-center and connect to the shoe opening, or if the leg skin contains two different tones, the result is wrong and must be regenerated internally.',
    '[MUST] FINAL BACKGROUND STABILITY CHECK: after fitting the leg and shoe, reread the current uploaded background directly. Preserve every visible current-background element, its position, scale, crop, perspective, occlusion, color temperature, and lighting. If any current-background element disappears, moves, changes identity, or any element not visible in the current uploaded background appears, the result is wrong and must be regenerated internally.',
  ].join('\n')
}

function buildMergeImageAestheticInstruction() {
  return [
    '[CRITICAL IMAGE QUALITY AND COLOR FIRST]',
    '[MUST] Create one ultra-sharp photorealistic high-end women footwear commercial photograph, not a mask reconstruction, not a flat layout, not an illustration, not a collage.',
    '[MUST] The final image must be bright, clean, luminous, premium, and commercially retouched: clear whites, fair bright translucent natural model skin, delicate visible skin texture, clean ivory product color, transparent high-key lighting, healthy contrast, crisp local detail, and no dull gray cast.',
    '[MUST] Prioritize premium ecommerce product photography above all layout-control artifacts: crisp focus, high micro-detail, clean product edges, natural high-key studio lighting, realistic contact shadows, visible leather grain, refined color separation, realistic depth, polished catalog quality, and professional retouched advertising finish.',
    '[MUST] The shoes must look optically sharp and tactile: clear stitching, buckle edges, sole edge, leather texture, toe shape, heel edge, natural material sheen, and visible fine product texture.',
    '[MUST] The final image must feel like a real photographed product scene with clean exposure, natural contrast, and refined commercial color grading.',
    '[IMPORTANT] The code-generated angle/depth/control analysis only controls pose, camera direction, depth layering, object count, hand/foot candidates, and shoe-limb bindings. It must not control lighting, color grading, texture, contrast, background mood, or photographic style.',
    '[IMPORTANT] Lighting, shadows, color temperature, material quality, and photographic finish must come from this quality instruction plus the uploaded background and product references. Never copy the cleaned control image flat grayscale look, labels, grid, outlines, or mask feeling.',
  ].join('\n')
}

function buildMergeImageMaskColorBanInstruction() {
  return [
    '[ABSOLUTE MASK COLOR BAN]',
    '[MUST NOT] The final image must not contain any visible semantic mask colors or control-guide colors from the angle references: no saturated yellow shoe-mask color, no saturated blue limb-mask color, no saturated red clothing-mask color, no black mask fill/background, no gray control-map wash, no white guide boxes, no labels, no grid lines, no outline boxes, and no flat color-block silhouettes.',
    '[MUST NOT] Do not allow angle-reference colors to survive as stains, overlays, reflections, shadows, edge tints, glow, material color, background color, skin color, clothing color, shoe color, or any tinted remnant. The angle-library colors are invisible metadata only.',
    '[MUST] If a final object is yellow, blue, red, black, gray, or white, that color must come only from the uploaded product, model, or background reference, never from the angle reference or cleaned control image.',
    '[MUST NOT] Do not let the cleaned angle control image affect final color, brightness, contrast, texture, lighting, saturation, or photographic style. It is only a coordinate/layout guide.',
    '[MUST] Replace every semantic region with realistic photographic content: yellow/S regions become the uploaded product shoe material and color, green/G regions become natural hands/wrists/fingers, blue/B regions become natural skin legs/feet/ankles only, red/R regions become real clothing from the model reference, and black/background regions become the uploaded background environment with all existing visible background elements preserved. Do not omit, simplify, replace, or genericize visible elements already present in the uploaded background.',
    '[MUST] If the angle reference or cleaned control contains bright yellow, blue, red, black, gray, labels, grid, or boxes, treat them as invisible metadata only. They must never appear as colors, stains, overlays, shadows, reflections, edge tints, glow, material color, background color, or tinted remnants in the generated image.',
  ].join('\n')
}

function buildMergeImageCriticalOutputInstruction({ requestedSize = '', apiSize = '' } = {}) {
  const sizeText = requestedSize || apiSize || 'the selected output size'
  const ratioText = requestedSize ? imageSizeToRatioLabel(requestedSize) : 'the selected aspect ratio'
  return [
    '[CRITICAL OUTPUT SIZE AND NATIVE QUALITY]',
    `[MUST] Generate the image natively at ${sizeText}. This is not a post-processing resize request.`,
    `[MUST] The image API request size is ${apiSize || sizeText}; the final file must be ${sizeText}, aspect ratio ${ratioText}.`,
    '[MUST] Do not create a low-resolution image and upscale it. Do not return a soft, blurry, low-detail, compressed, or enlarged-looking result.',
    '[MUST] Preserve real photographic detail at the requested resolution: sharp shoe edges, visible leather grain, clear stitching, crisp buckle details, natural skin texture, and realistic contact shadows.',
    '[MUST] Use premium commercial studio lighting: soft high-key light, natural shadow falloff, correct color temperature, realistic material highlights, and polished ecommerce catalog clarity.',
  ].join('\n')
}

function extractConciseMergeRequestInstruction(prompt = '') {
  const lines = String(prompt || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const keepPattern = /Selected angle-library template|Selected pose prompt|Selected pose prompt role lock|选定姿势提示|Secondary user text demand|USER-UPLOADED REAL PHOTO|REAL PHOTO ANGLE REFERENCE|uploaded real angle photo must dominate|angle mask must dominate pose|product shoe image must dominate shoe identity|Multiple product shoe references|Only one product shoe reference|PRODUCT REFERENCE ASSIGNMENT LOCK/i
  const dropPattern = /model reference image is uploaded|No model reference image|Lower-body-only framing|background image must dominate|yellow only controls|yellow regions connected|Do not copy model|Never render mask colors|Preserve premium commercial photography/i
  const kept = []
  for (const line of lines) {
    if (keepPattern.test(line) && !dropPattern.test(line)) kept.push(line)
  }
  return kept.join('\n').slice(0, 1600)
}

function normalizeMergeImageBriefForDisplay(project = {}) {
  if (!isMergeImageSkillId(project.skillId)) return project.brief || ''
  const brief = String(project.brief || '')
  if (!brief || /^[\x00-\x7F\s.,:;!?'"()/_-]+$/.test(brief) || brief.includes('AI Product Background Fusion')) {
    return buildMergeImageChineseBrief({
      files: Array.isArray(project.uploadedFiles) ? project.uploadedFiles : [],
      angleSource: '',
      requestedSize: project.lastImage?.size || '',
      hasModelReference: Array.isArray(project.uploadedFiles) && project.uploadedFiles.some((file, index) => mergeImageRole(file, index) === 'model'),
    })
  }
  return brief
}

function safeDownloadName(value) {
  return String(value || 'skillcrew-image')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'skillcrew-image'
}

function escapePowerShellSingleQuoted(value) {
  return String(value).replace(/'/g, "''")
}

async function pickSavePath(defaultName, title = '保存图片') {
  const initialDir = process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'Downloads') : downloadsRoot
  const script = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.SaveFileDialog
$dialog.Title = '${escapePowerShellSingleQuoted(title)}'
$dialog.Filter = 'PNG 图片 (*.png)|*.png|所有文件 (*.*)|*.*'
$dialog.FileName = '${escapePowerShellSingleQuoted(defaultName)}'
$dialog.InitialDirectory = '${escapePowerShellSingleQuoted(initialDir)}'
$dialog.OverwritePrompt = $true
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  Write-Output $dialog.FileName
  exit 0
}
exit 2
`
  try {
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-STA',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      script,
    ])
    return stdout.trim()
  } catch (error) {
    if (error.code === 2) return ''
    throw error
  }
}

async function uniqueTargetPath(folderPath, requestedName, ext) {
  let targetPath = path.join(folderPath, `${requestedName}${ext}`)
  let index = 2
  while (true) {
    try {
      await fs.access(targetPath)
      targetPath = path.join(folderPath, `${requestedName}-${index}${ext}`)
      index += 1
    } catch {
      return targetPath
    }
  }
}

function safeFolderPart(value) {
  return String(value || 'skill')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'skill'
}

function slugifySkillName(value) {
  const source = String(value || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
  return source || `custom-skill-${Date.now().toString(36)}`
}

function escapeYaml(value) {
  return JSON.stringify(String(value || ''))
}

function parseSkillNameFromOutline(outline = '') {
  const match = String(outline).match(/(?:^|\n)\s*(?:[-*]\s*)?`?name`?\s*[：:]\s*`?([a-z0-9][a-z0-9-]{0,63})`?/i)
  return match?.[1] || ''
}

function parseDescriptionFromOutline(outline = '') {
  const match = String(outline).match(/(?:^|\n)\s*(?:[-*]\s*)?(?:`?Description`?|`?description`?)\s*[：:]\s*([^\n]+)/i)
  return match?.[1]?.replace(/^`|`$/g, '').trim() || ''
}

function referenceDisplayTitle(file = '') {
  const map = {
    '产品控制融合专家-固定角度': {
      lead: '上传产品鞋图、背景图和角度参考图，我会按三图角色一键融合成自然场景图。',
      checklist: ['产品鞋图', '背景图', '角度参考图', '融合要求'],
      placeholder: '例如：把我的产品鞋融合到这张室内背景里，姿态参考上传角度图，只借角度，不复制角度图里的颜色、人体、服装或鞋款设计。',
      deliveryOptions: [
        { id: 'merge-one-click', title: '一键三图融合', description: '产品图锁定鞋款，背景图锁定场景，角度图只控制姿态。', selected: true },
        { id: 'merge-light-match', title: '光影匹配增强', description: '重点加强地面接触阴影、色温、反光和边缘融合。', selected: true },
        { id: 'merge-angle-strict', title: '严格匹配角度', description: '优先匹配上传角度图的鞋头方向、前后关系和脚步姿态。', selected: true },
      ],
    },
    'copy-analysis-framework.md': '文案与卖点分析方法',
    'platform-detail-page-order.md': '平台详情页模块顺序',
    'platform-image-size-specs.md': '平台图片尺寸规范',
    'prompt-templates.md': '详情页提示词模板',
    'visual-consistency-rules.md': '产品视觉一致性规则',
  }
  return map[file] || file.replace(/\.md$/, '')
}

function resolveOpenAIImageCandidates(baseURL) {
  const normalized = (baseURL || 'https://api.openai.com/v1').replace(/\/$/, '')
  const candidates = []
  if (normalized.endsWith('/images/generations')) {
    candidates.push(normalized)
  } else if (normalized.endsWith('/v1')) {
    candidates.push(`${normalized}/images/generations`)
  } else {
    candidates.push(`${normalized}/v1/images/generations`)
    candidates.push(`${normalized}/images/generations`)
  }
  return [...new Set(candidates)]
}

function resolveOpenAIImageEditCandidates(baseURL) {
  const normalized = (baseURL || 'https://api.openai.com/v1').replace(/\/$/, '')
  const candidates = []
  if (normalized.endsWith('/images/edits')) {
    candidates.push(normalized)
  } else if (normalized.endsWith('/v1')) {
    candidates.push(`${normalized}/images/edits`)
  } else {
    candidates.push(`${normalized}/v1/images/edits`)
    candidates.push(`${normalized}/images/edits`)
  }
  return [...new Set(candidates)]
}

function mimeFromFileName(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.svg') return 'image/svg+xml'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  return 'image/png'
}

function imageSizeToRatioLabel(size = '') {
  const dimensions = parseImageSize(size)
  if (!dimensions) return '1:1'
  const divisor = greatestCommonDivisor(dimensions.width, dimensions.height)
  return `${Math.round(dimensions.width / divisor)}:${Math.round(dimensions.height / divisor)}`
}

function greatestCommonDivisor(a, b) {
  let x = Math.abs(Number(a) || 0)
  let y = Math.abs(Number(b) || 0)
  while (y) {
    const next = x % y
    x = y
    y = next
  }
  return x || 1
}

function parseImageSize(size = '') {
  const match = String(size).match(/(\d+)\s*[x×]\s*(\d+)/i)
  if (!match) return null
  const width = Number(match[1])
  const height = Number(match[2])
  return width > 0 && height > 0 ? { width, height } : null
}

function normalizeRequestedImageSize(size = '', fallback = '1024x1024') {
  const dimensions = parseImageSize(size)
  if (!dimensions) return fallback
  const width = Math.min(4096, Math.max(256, Math.round(dimensions.width)))
  const height = Math.min(4096, Math.max(256, Math.round(dimensions.height)))
  return `${width}x${height}`
}

function imageApiSizeForTarget(size = '1024x1024') {
  return normalizeRequestedImageSize(size, '1024x1024')
}

function detectImageMimeType(buffer, fallback = 'image/png') {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return fallback
  if (buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return 'image/png'
  if (buffer.subarray(0, 3).toString('hex') === 'ffd8ff') return 'image/jpeg'
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  if (buffer.subarray(0, 5).toString('utf8').trimStart().startsWith('<svg')) return 'image/svg+xml'
  return fallback
}

function pngHasAlphaChannel(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 33) return false
  const pngSignature = '89504e470d0a1a0a'
  if (buffer.subarray(0, 8).toString('hex') !== pngSignature) return false
  const colorType = buffer[25]
  if (colorType === 4 || colorType === 6) return true
  let offset = 8
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii')
    if (type === 'tRNS') return true
    offset += 12 + length
  }
  return false
}

function paethPredictor(left, above, upperLeft) {
  const estimate = left + above - upperLeft
  const distanceLeft = Math.abs(estimate - left)
  const distanceAbove = Math.abs(estimate - above)
  const distanceUpperLeft = Math.abs(estimate - upperLeft)
  if (distanceLeft <= distanceAbove && distanceLeft <= distanceUpperLeft) return left
  return distanceAbove <= distanceUpperLeft ? above : upperLeft
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  }
  return value >>> 0
})

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function makePngChunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type, 'ascii')
  const lengthBuffer = Buffer.alloc(4)
  lengthBuffer.writeUInt32BE(data.length, 0)
  const crcBuffer = Buffer.alloc(4)
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0)
  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer])
}

function encodeRgbaPng(width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    const targetOffset = y * (stride + 1)
    raw[targetOffset] = 0
    rgba.copy(raw, targetOffset + 1, y * stride, y * stride + stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', deflateSync(raw)),
    makePngChunk('IEND'),
  ])
}

function parsePngTransparency(buffer) {
  const empty = { hasAlphaChannel: false, transparentPixels: 0, totalPixels: 0, hasAnyTransparentPixel: false, width: 0, height: 0, colorType: 0, pixels: null }
  if (!Buffer.isBuffer(buffer) || buffer.length < 33) return empty
  if (buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return empty
  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  const idatChunks = []
  let transparentColor = null
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii')
    const dataStart = offset + 8
    const dataEnd = dataStart + length
    if (dataEnd > buffer.length) break
    const data = buffer.subarray(dataStart, dataEnd)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
    } else if (type === 'IDAT') {
      idatChunks.push(data)
    } else if (type === 'tRNS') {
      if (colorType === 0 && data.length >= 2) {
        transparentColor = { gray: data.readUInt16BE(0) }
      } else if (colorType === 2 && data.length >= 6) {
        transparentColor = {
          red: data.readUInt16BE(0),
          green: data.readUInt16BE(2),
          blue: data.readUInt16BE(4),
        }
      }
    } else if (type === 'IEND') {
      break
    }
    offset = dataEnd + 4
  }
  const totalPixels = width * height
  const hasAlphaChannel = colorType === 4 || colorType === 6 || Boolean(transparentColor)
  if (!width || !height || bitDepth !== 8 || !idatChunks.length) {
    return { ...empty, hasAlphaChannel, totalPixels, width, height, colorType }
  }
  const channelsByColorType = { 0: 1, 2: 3, 4: 2, 6: 4 }
  const channels = channelsByColorType[colorType]
  if (!channels) return { ...empty, hasAlphaChannel, totalPixels, width, height, colorType }
  const bytesPerPixel = channels
  const stride = width * channels
  let raw
  try {
    raw = inflateSync(Buffer.concat(idatChunks))
  } catch {
    return { ...empty, hasAlphaChannel, totalPixels, width, height, colorType }
  }
  let rawOffset = 0
  let previous = Buffer.alloc(stride)
  let transparentPixels = 0
  const pixels = Buffer.alloc(totalPixels * 4)
  for (let y = 0; y < height; y += 1) {
    if (rawOffset >= raw.length) break
    const filter = raw[rawOffset]
    rawOffset += 1
    const scanline = Buffer.from(raw.subarray(rawOffset, rawOffset + stride))
    rawOffset += stride
    for (let x = 0; x < stride; x += 1) {
      const left = x >= bytesPerPixel ? scanline[x - bytesPerPixel] : 0
      const above = previous[x] || 0
      const upperLeft = x >= bytesPerPixel ? previous[x - bytesPerPixel] || 0 : 0
      if (filter === 1) scanline[x] = (scanline[x] + left) & 255
      else if (filter === 2) scanline[x] = (scanline[x] + above) & 255
      else if (filter === 3) scanline[x] = (scanline[x] + Math.floor((left + above) / 2)) & 255
      else if (filter === 4) scanline[x] = (scanline[x] + paethPredictor(left, above, upperLeft)) & 255
    }
    for (let x = 0; x < width; x += 1) {
      const pixelOffset = x * channels
      let alpha = 255
      if (colorType === 6) alpha = scanline[pixelOffset + 3]
      else if (colorType === 4) alpha = scanline[pixelOffset + 1]
      else if (colorType === 2 && transparentColor) {
        alpha = scanline[pixelOffset] === transparentColor.red &&
          scanline[pixelOffset + 1] === transparentColor.green &&
          scanline[pixelOffset + 2] === transparentColor.blue
          ? 0
          : 255
      } else if (colorType === 0 && transparentColor) {
        alpha = scanline[pixelOffset] === transparentColor.gray ? 0 : 255
      }
      const targetOffset = (y * width + x) * 4
      if (colorType === 6) {
        pixels[targetOffset] = scanline[pixelOffset]
        pixels[targetOffset + 1] = scanline[pixelOffset + 1]
        pixels[targetOffset + 2] = scanline[pixelOffset + 2]
      } else if (colorType === 4) {
        pixels[targetOffset] = scanline[pixelOffset]
        pixels[targetOffset + 1] = scanline[pixelOffset]
        pixels[targetOffset + 2] = scanline[pixelOffset]
      } else if (colorType === 2) {
        pixels[targetOffset] = scanline[pixelOffset]
        pixels[targetOffset + 1] = scanline[pixelOffset + 1]
        pixels[targetOffset + 2] = scanline[pixelOffset + 2]
      } else if (colorType === 0) {
        pixels[targetOffset] = scanline[pixelOffset]
        pixels[targetOffset + 1] = scanline[pixelOffset]
        pixels[targetOffset + 2] = scanline[pixelOffset]
      }
      pixels[targetOffset + 3] = alpha
      if (alpha < 250) transparentPixels += 1
    }
    previous = scanline
  }
  return {
    hasAlphaChannel,
    transparentPixels,
    totalPixels,
    hasAnyTransparentPixel: transparentPixels > 0,
    width,
    height,
    colorType,
    pixels,
  }
}

function assertRealTransparentPng(buffer) {
  const transparency = parsePngTransparency(buffer)
  if (!transparency.hasAlphaChannel || !transparency.hasAnyTransparentPixel) {
    const error = new Error('抠图结果仍然是带网格或白底的假透明 PNG，已停止保存。请重试；系统不会再把假透明结果加入生成记录或导出。')
    error.status = 422
    throw error
  }
  return transparency
}

function colorDistanceSquared(a, b) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
}

function addSampleColor(samples, color) {
  const key = color.map((value) => Math.round(value / 8) * 8).join(',')
  samples.set(key, {
    color: key.split(',').map(Number),
    count: (samples.get(key)?.count || 0) + 1,
  })
}

function repairFakeTransparentPng(buffer) {
  const parsed = parsePngTransparency(buffer)
  if (parsed.hasAnyTransparentPixel || !parsed.pixels || !parsed.width || !parsed.height) return buffer
  const { width, height, pixels } = parsed
  const samples = new Map()
  const sampleInset = Math.max(2, Math.floor(Math.min(width, height) * 0.035))
  for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 160))) {
    for (const y of [0, 1, sampleInset, height - 1, height - 2, height - 1 - sampleInset]) {
      if (y < 0 || y >= height) continue
      const offset = (y * width + x) * 4
      addSampleColor(samples, [pixels[offset], pixels[offset + 1], pixels[offset + 2]])
    }
  }
  for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 160))) {
    for (const x of [0, 1, sampleInset, width - 1, width - 2, width - 1 - sampleInset]) {
      if (x < 0 || x >= width) continue
      const offset = (y * width + x) * 4
      addSampleColor(samples, [pixels[offset], pixels[offset + 1], pixels[offset + 2]])
    }
  }
  const backgroundColors = [...samples.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((sample) => sample.color)
  const commonFakeTransparencyColors = [
    [255, 255, 255],
    [248, 248, 248],
    [240, 240, 240],
    [230, 230, 230],
    [220, 220, 220],
    [204, 204, 204],
    [192, 192, 192],
  ]
  const targetColors = [...backgroundColors, ...commonFakeTransparencyColors]
  const repaired = Buffer.from(pixels)
  let transparentPixels = 0
  const hardThreshold = 34 ** 2
  const softThreshold = 56 ** 2
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4
    const color = [repaired[offset], repaired[offset + 1], repaired[offset + 2]]
    const bestDistance = Math.min(...targetColors.map((target) => colorDistanceSquared(color, target)))
    if (bestDistance <= hardThreshold) {
      repaired[offset + 3] = 0
      transparentPixels += 1
    } else if (bestDistance <= softThreshold) {
      repaired[offset + 3] = Math.max(40, Math.min(255, Math.round((bestDistance - hardThreshold) / (softThreshold - hardThreshold) * 255)))
      if (repaired[offset + 3] < 250) transparentPixels += 1
    }
  }
  if (transparentPixels < Math.max(64, width * height * 0.01)) return buffer
  return encodeRgbaPng(width, height, repaired)
}

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function wrapImageInTargetAspect({ imageBuffer, mimeType, size, title = 'generated image' }) {
  const dimensions = parseImageSize(size)
  if (!dimensions) return null
  const dataUrl = `data:${mimeType || 'image/png'};base64,${imageBuffer.toString('base64')}`
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}" viewBox="0 0 ${dimensions.width} ${dimensions.height}" role="img" aria-label="${escapeXml(title)}">`,
    '<defs>',
    '<filter id="soft-bg" x="-8%" y="-8%" width="116%" height="116%">',
    '<feGaussianBlur stdDeviation="18" />',
    '<feComponentTransfer><feFuncA type="linear" slope="0.72" /></feComponentTransfer>',
    '</filter>',
    '</defs>',
    '<rect width="100%" height="100%" fill="#11151a" />',
    `<image href="${dataUrl}" x="0" y="0" width="${dimensions.width}" height="${dimensions.height}" preserveAspectRatio="xMidYMid slice" filter="url(#soft-bg)" opacity="0.78" />`,
    '<rect width="100%" height="100%" fill="rgba(5,10,13,0.18)" />',
    `<image href="${dataUrl}" x="0" y="0" width="${dimensions.width}" height="${dimensions.height}" preserveAspectRatio="xMidYMid meet" />`,
    '</svg>',
  ].join('')
  return Buffer.from(svg, 'utf8')
}

function cropImageToTargetAspect({ imageBuffer, mimeType, size, title = 'generated image' }) {
  const dimensions = parseImageSize(size)
  if (!dimensions) return null
  const dataUrl = `data:${mimeType || 'image/png'};base64,${imageBuffer.toString('base64')}`
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}" viewBox="0 0 ${dimensions.width} ${dimensions.height}" role="img" aria-label="${escapeXml(title)}">`,
    `<image href="${dataUrl}" x="0" y="0" width="${dimensions.width}" height="${dimensions.height}" preserveAspectRatio="xMidYMid slice" />`,
    '</svg>',
  ].join('')
  return Buffer.from(svg, 'utf8')
}

function resizeRgbaCoverToTarget({ sourceWidth, sourceHeight, sourcePixels, targetWidth, targetHeight }) {
  const targetPixels = Buffer.alloc(targetWidth * targetHeight * 4)
  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight)
  const cropWidth = targetWidth / scale
  const cropHeight = targetHeight / scale
  const cropLeft = (sourceWidth - cropWidth) / 2
  const cropTop = (sourceHeight - cropHeight) / 2
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = cropTop + (y + 0.5) / scale - 0.5
    const y0 = clamp(Math.floor(sourceY), 0, sourceHeight - 1)
    const y1 = clamp(y0 + 1, 0, sourceHeight - 1)
    const fy = clamp(sourceY - y0, 0, 1)
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = cropLeft + (x + 0.5) / scale - 0.5
      const x0 = clamp(Math.floor(sourceX), 0, sourceWidth - 1)
      const x1 = clamp(x0 + 1, 0, sourceWidth - 1)
      const fx = clamp(sourceX - x0, 0, 1)
      const targetOffset = (y * targetWidth + x) * 4
      const topLeft = (y0 * sourceWidth + x0) * 4
      const topRight = (y0 * sourceWidth + x1) * 4
      const bottomLeft = (y1 * sourceWidth + x0) * 4
      const bottomRight = (y1 * sourceWidth + x1) * 4

      for (let channel = 0; channel < 4; channel += 1) {
        const top = sourcePixels[topLeft + channel] * (1 - fx) + sourcePixels[topRight + channel] * fx
        const bottom = sourcePixels[bottomLeft + channel] * (1 - fx) + sourcePixels[bottomRight + channel] * fx
        targetPixels[targetOffset + channel] = Math.round(top * (1 - fy) + bottom * fy)
      }
    }
  }

  return targetPixels
}

function ensureImageTargetCanvas({ imageBuffer, mimeType, size, title = 'generated image' }) {
  const dimensions = parseImageSize(size)
  if (!dimensions) return { buffer: imageBuffer, mimeType }
  const detectedMimeType = detectImageMimeType(imageBuffer, mimeType)
  const png = detectedMimeType?.includes('png') ? parsePngTransparency(imageBuffer) : null
  if (png?.width === dimensions.width && png?.height === dimensions.height) {
    return { buffer: imageBuffer, mimeType: detectedMimeType }
  }
  if (png?.pixels && png.width && png.height) {
    const resizedPixels = resizeRgbaCoverToTarget({
      sourceWidth: png.width,
      sourceHeight: png.height,
      sourcePixels: png.pixels,
      targetWidth: dimensions.width,
      targetHeight: dimensions.height,
    })
    return {
      buffer: encodeRgbaPng(dimensions.width, dimensions.height, resizedPixels),
      mimeType: 'image/png',
      sourceWidth: png.width,
      sourceHeight: png.height,
      targetWidth: dimensions.width,
      targetHeight: dimensions.height,
      resizedToTarget: true,
    }
  }
  const wrapped = cropImageToTargetAspect({ imageBuffer, mimeType: detectedMimeType, size, title })
  if (!wrapped) return { buffer: imageBuffer, mimeType: detectedMimeType }
  return { buffer: wrapped, mimeType: 'image/svg+xml' }
}

function extractEmbeddedRasterFromSvg(buffer) {
  const text = buffer.toString('utf8')
  if (!/<svg\b/i.test(text) || !/<image\b/i.test(text)) return null
  const match = text.match(/href=["']data:(image\/(?:png|jpe?g|webp));base64,([^"']+)["']/i)
  if (!match) return null
  const mimeType = match[1].toLowerCase().replace('image/jpg', 'image/jpeg')
  try {
    return {
      buffer: Buffer.from(match[2], 'base64'),
      mimeType,
      ext: mimeType.includes('jpeg') ? '.jpg' : mimeType.includes('webp') ? '.webp' : '.png',
    }
  } catch {
    return null
  }
}

function normalizeOpenAIBaseURL(baseURL = 'https://api.openai.com/v1') {
  const normalized = String(baseURL || 'https://api.openai.com/v1').replace(/\/$/, '')
  if (normalized.endsWith('/chat/completions')) return normalized.slice(0, -'/chat/completions'.length)
  if (normalized.endsWith('/responses')) return normalized.slice(0, -'/responses'.length)
  return normalized
}

function resolveProjectFile(publicUrl) {
  if (!publicUrl) return null
  let pathname = publicUrl
  try {
    pathname = new URL(publicUrl, 'http://127.0.0.1').pathname
  } catch {
    pathname = String(publicUrl)
  }
  if (!pathname.startsWith('/files/')) return null
  const relativePath = decodeURIComponent(pathname.replace(/^\/files\//, ''))
  const localPath = path.resolve(projectsRoot, relativePath)
  if (!localPath.startsWith(`${projectsRoot}${path.sep}`)) return null
  return localPath
}

function extractProjectIdFromFileUrl(publicUrl) {
  if (!publicUrl) return ''
  let pathname = publicUrl
  try {
    pathname = new URL(publicUrl, 'http://127.0.0.1').pathname
  } catch {
    pathname = String(publicUrl)
  }
  const match = pathname.match(/^\/files\/([^/]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

function resolveReasoningCandidates(baseURL) {
  const normalized = baseURL.replace(/\/$/, '')
  const isHeyroute = /heyroute\.ai/i.test(normalized)
  if (normalized.endsWith('/chat/completions')) {
    return [{ endpoint: normalized, mode: 'chat' }]
  }
  const responsesIndex = normalized.indexOf('/responses')
  if (responsesIndex >= 0) {
    return [{
      endpoint: normalized.slice(0, responsesIndex + '/responses'.length),
      mode: 'responses',
    }]
  }
  if (normalized.endsWith('/v1')) {
    if (isHeyroute) {
      return [
        { endpoint: `${normalized}/chat/completions`, mode: 'chat' },
      ]
    }
    return [
      { endpoint: `${normalized}/chat/completions`, mode: 'chat' },
      { endpoint: `${normalized}/responses`, mode: 'responses' },
    ]
  }
  if (isHeyroute) {
    return [
      { endpoint: `${normalized}/v1/chat/completions`, mode: 'chat' },
      { endpoint: `${normalized}/chat/completions`, mode: 'chat' },
    ]
  }
  return [
    { endpoint: `${normalized}/v1/chat/completions`, mode: 'chat' },
    { endpoint: `${normalized}/chat/completions`, mode: 'chat' },
    { endpoint: `${normalized}/v1/responses`, mode: 'responses' },
    { endpoint: `${normalized}/responses`, mode: 'responses' },
  ]
}

function parseJsonContent(content) {
  const trimmed = content.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1].trim())
      } catch {
        // Fall through to extracting the first JSON object from the text.
      }
    }
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('智能推理接口返回内容不是有效结构化数据。')
    return JSON.parse(match[0])
  }
}

function containsLongEnglish(text = '') {
  return /[A-Za-z]{4,}/.test(String(text || ''))
}

function keepChinesePrompt(candidate = '', fallback = '') {
  const value = String(candidate || '').trim()
  if (!value) return fallback
  return containsLongEnglish(value) ? fallback : value
}

function keepChineseDirections(candidateDirections, fallbackDirections) {
  if (!Array.isArray(candidateDirections) || !candidateDirections.length) return fallbackDirections
  return candidateDirections.map((direction, index) => {
    const fallback = fallbackDirections[index] || direction
    return {
      ...direction,
      title: keepChinesePrompt(direction.title, fallback.title),
      description: keepChinesePrompt(direction.description, fallback.description),
    }
  })
}

function fieldAlreadyCovered(brief = '', field = '') {
  const text = String(brief || '')
  if (text.split('\n').some((line) => line.trimStart().startsWith(`${field}：`) && line.split('：').slice(1).join('：').trim())) {
    return true
  }
  if (field.includes('颜色')) return /颜色|配色|色系|红|橙|黄|绿|青|蓝|紫|粉|黑|白|灰|金|银|棕|米|奶油|莫兰迪|马卡龙/.test(text)
  if (field.includes('风格')) return /风格|高级|可爱|极简|现代|复古|国潮|科技|自然|清新|奢华|年轻|松弛|东方|商务/.test(text)
  if (field.includes('目标用户') || field.includes('受众')) return /目标用户|人群|受众|男性|女性|儿童|学生|白领|年轻人|宝妈|家庭|银发|年龄/.test(text)
  if (field.includes('比例') || field.includes('尺寸')) return /比例|尺寸|方图|横版|竖版|长图|1\s*[:：]\s*1|3\s*[:：]\s*4|4\s*[:：]\s*3|9\s*[:：]\s*16|16\s*[:：]\s*9|\d{3,4}\s*[x×]\s*\d{3,4}/i.test(text)
  if (field.includes('语言')) return /中文|英文|中英|日文|韩文|生成语言|目标语言/.test(text)
  if (field.includes('Logo 类型')) return /图形标|文字标|组合标|徽章|印章|头像|门头|包装/.test(text)
  return text.includes(field)
}

function inferChoiceOptions(field = '', brief = '') {
  const text = String(brief || '')
  if (field.includes('颜色')) {
    if (/食品|零食|餐饮|烘焙|咖啡|茶|饮品|果汁|甜品|调味|生鲜/.test(text)) {
      return [
        { id: 'a', label: 'A 清新食欲色', value: '颜色偏好：奶油白、果蔬绿、浅黄色，突出新鲜、干净和食品友好感。', description: '更适合健康、轻食、茶饮、生鲜或自然食品。' },
        { id: 'b', label: 'B 暖感食欲色', value: '颜色偏好：暖橙、番茄红、奶油黄，突出食欲、热情和货架吸引力。', description: '更适合零食、烘焙、餐饮、调味品或促销场景。' },
      ]
    }
    if (/美妆|护肤|香氛|个护|母婴/.test(text)) {
      return [
        { id: 'a', label: 'A 温和高级色', value: '颜色偏好：柔白、浅粉、香槟金，突出温和、安全和高级护理感。', description: '适合护肤、个护、母婴和香氛。' },
        { id: 'b', label: 'B 成分科技色', value: '颜色偏好：冷白、浅蓝、银灰，突出专业、成分力和科技可信感。', description: '适合功效型或科技型产品。' },
      ]
    }
    return [
      { id: 'a', label: 'A 稳妥品牌色', value: '颜色偏好：使用行业中更稳妥、易识别、商业落地性强的主色系统。', description: '优先保证适配行业和商业使用。' },
      { id: 'b', label: 'B 记忆点色彩', value: '颜色偏好：使用更有差异化和传播记忆点的主色系统。', description: '优先提高视觉识别和传播感。' },
    ]
  }
  if (field.includes('风格')) {
    return [
      { id: 'a', label: 'A 稳妥商业风', value: '风格偏好：专业、清晰、成熟商业化，优先适合实际投放和长期使用。', description: '适合需要稳妥交付的项目。' },
      { id: 'b', label: 'B 记忆点风格', value: '风格偏好：更年轻、更有识别度，强化符号感、传播感和差异化。', description: '适合需要出圈或提案亮点的项目。' },
    ]
  }
  if (field.includes('目标用户') || field.includes('受众')) {
    return [
      { id: 'a', label: 'A 大众消费人群', value: '目标用户：大众消费人群，视觉表达需要直观、易懂、可信。', description: '覆盖面更广，降低理解门槛。' },
      { id: 'b', label: 'B 年轻消费人群', value: '目标用户：年轻消费人群，视觉表达需要更轻松、更有社交传播感。', description: '更适合新消费和社媒投放。' },
    ]
  }
  if (field.includes('比例') || field.includes('尺寸')) {
    return [
      { id: 'a', label: 'A 电商竖版', value: '图片比例：3:4 或接近竖版商品图比例，适合电商主图、详情模块和移动端浏览。', description: '适合大多数商品展示。' },
      { id: 'b', label: 'B 横版展示', value: '图片比例：16:9 或横版展示比例，适合横幅、活动页、A+ 页面和宽屏展示。', description: '适合横向页面和活动 Banner。' },
    ]
  }
  if (field.includes('Logo 类型')) {
    return [
      { id: 'a', label: 'A 图形+文字组合', value: 'Logo 类型：图形标与文字标组合，兼顾品牌识别和实际应用。', description: '最适合初创品牌的一套完整主标。' },
      { id: 'b', label: 'B 图形符号优先', value: 'Logo 类型：优先设计可独立使用的图形符号，再搭配品牌文字。', description: '更适合头像、门店标识和社媒传播。' },
    ]
  }
  if (field.includes('语言')) {
    return [
      { id: 'a', label: 'A 中文', value: '生成语言：中文。', description: '适合国内电商和中文传播。' },
      { id: 'b', label: 'B 中英结合', value: '生成语言：中文为主，必要位置可加入英文辅助。', description: '适合更国际化或品牌感表达。' },
    ]
  }
  return []
}

function fallbackInferredChoices(skill, brief) {
  const priority = ['颜色偏好', '风格偏好', '目标用户', '受众定位', '图片比例', '尺寸比例', 'Logo 类型', '生成语言', '目标语言']
  const checklist = skill.guidance?.checklist || []
  return checklist
    .filter((field) => priority.some((item) => field.includes(item) || item.includes(field)))
    .filter((field) => !fieldAlreadyCovered(brief, field))
    .map((field) => ({
      id: crypto.createHash('md5').update(field).digest('hex').slice(0, 8),
      field,
      title: `补充确认：${field}`,
      description: `你没有明确填写「${field}」，我先根据当前需求推断两个更适合的方向。`,
      options: [
        ...inferChoiceOptions(field, brief),
        { id: 'custom', label: '其他', value: '', description: '我自己填写。' },
      ],
      allowCustom: true,
    }))
    .filter((choice) => choice.options.length > 1)
    .slice(0, 3)
}

function normalizeInferredChoices(candidateChoices, fallbackChoices) {
  if (!Array.isArray(candidateChoices) || !candidateChoices.length) return fallbackChoices
  const choices = candidateChoices
    .filter((choice) => choice?.field && !fieldAlreadyCovered('', choice.field))
    .map((choice, index) => {
      const fallback = fallbackChoices[index] || {}
      const field = String(choice.field || fallback.field || '').trim()
      const options = Array.isArray(choice.options)
        ? choice.options
            .map((option, optionIndex) => ({
              id: String(option.id || (optionIndex === 0 ? 'a' : optionIndex === 1 ? 'b' : `option-${optionIndex + 1}`)),
              label: keepChinesePrompt(option.label, optionIndex === 0 ? 'A 推荐方向' : optionIndex === 1 ? 'B 备选方向' : '其他'),
              value: String(option.id) === 'custom' ? '' : keepChinesePrompt(option.value, option.label || ''),
              description: keepChinesePrompt(option.description, ''),
            }))
            .filter((option) => option.label && option.id)
        : []
      if (!options.some((option) => option.id === 'custom')) {
        options.push({ id: 'custom', label: '其他', value: '', description: '我自己填写。' })
      }
      return {
        id: safeFileName(choice.id || '').toLowerCase() || crypto.createHash('md5').update(field).digest('hex').slice(0, 8),
        field,
        title: keepChinesePrompt(choice.title, `补充确认：${field}`),
        description: keepChinesePrompt(choice.description, `请确认「${field}」的推荐方向。`),
        options: options.slice(0, 4),
        allowCustom: true,
      }
    })
    .filter((choice) => choice.field && choice.options.length > 1)
    .slice(0, 3)
  return choices.length ? choices : fallbackChoices
}

function summarizeInferredSelections(selections = []) {
  if (!Array.isArray(selections) || !selections.length) return ''
  return selections
    .map((item) => {
      const field = String(item.field || '').trim()
      const value = String(item.value || item.label || '').trim()
      return field && value ? `${field}：${value.replace(new RegExp(`^${field}[:：]?\\s*`), '')}` : ''
    })
    .filter(Boolean)
    .join('\n')
}

function providerErrorMessage(text = '', status = '') {
  const trimmed = String(text || '').trim()
  if (/524:\s*A timeout occurred|Error code 524|A timeout occurred/i.test(trimmed)) {
    return '图片接口代理 heyroute.ai 超时（Cloudflare 524）。这通常是图片生成请求耗时过长或代理线路繁忙导致的，系统会尽量自动重试；如果仍失败，请在下方输入“继续生成失败的图”重试。'
  }
  if (/Cloudflare|cf-error|cf-wrapper/i.test(trimmed)) {
    return `图片接口代理返回 Cloudflare 错误${status ? `（HTTP ${status}）` : ''}，请稍后重试。`
  }
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<')) {
    return `图片接口返回了 HTML 错误页${status ? `（HTTP ${status}）` : ''}，不是有效的图片 API JSON。`
  }
  return trimmed || `图片生成接口请求失败${status ? `：${status}` : ''}`
}

function isRetryableImageError(error) {
  const message = String(error?.message || error || '')
  if (/524|Cloudflare 524/i.test(message)) return false
  return /timeout|超时|temporarily|rate limit|429|502|503|504|Cloudflare/i.test(message)
}

function compactImagePrompt(prompt = '', maxChars = 2600) {
  const normalized = String(prompt || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const seen = new Set()
  const important = []
  const regular = []
  const importantPattern = /angle|semantic|mask|yellow|blue|red|black|model|outfit|clothing|legs|shoe|product|background|priority|forbidden|reference|pose|composition|camera|occlusion|region|bbox|camera|perspective|scale|contact|shadow|size|aspect/i
  for (const line of normalized) {
    const key = line.replace(/\s+/g, '')
    if (seen.has(key)) continue
    seen.add(key)
    if (importantPattern.test(line)) important.push(line)
    else regular.push(line)
  }
  const result = []
  let total = 0
  for (const line of [...important, ...regular]) {
    if (total + line.length + 1 > maxChars) continue
    result.push(line)
    total += line.length + 1
  }
  return result.join('\n') || String(prompt || '').slice(0, maxChars)
}
function extractResponseText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text
  }
  const chunks = []
  for (const item of data?.output || []) {
    if (item?.type !== 'message' || !Array.isArray(item.content)) continue
    for (const piece of item.content) {
      if (typeof piece?.text === 'string') {
        chunks.push(piece.text)
      }
    }
  }
  return chunks.join('').trim()
}

function extractStreamResponseText(text = '') {
  const doneTexts = []
  const deltas = []
  for (const line of String(text).split('\n')) {
    if (!line.startsWith('data: ')) continue
    const raw = line.slice(6).trim()
    if (!raw || raw === '[DONE]') continue
    let event
    try {
      event = JSON.parse(raw)
    } catch {
      continue
    }
    if (event.type === 'response.output_text.done' && typeof event.text === 'string') {
      doneTexts.push(event.text)
    } else if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') {
      deltas.push(event.delta)
    } else if (event.type === 'response.content_part.done' && typeof event.part?.text === 'string') {
      doneTexts.push(event.part.text)
    }
  }
  return (doneTexts.at(-1) || deltas.join('')).trim()
}

async function parseProviderError(response) {
  const status = response.status
  const text = await response.text()
  if (!text) return `HTTP ${status}`
  try {
    const data = JSON.parse(text)
    return `${status}${data?.error?.message ? ` ${data.error.message}` : data?.message ? ` ${data.message}` : ` ${text.slice(0, 300)}`}`
  } catch {
    return `${status} ${providerErrorMessage(text, status)}`
  }
}

async function requestReasoningJson({ endpoint, mode, reasoning, messages }) {
  const basePayload =
    mode === 'responses'
      ? { model: reasoning.model, input: messages, max_output_tokens: 1800 }
      : { model: reasoning.model, messages, max_tokens: 1800, temperature: 0.2 }
  const skipJsonMode = /heyroute\.ai/i.test(endpoint) || /heyroute\.ai/i.test(reasoning.baseURL || '')
  const useStreamResponses = mode === 'responses' && skipJsonMode
  const payloads = mode === 'chat'
    ? (skipJsonMode
        ? [basePayload]
        : [
            { ...basePayload, response_format: { type: 'json_object' } },
            basePayload,
          ])
    : [useStreamResponses ? { ...basePayload, stream: true } : basePayload]
  let lastError = null
  for (const payload of payloads) {
    let response
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${reasoning.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(45000),
      })
    } catch (error) {
      lastError = new Error(error?.name === 'TimeoutError'
        ? '智能推理接口请求超时，请稍后重试或检查代理线路。'
        : `智能推理接口请求失败：${error.message || error}`)
      continue
    }
    if (!response.ok) {
      lastError = new Error(`智能推理接口请求失败：${await parseProviderError(response)}`)
      continue
    }
    let content = ''
    if (useStreamResponses) {
      content = extractStreamResponseText(await response.text())
    } else {
      let data
      try {
        data = await response.json()
      } catch {
        throw new Error('智能推理接口返回内容不是有效结构化数据。')
      }
      content = mode === 'responses' ? extractResponseText(data) : data?.choices?.[0]?.message?.content
    }
    if (!content) throw new Error('智能推理接口未返回内容。')
    return parseJsonContent(content)
  }
  throw lastError || new Error('智能推理接口请求失败。')
}

function extractSvgMarkup(text = '') {
  const raw = String(text || '').trim()
  const fenced = raw.match(new RegExp('```(?:svg|xml)?\\s*([\\s\\S]*?)```', 'i'))
  const candidate = (fenced && fenced[1] ? fenced[1] : raw).trim()
  const match = candidate.match(new RegExp('<svg\\b[\\s\\S]*<\\/svg>', 'i'))
  if (!match) return ''
  return match[0]
    .replace(new RegExp('<script\\b[\\s\\S]*?<\\/script>', 'gi'), '')
    .replace(new RegExp('\\son[a-z]+="[^"]*"', 'gi'), '')
    .trim()
}

function fallbackLogoSvgSource({ title = 'Logo', prompt = '' }) {
  const hash = crypto.createHash('md5').update(`${title}\n${prompt}`).digest('hex')
  const primary = `#${hash.slice(0, 6)}`
  const accent = `#${hash.slice(6, 12)}`
  const label = escapeXml(String(title || 'Logo').replace(/\s*·\s*Variant\s+\d+/i, '').slice(0, 16) || 'Logo')
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img" aria-label="Logo vector source">',
    '<rect width="1024" height="1024" fill="#ffffff"/>',
    `<circle cx="512" cy="390" r="210" fill="${primary}" opacity="0.96"/>`,
    `<path d="M512 176 L698 498 H326 Z" fill="${accent}" opacity="0.92"/>`,
    '<path d="M360 402 C404 318 462 276 534 276 C620 276 684 336 704 420 C650 382 594 364 536 366 C466 368 408 380 360 402 Z" fill="#ffffff" opacity="0.88"/>',
    '<path d="M326 566 H698" stroke="#101820" stroke-width="42" stroke-linecap="round"/>',
    `<text x="512" y="706" text-anchor="middle" font-family="Arial, 'Microsoft YaHei', sans-serif" font-size="74" font-weight="700" fill="#101820">${label}</text>`,
    '<text x="512" y="772" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" letter-spacing="8" fill="#63707a">VECTOR LOGO</text>',
    '</svg>',
  ].join('')
}

function vectorizeGeneratedPngToSvg({ imageBuffer, title = 'Logo', maxSize = 384 }) {
  const parsed = parsePngTransparency(imageBuffer)
  if (!parsed.pixels || !parsed.width || !parsed.height) return ''
  const { width, height, pixels } = parsed
  const scale = Math.min(1, maxSize / Math.max(width, height))
  const svgWidth = Math.max(1, Math.round(width * scale))
  const svgHeight = Math.max(1, Math.round(height * scale))
  const sourceStepX = width / svgWidth
  const sourceStepY = height / svgHeight
  const quantize = (value) => Math.max(0, Math.min(255, Math.round(value / 17) * 17))
  const isNearWhite = (r, g, b, a) => a < 8 || (r > 242 && g > 242 && b > 242 && Math.max(r, g, b) - Math.min(r, g, b) < 18)
  const sampled = Array.from({ length: svgHeight }, () => Array(svgWidth).fill(''))
  const background = Array.from({ length: svgHeight }, () => Array(svgWidth).fill(false))
  const queue = []
  const markBackground = (x, y) => {
    if (x < 0 || y < 0 || x >= svgWidth || y >= svgHeight || background[y][x]) return
    const key = sampled[y][x]
    if (key !== 'bg') return
    background[y][x] = true
    queue.push([x, y])
  }

  for (let y = 0; y < svgHeight; y += 1) {
    const sourceY = Math.min(height - 1, Math.floor((y + 0.5) * sourceStepY))
    for (let x = 0; x < svgWidth; x += 1) {
      const sourceX = Math.min(width - 1, Math.floor((x + 0.5) * sourceStepX))
      const offset = (sourceY * width + sourceX) * 4
      const r = pixels[offset]
      const g = pixels[offset + 1]
      const b = pixels[offset + 2]
      const a = pixels[offset + 3]
      sampled[y][x] = isNearWhite(r, g, b, a) ? 'bg' : `${quantize(r)},${quantize(g)},${quantize(b)},${Math.round(a / 17) * 17}`
    }
  }

  for (let x = 0; x < svgWidth; x += 1) {
    markBackground(x, 0)
    markBackground(x, svgHeight - 1)
  }
  for (let y = 0; y < svgHeight; y += 1) {
    markBackground(0, y)
    markBackground(svgWidth - 1, y)
  }
  for (let index = 0; index < queue.length; index += 1) {
    const [x, y] = queue[index]
    markBackground(x + 1, y)
    markBackground(x - 1, y)
    markBackground(x, y + 1)
    markBackground(x, y - 1)
  }

  const pathsByColor = new Map()
  for (let y = 0; y < svgHeight; y += 1) {
    let x = 0
    while (x < svgWidth) {
      const key = sampled[y][x]
      if (!key || background[y][x]) {
        x += 1
        continue
      }
      let end = x + 1
      while (end < svgWidth && sampled[y][end] === key && !background[y][end]) end += 1
      const commands = pathsByColor.get(key) || []
      commands.push(`M${x} ${y}h${end - x}v1H${x}z`)
      pathsByColor.set(key, commands)
      x = end
    }
  }

  if (!pathsByColor.size) return ''
  const layers = [...pathsByColor.entries()]
    .map(([key, commands]) => {
      const [r, g, b, a] = key.split(',').map(Number)
      const opacity = a >= 255 ? '' : ` fill-opacity="${Math.max(0, Math.min(1, a / 255)).toFixed(3)}"`
      return `<path fill="rgb(${r} ${g} ${b})"${opacity} d="${commands.join(' ')}"/>`
    })
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-label="${escapeXml(title)}">`,
    '<rect width="100%" height="100%" fill="transparent"/>',
    ...layers,
    '</svg>',
  ].join('')
}

function prepareImageForSmoothVectorTrace(imageBuffer) {
  const parsed = parsePngTransparency(imageBuffer)
  if (!parsed.pixels || !parsed.width || !parsed.height) return imageBuffer
  const { width, height, pixels } = parsed
  const cleaned = Buffer.from(pixels)
  const nearWhiteThreshold = 236
  const paleChromaThreshold = 22
  const paleContrastThreshold = 34
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4
    const r = cleaned[offset]
    const g = cleaned[offset + 1]
    const b = cleaned[offset + 2]
    const a = cleaned[offset + 3]
    if (a < 16) {
      cleaned[offset] = 255
      cleaned[offset + 1] = 255
      cleaned[offset + 2] = 255
      cleaned[offset + 3] = 255
      continue
    }
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const chroma = max - min
    const brightness = (r + g + b) / 3
    if (brightness >= nearWhiteThreshold || (brightness >= 218 && chroma <= paleChromaThreshold) || (brightness >= 202 && chroma <= paleContrastThreshold)) {
      cleaned[offset] = 255
      cleaned[offset + 1] = 255
      cleaned[offset + 2] = 255
      cleaned[offset + 3] = 255
      continue
    }
    if (brightness < 132 && chroma < 54) {
      cleaned[offset] = 55
      cleaned[offset + 1] = 57
      cleaned[offset + 2] = 60
      cleaned[offset + 3] = 255
      continue
    }
  }
  return encodeRgbaPng(width, height, cleaned)
}

async function vectorizeImageWithVTracer({ imageBuffer, title = 'SVG' }) {
  try {
    const {
      vectorize,
      optimize,
      ColorMode,
      Hierarchical,
      PathSimplifyMode,
    } = await import('@neplex/vectorizer')
    const preparedImageBuffer = prepareImageForSmoothVectorTrace(imageBuffer)
    const svg = await vectorize(preparedImageBuffer, {
      colorMode: ColorMode.Color,
      hierarchical: Hierarchical.Stacked,
      mode: PathSimplifyMode.Spline,
      filterSpeckle: 8,
      colorPrecision: 6,
      layerDifference: 16,
      cornerThreshold: 72,
      lengthThreshold: 6,
      maxIterations: 4,
      spliceThreshold: 62,
      pathPrecision: 2,
      smallCircle: 6,
    })
    const optimized = await optimize(svg, {
      multipass: true,
      multipassIterations: 4,
      omit: ['removeViewBox'],
    }).catch(() => svg)
    return String(optimized || svg)
      .replace(new RegExp('<title>[\\s\\S]*?<\\/title>', 'i'), '')
      .replace(/<svg\b/i, `<svg role="img" aria-label="${escapeXml(title)}"`)
  } catch (error) {
    console.warn('VTracer SVG conversion unavailable, falling back to pixel vectorizer:', error?.message || error)
    return vectorizeGeneratedPngToSvg({ imageBuffer, title })
  }
}

async function requestReasoningText({ endpoint, mode, reasoning, messages, maxTokens = 2600 }) {
  const payload = mode === 'responses'
    ? { model: reasoning.model, input: messages, max_output_tokens: maxTokens }
    : { model: reasoning.model, messages, max_tokens: maxTokens, temperature: 0.15 }
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${reasoning.apiKey}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(45000),
  })
  if (!response.ok) throw new Error(await parseProviderError(response))
  const data = await response.json()
  return mode === 'responses' ? extractResponseText(data) : data?.choices?.[0]?.message?.content || ''
}

async function generateLogoSvgSource({ settings, prompt, directionTitle = 'Logo' }) {
  const reasoning = settings?.reasoning || settings?.doubao
  if (!reasoning?.apiKey || !reasoning?.baseURL || !reasoning?.model) return ''
  const messages = [
    {
      role: 'system',
      content: [
        '你是资深品牌矢量标志设计师，只输出一个可直接保存的 SVG 文件源码。',
        '必须是真矢量：使用 <svg>, <path>, <circle>, <rect>, <polygon>, <text> 等 SVG 元素。',
        '禁止嵌入 png/jpg/webp/base64 图片，禁止 image 标签，禁止 script，禁止外链。',
        '画布使用 viewBox="0 0 1024 1024"，结构简洁，适合 Figma/Illustrator/Inkscape 打开编辑。',
        '如果文字容易出错，优先用图形符号和简洁占位文字，不要编造乱码。',
        '只输出 SVG 源码，不要 markdown，不要解释。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        `Logo 标题：${directionTitle}`,
        '请根据下面的品牌 logo 生图提示词，重建一个干净、可编辑、可缩放的 SVG 矢量版本。',
        '不要临摹位图噪点，不要输出复杂阴影和照片质感；重点保留品牌概念、图形关系、颜色和标志结构。',
        prompt,
      ].join('\n\n'),
    },
  ]
  const candidates = resolveReasoningCandidates(reasoning.baseURL)
  for (const { endpoint, mode } of candidates) {
    try {
      const text = await requestReasoningText({ endpoint, mode, reasoning, messages })
      const svg = extractSvgMarkup(text)
      if (svg && !new RegExp('<image\\b', 'i').test(svg) && !/base64/i.test(svg)) return svg
    } catch {
      continue
    }
  }
  return fallbackLogoSvgSource({ title: directionTitle, prompt })
}

function buildGuidance(displayName, summary) {
  const fallback = {
    lead: '先把目标、素材和风格方向说明清楚，我会按这个 Skill 的工作流继续。',
    checklist: ['目标', '素材', '风格方向', '输出用途'],
    placeholder: '例如：说明你的具体需求、用途、素材和风格要求。',
    deliveryOptions: [
      { id: 'primary-output', title: '主输出', description: '生成当前需求的核心结果。', selected: true },
      { id: 'variation', title: '备选方向', description: '补充 2-3 个可比较的方向。', selected: false },
    ],
  }

  if (displayName === '品牌logo设计') {
    return {
      summary,
      lead: '先提供品牌名称、品牌行业、产品或服务、目标用户、品牌定位和希望突出的信息，我会先给出多个 Logo 风格方向供选择。',
      checklist: ['品牌名称', '品牌行业', '产品/服务', '目标用户', '品牌定位', '希望突出的信息'],
      placeholder:
        '例如：品牌名是「云盏」，新中式茶饮品牌，主打原叶鲜奶茶和东方茶点，面向 18-30 岁年轻女性，希望突出东方、轻盈、品质感和茶香记忆点。',
      deliveryOptions: [
        { id: 'logo-style-modern', title: '现代简洁风', description: '结构清晰、识别稳定，适合长期品牌资产和多场景落地。', selected: true },
        { id: 'logo-style-oriental', title: '东方文化风', description: '从中文名、地域文化、器物或意象中提炼符号，但避免装饰堆砌。', selected: false },
        { id: 'logo-style-premium', title: '高级质感风', description: '强调比例、留白、字形和克制色彩，适合高端或精品品牌。', selected: false },
        { id: 'logo-style-friendly', title: '亲和年轻风', description: '更轻松、有社交传播感，适合新消费、生活方式和年轻客群。', selected: false },
        { id: 'logo-emphasis-name', title: '突出品牌名字', description: '优先让品牌名和字形结构成为记忆点，适合名字本身有识别度的品牌。', selected: true },
        { id: 'logo-emphasis-industry', title: '突出行业属性', description: '让用户一眼理解品牌做什么，但不使用普通行业图标。', selected: false },
        { id: 'logo-emphasis-advantage', title: '突出核心优势', description: '围绕品质、效率、科技、天然、专业等核心卖点提炼视觉隐喻。', selected: false },
      ],
    }
  }

  const map = {
    'AI电商详情页提示词专家': {
      lead: '先提供平台、商品图、品类和卖点，我会先整理详情页策略与提示词。',
      checklist: ['目标平台', '商品图片', '商品品类', '核心卖点', '生成语言'],
      placeholder: '例如：淘宝详情页，已上传商品图，产品是精华液，卖点是补水、温和、肤感清爽，中文输出，先给我提示词方案。',
      deliveryOptions: [
        { id: 'detail-strategy', title: '详情页策略草案', description: '规划模块顺序、卖点节奏和文案位置。', selected: true },
        { id: 'detail-prompt-pack', title: '图片提示词包', description: '生成可确认、可编辑的详情页图片提示词。', selected: true },
        { id: 'detail-size', title: '平台尺寸适配', description: '按淘宝、Amazon 等平台选择合适画布。', selected: true },
      ],
    },
    'AI产品背景融合': {
      lead: '上传产品鞋图、背景图和角度参考图，我会按三图角色一键融合成自然场景图。',
      checklist: ['产品鞋图', '背景图', '角度参考图', '融合要求'],
      placeholder: '例如：把我的产品鞋融合到这张室内墙面地板背景里，鞋子姿态参考上传角度图或角度库，只借角度，不要复制角度图里的颜色、人体、服装或鞋款设计。',
      deliveryOptions: [
        { id: 'merge-one-click', title: '一键三图融合', description: '产品图锁定鞋款，背景图锁定场景，角度图只控制姿态。', selected: true },
        { id: 'merge-light-match', title: '光影匹配增强', description: '重点加强地面接触阴影、色温、反光和边缘融合。', selected: true },
        { id: 'merge-angle-strict', title: '严格匹配角度', description: '优先匹配上传角度图的鞋头方向、前后关系和脚步姿态。', selected: true },
      ],
    },
    '品牌Logo设计专家': {
      lead: '先补充品牌名称、行业、风格、视觉元素、颜色和字体偏好。',
      checklist: ['品牌名称', '行业', 'Logo 类型', '风格偏好', '视觉元素', '颜色偏好', '字体偏好'],
      placeholder: '例如：品牌名是「云栖 YUNXI」，茶叶品牌，想要中式现代风，有山水、云雾元素，墨黑和玉绿色，做图形+文字组合 Logo。',
      deliveryOptions: [
        { id: 'logo-concepts', title: '三套 Logo 概念', description: '按经典、现代、极简三个方向生成扁平矢量 Logo。', selected: true },
        { id: 'logo-symbol', title: '图形标', description: '提炼可独立使用的 symbol / icon mark。', selected: false },
        { id: 'logo-wordmark', title: '文字标', description: '优化品牌名称字形、字距和文字气质。', selected: false },
        { id: 'logo-combination', title: '组合标', description: '生成图形 + 文字的横版或竖版组合。', selected: false },
        { id: 'logo-colorways', title: '配色变体', description: '输出黑白版、主色版、反白版或行业配色。', selected: false },
        { id: 'logo-usage', title: '应用预览', description: '生成门头、包装、头像、名片等应用场景预览。', selected: false },
      ],
    },
    '电商套图设计专家': {
      lead: '先补充商品图、商品品类、核心卖点、生成语言和图片比例。',
      checklist: ['商品图用途', '商品品类', '核心卖点', '生成语言', '图片比例', '统一风格'],
      placeholder: '例如：已上传商品正面图和包装图，商品是 500ml 保温杯，卖点是轻便、防漏、保温 12 小时，中文，3:4 竖版，整体自然干净，要做一套 4 张。',
      deliveryOptions: [
        { id: 'set-core', title: '整套商品图', description: '按主视觉、卖点页、场景页、细节页规划整套图。', selected: true },
        { id: 'set-add-selling-point', title: '补充卖点图', description: '围绕新增卖点继续补一张同风格商品图。', selected: false },
        { id: 'set-unify-style', title: '统一整套风格', description: '把选中图片拉回同一套背景、光影、文字和品牌视觉系统。', selected: false },
        { id: 'set-single-retouch', title: '单张优化', description: '针对选中的某张商品图优化构图、文案、商品还原或视觉重点。', selected: false },
        { id: 'set-resize', title: '比例/平台适配', description: '按 3:4、4:3、9:16、16:9、1:1 或 1464×600 改成新尺寸。', selected: false },
      ],
    },
    '品牌IP设计专家': {
      lead: '先补充品牌名称、行业/模式、目标用户、品牌关键词和期望风格；信息足够时会先直给 IP 方向。',
      checklist: ['品牌名称', '行业/模式', '目标用户', '品牌关键词', '期望风格', '角色元素', '是否已有IP图'],
      placeholder: '例如：我要为茶小山做品牌 IP，行业是新中式茶饮，目标用户是 18-30 岁女性，希望角色年轻、松弛、东方，有茶叶和小山元素，先看 2 个方向。',
      deliveryOptions: [
        { id: 'ip-main', title: '叙事场景海报', description: '先生成 1-2 个高质感 IP 方向或叙事场景主图。', selected: true },
        { id: 'ip-three-view', title: '三视图', description: '基于已确认主图延展正面、侧面、背面，保持骨架一致。', selected: false },
        { id: 'ip-expressions', title: '表情包', description: '生成傲娇、开心、俏皮、惊讶、愤怒、悲伤等表情。', selected: false },
        { id: 'ip-pose-sheet', title: '动作库', description: '生成站姿、叉腰、蹲坐、挥手、奔跑、趴地等动作。', selected: false },
        { id: 'ip-merch', title: '周边拓展', description: '按行业匹配笔记本、手机壳、杯子、袋子、徽章等周边展示。', selected: false },
        { id: 'ip-blind-box', title: '盲盒系列', description: '生成 4 款基础款 + 1 款隐藏款或故事海报墙。', selected: false },
        { id: 'ip-scenes', title: '追加新场景海报', description: '生成与已确认主图不同的新叙事场景海报。', selected: false },
        { id: 'ip-html-proposal', title: 'HTML 提案', description: '整合已确认图片、策略和应用拓展，输出客户提案结构。', selected: false },
      ],
    },
    '虚拟穿戴设计专家': {
      lead: '先补充服饰或配饰类别、商品图、模特要求和试穿场景。',
      checklist: ['商品图', '品类', '模特要求', '试穿/试戴场景', '风格偏好'],
      placeholder: '例如：这是一件短款羽绒服，提供商品图，希望 170cm 亚洲女性模特试穿，画面偏电商棚拍。',
      deliveryOptions: [
        { id: 'try-on-front', title: '正面试穿', description: '展示商品版型和上身比例。', selected: true },
        { id: 'try-on-side', title: '侧面/背面', description: '补充侧面、背面或细节角度。', selected: false },
        { id: 'try-on-scene', title: '场景试穿', description: '放入街拍、棚拍、通勤或生活方式场景。', selected: true },
        { id: 'try-on-detail', title: '局部细节', description: '强调材质、纹理、扣件、版型细节。', selected: false },
      ],
    },
    '电商详情页设计专家': {
      lead: '先补充商品品类、风格偏好、终端适配、目标语言和核心卖点。',
      checklist: ['商品品类', '风格偏好', '终端适配', '目标语言', '核心卖点'],
      placeholder: '例如：商品是护肤精华，风格高级干净，终端适配手机端，目标语言中文，重点突出修护、成分力、温和不刺激，并已上传商品图。',
      deliveryOptions: [
        { id: 'detail-hero', title: '首屏主视觉', description: '明确商品定位和第一转化卖点。', selected: true },
        { id: 'detail-selling', title: '核心卖点图', description: '按卖点逐张生成详情页模块。', selected: true },
        { id: 'detail-spec', title: '参数/规格图', description: '生成参数、尺寸、成分或规格说明模块。', selected: true },
        { id: 'detail-angle', title: '多角度/细节图', description: '生成商品细节、局部特写或多角度展示模块。', selected: true },
        { id: 'detail-package', title: '配件/赠品图', description: '生成套装内容、配件或赠品展示模块。', selected: false },
        { id: 'detail-proof', title: '售后/信任背书', description: '补充认证、保障、品牌背书或服务承诺。', selected: false },
      ],
    },
    '长图文海报设计专家': {
      lead: '先补充活动主题、文案、尺寸比例和海报用途。',
      checklist: ['活动主题', '文案内容', '尺寸比例', '投放渠道', '风格方向'],
      placeholder: '例如：做一张 竖版促销长图，主题是夏季上新，文案主标题为「清爽入夏」，用于小红书传播。',
      deliveryOptions: [
        { id: 'poster-main', title: '主海报', description: '生成完整长图主视觉。', selected: true },
        { id: 'poster-sections', title: '分段信息结构', description: '拆成标题、利益点、说明、行动按钮等模块。', selected: true },
        { id: 'poster-social', title: '社媒适配', description: '适配小红书、公众号或朋友圈长图阅读节奏。', selected: false },
        { id: 'poster-variants', title: '风格备选', description: '补充不同视觉调性的备选方向。', selected: false },
      ],
    },
    '3D图标设计专家': {
      lead: '先补充图标使用场景、数量、风格和颜色系统。',
      checklist: ['使用场景', '图标数量', '风格关键词', '颜色系统', '材质/视角'],
      placeholder: '例如：我要一组电商促销 3D 图标，用于首页活动区，风格明亮拟物，统一蓝黄配色。',
      deliveryOptions: [
        { id: 'icon-set', title: '成套图标', description: '生成统一风格的一组图标。', selected: true },
        { id: 'icon-single', title: '单图标精修', description: '重点打磨单个核心图标。', selected: false },
        { id: 'icon-angles', title: '视角统一', description: '限定等距、正视或轻俯视角。', selected: true },
        { id: 'icon-materials', title: '材质规范', description: '明确玻璃、软糖、金属、磨砂等材质。', selected: false },
      ],
    },
    '品牌全案设计专家': {
      lead: '先补充品牌名称、品牌阶段、业务目标和提案范围。',
      checklist: ['品牌名称', '品牌阶段', '业务目标', '提案范围', '受众定位'],
      placeholder: '例如：这是一个新消费茶饮品牌，正在做从 0 到 1 的品牌全案提案，需要品牌定位、视觉方向和传播建议。',
      deliveryOptions: [
        { id: 'brand-strategy', title: '品牌策略', description: '定位、人群、价值主张和差异化。', selected: true },
        { id: 'brand-visual', title: '视觉系统', description: 'Logo、色彩、字体、图形语言方向。', selected: true },
        { id: 'brand-applications', title: '应用场景', description: '包装、门店、社媒、物料等落地预览。', selected: true },
        { id: 'brand-deck', title: '提案结构', description: '整理成可讲述的品牌全案页序。', selected: false },
      ],
    },
    '小红书营销专家': {
      lead: '先补充账号或品牌信息、产品服务、目标受众和内容目标。',
      checklist: ['账号/品牌信息', '产品或服务', '目标受众', '内容目标', '素材现状'],
      placeholder: '例如：我要为一个家居品牌做小红书起号，目标受众是 25-35 岁女性，需要账号定位和 10 条笔记方向。',
      deliveryOptions: [
        { id: 'xhs-positioning', title: '账号定位', description: '明确人设、内容支柱和差异化。', selected: true },
        { id: 'xhs-topics', title: '选题库', description: '生成可持续发布的选题方向。', selected: true },
        { id: 'xhs-notes', title: '笔记文案', description: '输出标题、正文、标签和行动引导。', selected: false },
        { id: 'xhs-cover', title: '封面方向', description: '生成封面标题、版式和视觉建议。', selected: false },
        { id: 'xhs-calendar', title: '发布日历', description: '规划周期、频次和测试节奏。', selected: false },
      ],
    },
    '工业设计方法论': {
      lead: '先补充产品类型、目标用户、使用场景、核心问题和阶段目标。',
      checklist: ['产品类型', '目标用户', '使用场景', '核心问题', '设计阶段', '输出目标'],
      placeholder: '例如：我要做一款桌面智能香薰，面向年轻办公人群，需要从用户洞察、功能定义到外观方向形成工业设计方案。',
      deliveryOptions: [
        { id: 'design-research', title: '用户与场景洞察', description: '拆解目标人群、使用场景、痛点和机会点。', selected: true },
        { id: 'design-strategy', title: '产品策略', description: '定义核心功能、体验目标、差异化和设计原则。', selected: true },
        { id: 'design-form', title: '造型方向', description: '生成 CMF、形态语言、结构关系和外观方向。', selected: false },
        { id: 'design-roadmap', title: '项目推进方案', description: '整理调研、概念、验证、打样和交付步骤。', selected: false },
      ],
    },
    '故事板创意专家': {
      lead: '先补充故事主题、产品或角色、传播目标、时长和画面风格。',
      checklist: ['故事主题', '产品/角色', '传播目标', '目标受众', '时长/镜头数', '画面风格'],
      placeholder: '例如：我要为一款运动水杯做 15 秒广告故事板，目标是突出轻便和防漏，风格清爽、有节奏感。',
      deliveryOptions: [
        { id: 'story-outline', title: '故事结构', description: '拆成起承转合、情绪节奏和核心卖点露出。', selected: true },
        { id: 'story-board', title: '分镜脚本', description: '输出镜头画面、景别、动作、旁白和字幕。', selected: true },
        { id: 'story-keyframes', title: '关键帧画面', description: '生成可生图的关键画面方向。', selected: false },
        { id: 'story-video', title: '视频生成提示词', description: '整理镜头运动、转场和视频生成指令。', selected: false },
      ],
    },
    '海报设计专家': {
      lead: '先补充海报主题、文案、受众、投放场景、尺寸和风格方向。',
      checklist: ['海报主题', '主副文案', '目标受众', '投放场景', '尺寸比例', '视觉风格'],
      placeholder: '例如：做一张新品发布海报，主标题「轻盈一夏」，用于小红书和朋友圈，想要清透、年轻、白底高级感。',
      deliveryOptions: [
        { id: 'poster-finished', title: '成品海报', description: '生成一张完整海报主视觉。', selected: true },
        { id: 'poster-copy-layout', title: '文案与版式', description: '先规划标题层级、信息区和视觉动线。', selected: true },
        { id: 'poster-style-variants', title: '风格备选', description: '给出不同配色、构图或调性的方向。', selected: false },
        { id: 'poster-platform-fit', title: '平台适配', description: '适配小红书、公众号、朋友圈或电商活动位。', selected: false },
      ],
    },
    '金牌音乐制作人': {
      lead: '先补充音乐用途、情绪、曲风、语言、人声和参考作品。',
      checklist: ['音乐用途', '情绪氛围', '曲风', '语言', '人声/乐器', '参考歌曲'],
      placeholder: '例如：我要做一首适合品牌短片的 30 秒 BGM，情绪温暖、有希望，流行电子融合钢琴，不需要歌词。',
      deliveryOptions: [
        { id: 'music-concept', title: '音乐概念', description: '定义情绪、曲风、速度、调性和声音关键词。', selected: true },
        { id: 'music-structure', title: '编曲结构', description: '规划 intro、verse、chorus、bridge 等段落。', selected: true },
        { id: 'music-lyrics', title: '歌词方向', description: '在需要人声时生成歌词主题、段落和押韵方式。', selected: false },
        { id: 'music-prompt', title: '生成提示词', description: '输出可用于音乐生成模型的专业提示词。', selected: true },
      ],
    },
    '品牌视觉应用专家': {
      lead: '先补充品牌基础、已有视觉资产、应用场景、物料范围和风格要求。',
      checklist: ['品牌名称', '已有视觉资产', '应用场景', '物料范围', '目标受众', '风格要求'],
      placeholder: '例如：已有 Logo 和主色，想延展咖啡品牌的门店、杯套、外卖袋、小红书封面和名片应用。',
      deliveryOptions: [
        { id: 'brandok-system', title: '视觉规范', description: '梳理色彩、字体、图形、版式和使用规则。', selected: true },
        { id: 'brandok-mockups', title: '物料样机', description: '生成包装、门店、名片、社媒等应用预览。', selected: true },
        { id: 'brandok-consistency', title: '一致性校准', description: '统一不同物料的视觉语言和品牌识别。', selected: false },
        { id: 'brandok-extension', title: '新增应用', description: '按新场景继续扩展一组品牌视觉应用。', selected: false },
      ],
    },
    '社媒图片特效专家': {
      lead: '先上传原图，并补充平台、主体、想要的特效类型和传播氛围。',
      checklist: ['原始图片', '发布平台', '主体内容', '特效类型', '氛围关键词', '画面限制'],
      placeholder: '例如：上传一张城市建筑照片，想做小红书封面，生成赛博光影特效，保留建筑轮廓，整体高级不夸张。',
      deliveryOptions: [
        { id: 'effect-transform', title: '图片特效转绘', description: '保留主体结构，生成高质量社媒特效图。', selected: true },
        { id: 'effect-style-options', title: '特效方向', description: '提供节日、赛博、国风、电影感等方向选择。', selected: true },
        { id: 'effect-cover', title: '封面强化', description: '适配小红书、视频号或朋友圈封面视觉。', selected: false },
        { id: 'effect-series', title: '同风格系列', description: '基于同一原图或多张图生成统一风格系列。', selected: false },
      ],
    },
    '英文Logo设计专家': {
      lead: '先补充英文品牌名、行业、市场定位、目标国家和风格偏好。',
      checklist: ['英文品牌名', '行业', '市场定位', '目标国家/语言', 'Logo 类型', '风格偏好'],
      placeholder: '例如：英文品牌名是 LUMORA，护肤品牌，面向欧美轻奢市场，希望优雅、现代、适合包装和官网使用。',
      deliveryOptions: [
        { id: 'en-logo-concepts', title: '英文 Logo 概念', description: '生成 2-3 个国际化英文标识方向。', selected: true },
        { id: 'en-wordmark', title: '英文文字标', description: '重点优化字母结构、字距和品牌气质。', selected: true },
        { id: 'en-symbol', title: '图形符号', description: '提炼可独立用于 favicon、头像和包装的符号。', selected: false },
        { id: 'en-logo-application', title: '应用预览', description: '生成包装、官网、名片或门店场景预览。', selected: false },
      ],
    },
    '字体设计专家': {
      lead: '先补充要设计的文字、应用场景、主题、风格和字形限制。',
      checklist: ['设计文字', '应用场景', '主题概念', '风格方向', '字形限制', '输出形式'],
      placeholder: '例如：我要设计「山海有灵」四个标题字，用于文旅海报，风格东方幻想、厚重但有灵动感。',
      deliveryOptions: [
        { id: 'font-title', title: '标题字设计', description: '生成具有装饰性和识别度的标题字体方案。', selected: true },
        { id: 'font-structure', title: '字形结构', description: '拆解笔画、重心、连接方式和字面关系。', selected: true },
        { id: 'font-effects', title: '质感与装饰', description: '加入材质、纹理、光影或主题装饰。', selected: false },
        { id: 'font-application', title: '应用展示', description: '放入海报、包装、标题栏或品牌场景中验证。', selected: false },
      ],
    },
    '前端设计': {
      lead: '先补充页面或应用类型、业务目标、使用场景和设计参考。',
      checklist: ['页面类型', '业务目标', '使用场景', '设计参考', '技术约束'],
      placeholder: '例如：我要设计一个本地工具型后台界面，强调高密度信息、黑绿视觉和对话式工作流。',
      deliveryOptions: [
        { id: 'frontend-layout', title: '页面布局', description: '生成完整首屏或核心工作区结构。', selected: true },
        { id: 'frontend-states', title: '交互状态', description: '补充 loading、empty、error、selected 等状态。', selected: true },
        { id: 'frontend-responsive', title: '响应式', description: '适配桌面和移动端布局。', selected: false },
        { id: 'frontend-design-system', title: '组件规范', description: '提炼颜色、按钮、表单、卡片等规则。', selected: false },
      ],
    },
  }

  const detail = map[displayName] || fallback
  return {
    summary,
    lead: detail.lead,
    checklist: detail.checklist,
    placeholder: detail.placeholder,
    deliveryOptions: detail.deliveryOptions || fallback.deliveryOptions,
  }
}

function scoreReference(ref, query) {
  const text = `${ref.title} ${ref.content}`.toLowerCase()
  const rawText = `${ref.title} ${ref.content}`
  const rawQuery = String(query || '')
  const tokens = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 2)
  let score = 20
  for (const token of tokens) {
    if (text.includes(token)) score += 7
  }
  const title = ref.title.toLowerCase()
  const boosts = ['prompt', 'guide', 'flow', 'brand', 'ip', '3d', 'render', 'style', 'strategy']
  for (const boost of boosts) {
    if (title.includes(boost)) score += 9
  }
  for (const word of ['提示词', '卖点', '类目', '尺寸', '比例', '商品图', '套图']) {
    if (rawText.includes(word)) score += 4
  }
  for (const match of rawQuery.match(/[\p{Script=Han}A-Za-z0-9+]{2,}/gu) || []) {
    if (rawText.includes(match)) score += 12
  }
  return Math.min(score, 98)
}

async function listSkills() {
  const entries = await fs.readdir(skillsRoot, { withFileTypes: true })
  const skills = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const folder = entry.name
    if (!isMergeImageSkillId(folder)) continue
    const folderPath = path.join(skillsRoot, folder)
    const metadata = await readJson(path.join(folderPath, 'metadata.json'), {})
    const publicId = metadata.publicId || folder
    const name = metadata.name || ''
    if (!isMergeImageSkillId(publicId) && !isMergeImageSkillId(name)) continue
    const readmePath = path.join(folderPath, 'README.md')
    const skillFile = path.join(folderPath, 'SKILL.md')
    let readmeSummary = ''
    try {
      const readmeContent = await fs.readFile(readmePath, 'utf8')
      readmeSummary = extractReadmeSummary(readmeContent)
    } catch {
      readmeSummary = ''
    }
    try {
      await fs.access(skillFile)
    } catch {
      continue
    }
    const referencesDir = path.join(folderPath, 'references')
    let referencesCount = 0
    try {
      referencesCount = (await fs.readdir(referencesDir)).filter((name) => name.endsWith('.md')).length
    } catch {
      referencesCount = 0
    }
    const displayName = MERGE_IMAGE_DISPLAY_NAME
    const guidance = buildGuidance(displayName, readmeSummary || metadata.description || '')
    skills.push({
      id: publicId,
      displayName,
      name,
      description: metadata.description || '',
      folder,
      path: folderPath,
      referencesCount,
      guidance,
    })
  }
  const fallbackSorted = skills.sort((a, b) => a.folder.localeCompare(b.folder, 'zh-Hans-CN'))
  const order = await readJson(skillOrderPath, [])
  if (!Array.isArray(order) || order.length === 0) return fallbackSorted
  const orderIndex = new Map(order.map((id, index) => [String(id), index]))
  return fallbackSorted.sort((a, b) => {
    const aIndex = orderIndex.has(a.id) ? orderIndex.get(a.id) : orderIndex.has(a.folder) ? orderIndex.get(a.folder) : Number.MAX_SAFE_INTEGER
    const bIndex = orderIndex.has(b.id) ? orderIndex.get(b.id) : orderIndex.has(b.folder) ? orderIndex.get(b.folder) : Number.MAX_SAFE_INTEGER
    if (aIndex !== bIndex) return aIndex - bIndex
    return a.folder.localeCompare(b.folder, 'zh-Hans-CN')
  })
}

async function loadSkill(skillId) {
  const skills = await listSkills()
  const skill = skills.find((item) => item.id === skillId || item.folder === skillId)
  if (!skill) {
    const error = new Error('Skill not found')
    error.status = 404
    throw error
  }
  const folderPath = path.join(skillsRoot, skill.folder)
  let readmeSummary = ''
  try {
    const readmeContent = await fs.readFile(path.join(folderPath, 'README.md'), 'utf8')
    readmeSummary = extractReadmeSummary(readmeContent)
  } catch {
    readmeSummary = ''
  }
  const skillContent = await fs.readFile(path.join(folderPath, 'SKILL.md'), 'utf8')
  const referencesDir = path.join(folderPath, 'references')
  const references = []
  try {
    const files = (await fs.readdir(referencesDir)).filter((name) => name.endsWith('.md')).sort()
    for (const file of files) {
      const content = await fs.readFile(path.join(referencesDir, file), 'utf8')
      references.push({
        file,
        title: referenceDisplayTitle(file),
        content,
        summary: summarize(content),
      })
    }
  } catch {
    // Skills without references are valid.
  }
  return { ...skill, readmeSummary, skillContent, references }
}

async function callReasoningModel({
  settings,
  skill,
  brief,
  selectedReferences,
  selectedDeliveries = [],
  selectedThemeDirection = '',
  selectedInferredChoices = [],
}) {
  const reasoning = settings?.reasoning || settings?.doubao
  if (!reasoning?.apiKey || !reasoning?.baseURL || !reasoning?.model) {
    return null
  }
  const isInitialAnalysis = !selectedReferences.length && !selectedDeliveries.length && !selectedThemeDirection
  const detailSkill = isDetailPageSkill(skill)

  const messages = [
    {
      role: 'system',
      content:
        [
          '你是 Skills Expert 的推理层。必须严格返回 json 对象，不要 markdown，不要解释。',
          '你必须先阅读并遵循 skillContent 的工作流和约束，而不是输出通用模板。',
          isInitialAnalysis
            ? '当前只做初始分析：选择最相关参考资料，并给出必要的补充确认项；不要生成 directions 或 imagePrompt。'
            : detailSkill
              ? '当前做确认后的详情页屏幕文案生成：directions 必须是一屏一屏的详情页页面/模块文案，不是视觉大方向；每个 direction 对应一个可单独生图的详情页页面。'
              : '当前做确认后的方向生成：根据用户需求、已选参考资料和已选输出项生成 directions 与 imagePrompt。',
          '所有用户可见文案必须使用简体中文，不要写英文提示词、英文标签或英文开场句。',
          '如果 userBrief 缺少会显著影响输出质量的信息，例如颜色偏好、风格偏好、目标用户、比例、Logo 类型或生成语言，请在 inferredChoices 中给出 A/B/其他 的确认项。不要要求用户补充所有字段，只挑真正影响当前需求的 1-3 项。',
          '如果 selectedInferredChoices 已有用户确认的补充项，后续 directions 和 imagePrompt 必须吸收这些选择，不要再次询问同一项。',
        ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        skill: {
          displayName: skill.displayName,
          description: skill.description,
          skillContent: compactSkillContentForReasoning(skill.skillContent),
        },
        referenceInventory: compactReferencesForReasoning(skill.references),
        selectedReferences,
        selectedDeliveries,
        selectedThemeDirection,
        selectedInferredChoices,
        userBrief: brief,
        uploadedFiles: skill.uploadedFiles || [],
        requiredJsonShape: isInitialAnalysis
          ? {
              message: '给用户看的简短说明',
              selectedReferences: [{ file: '参考资料文件名', title: '参考资料标题', reason: '选择理由', score: 95 }],
              confirmation: { title: '确认卡标题', options: ['选项1', '选项2'] },
              inferredChoices: [],
            }
          : {
              message: '给用户看的简短说明',
              directions: detailSkill
                ? [{ id: 'detail-screen-id', title: '详情页第几屏标题', description: '本屏主标题、卖点文案、辅助说明和版式重点' }]
                : [{ id: 'direction-id', title: '方向名称', description: '方向说明' }],
              imagePrompt: { positive: '完整中文正向生图提示词', negative: '中文反向约束', size: '1024x1024' },
              inferredChoices: [],
            },
      }),
    },
  ]

  const candidates = resolveReasoningCandidates(reasoning.baseURL)
  let lastError = null
  for (const { endpoint, mode } of candidates) {
    try {
      return await requestReasoningJson({ endpoint, mode, reasoning, messages })
    } catch (error) {
      lastError = error
      continue
    }
  }

  throw lastError || new Error('智能推理接口请求失败。')
}

async function readProject(projectId) {
  const project = await readJson(path.join(projectsRoot, projectId, 'project.json'), null)
  if (!project) {
    const error = new Error('Project not found')
    error.status = 404
    throw error
  }
  return project
}

function buildPrompt({ skill, project, selectedReferences, selectedDeliveries = [], selectedThemeDirection = '' }) {
  const referenceNames = selectedReferences.map((reference) => reference.title).join('、') || '技能说明'
  const deliveryText = selectedDeliveries.length
    ? `用户选择的输出选项：${selectedDeliveries.map((item) => `${item.title}（${item.description}）`).join('、')}。`
    : '用户未选择额外输出选项，只生成当前核心结果。'
  const themeText = selectedThemeDirection ? `用户选择的主题方向：${selectedThemeDirection}。` : ''
  const uploadText = project.uploadedFiles?.length
    ? `用户上传了 ${project.uploadedFiles.length} 张产品或参考图。若其中包含产品主体，必须作为真实主体参考，保留产品身份、外形、颜色、材质、标识位置和可见细节。`
    : ''
  return [
    `${skill.displayName}生图提示词。`,
    `用户需求：${project.brief}`,
    `参考依据：${referenceNames}。`,
    themeText,
    deliveryText,
    uploadText,
    '生成一张精致、完整、商业可用的设计图：主体清晰，品牌识别强，构图干净，光影专业，材质细节明确。除非用户要求，不要额外生成无关文字；不要水印。',
  ].join('\n')
}

function isDetailPageSkill(skill) {
  if (skill?.name === 'ai-detail-page-skill') return true
  return skill?.name === 'detail-page-assistant' || skill?.displayName === '电商详情页设计专家'
}

function isLogoSkill(skill) {
  return (
    skill?.name === 'ai-brand-skill' ||
    skill?.displayName === '品牌logo设计' ||
    skill?.name === 'logook3' ||
    skill?.displayName === '品牌Logo设计专家'
  )
}

function isLogoProject(project, skill) {
  return isLogoSkill(skill) ||
    project?.skillId === 'local-brand-logo' ||
    project?.skillId === 'ai-brand-skill-local' ||
    project?.skillDisplayName === '品牌logo设计' ||
    project?.skillDisplayName === '品牌Logo设计专家'
}

function isProductImageSetSkill(skill) {
  return skill?.name === 'product-image-set-design-expert' || skill?.displayName === '电商套图设计专家'
}

function inferLogoDeliveryOptions(brief = '') {
  const text = String(brief || '')
  const sharedEmphasis = [
    { id: 'logo-emphasis-name', title: '突出品牌名字', description: '优先让品牌名和字形结构成为记忆点，适合名字本身有识别度的品牌。', selected: true },
    { id: 'logo-emphasis-industry', title: '突出行业属性', description: '让用户一眼理解品牌做什么，但不使用普通行业图标。', selected: false },
    { id: 'logo-emphasis-advantage', title: '突出核心优势', description: '围绕品质、效率、科技、天然、专业等核心卖点提炼视觉隐喻。', selected: false },
  ]
  const styleGroups = [
    {
      match: /茶|咖啡|饮|餐|食品|烘焙|甜品|酒|农|生鲜|调味/,
      styles: [
        { id: 'logo-style-oriental', title: '东方文化风', description: '适合茶饮、餐饮、文旅等品牌，从器物、自然或文化语感中提炼符号。', selected: true },
        { id: 'logo-style-friendly', title: '亲和年轻风', description: '适合新消费与社交传播，轮廓更轻松，记忆点更直接。', selected: false },
        { id: 'logo-style-premium', title: '精品质感风', description: '适合精品茶、咖啡、烘焙和高客单品牌，强调比例、留白和克制色彩。', selected: false },
        { id: 'logo-style-handcraft', title: '手作温度风', description: '适合有手作、在地、原料故事的品牌，保留自然但不做粗糙插画。', selected: false },
        { id: 'logo-style-modern', title: '现代简洁风', description: '适合连锁化与长期资产沉淀，结构清晰、落地稳定。', selected: false },
      ],
    },
    {
      match: /科技|智能|AI|软件|数据|云|SaaS|芯片|数码|电子|机器人|互联网/i,
      styles: [
        { id: 'logo-style-modern', title: '现代几何风', description: '适合科技与软件品牌，用几何结构、模块关系和清晰字标建立专业感。', selected: true },
        { id: 'logo-style-modular', title: '模块系统风', description: '适合数据、云、平台型产品，用单元、网格或连接关系表达系统能力。', selected: false },
        { id: 'logo-style-dynamic', title: '动势效率风', description: '适合工具、效率、智能硬件品牌，用路径、速度和秩序感表达性能。', selected: false },
        { id: 'logo-style-premium', title: '高可信专业风', description: '适合 B2B、企业服务和安全类品牌，强调稳重、比例和可信度。', selected: false },
      ],
    },
    {
      match: /美妆|护肤|香氛|美容|个护|医美|健康|母婴/,
      styles: [
        { id: 'logo-style-premium', title: '高级质感风', description: '适合护肤、美妆和香氛品牌，通过留白、字形和细节比例建立精致感。', selected: true },
        { id: 'logo-style-soft', title: '柔和亲肤风', description: '适合温和、天然、母婴或敏感肌方向，轮廓更柔和、气质更安全。', selected: false },
        { id: 'logo-style-science', title: '成分科技风', description: '适合功效型护肤与医美周边，用秩序、精密和克制几何表达专业。', selected: false },
        { id: 'logo-style-wordmark', title: '精致字标风', description: '适合名字好记的品牌，让字形、字距和品牌语气成为主要资产。', selected: false },
      ],
    },
    {
      match: /服装|服饰|潮牌|鞋|包|珠宝|配饰|生活方式|家居/,
      styles: [
        { id: 'logo-style-wordmark', title: '字标主导风', description: '适合服饰、生活方式和设计品牌，用字形气质建立辨识度。', selected: true },
        { id: 'logo-style-premium', title: '精品高街风', description: '适合高端、买手、珠宝和设计师品牌，强调比例、留白与克制。', selected: false },
        { id: 'logo-style-badge', title: '徽章符号风', description: '适合户外、运动、复古或社群属性品牌，强化标签感和应用性。', selected: false },
        { id: 'logo-style-friendly', title: '生活亲和风', description: '适合家居和日用生活方式品牌，表达温暖、易接近和可持续使用。', selected: false },
      ],
    },
    {
      match: /教育|儿童|亲子|培训|学校|文创|书店|出版/,
      styles: [
        { id: 'logo-style-friendly', title: '亲和成长风', description: '适合教育、亲子和儿童品牌，强调可信、温暖和成长感。', selected: true },
        { id: 'logo-style-story', title: '故事符号风', description: '适合文创、书店和内容品牌，从名称、角色或故事线索提炼符号。', selected: false },
        { id: 'logo-style-modern', title: '清晰专业风', description: '适合培训、学校和知识服务，结构稳、信息清楚、应用广。', selected: false },
        { id: 'logo-style-handcraft', title: '手绘温度风', description: '适合儿童、美育和手作课程，但需要保持商用识别度。', selected: false },
      ],
    },
  ]
  const matched = styleGroups.find((group) => group.match.test(text))
  const defaultStyles = [
    { id: 'logo-style-modern', title: '现代简洁风', description: '结构清晰、识别稳定，适合长期品牌资产和多场景落地。', selected: true },
    { id: 'logo-style-premium', title: '高级质感风', description: '强调比例、留白、字形和克制色彩，适合高端或精品品牌。', selected: false },
    { id: 'logo-style-friendly', title: '亲和年轻风', description: '更轻松、有社交传播感，适合新消费、生活方式和年轻客群。', selected: false },
    { id: 'logo-style-symbolic', title: '符号记忆风', description: '优先提炼独特图形符号，适合需要头像、图标和传播记忆点的品牌。', selected: false },
  ]
  return [...(matched?.styles || defaultStyles), ...sharedEmphasis]
}

const DETAIL_PAGE_LAYOUT_SYSTEM_RULES = [
  '详情页尺寸规则：头图/首屏主视觉使用固定宽高画布；后续详情页模块宽度固定，高度按内容密度选择短、中、长竖版，不要把所有信息强行塞进同一固定高度。',
  '生成单个详情页模块时，如果本屏文案、卖点、图示或说明较多，应主动采用更舒展的竖向内容流、分段信息区或上下分层，让阅读节奏自然，不要让标题、卖点、产品和图标挤在一起。',
  '参考花瓣灵感库上常见电商详情页排版：整套页面需要轮换多种构图，包括顶部大标题+下方场景、中心主视觉+环绕卖点、纵向叙事长图、斜切/对角动线、局部特写放大、卡片信息栅格、上下分区、全幅场景叠字、参数表/对比表、包装清单陈列。',
  '不要连续套用“左边文案右边图片”或“右边文案左边产品”的左右构图。左右分栏只能作为其中一种版式，不能成为整套详情页默认模板。',
  '每一屏只讲一个主要信息层级；如果内容超过一屏舒适承载，应拆成更高的详情页模块或减少同屏信息，而不是缩小文字和压缩间距。',
  '版式要保留充足留白、清晰阅读路径和明确主次；商品、人物、图标、参数和文案之间要有空间呼吸感。',
].join('\n')

function buildDetailPageGenerationRules({ project, directionTitle = '' }) {
  const uploadedCount = Array.isArray(project?.uploadedFiles) ? project.uploadedFiles.length : 0
  const brief = String(project?.brief || '')
  const isBeauty = /美妆|护肤|精华|面霜|乳液|防晒|香氛|个护|肌肤|皮肤|面膜|洗护/i.test(brief)
  const isFood = /食品|零食|饮料|冲饮|咖啡|茶饮|烘焙|果汁|调味|生鲜/i.test(brief)
  const isHome = /家居|收纳|百货|床品|厨具|清洁|卫浴|家具/i.test(brief)
  const isAppliance = /家电|吹风机|卷发|剃须刀|美容仪|电动|小家电|个护工具/i.test(brief)
  const isTech = /3C|数码|耳机|音箱|手机壳|支架|充电|键盘|显示器|接口|电池/i.test(brief)
  const isFashion = /服饰|鞋|包|穿搭|外套|内衣|饰品/i.test(brief)

  const categoryRule = isBeauty
    ? '品类偏向美妆护肤时，可使用肤感特写、皮肤状态、质地延展、成分氛围和人物局部来证明卖点，不要整套都只摆产品。'
    : isFood
      ? '品类偏向食品饮料时，可使用食材组合、食用氛围、口味联想、包装与内容物并置来增强食欲感和转化感。'
      : isHome
        ? '品类偏向家居百货时，可加入空间陈列、生活方式摆放、材质触感和使用前后状态，让页面更像真实生活场景。'
        : isAppliance
          ? '品类偏向小家电或个护工具时，可加入使用动作、结构拆解、功能步骤、配件组合和局部细节证明，不要只做静物摆拍。'
          : isTech
            ? '品类偏向3C数码时，可采用更规整的信息分区、接口或结构特写、性能图形化、暗背景高对比和横向模块化布局。'
            : isFashion
              ? '品类偏向服饰鞋包时，可使用上身效果、手持或佩戴状态、面料纹理、容量或版型说明，让人物与商品关系更明确。'
              : '根据品类自动切换详情页表达方式，使用场景、局部细节、结构特写、材质近景、人物互动或对比模块，不要套用单一美妆版式。'

  const angleRule = uploadedCount <= 1
    ? '当用户只上传一张产品角度图时，必须严格保留产品身份一致，但在不同详情页中主动扩展为合理的多角度和多景别，例如轻俯视、三分之四侧视、局部近景、手持视角、场景摆放视角；不要让每一页都和参考图角度一模一样。'
    : '当用户上传多张产品参考图时，优先在这些参考角度范围内做变化，保持不同页面的镜头差异，不要重复同一机位。'

  return [
    '这是电商详情页生图任务，不是单张广告海报。请按详情页模块思路组织画面，让不同页面的版式、镜头和信息重心拉开差异。',
    directionTitle ? `当前生成页面主题：${directionTitle}。页面构图和视觉证明方式要服务这个页面主题。` : '',
    '整套详情页至少要有版式变化：首屏主视觉、卖点证明页、场景页、细节页、对比页、包装/配件页不应长得一样。',
    '不要把所有页面都做成产品居中摆拍加几行文字。可以根据页面目标让产品作为主视觉、次视觉、局部细节或场景中的一部分。',
    '不要连续使用同一种图文模板，尤其不要每一页都固定成左边文字右边产品图。必须在左右分栏、上下分区、居中构图、局部放大、卡片分栏、留白型版式之间切换。',
    angleRule,
    categoryRule,
    '如果页面文案涉及肌肤、肤感、质地、舒适感、使用感、状态改善等内容，可以用人物皮肤状态、手部动作、局部肌理、生活场景或抽象功能视觉来辅助表达，但不要伪造医学级证明或用户未提供的数据。',
    '可以加入与品类相关的安全辅助元素，例如水波、织物、木台面、浴室台面、餐具、桌面光影、成分氛围、空间环境；前提是不改变商品本体，不暗示未确认的配件和变体。',
    '画面需要多样化：远景、中景、近景、俯视、侧视、局部裁切、分栏结构、对比结构、留白型版式都可以根据页面内容切换。',
  ].filter(Boolean).join('\\n')
}

function inferDetailPageSizeLegacy(brief = '') {
  return /桌面|desktop|pc|16:9/i.test(brief) ? '1536x864' : '1536x1152'
}

function inferDetailPageSize(brief = '') {
  const text = String(brief || '')
  if (/头图|首屏|hero|banner|主视觉|fixed\s*hero/i.test(text)) return '1536x864'
  if (/长图|详情长页|内容多|信息多|long|瀑布流|自然延展/i.test(text)) return '1024x1792'
  if (/短屏|单卖点|简洁|轻量/i.test(text)) return '1024x1364'
  return /妗岄潰|desktop|pc|16:9/i.test(text) ? '1536x864' : '1024x1536'
}

function inferProductImageSetSize(brief = '') {
  if (/1464\s*[×xX]\s*600|亚马逊\s*A\+|A\+\s*高级|全宽图/i.test(brief)) return '1536x640'
  if (/9\s*[:：]\s*16|竖屏|长图/i.test(brief)) return '1024x1792'
  if (/16\s*[:：]\s*9|宽幅|横版展示/i.test(brief)) return '1536x864'
  if (/3\s*[:：]\s*4|竖版商品图/i.test(brief)) return '1024x1364'
  if (/4\s*[:：]\s*3|横版/i.test(brief)) return '1536x1152'
  if (/1\s*[:：]\s*1|方图/i.test(brief)) return '1024x1024'
  return '1024x1536'
}

function buildLogoPrompt({ project, selectedThemeDirection = '', selectedDeliveries = [] }) {
  const deliveryText = selectedDeliveries.length
    ? `用户选择的 Logo 风格/重点方向：${selectedDeliveries.map((item) => `${item.title}（${item.description}）`).join('、')}`
    : ''
  const languageRule = /[a-zA-Z]/.test(project.brief) && /[\u4e00-\u9fff]/.test(project.brief)
    ? '品牌名包含中英文时，优先使用全新 ImageV2 类生成逻辑；画面中准确呈现中英文组合关系。'
    : /[a-zA-Z]/.test(project.brief)
      ? '品牌名为英文或包含英文时，优先使用全新 ImageV2 类生成逻辑，文字应清晰可读。'
      : '品牌名为中文时，使用标准图片模型逻辑，中文笔画要清晰、结构稳定。'
  return [
    '品牌 Logo 设计工作流：先分析品牌名称、品牌行业、产品或服务、目标用户、品牌定位和核心优势，再根据用户选择的风格方向与重点突出信息，生成可用于品牌识别的扁平矢量 Logo。',
    `用户需求：${project.brief}`,
    deliveryText,
    selectedThemeDirection ? `用户选择方向：${selectedThemeDirection}` : '',
    languageRule,
    '强制要求：扁平矢量标志、干净线条、清晰边缘、适合缩放、符合专业品牌识别系统。',
    '画布要求：必须是纯白背景或透明背景效果，Logo 居中展示，周围留出干净安全边距；不要生成任何装饰性背景。',
    '禁止：三维渲染、写实摄影、复杂阴影、厚重质感、复杂纹理、过度渐变、样机背景、水印、蓝色科技背景、发光光晕、径向渐变底色、舞台光、烟雾、空间感背景。',
    'Logo 应适合小尺寸和大尺寸使用，能在白底、透明底、黑白版本中成立。',
    '如果用户要求元素很多，优先保留 1-2 个核心元素，用负形、几何融合或字母/汉字结构融合表达。',
  ].filter(Boolean).join('\n')
}

function logoDirection({ project, selectedDeliveries = [], selectedThemeDirection = '', providerError = '' }) {
  const positive = buildLogoPrompt({ project, selectedDeliveries, selectedThemeDirection })
  const selectedIds = new Set(selectedDeliveries.map((item) => item.id))
  if (selectedDeliveries.some((item) => item.id.startsWith('logo-style-') || item.id.startsWith('logo-emphasis-'))) {
    const styleItems = selectedDeliveries.filter((item) => item.id.startsWith('logo-style-'))
    const emphasisItems = selectedDeliveries.filter((item) => item.id.startsWith('logo-emphasis-'))
    const emphasisText = emphasisItems.length
      ? `重点突出：${emphasisItems.map((item) => item.title.replace(/^突出/, '')).join('、')}。`
      : '重点在品牌名称、行业识别和核心优势之间保持平衡。'
    let directions = styleItems.map((item) => ({
      id: item.id,
      title: item.title.replace(/风$/, '方向'),
      description: `${item.description}${emphasisText}`,
    }))
    if (!directions.length) {
      directions = inferLogoDeliveryOptions(project.brief)
        .filter((item) => item.id.startsWith('logo-style-'))
        .slice(0, 3)
        .map((item) => ({
          id: item.id,
          title: item.title.replace(/风$/, '方向'),
          description: `${item.description}${emphasisText}`,
        }))
    }
    return {
      message: `已根据品牌基础信息规划 ${directions.length} 个 Logo 风格方向。你可以选择单个方向生图，也可以多选方向批量生成进行比较。`,
      directions,
      imagePrompt: {
        positive,
        negative:
          '三维效果，写实摄影，样机展示，复杂阴影，浮雕，厚重质感，纹理叠加，杂乱背景，字体混乱，文字不可读，品牌文字错误，水印，签名，插画场景，蓝色科技背景，发光光晕，径向渐变背景，渐变底色，舞台光，烟雾，空间背景，背景纹理',
        size: '1024x1024',
      },
      providerError,
      nextAction: 'confirm_direction',
    }
  }
  const directions = []
  if (selectedIds.size === 0 || selectedIds.has('logo-concepts')) {
    directions.push(
      {
        id: 'logo-classic',
        title: '方案 A 经典稳妥',
        description: '更接近成熟品牌识别，结构清晰、行业适配强，适合长期使用。',
      },
      {
        id: 'logo-modern',
        title: '方案 B 现代记忆点',
        description: '更强调独特图形、负形融合或当代感，适合年轻化和传播场景。',
      },
      {
        id: 'logo-minimal',
        title: '方案 C 极简纯粹',
        description: '最大程度简化元素，强调小尺寸识别、可扩展和高级感。',
      },
    )
  }
  const extraDirections = [
    ['logo-symbol', '图形标', '提炼无文字 symbol / icon mark，可独立用于头像、favicon、印章和社媒图标。'],
    ['logo-wordmark', '文字标', '只围绕品牌名称做字形、笔画、字距和文字气质设计。'],
    ['logo-combination', '组合标', '生成图形 + 文字的组合标，可拆分为图形标和文字标独立使用。'],
    ['logo-colorways', '配色变体', '生成主色、黑白、反白或行业配色版本，保持同一 Logo 结构。'],
    ['logo-usage', '应用预览', '把已确定的 Logo 放入门头、包装、头像或名片等应用场景中预览。'],
  ]
  for (const [id, title, description] of extraDirections) {
    if (selectedIds.has(id)) directions.push({ id, title, description })
  }
  return {
    message: `已按品牌 Logo Skill 规划为 ${directions.length} 个扁平矢量输出方向。你可以生成当前方向，也可以生成全部方向。`,
    directions,
    imagePrompt: {
      positive,
      negative:
        '三维效果，写实摄影，样机展示，复杂阴影，浮雕，厚重质感，纹理叠加，杂乱背景，字体混乱，文字不可读，品牌文字错误，水印，签名，插画场景，蓝色科技背景，发光光晕，径向渐变背景，渐变底色，舞台光，烟雾，空间背景，背景纹理',
      size: '1024x1024',
    },
    providerError,
    nextAction: 'confirm_direction',
  }
}

function inferSellingPoints(brief = '') {
  const match = brief.match(/(?:核心卖点|卖点|重点|突出|主打)[:：是为]?\s*([^\n。]+)/)
  const source = match?.[1] || ''
  const points = source
    .split(/[、,，;；/]/)
    .map((item) => item.trim())
    .filter((item) => item && !/^\d+\s*张$/.test(item))
    .slice(0, 6)
  return points.length ? points : ['核心卖点', '使用场景', '材质细节']
}

function inferImageCount(brief = '', sellingPoints = []) {
  const match = brief.match(/(?:做|生成|出|需要)?\s*(\d{1,2})\s*张/)
  if (match) return Math.min(Math.max(Number(match[1]), 1), 8)
  return Math.min(Math.max(sellingPoints.length + 1, 3), 6)
}

function sellingPointPageType(point = '', index = 0) {
  if (/润|肤|保湿|补水|舒缓|修护|抗皱|美白|提亮|细腻|柔嫩|舒适|亲肤|香氛|口感|清爽/.test(point)) {
    return {
      title: '结果/体验证明页',
      description: `围绕「${point}」展示使用后的结果状态、人物体验、皮肤/质感/情绪变化或场景化利益证明；商品不必占据主视觉，可弱露出或作为使用关系的一部分。`,
    }
  }
  if (/防水|防漏|耐用|抗摔|承重|高温|低温|防尘|安全|保护/.test(point)) {
    return {
      title: '功能证明页',
      description: `围绕「${point}」用测试场景、分区对比、状态证明或环境压力表现功能可信度；不要只做静物摆拍。`,
    }
  }
  if (/快充|续航|容量|功率|速度|降噪|高清|智能|传输|蓝牙|连接/.test(point)) {
    return {
      title: '功能可视化页',
      description: `围绕「${point}」用光效轨迹、界面化信息、参数层级或使用场景可视化功能价值；参数不明确时只做概念化表达。`,
    }
  }
  const fallbackTypes = [
    {
      title: '卖点利益页',
      description: `围绕「${point}」展示购买利益和实际使用价值，构图与主视觉明显区分。`,
    },
    {
      title: '使用场景页',
      description: `围绕「${point}」放入真实使用场景或人物关系中表达，不要只做产品陈列。`,
    },
    {
      title: '局部证明页',
      description: `围绕「${point}」用局部特写、材质细节或功能细节证明卖点。`,
    },
  ]
  return fallbackTypes[index % fallbackTypes.length]
}

function buildProductImageSetPrompt({ project, selectedReferences, selectedThemeDirection = '' }) {
  const referenceNames = selectedReferences.map((reference) => reference.title).join('、') || '技能说明'
  const size = inferProductImageSetSize(project.brief)
  const uploadText = project.uploadedFiles?.length
    ? `用户上传了 ${project.uploadedFiles.length} 张图片。先区分商品图、风格图和 logo 图；商品图必须作为真实商品主体参考，保留外观、包装、结构、材质、颜色、logo/文字位置和可见细节。`
    : '用户尚未上传商品图；如果需要真实商品还原，应先上传商品图。'
  return [
    '电商套图设计专家工作流：分析商品图，确认卖点、生成语言和比例，为每个卖点规划画面方案，并统一整组视觉风格。',
    `用户需求：${project.brief}`,
    `已选择的方向资料：${referenceNames}`,
    selectedThemeDirection ? `用户选择的整体方向：${selectedThemeDirection}` : '',
    uploadText,
    `生成尺寸：${size}。必须按该比例组织画面，不要默认方图。`,
    '整套图必须像同一套电商页面系统：背景体系、光影系统、文字系统、色彩系统和品牌气质统一；不同图片可以有主视觉页、卖点页、场景页、细节页、对比页、配件页等不同页型。',
    '所有用于图像生成的描述必须使用简体中文。不要使用英文 prompt 开场句，不要使用英文标签式结构。画面中文字可按用户指定语言生成。',
    '不要编造商品不具备的参数、认证、接口、配件或功能。无法确认的信息应弱化或回避。',
  ].filter(Boolean).join('\n')
}

function buildDetailPagePrompt({ project, selectedReferences, selectedThemeDirection = '' }) {
  const referenceNames = selectedReferences.map((reference) => reference.title).join('、') || '技能说明'
  const size = inferDetailPageSize(project.brief)
  const terminal = size === '1536x864' ? '桌面端 16:9 横向详情页模块' : '手机端 4:3 横向详情页模块'
  const uploadText = project.uploadedFiles?.length
    ? `用户上传了 ${project.uploadedFiles.length} 张产品图。每个详情页模块都要把这些图片作为准确商品主体参考，但产品角度、朝向和透视可以按当前版式、卖点和画面空间合理调整。`
    : '用户尚未上传产品图；如果需要商品高度还原，应先上传产品图。'
  return [
    '电商详情页设计专家工作流：完成详情页结构规划、卖点提炼、版块布局和视觉呈现。',
    `用户需求：${project.brief}`,
    `匹配的参考资料或模板：${referenceNames}。`,
    selectedThemeDirection ? `用户选择的主题方向：${selectedThemeDirection}。` : '',
    uploadText,
    `画布规格：${terminal}。使用横向详情页版块构图，不要做成方形图标或普通海报。`,
    '规划并生成多张详情页模块。每张图都应该是完整的电商详情页版块，包含商品导向的商业版式、清晰的标题或卖点文案空间、专业商品呈现和统一视觉系统。',
    '保留上传产品图中的真实商品身份：外形、颜色、材质、标识或文字位置、配件和可见细节；不要照搬参考图角度，可根据详情页画面需要调整为正面、侧面、俯视、局部特写或透视角度。',
    '不要只生成一张泛化海报。除非某个局部模块明确需要方形内图区，否则不要使用一比一方图。',
  ].filter(Boolean).join('\n')
}

function detailPageDirection({ project, selectedReferences, selectedThemeDirection = '', providerError = '' }) {
  const positive = buildDetailPagePrompt({ project, selectedReferences, selectedThemeDirection })
  const sellingPointMatch = project.brief.match(/(?:核心卖点|卖点|重点突出)[:：]?\s*([^\n。；;]+)/)
  const sellingPoints = sellingPointMatch
    ? sellingPointMatch[1].split(/[、,，;；/]/).map((item) => item.trim()).filter(Boolean).slice(0, 5)
    : ['核心卖点一', '核心卖点二', '核心卖点三']
  const directions = [
    {
      id: 'detail-hero',
      title: '第 1 屏 首屏主文案',
      description: '确认详情页首屏主标题、商品定位、第一转化卖点和辅助短句。',
    },
    ...sellingPoints.map((point, index) => ({
      id: `detail-selling-${index + 1}`,
      title: `第 ${index + 2} 屏 卖点文案 · ${point}`,
      description: `确认围绕「${point}」这一屏要表达的主标题、利益点说明和画面文案层级。`,
    })),
    {
      id: 'detail-spec',
      title: `第 ${sellingPoints.length + 2} 屏 参数/规格文案`,
      description: '确认规格、成分、参数、尺寸或性能说明；没有明确资料时不编造数据。',
    },
    {
      id: 'detail-angle',
      title: `第 ${sellingPoints.length + 3} 屏 细节文案`,
      description: '确认商品细节、局部特写、多角度或材质工艺这一屏的说明文案。',
    },
    {
      id: 'detail-package',
      title: `第 ${sellingPoints.length + 4} 屏 包装/清单文案`,
      description: '确认包装清单、配件、赠品或套装内容；没有明确资料时只做氛围说明。',
    },
    {
      id: 'detail-proof',
      title: `第 ${sellingPoints.length + 5} 屏 信任背书文案`,
      description: '确认服务保障、品牌背书或购买理由这一屏的文案；不编造认证。',
    },
  ]
  return {
    message: '已按电商详情页 Skill 拆成多屏详情页文案。请确认每一屏文案和总提示词后再生成。',
    directions,
    imagePrompt: {
      positive,
      negative:
        '单个方形图标，只有孤立产品，普通海报，低质量，模糊，商品外形错误，标识变形，文字混乱不可读，水印，无关商品，手机截图式竖图',
      size: inferDetailPageSize(project.brief),
    },
    providerError,
    nextAction: 'confirm_direction',
  }
}

function productImageSetDirection({ project, selectedReferences, selectedThemeDirection = '', providerError = '' }) {
  const positive = buildProductImageSetPrompt({ project, selectedReferences, selectedThemeDirection })
  const sellingPoints = inferSellingPoints(project.brief)
  const count = inferImageCount(project.brief, sellingPoints)
  const pageTypes = [
    {
      id: 'set-hero',
      title: '第 1 张 主视觉陈列页',
      description: '突出商品主体、品类定位和第一购买理由，建立整套商品图的视觉母系统。',
    },
    ...sellingPoints.map((point, index) => {
      const pageType = sellingPointPageType(point, index)
      return {
        id: `set-selling-${index + 1}`,
        title: `第 ${index + 2} 张 ${pageType.title} · ${point}`,
        description: `${pageType.description} 保持同一套背景、光影、文字和品牌视觉系统。`,
      }
    }),
    {
      id: 'set-scene',
      title: `第 ${sellingPoints.length + 2} 张 使用场景图`,
      description: '展示商品在真实或商业化场景中的使用关系、目标人群和氛围。',
    },
    {
      id: 'set-detail',
      title: `第 ${sellingPoints.length + 3} 张 细节/材质图`,
      description: '展示材质、结构、包装、接口、局部工艺或关键细节。',
    },
    {
      id: 'set-comparison',
      title: `第 ${sellingPoints.length + 4} 张 对比/参数图`,
      description: '展示可确认的参数、规格、对比关系或功能说明，不编造未经确认的信息。',
    },
    {
      id: 'set-package',
      title: `第 ${sellingPoints.length + 5} 张 配件/清单图`,
      description: '展示包装清单、配件、组合内容或套装陈列；缺少素材时弱化具体配件。',
    },
  ]
  const directions = pageTypes.slice(0, count)
  return {
    message: `我先按电商套图 Skill 把整组图拆成 ${directions.length} 张：主视觉、卖点页、场景或细节页会共用同一套视觉基调。确认后可以批量生成整套图。`,
    directions,
    imagePrompt: {
      positive,
      negative:
        '低质量，模糊，商品外观错误，商品颜色错误，logo变形，文字乱码，水印，多个无关商品，脱离上传商品图，整套风格不统一，比例错误，默认方图，编造不存在的参数或配件',
      size: inferProductImageSetSize(project.brief),
    },
    providerError,
    nextAction: 'confirm_direction',
  }
}

function fallbackDirection({ skill, project, selectedReferences, selectedDeliveries = [], selectedThemeDirection = '' }) {
  if (isLogoSkill(skill)) {
    return logoDirection({ project, selectedDeliveries, selectedThemeDirection })
  }
  if (isDetailPageSkill(skill)) {
    return detailPageDirection({ project, selectedReferences, selectedThemeDirection })
  }
  if (isProductImageSetSkill(skill)) {
    return productImageSetDirection({ project, selectedReferences, selectedThemeDirection })
  }
  const positive = buildPrompt({ skill, project, selectedReferences, selectedDeliveries, selectedThemeDirection })
  return {
    message: '已根据你确认的参考资料生成第一版方向和提示词。配置智能推理后，这一步会继续自动分析并优化方向。',
    directions: [
      {
        id: 'core',
        title: '主方向',
        description: `以 ${skill.displayName} 的核心流程为主，结合已选参考资料输出稳妥方案。`,
      },
      {
        id: 'expressive',
        title: '强化记忆点',
        description: '优先放大品牌符号、角色轮廓和材质识别度，适合需要更强传播感的画面。',
      },
      {
        id: 'commercial',
        title: '商业落地',
        description: '优先考虑可用于电商、社媒或提案展示的干净构图和可复用视觉语言。',
      },
    ],
    imagePrompt: {
      positive,
      negative:
        '低质量，模糊，构图混乱，肢体变形，多余肢体，标识文字错误，水印，签名，过曝，欠曝',
      size: '1024x1024',
    },
    nextAction: 'confirm_direction',
  }
}

async function callOpenAIImage({ settings, prompt, size, referenceImageUrl = '', referenceImageUrls = [], promptMaxChars = 2600, skipGenericReferenceInstruction = false, disablePromptCompression = false }) {
  const timing = settings?.__timing
  const openai = settings?.openai
  if (!openai?.apiKey) {
    const error = new Error('请先配置图片生成接口密钥后再生图。')
    error.status = 400
    throw error
  }

  const allReferenceImageUrls = [
    ...referenceImageUrls,
    referenceImageUrl,
  ].filter(Boolean)
  const uniqueReferenceImageUrls = [...new Set(allReferenceImageUrls)]

  const referenceInstruction = uniqueReferenceImageUrls.length && !skipGenericReferenceInstruction
    ? '\n把随请求传入的图片作为严格视觉参考。若是产品图，必须保留真实产品外形、比例、颜色、材质、标识或文字位置和可见细节；不得重新设计、替换为相似款、简化细节或把参考图只当灵感。若是已生成图片，保持主体、构图和风格连续，不要换成无关产品。'
    : ''
  const rawPrompt = `${prompt}${referenceInstruction}`
  const compactPrompt = disablePromptCompression ? rawPrompt : compactImagePrompt(rawPrompt, promptMaxChars)
  const imageModel = (openai.imageModel || 'gpt-image-2').trim()
  if (/^gpt-5(?:[.-]|$)/i.test(imageModel)) {
    const error = new Error(`生图模型需要填写图像模型，例如 gpt-image-2；当前填写的是文本模型 ${imageModel}。`)
    error.status = 400
    throw error
  }
  const payload = {
    model: imageModel,
    prompt: compactPrompt,
    size: size || '1024x1024',
    n: 1,
  }
  const referenceFiles = uniqueReferenceImageUrls.map(resolveProjectFile).filter(Boolean)
  if (referenceFiles.length) {
    const editCandidates = resolveOpenAIImageEditCandidates(openai.baseURL)
    const imageFiles = []
    let editLastError = null
    try {
      for (const file of referenceFiles) {
        const buffer = await fs.readFile(file)
        imageFiles.push({
          file,
          buffer,
        })
      }
      timing?.mark('image-api references loaded', {
        referenceCount: imageFiles.length,
        referenceBytes: imageFiles.reduce((total, item) => total + item.buffer.length, 0),
      })
    } catch (error) {
      editLastError = error
      imageFiles.length = 0
      timing?.mark('image-api reference load failed', { message: error?.message || String(error) })
    }

    if (imageFiles.length) {
      for (const endpoint of editCandidates) {
        const form = new FormData()
        form.append('model', payload.model)
        form.append('prompt', payload.prompt)
        form.append('size', payload.size)
        form.append('n', String(payload.n))
        for (const imageFile of imageFiles) {
          form.append('image', new Blob([imageFile.buffer], { type: mimeFromFileName(imageFile.file) }), path.basename(imageFile.file))
        }
        timing?.mark('image-api request start', {
          endpoint,
          model: payload.model,
          size: payload.size,
          promptChars: payload.prompt.length,
          referenceCount: imageFiles.length,
        })

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openai.apiKey}`,
          },
          body: form,
        })
        timing?.mark('image-api response received', { endpoint, status: response.status })
        const contentType = response.headers.get('content-type') || ''
        const text = await response.text()
        timing?.mark('image-api response body read', { endpoint, bodyChars: text.length })
        const trimmed = text.trim()
        let data = null
        if (trimmed && (contentType.includes('application/json') || trimmed.startsWith('{') || trimmed.startsWith('['))) {
          try {
            data = JSON.parse(trimmed)
          } catch {
            data = null
          }
        }
        if (response.ok && data) {
          return data
        }
        const detail = data?.error?.message || data?.message || providerErrorMessage(trimmed, response.status)
        editLastError = new Error(`HTTP ${response.status}: ${detail}`)
        if (![400, 404, 405, 422].includes(response.status)) {
          throw editLastError
        }
      }
    }

    throw new Error(`参考图没有成功传入图片生成模型，请检查图像接口是否支持参考图/图片编辑。${editLastError?.message ? `接口返回：${editLastError.message}` : ''}`)
  }

  const candidates = resolveOpenAIImageCandidates(openai.baseURL)
  let lastError = null

  for (const endpoint of candidates) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openai.apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    const contentType = response.headers.get('content-type') || ''
    const text = await response.text()
    const trimmed = text.trim()
    let data = null
    if (trimmed && (contentType.includes('application/json') || trimmed.startsWith('{') || trimmed.startsWith('['))) {
      try {
        data = JSON.parse(trimmed)
      } catch {
        data = null
      }
    }

    if (response.ok && data) {
      return data
    }

    const detail =
      data?.error?.message ||
      data?.message ||
      providerErrorMessage(trimmed, response.status)

    lastError = new Error(`HTTP ${response.status}: ${detail}`)

    if (![400, 404, 405, 422].includes(response.status)) {
      throw lastError
    }
  }

  throw lastError || new Error('图片生成接口请求失败。')
}

async function analyzeReferenceImages({ settings, imageUrls = [], taskContext = '' }) {
  const openai = settings?.openai
  if (!openai?.apiKey || !imageUrls.length) return ''
  const files = [...new Set(imageUrls)].map(resolveProjectFile).filter(Boolean).slice(0, 6)
  if (!files.length) return ''
  const images = []
  for (const file of files) {
    try {
      const buffer = await fs.readFile(file)
      images.push({
        file,
        mime: mimeFromFileName(file),
        dataUrl: `data:${mimeFromFileName(file)};base64,${buffer.toString('base64')}`,
      })
    } catch {
      // Ignore unreadable references; generation will still use the files if possible.
    }
  }
  if (!images.length) return ''

  const base = normalizeOpenAIBaseURL(openai.baseURL)
  const modelCandidates = [
    openai.visionModel,
    openai.reasoningModel,
    'gpt-4.1-mini',
    'gpt-4o-mini',
  ].filter(Boolean)
  const instruction = [
    '请读取用户上传的样机/场景参考图，并输出可直接写入生图提示词的中文分析。',
    '重点提取：1) 场景类型和行业品类；2) 构图关系和镜头视角；3) 材质、表面、道具；4) 光影、色调、氛围；5) 可以借鉴的设计语言；6) 不能复制的品牌标识、文字或水印。',
    '不要泛泛而谈，必须描述图中看得见的具体元素。输出 6-10 条短句。',
    `本次生成任务：${taskContext || 'Logo 样机应用图'}`,
  ].join('\n')
  let lastError = null

  for (const model of modelCandidates) {
    const responsesEndpoint = `${base}/responses`
    try {
      const response = await fetch(responsesEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openai.apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: [
            {
              role: 'user',
              content: [
                { type: 'input_text', text: instruction },
                ...images.map((image) => ({ type: 'input_image', image_url: image.dataUrl })),
              ],
            },
          ],
          max_output_tokens: 800,
        }),
        signal: AbortSignal.timeout(45000),
      })
      const text = await response.text()
      let data = null
      try {
        data = text ? JSON.parse(text) : null
      } catch {
        data = { raw: text }
      }
      if (response.ok) {
        const summary = extractResponseText(data)
        if (summary) return summary
      }
      lastError = new Error(data?.error?.message || data?.message || providerErrorMessage(text, response.status))
    } catch (error) {
      lastError = error
    }

    const chatEndpoint = `${base}/chat/completions`
    try {
      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openai.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: instruction },
                ...images.map((image) => ({ type: 'image_url', image_url: { url: image.dataUrl } })),
              ],
            },
          ],
          max_tokens: 800,
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(45000),
      })
      const text = await response.text()
      let data = null
      try {
        data = text ? JSON.parse(text) : null
      } catch {
        data = { raw: text }
      }
      if (response.ok) {
        const summary = data?.choices?.[0]?.message?.content?.trim()
        if (summary) return summary
      }
      lastError = new Error(data?.error?.message || data?.message || providerErrorMessage(text, response.status))
    } catch (error) {
      lastError = error
    }
  }

  return `参考图解析暂不可用：${lastError?.message || '视觉模型未返回内容'}。仍必须尽量依据随请求传入的参考图进行生成，不要把参考图当作可选灵感。`
}

async function analyzeUploadedMergeAngleReference({ settings, file }) {
  const openai = settings?.openai
  if (!openai?.apiKey || !file?.buffer) return ''
  const base = normalizeOpenAIBaseURL(openai.baseURL)
  const mime = file.mimetype || mimeFromFileName(file.originalname || 'angle-reference.png')
  const dataUrl = `data:${mime};base64,${file.buffer.toString('base64')}`
  const modelCandidates = [
    openai.visionModel,
    openai.reasoningModel,
    'gpt-4.1-mini',
    'gpt-4o-mini',
  ].filter(Boolean)
  const instruction = [
    'USER-UPLOADED ANGLE ANALYSIS PROMPT. Analyze this uploaded angle reference image only as a universal pose/composition template for an ecommerce product shoe composite.',
    'This is a dedicated first stage for user-uploaded angle images only. It must not change or describe any angle-library prompt. The uploaded angle image controls composition, pose, shoe count, shoe placement, shoe direction, camera angle, crop, perspective, scale, overlap, occlusion, and body-to-shoe relationship only. It must not control final shoe design, clothing design, background style, material, color palette, brand, text, or product identity.',
    'Return concise generation-ready notes in English for the second-stage generation prompt. Make the notes useful for many kinds of uploaded angle references: color-block masks, real photos, sketches, layout guides, or mixed references.',
    'First decide the reference type. If it is a color-block mask, use this strict mapping: red = clothing area, blue = leg/body-limb area, yellow = product shoe area, black = background/empty environment area. If it is not a mask, infer equivalent roles from visible shoes, feet, legs, clothing, hands, crop, and camera perspective.',
    'Object-count rule: count real main shoe objects from the overall visual intent, not from disconnected color fragments. Shoe straps, buckles, openings, toe gaps, heel gaps, lace gaps, stitching lines, inner shadows, black holes inside a yellow shoe, thin dividing lines, and separated yellow accessory pieces belong to the nearest main shoe and must not be counted as extra shoes. Explicitly state the intended main shoe count when possible, and warn not to invent or delete shoes.',
    'Region-boundary rule for masks: internal black marks or holes enclosed by a yellow shoe are shoe openings, strap gaps, inner shadows, or product-detail gaps, not background. Only the large exterior black/empty canvas areas are background. Thin internal lines should guide detail or occlusion but must not split one shoe into multiple objects.',
    'For every region/object type, describe placement, approximate size, main outline, direction, crop, overlap, occlusion, and touch/connection relationships. Emphasize that clothing should stay in red/clothing areas, legs/body limbs in blue/body areas, shoes in yellow/shoe areas, and background in black/environment areas when a mask exists.',
    'For each main shoe object, analyze worn-vs-display-vs-handheld status, toe direction, heel direction, rotation, left-foot/right-foot inference, foot contact, perspective, scale, and whether it connects to a leg/ankle/foot/hand region. Yellow/shoe areas control only placement, angle, direction, scale, perspective, and occlusion; final shoe design must come from the product shoe image.',
    'Infer the mandatory body-facing direction from the shoe toe/heel direction and limb geometry. If the reference indicates shoes pointing right, say generated shoes, feet/ankles, and lower body must face or move right only. If left, front, back, top-down, side-view, seated, walking, crossed-leg, standing, handheld, or ground-display, preserve that exact direction and relationship. Explicitly forbid flipping, reversing, rotating to another camera side, swapping left/right, or reinterpreting the body direction.',
    'For body regions, identify them by silhouette as legs, ankles, feet, arms, hands, wrists, or cropped lower body when possible. Describe limb posture, joint direction, crop, body entry direction, and relationship to each shoe. If a shoe is not connected to a limb, say not to add an extra limb.',
    'For clothing regions, describe only placement boundaries and body relationship, not fashion style. Clothing style, color, and fabric must come from the model reference image during generation.',
    'For background/environment areas, describe only visible placement, contact points, and perspective zones that already exist in the uploaded background image. Background details must come from the uploaded background image during generation.',
    'Mention lower-body-only framing: no head, face, portrait, or full upper body unless explicitly required by the uploaded angle image crop; keep the final composition focused on product shoes, feet, legs, hands if present, and only required clothing portions.',
    'Do not describe shoe design, outfit color, fabric, final background style, brand, text, watermark, or semantic mask colors as final visual content. State that mask colors, labels, and color-block edges must not appear in the final image.',
  ].join('\n')
  let lastError = null

  for (const model of modelCandidates) {
    const responsesEndpoint = `${base}/responses`
    try {
      const response = await fetch(responsesEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openai.apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: [
            {
              role: 'user',
              content: [
                { type: 'input_text', text: instruction },
                { type: 'input_image', image_url: dataUrl },
              ],
            },
          ],
          max_output_tokens: 700,
        }),
        signal: AbortSignal.timeout(45000),
      })
      const text = await response.text()
      let data = null
      try {
        data = text ? JSON.parse(text) : null
      } catch {
        data = { raw: text }
      }
      if (response.ok) {
        const summary = extractResponseText(data)
        if (summary) return summary.slice(0, 1800)
      }
      lastError = new Error(data?.error?.message || data?.message || providerErrorMessage(text, response.status))
    } catch (error) {
      lastError = error
    }

    const chatEndpoint = `${base}/chat/completions`
    try {
      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openai.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: instruction },
                { type: 'image_url', image_url: { url: dataUrl } },
              ],
            },
          ],
          max_tokens: 700,
          temperature: 0.15,
        }),
        signal: AbortSignal.timeout(45000),
      })
      const text = await response.text()
      let data = null
      try {
        data = text ? JSON.parse(text) : null
      } catch {
        data = { raw: text }
      }
      if (response.ok) {
        const summary = data?.choices?.[0]?.message?.content?.trim()
        if (summary) return summary.slice(0, 1800)
      }
      lastError = new Error(data?.error?.message || data?.message || providerErrorMessage(text, response.status))
    } catch (error) {
      lastError = error
    }
  }

  console.warn('[merge-angle-smart-analysis] unavailable', lastError?.message || lastError)
  return ''
}

async function callOpenAIImageWithRetry(args, maxAttempts = 3) {
  let lastError = null
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await callOpenAIImage(args)
    } catch (error) {
      lastError = error
      if (attempt >= maxAttempts || !isRetryableImageError(error)) {
        throw error
      }
      const waitMs = 2200 * attempt
      args?.settings?.__timing?.mark?.('image-api retry scheduled', {
        attempt,
        nextAttempt: attempt + 1,
        waitMs,
        message: String(error?.message || error || ''),
      })
      await new Promise((resolve) => setTimeout(resolve, waitMs))
    }
  }
  throw lastError || new Error('图片生成接口请求失败。')
}

function fallbackAnalyze({ skill, brief, uploadedFiles = [] }) {
  const ranked = skill.references
    .map((reference) => ({
      ...reference,
      score: scoreReference(reference, `${skill.displayName} ${skill.description} ${brief}`),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  return {
    message: uploadedFiles.length
      ? isMergeImageSkillId(skill.id || skill.name)
        ? `已收到 ${uploadedFiles.length} 张图片，并按 AI产品背景融合 读取为三图流程：\n${describeMergeImageUploadedFiles(uploadedFiles)}\n\n当前使用本地规则挑选参考资料。`
        : `已收到 ${uploadedFiles.length} 张参考图，并读取 ${skill.displayName} 的技能说明。当前使用本地规则挑选参考资料。`
      : `已读取 ${skill.displayName} 的技能说明。当前使用本地规则挑选参考资料。`,
    selectedReferences: ranked.map((reference) => ({
      file: reference.file,
      title: reference.title,
      reason: reference.summary || '与当前技能和需求关键词相关。',
      score: reference.score,
    })),
    confirmation: {
      title: '确认这些参考资料后继续',
      description: '配置智能推理后，这一步会自动分析参考资料并给出选择理由。',
      options: [
        '稳妥主方向',
        '强化记忆点方向',
        '商业落地方向',
      ],
    },
    inferredChoices: fallbackInferredChoices(skill, brief),
    nextAction: 'confirm_references',
  }
}

function fallbackBriefChat({ skill, currentBrief = '', userMessage = '' }) {
  const mergedBrief = [currentBrief, userMessage]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join('\n')
  const checklist = skill.guidance?.checklist || []
  const missing = checklist.filter((item) => !new RegExp(`${item}\\s*[：:]`).test(mergedBrief)).slice(0, 3)
  const message = missing.length
    ? `我先把你的补充整理进需求里。为了让「${skill.displayName}」更准确，建议再补充：${missing.join('、')}。`
    : `这次需求对「${skill.displayName}」已经比较完整，可以发送给技能进入参考资料和方向分析。`
  return {
    message,
    updatedBrief: mergedBrief,
    missingFields: missing,
    readyToAnalyze: missing.length === 0,
  }
}

async function callOpenAITransparentEdit({ settings, prompt, referenceImageUrl, size = '512x512' }) {
  const openai = settings?.openai
  if (!openai?.apiKey) {
    const error = new Error('请先配置图片生成接口密钥后再抠图。')
    error.status = 400
    throw error
  }
  const localPath = resolveProjectFile(referenceImageUrl)
  if (!localPath) {
    const error = new Error('无效的参考图片。')
    error.status = 400
    throw error
  }
  const model = (openai.imageModel || 'gpt-image-2').trim()
  if (/^gpt-5(?:[.-]|$)/i.test(model)) {
    const error = new Error(`抠图需要使用图片生成模型；当前填写的是文本模型 ${model}。请在 GPT 生图配置里填写你的图片模型。`)
    error.status = 400
    throw error
  }
  const editCandidates = resolveOpenAIImageEditCandidates(openai.baseURL)
  const imageBuffer = await fs.readFile(localPath)
  const compactPrompt = compactImagePrompt(prompt)
  const transparentSupportKey = `${normalizeOpenAIBaseURL(openai.baseURL)}::${model}`
  const transparentSupport = transparentOptionSupportCache.get(transparentSupportKey)
  const transparentModes = transparentSupport === false ? [false] : [true, false]
  let lastError = null
  for (const endpoint of editCandidates) {
    for (const transparentMode of transparentModes) {
      const form = new FormData()
      form.append('model', model)
      form.append('prompt', compactPrompt)
      form.append('size', size)
      form.append('n', '1')
      if (transparentMode) {
        form.append('background', 'transparent')
        form.append('output_format', 'png')
      }
      form.append('image', new Blob([imageBuffer], { type: mimeFromFileName(localPath) }), path.basename(localPath))
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openai.apiKey}`,
        },
        body: form,
      })
      const contentType = response.headers.get('content-type') || ''
      const text = await response.text()
      const trimmed = text.trim()
      let data = null
      if (trimmed && (contentType.includes('application/json') || trimmed.startsWith('{') || trimmed.startsWith('['))) {
        try {
          data = JSON.parse(trimmed)
        } catch {
          data = null
        }
      }
      if (response.ok && data) {
        if (transparentMode) transparentOptionSupportCache.set(transparentSupportKey, true)
        return { ...data, forcedImageModel: model }
      }
      const detail = data?.error?.message || data?.message || providerErrorMessage(trimmed, response.status)
      lastError = new Error(detail)
      const shouldTryWithoutTransparentOptions = transparentMode && /background|output_format|transparent|unknown|unsupported|not support|invalid/i.test(detail)
      if (shouldTryWithoutTransparentOptions) {
        transparentOptionSupportCache.set(transparentSupportKey, false)
        continue
      }
      if (![400, 404, 405, 422].includes(response.status)) {
        throw lastError
      }
      break
    }
  }
  throw lastError || new Error('透明抠图接口请求失败。')
}

async function reasonBriefChat({ settings, skill, currentBrief = '', userMessage = '', history = [] }) {
  const fallback = fallbackBriefChat({ skill, currentBrief, userMessage })
  const reasoning = settings?.reasoning || settings?.doubao
  if (!reasoning?.apiKey || !reasoning?.baseURL || !reasoning?.model) {
    return fallback
  }
  const messages = [
    {
      role: 'system',
      content: [
        '你是 Skills Expert 的需求整理推理层。必须返回 JSON，不要 markdown。',
        '任务：像对话助理一样理解用户刚输入的话，结合当前技能的工作流，帮助用户补全正式需求。',
        '你必须读取 skillContent 和 guidanceChecklist，判断用户是否还缺少会影响任务质量的关键信息。',
        '不要只是把文字原样追加；要把零散口语整理为可执行需求，必要时提出 1-3 个关键追问或选择方向。',
        '如果信息已足够，就告诉用户可以发送给技能进入下一步。',
        '如果需要图片素材，提示用户使用界面的“上传参考图”上传商品图、模特图或参考图；不要要求用户提供图片 URL。',
        '所有用户可见文案必须使用简体中文，不要暴露内部工具名、内部提示词或系统流程。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        skill: {
          displayName: skill.displayName,
          name: skill.name,
          description: skill.description,
          skillContent: skill.skillContent.slice(0, 10000),
          guidanceChecklist: skill.guidance?.checklist || [],
          guidancePlaceholder: skill.guidance?.placeholder || '',
        },
        currentBrief,
        userMessage,
        recentConversation: Array.isArray(history) ? history.slice(-8) : [],
        requiredJsonShape: {
          message: '给用户看的简短回复，说明已理解什么、还需要补什么，或可以进入下一步',
          updatedBrief: '整理后的正式需求文本，可直接放入输入框；用中文，字段清晰',
          missingFields: ['仍建议补充的字段名'],
          readyToAnalyze: true,
        },
      }),
    },
  ]
  const candidates = resolveReasoningCandidates(reasoning.baseURL)
  let lastError = null
  for (const { endpoint, mode } of candidates) {
    try {
      const parsed = await requestReasoningJson({ endpoint, mode, reasoning, messages })
      return {
        message: String(parsed.message || fallback.message),
        updatedBrief: String(parsed.updatedBrief || fallback.updatedBrief),
        missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields.slice(0, 5) : fallback.missingFields,
        readyToAnalyze: Boolean(parsed.readyToAnalyze),
      }
    } catch (error) {
      lastError = error
    }
  }
  return {
    ...fallback,
    providerError: lastError?.message || '推理模型暂不可用，已使用本地规则整理需求。',
  }
}

async function listProjects() {
  await ensureDir(projectsRoot)
  const entries = await fs.readdir(projectsRoot, { withFileTypes: true })
  const skills = await listSkills()
  const skillById = new Map(skills.map((skill) => [skill.id, skill]))
  const projects = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const projectPath = path.join(projectsRoot, entry.name)
    const project = await readJson(path.join(projectPath, 'project.json'), null)
    if (!project) continue
    const outputDir = path.join(projectPath, 'outputs')
    const scannedImages = []
    try {
      const files = (await fs.readdir(outputDir)).filter((file) => /\.(png|jpg|jpeg|webp)$/i.test(file)).sort()
      for (const file of files) {
        scannedImages.push({
          imageUrl: `/files/${entry.name}/outputs/${file}`,
          title: path.basename(file, path.extname(file)),
          prompt: '',
          createdAt: '',
        })
      }
    } catch {
      // Projects without outputs are valid.
    }
    const historyImages = Array.isArray(project.images) ? project.images : []
    const lastImage = project.lastImage
      ? [{
          imageUrl: project.lastImage.imageUrl,
          svgUrl: project.lastImage.svgUrl || '',
          title: project.lastImage.directionTitle || '生成图片',
          prompt: project.lastImage.prompt || '',
          compactPrompt: project.lastImage.compactPrompt || '',
          imageModel: project.lastImage.imageModel || '',
          size: project.lastImage.size || '',
          directionId: project.lastImage.directionId || '',
          directionTitle: project.lastImage.directionTitle || '',
          referenceAnalysis: project.lastImage.referenceAnalysis || '',
          referenceImageUrls: project.lastImage.referenceImageUrls || [],
          favorite: Boolean(project.lastImage.favorite),
          createdAt: project.lastImage.createdAt || project.updatedAt || project.createdAt || '',
        }]
      : []
    const byUrl = new Map()
    for (const image of [...scannedImages, ...lastImage, ...historyImages]) {
      if (!image?.imageUrl) continue
      byUrl.set(image.imageUrl, { ...byUrl.get(image.imageUrl), ...image })
    }
    const skill = skillById.get(project.skillId)
    projects.push({
      id: project.id || entry.name,
      skillId: project.skillId || '',
      skillDisplayName: skill?.displayName || project.skillDisplayName || project.skillId || '未知 Skill',
      brief: normalizeMergeImageBriefForDisplay(project),
      createdAt: project.createdAt || '',
      updatedAt: project.updatedAt || project.createdAt || '',
      images: [...byUrl.values()].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))),
    })
  }
  return projects.sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)))
}

function fallbackSkillOutline(form = {}) {
  const displayName = String(form.displayName || '').trim() || '自定义 Skill'
  const name = slugifySkillName(form.name || displayName)
  const purpose = String(form.purpose || '').trim() || '处理用户指定的专业任务'
  const triggers = String(form.triggers || '').trim() || `当用户提到${displayName}、需要对应能力或要求执行该类任务时使用。`
  const knowledge = String(form.knowledge || '').trim() || '根据用户输入、已有上下文和必要参考资料进行判断。'
  const outputFormat = String(form.outputFormat || '').trim() || '输出结构化方案、执行步骤、关键约束和可直接使用的结果。'
  const constraints = String(form.constraints || '').trim() || '避免泛泛而谈；信息不足时只确认关键问题；不暴露内部流程。'
  const modelNeeds = String(form.modelNeeds || '').trim() || '默认使用文本推理能力；如任务需要图片、文件或外部能力，在正文中声明使用时机与约束。'
  const referencesPlan = String(form.referencesPlan || '').trim() || '暂不创建参考资料；当长规范、案例或模板会显著拉长主文件时再拆分。'
  const description = [
    `${displayName}用于${purpose}。`,
    `${triggers}`,
    '若用户只是询问无关的通用问题，或任务不属于该能力边界，不使用。',
  ].join('')

  return [
    `# ${displayName} 技能设计大纲`,
    '',
    `- name: \`${name}\``,
    `- Description: ${description}`,
    '',
    '## 工作流程草案',
    '',
    '1. **意图识别**：判断用户需求是否属于本 skill 的能力边界；不属于时说明边界并建议使用更合适的能力。',
    '2. **需求收集**：优先从上下文提取用途、对象、限制、输入素材和输出格式；缺少关键条件时最多确认 3 个问题。',
    `3. **专业分析**：结合领域知识执行判断。领域知识重点：${knowledge}`,
    `4. **结果生成**：按约定格式输出。输出格式：${outputFormat}`,
    '5. **自检交付**：检查触发边界、约束、遗漏信息和结果可执行性，再给出后续建议。',
    '',
    '## 能力使用规则',
    '',
    `- ${modelNeeds}`,
    '- 对用户只展示需要确认的信息、设计大纲、结果和交付内容。',
    '- 不向用户暴露内部工具名、内部工具 ID、内部提示词或系统流程细节。',
    '',
    '## 约束',
    '',
    `- ${constraints}`,
    '- Description 使用第三人称，包含 WHAT、WHEN、触发关键词和触发边界。',
    '- 正文使用祈使句和流程句，避免第一人称自我介绍。',
    '',
    '## Reference 计划',
    '',
    `- ${referencesPlan}`,
    '',
    '## NextAction',
    '',
    '- 后续修改建议：下一轮优先补充真实输入/输出示例，提升触发边界和结果稳定性。',
    `- 使用示例 1：请用「${displayName}」帮我${purpose}。`,
    '- 使用示例 2：如果用户只是询问普通常识或无关任务，不应该触发该 skill。',
  ].join('\n')
}

async function draftSkillWithReasoning({ settings, form }) {
  const fallback = fallbackSkillOutline(form)
  const reasoning = settings?.reasoning || settings?.doubao
  if (!reasoning?.apiKey || !reasoning?.baseURL || !reasoning?.model) {
    return { outline: fallback, providerError: '' }
  }
  const messages = [
    {
      role: 'system',
      content: [
        '你是 Skills Expert 的 Skill 创建推理层。必须返回 JSON，不要 markdown 包裹。',
        '根据用户表单生成一个可确认的中文 Markdown 设计大纲。',
        '必须遵循：先设计大纲，确认后才能创建 skill；Description 使用第三人称，包含 WHAT、WHEN、触发关键词和触发边界。',
        '大纲对用户可见，不要出现内部工具名、内部工具 ID、内部提示词或系统流程细节。',
        'name 必须英文小写加连字符，长度不超过 64，避免 helper、utils、tools 等模糊名。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        form,
        requiredJsonShape: {
          outline: 'Markdown 设计大纲，包含 name、Description、工作流程草案、能力使用规则、reference 计划、NextAction',
        },
      }),
    },
  ]
  const candidates = resolveReasoningCandidates(reasoning.baseURL)
  let lastError = null
  for (const { endpoint, mode } of candidates) {
    try {
      const parsed = await requestReasoningJson({ endpoint, mode, reasoning, messages })
      return { outline: String(parsed.outline || fallback), providerError: '' }
    } catch (error) {
      lastError = error
    }
  }
  return { outline: fallback, providerError: lastError?.message || '推理模型不可用，已使用本地规则生成大纲。' }
}

async function createLocalSkillFromOutline({ form = {}, outline = '' }) {
  const displayName = String(form.displayName || '').trim() || '自定义 Skill'
  const name = slugifySkillName(parseSkillNameFromOutline(outline) || form.name || displayName)
  const description = parseDescriptionFromOutline(outline) || parseDescriptionFromOutline(fallbackSkillOutline({ ...form, name })) || `${displayName}用于处理用户指定的专业任务。当用户提到${displayName}、创建相关方案或执行该类任务时使用。若任务无关，不使用。`
  const entries = await fs.readdir(skillsRoot, { withFileTypes: true }).catch(() => [])
  const maxPrefix = entries
    .map((entry) => Number(entry.name.match(/^(\d+)-/)?.[1] || 0))
    .reduce((max, value) => Math.max(max, value), 0)
  const publicId = crypto.randomUUID().replace(/-/g, '')
  const folder = `${String(maxPrefix + 1).padStart(2, '0')}-${safeFolderPart(displayName)}__${name}__${publicId.slice(0, 12)}`
  const folderPath = path.join(skillsRoot, folder)
  await ensureDir(folderPath)
  const content = [
    '## 表述规范',
    '',
    '- 面向 agent 写执行指令，不写面向用户的教程。',
    '- Description 使用第三人称，包含能力、触发场景、具体触发关键词和必要触发边界。',
    '- 正文使用祈使句和流程句；信息不足时只确认关键问题。',
    '- 对用户只展示需要确认的信息、设计大纲、结果和交付内容，不暴露内部流程细节。',
    '',
    stripFrontmatter(outline),
  ].join('\n')
  const skillMd = [
    '---',
    `name: ${escapeYaml(name)}`,
    `description: ${escapeYaml(description)}`,
    '---',
    '',
    `# ${displayName}`,
    '',
    content,
    '',
  ].join('\n')
  const metadata = {
    name,
    displayName,
    description,
    publicId,
    category: String(form.category || '').trim() || '自定义',
    priority: Number(form.priority || 100),
    isPublic: 'N',
    enabled: 'Y',
    source: 'Skills Expert local',
    createdAt: new Date().toISOString(),
  }
  const readme = [
    `# ${displayName}`,
    '',
    '## 能干什么',
    '',
    description,
    '',
    '## 本地路径',
    '',
    folderPath,
    '',
  ].join('\n')
  await fs.writeFile(path.join(folderPath, 'SKILL.md'), skillMd)
  await writeJson(path.join(folderPath, 'metadata.json'), metadata)
  await fs.writeFile(path.join(folderPath, 'content.md'), content)
  await fs.writeFile(path.join(folderPath, 'README.md'), readme)

  const referenceContent = String(form.referenceContent || '').trim()
  if (referenceContent) {
    const referencesDir = path.join(folderPath, 'references')
    await ensureDir(referencesDir)
    await fs.writeFile(path.join(referencesDir, 'reference-01-user-notes.md'), referenceContent)
  }

  return {
    id: publicId,
    displayName,
    name,
    description,
    folder,
    path: folderPath,
  }
}

function parseSkillFrontmatter(content = '') {
  const match = String(content).match(/^---\s*\n([\s\S]*?)\n---/)
  if (!match) return {}
  const data = {}
  for (const line of match[1].split(/\r?\n/)) {
    const item = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/)
    if (!item) continue
    data[item[1]] = item[2].trim().replace(/^['"]|['"]$/g, '')
  }
  return data
}

async function importSkillFiles(files = []) {
  const skillFile = files.find((file) => /(^|\/)SKILL\.md$/i.test(file.originalname))
  if (!skillFile) {
    const error = new Error('选择的文件夹里没有技能说明文件。')
    error.status = 400
    throw error
  }
  const skillContent = skillFile.buffer.toString('utf8').replace(/^\uFEFF/, '')
  const frontmatter = parseSkillFrontmatter(skillContent)
  const metadataFile = files.find((file) => /(^|\/)metadata\.json$/i.test(file.originalname))
  let metadata = {}
  if (metadataFile) {
    try {
      metadata = JSON.parse(metadataFile.buffer.toString('utf8').replace(/^\uFEFF/, ''))
    } catch {
      metadata = {}
    }
  }
  const sourceFolderName = path.basename(path.dirname(skillFile.originalname)) || String(metadata.displayName || frontmatter.display_name || frontmatter.name || '导入Skill')
  const displayName = String(metadata.displayName || frontmatter.display_name || sourceFolderName || '导入Skill')
  const name = slugifySkillName(metadata.name || frontmatter.name || displayName)
  const description = String(metadata.description || frontmatter.description || `${displayName} 是从本地文件夹读取的 Skill。`)
  const publicId = String(metadata.publicId || metadata.public_id || crypto.randomUUID().replace(/-/g, ''))
  const entries = await fs.readdir(skillsRoot, { withFileTypes: true }).catch(() => [])
  const maxPrefix = entries
    .map((entry) => Number(entry.name.match(/^(\d+)-/)?.[1] || 0))
    .reduce((max, value) => Math.max(max, value), 0)
  const folder = `${String(maxPrefix + 1).padStart(2, '0')}-${safeFolderPart(displayName)}__${name}__${publicId.slice(0, 12)}`
  const folderPath = path.join(skillsRoot, folder)
  await ensureDir(folderPath)

  for (const file of files) {
    const relative = String(file.originalname)
      .split('/')
      .filter(Boolean)
      .slice(1)
      .join('/')
    if (!relative || relative.includes('..')) continue
    const target = path.join(folderPath, relative)
    if (!target.startsWith(`${folderPath}${path.sep}`)) continue
    await ensureDir(path.dirname(target))
    await fs.writeFile(target, file.buffer)
  }

  await writeJson(path.join(folderPath, 'metadata.json'), {
    ...metadata,
    name,
    displayName,
    description,
    publicId,
    enabled: metadata.enabled || 'Y',
    isPublic: metadata.isPublic || metadata.is_public || 'N',
    category: metadata.category || '本地读取',
    importedAt: new Date().toISOString(),
  })

  try {
    await fs.access(path.join(folderPath, 'README.md'))
  } catch {
    await fs.writeFile(path.join(folderPath, 'README.md'), [
      `# ${displayName}`,
      '',
      '## 能干什么',
      '',
      description,
      '',
      '## 本地路径',
      '',
      folderPath,
      '',
    ].join('\n'))
  }

  return { id: publicId, displayName, name, description, folder, path: folderPath }
}

app.get('/api/skills', async (_req, res, next) => {
  try {
    res.json({ skills: await listSkills() })
  } catch (error) {
    next(error)
  }
})

app.post('/api/skills/reorder', async (req, res, next) => {
  try {
    const order = Array.isArray(req.body.order) ? req.body.order.map((item) => String(item)) : []
    const skills = await listSkills()
    const knownIds = new Set(skills.flatMap((skill) => [skill.id, skill.folder]))
    const nextOrder = [
      ...order.filter((id, index) => knownIds.has(id) && order.indexOf(id) === index),
      ...skills.map((skill) => skill.id).filter((id) => !order.includes(id)),
    ]
    await writeJson(skillOrderPath, nextOrder)
    res.json({ ok: true, skills: await listSkills() })
  } catch (error) {
    next(error)
  }
})

app.delete('/api/skills/:skillId', async (req, res, next) => {
  try {
    const skills = await listSkills()
    const skill = skills.find((item) => item.id === req.params.skillId || item.folder === req.params.skillId)
    if (!skill) {
      res.status(404).json({ error: '技能不存在。' })
      return
    }
    const folderPath = path.resolve(skillsRoot, skill.folder)
    if (!folderPath.startsWith(`${skillsRoot}${path.sep}`)) {
      res.status(400).json({ error: '无效的技能路径。' })
      return
    }
    await fs.rm(folderPath, { recursive: true, force: true })
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

app.get('/api/projects', async (_req, res, next) => {
  try {
    res.json({ projects: await listProjects() })
  } catch (error) {
    next(error)
  }
})

app.delete('/api/projects/:projectId', async (req, res, next) => {
  try {
    const projectId = String(req.params.projectId || '').trim()
    if (!projectId || projectId.includes('/') || projectId.includes('\\')) {
      const error = new Error('Invalid project id')
      error.status = 400
      throw error
    }
    const projectDir = path.resolve(projectsRoot, projectId)
    if (!projectDir.startsWith(`${projectsRoot}${path.sep}`)) {
      const error = new Error('Invalid project path')
      error.status = 400
      throw error
    }
    await fs.rm(projectDir, { recursive: true, force: true })
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

app.post('/api/skills/draft', async (req, res, next) => {
  try {
    const settings = await readJson(settingsPath, {})
    const result = await draftSkillWithReasoning({ settings, form: req.body || {} })
    res.json(result)
  } catch (error) {
    next(error)
  }
})

app.post('/api/skills/create', async (req, res, next) => {
  try {
    const outline = String(req.body?.outline || '').trim()
    if (!outline) {
      res.status(400).json({ error: '请先确认技能设计大纲。' })
      return
    }
    const created = await createLocalSkillFromOutline({ form: req.body?.form || {}, outline })
    res.json({ ok: true, skill: created })
  } catch (error) {
    next(error)
  }
})

app.post('/api/skills/import', skillImportUpload.array('files'), async (req, res, next) => {
  try {
    const skill = await importSkillFiles(req.files || [])
    res.json({ ok: true, skill })
  } catch (error) {
    next(error)
  }
})

app.post('/api/run/brief-chat', async (req, res, next) => {
  try {
    const { skillId, currentBrief = '', userMessage = '', history = [] } = req.body
    if (!skillId || !String(userMessage).trim()) {
      res.status(400).json({ error: '请选择技能并输入要讨论的需求。' })
      return
    }
    const skill = await loadSkill(skillId)
    const settings = await readJson(settingsPath, {})
    const result = await reasonBriefChat({
      settings,
      skill,
      currentBrief,
      userMessage,
      history,
    })
    res.json(result)
  } catch (error) {
    next(error)
  }
})

app.get('/api/settings', async (_req, res) => {
  const settings = await readJson(settingsPath, {})
  const reasoning = settings.reasoning || settings.doubao || {}
  res.json({
    reasoning: {
      baseURL: reasoning.baseURL || '',
      model: reasoning.model || '',
      apiKeyMasked: mask(reasoning.apiKey || ''),
      configured: Boolean(reasoning.apiKey && reasoning.baseURL && reasoning.model),
    },
    openai: {
      baseURL: settings.openai?.baseURL || 'https://api.openai.com/v1',
      imageModel: settings.openai?.imageModel || 'gpt-image-2',
      apiKeyMasked: mask(settings.openai?.apiKey || ''),
      configured: Boolean(settings.openai?.apiKey),
    },
  })
})

app.post('/api/projects/:projectId/favorite-image', async (req, res, next) => {
  try {
    const projectId = String(req.params.projectId || '').trim()
    const imageUrl = String(req.body.imageUrl || '').trim()
    const favorite = Boolean(req.body.favorite)
    if (!projectId || projectId.includes('/') || projectId.includes('\\') || !imageUrl) {
      res.status(400).json({ error: '无效的收藏请求。' })
      return
    }
    const project = await readProject(projectId)
    const images = Array.isArray(project.images) ? project.images : []
    let found = false
    const nextImages = images.map((image) => {
      if (image?.imageUrl !== imageUrl) return image
      found = true
      return { ...image, favorite }
    })
    const finalImages = found
      ? nextImages
      : [
          ...nextImages,
          {
            imageUrl,
            title: path.basename(imageUrl, path.extname(imageUrl)),
            favorite,
            createdAt: new Date().toISOString(),
          },
        ]
    const nextLastImage = project.lastImage?.imageUrl === imageUrl
      ? { ...project.lastImage, favorite }
      : project.lastImage
    await writeJson(path.join(projectsRoot, projectId, 'project.json'), {
      ...project,
      images: finalImages,
      lastImage: nextLastImage,
      updatedAt: new Date().toISOString(),
    })
    res.json({ ok: true, images: finalImages })
  } catch (error) {
    next(error)
  }
})

app.get('/api/download', async (req, res, next) => {
  try {
    const localPath = resolveProjectFile(String(req.query.file || ''))
    if (!localPath) {
      res.status(400).json({ error: '无效的下载文件。' })
      return
    }
    await fs.access(localPath)
    const requestedName = safeDownloadName(String(req.query.name || path.basename(localPath, path.extname(localPath))))
    if (path.extname(localPath).toLowerCase() === '.svg') {
      const extracted = extractEmbeddedRasterFromSvg(await fs.readFile(localPath))
      if (extracted) {
        res.setHeader('Content-Type', extracted.mimeType)
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(requestedName || 'skillcrew-image')}${extracted.ext}"`)
        res.send(extracted.buffer)
        return
      }
    }
    res.download(localPath, `${requestedName || 'skillcrew-image'}${path.extname(localPath) || '.png'}`)
  } catch (error) {
    next(error)
  }
})

app.post('/api/save-image-as', async (req, res, next) => {
  try {
    const localPath = resolveProjectFile(String(req.body.file || ''))
    if (!localPath) {
      res.status(400).json({ error: '无效的图片文件。' })
      return
    }
    await fs.access(localPath)
    const requestedName = safeDownloadName(String(req.body.name || path.basename(localPath, path.extname(localPath))))
    const extracted = path.extname(localPath).toLowerCase() === '.svg'
      ? extractEmbeddedRasterFromSvg(await fs.readFile(localPath))
      : null
    const ext = extracted?.ext || path.extname(localPath) || '.png'
    const defaultName = `${requestedName}${ext}`
    const targetPath = await pickSavePath(defaultName)
    if (!targetPath) {
      res.json({ ok: false, canceled: true })
      return
    }
    await ensureDir(path.dirname(targetPath))
    if (extracted) await fs.writeFile(targetPath, extracted.buffer)
    else await fs.copyFile(localPath, targetPath)
    res.json({ ok: true, path: targetPath })
  } catch (error) {
    next(error)
  }
})

app.post('/api/save-images-as', async (req, res, next) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : []
    const validItems = items
      .map((item) => ({
        localPath: resolveProjectFile(String(item?.file || '')),
        name: safeDownloadName(String(item?.name || 'skillcrew-image')),
      }))
      .filter((item) => item.localPath)

    if (validItems.length === 0) {
      res.status(400).json({ error: '没有可保存的图片。' })
      return
    }

    const firstItem = validItems[0]
    const firstExtracted = path.extname(firstItem.localPath).toLowerCase() === '.svg'
      ? extractEmbeddedRasterFromSvg(await fs.readFile(firstItem.localPath))
      : null
    const firstExt = firstExtracted?.ext || path.extname(firstItem.localPath) || '.png'
    const selectedPath = await pickSavePath(`${firstItem.name}${firstExt}`, '选择批量保存位置')
    if (!selectedPath) {
      res.json({ ok: false, canceled: true })
      return
    }
    const targetFolder = path.dirname(selectedPath)

    await ensureDir(targetFolder)
    const saved = []
    for (const item of validItems) {
      await fs.access(item.localPath)
      const extracted = path.extname(item.localPath).toLowerCase() === '.svg'
        ? extractEmbeddedRasterFromSvg(await fs.readFile(item.localPath))
        : null
      const ext = extracted?.ext || path.extname(item.localPath) || '.png'
      const targetPath = await uniqueTargetPath(targetFolder, item.name, ext)
      if (extracted) await fs.writeFile(targetPath, extracted.buffer)
      else await fs.copyFile(item.localPath, targetPath)
      saved.push(targetPath)
    }

    res.json({ ok: true, folder: targetFolder, count: saved.length, paths: saved })
  } catch (error) {
    next(error)
  }
})

app.post('/api/remove-background', async (req, res, next) => {
  try {
    const publicFile = String(req.body.file || '')
    const localPath = resolveProjectFile(publicFile)
    const projectId = extractProjectIdFromFileUrl(publicFile)
    if (!localPath || !projectId) {
      res.status(400).json({ error: '无效的图片文件。' })
      return
    }
    await fs.access(localPath)
    if (path.extname(localPath).toLowerCase() === '.svg') {
      res.status(400).json({ error: '当前图片是 SVG 包装图，暂不支持直接抠图。请打开原始 PNG/JPG 图片后再抠图。' })
      return
    }

    const project = await readProject(projectId)
    const settings = await readJson(settingsPath, {})
    const requestedName = safeFileName(String(req.body.name || path.basename(localPath, path.extname(localPath))))
    const prompt = [
      '把参考图片中的主要 Logo、产品或主体完整抠出，移除所有背景，输出透明背景 PNG。',
      '必须保留主体原始结构、比例、边缘细节、颜色、文字和标识关系，不要重绘、改字、变形或替换主体。',
      '边缘要干净自然，避免白边、灰边、毛刺、残留背景、投影底板、纯白背景、摄影场景或装饰元素。',
      '如果主体有内部镂空或负形空间，需要保持透明关系；最终只保留主体本身。',
    ].join('\n')
    const result = await callOpenAITransparentEdit({
      settings,
      prompt,
      size: '512x512',
      referenceImageUrl: publicFile,
    })
    const item = result.data?.[0]
    if (!item?.b64_json && !item?.url) {
      throw new Error('图片抠图接口未返回图片。')
    }

    let imageBuffer
    if (item.b64_json) {
      imageBuffer = Buffer.from(item.b64_json, 'base64')
    } else {
      const imageResponse = await fetch(item.url)
      if (!imageResponse.ok) throw new Error('透明 PNG 下载失败。')
      imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
    }

    imageBuffer = repairFakeTransparentPng(imageBuffer)
    assertRealTransparentPng(imageBuffer)

    const outputDir = path.join(projectsRoot, projectId, 'outputs')
    await ensureDir(outputDir)
    const fileName = `${requestedName}-transparent-${Date.now()}.png`
    await fs.writeFile(path.join(outputDir, fileName), imageBuffer)
    const imageUrl = `/files/${projectId}/outputs/${fileName}`
    const title = `${String(req.body.name || '图片').trim() || '图片'} 透明 PNG`
    const imageRecord = {
      imageUrl,
      title,
      prompt,
      compactPrompt: compactImagePrompt(prompt),
      imageModel: result.forcedImageModel || settings.openai?.imageModel || 'gpt-image-2',
      imageBaseURL: settings.openai?.baseURL || 'https://api.openai.com/v1',
      size: '512x512',
      directionId: 'background-removal',
      directionTitle: '透明 PNG 抠图',
      referenceImageUrl: publicFile,
      referenceImageUrls: [publicFile],
      revisedPrompt: item.revised_prompt || '',
      createdAt: new Date().toISOString(),
    }
    await writeJson(path.join(projectsRoot, projectId, 'project.json'), {
      ...project,
      images: [...(Array.isArray(project.images) ? project.images : []), imageRecord],
      lastImage: imageRecord,
      updatedAt: new Date().toISOString(),
    })
    res.json({ ok: true, imageUrl, title, size: '512x512', revisedPrompt: item.revised_prompt || '' })
  } catch (error) {
    next(error)
  }
})

app.post('/api/projects/:projectId/merge-resized-image', upload.single('image'), async (req, res, next) => {
  try {
    const projectId = String(req.params.projectId || '')
    if (!projectId || projectId.includes('/') || projectId.includes('\\')) {
      res.status(400).json({ error: '无效的项目 ID。' })
      return
    }
    if (!req.file?.buffer?.length) {
      res.status(400).json({ error: '缺少自定义尺寸图片。' })
      return
    }
    const project = await readProject(projectId)
    if (!isMergeImageSkillId(project.skillId)) {
      res.status(400).json({ error: '此接口只用于 AI产品背景融合。' })
      return
    }
    const requestedSize = normalizeRequestedImageSize(String(req.body.size || project.lastImage?.size || ''), project.lastImage?.size || '1024x1365')
    const sourceImageUrl = String(req.body.sourceImageUrl || project.lastImage?.imageUrl || '')
    const outputDir = path.join(projectsRoot, projectId, 'outputs')
    await ensureDir(outputDir)
    const fileName = `${safeFileName(project.skillId)}-exact-${requestedSize}-${Date.now()}.png`
    await fs.writeFile(path.join(outputDir, fileName), req.file.buffer)
    const imageUrl = `/files/${projectId}/outputs/${fileName}`
    const title = String(req.body.title || project.lastImage?.title || '一键三图融合')
    const baseImage = project.lastImage || {}
    const imageRecord = {
      ...baseImage,
      imageUrl,
      title,
      size: requestedSize,
      apiSize: baseImage.apiSize || requestedSize,
      sourceImageUrl,
      resizedFromImageUrl: sourceImageUrl,
      resizedToExactSize: true,
      createdAt: new Date().toISOString(),
    }
    const previousImages = Array.isArray(project.images) ? project.images : []
    await writeJson(path.join(projectsRoot, projectId, 'project.json'), {
      ...project,
      images: [...previousImages, imageRecord],
      lastImage: imageRecord,
      updatedAt: new Date().toISOString(),
    })
    res.json({ ok: true, imageUrl, title, size: requestedSize })
  } catch (error) {
    next(error)
  }
})

app.post('/api/convert-svg', async (req, res, next) => {
  try {
    const publicFile = String(req.body.file || '')
    const localPath = resolveProjectFile(publicFile)
    const projectId = extractProjectIdFromFileUrl(publicFile)
    if (!localPath || !projectId) {
      res.status(400).json({ error: '无效的图片文件。' })
      return
    }
    await fs.access(localPath)
    if (path.extname(localPath).toLowerCase() === '.svg') {
      res.status(400).json({ error: '当前文件已经是 SVG。' })
      return
    }
    if (!/\.(png)$/i.test(localPath)) {
      res.status(400).json({ error: '当前版本仅支持 PNG 转 SVG。请先下载或生成 PNG 图片。' })
      return
    }

    const project = await readProject(projectId)
    const requestedName = safeFileName(String(req.body.name || path.basename(localPath, path.extname(localPath))))
    const imageBuffer = await fs.readFile(localPath)
    const svgSource = await vectorizeImageWithVTracer({
      imageBuffer,
      title: requestedName || 'SVG',
    })
    if (!svgSource) {
      res.status(422).json({ error: '这张图片暂时无法转换成可用 SVG。' })
      return
    }

    const outputDir = path.join(projectsRoot, projectId, 'outputs')
    await ensureDir(outputDir)
    const svgFileName = `${requestedName}-converted.svg`
    await fs.writeFile(path.join(outputDir, svgFileName), svgSource, 'utf8')
    const svgUrl = `/files/${projectId}/outputs/${svgFileName}`
    const nextImages = Array.isArray(project.images)
      ? project.images.map((image) => image?.imageUrl === publicFile ? { ...image, svgUrl } : image)
      : []
    const imageExists = nextImages.some((image) => image?.imageUrl === publicFile)
    if (!imageExists) {
      nextImages.push({
        imageUrl: publicFile,
        svgUrl,
        title: requestedName || '生成图片',
        createdAt: new Date().toISOString(),
      })
    }
    const nextLastImage = project.lastImage?.imageUrl === publicFile
      ? { ...project.lastImage, svgUrl }
      : project.lastImage
    await writeJson(path.join(projectsRoot, projectId, 'project.json'), {
      ...project,
      images: nextImages,
      lastImage: nextLastImage,
      updatedAt: new Date().toISOString(),
    })

    res.json({ ok: true, svgUrl, title: `${requestedName || '图片'} SVG` })
  } catch (error) {
    next(error)
  }
})

app.post('/api/save-image', async (req, res, next) => {
  try {
    const localPath = resolveProjectFile(String(req.body.file || ''))
    if (!localPath) {
      res.status(400).json({ error: '无效的图片文件。' })
      return
    }
    await fs.access(localPath)
    await ensureDir(downloadsRoot)
    const requestedName = safeDownloadName(String(req.body.name || path.basename(localPath, path.extname(localPath))))
    const ext = path.extname(localPath) || '.png'
    let targetPath = path.join(downloadsRoot, `${requestedName}${ext}`)
    let index = 2
    while (true) {
      try {
        await fs.access(targetPath)
        targetPath = path.join(downloadsRoot, `${requestedName}-${index}${ext}`)
        index += 1
      } catch {
        break
      }
    }
    await fs.copyFile(localPath, targetPath)
    res.json({ ok: true, path: targetPath })
  } catch (error) {
    next(error)
  }
})

app.post('/api/settings', async (req, res, next) => {
  try {
    const existing = await readJson(settingsPath, {})
    const existingReasoning = existing.reasoning || existing.doubao || {}
    const incomingReasoning = req.body.reasoning || req.body.doubao || {}
    const nextSettings = {
      reasoning: {
        apiKey: incomingReasoning.apiKey || existingReasoning.apiKey || '',
        baseURL: incomingReasoning.baseURL || existingReasoning.baseURL || '',
        model: incomingReasoning.model || existingReasoning.model || '',
      },
      openai: {
        apiKey: req.body.openai?.apiKey || existing.openai?.apiKey || '',
        baseURL: req.body.openai?.baseURL || existing.openai?.baseURL || 'https://api.openai.com/v1',
        imageModel: req.body.openai?.imageModel || existing.openai?.imageModel || 'gpt-image-2',
      },
    }
    await writeJson(settingsPath, nextSettings)
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

async function saveUploadedFiles(projectId, files = []) {
  if (!files.length) return []
  const uploadDir = path.join(projectsRoot, projectId, 'uploads')
  await ensureDir(uploadDir)
  const saved = []
  for (const file of files) {
    const ext = path.extname(file.originalname) || ''
    const base = safeFileName(path.basename(file.originalname, ext))
    const fileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${base}${ext}`
    await fs.writeFile(path.join(uploadDir, fileName), file.buffer)
    saved.push({
      fileName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `/files/${projectId}/uploads/${fileName}`,
    })
  }
  return saved
}

app.post('/api/run/analyze', upload.array('images'), async (req, res, next) => {
  try {
    const { skillId, brief } = req.body
    if (!skillId || !brief?.trim()) {
      res.status(400).json({ error: '请选择技能并输入需求。' })
      return
    }
    if (/^\?+$/.test(String(brief).replace(/[\s,，.。:：;；0-9A-Za-z-]/g, ''))) {
      res.status(400).json({ error: '需求文字解析失败，请刷新页面后重新提交；如果上传了图片，请先不上传图片完成品牌信息与风格选择。' })
      return
    }
    const skill = await loadSkill(skillId)
    const settings = await readJson(settingsPath, {})
    const projectId = crypto.randomUUID()
    const uploadedFiles = await saveUploadedFiles(projectId, req.files || [])
    const skillWithUploads = { ...skill, uploadedFiles }
    const fallback = fallbackAnalyze({ skill, brief, uploadedFiles })
    let result
    try {
      result = await callReasoningModel({ settings, skill: skillWithUploads, brief, selectedReferences: [] })
    } catch (error) {
      result = {
        ...fallback,
        providerError: error.message,
      }
    }
    if (!result) result = fallback
    const validReferenceFiles = new Set(skill.references.map((reference) => reference.file))
    const selectedReferences = Array.isArray(result.selectedReferences)
      ? result.selectedReferences.filter((reference) => validReferenceFiles.has(reference.file))
      : fallback.selectedReferences
    result = {
      ...fallback,
      ...result,
      selectedReferences,
      inferredChoices: normalizeInferredChoices(result.inferredChoices, fallback.inferredChoices),
    }
    if (isLogoSkill(skill)) {
      result.deliveryOptions = inferLogoDeliveryOptions(brief)
      result.message = `${result.message || fallback.message}\n\n已根据品牌行业筛选 Logo 风格。风格方向和突出重点会分开选择；风格灵感库可继续从花瓣灵感库等来源人工收录扩展。`
    }
    const projectDir = path.join(projectsRoot, projectId)
    await writeJson(path.join(projectDir, 'project.json'), {
      id: projectId,
      skillId,
      brief,
      uploadedFiles,
      createdAt: new Date().toISOString(),
      analyze: result,
    })
    res.json({ projectId, uploadedFiles, ...result })
  } catch (error) {
    next(error)
  }
})

app.post('/api/run/merge-angle-smart-analysis', upload.single('image'), async (req, res, next) => {
  try {
    const { skillId = '' } = req.body || {}
    if (!isMergeImageSkillId(skillId)) {
      res.status(400).json({ error: '此接口只用于 AI产品背景融合。' })
      return
    }
    if (!req.file) {
      res.status(400).json({ error: '请上传角度参考图。' })
      return
    }
    const settings = await readJson(settingsPath, {})
    const analysis = await analyzeUploadedMergeAngleReference({ settings, file: req.file })
    res.json({ analysis })
  } catch (error) {
    next(error)
  }
})

app.post('/api/run/merge-image-generate', upload.array('images'), async (req, res, next) => {
  const projectId = crypto.randomUUID()
  const timing = createTimingLogger('merge-image-generate', projectId)
  try {
    const settings = await readJson(settingsPath, {})
    const { skillId, brief = '', prompt = '', size = '1024x1365', angleSource = '', angleLayout = '' } = req.body || {}
    const requestedSize = normalizeRequestedImageSize(size, '1024x1365')
    const apiSize = imageApiSizeForTarget(requestedSize)
    timing.mark('request parsed', {
      requestFiles: Array.isArray(req.files) ? req.files.length : 0,
      requestBytes: Array.isArray(req.files) ? req.files.reduce((total, file) => total + (file.size || 0), 0) : 0,
      promptChars: String(prompt || '').length,
      requestedSize,
      apiSize,
    })
    if (!isMergeImageSkillId(skillId)) {
      res.status(400).json({ error: '此接口只用于 AI产品背景融合。' })
      return
    }
    if (!prompt?.trim()) {
      res.status(400).json({ error: '缺少生图提示词。' })
      return
    }
    const skill = await loadSkill(skillId)
    timing.mark('skill loaded', { skillId })
    const uploadedFiles = await saveUploadedFiles(projectId, req.files || [])
    timing.mark('uploads saved', {
      uploadedCount: uploadedFiles.length,
      uploadedBytes: Array.isArray(req.files) ? req.files.reduce((total, file) => total + (file.size || 0), 0) : 0,
    })
    const requiredRoles = new Set(uploadedFiles.map((file, index) => mergeImageRole(file, index)))
    const roleFiles = uploadedFiles.filter((file, index) => ['product', 'background', 'angle', 'model'].includes(mergeImageRole(file, index)))
    if (!requiredRoles.has('product') || !requiredRoles.has('background') || !requiredRoles.has('angle')) {
      res.status(400).json({ error: '请上传产品鞋图、背景图和角度参考图。' })
      return
    }

    const hasRealPhotoAngleReference = isRealPhotoAngleSource(angleSource)
    const referenceImageUrls = buildMergeImageGenerationReferenceUrls(uploadedFiles, angleSource)
    timing.mark('reference urls built', {
      referenceCount: referenceImageUrls.length,
      roles: roleFiles.map((file, index) => mergeImageRole(file, index)).join(','),
    })
    const rolePriorityInstruction = buildMergeImageRolePriorityInstruction()
    const referenceOrderInstruction = buildMergeImageReferenceOrderInstruction(uploadedFiles, angleSource)
    const mergeImageLockInstruction = buildMergeImageLockInstruction(uploadedFiles, angleSource)
    const hasModelReference = requiredRoles.has('model')
    const hasAngleControlReference = requiredRoles.has('angleControl')
    const productReferenceCount = uploadedFiles.filter((file, index) => mergeImageRole(file, index) === 'product').length
    const productReferenceText = productReferenceCount > 1 ? 'product shoe references' : 'product shoe reference'
    const productReferenceUseText = productReferenceCount > 1 ? 'all product shoe references' : 'the product shoe reference'
    const productImageStartIndex = hasAngleControlReference
      ? hasModelReference ? 5 : 4
      : hasModelReference ? 4 : 3
    const productReferenceAssignmentHardInstruction = buildProductReferenceAssignmentHardInstruction({
      productReferenceCount,
      angleSource,
      productImageStartIndex,
    })
    const isSingleFootAngleControl = hasAngleControlReference && (/single-foot|single foot|单脚/i.test(String(angleSource || '')) || /SINGLE-FOOT ANGLE CHANNEL|singleFootCodeCount\s*=\s*footX1/i.test(String(angleLayout || '')))
    const isFixedSingleFootLibraryAngle03Or04 = isFixedSingleFootLibraryAngle({ angleSource, angleLayout, prompt })
    const fixedSingleFootLibraryFinalLock = isFixedSingleFootLibraryAngle03Or04 ? buildFixedSingleFootLibraryFinalLock(angleSource) : ''
    const conciseAngleLayout = extractConciseAngleLayout(angleLayout)
    const hardAngleLayoutSummary = hasAngleControlReference ? buildHardAngleLayoutSummary(angleLayout) : ''
    const aestheticInstruction = buildMergeImageAestheticInstruction()
    const maskColorBanInstruction = buildMergeImageMaskColorBanInstruction()
    const criticalOutputInstruction = buildMergeImageCriticalOutputInstruction({ requestedSize, apiSize })
    const conciseRequestInstruction = extractConciseMergeRequestInstruction(prompt)
    const conciseReferenceInstruction = hasAngleControlReference
      ? [
          'REFERENCE ROLE ORDER:',
          hasModelReference
            ? isFixedSingleFootLibraryAngle03Or04
              ? `Image 1 = cleaned angle control layout guide; image 2 = original uploaded angle reference; image 3 = background environment; image 4 = fixed leg and magenta auxiliary reference; image 5 and later are ${productReferenceText}.`
              : `Image 1 = cleaned angle control layout guide; image 2 = original uploaded angle reference; image 3 = background environment; image 4 = model outfit/body styling; image 5 and later are ${productReferenceText}.`
            : `Image 1 = cleaned angle control layout guide; image 2 = original uploaded angle reference; image 3 = background environment; image 4 and later are ${productReferenceText}.`,
          isFixedSingleFootLibraryAngle03Or04
            ? 'First read the dynamic control image explanation below, then use the structured angle schema and original yellow/S shoe region as the exact shoe placement authority. Use the fixed leg reference for leg anatomy and skin only. The magenta region is only a secondary rough shoe-area hint.'
            : 'First read the dynamic control image explanation below, then use the structured angle schema for pose, shoe count, worn/handheld/display roles, red clothing regions, camera view, crop focus, and S/B/R object coordinates. Use the original angle reference only to verify pose and occlusion.',
          `Use ${productReferenceUseText} as the only source of shoe design, material, color, straps, buckle, toe, heel, sole, stitching, lining, and proportions.`,
          'Use the background reference as the only source of the exact uploaded environment, visible existing elements, light direction, color temperature, and shadow mood. Do not add any background structure or room feature that is not already visible.',
          hasModelReference
            ? isFixedSingleFootLibraryAngle03Or04
              ? 'Use image 4 only for fixed leg anatomy, calf shape, ankle contact, unified skin tone, leg size, and natural leg structure. Do not copy its background, props, white canvas, shoe color, shoe style, or magenta color.'
              : 'Use the model reference only for outfit category, fabric, drape, skin tone, and lower-body styling. Do not copy model shoes or model background.'
            : 'No model reference is provided; keep body/clothing simple and driven by the angle layout.',
        ].join('\n')
      : ''
    const realPhotoReferenceInstruction = hasRealPhotoAngleReference
          ? [
              'REFERENCE ROLE ORDER:',
              hasModelReference
                ? `Image 1 = real photo angle reference; image 2 = background environment; image 3 = model outfit/body styling; image 4 and later are ${productReferenceText}.`
                : `Image 1 = real photo angle reference; image 2 = background environment; image 3 and later are ${productReferenceText}.`,
              'Use image 1 directly for camera viewpoint, shooting height, lens perspective, crop, pose, shoe count, shoe placement, shoe angle, hand/foot/body relationship, scale, overlap, and occlusion.',
              'Do not interpret image 1 as a yellow/blue/red/black semantic color-block mask. Do not render mask colors or guide marks.',
              `Use ${productReferenceUseText} as the only source of shoe design, material, color, straps, buckle, toe, heel, sole, stitching, lining, and proportions.`,
          'Use the background reference as the only source of the exact uploaded environment, visible existing elements, light direction, color temperature, and shadow mood. Do not add any background structure or room feature that is not already visible.',
          hasModelReference
            ? 'Use the model reference only for outfit category, fabric, drape, skin tone, and lower-body styling. Do not copy model shoes or model background.'
            : 'No model reference is provided; keep body/clothing simple and driven by the real photo angle reference.',
        ].join('\n')
      : ''
    const finalHardLayoutLock = isFixedSingleFootLibraryAngle03Or04
      ? [
            fixedSingleFootLibraryFinalLock,
            'FINAL HARD LAYOUT LOCK - FIXED ANGLE 3 / ANGLE 4 ONLY:',
            'For angle-03 and angle-04, the fixed reference geometry overrides generic composition balancing, product-photo camera, product-photo scale, and aesthetic recentering. Keep the reference leg and shoe placement unchanged regardless of uploaded shoe style.',
            'The cleaned angle control image and original angle reference are coordinate/layout guides only. Their blue/yellow colors must never appear in the final image; blue leg metadata becomes one unified fair natural skin leg, and yellow shoe metadata becomes the uploaded product shoe.',
            'If the uploaded product shoe has a different silhouette, fit it into the fixed side-view shoe region without changing the shoe center, toe direction, heel side, outsole direction, leg entry, ankle position, or crop.',
            'Final matched-pair check for angle-03 and angle-04: compare shoe length, shoe height, shoe center, heel position, toe endpoint, outsole baseline, ankle opening height, leg entry point, contact shadow footprint, shadow softness, shadow direction, highlight direction, exposure, and camera crop only after both shoes are fitted into their original angle yellow/S regions. Product references may change shoe identity and details only. Never move, enlarge, lower, crop, recenter, relight, brighten, darken, or change shadow scale away from the angle yellow/S region and uploaded background lighting to satisfy product-photo appearance.',
          ].join('\n')
      : hasAngleControlReference
      ? isSingleFootAngleControl
        ? [
            'FINAL HARD LAYOUT LOCK - SINGLE-FOOT CHANNEL ONLY:',
            'This is the dedicated single-foot angle reference channel. The single-foot code layout overrides generic angle-control shoe-count and multi-worn-shoe rules.',
            'Generate exactly one visible worn foot/leg: footX1. Only one product shoe may be worn on footX1. Every other detected product shoe is a bare display shoe with no foot, ankle, leg, skin, sock, or toes inside.',
            'Follow SINGLE-FOOT INDEPENDENT SHOE MAP BY CODE before any generic S x2 wording: S1 WORN x1 is the worn shoe object with its own bbox and toeDirection; S2 DISPLAY x1 is the bare display shoe object with its own bbox and toeDirection.',
            'Ignore raw x2 suffixes from the normal parser when they conflict with the single-foot layout. Do not turn S1 x2 or S2 x2 into two worn feet, four shoes, or a second leg. Use the cleaned single-foot role text and coordinates.',
            'The cameraView from the single-foot code layout is authoritative. If it says eye-level or low side-view, do not add top-down, first-person downward, overhead, flat-lay, or ground-plane camera rules. If it says first-person downward/top-down, only then use the top-down grounded-foot rule.',
            'Follow SINGLE-FOOT SIDE PAIR ANALYSIS BY CODE exactly: if wornFootSide=RIGHT then displayShoeSide must be LEFT; if wornFootSide=LEFT then displayShoeSide must be RIGHT. The display shoe must never be generated as the same left/right side as the worn shoe.',
            'Before generating, visually identify the product shoe buckle/clasp/strap fastener from image 5. Use that buckle as the left/right shoe side marker: the worn shoe buckle must appear on the wornShoeBuckleSide from the single-foot map, and the bare display shoe buckle must appear on the displayShoeBuckleSide from the single-foot map.',
            'If the display shoe buckle appears on the same side as the worn shoe, on the inner side, missing, or swapped, the single-foot result fails. Do not fix left/right pairing by mirroring, rotating, or reversing toe direction; keep toe direction from the control map and change only the buckle/clasp side.',
            'Left/right pairing must be visible in the entire shoe body, not only in the strap or buckle. The display shoe must be the opposite shoe side from the worn shoe: toe-box curve, opening shape, inner wall, outer wall, heel counter, strap anchor, buckle side, and side seam all need to read as the matching opposite left/right shoe.',
            'Do not create two shoes from the same side with only the strap or buckle moved. Preserve the S1/S2 location order from the single-foot map: if the map says S2 DISPLAY is viewer-left of S1 WORN, keep the bare display shoe on the viewer-left and the worn shoe on the viewer-right.',
            'The worn shoe and the bare display shoe must preserve their S object coordinates, scale, perspective, and toe/front direction from the control image. If a left/right shoe pair is required, distinguish the pair by buckle/clasp side, not by reversing one shoe toe direction.',
            'The worn shoe and display shoe must point their toes/fronts toward the same canvas direction. Do not flip one shoe front-to-back to satisfy left/right pairing; only the buckle/clasp side changes.',
            'Red clothing regions are only lower-body outfit support. They must not introduce the model face, head, portrait, torso, or full upper body.',
            'Aim the camera and crop at the product shoes. The product shoes must be the largest, sharpest, clearest subject; show only shoes, the one foot/leg, and required clothing hem/partial lower garment.',
            'After satisfying the single-foot layout, still render the final result as premium realistic commercial photography with natural lighting and material quality.',
          ].join('\n')
        : [
            'FINAL HARD LAYOUT LOCK:',
            'The structured angle schema is authoritative for poseType, mainShoeCount, wornShoeCount, handheldOrHandSupportedShoeCount, standaloneDisplayShoeCount, blueLegFootRegionCount, blueHandRegionCount, redClothingRegionCount, cameraView, cropFocus, depth layer map, clothing region map, skeleton map, hand/foot candidates, shoe-limb bindings, and S/B/R object roles.',
            'The code-generated control is for angle/depth/pose only; it must not control light, color, texture, material quality, background mood, contrast, or photographic finish.',
            'Do not convert DISPLAY shoes into worn shoes. Do not convert HAND-supported shoes into worn shoes. Do not convert HAND regions into legs or feet.',
            'If exactly two product shoes are visible, they must be a natural left-shoe/right-shoe pair. This applies even when one shoe is worn and the other is display or hand-supported. Never generate two shoes from the same side or duplicate the same shoe direction onto both shoes. This shoe-side pairing must not change the coordinate layout, camera, rotation, placement, scale, or toe/heel axis from the control image.',
            'Red clothing regions are only lower-body outfit support. They must not introduce the model face, head, portrait, torso, or full upper body.',
            'Aim the camera and crop at the product shoes. The product shoes must be the largest, sharpest, clearest subject; show only shoes, feet, lower legs, hands if detected, and required clothing hem/partial lower garment.',
            'Keep relative coordinates on the X0-X100/Y0-Y100 layout: shoe centers, body origin, limb centers, clothing area, and background boundaries must remain in the same relative places.',
            'If multiple worn shoes are present, they must remain the left-foot/right-foot pair from the foot-side map, with each shoe preserving its own toe/heel endpoint direction. Never duplicate one shoe direction onto both feet and never swap left/right.',
            'If only one worn shoe is present, generate only that one visible foot/shoe and do not invent a second worn foot.',
            'After satisfying layout roles, still render the final result as premium realistic commercial photography with natural lighting and material quality.',
          ].join('\n')
      : ''
    const finalPrompt = [
      fixedSingleFootLibraryFinalLock,
      hardAngleLayoutSummary,
      maskColorBanInstruction,
      criticalOutputInstruction,
      aestheticInstruction,
      hasAngleControlReference
        ? conciseReferenceInstruction
        : hasRealPhotoAngleReference
          ? realPhotoReferenceInstruction
          : rolePriorityInstruction,
      hasAngleControlReference && conciseAngleLayout
        ? `STRUCTURED ANGLE LAYOUT TO FOLLOW:\n${conciseAngleLayout}`
        : '',
      `ORIENTATION LOCK: keep the composition orientation exactly consistent with ${requestedSize}, aspect ratio ${imageSizeToRatioLabel(requestedSize)}; do not return a vertical image when a horizontal size is selected, and do not return a horizontal image when a vertical size is selected.`,
      conciseRequestInstruction ? `CONCISE USER / ANGLE EXTRA INSTRUCTION:\n${conciseRequestInstruction}` : '',
      productReferenceAssignmentHardInstruction,
      !hasAngleControlReference ? mergeImageLockInstruction : '',
      isFixedSingleFootLibraryAngle03Or04
        ? hasAngleControlReference
          ? hasModelReference
            ? `No requirement analysis or plan is needed. Directly generate one final composite image. Use image 1 cleaned angle control and image 2 original yellow/S angle region as the hard shoe placement, size, angle, direction, perspective, and visual-center reference. Use only image 3 background for environment. Use image 4 fixed leg/magenta auxiliary reference only for leg anatomy, unified skin tone, ankle contact, and rough auxiliary shoe-zone confirmation; image 4 must not override the yellow/S shoe placement and must not provide background or shoe appearance. Use ${productReferenceUseText} from image 5 and later for shoes.`
            : `No requirement analysis or plan is needed. Directly generate one final composite image. Use image 1 cleaned angle control and image 2 original yellow/S angle region as the hard shoe placement, size, angle, direction, perspective, and visual-center reference. Use only image 3 background for environment. Use ${productReferenceUseText} from image 4 and later for shoes.`
          : hasModelReference
            ? `No requirement analysis or plan is needed. Directly generate one final composite image. Use image 1 original angle yellow/S region as the hard shoe placement, size, angle, direction, perspective, and visual-center reference. Use only image 2 background for environment. Use image 3 fixed leg/magenta auxiliary reference only for leg anatomy, unified skin tone, ankle contact, and rough auxiliary shoe-zone confirmation; image 3 must not override the yellow/S shoe placement and must not provide background or shoe appearance. Use ${productReferenceUseText} from image 4 and later for shoes.`
            : `No requirement analysis or plan is needed. Directly generate one final composite image. Use image 1 original angle yellow/S region as the hard shoe placement, size, angle, direction, perspective, and visual-center reference. Use only image 2 background for environment. Use ${productReferenceUseText} from image 3 and later for shoes.`
        : hasAngleControlReference
        ? hasModelReference
          ? isFixedSingleFootLibraryAngle03Or04
            ? `No requirement analysis or plan is needed. Directly generate one final composite image. Use image 1 cleaned angle control and image 2 original yellow/S angle region as the hard shoe placement, size, angle, direction, perspective, and visual-center reference. Use only image 3 background for environment. Use image 4 fixed leg/magenta auxiliary reference only for leg anatomy, unified skin tone, ankle contact, and rough auxiliary shoe-zone confirmation; image 4 must not override the yellow/S shoe placement and must not provide background or shoe appearance. Use ${productReferenceUseText} from image 5 and later for shoes.`
            : `No requirement analysis or plan is needed. Directly generate one final composite image. Use image 1 cleaned angle control as the hard layout reference. Use image 2 original angle reference only as secondary verification. Use only image 3 background for environment. Use image 4 model reference only for outfit/body styling. Use ${productReferenceUseText} from image 5 and later for shoes.`
          : `No requirement analysis or plan is needed. Directly generate one final composite image. Use image 1 cleaned angle control as the hard layout reference. Use image 2 original angle reference only as secondary verification. Use only image 3 background for environment. Use ${productReferenceUseText} from image 4 and later for shoes.`
        : hasRealPhotoAngleReference
          ? hasModelReference
            ? `No requirement analysis or plan is needed. Directly generate one final composite image. Use image 1 real photo angle reference as the hard camera/pose/composition reference. Use only image 2 background for environment. Use image 3 model reference only for outfit, body-limb styling, skin tone, and lower-body proportions, excluding background, shoes, props, and watermark. Use ${productReferenceUseText} from image 4 and later for shoes.`
            : `No requirement analysis or plan is needed. Directly generate one final composite image. Use image 1 real photo angle reference as the hard camera/pose/composition reference. Use only image 2 background for environment. Use ${productReferenceUseText} from image 3 and later for shoes.`
          : hasModelReference
          ? `No requirement analysis or plan is needed. Directly generate one final composite image. Use the uploaded references as hard references. Match image 1 angle-mask for composition, pose, blue-region limb identity, yellow-region shoe count/placement/angle/scale, and camera. Use only image 2 background for environment. Use image 3 model reference only for outfit, body-limb styling, skin tone, and lower-body proportions, excluding background, shoes, props, and watermark. Use ${productReferenceUseText} from image 4 and later for shoes.`
          : `No requirement analysis or plan is needed. Directly generate one final composite image. Use the uploaded references as hard references. Match image 1 angle-mask for composition, pose, blue-region limb identity, yellow-region shoe count/placement/angle/scale, and camera. Use only image 2 background for environment. Use ${productReferenceUseText} from image 3 and later for shoes.`,
      finalHardLayoutLock,
    ].filter(Boolean).join('\n')
    timing.mark('prompt built', { finalPromptChars: finalPrompt.length })

    const result = await callOpenAIImageWithRetry({
      settings: { ...settings, __timing: timing },
      prompt: finalPrompt,
      size: apiSize,
      referenceImageUrls,
      promptMaxChars: 5200,
      skipGenericReferenceInstruction: true,
      disablePromptCompression: true,
    })
    timing.mark('image api completed', { hasUsage: Boolean(result.usage), dataCount: Array.isArray(result.data) ? result.data.length : 0 })
    const item = result.data?.[0]
    if (!item?.b64_json && !item?.url) {
      throw new Error('图片生成接口未返回图片。')
    }

    let imageBuffer
    let sourceMimeType = 'image/png'
    if (item.b64_json) {
      imageBuffer = Buffer.from(item.b64_json, 'base64')
      timing.mark('image buffer decoded', { source: 'b64_json', imageBytes: imageBuffer.length })
    } else {
      timing.mark('image url download start', { url: item.url })
      const imageResponse = await fetch(item.url)
      if (!imageResponse.ok) throw new Error('图片 URL 下载失败。')
      sourceMimeType = imageResponse.headers.get('content-type') || sourceMimeType
      imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
      timing.mark('image url downloaded', { source: 'url', imageBytes: imageBuffer.length, mimeType: sourceMimeType })
    }

    const outputDir = path.join(projectsRoot, projectId, 'outputs')
    await ensureDir(outputDir)
    const targetCanvas = ensureImageTargetCanvas({
      imageBuffer,
      mimeType: sourceMimeType,
      size: requestedSize,
      title: 'AI Product Background Fusion',
    })
    const finalImageBuffer = targetCanvas.buffer
    sourceMimeType = targetCanvas.mimeType || sourceMimeType
    timing.mark('image saved as target canvas', { outputBytes: finalImageBuffer.length, mimeType: sourceMimeType, requestedSize })
    const fileExt = sourceMimeType.includes('svg') ? '.svg' : sourceMimeType.includes('jpeg') ? '.jpg' : sourceMimeType.includes('webp') ? '.webp' : '.png'
    const fileName = `${safeFileName(skillId)}-${Date.now()}${fileExt}`
    await fs.writeFile(path.join(outputDir, fileName), finalImageBuffer)
    timing.mark('output written', { fileName, outputBytes: finalImageBuffer.length })
    const imageUrl = `/files/${projectId}/outputs/${fileName}`
    const svgUrl = ''
    const timingSummary = timing.summary({
      referenceCount: referenceImageUrls.length,
      promptChars: finalPrompt.length,
      requestedSize,
      apiSize,
    })
    const recordPrompt = buildMergeImageChineseRecordPrompt({
      files: uploadedFiles,
      angleSource,
      requestedSize,
      apiSize,
      hasModelReference,
    })
    const imageRecord = {
      imageUrl,
      title: '一键三图融合',
      prompt: recordPrompt,
      compactPrompt: recordPrompt,
      imageModel: settings.openai?.imageModel || 'gpt-image-2',
      imageBaseURL: settings.openai?.baseURL || 'https://api.openai.com/v1',
      size: requestedSize,
      apiSize,
      directionId: 'merge-one-click',
      directionTitle: '一键三图融合',
      referenceImageUrls,
      revisedPrompt: item.revised_prompt || '',
      debugFinalPrompt: finalPrompt,
      timing: timingSummary,
      createdAt: new Date().toISOString(),
    }
    const project = {
      id: projectId,
      skillId,
      brief: buildMergeImageChineseBrief({
        files: uploadedFiles,
        angleSource,
        requestedSize,
        hasModelReference,
      }),
      uploadedFiles,
      images: [imageRecord],
      lastImage: imageRecord,
      timing: timingSummary,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await writeJson(path.join(projectsRoot, projectId, 'project.json'), project)
    timing.mark('project json written')
    res.json({ projectId, uploadedFiles, imageUrl, svgUrl, size: requestedSize, apiSize, revisedPrompt: item.revised_prompt || '', usage: result.usage || null, timing: timingSummary })
  } catch (error) {
    timing.mark('failed', { message: error?.message || String(error) })
    next(error)
  }
})

app.post('/api/run/confirm-references', async (req, res, next) => {
  try {
    const {
      projectId,
      selectedReferenceFiles = [],
      selectedDeliveryIds = [],
      selectedThemeDirection = '',
      selectedInferredChoices = [],
    } = req.body
    if (!projectId) {
      res.status(400).json({ error: '缺少 projectId。' })
      return
    }
    const project = await readProject(projectId)
    const skill = await loadSkill(project.skillId)
    const selectedReferences = skill.references
      .filter((reference) => selectedReferenceFiles.includes(reference.file))
      .map((reference) => ({
        file: reference.file,
        title: reference.title,
        summary: reference.summary,
        content: reference.content.slice(0, 5000),
      }))
    const deliveryOptions = isLogoSkill(skill) ? inferLogoDeliveryOptions(project.brief) : skill.guidance?.deliveryOptions || []
    const selectedDeliveries = deliveryOptions.filter((item) => selectedDeliveryIds.includes(item.id))
    const inferredSummary = summarizeInferredSelections(selectedInferredChoices)
    const enrichedProject = inferredSummary
      ? {
          ...project,
          brief: `${project.brief}\n\n已确认的智能补充信息：\n${inferredSummary}`,
        }
      : project
    const settings = await readJson(settingsPath, {})
    const fallback = fallbackDirection({ skill, project: enrichedProject, selectedReferences, selectedDeliveries, selectedThemeDirection })
    let result
    try {
      result = await callReasoningModel({
        settings,
        skill,
        brief: enrichedProject.brief,
        selectedReferences,
        selectedDeliveries,
        selectedThemeDirection,
        selectedInferredChoices,
      })
    } catch (error) {
      result = {
        ...fallback,
        providerError: error.message,
      }
    }
    if (!result) result = fallback
    result = {
      ...fallback,
      ...result,
      imagePrompt: {
        ...(fallback.imagePrompt || {}),
        ...(result.imagePrompt || {}),
        positive: keepChinesePrompt(result.imagePrompt?.positive, fallback.imagePrompt?.positive),
        negative: keepChinesePrompt(result.imagePrompt?.negative, fallback.imagePrompt?.negative),
      },
      directions: keepChineseDirections(result.directions, fallback.directions),
      deliveryOptions,
      selectedDeliveries,
    }

    await writeJson(path.join(projectsRoot, projectId, 'project.json'), {
      ...project,
      selectedReferenceFiles,
      selectedDeliveryIds,
      selectedThemeDirection,
      selectedInferredChoices,
      direction: result,
      updatedAt: new Date().toISOString(),
    })
    res.json(result)
  } catch (error) {
    next(error)
  }
})

app.post('/api/run/generate-image', upload.array('images'), async (req, res, next) => {
  try {
    const settings = await readJson(settingsPath, {})
    const { projectId, prompt, size, directionId = '', directionTitle = '', referenceImageUrl = '' } = req.body
    if (!projectId || !prompt?.trim()) {
      res.status(400).json({ error: '缺少 projectId 或提示词。' })
      return
    }
    const project = await readProject(projectId)
    const skill = await loadSkill(project.skillId)
    const requestUploadedFiles = await saveUploadedFiles(projectId, req.files || [])
    const logoWhiteBackgroundInstruction = isLogoSkill(skill)
      ? [
          'Logo 生图硬性要求：必须调用图片模型生成白底 Logo 设计稿。',
          '背景必须是纯白色 #FFFFFF，不能是灰底、蓝底、渐变底、发光背景、阴影背景、纸张纹理、玻璃质感背景或环境场景。',
          'Logo 必须居中展示，周围留出干净安全边距；画面只包含 Logo 图形和用户要求的品牌文字。',
          '如果生成中文品牌名，必须严格按用户给定文字生成，不要改字、错字、乱码、缺笔画或多余字。',
        ].join('\n')
      : ''
    const uploadedReferenceUrls = Array.isArray(project.uploadedFiles)
      ? project.uploadedFiles.map((file) => file.url).filter(Boolean)
      : []
    const requestReferenceUrls = requestUploadedFiles.map((file) => file.url).filter(Boolean)
    const multiAngleViewMap = describeMultiAngleUploadedFiles([
      ...(Array.isArray(project.uploadedFiles) ? project.uploadedFiles : []),
      ...requestUploadedFiles,
    ])
    const allReferenceFilesForGeneration = [
      ...(Array.isArray(project.uploadedFiles) ? project.uploadedFiles : []),
      ...requestUploadedFiles,
    ]
    const multiAngleMode = isMultiAngleSkillId(project.skillId)
    const mergeImageMode = isMergeImageSkillId(project.skillId)
    const lockedProductReferenceUrls = multiAngleMode
      ? allReferenceFilesForGeneration.filter(isMultiAngleProductViewFile).map((file) => file.url).filter(Boolean)
      : []
    const mergeImageReferenceUrls = mergeImageMode
      ? allReferenceFilesForGeneration
        .filter((file, index) => ['product', 'background', 'angle'].includes(mergeImageRole(file, index)))
        .map((file) => file.url)
        .filter(Boolean)
      : []
    const referenceImageUrls = mergeImageMode && mergeImageReferenceUrls.length
      ? [...mergeImageReferenceUrls, referenceImageUrl].filter(Boolean)
      : multiAngleMode && lockedProductReferenceUrls.length
      ? [...lockedProductReferenceUrls, referenceImageUrl].filter(Boolean)
      : [
      ...uploadedReferenceUrls,
      ...requestReferenceUrls,
      referenceImageUrl,
    ].filter(Boolean)
    const referenceNote = uploadedReferenceUrls.length
      ? mergeImageMode
        ? `\n用户上传的三图融合参考已随本次生图请求一起传入。必须按角色读取：产品鞋图锁定产品外观，背景图锁定场景和光影，角度图只提供姿态角度。不要把三张图当作普通风格灵感。`
        : multiAngleMode
        ? `\n用户上传的产品视图图已随本次生图请求一起传入。请把这些产品视图图作为真实主体硬参考，不要只当作可选灵感；必须保留主体外形、颜色、材质、比例、结构、标识位置和关键细节。只能改变相机观察方向来生成新角度，不能改变产品本体。`
        : `\n用户上传的产品图或参考图已随本次生图请求一起传入。请把上传的产品图作为真实主体参考，不要只当作可选灵感；需要保留主体外形、颜色、材质、标识位置和关键细节。产品角度、朝向和透视可以根据画面构图、卖点表达和版式需要合理调整，不要求与参考图角度完全一致。`
      : ''
    const requestReferenceNote = requestReferenceUrls.length
      ? mergeImageMode
        ? `\n本次生成额外上传了 ${requestReferenceUrls.length} 张融合参考图。若文件名包含 merge-product、merge-background、merge-angle，必须按这些角色读取；角度图绝不能作为产品外观来源。`
        : multiAngleMode
        ? `\n本次生成额外上传了 ${requestReferenceUrls.length} 张产品视图参考图。它们不是风格灵感图，而是产品结构和外观锁定图；必须按视图身份读取并保持产品本体不变。`
        : `\n本次生成额外上传了 ${requestReferenceUrls.length} 张参考图。若是 Logo 样机任务，必须高度参考这些图的样机场景、构图关系、材质质感、光影氛围、道具组合和行业视觉语言；不要复制其中的其他品牌 Logo 或文字，最终品牌标识仍以选中的 Logo 参考图为准。`
      : ''
    const requestReferenceAnalysis = requestReferenceUrls.length
      ? await analyzeReferenceImages({
          settings,
          imageUrls: requestReferenceUrls,
          taskContext: [directionTitle, prompt].filter(Boolean).join('\n').slice(0, 1200),
        })
      : ''
    const requestReferenceAnalysisNote = requestReferenceAnalysis
      ? mergeImageMode
        ? `\n已经先读取并分析了本次上传的融合参考图，生成时必须结合下面的图像内容理解，而不是只看用户文字：\n${requestReferenceAnalysis}\n请严格区分三图角色：产品图锁定鞋子外观，背景图锁定环境和光线，角度图只锁定鞋子姿态。`
        : multiAngleMode
        ? `\n已经先读取并分析了用户上传的产品视图图，生成时必须结合下面的图像内容理解，而不是只看用户文字：\n${requestReferenceAnalysis}\n请把这些可见内容用于锁定产品结构、轮廓、材质、颜色、Logo/文字位置和细节，不要把它们改成新的产品设计。`
        : `\n已经先读取并分析了用户上传的样机参考图，生成时必须结合下面的图像内容理解，而不是只看用户文字：\n${requestReferenceAnalysis}\n请把这些可见内容落实到新图的场景、构图、材质、光影、道具和氛围中；但不要复制参考图中的其他品牌 Logo、文字或水印。`
      : ''
    const mergeImageLockInstruction = mergeImageMode ? buildMergeImageLockInstruction(allReferenceFilesForGeneration) : ''
    const multiAngleProductLockInstruction = multiAngleMode
      ? [
          '产品多角度图硬性一致性规则：本次生成必须以用户上传的产品视图图片作为唯一真实商品主体参考。',
          multiAngleViewMap ? `用户上传图片视图对照表如下，必须逐张按视图身份读取，不得混淆正视图、侧视图、背面、顶部、底部、细节图和角度构图参考图：\n${multiAngleViewMap}` : '',
          lockedProductReferenceUrls.length ? `本次真正传入图片模型作为产品外观硬参考的只有 ${lockedProductReferenceUrls.length} 张产品视图图；角度/构图参考图不得作为产品外观来源。` : '',
          '必须保持同一 SKU、同一件产品：颜色、材质、比例、轮廓、结构、Logo、标签、文字位置、纹理、缝线、接口、配件、包装信息和所有可见细节都不得改变。',
          '只允许改变相机角度、透视、画布比例、排版和背景；不得重新设计、替换、简化、美化、添加或删除产品本体细节。',
          '不要“画一个相似产品”，不要借用角度参考图中的产品款式，不要优化、补全或替换上传产品的任何设计。生成结果必须看起来就是上传产品从新角度拍摄出来的照片。',
          '如果参考图信息不足，只能保守推断隐藏面；不要生成与参考产品不一致的新结构。',
        ].filter(Boolean).join('\n')
      : ''
    const detailPageNote = isDetailPageSkill(skill)
      ? `\n${DETAIL_PAGE_LAYOUT_SYSTEM_RULES}\n${buildDetailPageGenerationRules({ project, directionTitle })}`
      : ''
    const logoMockupInstruction = isLogoSkill(skill) && /logo-mockup-|custom-followup/.test(String(directionId || ''))
      ? [
          '重要覆盖规则：本次是 Logo 样机应用图，不是白底 Logo 设计稿。',
          '请忽略“纯白背景、只包含 Logo”的限制，改为生成真实品牌应用样机。',
          `必须严格按本次请求尺寸 ${size || '1024x1024'}、画幅比例 ${imageSizeToRatioLabel(size || '1024x1024')} 组织构图，不要输出其他比例或把画面裁成方图。`,
          '不要为了适配画幅而拉伸、压扁、扭曲 Logo、包装、杯身、屏幕、门头、道具或文字；必须根据真实镜头透视、摆放角度和构图空间调整元素的角度、远近、大小和留白。',
          '必须以参考 Logo 图为唯一品牌标识，保持 Logo 结构、文字、比例和颜色关系不变；不要重绘、改字、错字、变形或替换 Logo。',
          '不要白花花空背景，不要只做白底 Logo 预览；必须出现真实应用场景、材质、光影、空间层次和行业相关道具。',
          '可以使用包装、杯身、门店、柜台、橱窗、展架、名片、吊牌、屏幕、社媒头像等行业应用场景，画面要精致、干净、商业化、适合客户提案。',
          '优先生成有氛围的品牌样机摄影/提案图：自然光、柔和阴影、真实材质表面、合理道具和高级构图，但不要遮挡或改变 Logo。',
          '设计感必须更足：画面要有视觉主次、品牌色延展、材质对比、留白节奏、成组物料系统和 editorial / campaign look，不要像普通模板截图。',
          '可参考花瓣灵感库常见品牌样机和场景图的组织方式：多物料组合、斜向构图、局部特写、空间导视、生活方式场景、精致静物、灯箱招牌、社媒封面矩阵。',
        ].join('\n')
      : ''
    const finalPrompt = [prompt.trim(), mergeImageLockInstruction, multiAngleProductLockInstruction, logoWhiteBackgroundInstruction, referenceNote, requestReferenceNote, requestReferenceAnalysisNote, detailPageNote, logoMockupInstruction].filter(Boolean).join('\n')
    const result = await callOpenAIImageWithRetry({
      settings,
      prompt: finalPrompt,
      size,
      referenceImageUrl,
      referenceImageUrls,
    })
    const item = result.data?.[0]
    if (!item?.b64_json && !item?.url) {
      throw new Error('图片生成接口未返回图片。')
    }

    let imageBuffer
    let sourceMimeType = 'image/png'
    if (item.b64_json) {
      imageBuffer = Buffer.from(item.b64_json, 'base64')
    } else {
      const imageResponse = await fetch(item.url)
      if (!imageResponse.ok) throw new Error('图片 URL 下载失败。')
      sourceMimeType = imageResponse.headers.get('content-type') || sourceMimeType
      imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
    }

    const outputDir = path.join(projectsRoot, projectId, 'outputs')
    await ensureDir(outputDir)
    const shouldWrapAspect = isLogoSkill(skill) && /logo-mockup-|custom-followup/.test(String(directionId || '')) && size && size !== '1024x1024'
    const wrappedImage = shouldWrapAspect
      ? wrapImageInTargetAspect({ imageBuffer, mimeType: sourceMimeType, size, title: directionTitle || 'Logo 样机图' })
      : null
    const finalImageBuffer = wrappedImage || imageBuffer
    const fileExt = wrappedImage ? '.svg' : '.png'
    const fileName = `${safeFileName(project.skillId)}-${Date.now()}${fileExt}`
    await fs.writeFile(path.join(outputDir, fileName), finalImageBuffer)
    const imageUrl = `/files/${projectId}/outputs/${fileName}`
    let svgUrl = ''
    const imageRecord = {
      imageUrl,
      title: directionTitle || '生成图片',
      prompt: finalPrompt,
      compactPrompt: compactImagePrompt(finalPrompt),
      imageModel: settings.openai?.imageModel || 'gpt-image-2',
      imageBaseURL: settings.openai?.baseURL || 'https://api.openai.com/v1',
      size,
      directionId,
      directionTitle,
      referenceImageUrl,
      referenceImageUrls,
      referenceAnalysis: requestReferenceAnalysis,
      revisedPrompt: item.revised_prompt || '',
      createdAt: new Date().toISOString(),
    }
    await writeJson(path.join(projectsRoot, projectId, 'project.json'), {
      ...project,
      images: [...(Array.isArray(project.images) ? project.images : []), imageRecord],
      lastImage: imageRecord,
      updatedAt: new Date().toISOString(),
    })
    res.json({ imageUrl, svgUrl, revisedPrompt: item.revised_prompt || '', usage: result.usage || null })
  } catch (error) {
    next(error)
  }
})

app.post('/api/run/reason-followup', async (req, res, next) => {
  try {
    const { projectId, userRequest = '', failedDirections = [], currentPrompt = '' } = req.body
    if (!projectId || !String(userRequest).trim()) {
      res.status(400).json({ error: '缺少 projectId 或补充需求。' })
      return
    }
    const project = await readProject(projectId)
    const skill = await loadSkill(project.skillId)
    const settings = await readJson(settingsPath, {})
    const fallback = {
      message: '我会按你的补充要求重写失败图片的生成描述，并只重试失败的方向。',
      promptPatch: [
        `用户补充要求：${String(userRequest).trim()}`,
        '只针对失败的图片方向重新生成，不覆盖已经成功的图片。',
        '根据用户补充要求调整画面结构、卖点证明方式、主体露出强弱和文字层级。',
        isProductImageSetSkill(skill)
          ? '如果是电商套图，继续保持整套图统一视觉系统，但失败方向必须做出对应页型差异，不要重复已经成功的页面构图。'
          : '',
      ].filter(Boolean).join('\n'),
    }
    let result = fallback
    const reasoning = settings?.reasoning || settings?.doubao
    if (reasoning?.apiKey && reasoning?.baseURL && reasoning?.model) {
      const messages = [
        {
          role: 'system',
          content: '你是 Skills Expert 的推理层。必须返回 JSON，不要 markdown。根据用户补充要求，为失败的图片方向生成中文提示词补丁；不要返回英文提示词或英文标签。',
        },
        {
          role: 'user',
          content: JSON.stringify({
            skill: {
              displayName: skill.displayName,
              name: skill.name,
              skillContent: skill.skillContent.slice(0, 8000),
            },
            userBrief: project.brief,
            currentPrompt,
            failedDirections,
            userRequest,
            requiredJsonShape: {
              message: '给用户看的简短说明',
              promptPatch: '追加到每张失败图片提示词里的中文补充要求',
            },
          }),
        },
      ]
      const candidates = resolveReasoningCandidates(reasoning.baseURL)
      for (const { endpoint, mode } of candidates) {
        try {
          const parsed = await requestReasoningJson({ endpoint, mode, reasoning, messages })
          result = {
            message: parsed.message || fallback.message,
            promptPatch: keepChinesePrompt(parsed.promptPatch, fallback.promptPatch),
          }
          break
        } catch {
          result = fallback
        }
      }
    }
    res.json(result)
  } catch (error) {
    next(error)
  }
})

app.post('/api/run/reason-expansion', async (req, res, next) => {
  try {
    const { projectId, baseImage = {}, expansionTasks = [], currentPrompt = '' } = req.body
    if (!projectId || !Array.isArray(expansionTasks) || expansionTasks.length === 0) {
      res.status(400).json({ error: '缺少 projectId 或扩展任务。' })
      return
    }
    const project = await readProject(projectId)
    const skill = await loadSkill(project.skillId)
    const settings = await readJson(settingsPath, {})
    const fallback = {
      message: '已根据当前需求和扩展项整理扩展提示词。',
      taskPrompts: expansionTasks.map((task) => ({
        id: task.id,
        promptPatch: [
          `扩展项：${task.title}`,
          task.description,
          task.detailText || '',
          '根据原始用户需求和当前基准图做差异化延展，不要生成同质化画面。',
        ].filter(Boolean).join('\n'),
      })),
    }
    const fallbackPromptById = new Map(fallback.taskPrompts.map((item) => [item.id, item.promptPatch]))
    let result = fallback
    const reasoning = settings?.reasoning || settings?.doubao
    if (reasoning?.apiKey && reasoning?.baseURL && reasoning?.model) {
      const messages = [
        {
          role: 'system',
          content: [
            '你是 Skills Expert 的扩展推理层。必须返回 JSON，不要 markdown。',
            '你必须遵循 skillContent 的扩展逻辑，并结合 userBrief、baseImage、expansionTasks 和 currentPrompt。',
            '每个扩展任务都要生成独立 promptPatch，必须对应用户实际输入和该扩展项，不要同质化。',
            '如果用户没有补充扩展要求，就按扩展项默认含义和 Skill 工作流进行合理补全。',
            'promptPatch 必须使用简体中文，不要返回英文提示词、英文标签或英文开场句。',
          ].join('\n'),
        },
        {
          role: 'user',
          content: JSON.stringify({
            skill: {
              displayName: skill.displayName,
              name: skill.name,
              skillContent: skill.skillContent.slice(0, 10000),
            },
            userBrief: project.brief,
            currentPrompt,
            baseImage,
            expansionTasks,
            requiredJsonShape: {
              message: '给用户看的简短说明',
              taskPrompts: [
                {
                  id: '必须对应 expansionTasks 中的 id',
                  promptPatch: '追加到该扩展图提示词里的中文补充要求',
                },
              ],
            },
          }),
        },
      ]
      const candidates = resolveReasoningCandidates(reasoning.baseURL)
      for (const { endpoint, mode } of candidates) {
        try {
          const parsed = await requestReasoningJson({ endpoint, mode, reasoning, messages })
          const taskPrompts = Array.isArray(parsed.taskPrompts) ? parsed.taskPrompts : []
          if (taskPrompts.length) {
            result = {
              message: parsed.message || fallback.message,
              taskPrompts: taskPrompts.map((item) => ({
                ...item,
                promptPatch: keepChinesePrompt(item.promptPatch, fallbackPromptById.get(item.id) || ''),
              })),
            }
            break
          }
        } catch {
          result = fallback
        }
      }
    }
    res.json(result)
  } catch (error) {
    next(error)
  }
})

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(error.status || 500).json({ error: error.message || '服务异常' })
})

const port = Number(process.env.PORT || 8790)
await ensureDir(dataRoot)
app.listen(port, '127.0.0.1', () => {
  console.log(`Skill Runner API listening on http://127.0.0.1:${port}`)
})
