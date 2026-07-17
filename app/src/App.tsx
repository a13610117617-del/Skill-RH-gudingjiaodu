import { Fragment, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent, type PointerEvent as ReactPointerEvent, type WheelEvent } from 'react'
import './App.css'
import { PreviewGallery } from './components/PreviewGallery'
import { ProjectsPanel } from './components/ProjectsPanel'

type Skill = {
  id: string
  displayName: string
  name: string
  description: string
  folder: string
  path?: string
  referencesCount: number
  guidance?: SkillGuidance
}

type DeliveryOption = {
  id: string
  title: string
  description: string
  selected: boolean
}

type LogoMockupGroup = {
  match: RegExp
  options: DeliveryOption[]
}

type SkillGuidance = {
  summary: string
  lead: string
  checklist: string[]
  placeholder: string
  deliveryOptions?: DeliveryOption[]
}

type SkillDeleteConfirm = {
  id: string
  displayName: string
}

type SkillDragState = {
  skillId: string
  pointerId: number
  timer: number | null
  dragging: boolean
  originalSkills: Skill[]
  currentSkills: Skill[]
}

type SettingsStatus = {
  reasoning: {
    baseURL: string
    model: string
    apiKeyMasked: string
    configured: boolean
  }
  openai: {
    baseURL: string
    imageModel: string
    apiKeyMasked: string
    configured: boolean
  }
}

type ReferenceChoice = {
  file: string
  title: string
  reason: string
  score: number
}

type InferredChoiceOption = {
  id: string
  label: string
  value: string
  description?: string
}

type InferredChoice = {
  id: string
  field: string
  title: string
  description?: string
  options: InferredChoiceOption[]
  allowCustom?: boolean
}

function ResetIcon() {
  return (
    <svg className="lightbox-action-icon" aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path
        d="M4.2 5.1A5 5 0 1 1 3 8.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4.2 2.4v2.7h2.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg className="lightbox-action-icon" aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path d="M8 2.5v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m4.8 7.2 3.2 3.2 3.2-3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 13.5h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function SvgConvertIcon() {
  return (
    <svg className="lightbox-action-icon" aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path
        d="M3.5 4.2c0-.9.7-1.6 1.6-1.6h3.4l4 4v5.2c0 .9-.7 1.6-1.6 1.6H5.1c-.9 0-1.6-.7-1.6-1.6V4.2Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
      <path d="M8.5 2.8v3.8h3.8" stroke="currentColor" strokeWidth="1.45" strokeLinejoin="round" />
      <path d="M5.7 10.7c.7.5 1.4.7 2.3.7s1.6-.2 2.3-.7" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
      <path d="M6.2 8.7h3.6" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
    </svg>
  )
}

function CutoutIcon() {
  return (
    <svg className="lightbox-action-icon" aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path
        d="M5.2 3.1c1.4-1 3.7-.8 5 .5 1.7 1.7 1.4 4.7-.6 6.7-1.8 1.8-4.7 2.8-7.1 2.9"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.4 5.2c-.9 1.7-.9 3.7.3 5"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeDasharray="1.2 2.1"
      />
      <path d="m9.8 9.9 3.2 3.2" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
      <path d="m12.7 9.8-2.8 3.4" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="lightbox-action-icon" aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path d="m4.2 4.2 7.6 7.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m11.8 4.2-7.6 7.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ClearSelectionIcon() {
  return (
    <svg className="merge-clear-icon" aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path d="M4.4 4.4 11.6 11.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M11.6 4.4 4.4 11.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="skill-action-icon" aria-hidden="true" viewBox="0 0 16 16" fill="none">
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

function BackToTopIcon() {
  return (
    <svg className="project-back-top-icon" aria-hidden="true" viewBox="0 0 18 18" fill="none">
      <path d="M9 13.5v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m5.2 8.1 3.8-3.8 3.8 3.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MoveIcon() {
  return (
    <svg className="skill-move-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M12 3v6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="m8.75 6.25 3.25-3.25 3.25 3.25" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 15v6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="m8.75 17.75 3.25 3.25 3.25-3.25" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 12h6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="m6.25 8.75-3.25 3.25 3.25 3.25" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 12h6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="m17.75 8.75 3.25 3.25-3.25 3.25" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PinTopIcon() {
  return (
    <svg className="skill-move-icon" aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="M3.75 3.75h12.5" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" />
      <path d="M10 17V6.25" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" />
      <path d="m5.8 10.45 4.2-4.2 4.2 4.2" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MoveUpIcon() {
  return (
    <svg className="skill-move-icon" aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="M10 17V3" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" />
      <path d="m5.3 7.7 4.7-4.7 4.7 4.7" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MoveDownIcon() {
  return (
    <svg className="skill-move-icon" aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="M10 3v14" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" />
      <path d="m5.3 12.3 4.7 4.7 4.7-4.7" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function UploadChoiceIcon() {
  return (
    <svg className="choice-button-icon" aria-hidden="true" viewBox="0 0 14 14" fill="none">
      <path d="M7 9.3V2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4.4 5.1 7 2.5l2.6 2.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 10.8h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

type Analysis = {
  projectId: string
  message: string
  selectedReferences: ReferenceChoice[]
  inferredChoices?: InferredChoice[]
  deliveryOptions?: DeliveryOption[]
  confirmation?: {
    title?: string
    description?: string
    options?: string[]
  }
  providerError?: string
  imagePrompt?: {
    positive?: string
    negative?: string
    size?: string
  }
}

type DirectionOption = {
  id: string
  title: string
  description: string
}

type GenerationTarget = DirectionOption & {
  generationId?: string
  sourceDirectionId?: string
}

type GenerationScope = 'single' | 'multiple' | 'all'

type DirectionResult = {
  message: string
  directions: DirectionOption[]
  imagePrompt: {
    positive: string
    negative?: string
    size?: string
  }
  providerError?: string
  deliveryOptions?: DeliveryOption[]
}

type ImageResult = {
  imageUrl: string
  svgUrl?: string
  revisedPrompt?: string
}

type GeneratedImage = {
  id: string
  directionId: string
  title: string
  imageUrl: string
  svgUrl?: string
  size?: string
  revisedPrompt?: string
}

type GeneratedExpansion = {
  id: string
  directionId: string
  title: string
  description: string
  imageUrl: string
  size?: string
  baseTitle: string
}

type UploadedFile = {
  fileName: string
  originalName: string
  mimeType: string
  size: number
  url: string
}

type MultiAngleSlot = {
  id: string
  label: string
  hint: string
}

type MergeImageSlot = {
  id: 'product' | 'background' | 'angle' | 'model'
  label: string
  hint: string
}

type MultiAngleOutputMode = 'combined' | 'separate'

type MergeImageResolution = '1k' | '2k' | '4k'

type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  content: string
}

type LightboxImage = {
  imageUrl: string
  title: string
  svgUrl?: string
}

type LightboxItem = LightboxImage

type LightboxPan = {
  x: number
  y: number
}

type LightboxDragState = LightboxPan & {
  startX: number
  startY: number
}

type DownloadImageItem = {
  imageUrl: string
  title: string
}

type PendingPreviewCard = {
  id: string
  title: string
}

type FailedDirection = DirectionOption & {
  reason?: string
}

type ExpansionField = {
  id: string
  label: string
  placeholder?: string
  options?: string[]
}

type LogoReuseState = {
  selectedDeliveryIds: string[]
  expansionSelections: string[]
  expansionDetails: Record<string, Record<string, string>>
  logoMockupSize: string
  mockupReferenceImages: File[]
}

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
  referenceImageUrls?: string[]
  createdAt?: string
}

type ProjectItem = {
  id: string
  skillDisplayName: string
  brief: string
  createdAt?: string
  updatedAt?: string
  images: ProjectImage[]
}

type SkillCreateForm = {
  displayName: string
  name: string
  category: string
  purpose: string
  triggers: string
  knowledge: string
  outputFormat: string
  constraints: string
  modelNeeds: string
  referencesPlan: string
  referenceContent: string
}

const emptySkillCreateForm: SkillCreateForm = {
  displayName: '',
  name: '',
  category: '自定义',
  purpose: '',
  triggers: '',
  knowledge: '',
  outputFormat: '',
  constraints: '',
  modelNeeds: '',
  referencesPlan: '',
  referenceContent: '',
}

const multiAngleSlots: MultiAngleSlot[] = [
  { id: 'front', label: '正视图', hint: '商品正面、主图角度' },
  { id: 'left', label: '左侧视图', hint: '左侧轮廓与厚度' },
  { id: 'back', label: '背面', hint: '背部结构、标签或接口' },
  { id: 'right', label: '右侧视图', hint: '右侧轮廓与细节' },
  { id: 'top', label: '顶部', hint: '顶部按钮、开口或纹理' },
  { id: 'bottom', label: '底部', hint: '底标、脚垫或底座' },
  { id: 'detail', label: '细节特写', hint: 'Logo、材质、纹理、接口' },
  { id: 'package', label: '包装/配件', hint: '包装盒、配件、套装' },
]

const multiAngleViewCounts = [3, 6, 9, 12]

const mergeImageSlots: MergeImageSlot[] = [
  { id: 'product', label: '产品鞋图', hint: '可上传多张；不同鞋图会分别生成对应鞋款，只传一张则所有鞋用同款' },
  { id: 'background', label: '背景图', hint: '锁定墙面、地面、空间、光线和阴影方向' },
]

const mergeAngleModelSlot: MergeImageSlot = {
  id: 'model',
  label: '模特参考图',
  hint: '仅角度5/6使用；参考模特穿搭、服装颜色、材质和下半身造型',
}

const mergeAnglePosePrompts: Record<string, string> = {
  'angle-01': '选定姿势提示：斜俯拍近景构图，一只脚从画面右侧伸入并穿鞋，鞋头朝左上方；另一只鞋由手从下方托住展示，位于前景偏左下。整体是“脚上试穿一只 + 手持展示一只”的双鞋组合，手和脚形成交叉层次，镜头从上方斜向俯视，突出试穿与手持展示的互动关系。腿部和手部皮肤必须白皙、清透、自然，肤色均匀一致，有细腻真实皮肤纹理；不要偏黄、偏黑、暗沉、脏灰或色块感。脚穿鞋连接的是裸露腿部，不穿裤子，不穿袜裤、打底裤、长裤、牛仔裤或运动裤，只保留自然裸腿/脚踝。两只鞋都是同等重要的产品主体，画面占比、鞋身可见长度、鞋身高度和视觉权重要接近；脚上穿的鞋不能变成远处背景板、陪衬小鞋或虚化背景元素，手持鞋也不能明显大过脚穿鞋。',
  'angle-02': '选定姿势提示：高位斜俯拍双鞋展示构图，不出现人物肢体。两只鞋斜向并列摆放，整体从左下延伸到右上，鞋头朝右下方，鞋跟朝左上方。画面呈干净的产品陈列视角，两只鞋有轻微前后错位和透视层次，适合表现一双鞋的整体角度和鞋面结构。',
  'angle-03': '选定姿势提示：严格复刻角度库参考图的单脚侧面运动鞋试穿近景构图。腿部从画面上方偏左进入，沿右下方向轻微弯曲下落，脚踝插入鞋口；鞋子占据画面中下部的大面积视觉中心，鞋跟在左侧偏下，鞋头朝右，厚底沿画面下方横向延展，鞋身为完整侧面展示。镜头接近侧面平视或轻微低角度近景，画面只强调一只脚穿鞋的试穿动作，不出现第二只脚、手或额外展示鞋。',
  'angle-04': '选定姿势提示：严格复刻角度库参考图的单脚侧面运动鞋试穿近景构图。腿部从画面上方偏左进入，沿右下方向轻微弯曲下落，脚踝插入鞋口；鞋子占据画面中下部的大面积视觉中心，鞋跟在左侧偏下，鞋头朝右，厚底沿画面下方横向延展，鞋身为完整侧面展示。镜头接近侧面平视或轻微低角度近景，画面只强调一只脚穿鞋的试穿动作，不出现第二只脚、手或额外展示鞋。',
  'angle-05': '选定姿势提示：下半身近景构图，画面只展示模特局部腿部、脚部和一只手，不出现脸部、头部或完整上半身。上传的背景图必须作为最终画面的唯一背景来源，背景里的地面、墙面、空间、道具、前景物、裁切、透视、光线方向、色温和阴影都要按照上传背景图生成；不要复制模特参考图、角度参考图或产品鞋图里的背景，也不要新增上传背景图里没有的环境元素。模特模拟下蹲姿势，但画面只需要展示出一只腿，不要生成第二条完整腿、双腿并排或完整下半身。一只脚自然踩在画面左下方地面上，腿部从画面左上方垂直向下延伸，脚尖朝画面右侧，鞋身以侧面角度展示。另一只手从画面上方偏中间位置伸入，手臂斜向下延伸，手部动作参考“手指向下钩住鞋子”的拿法：食指和中指自然弯曲向下，钩住鞋口内侧、后跟提拉处或鞋帮上沿，拇指在外侧辅助固定，手掌在鞋口上方形成真实受力，让鞋被自然提起悬空展示。不要只用指尖捏住一点点，不要生成夹不住鞋的轻飘动作，抓握要稳定自然。手持鞋位于画面右侧偏中上区域，鞋头朝画面右下方，鞋跟朝画面左上方，呈轻微俯视角度。整体形成“一只脚穿着展示，另一只手拿着展示”的双鞋组合，画面必须出现两只产品鞋：左下穿着鞋和右上手持鞋。若上传两张产品鞋图，左下穿着鞋使用第1张产品鞋图，右上手持鞋使用第2张产品鞋图，两只鞋要保留各自的颜色、材质、鞋底、鞋面、鞋带/扣件、纹理和比例，不要统一成同一双鞋、不要混合平均、不要把第二张鞋图改成第一张；若只上传一张产品鞋图，则两只鞋都使用同一张产品鞋图。穿着的鞋靠近画面下方，手持的鞋悬浮在画面右侧。角度5黄色区域边距锁定：穿着鞋必须严格落在左下黄色区域，对应画面边距约为左9.4%、右31.5%、上49.2%、下15.0%，鞋子视觉中心约在X37.9%、Y69.4%；手持鞋必须严格落在右上黄色区域，对应画面边距约为左42.4%、右15.0%、上16.4%、下41.2%，鞋子视觉中心约在X64.8%、Y39.1%。两只鞋之间的相对距离必须严格按参考图两个黄色区域的紧凑关系生成：手持鞋中心相对穿着鞋中心向右约26.9%、向上约30.3%，但两只鞋的外接区域在画面X方向有明显重叠，不是左右分开的两块区域；最终画面两只鞋之间不能出现宽大的空白走廊或大面积背景间隔。手持鞋要靠近穿着鞋的右上方，形成紧凑的对角展示关系，视觉间隔只能是参考图里很窄的斜向缝隙。不要把手持鞋推到更远的右上角，不要把穿着鞋推到更远的左下角；手、手臂、衣服、背景道具、空地或构图审美都不能把两只鞋拉开。生成前后都要检查两个鞋子的间隔，若两只鞋之间的空白明显变大、两只鞋像分散在画面两端，则结果错误；不要自行拉远、放大间隔、缩小、上移、下移或重新居中。摄影级画面要求：生成结果必须像专业商业鞋履摄影拍摄，曝光准确，画面明亮干净通透，白场清爽，高光自然，产品边缘清晰，鞋面材质、鞋底、缝线、扣件和皮革纹理要清楚，色彩准确且有高级广告修图质感；阴影只能是柔和自然的接触阴影和形体阴影，不能压暗整张画面。不要发灰、发暗、低曝光、脏灰色调、雾蒙蒙、低对比、去饱和、手机随拍感或灰色滤镜感。模特服装只在左侧和上方局部出现，整体为下半身/手部局部裁切。',
  'angle-06': '选定姿势提示：半身近景构图，以鞋子为绝对主体，鞋子的画面占比、大小、覆盖范围和视觉权重必须严格按照角度6参考图里的黄色区域来生成，不要自行放大、缩小或重新估算占比；人物、衣服、腿部和手只作为辅助展示关系。模特朝画面左侧侧坐，身体主要位于画面左侧，只截取胸部以下的位置，不出现脸、头部或完整上半身。画面左上方只能看到模特局部衣服和身体轮廓，画面左下角只露出一点点腿部，腿部不是主体。模特双手分别拿着两只鞋向镜头前方展示，手主要抓住鞋子的后脚底部、后跟底部或后跟外侧支撑点。两只鞋子的方向必须一致：鞋后和鞋跟朝向人物身体一侧，鞋头统一朝画面的右下角，两只鞋位于角度6参考图黄色区域对应的位置和范围内，靠近镜头并占据主要视觉中心，鞋身要清晰、完整，形成前后错落的近距离展示关系。手部必须自然真实，按照正常人体手部结构生成；每只可见手保持五指数量正确、指节清晰、关节比例正常、手掌大小合理，手指自然贴合鞋底或后跟受力。不要生成多指、少指、断指、融合手指、漂浮手指、重复手指、过长手指、扭曲手腕、畸形手掌、手指穿模或不合理抓握。',
}

const mergeAngleRoleLocks: Record<string, string> = {
  'angle-01': 'Selected pose prompt role lock: angle-01 must remain exactly one worn shoe on one foot plus exactly one hand-held or hand-supported display shoe. The lower-left foreground shoe is supported by a natural hand/wrist and must not become worn on a second foot. The upper/right shoe is worn on the single visible bare foot/leg. Do not convert the hand-supported shoe into a worn shoe, do not create two feet wearing both shoes, and do not remove the hand. Angle-01 skin lock: the visible leg, ankle, foot skin, hand, wrist, and fingers must be fair/white, clean, translucent natural skin with even tone and fine realistic skin texture. Do not make skin yellowish, dark, tanned, gray, dirty, muddy, or mask-tinted. The worn-shoe leg must be bare skin with no pants, no long trousers, no jeans, no sports pants, no leggings, no tights, and no socks covering the leg/ankle. Both visible shoes are equal product heroes: keep their visible shoe-body area, length, height, sharpness, and visual importance similar. The upper/right worn shoe must not look like a small distant background board or secondary prop. Angle-01 spacing lock: the two visible shoes must keep the same distance as the current angle-01 reference image, with center delta about X22.0% / Y18.0% and nearest yellow-to-yellow boundary gap about 4.94% of canvas width / 3.70% of canvas height.',
  'angle-02': 'Selected pose prompt role lock: angle-02 is a two-shoe product display only. Do not add feet, legs, hands, or worn-shoe interaction unless the user uploads a different angle reference.',
  'angle-03': 'Selected pose prompt role lock: angle-03 is exactly one worn shoe on one visible foot/leg. Do not add a second shoe, a hand-held shoe, or another foot.',
  'angle-04': 'Selected pose prompt role lock: angle-04 is exactly one worn shoe on one visible foot/leg. Do not add a second shoe, a hand-held shoe, or another foot.',
  'angle-05': 'Selected pose prompt role lock: angle-05 must show exactly two visible product shoes: one shoe worn on the single visible foot in the lower-left position, and one shoe held by the hand in the upper-right position. If two product shoe references are uploaded, product reference 1 controls the worn lower-left shoe and product reference 2 controls the hand-held upper-right shoe. If only one product shoe reference is uploaded, use the same product identity for both visible shoes. Do not duplicate product reference 1 onto both shoes when product reference 2 is different, do not average the two products, and do not change the two-shoe angle-05 layout.',
  'angle-06': 'Selected pose prompt role lock: angle-06 must remain a hand-held two-shoe close-up display. Both product shoes are held toward the camera by natural hands. Do not turn either shoe into a worn shoe, do not add feet inside the shoes, do not create a full-body model, and do not change the shoe count.',
}

const mergeAnglePrecisionLocks: Record<string, string> = {
  'angle-03': [
    'ANGLE-03 PRECISION LAYOUT LOCK: follow the code-generated cleaned angle control and original angle-03 reference as a fixed 2D composition, not just a general pose idea.',
    'The product shoe must be the visual center: keep the shoe body centered in the middle-lower area of the final frame, with the whole visible shoe occupying the dominant central subject area. Do not push the shoe to the far left, far right, bottom edge, or corner.',
    'Preserve the angle reference leg entry and bend: one lower leg enters from the upper-left / upper-center area, travels downward with a slight rightward curve, and connects naturally into the shoe opening. Do not make the leg vertical in the exact center, do not rotate it to a front-facing standing pose, and do not add a second leg.',
    'Preserve the shoe orientation from the reference: large side-view sneaker, heel on the left, toe on the right, thick outsole extending across the lower canvas with the same slight perspective, ankle seated inside the opening. Do not flip, mirror, rotate, recrop, or re-center differently from the control layout.',
    'LEG SKIN CONSISTENCY LOCK: generate exactly one continuous female lower leg with one unified fair natural skin tone. The leg must not contain mismatched skin patches, two different skin colors, color bands, blue/yellow/red mask tint, stocking-like color breaks, duplicated ankles, or another leg with a different complexion.',
    'OPEN SHOE INSTEP SKIN FILL LOCK: if the uploaded product shoe is a sandal, mule, open-top shoe, strappy shoe, Mary Jane, or any shoe that exposes the instep/foot dorsum through openings, automatically generate the visible foot skin inside every opening. The exposed instep must be continuous with the ankle and leg, use the same fair natural skin tone, show subtle natural skin texture, and fill the opening naturally behind straps/buckles. Do not leave hollow cutouts, background-colored holes, black gaps, empty voids, mask-color gaps, or transparent-looking areas where foot skin should be visible.',
    'CLEAN INSTEP SKIN LOCK: exposed instep/foot skin must be clean, smooth, even, and continuous. Shoe holes, strap holes, buckle holes, punched eyelets, black dots, circular holes, and perforation details are allowed only on shoe straps, buckles, leather panels, or shoe upper material. They must never appear on the skin. Do not add freckles, moles, dirty speckles, pore-like black dots, dotted stains, or eyelet-like marks on the exposed foot skin.',
  ].join('\n'),
  'angle-04': [
    'ANGLE-04 PRECISION LAYOUT LOCK: follow the code-generated cleaned angle control and original angle-03 reference as a fixed 2D composition, not just a general pose idea.',
    'The product shoe must be the visual center: keep the shoe body centered in the middle-lower area of the final frame, with the whole visible shoe occupying the dominant central subject area. Do not push the shoe to the far left, far right, bottom edge, or corner.',
    'Preserve the angle reference leg entry and bend: one lower leg enters from the upper-left / upper-center area, travels downward with a slight rightward curve, and connects naturally into the shoe opening. Do not make the leg vertical in the exact center, do not rotate it to a front-facing standing pose, and do not add a second leg.',
    'Preserve the shoe orientation from the reference: large side-view sneaker, heel on the left, toe on the right, thick outsole extending across the lower canvas with the same slight perspective, ankle seated inside the opening. Do not flip, mirror, rotate, recrop, or re-center differently from the control layout.',
    'LEG SKIN CONSISTENCY LOCK: generate exactly one continuous female lower leg with one unified fair natural skin tone. The leg must not contain mismatched skin patches, two different skin colors, color bands, blue/yellow/red mask tint, stocking-like color breaks, duplicated ankles, or another leg with a different complexion.',
    'OPEN SHOE INSTEP SKIN FILL LOCK: if the uploaded product shoe is a sandal, mule, open-top shoe, strappy shoe, Mary Jane, or any shoe that exposes the instep/foot dorsum through openings, automatically generate the visible foot skin inside every opening. The exposed instep must be continuous with the ankle and leg, use the same fair natural skin tone, show subtle natural skin texture, and fill the opening naturally behind straps/buckles. Do not leave hollow cutouts, background-colored holes, black gaps, empty voids, mask-color gaps, or transparent-looking areas where foot skin should be visible.',
    'CLEAN INSTEP SKIN LOCK: exposed instep/foot skin must be clean, smooth, even, and continuous. Shoe holes, strap holes, buckle holes, punched eyelets, black dots, circular holes, and perforation details are allowed only on shoe straps, buckles, leather panels, or shoe upper material. They must never appear on the skin. Do not add freckles, moles, dirty speckles, pore-like black dots, dotted stains, or eyelet-like marks on the exposed foot skin.',
  ].join('\n'),
}

function shouldUseLibraryCoordinateControl(angleId: string) {
  return angleId === 'angle-03' || angleId === 'angle-04'
}

function shouldUseAngle06LibraryCoordinateControl(angleId: string) {
  return angleId === 'angle-06'
}

function shouldUsePromptOnlyAngle(angleId: string) {
  return angleId === 'angle-06'
}

function shouldUseLibraryAngleControlImage(angleId: string) {
  if (shouldUsePromptOnlyAngle(angleId)) return false
  return shouldUseLibraryCoordinateControl(angleId) || shouldUseAngle06LibraryCoordinateControl(angleId)
}

const fixedSingleFootLegReferenceUrl = '/assets/merge-angle-library/angle-03-fixed-leg-reference-magenta.png?v=20260716-white2-leg-texture'

function buildFixedSingleFootReferenceLock(angleId: string) {
  if (!shouldUseLibraryCoordinateControl(angleId)) return ''
  const angleLabel = angleId === 'angle-04' ? 'ANGLE-04' : 'ANGLE-03'
  return [
    `${angleLabel} FIXED REFERENCE GEOMETRY BY CODE: this lock is derived from the fixed angle-03 reference image and applies only to angle-03 / angle-04.`,
    'A hidden fixed leg and magenta auxiliary reference is provided for angle-03 / angle-04. Use the leg area only for the model leg anatomy, calf shape, fair translucent skin tone, fine natural skin texture, leg width, ankle size, leg curvature, and natural leg structure. The final model leg must look white/fair, clean, evenly toned, and naturally textured, with subtle realistic skin grain. Use the magenta region only as a secondary rough shoe-area hint to help align the foot opening; it is not the primary placement authority. Do not render magenta color, and do not treat the magenta region as shoe appearance, shoe material, shoe color, or shoe design.',
    'Use a 1:1 canvas coordinate system from X0-Y0 at top-left to X100-Y100 at bottom-right. Keep the leg, crop, scale, and direction locked to these relative coordinates no matter what product shoe image is uploaded.',
    'Primary shoe placement rule: the original angle-library yellow/S shoe region is the exact and highest authority for final shoe position, size, direction, toe direction, heel position, perspective, scale, occlusion, and crop. The magenta region and all text size-memory rules are only secondary auxiliary hints and must never override, enlarge, lower, recenter, or move the yellow/S region.',
    'Fixed shoe region from the angle yellow/S area: the single worn shoe must occupy the selected angle yellow/S region exactly, with the final shoe outer boundary fitted inside the new yellow/S shoe region at approximately X16.4-X87.6 and Y48.2-Y84.1. Heel/body side stays at the left-lower side of the yellow/S region, toe/front follows the right-facing yellow/S direction, the shoe opening sits under the descending ankle around X27-X48 and Y48-Y57, and the outsole follows the yellow/S perspective with its bottom baseline near Y84. Do not move the shoe to a generic lower-middle product-photo position, do not make it a larger close-up, and do not change the composition scale to satisfy aesthetic centering.',
    'Yellow/S edge-distance calculation lock: calculate the shoe placement by the distance from the canvas edges to the yellow/S shoe region, not by visual centering. The fixed yellow/S shoe region keeps approximately 16.4% empty margin from the left canvas edge, 12.4% empty margin from the right canvas edge, 48.2% empty margin from the top canvas edge, and 15.9% empty margin from the bottom canvas edge. These edge distances are hard position anchors for angle-03 / angle-04. If the generated shoe has a larger left/right/top/bottom edge gap than these yellow/S distances, or if the product is shifted upward, downward, left, right, farther away, or visually recentered, the placement is wrong.',
    'Fixed leg region: the one visible lower leg enters from the upper-left area around X2-X31 at Y0, travels downward with a slight rightward curve through X13-X42 and X24-X48, and inserts into the shoe opening around X27-X48 and Y48-Y57. Keep the ankle seated inside the shoe opening; do not detach, thicken, straighten, mirror, or shift the leg.',
    'Fixed proportion rule: leg width, ankle size, white/fair skin tone, fine skin texture, and leg-to-shoe contact must stay consistent with the hidden fixed-leg reference image. The hidden fixed-leg magenta auxiliary shoe zone is approximately X15.3-X90.1 and Y50.4-Y81.2, and only confirms the rough shoe/ankle contact zone. Shoe length, shoe height, shoe direction, shoe placement, shoe center, bottom baseline, and crop must follow the angle yellow/S region first. The uploaded product shoe reference controls shoe design, color, material, sole, laces, straps, logo, and texture; it must not change the leg pose, leg scale, skin tone, yellow/S shoe direction, yellow/S shoe placement, shoe center, bottom baseline, or crop.',
    'Approved size memory for angle-03 / angle-04 is soft and subordinate: it may only help keep angle-03 and angle-04 visually consistent after the shoe has already been fitted into the original angle yellow/S region. It must not provide any background, prop, room layout, wall/floor style, color temperature, or scene element. Do not enlarge, shrink, lower, raise, or recenter the shoe to match an old numeric size range. If text-derived size memory conflicts with the angle yellow/S region, ignore the size memory completely and follow the yellow/S region.',
    'Fixed contact shadow rule for angle-03 / angle-04: the shoe must sit on the uploaded background floor with a soft grounded contact shadow. Keep a slightly deeper shadow directly under the outsole and heel, fading naturally outward along the floor plane. The shadow direction, brightness, softness, and color must follow the current uploaded background lighting only. Do not copy or recreate any non-current-background object, prop, room layout, wall/floor style, text, label, or scene element from any previous output, fixed reference, angle reference, or product photo.',
    'Angle-03 / angle-04 matched-pair calibration rule: angle-03 and angle-04 are a matched pair and must use the same invisible calibration grid. After each shoe is fitted into the original angle yellow/S region, keep the shoe outer bounding box, shoe center, heel position, toe endpoint, outsole contact line, ankle opening height, leg entry point, camera crop, floor contact shadow footprint, shadow softness, shadow direction, highlight direction, exposure, and overall light intensity visually consistent across the two outputs. Only shoe appearance, color, material, logo, stitching, sole details, and product identity may differ. If product reference 1 and product reference 2 have different shapes or thickness, fit both into the same outer placement envelope instead of letting one become larger, lower, brighter, darker, or differently lit.',
    'Product-photo angle isolation rule: extract only the shoe identity, color, material, pattern, buckle/strap/lace details, sole, heel, toe, stitching, and texture from the uploaded product shoe image. Do not copy the product photo camera angle, product photo perspective, product photo crop, pair layout, floating catalog pose, or white product-photo background into the final angle-03 / angle-04 composition.',
    'Fixed camera rule: side-view close-up with slight high/near perspective. Do not convert to a front view, top-down view, full-body shot, catalog floating shoe, pair display, or standing pose.',
    'Uniform skin rule: all visible skin on this one lower leg must be the same fair, translucent, natural skin tone with fine skin texture. Do not use the angle mask blue color as skin, do not create two skin tones, and do not add socks/stockings unless they already exist in the uploaded product shoe and do not cover the leg.',
    'Open shoe exposed-foot rule for angle-03 / angle-04: when the uploaded product shoe has open vamp areas, straps, cutouts, sandal gaps, Mary-Jane openings, mule openings, or any visible top-of-foot exposure, fill those openings with a realistic instep/foot dorsum connected to the same leg. The instep skin must match the leg skin tone exactly, remain evenly colored, include fine natural skin texture, and sit naturally under straps and around buckles. Openings must never show background, black holes, empty transparent gaps, mask colors, or missing-foot voids.',
    'Clean exposed-foot rule for angle-03 / angle-04: the exposed instep skin must stay clean and evenly toned. Shoe perforations, strap holes, buckle holes, punched eyelets, decorative dots, and leather-hole details belong only on the shoe material. Never transfer shoe holes or dotted product details onto skin; never render freckles, moles, black dots, dirty speckles, pore-like dark marks, or eyelet-like holes on the foot skin.',
    'Background priority rule: the uploaded background image is the only environment source for angle-03 / angle-04. Preserve the uploaded background exactly as it is, including only the environment elements already visible in that image, their position, scale, crop, perspective, occlusion, color temperature, lighting, and shadows. Do not create any new background structure, edge line, room feature, prop, texture, or pattern that is not already visible in the uploaded background.',
    'Foreground occlusion lock for angle-03 / angle-04: if the uploaded background contains foreground objects, props, candles, books, furniture edges, plants, or any object in front of the floor area, those objects must never push the shoe backward, shrink the shoe, move the shoe behind them, change the shoe center, or reduce the fixed yellow/S shoe size. Keep the leg and shoe locked to the original yellow/S region first. If a foreground object overlaps the fixed shoe/leg footprint, let the generated shoe, leg, and natural contact shadow cover or partially hide only that overlapping part while preserving the rest of the uploaded background. Do not create an avoidance composition where the product becomes smaller, farther away, offset, or visually behind the prop.',
    'Foreground layer preservation rule for angle-03 / angle-04: foreground props from the uploaded background must remain visible and recognizable; do not erase, remove, repaint, clone out, crop out, or replace a candle, book, vase, furniture edge, plant, label, or other foreground object. Treat the fixed shoe, fixed leg, and contact shadow as the front product layer only inside their yellow/S footprint. If the fixed shoe/leg/shadow overlaps a foreground prop, only the physically overlapped portion may be naturally occluded by the shoe/leg/shadow; all non-overlapping parts of that prop must stay in the same position, scale, identity, color, crop, and lighting.',
    'Low shoe anchor rule for foreground backgrounds: keep the shoe outsole baseline, toe endpoint, heel base, and lower outer boundary at the same low canvas position as the original angle yellow/S shoe region. Foreground props must be treated as passive background content, never as obstacles for composition. Do not lift the shoe upward, shorten the outsole, move the toe upward, crop the shoe smaller, or place the shoe farther back to reveal a candle, book, vase, furniture edge, or any foreground object. If there is a conflict, the shoe remains in front at the fixed low placement and the foreground object is partially hidden behind the shoe/leg/shadow.',
    'Flat-shoe bottom anchor for angle-03 / angle-04: when the uploaded product shoe is a flat shoe, thin-soled shoe, ballet flat, Mary Jane flat, loafer, casual flat, or any shoe with little or no heel height, the bottom of the shoe must align to the bottom edge of the original angle yellow/S shoe region. A thin sole must not make the whole shoe float upward. Keep the front sole contact point, heel bottom, outsole lower edge, and shoe shadow seated on the same yellow/S bottom baseline used by the fixed reference.',
    'Final edge-distance placement check for angle-03 / angle-04: before final output, compare the final shoe outer boundary to the canvas edges. The final shoe should preserve the yellow/S edge distances: left margin about 16.4%, right margin about 12.4%, top margin about 48.2%, and bottom margin about 15.9%. Do not use a background object, product-photo crop, shoe type, or aesthetic balance to change these edge distances.',
    'Final foreground preservation check for angle-03 / angle-04: if a foreground object from the uploaded background disappears completely, is moved aside, is cleaned away, is replaced by floor/background, or is hidden outside the actual shoe/leg/shadow overlap area, the result is wrong. The correct result keeps foreground objects, but prevents them from changing the fixed yellow/S shoe position.',
    'Final background stability check for angle-03 / angle-04: after fitting the leg and shoe, reread the current uploaded background directly. Preserve every visible current-background element, its position, scale, crop, perspective, occlusion, color temperature, and lighting. If any current-background element disappears, moves, changes identity, or any element not visible in the current uploaded background appears, the result is wrong. Only product, body parts, and contact shadows may be blended into the existing uploaded background light.',
  ].join('\n')
}

function buildAngle06ReferenceLock(angleId: string) {
  if (!shouldUseAngle06LibraryCoordinateControl(angleId)) return ''
  return [
    'ANGLE-06 PROMPT-ONLY POSE CONTROL: this lock applies only to angle-06.',
    'Do not use code-generated angle recognition, cleaned-control schema, S/B/R object counts, worn-shoe counts, blue-hand counts, blue-foot counts, or automatic hand/foot classification for angle-06. The selected pose prompt is the highest authority for pose, shoe count, hand relationship, crop, body structure, and shoe display action.',
    'Use the original angle-06 reference only as a visual composition aid for rough shoe area, close-up framing, and overall visual weight. Do not treat any automatically detected yellow/S, blue/B, red/R, or black regions as structured code commands.',
    'The uploaded product shoe image is the highest authority for the actual shoe identity: shoe silhouette, shoe-type proportions, toe shape, heel shape, sole shape, strap/lace/buckle layout, material, color, stitching, logo, texture, and all exterior details must come 100% from the uploaded product shoe image, never from the yellow/S mask.',
    'ANGLE-06 BRIGHT COLOR LOCK: the cleaned control image and original angle-06 color-block mask control layout only; they must not control final brightness, color grading, gray level, contrast, saturation, shadows, texture, or photographic finish. Never copy the dark/gray/black control-image feeling.',
    'For angle-06, keep the final image bright, clean, luminous, high-key, and commercially retouched. Preserve the uploaded product shoe colors accurately with clean whites and clear material highlights. The uploaded background may provide environment elements and light direction, but it must not make the product, hands, skin, clothing, or overall image dull, muddy, dark, gray, underexposed, or low-contrast.',
    'Do not enlarge, shrink, recenter, rebalance, rotate, mirror, raise, lower, or move either shoe away from the angle-06 yellow/S placement envelope to satisfy product-photo perspective, model outfit, background composition, or aesthetic centering. But do not deform, simplify, thicken, thin, recolor, or redesign the uploaded product shoe just to match the mask silhouette.',
    'Both shoes are hand-held display shoes. The heel/back side faces the model body; the toe/front direction points toward the lower-right area of the canvas according to the selected pose prompt. The product shoe image changes shoe appearance, silhouette, proportions, and details; the prompt controls placement, scale envelope, direction, and depth.',
    'Hands are support geometry only: keep natural hands where the control layout places them, gripping or supporting the heel/back-sole area. Do not let hands change shoe size, shoe direction, or shoe count. Keep hands anatomically normal with correct finger count and no deformed fingers.',
    'Model outfit and body are secondary: preserve the angle-06 crop with only chest-below/partial clothing and minimal visible leg as indicated by the control. Never generate face, head, portrait, or full upper body.',
    'If the product shoes have a different silhouette from the yellow/S mask, preserve the uploaded product silhouette and proportions. Place the product shoe so its visual center, toe/heel axis, and overall canvas coverage match the corresponding angle-06 yellow/S placement envelope, but never force the product into the mask outline.',
  ].join('\n')
}

function buildMergeProductAssignmentPrompt(productCount: number, angleId: string) {
  if (productCount <= 1) {
    return 'Only one product shoe reference is uploaded. All visible shoes in the final image must use this same shoe identity, color, material, sole, toe, heel, straps/laces/buckles, texture, stitching, lining, and proportions.'
  }
  const base = `Multiple product shoe references are uploaded. If the uploaded product references show different shoes or different colorways, every visible shoe position must preserve its assigned product reference exactly, including color. Do not unify the colors, do not average colors, do not recolor product reference 2 to match product reference 1, and do not merge different product references into one hybrid shoe. If there are more visible shoe positions than product references, repeat the product references in upload order. Final visible color validation: before output, compare the final visible shoes against product reference 1 and product reference 2; if the uploaded references differ but the final shoes look like one same-colored pair, one same variant, or one averaged hybrid product, the result is wrong.`
  if (angleId === 'angle-01') {
    return [
      base,
      'ANGLE-01 PRODUCT ASSIGNMENT LOCK: product reference 1 controls the single worn shoe on the visible foot/leg in the upper/right area. Product reference 2 controls the hand-held or hand-supported display shoe in the lower-left foreground. If product reference 1 and product reference 2 have different colors, the final image must show two different-colored shoes in those exact roles. Never make both shoes the same color, never swap their assigned roles, and never turn the hand-supported shoe into a second worn shoe.',
      'A natural left/right shoe pair controls shoe-side geometry only; it must not force matching colors. Different uploaded product colorways must remain visibly different in the final image.',
      'Final visible check: if two uploaded product references are different but the final angle-01 shoes look like the same colorway, the result is wrong.',
    ].join('\n')
  }
  if (angleId === 'angle-02') {
    return [
      base,
      'ANGLE-02 TWO PRODUCT DISPLAY LOCK: angle-02 shows exactly two standalone display shoes with no hands, feet, or legs. When two product shoe references are uploaded, the first visible display shoe must use product reference 1, and the second visible display shoe must use product reference 2.',
      'The two shoes may form a natural left/right display pair for geometry, but product colors and product identities must remain assigned separately. If product reference 1 and product reference 2 have different colors, the final angle-02 image must show two different-colored display shoes.',
      'Do not duplicate product reference 1 onto both shoes. Do not recolor product reference 2 to match product reference 1. Do not average the two uploaded shoes into one shared colorway or hybrid product.',
      'Final visible check: if two uploaded product references are different but both angle-02 shoes appear as the same color or same product variant, the result is wrong.',
    ].join('\n')
  }
  if (angleId === 'angle-05') {
    return [
      base,
      'ANGLE-05 EXACT PRODUCT ASSIGNMENT LOCK: product reference 1 controls only the lower-left worn shoe on the single visible foot. Product reference 2 controls only the upper-right hand-held shoe. If product reference 1 and product reference 2 have different colors, the final angle-05 image must show those two different colors in the exact assigned positions.',
      'The hidden angle-05 shoe-position board controls only two-shoe placement, spacing, scale envelope, and compact distance. It must never override, average, recolor, or merge the uploaded product references.',
      'Do not duplicate product reference 1 onto the hand-held shoe. Do not recolor product reference 2 to match product reference 1. Do not swap the worn lower-left shoe and upper-right hand-held shoe assignments.',
      'Final visible check: if two uploaded product references are different but the lower-left worn shoe and upper-right hand-held shoe look like the same colorway, the result is wrong.',
    ].join('\n')
  }
  if (angleId === 'angle-06') {
    return [
      base,
      'ANGLE-06 TWO PRODUCT SHOE ASSIGNMENT LOCK: angle-06 always shows exactly two hand-held display shoes. When two product shoe references are uploaded, the first visible hand-held shoe must use product reference 1, and the second visible hand-held shoe must use product reference 2. If the two references have different colors, styles, materials, or details, the final angle-06 image must show two visibly different shoes.',
      'Do not duplicate product reference 1 onto both shoes. Do not recolor product reference 2 to match product reference 1. Do not average the two shoes into one shared design. Both shoes keep the same angle-06 pose, yellow-region placement, direction, scale, and hand-held role; only their product identity may differ according to their assigned references.',
      'Final visible check: if two uploaded product references are different but the two final hand-held shoes look like the same colorway, the result is wrong.',
    ].join('\n')
  }
  return [
    base,
    'PRODUCT ASSIGNMENT LOCK: assign product reference 1 to the first visible shoe position, product reference 2 to the second visible shoe position, product reference 3 to the third visible shoe position, following the selected angle shoe count, placement, and worn/handheld/display roles. Product-reference assignment must never change the selected angle role.',
  ].join('\n')
}

function selectMergeProductsForAngle<T>(productReferences: T[], angleId: string) {
  if (productReferences.length > 1 && angleId === 'angle-03') return [productReferences[0]]
  if (productReferences.length > 1 && angleId === 'angle-04') return [productReferences[1] || productReferences[0]]
  return productReferences
}

function shouldUseModelOutfitReference(angleId: string) {
  return angleId === 'angle-05' || angleId === 'angle-06'
}

const mergeAngleAddedPosePrompts: Record<string, string> = {}

const mergeAngleLibrary = [
  {
    id: 'angle-01',
    label: '角度 1｜手持+脚穿俯拍',
    url: '/assets/merge-angle-library/angle-01.png',
  },
  {
    id: 'angle-02',
    label: '角度 2｜双鞋展示俯拍',
    url: '/assets/merge-angle-library/angle-02.webp',
  },
  {
    id: 'angle-03',
    label: '角度 3｜单脚侧面试穿',
    url: '/assets/merge-angle-library/angle-03.png?v=20260715-213-fixed-foot-layout',
  },
  {
    id: 'angle-04',
    label: '角度 4｜单脚侧面试穿',
    url: '/assets/merge-angle-library/angle-03.png?v=20260715-213-fixed-foot-layout',
  },
  {
    id: 'angle-05',
    label: '角度 5',
    url: '/assets/merge-angle-library/angle-05.png?v=20260717-new-angle05-layout',
    dividerBefore: true,
  },
  {
    id: 'angle-06',
    label: '角度 6',
    url: '/assets/merge-angle-library/angle-06.png',
  },
]
const mergeAngleBatchLimit = 10
const mergeAngleUploadSlotIds = ['angle'] as const
type MergeAngleUploadSlotId = (typeof mergeAngleUploadSlotIds)[number]
const isMergeAngleUploadSlot = (slotId: string): slotId is MergeAngleUploadSlotId =>
  mergeAngleUploadSlotIds.includes(slotId as MergeAngleUploadSlotId)
const mergeMultiReferenceSlotIds = ['product'] as const
type MergeMultiReferenceSlotId = (typeof mergeMultiReferenceSlotIds)[number]
const isMergeMultiReferenceSlot = (slotId: string): slotId is MergeMultiReferenceSlotId =>
  mergeMultiReferenceSlotIds.includes(slotId as MergeMultiReferenceSlotId)

const mergeImageSizeOptions = [
  { label: '智能尺寸', detail: '按背景图比例', value: 'auto' },
  { label: '方图', detail: '1:1 主图', value: '1024x1024' },
  { label: '竖图', detail: '3:4 场景', value: '1024x1365' },
  { label: '横图', detail: '4:3 展示', value: '1536x1152' },
  { label: '宽屏', detail: '16:9 海报', value: '1536x864' },
  { label: '竖屏', detail: '9:16 内容流', value: '864x1536' },
  { label: '横版', detail: '3:2 商品图', value: '1536x1024' },
  { label: '竖版', detail: '2:3 商品图', value: '1024x1536' },
]

const mergeImageResolutionOptions: { label: string; detail: string; value: MergeImageResolution; longSide: number }[] = [
  { label: '1K', detail: '长边 1024px', value: '1k', longSide: 1024 },
  { label: '2K', detail: '长边 2048px', value: '2k', longSide: 2048 },
  { label: '4K', detail: '长边 4096px', value: '4k', longSide: 4096 },
]

const mergeImageStrictReferenceLogic = [
  'STRICT MULTI-REFERENCE RULES FOR AI PRODUCT BACKGROUND FUSION:',
  'The angle reference or selected angle-library image itself is the primary pose and composition control, not the text notes. Directly observe this image for body pose, foot/shoe spatial relationship, camera angle, perspective, scale, and occlusion. Any pose text or region analysis is only auxiliary explanation; if text conflicts with the angle image, follow the angle image.',
  'The angle reference or selected angle-library image is a semantic region mask, not a style image. Read its visual regions from the image itself, then replace each region with content from the correct reference.',
  'Yellow regions = shoe angle and placement reference only. Yellow regions only indicate where shoes appear and how they are placed, including shoe position, size, orientation, toe direction, heel direction, left-foot/right-foot side inference, body-facing direction inference, heel position, and perspective. Do not use the angle-library image or yellow mask as shoe appearance, shoe silhouette, shoe design, shoe color, material, style, shape, toe shape, heel shape, sole shape, strap/lace/buckle design, or product proportions. Generate the uploaded product shoe in each yellow region, using the product shoe image as the only and 100% authoritative source for shoe shape, color, material, texture, straps, buckle, heel, sole, toe shape, stitching, lining, and proportions. A yellow region connected to a blue leg/ankle/foot region is a worn shoe on the foot; a yellow region not connected to any blue limb is a ground or foreground display shoe only, so generate only the product shoe there and do not add an extra leg or foot.',
  'Blue regions = body limb regions. Identify each blue region by its silhouette and position: it may be a leg, foot/ankle segment, arm, hand, or wrist. Generate the matching natural female body part in every blue region. Limb pose, joint direction, occlusion, and body angle must follow the angle mask, while skin tone and styling can come from the model reference. The model skin should look fair, bright, translucent, and natural, with a refined clean texture and delicate visible skin detail.',
  'Red regions = clothing support regions. Generate the real outfit type from the uploaded model reference only as supporting styling around the product shoes. Match the model reference clothing category, color, fabric, drape, silhouette, waistband/hem details, and styling, but the clothing must not become the main visual subject or occupy attention beyond the red mask intent. Do not invent a skirt/dress if the model reference is wearing pants, jeans, shorts, or a top. Do not copy the model reference shoes.',
  'Black regions = background regions. Use the uploaded background image exactly as it is in all black/empty regions, preserving only the elements already visible in that image, their relative positions, scale, crop, perspective, occlusion, light direction, atmosphere, and shadows. Do not create any new background structure, edge line, room feature, prop, texture, or pattern that is not already visible in the uploaded background.',
  'Priority order: product shoe as the main visual subject > angle mask pose/composition and yellow shoe placement/angle reference > body limbs that support the shoe display > model outfit as secondary styling only > background realism. Product shoe appearance must come 100% from the product shoe image only; the angle-library image and yellow mask control only placement, angle, scale, perspective, and occlusion, never shoe exterior design or silhouette.',
  'Final image: one realistic ecommerce product-shoe hero scene focused on the lower body only. The uploaded product shoes must be the clearest main subject and visual focus. Body limbs, clothing, camera angle, perspective, scale, and occlusion follow the angle mask, but clothing stays secondary and must not dominate the image. Background comes only from the background image.',
  'Lower-body crop rule: do not generate the model face, head, portrait, or full upper body. Show only the lower body needed for the shoe display, such as legs, feet, hands, skirt hem, pants hem, or partial waist when required by the angle mask. If the angle mask does not show the upper body, keep the upper body outside the frame.',
  'Absolute angle-library color ban: the final image must not show any color from the angle-library control image as a visible color, stain, overlay, reflection, shadow, edge tint, or remnant. The saturated yellow shoe masks, blue limb masks, red clothing masks, black mask background, gray/white guide marks, labels, outlines, and flat color-block silhouettes are invisible metadata only. Replace every mask-colored region with realistic content from the assigned uploaded references. Natural product/background colors are allowed only when they come from the uploaded product or background image, never from the angle-library colors.',
  'Forbidden: any visible semantic mask colors or color-block shapes from the angle reference, including saturated yellow blocks, saturated blue blocks, saturated red blocks, black mask fill, gray/white control marks, flat colored silhouettes, tinted mask remnants, yellow shoes from the mask, blue limbs, red block clothing, black mask background, model face, head, portrait, full upper body, model reference shoes, model reference background/wall/floor/shadows/watermark/props, extra shoes, extra limbs, deformed hands or feet, wrong toes or fingers, text, watermark, logo, collage look.',
].join('\n')

function buildUploadedAngleGenerationPrompt(uploadedAngleAnalysis = '') {
  const isRealPhotoAngle = uploadedAngleAnalysis.includes('REAL PHOTO ANGLE REFERENCE')
  if (isRealPhotoAngle) {
    return [
      'USER-UPLOADED REAL PHOTO ANGLE REFERENCE PROMPT:',
      'The uploaded angle reference is a real photo, not a yellow/blue/red/black semantic color-block mask.',
      'Directly follow the original real photo for camera view, shooting height, lens perspective, crop, body pose, hand/foot relationship, shoe count, shoe placement, shoe direction, scale, overlap, and occlusion.',
      'Do not invent semantic mask colors or color-block behavior. Do not require yellow/blue/red/black regions when the uploaded angle reference is a real photo.',
      'Replace only the product shoe identity with the uploaded product shoe, keep the real-photo angle and composition relationship.',
      'Preserve premium commercial photography quality: realistic light, natural shadows, leather texture, clean background, refined ecommerce catalog look.',
      uploadedAngleAnalysis.trim(),
    ].filter(Boolean).join('\n')
  }
  return [
    'USER-UPLOADED ANGLE REFERENCE CONCISE PROMPT:',
    'The uploaded angle reference itself is the primary pose and composition control, not the text notes. Directly observe this uploaded image for body pose, foot/shoe spatial relationship, camera angle, perspective, scale, and occlusion. Any code analysis or text explanation is auxiliary; if text conflicts with the uploaded angle image, follow the uploaded angle image.',
    'The uploaded angle reference is a semantic region mask, not a style image. Read its visual regions from the image itself, then replace each region with content from the correct reference.',
    'Use the uploaded angle reference only for pose, composition, shoe count, shoe placement, shoe direction, camera angle, crop, perspective, scale, overlap, occlusion, and body-to-shoe relationship.',
    'Use the code-generated structured angle schema from angleLayout as the main layout instruction. Do not treat the control image as visual style.',
    'Yellow/S regions = shoe angle and placement reference only. They indicate where shoes appear and how they are placed, including shoe position, size, orientation, toe direction, heel direction, left-foot/right-foot side inference, body-facing direction inference, heel position, perspective, worn/display/handheld role, scale, and occlusion. Do not use the uploaded angle reference, yellow/S mask, or cleaned control image as shoe appearance, shoe silhouette, shoe design, shoe color, material, style, shape, toe shape, heel shape, sole shape, strap/lace/buckle design, or product proportions. Generate the uploaded product shoe in each yellow/S region, using the product shoe image as the only and 100% authoritative source for shoe shape, color, material, texture, straps, buckle, heel, sole, toe shape, stitching, lining, and proportions. A yellow/S region connected to a blue leg/ankle/foot region is a worn shoe on the foot; a yellow/S region connected to a blue hand/wrist/finger region is handheld or hand-supported; a yellow/S region not connected to any blue limb is a ground or foreground display shoe only, so generate only the product shoe there and do not add an extra leg or foot.',
    'Blue/B regions = body limb regions. Identify each blue/B region by its silhouette and position: it may be a leg, foot/ankle segment, arm, hand, wrist, finger detail, or minor body detail. Generate the matching natural female body part in every meaningful blue/B region. Limb pose, joint direction, occlusion, body angle, and connection to shoes must follow the uploaded angle mask and code-generated binding explanation, while skin tone and styling can come from the model reference. The model skin should look fair, bright, translucent, and natural, with a refined clean texture and delicate visible skin detail.',
    'Red/R regions = clothing support regions. Generate the real outfit type from the uploaded model reference only as supporting styling around the product shoes. Match the model reference clothing category, color, fabric, drape, silhouette, waistband/hem details, and styling, but clothing must not become the main visual subject or occupy attention beyond the red/R mask intent. Do not invent a skirt/dress if the model reference is wearing pants, jeans, shorts, or a top. Do not copy the model reference shoes.',
    'Black/background regions = background regions. Use the uploaded background image exactly as it is in all black/empty regions, preserving only the elements already visible in that image, their relative positions, scale, crop, perspective, occlusion, light direction, atmosphere, and shadows. Do not create any new background structure, edge line, room feature, prop, texture, or pattern that is not already visible in the uploaded background.',
    'Priority order: product shoe as the main visual subject > uploaded angle mask pose/composition and yellow/S shoe placement/angle reference > body limbs that support the shoe display > model outfit as secondary styling only > background realism. Product shoe appearance must come 100% from the product shoe image only; the uploaded angle reference, yellow/S regions, and cleaned control image control only placement, angle, scale, perspective, role, and occlusion, never shoe exterior design or silhouette.',
    'Final image: one realistic ecommerce product-shoe hero scene focused on the lower body only. The uploaded product shoes must be the clearest main subject and visual focus. Body limbs, clothing, camera angle, perspective, scale, and occlusion follow the uploaded angle reference, but clothing stays secondary and must not dominate the image. Background comes only from the background image.',
    'Lower-body crop rule: do not generate the model face, head, portrait, or full upper body. Show only the lower body needed for the shoe display, such as legs, feet, hands, skirt hem, pants hem, or partial waist when required by the uploaded angle reference. If the uploaded angle reference does not show the upper body, keep the upper body outside the frame.',
    'Never render mask colors, grid lines, labels, flat color-block silhouettes, or control-image artifacts.',
    'Absolute angle-reference color ban: the final image must not show any color from the uploaded angle reference or cleaned control image as a visible color, stain, overlay, reflection, shadow, edge tint, or remnant. The saturated yellow shoe masks, blue limb masks, red clothing masks, black mask background, gray/white guide marks, labels, outlines, and flat color-block silhouettes are invisible metadata only. Replace every mask-colored region with realistic content from the assigned uploaded references. Natural product/background colors are allowed only when they come from the uploaded product or background image, never from the angle-reference colors.',
    'Forbidden: any visible semantic mask colors or color-block shapes from the uploaded angle reference or cleaned control image, including saturated yellow blocks, saturated blue blocks, saturated red blocks, black mask fill, gray/white control guide marks, flat colored silhouettes, tinted mask remnants, yellow shoes from the mask, blue limbs, red block clothing, black mask background, model face, head, portrait, full upper body, model reference shoes, model reference background/wall/floor/shadows/watermark/props, extra shoes, extra limbs, deformed hands or feet, wrong toes or fingers, text, watermark, logo, collage look.',
    'Preserve premium commercial photography quality: realistic light, natural shadows, leather texture, clean background, refined ecommerce catalog look.',
    uploadedAngleAnalysis.trim(),
  ].filter(Boolean).join('\n')
}
const fallbackSkills: Skill[] = [
  {
    id: 'ai-merge-image-skill-local',
    displayName: '产品控制融合专家-固定角度',
    name: 'ai-merge-image-skill',
    description: '上传产品鞋图和背景图，从角度库选择固定角度，一键融合成自然场景图。',
    folder: 'ai-merge-image-skill',
    referencesCount: 4,
    guidance: {
      summary: '产品鞋图控制产品外观，角度库控制构图姿势，背景图控制背景环境。',
      lead: '上传产品鞋图和背景图，并从角度库选择固定角度，我会一键融合成自然场景图。',
      checklist: ['产品鞋图', '背景图', '角度库', '融合要求'],
      placeholder:
        '例如：把我的产品鞋融合到这张室内背景里，姿态参考上传角度图，只借角度，不复制角度图里的颜色、人体、服装或鞋款设计。',
    },
  },
]

function imageSizeToAspectRatio(size?: string) {
  const match = size?.match(/(\d+)\s*[x×]\s*(\d+)/i)
  if (!match) return '1 / 1'
  const width = Number(match[1])
  const height = Number(match[2])
  return width > 0 && height > 0 ? `${width} / ${height}` : '1 / 1'
}

function productSetPageInstruction(directionId: string, title: string) {
  if (directionId === 'set-hero') {
    return '页型要求：主视觉陈列页。商品必须作为主角清晰出现，占据核心视觉位置，建立整套图的背景、光影、文字和品牌视觉母系统。'
  }
  if (directionId.startsWith('set-selling')) {
    return [
      `页型要求：卖点证明页，围绕「${title}」证明利益点。`,
      '不要默认做“商品摆拍+文字说明”。如果卖点是润肤、舒适、降噪、清洁力、效果提升等结果型利益，可以让人物皮肤状态、使用前后感受、局部效果、生活场景或抽象功能可视化成为画面主体。',
      '商品可以作为旁侧、前景、手持、包装局部或角落弱露出；只有当该卖点必须展示产品结构时，才让产品占主视觉。',
    ].join('\n')
  }
  if (directionId === 'set-scene') {
    return '页型要求：使用场景页。优先展示真实使用关系、人物、环境和情绪，不要只做静物产品图；商品可自然出现在手中、台面、包内、浴室、卧室、户外等合理场景。'
  }
  if (directionId === 'set-detail') {
    return '页型要求：细节/材质页。必须展示产品局部、材质、包装、结构、纹理、接口或使用细节，镜头更近，信息更聚焦。'
  }
  if (directionId === 'set-comparison') {
    return '页型要求：对比/参数页。可采用左右对比、分区卡片、前后效果、数据可视化或清单结构；只展示用户已确认的信息，不编造具体参数。'
  }
  if (directionId === 'set-package') {
    return '页型要求：配件/清单页。展示包装、套装、配件或组合陈列；如果没有明确配件素材，就改为商品组合氛围或购买理由清单，不编造不存在的附件。'
  }
  return '页型要求：在整套商品图母系统内做差异化页面，不要重复上一张的构图。'
}

async function readJsonResponse(response: Response) {
  const text = await response.text()
  const trimmed = text.trim()
  if (!trimmed) return {}
  try {
    return JSON.parse(trimmed)
  } catch {
    const message = trimmed.startsWith('<')
      ? `服务返回了网页错误，可能是接口地址或代理配置不正确。HTTP ${response.status}`
      : trimmed
    throw new Error(message)
  }
}

function safeClientFileName(value: string) {
  const name = value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/\s+/g, ' ')
  return name || 'skillcrew-image'
}

function fallbackBrowserDownload(imageUrl: string, title: string, suggestedName: string) {
  const url = `/api/download?file=${encodeURIComponent(imageUrl)}&name=${encodeURIComponent(title || 'skillcrew-image')}`
  const link = document.createElement('a')
  link.href = url
  link.download = suggestedName
  document.body.appendChild(link)
  link.click()
  link.remove()
}

function cleanGenerationTitle(title: string) {
  return title.replace(/^第\s*\d+\s*屏\s*/, '').trim() || title
}

function toUserFacingChineseError(value?: string) {
  if (!value) return ''
  let text = value
    .replace(/GPT-5\.5\s*推理\s*API/g, '智能推理接口')
    .replace(/GPT-5\.5\s*推理/g, '智能推理')
    .replace(/GPT-5\.5\s*/g, '智能推理')
    .replace(/OpenAI\s*/g, '图片生成服务')
    .replace(/\bAPI\b/g, '接口')
    .replace(/API Key/gi, '接口密钥')
    .replace(/SKILL\.md/g, '技能说明')
    .replace(/Huaban\s+discovery|花瓣\s+discovery|discovery/gi, '花瓣灵感库')
    .replace(/\bJSON\b/g, '结构化数据')
    .replace(/\bHTML\b/g, '网页错误')
    .replace(/\(request id[:：]?\s*[A-Za-z0-9_-]+\)/gi, '')
    .replace(/request id[:：]?\s*[A-Za-z0-9_-]+/gi, '')
    .replace(/Invalid token/gi, '密钥无效')
    .replace(/\breferences\b/gi, '参考资料')
    .replace(/\bSkill\b/g, '技能')
  text = text.replace(/\s+/g, ' ').trim()
  return text || '智能推理暂时不可用，已改用本地规则继续。'
}

const logoMockupGroups: LogoMockupGroup[] = [
  {
    match: /茶|咖啡|饮|奶茶|餐|食品|甜品|烘焙|酒|生鲜|调味/,
    options: [
      { id: 'logo-mockup-packaging', title: '精品包装陈列', description: '茶包、杯套、礼盒、贴纸和外卖袋组合成高质感品牌陈列。', selected: true },
      { id: 'logo-mockup-cup', title: '杯身手持场景', description: '杯身、瓶身、封口贴和手持动作，搭配自然桌面与饮品道具。', selected: false },
      { id: 'logo-mockup-storefront', title: '门店灯箱招牌', description: '门头、灯箱、点单台、柜台招牌，呈现真实店铺空间氛围。', selected: false },
      { id: 'logo-mockup-menu', title: '菜单与桌卡系统', description: '菜单、桌卡、杯垫、价签和小票组成完整餐饮视觉系统。', selected: false },
      { id: 'logo-mockup-social', title: '外卖平台首图', description: '小红书、公众号、外卖平台头像和封面中的高识别品牌露出。', selected: false },
    ],
  },
  {
    match: /美妆|护肤|香氛|美容|个护|医美|健康|母婴/,
    options: [
      { id: 'logo-mockup-bottle', title: '高级瓶身套组', description: '精华瓶、面霜罐、香氛瓶与外盒组成轻奢产品套组。', selected: true },
      { id: 'logo-mockup-label', title: '标签封签系统', description: '成分标签、封口贴、试用装、礼盒封签形成精致细节近景。', selected: false },
      { id: 'logo-mockup-counter', title: '专柜陈列场景', description: '品牌柜台、亚克力托盘、柔光镜面和产品组合陈列。', selected: false },
      { id: 'logo-mockup-ritual', title: '护肤仪式感场景', description: '浴室台面、梳妆台、织物、植物和柔光营造生活方式氛围。', selected: false },
    ],
  },
  {
    match: /科技|智能|AI|软件|数据|SaaS|芯片|数码|电子|互联网|App|应用/,
    options: [
      { id: 'logo-mockup-app-icon', title: 'App 图标矩阵', description: '手机桌面、启动页、应用商店卡片和通知图标组成产品矩阵。', selected: true },
      { id: 'logo-mockup-device', title: '多设备界面场景', description: '手机、平板、电脑屏幕展示登录页、仪表盘或品牌首页。', selected: false },
      { id: 'logo-mockup-office', title: '发布会办公物料', description: '工牌、名片、PPT 封面、会议背景板和展台屏幕应用。', selected: false },
      { id: 'logo-mockup-dashboard', title: '数据可视化主屏', description: '深浅界面屏幕、信息卡片、发光边缘和高端科技展厅场景。', selected: false },
    ],
  },
  {
    match: /服装|服饰|潮牌|鞋|包|珠宝|配饰|生活方式|家居/,
    options: [
      { id: 'logo-mockup-tag', title: '吊牌织唛细节', description: '服装吊牌、织唛、领标、包装纸以材质近景呈现。', selected: true },
      { id: 'logo-mockup-bag', title: '购物袋街拍场景', description: '购物袋、快递袋、礼品袋和包装贴纸放入街拍或橱窗场景。', selected: false },
      { id: 'logo-mockup-storefront', title: '门店橱窗系统', description: '门头、橱窗、试衣间导视、店内墙面组成完整零售空间。', selected: false },
      { id: 'logo-mockup-editorial', title: '时尚杂志陈列', description: '吊牌、面料、卡片、配饰和杂志版式构成 editorial 静物画面。', selected: false },
    ],
  },
  {
    match: /教育|儿童|亲子|培训|学校|文创|书店|出版/,
    options: [
      { id: 'logo-mockup-stationery', title: '文具学习套组', description: '笔记本、课程卡、贴纸、帆布袋和手册封面组成学习套装。', selected: true },
      { id: 'logo-mockup-signage', title: '空间导视系统', description: '教室门牌、前台背景墙、展架、活动物料和墙面图形应用。', selected: false },
      { id: 'logo-mockup-social', title: '课程内容封面', description: '课程海报、公众号封面、社群头像和知识卡片视觉系统。', selected: false },
      { id: 'logo-mockup-workshop', title: '工作坊桌面场景', description: '书本、画笔、便签、手册和自然光桌面构成温暖教育场景。', selected: false },
    ],
  },
  {
    match: /宠物|猫|狗|犬|宠粮|宠物用品|动物/,
    options: [
      { id: 'logo-mockup-pet-pack', title: '宠物包装套组', description: '宠粮袋、零食罐、玩具吊牌和贴纸组成可爱货架陈列。', selected: true },
      { id: 'logo-mockup-pet-scene', title: '宠物生活场景', description: '宠物窝、牵引绳、玩具、地毯和自然光家庭场景。', selected: false },
      { id: 'logo-mockup-pet-store', title: '宠物店门头陈列', description: '店铺门头、收银台、货架价签和会员卡品牌应用。', selected: false },
      { id: 'logo-mockup-pet-social', title: '萌宠社媒封面', description: '头像、封面、贴纸表情和品牌卡片组成社媒视觉。', selected: false },
    ],
  },
  {
    match: /运动|健身|瑜伽|户外|露营|骑行|跑步|健康管理/,
    options: [
      { id: 'logo-mockup-sport-gear', title: '运动装备标识', description: '瑜伽垫、水壶、运动包、毛巾和服装印标应用。', selected: true },
      { id: 'logo-mockup-gym-wall', title: '健身空间墙面', description: '健身房墙面、前台、储物柜、课程牌和灯箱招牌。', selected: false },
      { id: 'logo-mockup-outdoor-kit', title: '户外装备场景', description: '露营桌面、登山包、旗帜、贴纸和自然户外光影。', selected: false },
      { id: 'logo-mockup-sport-app', title: '运动 App 界面', description: '运动数据界面、会员卡、课程预约页和智能手表露出。', selected: false },
    ],
  },
  {
    match: /酒店|民宿|旅行|旅游|文旅|度假|咖啡馆|空间|地产|社区/,
    options: [
      { id: 'logo-mockup-hospitality-sign', title: '空间门牌导视', description: '门牌、前台背景墙、钥匙卡、导视牌和灯光空间氛围。', selected: true },
      { id: 'logo-mockup-hotel-amenity', title: '酒店备品套组', description: '房卡、洗护备品、纸袋、欢迎卡和床头桌面陈列。', selected: false },
      { id: 'logo-mockup-travel-print', title: '旅行印刷物料', description: '地图、明信片、票券、护照夹和纪念贴纸组合。', selected: false },
      { id: 'logo-mockup-lobby-scene', title: '大堂氛围场景', description: '前台、大堂墙面、桌面花艺和柔和灯光构成高端空间。', selected: false },
    ],
  },
  {
    match: /艺术|展览|画廊|博物馆|音乐|剧场|影像|潮玩|IP/,
    options: [
      { id: 'logo-mockup-exhibition-wall', title: '展览墙面系统', description: '展墙标题、导览牌、票券、海报和纪念品应用。', selected: true },
      { id: 'logo-mockup-art-print', title: '艺术印刷套组', description: '海报、邀请函、票根、画册封面和收藏卡片陈列。', selected: false },
      { id: 'logo-mockup-merch', title: '周边商品样机', description: '帆布袋、徽章、贴纸、T 恤和亚克力牌组合展示。', selected: false },
      { id: 'logo-mockup-event-scene', title: '活动现场场景', description: '签到台、背景板、手环、指示牌和现场灯光氛围。', selected: false },
    ],
  },
]

const defaultLogoMockups: DeliveryOption[] = [
  { id: 'logo-mockup-packaging', title: '包装物料样机', description: '包装盒、手提袋、贴纸、卡片等通用品牌物料应用。', selected: true },
  { id: 'logo-mockup-signage', title: '空间标识样机', description: '门头、背景墙、导视牌或柜台标识中的应用效果。', selected: false },
  { id: 'logo-mockup-social', title: '线上头像样机', description: '社媒头像、品牌封面、平台图标中的小尺寸识别效果。', selected: false },
]

function inferLogoMockupOptions(brief: string): DeliveryOption[] {
  const matched = logoMockupGroups.find((group) => group.match.test(brief))
  return [
    ...(matched?.options || defaultLogoMockups),
    { id: 'custom-followup', title: '自定义样机', description: '按底部输入的具体场景继续生成样机。', selected: false },
  ]
}

function logoMockupPromptNote(taskTitle: string, detailText: string, brief: string, size: string) {
  return [
    '这是 Logo 样机应用图，不是重新设计 Logo。',
    '必须把选中的 Logo 图作为唯一品牌标识参考，保持 Logo 的图形结构、文字、比例、颜色关系和识别特征，不要改字、错字、重绘或变形。',
    `样机方向：${taskTitle}。`,
    `生成尺寸：${size}。必须严格按这个画幅比例组织构图，不要生成其他比例或把内容裁成方图。`,
    `样机补充：${detailText || '按默认行业应用场景执行。'}`,
    `品牌信息：${brief}`,
    '必须生成客户提案级品牌样机图：真实应用场景、精致构图、自然光影、明确材质、空间层次和行业相关道具都要出现。',
    '设计感要求：画面要有明确视觉主次、品牌色延展、材质对比、留白节奏、成组物料系统和 editorial / campaign look，不要像普通模板截图。',
    '请主动参考花瓣灵感库常见的品牌样机与场景图组织方式：多物料组合、斜向构图、局部特写、空间导视、生活方式场景、精致静物、灯箱招牌、社媒封面矩阵。',
    '不要白花花空背景，不要只把 Logo 放在白底画布上；可以使用包装、杯身、门店、屏幕、名片、吊牌、柜台、桌面、橱窗、展架或社媒头像等行业应用场景。',
    '画面应当干净、商业化、精致、有氛围，能直接放进品牌提案；但 Logo 本体必须清晰可读且不被遮挡。',
    '样机灵感库可后续从花瓣灵感库人工收录不同行业品类的样机图和场景图；当前请根据行业品类生成合理、精致、可用于客户提案的样机图。',
  ].join('\n')
}

function App() {
  const [skills, setSkills] = useState<Skill[]>(fallbackSkills)
  const [selectedSkill, setSelectedSkill] = useState(fallbackSkills[0].id)
  const [settings, setSettings] = useState<SettingsStatus | null>(null)
  const [brief, setBrief] = useState('')
  const [followUpText, setFollowUpText] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [checkedReferences, setCheckedReferences] = useState<string[]>([])
  const [selectedInferredChoices, setSelectedInferredChoices] = useState<Record<string, string>>({})
  const [customInferredChoices, setCustomInferredChoices] = useState<Record<string, string>>({})
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<string[]>([])
  const [selectedThemeDirection, setSelectedThemeDirection] = useState('')
  const [directionResult, setDirectionResult] = useState<DirectionResult | null>(null)
  const [selectedDirection, setSelectedDirection] = useState('')
  const [promptText, setPromptText] = useState('')
  const [promptConfirmed, setPromptConfirmed] = useState(false)
  const [imageResult, setImageResult] = useState<ImageResult | null>(null)
  const [imageResults, setImageResults] = useState<GeneratedImage[]>([])
  const [expansionResults, setExpansionResults] = useState<GeneratedExpansion[]>([])
  const [selectedBaseImageId, setSelectedBaseImageId] = useState('')
  const [generationScope, setGenerationScope] = useState<GenerationScope>('single')
  const [selectedGenerationIds, setSelectedGenerationIds] = useState<string[]>([])
  const [logoVariantCount, setLogoVariantCount] = useState(1)
  const [logoMockupSize, setLogoMockupSize] = useState('1024x1024')
  const [generationQueue, setGenerationQueue] = useState<string[]>([])
  const [pendingPreviewCards, setPendingPreviewCards] = useState<PendingPreviewCard[]>([])
  const [failedDirections, setFailedDirections] = useState<FailedDirection[]>([])
  const [expansionSelections, setExpansionSelections] = useState<string[]>([])
  const [expansionDetails, setExpansionDetails] = useState<Record<string, Record<string, string>>>({})
  const [viewStep, setViewStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [operationStatus, setOperationStatus] = useState('')
  const [referenceImages, setReferenceImages] = useState<File[]>([])
  const [multiAngleFiles, setMultiAngleFiles] = useState<Record<string, File[]>>({})
  const [mergeImageFiles, setMergeImageFiles] = useState<Record<string, File[]>>({})
  const [draggingMergeImageSlot, setDraggingMergeImageSlot] = useState('')
  const [mergeReferenceModalSlot, setMergeReferenceModalSlot] = useState<MergeMultiReferenceSlotId | ''>('')
  const [selectedMergeAngleIds, setSelectedMergeAngleIds] = useState<string[]>([])
  const [mergeAngleLibraryAnalyses, setMergeAngleLibraryAnalyses] = useState<Record<string, string>>({})
  const [mergeImageSize, setMergeImageSize] = useState('auto')
  const [mergeImageResolution, setMergeImageResolution] = useState<MergeImageResolution>('1k')
  const [mergeCustomWidth, setMergeCustomWidth] = useState('1536')
  const [mergeCustomHeight, setMergeCustomHeight] = useState('1152')
  const [multiAngleViewCount, setMultiAngleViewCount] = useState(6)
  const [multiAngleOutputMode, setMultiAngleOutputMode] = useState<MultiAngleOutputMode>('combined')
  const [isDraggingReference, setIsDraggingReference] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [mockupReferenceImages, setMockupReferenceImages] = useState<File[]>([])
  const [isDraggingMockupReference, setIsDraggingMockupReference] = useState(false)
  const [logoReuseState, setLogoReuseState] = useState<LogoReuseState | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [skillsOpen, setSkillsOpen] = useState(false)
  const [skillDeleteConfirm, setSkillDeleteConfirm] = useState<SkillDeleteConfirm | null>(null)
  const [deletingSkill, setDeletingSkill] = useState(false)
  const [openSkillMoveId, setOpenSkillMoveId] = useState('')
  const [movingSkillId, setMovingSkillId] = useState('')
  const [draggingSkillId, setDraggingSkillId] = useState('')
  const [skillDragDropIndex, setSkillDragDropIndex] = useState<number | null>(null)
  const [projectsOpen, setProjectsOpen] = useState(false)
  const [createSkillOpen, setCreateSkillOpen] = useState(false)
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [skillCreateForm, setSkillCreateForm] = useState<SkillCreateForm>(emptySkillCreateForm)
  const [skillCreateOutline, setSkillCreateOutline] = useState('')
  const [skillCreateProviderError, setSkillCreateProviderError] = useState('')
  const [skillCreateStatus, setSkillCreateStatus] = useState('')
  const [draftingSkill, setDraftingSkill] = useState(false)
  const [creatingSkill, setCreatingSkill] = useState(false)
  const [plusMenuOpen, setPlusMenuOpen] = useState(false)
  const [importingSkill, setImportingSkill] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'reasoning' | 'openai'>('reasoning')
  const [savingSettings, setSavingSettings] = useState(false)
  const [skillMenuOpen, setSkillMenuOpen] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(null)
  const [lightboxItems, setLightboxItems] = useState<LightboxItem[]>([])
  const [lightboxZoom, setLightboxZoom] = useState(1)
  const [lightboxPan, setLightboxPan] = useState<LightboxPan>({ x: 0, y: 0 })
  const [lightboxDrag, setLightboxDrag] = useState<LightboxDragState | null>(null)
  const [cutoutLoadingUrl, setCutoutLoadingUrl] = useState('')
  const [svgConvertingUrl, setSvgConvertingUrl] = useState('')
  const [lightboxConvertedSvgUrl, setLightboxConvertedSvgUrl] = useState('')
  const [lightboxStatus, setLightboxStatus] = useState('')
  const shouldShowMergeModelSlot = selectedMergeAngleIds.some(shouldUseModelOutfitReference)
  const visibleMergeImageSlots = useMemo(
    () => (shouldShowMergeModelSlot ? [...mergeImageSlots, mergeAngleModelSlot] : mergeImageSlots),
    [shouldShowMergeModelSlot],
  )
  const [settingsForm, setSettingsForm] = useState({
    reasoningApiKey: '',
    reasoningBaseURL: '',
    reasoningModel: '',
    openaiApiKey: '',
    openaiBaseURL: 'https://api.openai.com/v1',
    openaiImageModel: 'gpt-image-2',
  })

  const skill = useMemo(
    () => skills.find((item) => item.id === selectedSkill) ?? skills[0],
    [selectedSkill, skills],
  )
  const skillMenuRef = useRef<HTMLDivElement | null>(null)
  const plusMenuRef = useRef<HTMLDivElement | null>(null)
  const skillsPanelRef = useRef<HTMLElement | null>(null)
  const skillDirectoryInputRef = useRef<HTMLInputElement | null>(null)
  const briefInputRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const rightScrollRef = useRef<HTMLDivElement | null>(null)
  const workflowAbortRef = useRef<AbortController | null>(null)
  const skillDragRef = useRef<SkillDragState | null>(null)
  const skillDragClickBlockedRef = useRef(false)
  const skillDragDropIndexRef = useRef<number | null>(null)

  const canGenerateAllDirections = Boolean(directionResult?.directions && directionResult.directions.length > 1)
  const isDetailPageSkill = skill?.name === 'detail-page-assistant' || skill?.displayName === '电商详情页设计专家'
  const isLogoSkill =
    skill?.name === 'ai-brand-skill' ||
    skill?.displayName === '品牌logo设计' ||
    skill?.name === 'logook3' ||
    skill?.displayName === '品牌Logo设计专家'
  const isProductImageSetSkill =
    skill?.name === 'product-image-set-design-expert' || skill?.displayName === '电商套图设计专家'
  const isMultiAngleSkill =
    skill?.name === 'ai-multi-angle-skill' ||
    skill?.id === 'ai-multi-angle-skill-local' ||
    /multi-angle/i.test(skill?.id || '') ||
    skill?.displayName === '产品多角度视图'
  const isMergeImageSkill =
    skill?.name === 'ai-merge-image-skill' ||
    skill?.id === 'ai-merge-image-skill-local' ||
    /merge-image/i.test(skill?.id || '') ||
    skill?.displayName === 'AI产品背景融合' ||
    skill?.displayName === '产品控制融合专家' ||
    skill?.displayName === '产品控制融合专家-固定角度'
  const isInitialThinking = loading && !analysis && !isMergeImageSkill
  const deliveryOptions = skill?.guidance?.deliveryOptions || []
  const activeDeliveryOptions = analysis?.deliveryOptions?.length ? analysis.deliveryOptions : deliveryOptions
  const logoStyleOptions = activeDeliveryOptions.filter((item) => item.id.startsWith('logo-style-'))
  const logoEmphasisOptions = activeDeliveryOptions.filter((item) => item.id.startsWith('logo-emphasis-'))
  const hasOptionStep = deliveryOptions.length > 0
  const stepIndex = {
    brief: 0,
    references: 1,
    options: hasOptionStep ? 2 : -1,
    direction: hasOptionStep ? 3 : 2,
    generate: hasOptionStep ? 4 : 3,
    expansion: hasOptionStep ? 5 : 4,
  }
  const previewAspectRatio = imageSizeToAspectRatio(directionResult?.imagePrompt.size)
  const selectedPreviewDirection = directionResult?.directions.find((direction) => direction.id === selectedDirection)
  const selectedGenerationDirections = directionResult?.directions.filter((direction) =>
    selectedGenerationIds.includes(direction.id),
  ) || []
  const generatedDirectionIds = new Set(imageResults.map((item) => item.directionId))
  const failedDirectionIds = new Set(failedDirections.map((item) => item.id))
  const previewSlots = generationScope === 'all'
    ? directionResult?.directions || []
    : generationScope === 'multiple'
      ? selectedGenerationDirections.length > 0
        ? selectedGenerationDirections
        : [{ id: 'pending', title: '选择要生成的页面', description: '' }]
      : selectedPreviewDirection
        ? [selectedPreviewDirection]
        : directionResult?.directions?.[0]
          ? [directionResult.directions[0]]
          : [{ id: 'pending', title: 'Ready', description: '' }]
  const previewImages = [
    ...imageResults.map((item) => ({
      id: item.id,
      imageUrl: item.imageUrl,
      svgUrl: item.svgUrl,
      title: item.title,
      aspectRatio: imageSizeToAspectRatio(item.size),
    })),
    ...expansionResults.map((item) => ({
      id: item.id,
      imageUrl: item.imageUrl,
      title: `${item.title} · ${item.baseTitle}`,
      aspectRatio: imageSizeToAspectRatio(item.size),
    })),
  ]
  const mergeImagePreviewUrls = useMemo(() => {
    const entries = Object.entries(mergeImageFiles).flatMap(([slotId, files]) =>
      files.map((file, index) => [`${slotId}-${index}`, URL.createObjectURL(file)] as const),
    )
    return Object.fromEntries(entries)
  }, [mergeImageFiles])
  const previewItems = previewImages.length > 0
    ? [
        ...previewImages.map((item) => ({ ...item, kind: 'image' as const })),
        ...pendingPreviewCards.map((item) => ({ ...item, kind: 'pending' as const })),
      ]
    : pendingPreviewCards.length > 0
      ? pendingPreviewCards.map((item) => ({ ...item, kind: 'pending' as const }))
      : previewSlots.map((item) => ({
          ...item,
          kind: generationQueue.includes(item.id) ? ('pending' as const) : ('placeholder' as const),
        }))
  const adjustableImages = [
    ...imageResults.map((item) => ({
      id: item.id,
      directionId: item.directionId,
      imageUrl: item.imageUrl,
      title: item.title,
      badge: isLogoSkill ? 'Logo 方案' : '主图',
    })),
    ...(isLogoSkill ? [] : expansionResults.map((item) => ({
      id: item.id,
      directionId: item.directionId,
      imageUrl: item.imageUrl,
      title: item.title,
      badge: isLogoSkill ? `样机 · ${item.baseTitle}` : `扩展 · ${item.baseTitle}`,
    }))),
  ]

  const workflowStepLabels = [
    '需求理解',
    '参考选择',
    ...(hasOptionStep ? ['选项配置'] : []),
    '方向确认',
    '生图',
    ...(adjustableImages.length > 0 ? [isLogoSkill ? '样机选择' : '扩展选择'] : []),
  ]
  const activeStep = imageResult
    ? stepIndex.expansion
    : promptConfirmed
      ? stepIndex.generate
      : directionResult
        ? stepIndex.direction
        : analysis
          ? hasOptionStep
            ? stepIndex.options
            : stepIndex.references
          : stepIndex.brief
  const visibleStep = Math.min(viewStep, activeStep)

  useEffect(() => {
    async function boot() {
      try {
        const [skillsResponse, settingsResponse] = await Promise.all([
          fetch('/api/skills'),
          fetch('/api/settings'),
        ])
        if (!skillsResponse.ok) throw new Error('无法读取本地技能列表。')
        const skillsData = (await skillsResponse.json()) as { skills: Skill[] }
        const nextSkills = skillsData.skills.length > 0 ? skillsData.skills : fallbackSkills
        setSkills(nextSkills)
        setSelectedSkill(nextSkills[0].id)

        if (settingsResponse.ok) {
          const settingsData = (await settingsResponse.json()) as SettingsStatus
          setSettings(settingsData)
          setSettingsForm((current) => ({
            ...current,
            reasoningBaseURL: settingsData.reasoning.baseURL,
            reasoningModel: settingsData.reasoning.model,
            openaiBaseURL: settingsData.openai.baseURL,
            openaiImageModel: settingsData.openai.imageModel,
          }))
        }
      } catch (bootError) {
        setError(bootError instanceof Error ? bootError.message : '启动失败。')
      }
    }
    boot()
  }, [])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!skillMenuRef.current?.contains(event.target as Node)) {
        setSkillMenuOpen(false)
      }
      if (!plusMenuRef.current?.contains(event.target as Node)) {
        setPlusMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  useEffect(() => {
    if (!skill) return
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `已选择 ${skill.displayName}。${skill.guidance?.lead || '先告诉我你的目标、素材和风格方向。'}`,
      },
    ])
    setAnalysis(null)
    setCheckedReferences([])
    setSelectedInferredChoices({})
    setCustomInferredChoices({})
    setSelectedDeliveryIds((skill.guidance?.deliveryOptions || []).filter((item) => item.selected).map((item) => item.id))
    setSelectedThemeDirection('')
    setDirectionResult(null)
    setSelectedDirection('')
    setGenerationScope('single')
    setSelectedGenerationIds([])
    setLogoVariantCount(1)
    setLogoMockupSize('1024x1024')
    setPromptText('')
    setPromptConfirmed(false)
    setImageResult(null)
    setImageResults([])
    setExpansionResults([])
    setSelectedBaseImageId('')
    setViewStep(stepIndex.brief)
    setReferenceImages([])
    setMergeImageFiles({})
    setDraggingMergeImageSlot('')
    setSelectedMergeAngleIds([])
    setMergeImageSize('auto')
    setMergeCustomWidth('1536')
    setMergeCustomHeight('1152')
    setUploadedFiles([])
    setMockupReferenceImages([])
    setExpansionSelections([])
    setExpansionDetails({})
    setGenerationQueue([])
    setPendingPreviewCards([])
    setFailedDirections([])
    setLightboxImage(null)
    setError('')
    setOperationStatus('')
    setFollowUpText('')
  }, [skill])

  useEffect(() => {
    return () => {
      Object.values(mergeImagePreviewUrls).forEach((url) => URL.revokeObjectURL(url))
    }
  }, [mergeImagePreviewUrls])

  useEffect(() => {
    if (mergeReferenceModalSlot && (mergeImageFiles[mergeReferenceModalSlot] || []).length === 0) {
      setMergeReferenceModalSlot('')
    }
  }, [mergeImageFiles, mergeReferenceModalSlot])

  useEffect(() => {
    if (shouldShowMergeModelSlot) return
    setMergeImageFiles((current) => {
      if (!current.model?.length) return current
      const { model: _model, ...rest } = current
      return rest
    })
  }, [shouldShowMergeModelSlot])

  useEffect(() => {
    if (!isMergeImageSkill) return
    let cancelled = false
    async function analyzeLibrary() {
      const entries = await Promise.all(mergeAngleLibrary.map(async (item) => {
        if (mergeAngleLibraryAnalyses[item.id]) return [item.id, mergeAngleLibraryAnalyses[item.id]] as const
        try {
          const file = await fileFromAsset(item.url, `${item.id}.png`)
          const analysis = await describeAngleColorBlocks(file, `${item.label} / ${item.id}`)
          return [item.id, analysis] as const
        } catch {
          return [item.id, ''] as const
        }
      }))
      if (!cancelled) {
        setMergeAngleLibraryAnalyses((current) => ({
          ...current,
          ...Object.fromEntries(entries.filter(([, analysis]) => analysis)),
        }))
      }
    }
    analyzeLibrary()
    return () => {
      cancelled = true
    }
  }, [isMergeImageSkill])

  useEffect(() => {
    const input = briefInputRef.current
    if (!input) return
    input.style.height = 'auto'
    input.style.height = `${input.scrollHeight}px`
  }, [brief])

  useEffect(() => {
    if (!lightboxImage) return
    function handleLightboxKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        moveLightbox(-1)
        return
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        moveLightbox(1)
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        closeLightbox()
      }
    }

    window.addEventListener('keydown', handleLightboxKeyDown)
    return () => window.removeEventListener('keydown', handleLightboxKeyDown)
  }, [lightboxImage, lightboxItems])

  useEffect(() => {
    const scrollArea = rightScrollRef.current
    if (!scrollArea || visibleStep === stepIndex.brief) return
    scrollArea.scrollTo({ top: scrollArea.scrollHeight, behavior: 'smooth' })
  }, [messages, analysis, directionResult, promptConfirmed, imageResult, visibleStep])

  async function refreshSkillList(selectSkillId?: string) {
    const response = await fetch('/api/skills')
    const data = await readJsonResponse(response)
    if (!response.ok) throw new Error(data.error || '无法读取本地技能列表。')
    const nextSkills = Array.isArray(data.skills) && data.skills.length > 0 ? data.skills as Skill[] : fallbackSkills
    setSkills(nextSkills)
    setSelectedSkill(selectSkillId && nextSkills.some((item) => item.id === selectSkillId) ? selectSkillId : nextSkills[0].id)
    return nextSkills
  }

  async function refreshProjectsPanel() {
    setProjectsLoading(true)
    setError('')
    try {
      const response = await fetch('/api/projects')
      const data = await readJsonResponse(response)
      if (!response.ok) throw new Error(data.error || '无法读取项目列表。')
      setProjects(Array.isArray(data.projects) ? data.projects as ProjectItem[] : [])
    } catch (projectsError) {
      setError(projectsError instanceof Error ? projectsError.message : '无法读取项目列表。')
    } finally {
      setProjectsLoading(false)
    }
  }

  async function openProjectsPanel() {
    setProjectsOpen(true)
    await refreshProjectsPanel()
  }

  async function deleteProjects(projectIds: string[]) {
    if (projectIds.length === 0) return
    setError('')
    try {
      for (const projectId of projectIds) {
        const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, { method: 'DELETE' })
        const data = await readJsonResponse(response)
        if (!response.ok) throw new Error(data.error || '删除项目失败。')
      }
      setProjects((current) => current.filter((project) => !projectIds.includes(project.id)))
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '删除项目失败。')
      throw deleteError
    }
  }

  async function deleteProjectImages(items: Array<{ projectId: string; imageUrl: string }>) {
    if (items.length === 0) return
    setError('')
    try {
      const response = await fetch('/api/projects/delete-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      const data = await readJsonResponse(response)
      if (!response.ok) throw new Error(data.error || '删除图片失败。')
      setProjects(Array.isArray(data.projects) ? data.projects as ProjectItem[] : [])
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '删除图片失败。')
      throw deleteError
    }
  }

  async function deleteSkill(skillToDelete: SkillDeleteConfirm) {
    setDeletingSkill(true)
    setError('')
    try {
      const response = await fetch(`/api/skills/${encodeURIComponent(skillToDelete.id)}`, { method: 'DELETE' })
      const data = await readJsonResponse(response)
      if (!response.ok) throw new Error(data.error || '删除 Skill 失败。')
      const nextSkills = await refreshSkillList(selectedSkill === skillToDelete.id ? undefined : selectedSkill)
      if (nextSkills.length === 0) {
        setSelectedSkill('')
      }
      setSkillDeleteConfirm(null)
      setOperationStatus(`已删除 Skill：${skillToDelete.displayName}`)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '删除 Skill 失败。')
    } finally {
      setDeletingSkill(false)
    }
  }

  async function reorderSkill(skillId: string, action: 'top' | 'up' | 'down') {
    const currentIndex = skills.findIndex((item) => item.id === skillId)
    if (currentIndex < 0) return
    const nextSkills = [...skills]
    const [skillToMove] = nextSkills.splice(currentIndex, 1)
    if (!skillToMove) return
    const targetIndex = action === 'top'
      ? 0
      : action === 'up'
        ? Math.max(0, currentIndex - 1)
        : Math.min(skills.length - 1, currentIndex + 1)
    if (targetIndex === currentIndex) return

    nextSkills.splice(targetIndex, 0, skillToMove)
    setMovingSkillId(skillId)
    setError('')
    try {
      setSkills(nextSkills)
      const response = await fetch('/api/skills/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: nextSkills.map((item) => item.id) }),
      })
      const data = await readJsonResponse(response)
      if (!response.ok) throw new Error(data.error || '无法保存技能排序。')
      if (Array.isArray(data.skills)) setSkills(data.skills as Skill[])
      setOpenSkillMoveId('')
      setOperationStatus('技能排序已保存。')
    } catch (reorderError) {
      setSkills(skills)
      setError(reorderError instanceof Error ? reorderError.message : '无法保存技能排序。')
    } finally {
      setMovingSkillId('')
    }
  }

  async function saveSkillOrder(nextSkills: Skill[], previousSkills: Skill[], statusText = 'Skill order saved.') {
    setMovingSkillId('skill-drag')
    setError('')
    try {
      setSkills(nextSkills)
      const response = await fetch('/api/skills/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: nextSkills.map((item) => item.id) }),
      })
      const data = await readJsonResponse(response)
      if (!response.ok) throw new Error(data.error || 'Unable to save skill order.')
      if (Array.isArray(data.skills)) setSkills(data.skills as Skill[])
      setOpenSkillMoveId('')
      setOperationStatus(statusText)
    } catch (reorderError) {
      setSkills(previousSkills)
      setError(reorderError instanceof Error ? reorderError.message : 'Unable to save skill order.')
    } finally {
      setMovingSkillId('')
    }
  }

  function findSkillDropIndex(clientY: number, movingSkillIdForDrop: string) {
    const rows = Array.from(document.querySelectorAll<HTMLElement>('.skill-directory-list article[data-skill-id]'))
      .filter((row) => row.dataset.skillId !== movingSkillIdForDrop)
    let targetIndex = rows.length
    rows.some((row, index) => {
      const rect = row.getBoundingClientRect()
      if (clientY < rect.top + rect.height / 2) {
        targetIndex = index
        return true
      }
      return false
    })
    return targetIndex
  }

  function moveSkillToIndex(skillId: string, targetIndex: number, sourceSkills: Skill[]) {
    const nextSkills = [...sourceSkills]
    const currentIndex = nextSkills.findIndex((item) => item.id === skillId)
    if (currentIndex < 0) return nextSkills
    const [skillToMove] = nextSkills.splice(currentIndex, 1)
    if (!skillToMove) return nextSkills
    nextSkills.splice(Math.max(0, Math.min(targetIndex, nextSkills.length)), 0, skillToMove)
    return nextSkills
  }

  function beginSkillPointerMove(skillId: string, event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || movingSkillId) return
    const button = event.currentTarget
    const originalSkills = [...skills]
    const pointerId = event.pointerId
    const timer = window.setTimeout(() => {
      const dragState = skillDragRef.current
      if (!dragState || dragState.pointerId !== pointerId) return
      dragState.dragging = true
      setDraggingSkillId(skillId)
      const currentIndex = originalSkills.findIndex((item) => item.id === skillId)
      skillDragDropIndexRef.current = currentIndex
      setSkillDragDropIndex(currentIndex)
      setOpenSkillMoveId('')
      button.setPointerCapture(pointerId)
    }, 260)
    skillDragRef.current = {
      skillId,
      pointerId,
      timer,
      dragging: false,
      originalSkills,
      currentSkills: originalSkills,
    }
  }

  function updateSkillPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const dragState = skillDragRef.current
    if (!dragState || dragState.pointerId !== event.pointerId || !dragState.dragging) return
    event.preventDefault()
    const targetIndex = findSkillDropIndex(event.clientY, dragState.skillId)
    if (targetIndex === skillDragDropIndexRef.current) return
    skillDragDropIndexRef.current = targetIndex
    setSkillDragDropIndex(targetIndex)
  }

  async function finishSkillPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const dragState = skillDragRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) return
    if (dragState.timer !== null) window.clearTimeout(dragState.timer)
    skillDragRef.current = null
    if (dragState.dragging) {
      event.preventDefault()
      skillDragClickBlockedRef.current = true
      const targetIndex = skillDragDropIndexRef.current ?? dragState.originalSkills.findIndex((item) => item.id === dragState.skillId)
      const nextSkills = moveSkillToIndex(dragState.skillId, targetIndex, dragState.originalSkills)
      dragState.currentSkills = nextSkills
      setDraggingSkillId('')
      skillDragDropIndexRef.current = null
      setSkillDragDropIndex(null)
      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch {
        // Pointer capture may already be released by the browser.
      }
      const changed = nextSkills.map((item) => item.id).join('|') !== dragState.originalSkills.map((item) => item.id).join('|')
      if (changed) {
        setSkills(nextSkills)
        await saveSkillOrder(nextSkills, dragState.originalSkills)
      }
      window.setTimeout(() => {
        skillDragClickBlockedRef.current = false
      }, 0)
    }
  }

  function cancelSkillPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const dragState = skillDragRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) return
    if (dragState.timer !== null) window.clearTimeout(dragState.timer)
    if (dragState.dragging) setSkills(dragState.originalSkills)
    skillDragRef.current = null
    setDraggingSkillId('')
    skillDragDropIndexRef.current = null
    setSkillDragDropIndex(null)
  }

  function updateSkillCreateField(field: keyof SkillCreateForm, value: string) {
    setSkillCreateForm((current) => ({ ...current, [field]: value }))
  }

  function openCreateSkillPanel() {
    setCreateSkillOpen(true)
    setPlusMenuOpen(false)
    setSkillCreateForm(emptySkillCreateForm)
    setSkillCreateOutline('')
    setSkillCreateProviderError('')
    setSkillCreateStatus('')
  }

  async function importSkillFromDirectory(files: FileList | null) {
    if (!files || files.length === 0) return
    setImportingSkill(true)
    setPlusMenuOpen(false)
    setError('')
    setOperationStatus('')
    try {
      const selectedFiles = Array.from(files).filter((file) =>
        /(^|\/)(SKILL\.md|metadata\.json|README\.md|content\.md)$/i.test(file.webkitRelativePath || file.name) ||
        /\/references\/.+\.md$/i.test(file.webkitRelativePath || file.name)
      )
      if (!selectedFiles.some((file) => /(^|\/)SKILL\.md$/i.test(file.webkitRelativePath || file.name))) {
        throw new Error('选择的文件夹里没有技能说明文件。')
      }
      const formData = new FormData()
      selectedFiles.forEach((file) => {
        formData.append('files', file, file.webkitRelativePath || file.name)
      })
      const response = await fetch('/api/skills/import', {
        method: 'POST',
        body: formData,
      })
      const data = await readJsonResponse(response)
      if (!response.ok) throw new Error(data.error || '读取本地技能失败。')
      await refreshSkillList(data.skill?.id)
      setSkillsOpen(true)
      setOperationStatus(`已读取技能：${data.skill?.displayName || '本地技能'}`)
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : '读取本地技能失败。')
    } finally {
      setImportingSkill(false)
      if (skillDirectoryInputRef.current) skillDirectoryInputRef.current.value = ''
    }
  }

  async function draftSkillOutline() {
    if (!skillCreateForm.displayName.trim() || !skillCreateForm.purpose.trim()) {
      setSkillCreateStatus('请先填写 Skill 名称和用途。')
      return
    }
    setDraftingSkill(true)
    setSkillCreateStatus('')
    setSkillCreateProviderError('')
    try {
      const response = await fetch('/api/skills/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(skillCreateForm),
      })
      const data = await readJsonResponse(response)
      if (!response.ok) throw new Error(data.error || '生成大纲失败。')
      setSkillCreateOutline(String(data.outline || ''))
      setSkillCreateProviderError(String(data.providerError || ''))
      setSkillCreateStatus('设计大纲已生成。确认无误后再创建本地技能。')
    } catch (draftError) {
      setSkillCreateStatus(draftError instanceof Error ? draftError.message : '生成大纲失败。')
    } finally {
      setDraftingSkill(false)
    }
  }

  async function createLocalSkill() {
    if (!skillCreateOutline.trim()) {
      setSkillCreateStatus('请先生成并确认设计大纲。')
      return
    }
    setCreatingSkill(true)
    setSkillCreateStatus('')
    try {
      const response = await fetch('/api/skills/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form: skillCreateForm,
          outline: skillCreateOutline,
        }),
      })
      const data = await readJsonResponse(response)
      if (!response.ok) throw new Error(data.error || '创建 Skill 失败。')
      await refreshSkillList(data.skill?.id)
      setCreateSkillOpen(false)
      setSkillsOpen(true)
      setSkillCreateStatus('')
      setOperationStatus(`已创建 Skill：${data.skill?.displayName || skillCreateForm.displayName}`)
    } catch (createError) {
      setSkillCreateStatus(createError instanceof Error ? createError.message : '创建 Skill 失败。')
    } finally {
      setCreatingSkill(false)
    }
  }

  async function submitBrief() {
    const multiAngleEntries = multiAngleSlots.flatMap((slot) =>
      (multiAngleFiles[slot.id] || []).map((file, index) => ({ slot, file, index })),
    )
    const mergeImageEntries = visibleMergeImageSlots.flatMap((slot) =>
      (mergeImageFiles[slot.id] || []).map((file) => ({ slot, file })),
    )
    const effectiveBrief = buildMergeImageBrief(buildMultiAngleBrief(brief))
    if (!skill) {
      setError('请先选择技能。')
      return
    }
    if (!effectiveBrief.trim()) {
      setError('请先输入需求。')
      return
    }
    if (isMultiAngleSkill && multiAngleEntries.length === 0 && referenceImages.length === 0) {
      setError('请先上传产品角度图。')
      return
    }
    if (isMergeImageSkill && mergeImageEntries.length < 2) {
      setError('请上传产品鞋图和背景图，并在角度库选择一个角度。')
      return
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: effectiveBrief.trim(),
    }
    const reusableLogoSelections = isLogoSkill ? logoReuseState : null
    setMessages((current) => [...current, userMessage])
    setLoading(true)
    setError('')
    setAnalysis(null)
    setCheckedReferences([])
    setSelectedInferredChoices({})
    setCustomInferredChoices({})
    setSelectedInferredChoices({})
    setCustomInferredChoices({})
    setSelectedDeliveryIds(
      reusableLogoSelections?.selectedDeliveryIds.length
        ? reusableLogoSelections.selectedDeliveryIds
        : (skill.guidance?.deliveryOptions || []).filter((item) => item.selected).map((item) => item.id),
    )
    setSelectedThemeDirection('')
    setDirectionResult(null)
    setSelectedDirection('')
    setGenerationScope('single')
    setSelectedGenerationIds([])
    setLogoVariantCount(1)
    setLogoMockupSize(reusableLogoSelections?.logoMockupSize || '1024x1024')
    setPromptText('')
    setPromptConfirmed(false)
    setImageResult(null)
    setImageResults([])
    setExpansionResults([])
    setSelectedBaseImageId('')
    setUploadedFiles([])
    setMockupReferenceImages(reusableLogoSelections?.mockupReferenceImages || [])
    setExpansionSelections(reusableLogoSelections?.expansionSelections || [])
    setExpansionDetails(reusableLogoSelections?.expansionDetails || {})
    setGenerationQueue([])
    setPendingPreviewCards([])
    setFailedDirections([])
    setLightboxImage(null)
    setViewStep(stepIndex.references)

    const controller = startWorkflowRequest()
    try {
      const allUploadFiles = [
        ...(!isMergeImageSkill ? referenceImages.map((image) => ({ image, name: image.name })) : []),
        ...mergeImageEntries.map(({ slot, file }) => ({
          image: file,
          name: `merge-${slot.id}-${file.name}`,
        })),
        ...multiAngleEntries.map(({ slot, file, index }) => ({
          image: file,
          name: `product-view-${slot.id}-${index + 1}-${file.name}`,
        })),
      ]
      const response = allUploadFiles.length
        ? await fetch('/api/run/analyze', {
            method: 'POST',
            body: (() => {
              const formData = new FormData()
              formData.append('skillId', skill.id)
              formData.append('brief', effectiveBrief.trim())
              allUploadFiles.forEach(({ image, name }) => formData.append('images', image, name))
              return formData
            })(),
            signal: controller.signal,
          })
        : await fetch('/api/run/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ skillId: skill.id, brief: effectiveBrief.trim() }),
            signal: controller.signal,
          })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '分析失败。')

      const nextAnalysis = data as Analysis
      setAnalysis(nextAnalysis)
      setUploadedFiles((data.uploadedFiles || []) as UploadedFile[])
      setCheckedReferences(nextAnalysis.selectedReferences.map((reference) => reference.file))
      setSelectedDeliveryIds(
        (nextAnalysis.deliveryOptions?.length ? nextAnalysis.deliveryOptions : skill.guidance?.deliveryOptions || [])
          .filter((item) => item.selected)
          .map((item) => item.id),
      )
      setSelectedInferredChoices(
        Object.fromEntries((nextAnalysis.inferredChoices || []).map((choice) => [choice.id, choice.options[0]?.id || ''])),
      )
      setCustomInferredChoices({})
      setSelectedThemeDirection(nextAnalysis.confirmation?.options?.[0] || '')
      setMessages((current) => [
        ...current.filter((message) => message.id !== 'thinking'),
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: nextAnalysis.message,
        },
      ])
    } catch (submitError) {
      if (isAbortError(submitError)) {
        setError('')
        setViewStep(stepIndex.brief)
        return
      }
      setError(submitError instanceof Error ? submitError.message : '分析失败。')
      setViewStep(stepIndex.brief)
    } finally {
      setLoading(false)
      if (workflowAbortRef.current === controller) workflowAbortRef.current = null
    }
  }

  async function saveSettings() {
    setSavingSettings(true)
    setError('')
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          reasoning: {
            apiKey: settingsForm.reasoningApiKey,
            baseURL: settingsForm.reasoningBaseURL,
            model: settingsForm.reasoningModel,
          },
          openai: {
            apiKey: settingsForm.openaiApiKey,
            baseURL: settingsForm.openaiBaseURL,
            imageModel: settingsForm.openaiImageModel,
          },
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '保存失败。')

      const statusResponse = await fetch('/api/settings')
      if (statusResponse.ok) {
        setSettings((await statusResponse.json()) as SettingsStatus)
      }
      setSettingsForm((current) => ({
        ...current,
        reasoningApiKey: '',
        openaiApiKey: '',
      }))
      setSettingsOpen(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存失败。')
    } finally {
      setSavingSettings(false)
    }
  }

  function toggleReference(file: string) {
    setCheckedReferences((current) =>
      current.includes(file) ? current.filter((item) => item !== file) : [...current, file],
    )
  }

  function getSelectedInferredChoicePayload() {
    return (analysis?.inferredChoices || [])
      .map((choice) => {
        const selectedId = selectedInferredChoices[choice.id] || choice.options[0]?.id || ''
        const selectedOption = choice.options.find((option) => option.id === selectedId)
        const customValue = (customInferredChoices[choice.id] || '').trim()
        const value = selectedId === 'custom'
          ? customValue
          : selectedOption?.value || selectedOption?.label || ''
        return {
          id: choice.id,
          field: choice.field,
          optionId: selectedId,
          label: selectedOption?.label || '其他',
          value,
        }
      })
      .filter((item) => item.value.trim())
  }

  function updateInferredChoice(choiceId: string, optionId: string) {
    setSelectedInferredChoices((current) => ({ ...current, [choiceId]: optionId }))
  }

  function updateCustomInferredChoice(choiceId: string, value: string) {
    setCustomInferredChoices((current) => ({ ...current, [choiceId]: value }))
  }

  function startWorkflowRequest() {
    workflowAbortRef.current?.abort()
    const controller = new AbortController()
    workflowAbortRef.current = controller
    return controller
  }

  function stopWorkflowGeneration() {
    workflowAbortRef.current?.abort()
    workflowAbortRef.current = null
    setLoading(false)
    setGenerating(false)
    setGenerationQueue([])
    setPendingPreviewCards([])
    setOperationStatus('已暂停生成。')
  }

  function rememberLogoSelections(patch: Partial<LogoReuseState> = {}) {
    if (!isLogoSkill) return
    setLogoReuseState((current) => ({
      selectedDeliveryIds: patch.selectedDeliveryIds ?? current?.selectedDeliveryIds ?? selectedDeliveryIds,
      expansionSelections: patch.expansionSelections ?? current?.expansionSelections ?? expansionSelections,
      expansionDetails: patch.expansionDetails ?? current?.expansionDetails ?? expansionDetails,
      logoMockupSize: patch.logoMockupSize ?? current?.logoMockupSize ?? logoMockupSize,
      mockupReferenceImages: patch.mockupReferenceImages ?? current?.mockupReferenceImages ?? mockupReferenceImages,
    }))
  }

  function applyLogoReuseState(scope: 'options' | 'mockup' | 'all' = 'all') {
    if (!logoReuseState) return
    if (scope === 'options' || scope === 'all') {
      setSelectedDeliveryIds(logoReuseState.selectedDeliveryIds)
    }
    if (scope === 'mockup' || scope === 'all') {
      setExpansionSelections(logoReuseState.expansionSelections)
      setExpansionDetails(logoReuseState.expansionDetails)
      setLogoMockupSize(logoReuseState.logoMockupSize)
      setMockupReferenceImages(logoReuseState.mockupReferenceImages)
    }
  }

  function isAbortError(error: unknown) {
    return error instanceof DOMException && error.name === 'AbortError'
  }

  function hasRequirementField(label: string) {
    return brief.split('\n').some((line) => line.trimStart().startsWith(`${label}：`))
  }

  function toggleRequirementField(label: string) {
    const prefix = `${label}：`
    setBrief((current) => {
      const lines = current.split('\n')
      const existingIndex = lines.findIndex((line) => line.trimStart().startsWith(prefix))

      if (existingIndex >= 0) {
        const nextLines = lines.filter((_, index) => index !== existingIndex)
        return nextLines.join('\n').replace(/\n{3,}/g, '\n\n').trimStart()
      }

      const separator = current.trim().length > 0 && !current.endsWith('\n') ? '\n' : ''
      return `${current}${separator}${prefix}`
    })
  }

  function selectReferenceImages(files: FileList | File[] | null) {
    if (!files) return
    const pickedFiles = Array.from(files)
    const images = pickedFiles.filter((file) => file.type.startsWith('image/'))
    if (pickedFiles.length > 0 && images.length === 0) {
      setError('请拖入图片文件。')
      return
    }
    setError('')
    setReferenceImages((current) => [...current, ...images].slice(0, 8))
  }

  function handleReferenceDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsDraggingReference(true)
  }

  function handleReferenceDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDraggingReference(false)
    }
  }

  function handleReferenceDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDraggingReference(false)
    selectReferenceImages(event.dataTransfer.files)
  }

  function removeReferenceImage(indexToRemove: number) {
    setReferenceImages((current) => current.filter((_, index) => index !== indexToRemove))
  }

  function selectMultiAngleImages(slotId: string, files: FileList | File[] | null) {
    if (!files) return
    const pickedFiles = Array.from(files)
    const images = pickedFiles.filter((file) => file.type.startsWith('image/'))
    if (pickedFiles.length > 0 && images.length === 0) {
      setError('请上传图片文件。')
      return
    }
    setError('')
    setMultiAngleFiles((current) => ({
      ...current,
      [slotId]: [...(current[slotId] || []), ...images].slice(0, 4),
    }))
  }

  function removeMultiAngleImage(slotId: string, indexToRemove: number) {
    setMultiAngleFiles((current) => ({
      ...current,
      [slotId]: (current[slotId] || []).filter((_, index) => index !== indexToRemove),
    }))
  }

  function selectMergeImage(slotId: string, files: FileList | File[] | null) {
    if (!files) return
    const pickedFiles = Array.from(files)
    const images = pickedFiles.filter((file) => file.type.startsWith('image/'))
    if (pickedFiles.length > 0 && images.length === 0) {
      setError('请上传图片文件。')
      return
    }
    if (images.length === 0) return
    setError('')
    setMergeImageFiles((current) => ({
      ...current,
      [slotId]: isMergeMultiReferenceSlot(slotId)
        ? [...(current[slotId] || []), ...images].slice(0, mergeAngleBatchLimit)
        : [images[0]],
    }))
    if (isMergeAngleUploadSlot(slotId)) setSelectedMergeAngleIds([])
  }

  function handleMergeImageDragOver(event: DragEvent<HTMLElement>, slotId: string) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setDraggingMergeImageSlot(slotId)
  }

  function handleMergeImageDragLeave(event: DragEvent<HTMLElement>, slotId: string) {
    if (draggingMergeImageSlot === slotId && !event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDraggingMergeImageSlot('')
    }
  }

  function handleMergeImageDrop(event: DragEvent<HTMLElement>, slotId: string) {
    event.preventDefault()
    setDraggingMergeImageSlot('')
    selectMergeImage(slotId, event.dataTransfer.files)
  }

  function removeMergeImage(slotId: string, indexToRemove = 0) {
    setMergeImageFiles((current) => ({
      ...current,
      [slotId]: (current[slotId] || []).filter((_, index) => index !== indexToRemove),
    }))
  }

  function getMergeReferenceTag(url: string) {
    try {
      const parsed = new URL(url, window.location.origin)
      return parsed.searchParams.get('mergeRef') || ''
    } catch {
      return ''
    }
  }

  function getReusableProductReferenceOrder(tag: string, fallbackIndex: number) {
    if (tag === 'product-shoe-primary') return 1
    const referenceMatch = tag.match(/^product-shoe-reference-(\d+)$/i)
    if (referenceMatch) return Number(referenceMatch[1]) || fallbackIndex + 1
    if (/^product-shoe(?:-|$)/i.test(tag)) return fallbackIndex + 1
    return 0
  }

  function getReferenceFileName(url: string, fallbackName: string, mimeType: string) {
    let fileName = fallbackName
    try {
      const parsed = new URL(url, window.location.origin)
      const rawName = parsed.pathname.split('/').filter(Boolean).pop()
      if (rawName) fileName = decodeURIComponent(rawName)
    } catch {
      // Keep the fallback name.
    }
    if (/\.[a-z0-9]{2,5}$/i.test(fileName)) return fileName
    const extension = mimeType.includes('jpeg') ? 'jpg'
      : mimeType.includes('webp') ? 'webp'
      : mimeType.includes('gif') ? 'gif'
      : 'png'
    return `${fileName}.${extension}`
  }

  async function fetchReusableReferenceFile(url: string, fallbackName: string) {
    const response = await fetch(url)
    if (!response.ok) throw new Error('参考图读取失败，请刷新生成记录后重试。')
    const blob = await response.blob()
    const type = blob.type || 'image/png'
    return new File([blob], getReferenceFileName(url, fallbackName, type), { type })
  }

  function inferReusableModelAngleId(image: ProjectImage) {
    const text = [image.directionId, image.directionTitle, image.title].filter(Boolean).join(' ')
    if (/angle-06|角度\s*6|角度6/i.test(text)) return 'angle-06'
    return 'angle-05'
  }

  async function reuseProjectReferences(_project: ProjectItem, image: ProjectImage) {
    const referenceUrls = image.referenceImageUrls || []
    const productReferences: Array<{ order: number; url: string }> = []
    let backgroundReference = ''
    let modelReference = ''

    referenceUrls.forEach((url, index) => {
      const tag = getMergeReferenceTag(url)
      const tagLower = tag.toLowerCase()
      if (tagLower === 'background') {
        if (!backgroundReference) backgroundReference = url
        return
      }
      if (tagLower === 'model-outfit-body-limbs') {
        if (!modelReference) modelReference = url
        return
      }
      const productOrder = getReusableProductReferenceOrder(tag, index)
      if (productOrder > 0) {
        productReferences.push({ order: productOrder, url })
      }
    })

    const sortedProductReferences = productReferences
      .sort((first, second) => first.order - second.order)
      .slice(0, mergeAngleBatchLimit)
    if (!sortedProductReferences.length && !backgroundReference && !modelReference) {
      setError('这条记录没有可复用的产品鞋图、背景图或模特参考图。')
      return
    }

    setError('')
    setOperationStatus('正在复用生成记录里的参考图...')
    const [productFiles, backgroundFile, modelFile] = await Promise.all([
      Promise.all(sortedProductReferences.map((item, index) => fetchReusableReferenceFile(item.url, `reused-product-${index + 1}`))),
      backgroundReference ? fetchReusableReferenceFile(backgroundReference, 'reused-background') : Promise.resolve(null),
      modelReference ? fetchReusableReferenceFile(modelReference, 'reused-model') : Promise.resolve(null),
    ])

    if (modelFile && !selectedMergeAngleIds.some(shouldUseModelOutfitReference)) {
      const modelAngleId = inferReusableModelAngleId(image)
      setSelectedMergeAngleIds((current) =>
        current.some(shouldUseModelOutfitReference) ? current : [...current, modelAngleId].slice(0, mergeAngleBatchLimit),
      )
    }
    setMergeImageFiles((current) => ({
      ...current,
      ...(productFiles.length ? { product: productFiles } : {}),
      ...(backgroundFile ? { background: [backgroundFile] } : {}),
      ...(modelFile ? { model: [modelFile] } : {}),
    }))
    setProjectsOpen(false)
    const reusedLabels = [
      productFiles.length ? `${productFiles.length} 张产品鞋图` : '',
      backgroundFile ? '背景图' : '',
      modelFile ? '模特参考图' : '',
    ].filter(Boolean)
    setOperationStatus(`已复用参考图：${reusedLabels.join('、')}。`)
  }

  function mergeReferenceSlotLabel(slotId: MergeMultiReferenceSlotId) {
    return mergeImageSlots.find((slot) => slot.id === slotId)?.label || '产品鞋图'
  }

  function mergeReferenceModalHint(slotId: MergeMultiReferenceSlotId) {
    if (slotId === 'product') return '张产品参考图；如果鞋款/颜色不同，生图时一张参考图对应一只鞋。'
    return '张参考图。'
  }

  function buildMergeImageBrief(baseBrief: string) {
    if (!isMergeImageSkill) return baseBrief
    const uploadedRoles = visibleMergeImageSlots
      .map((slot) => `${slot.label}: ${(mergeImageFiles[slot.id] || []).length ? 'uploaded' : 'not uploaded'}`)
      .join('\n')
    const optionBrief = [
      'AI Product Background Fusion configuration:',
      uploadedRoles,
      'Product image only controls the shoe identity and all shoe details.',
      'Background image only controls the exact uploaded environment, visible existing elements, lighting, perspective, and shadows; do not add any background structure or room feature that is not already visible.',
      'Selected angle-library image is a semantic region mask: yellow=shoes, blue=body limbs identified by silhouette as legs/ankles/feet or arms/hands/wrists, red=clothing, black=background. It controls pose, composition, occlusion, and camera angle.',
      'No model reference image is uploaded in this fixed-angle workflow. Generate simple natural lower-body limbs/clothing only as required by the selected angle-library reference.',
      'Generate one final realistic lower-body-only composite, not a triptych or explanation. Do not generate the model face, head, portrait, or full upper body. Replace every semantic mask region with realistic content from the assigned reference.',
    ].join('\n')
    return [baseBrief.trim(), optionBrief].filter(Boolean).join('\n\n')
  }

  function buildMergeImageUserDemand(baseBrief: string) {
    const trimmed = baseBrief.trim()
    if (!trimmed) return ''
    const looksLikeCopiedRuleBlock = /STRICT MULTI-REFERENCE|semantic region mask|yellow\s*=|blue\s*=|red\s*=|black\s*=|请严格按照以下多图参考逻辑|黄色区域|蓝色区域|红色区域|黑色区域/i.test(trimmed)
    if (looksLikeCopiedRuleBlock && trimmed.length > 800) return ''
    return trimmed.length > 500 ? trimmed.slice(0, 500) : trimmed
  }

  async function fileFromAsset(url: string, fileName: string) {
    const response = await fetch(url)
    if (!response.ok) throw new Error('读取角度库图片失败。')
    const blob = await response.blob()
    return new File([blob], fileName, { type: blob.type || 'image/png' })
  }

  async function fileFromGeneratedImageUrl(url: string, fileName: string) {
    const response = await fetch(url)
    if (!response.ok) throw new Error('读取角度3生成图失败，无法继续生成角度4。')
    const blob = await response.blob()
    return new File([blob], fileName, { type: blob.type || 'image/png' })
  }

  async function describeAngleColorBlocks(file: File, sourceLabel = '?????') {
    try {
      const bitmap = await createImageBitmap(file)
      const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height))
      const width = Math.max(1, Math.round(bitmap.width * scale))
      const height = Math.max(1, Math.round(bitmap.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) return ''
      context.drawImage(bitmap, 0, 0, width, height)
      const pixels = context.getImageData(0, 0, width, height).data
      const masks = {
        yellow: new Uint8Array(width * height),
        blue: new Uint8Array(width * height),
        green: new Uint8Array(width * height),
        red: new Uint8Array(width * height),
        black: new Uint8Array(width * height),
      }
      for (let index = 0; index < width * height; index += 1) {
        const offset = index * 4
        const r = pixels[offset]
        const g = pixels[offset + 1]
        const b = pixels[offset + 2]
        const a = pixels[offset + 3]
        if (a < 24) continue
        if (r > 150 && g > 125 && b < 135 && r + g > b * 2 + 110) masks.yellow[index] = 1
        else if (b > 110 && r < 135 && g < 170 && b > r * 1.15 && b > g * 1.05) masks.blue[index] = 1
        else if (r > 135 && g < 130 && b < 130 && r > g * 1.2 && r > b * 1.2) masks.red[index] = 1
        else if (r < 48 && g < 48 && b < 48) masks.black[index] = 1
      }

      type AngleComponent = { minX: number; minY: number; maxX: number; maxY: number; count: number }
      const findComponents = (mask: Uint8Array, minRatio = 0.0015) => {
        const visited = new Uint8Array(mask.length)
        const components: AngleComponent[] = []
        const queue: number[] = []
        for (let startIndex = 0; startIndex < mask.length; startIndex += 1) {
          if (!mask[startIndex] || visited[startIndex]) continue
          let minX = width
          let minY = height
          let maxX = 0
          let maxY = 0
          let count = 0
          queue.length = 0
          queue.push(startIndex)
          visited[startIndex] = 1
          for (let head = 0; head < queue.length; head += 1) {
            const current = queue[head]
            const x = current % width
            const y = Math.floor(current / width)
            minX = Math.min(minX, x)
            minY = Math.min(minY, y)
            maxX = Math.max(maxX, x)
            maxY = Math.max(maxY, y)
            count += 1
            const neighbors = [current - 1, current + 1, current - width, current + width]
            for (const next of neighbors) {
              if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue
              const nx = next % width
              if ((next === current - 1 || next === current + 1) && Math.abs(nx - x) !== 1) continue
              visited[next] = 1
              queue.push(next)
            }
          }
          if (count > width * height * minRatio) components.push({ minX, minY, maxX, maxY, count })
        }
        return components.sort((a, b) => b.count - a.count).slice(0, 8)
      }

      const metrics = (component: AngleComponent) => {
        const left = Math.round((component.minX / width) * 100)
        const top = Math.round((component.minY / height) * 100)
        const boxWidth = Math.round(((component.maxX - component.minX + 1) / width) * 100)
        const boxHeight = Math.round(((component.maxY - component.minY + 1) / height) * 100)
        const centerX = Math.round((((component.minX + component.maxX) / 2) / width) * 100)
        const centerY = Math.round((((component.minY + component.maxY) / 2) / height) * 100)
        return { left, top, boxWidth, boxHeight, centerX, centerY }
      }
      const positionName = (centerX: number, centerY: number) => {
        const horizontal = centerX < 34 ? 'left' : centerX > 66 ? 'right' : 'center'
        const vertical = centerY < 34 ? 'upper' : centerY > 66 ? 'lower' : 'middle'
        return vertical + '-' + horizontal
      }

      const describeShoe = (component: AngleComponent, index: number) => {
        const box = metrics(component)
        const orientation = box.boxWidth >= box.boxHeight * 1.15 ? 'horizontal / side-view shoe silhouette' : box.boxHeight >= box.boxWidth * 1.15 ? 'vertical / front-back shoe silhouette' : 'three-quarter shoe silhouette'
        const placement = positionName(box.centerX, box.centerY)
        return 'shoe placement reference region ' + (index + 1) + ': ' + placement + ', bbox left ' + box.left + '%, top ' + box.top + '%, width ' + box.boxWidth + '%, height ' + box.boxHeight + '%, center (' + box.centerX + '%, ' + box.centerY + '%). Use this yellow region only as placement, angle, size, toe direction, heel direction, left-foot/right-foot side inference, body-facing direction inference, heel contact point, and perspective reference. Generate the actual shoe appearance from the uploaded product shoe image only. Interpret as ' + orientation + '.'
      }

      const describeBlueLimb = (component: AngleComponent, index: number) => {
        const box = metrics(component)
        const isLongVertical = box.boxHeight >= box.boxWidth * 1.35
        const isWideHorizontal = box.boxWidth >= box.boxHeight * 1.2
        const likelyPart = box.boxWidth <= 14 && box.boxHeight <= 14
          ? 'small joint segment, likely hand/wrist/ankle depending on nearby red clothing and yellow shoe'
          : isLongVertical
            ? 'long vertical limb, likely leg or arm depending on whether it connects to shoe or clothing'
            : isWideHorizontal
              ? 'horizontal/bent limb segment, likely arm/hand if near clothing or lower-leg/ankle if near shoe'
              : 'diagonal or bent limb segment, identify as leg or arm from surrounding regions'
        const axis = isLongVertical ? 'mostly vertical limb' : isWideHorizontal ? 'mostly horizontal/bent limb' : 'diagonal or bent limb'
        const placement = positionName(box.centerX, box.centerY)
        const action = box.top < 12 && box.centerY > 40 ? 'limb enters from upper frame and extends downward' : box.centerY < 40 ? 'raised or upper limb segment' : 'lower limb / wrist / ankle segment connected to nearby region'
        return 'blue limb region ' + (index + 1) + ': ' + placement + ', bbox left ' + box.left + '%, top ' + box.top + '%, width ' + box.boxWidth + '%, height ' + box.boxHeight + '%, center (' + box.centerX + '%, ' + box.centerY + '%). Generate the matching natural female body part here after reading the silhouette: leg/ankle/foot if it connects to yellow shoe, or arm/hand/wrist if it connects to red clothing or upper body. Shape reading: ' + likelyPart + '. Motion reading: ' + axis + ', ' + action + '; preserve this region shape, joint direction, pose, and occlusion.'
      }

      const describeClothing = (component: AngleComponent, index: number) => {
        const box = metrics(component)
        const placement = positionName(box.centerX, box.centerY)
        const areaReading = box.boxWidth > box.boxHeight ? 'wide clothing area / upper-body garment or lower garment span' : 'vertical clothing panel / garment side'
        return 'clothing support region ' + (index + 1) + ': ' + placement + ', bbox left ' + box.left + '%, top ' + box.top + '%, width ' + box.boxWidth + '%, height ' + box.boxHeight + '%, center (' + box.centerX + '%, ' + box.centerY + '%). Fill with the actual clothing category from the model reference, interpreted as ' + areaReading + '. Preserve model-reference clothing color, fabric, silhouette, waistband/hem details, and styling, but keep clothing secondary to the product shoes; do not invent a skirt/dress if the model reference wears pants, jeans, shorts, or a top. Keep clothing position aligned to this red area.'
      }

      const yellow = findComponents(masks.yellow)
      const blue = findComponents(masks.blue)
      const red = findComponents(masks.red)
      const black = findComponents(masks.black, 0.01).slice(0, 3)
      const mainShoe = yellow[0] ? metrics(yellow[0]) : null
      const mainLimb = blue[0] ? metrics(blue[0]) : null
      const cameraNotes = [
        mainShoe && mainShoe.centerY > 58 ? 'camera frames shoes in the lower half with feet as foreground priority' : 'camera keeps shoes around mid-frame',
        mainLimb && mainLimb.top < 10 ? 'blue limbs enter from upper edge, implying cropped fashion/product photo framing' : 'blue limbs are partially visible and cropped by the composition',
        yellow.length >= 2 ? 'raw yellow fragments detected, but this raw connected-component count is not the real shoe count. The cleaned control MAIN SHOE COUNT LOCK is authoritative. Straps, buckles, openings, stitching, lace gaps, inner shadows, separated detail pieces, or overlapping shoe silhouettes may split or connect raw yellow regions. Use the cleaned control S objects only for real shoe count, placement, angle, size, orientation, toe direction, heel contact, scale, and perspective. Generate shoe appearance only from the uploaded product shoe image. Only cleaned-control S objects connected to blue leg/ankle/foot regions are worn shoes; non-connected S objects are ground, display, foreground, or handheld shoes and must not create extra legs or feet' : 'single raw yellow placement region observed; still use the cleaned control MAIN SHOE COUNT LOCK as authoritative',
        red.length ? 'model outfit must occupy the red clothing support region and align with the body-limb origin; use the actual clothing type from the model reference but keep it secondary to the product shoes' : 'no large clothing block detected; keep clothing minimal or cropped out unless model reference requires it',
      ].filter(Boolean)

      const blackText = black.length ? black.map((component, index) => { const box = metrics(component); return 'background region ' + (index + 1) + ': ' + positionName(box.centerX, box.centerY) + ', bbox left ' + box.left + '%, top ' + box.top + '%, width ' + box.boxWidth + '%, height ' + box.boxHeight + '%' }).join(' | ') + '. Fill all black/empty areas with the uploaded background image environment.' : 'Black background region: fill all non-colored empty areas with uploaded background image environment.'
      const resultLines = [
        'Uploaded-angle semantic analysis for ' + sourceLabel + ': this image is a semantic pose/composition template, not a style/color/material reference. If this is a color-block image, use the color mapping below; if it is a real photo, sketch, or mixed reference, infer equivalent shoe/body/clothing/background roles from the visible layout.',
        'Color meaning for masks: yellow=shoe angle/placement reference only, blue=body limb region that must be identified by silhouette as leg/ankle/foot or arm/hand/wrist, red=secondary model outfit/clothing support area, black=background from uploaded background image. No visible yellow/blue/red/black color blocks or tinted mask remnants may appear in the final image.',
        'Universal object-count rule: count real main shoe objects from the overall visual intent, not from disconnected color fragments. Shoe straps, buckles, openings, toe gaps, heel gaps, lace gaps, stitching, internal black holes, inner shadows, and thin dividing lines belong to the nearest main shoe and must not become extra shoes. Internal black marks inside a shoe are shoe openings/details, not background.',
        yellow.length ? 'Raw yellow placement fragments observed, not authoritative shoe count: ' + yellow.map(describeShoe).join(' | ') + ' Do not count these raw fragments as shoes. The cleaned control MAIN SHOE COUNT LOCK and S labels are authoritative; merge straps, openings, buckles, detail fragments, and split/overlapping shoe pieces into the real main shoe objects.' : 'Yellow shoe placement reference regions: none detected; do not invent extra shoes beyond visible uploaded-angle intent.',
        blue.length ? 'Blue body-limb regions: ' + blue.map(describeBlueLimb).join(' | ') : 'Blue body-limb regions: none detected; do not invent extra limbs unless required by shoe-on-foot context.',
        red.length ? 'Red clothing regions: ' + red.map(describeClothing).join(' | ') : 'Red clothing regions: none detected; if model is uploaded, use only cropped/minimal outfit consistent with the mask.',
        'Black background regions: ' + blackText,
        'Pose and camera interpretation: ' + cameraNotes.join('; ') + '. Use these notes to decide generated angle, body pose, shoe placement, and lens framing.',
        'Hard rule: final output must not show any pure yellow, blue, red, or black mask colors, flat color-block silhouettes, or tinted mask remnants; replace each semantic region with realistic content from its assigned reference.',
      ]
      return resultLines.join('\n')
    } catch {
      return ''
    }
  }

  async function describeAngle06YellowEdgeDistances(file: File) {
    try {
      const bitmap = await createImageBitmap(file)
      const scale = Math.min(1, 768 / Math.max(bitmap.width, bitmap.height))
      const width = Math.max(1, Math.round(bitmap.width * scale))
      const height = Math.max(1, Math.round(bitmap.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) return ''
      context.drawImage(bitmap, 0, 0, width, height)
      const pixels = context.getImageData(0, 0, width, height).data
      const yellowMask = new Uint8Array(width * height)
      for (let index = 0; index < width * height; index += 1) {
        const offset = index * 4
        const r = pixels[offset]
        const g = pixels[offset + 1]
        const b = pixels[offset + 2]
        const a = pixels[offset + 3]
        if (a < 24) continue
        if (r > 150 && g > 125 && b < 135 && r + g > b * 2 + 110) yellowMask[index] = 1
      }

      type YellowComponent = { minX: number; minY: number; maxX: number; maxY: number; count: number }
      const visited = new Uint8Array(yellowMask.length)
      const components: YellowComponent[] = []
      const queue: number[] = []
      const minPixels = Math.max(16, width * height * 0.001)
      for (let startIndex = 0; startIndex < yellowMask.length; startIndex += 1) {
        if (!yellowMask[startIndex] || visited[startIndex]) continue
        let minX = width
        let minY = height
        let maxX = 0
        let maxY = 0
        let count = 0
        queue.length = 0
        queue.push(startIndex)
        visited[startIndex] = 1
        for (let head = 0; head < queue.length; head += 1) {
          const current = queue[head]
          const x = current % width
          const y = Math.floor(current / width)
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
          count += 1
          const neighbors = [current - 1, current + 1, current - width, current + width]
          for (const next of neighbors) {
            if (next < 0 || next >= yellowMask.length || visited[next] || !yellowMask[next]) continue
            const nx = next % width
            if ((next === current - 1 || next === current + 1) && Math.abs(nx - x) !== 1) continue
            visited[next] = 1
            queue.push(next)
          }
        }
        if (count >= minPixels) components.push({ minX, minY, maxX, maxY, count })
      }

      const mainComponents = components.sort((a, b) => b.count - a.count).slice(0, 4)
      if (!mainComponents.length) return ''
      const percent = (value: number, total: number) => Math.round((value / Math.max(1, total)) * 100)
      const metrics = (component: YellowComponent) => {
        const boxWidth = component.maxX - component.minX + 1
        const boxHeight = component.maxY - component.minY + 1
        const centerX = (component.minX + component.maxX) / 2
        const centerY = (component.minY + component.maxY) / 2
        return {
          left: percent(component.minX, width),
          top: percent(component.minY, height),
          boxWidth: percent(boxWidth, width),
          boxHeight: percent(boxHeight, height),
          centerX: percent(centerX, width),
          centerY: percent(centerY, height),
          rightDistance: percent(width - component.maxX - 1, width),
          bottomDistance: percent(height - component.maxY - 1, height),
        }
      }
      const combined: YellowComponent = mainComponents.reduce(
        (box, component) => ({
          minX: Math.min(box.minX, component.minX),
          minY: Math.min(box.minY, component.minY),
          maxX: Math.max(box.maxX, component.maxX),
          maxY: Math.max(box.maxY, component.maxY),
          count: box.count + component.count,
        }),
        { minX: width, minY: height, maxX: 0, maxY: 0, count: 0 },
      )
      const describeBox = (label: string, component: YellowComponent) => {
        const box = metrics(component)
        return `${label}: bbox left ${box.left}%, top ${box.top}%, width ${box.boxWidth}%, height ${box.boxHeight}%, center (${box.centerX}%, ${box.centerY}%); edge distances left ${box.left}%, right ${box.rightDistance}%, top ${box.top}%, bottom ${box.bottomDistance}%.`
      }

      return [
        'ANGLE-06 YELLOW EDGE-DISTANCE PLACEMENT LOCK:',
        'Use only the yellow region geometry to anchor shoe placement. This is not body recognition, not shoe-count recognition, not S/B/R schema, and not hand/foot classification.',
        describeBox('Combined yellow shoe placement envelope', combined),
        mainComponents.map((component, index) => describeBox(`Yellow shoe placement area ${index + 1}`, component)).join(' '),
        'When generating the final shoes, estimate their position from these edge distances: keep the same distance from the canvas left/right/top/bottom edges, same visual center, same overall coverage, same toe-to-heel direction, and same near-camera placement as the yellow area.',
        'Do not move the shoes upward, downward, backward, smaller, larger, or closer to the body because of foreground objects, background perspective, clothing, hands, or aesthetic centering. Foreground/background elements may remain, but they must not push the shoes away from the yellow edge-distance anchors.',
        'The yellow color itself must never appear in the final image. The uploaded product shoe images still control all shoe appearance, color, material, details, and silhouette.',
      ].join('\n')
    } catch {
      return ''
    }
  }

  async function buildCleanedAngleControl(file: File) {
    try {
      const bitmap = await createImageBitmap(file)
      const width = bitmap.width
      const height = bitmap.height
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) return null
      context.drawImage(bitmap, 0, 0, width, height)
      const pixels = context.getImageData(0, 0, width, height).data
      const masks = {
        yellow: new Uint8Array(width * height),
        blue: new Uint8Array(width * height),
        red: new Uint8Array(width * height),
        black: new Uint8Array(width * height),
      }
      for (let index = 0; index < width * height; index += 1) {
        const offset = index * 4
        const r = pixels[offset]
        const g = pixels[offset + 1]
        const b = pixels[offset + 2]
        const a = pixels[offset + 3]
        if (a < 24) continue
        if (r > 150 && g > 125 && b < 135 && r + g > b * 2 + 110) masks.yellow[index] = 1
        else if (b > 110 && r < 135 && g < 170 && b > r * 1.15 && b > g * 1.05) masks.blue[index] = 1
        else if (r > 135 && g < 130 && b < 130 && r > g * 1.2 && r > b * 1.2) masks.red[index] = 1
        else if (r < 55 && g < 55 && b < 55) masks.black[index] = 1
      }

      const totalPixels = Math.max(1, width * height)
      const maskCounts = {
        yellow: masks.yellow.reduce((sum, value) => sum + value, 0),
        blue: masks.blue.reduce((sum, value) => sum + value, 0),
        red: masks.red.reduce((sum, value) => sum + value, 0),
        black: masks.black.reduce((sum, value) => sum + value, 0),
      }
      const yellowRatio = maskCounts.yellow / totalPixels
      const blueRatio = maskCounts.blue / totalPixels
      const redRatio = maskCounts.red / totalPixels
      const blackRatio = maskCounts.black / totalPixels
      const semanticRatio = yellowRatio + blueRatio + redRatio
      const meaningfulSemanticColors = [yellowRatio, blueRatio, redRatio].filter((ratio) => ratio >= 0.003).length
      const looksLikeColorBlockMask =
        yellowRatio >= 0.0025 &&
        blueRatio >= 0.0025 &&
        semanticRatio >= 0.018 &&
        meaningfulSemanticColors >= 2 &&
        (blackRatio >= 0.12 || redRatio >= 0.003 || semanticRatio >= 0.06)

      if (!looksLikeColorBlockMask) {
        const fileLabel = file.name || 'uploaded angle reference'
        return {
          file: null,
          layout: [
            'REAL PHOTO ANGLE REFERENCE:',
            `Uploaded file "${fileLabel}" is detected as a real photo / non-color-block angle reference, so no cleaned color-mask control image was generated.`,
            'Use the original uploaded angle reference image itself as the strongest pose and camera reference.',
            'Follow its real camera viewpoint, shooting height, lens perspective, crop, subject location, foot/hand/body relationship, shoe count, shoe placement, shoe direction, scale, overlap, and occlusion.',
            'Do not interpret this real photo as yellow=shoes, blue=limbs, red=clothing, black=background. Do not generate or preserve any mask colors.',
            'Use the product shoe image only for shoe identity and details. Use the background image only for the final environment. If a model reference is uploaded, use it only for outfit and body styling.',
          ].join('\n'),
        }
      }

      type AngleComponent = { minX: number; minY: number; maxX: number; maxY: number; count: number }
      const findComponents = (mask: Uint8Array, minRatio = 0.0015) => {
        const visited = new Uint8Array(mask.length)
        const components: AngleComponent[] = []
        const queue: number[] = []
        for (let startIndex = 0; startIndex < mask.length; startIndex += 1) {
          if (!mask[startIndex] || visited[startIndex]) continue
          let minX = width
          let minY = height
          let maxX = 0
          let maxY = 0
          let count = 0
          queue.length = 0
          queue.push(startIndex)
          visited[startIndex] = 1
          for (let head = 0; head < queue.length; head += 1) {
            const current = queue[head]
            const x = current % width
            const y = Math.floor(current / width)
            minX = Math.min(minX, x)
            minY = Math.min(minY, y)
            maxX = Math.max(maxX, x)
            maxY = Math.max(maxY, y)
            count += 1
            const neighbors = [current - 1, current + 1, current - width, current + width]
            for (const next of neighbors) {
              if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue
              const nx = next % width
              if ((next === current - 1 || next === current + 1) && Math.abs(nx - x) !== 1) continue
              visited[next] = 1
              queue.push(next)
            }
          }
          if (count > width * height * minRatio) components.push({ minX, minY, maxX, maxY, count })
        }
        return components.sort((a, b) => b.count - a.count)
      }

      const expandBox = (component: AngleComponent, ratio = 0.08): AngleComponent => {
        const boxWidth = component.maxX - component.minX + 1
        const boxHeight = component.maxY - component.minY + 1
        const growX = Math.round(boxWidth * ratio)
        const growY = Math.round(boxHeight * ratio)
        return {
          minX: Math.max(0, component.minX - growX),
          minY: Math.max(0, component.minY - growY),
          maxX: Math.min(width - 1, component.maxX + growX),
          maxY: Math.min(height - 1, component.maxY + growY),
          count: component.count,
        }
      }
      const boxesOverlap = (a: AngleComponent, b: AngleComponent) => {
        return !(a.maxX < b.minX || b.maxX < a.minX || a.maxY < b.minY || b.maxY < a.minY)
      }
      const unionBox = (a: AngleComponent, b: AngleComponent): AngleComponent => ({
        minX: Math.min(a.minX, b.minX),
        minY: Math.min(a.minY, b.minY),
        maxX: Math.max(a.maxX, b.maxX),
        maxY: Math.max(a.maxY, b.maxY),
        count: a.count + b.count,
      })
      const mergeNearby = (components: AngleComponent[], ratio = 0.18) => {
        const merged: AngleComponent[] = []
        for (const component of components) {
          let current = component
          let didMerge = true
          while (didMerge) {
            didMerge = false
            for (let index = 0; index < merged.length; index += 1) {
              if (boxesOverlap(expandBox(current, ratio), expandBox(merged[index], ratio))) {
                current = unionBox(current, merged[index])
                merged.splice(index, 1)
                didMerge = true
                break
              }
            }
          }
          merged.push(current)
        }
        return merged.sort((a, b) => b.count - a.count)
      }
      const componentAreaRatio = (component: AngleComponent) => component.count / (width * height)
      const boxAreaRatio = (component: AngleComponent) => {
        const boxWidth = component.maxX - component.minX + 1
        const boxHeight = component.maxY - component.minY + 1
        return (boxWidth * boxHeight) / (width * height)
      }
      const boxCenterDistance = (a: AngleComponent, b: AngleComponent) => {
        const ax = (a.minX + a.maxX) / 2
        const ay = (a.minY + a.maxY) / 2
        const bx = (b.minX + b.maxX) / 2
        const by = (b.minY + b.maxY) / 2
        return Math.hypot((ax - bx) / width, (ay - by) / height)
      }
      const boxOverlapRatio = (a: AngleComponent, b: AngleComponent) => {
        const overlapX = Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX) + 1)
        const overlapY = Math.max(0, Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY) + 1)
        const overlapArea = overlapX * overlapY
        const aArea = (a.maxX - a.minX + 1) * (a.maxY - a.minY + 1)
        const bArea = (b.maxX - b.minX + 1) * (b.maxY - b.minY + 1)
        return overlapArea / Math.max(1, Math.min(aArea, bArea))
      }
      const connectedToAny = (component: AngleComponent, others: AngleComponent[], ratio = 0.12) => touchesAny(component, others, ratio)
      const yellowPixelContactCount = (a: AngleComponent, b: AngleComponent, expand = 1) => {
        let count = 0
        const minX = Math.max(0, Math.min(a.minX, b.minX) - expand)
        const maxX = Math.min(width - 1, Math.max(a.maxX, b.maxX) + expand)
        const minY = Math.max(0, Math.min(a.minY, b.minY) - expand)
        const maxY = Math.min(height - 1, Math.max(a.maxY, b.maxY) + expand)
        for (let y = minY; y <= maxY; y += 1) {
          for (let x = minX; x <= maxX; x += 1) {
            const index = y * width + x
            if (!masks.yellow[index]) continue
            let nearOther = false
            for (let yy = Math.max(0, y - expand); yy <= Math.min(height - 1, y + expand) && !nearOther; yy += 1) {
              for (let xx = Math.max(0, x - expand); xx <= Math.min(width - 1, x + expand); xx += 1) {
                const otherIndex = yy * width + xx
                if (!masks.yellow[otherIndex]) continue
                const inA = xx >= a.minX && xx <= a.maxX && yy >= a.minY && yy <= a.maxY
                const inB = xx >= b.minX && xx <= b.maxX && yy >= b.minY && yy <= b.maxY
                if ((inA && !inB) || (inB && !inA)) {
                  nearOther = true
                  break
                }
              }
            }
            if (nearOther) count += 1
          }
        }
        return count
      }
      const splitOverlappedDoubleShoe = (component: AngleComponent): AngleComponent[] => {
        const boxWidth = component.maxX - component.minX + 1
        const boxHeight = component.maxY - component.minY + 1
        const isLargeWideShoeMass = componentAreaRatio(component) > 0.045 && boxWidth > width * 0.35 && boxHeight > height * 0.12
        if (!isLargeWideShoeMass) return [component]

        const columns = new Array(boxWidth).fill(0)
        const rows = new Array(boxHeight).fill(0)
        for (let y = component.minY; y <= component.maxY; y += 1) {
          for (let x = component.minX; x <= component.maxX; x += 1) {
            const index = y * width + x
            if (!masks.yellow[index]) continue
            columns[x - component.minX] += 1
            rows[y - component.minY] += 1
          }
        }
        const splitCandidates: Array<{ axis: 'x' | 'y'; index: number; score: number }> = []
        const columnMax = Math.max(...columns, 1)
        for (let index = Math.round(boxWidth * 0.18); index <= Math.round(boxWidth * 0.82); index += 1) {
          const value = columns[index] || 0
          if (value < columnMax * 0.52) splitCandidates.push({ axis: 'x', index, score: value / columnMax })
        }
        const rowMax = Math.max(...rows, 1)
        for (let index = Math.round(boxHeight * 0.18); index <= Math.round(boxHeight * 0.82); index += 1) {
          const value = rows[index] || 0
          if (value < rowMax * 0.52) splitCandidates.push({ axis: 'y', index, score: value / rowMax })
        }

        const buildPart = (best: { axis: 'x' | 'y'; index: number }, side: 'before' | 'after') => {
          let minX = width
          let minY = height
          let maxX = 0
          let maxY = 0
          let count = 0
          for (let y = component.minY; y <= component.maxY; y += 1) {
            for (let x = component.minX; x <= component.maxX; x += 1) {
              const index = y * width + x
              if (!masks.yellow[index]) continue
              const local = best.axis === 'x' ? x - component.minX : y - component.minY
              const inPart = side === 'before' ? local <= best.index : local > best.index
              if (!inPart) continue
              minX = Math.min(minX, x)
              minY = Math.min(minY, y)
              maxX = Math.max(maxX, x)
              maxY = Math.max(maxY, y)
              count += 1
            }
          }
          return count > width * height * 0.0025 ? { minX, minY, maxX, maxY, count } : null
        }
        const scoredSplits = splitCandidates
          .map((candidate) => {
            const before = buildPart(candidate, 'before')
            const after = buildPart(candidate, 'after')
            if (!before || !after) return null
            const beforeConnected = connectedToAny(before, blueComponents, 0.12)
            const afterConnected = connectedToAny(after, blueComponents, 0.12)
            const centerDistance = boxCenterDistance(before, after)
            const contactPixels = yellowPixelContactCount(before, after, 1)
            const likelyDisplayPlusWorn = beforeConnected !== afterConnected && centerDistance > 0.1
            const likelyTwoLargeShoes = componentAreaRatio(before) > 0.008 && componentAreaRatio(after) > 0.008 && centerDistance > 0.14
            const lowBridge = contactPixels < Math.max(28, component.count * 0.025)
            const partBalance = Math.min(before.count, after.count) / Math.max(before.count, after.count)
            const score =
              (likelyDisplayPlusWorn ? 40 : 0) +
              (likelyTwoLargeShoes ? 24 : 0) +
              (lowBridge ? 18 : 0) +
              centerDistance * 30 +
              partBalance * 20 -
              candidate.score * 18
            return { candidate, before, after, likelyDisplayPlusWorn, likelyTwoLargeShoes, lowBridge, score }
          })
          .filter(Boolean) as Array<{
            candidate: { axis: 'x' | 'y'; index: number; score: number }
            before: AngleComponent
            after: AngleComponent
            likelyDisplayPlusWorn: boolean
            likelyTwoLargeShoes: boolean
            lowBridge: boolean
            score: number
          }>
        scoredSplits.sort((a, b) => b.score - a.score)
        const best = scoredSplits[0]
        if (!best) return [component]
        return best.likelyDisplayPlusWorn || (best.likelyTwoLargeShoes && best.lowBridge) ? [best.before, best.after] : [component]
      }
      const inferWornShoeSupplements = (rawComponents: AngleComponent[], existingShoes: AngleComponent[]) => {
        const supplements: AngleComponent[] = []
        for (const limb of blueComponents) {
          const nearbyYellow = rawComponents.filter((component) => {
            const tooTiny = componentAreaRatio(component) < 0.00035
            if (tooTiny) return false
            if (!boxesOverlap(expandBox(component, 0.24), expandBox(limb, 0.08))) return false
            const overlap = boxOverlapRatio(expandBox(component, 0.18), expandBox(limb, 0.05))
            const close = boxCenterDistance(component, limb) < 0.24
            return overlap > 0.025 || close
          })
          if (!nearbyYellow.length) continue
          const totalYellow = nearbyYellow.reduce((sum, component) => sum + component.count, 0)
          const hasEnoughStrapsOrEdges = nearbyYellow.length >= 2 || totalYellow > width * height * 0.004
          if (!hasEnoughStrapsOrEdges) continue
          const candidate = nearbyYellow.reduce((current, component) => unionBox(current, component))
          const candidateBoxArea = boxAreaRatio(candidate)
          if (componentAreaRatio(candidate) < 0.0018 && candidateBoxArea < 0.025) continue
          const duplicate = existingShoes.some((shoe) => {
            const shoeBoxArea = boxAreaRatio(shoe)
            const samePosition = boxCenterDistance(shoe, candidate) < 0.11 || boxOverlapRatio(expandBox(shoe, 0.06), expandBox(candidate, 0.06)) > 0.62
            const existingIsNotMergedMass = shoeBoxArea < candidateBoxArea * 2.4
            return samePosition && existingIsNotMergedMass
          })
          if (!duplicate) supplements.push(candidate)
        }
        return supplements
      }
      const dedupeShoes = (components: AngleComponent[]) => {
        const deduped: AngleComponent[] = []
        for (const component of components) {
          const duplicateIndex = deduped.findIndex((existing) =>
            boxCenterDistance(existing, component) < 0.1 ||
            (
              boxOverlapRatio(expandBox(existing, 0.04), expandBox(component, 0.04)) > 0.7 &&
              Math.max(boxAreaRatio(existing), boxAreaRatio(component)) < Math.min(boxAreaRatio(existing), boxAreaRatio(component)) * 2.2
            ),
          )
          if (duplicateIndex >= 0) {
            const existing = deduped[duplicateIndex]
            deduped[duplicateIndex] = component.count > existing.count ? component : existing
          } else {
            deduped.push(component)
          }
        }
        return deduped
      }
      const mergeShoeFragments = (components: AngleComponent[]) => {
        const candidates = components.filter((component) => {
          const boxWidth = component.maxX - component.minX + 1
          const boxHeight = component.maxY - component.minY + 1
          return component.count > width * height * 0.0025 && boxWidth > width * 0.035 && boxHeight > height * 0.035
        })
        const sorted = candidates.sort((a, b) => b.count - a.count)
        const merged: AngleComponent[] = []
        for (const component of sorted) {
          const isTinyDetail = componentAreaRatio(component) < 0.006 && boxAreaRatio(component) < 0.035
          let mergedIntoExisting = false
          for (let index = 0; index < merged.length; index += 1) {
            const existing = merged[index]
            const overlap = boxOverlapRatio(expandBox(component, 0.35), expandBox(existing, 0.35))
            const close = boxCenterDistance(component, existing) < 0.22
            if (overlap > 0.08 || close || isTinyDetail) {
              merged[index] = unionBox(existing, component)
              mergedIntoExisting = true
              break
            }
          }
          if (!mergedIntoExisting && !isTinyDetail) merged.push(component)
        }
        const split = merged.flatMap(splitOverlappedDoubleShoe)
        const supplemented = dedupeShoes([...split, ...inferWornShoeSupplements(components, split)])
        const connected = supplemented.filter((component) => connectedToAny(component, blueComponents, 0.1))
        const disconnected = supplemented.filter((component) => !connectedToAny(component, blueComponents, 0.1))
        const chosen = [...connected, ...disconnected]
          .filter((component) => componentAreaRatio(component) > 0.007 || boxAreaRatio(component) > 0.04)
          .slice(0, 4)
        const seed = chosen.length ? chosen : supplemented.slice(0, 4)
        return seed.sort((a, b) => {
          const ay = (a.minY + a.maxY) / 2
          const by = (b.minY + b.maxY) / 2
          if (Math.abs(ay - by) > height * 0.08) return ay - by
          return a.minX - b.minX
        })
      }
      const metrics = (component: AngleComponent) => {
        const left = Math.round((component.minX / width) * 100)
        const top = Math.round((component.minY / height) * 100)
        const boxWidth = Math.round(((component.maxX - component.minX + 1) / width) * 100)
        const boxHeight = Math.round(((component.maxY - component.minY + 1) / height) * 100)
        const centerX = Math.round((((component.minX + component.maxX) / 2) / width) * 100)
        const centerY = Math.round((((component.minY + component.maxY) / 2) / height) * 100)
        return { left, top, boxWidth, boxHeight, centerX, centerY }
      }
      const pointLabel = (x: number, y: number) => {
        const horizontal = x < 34 ? 'left' : x > 66 ? 'right' : 'center'
        const vertical = y < 34 ? 'upper' : y > 66 ? 'lower' : 'middle'
        return `${vertical}-${horizontal}`
      }
      const directionFromDelta = (dx: number, dy: number) => {
        const horizontal = dx < -8 ? 'left' : dx > 8 ? 'right' : ''
        const vertical = dy < -8 ? 'upper' : dy > 8 ? 'lower' : ''
        if (vertical && horizontal) return `${vertical}-${horizontal}`
        return vertical || horizontal || 'center'
      }
      const weightedCenter = (components: AngleComponent[]) => {
        const weighted = components.reduce((acc, component) => {
          const box = metrics(component)
          const weight = Math.max(1, component.count)
          return {
            x: acc.x + box.centerX * weight,
            y: acc.y + box.centerY * weight,
            weight: acc.weight + weight,
          }
        }, { x: 0, y: 0, weight: 0 })
        return weighted.weight ? { x: Math.round(weighted.x / weighted.weight), y: Math.round(weighted.y / weighted.weight) } : null
      }
      const axisForComponent = (mask: Uint8Array, component: AngleComponent) => {
        let count = 0
        let sumX = 0
        let sumY = 0
        for (let y = component.minY; y <= component.maxY; y += 1) {
          for (let x = component.minX; x <= component.maxX; x += 1) {
            const index = y * width + x
            if (!mask[index]) continue
            count += 1
            sumX += x
            sumY += y
          }
        }
        if (!count) return null
        const meanX = sumX / count
        const meanY = sumY / count
        let covXX = 0
        let covXY = 0
        let covYY = 0
        for (let y = component.minY; y <= component.maxY; y += 1) {
          for (let x = component.minX; x <= component.maxX; x += 1) {
            const index = y * width + x
            if (!mask[index]) continue
            const dx = x - meanX
            const dy = y - meanY
            covXX += dx * dx
            covXY += dx * dy
            covYY += dy * dy
          }
        }
        const angle = 0.5 * Math.atan2(2 * covXY, covXX - covYY)
        const vx = Math.cos(angle)
        const vy = Math.sin(angle)
        let minProjection = Number.POSITIVE_INFINITY
        let maxProjection = Number.NEGATIVE_INFINITY
        for (let y = component.minY; y <= component.maxY; y += 1) {
          for (let x = component.minX; x <= component.maxX; x += 1) {
            const index = y * width + x
            if (!mask[index]) continue
            const projection = (x - meanX) * vx + (y - meanY) * vy
            minProjection = Math.min(minProjection, projection)
            maxProjection = Math.max(maxProjection, projection)
          }
        }
        const start = {
          x: Math.round(((meanX + vx * minProjection) / width) * 100),
          y: Math.round(((meanY + vy * minProjection) / height) * 100),
        }
        const end = {
          x: Math.round(((meanX + vx * maxProjection) / width) * 100),
          y: Math.round(((meanY + vy * maxProjection) / height) * 100),
        }
        return {
          start,
          end,
          angleDegrees: Math.round((angle * 180) / Math.PI),
          direction: directionFromDelta(end.x - start.x, end.y - start.y),
        }
      }
      const touchesAny = (component: AngleComponent, others: AngleComponent[], ratio = 0.1) => {
        const expanded = expandBox(component, ratio)
        return others.some((other) => boxesOverlap(expanded, expandBox(other, ratio)))
      }
      type BlueRegionKind = 'leg-foot' | 'hand' | 'detail'
      type BlueRegionAnalysis = {
        component: AngleComponent
        kind: BlueRegionKind
        confidence: 'high' | 'medium' | 'low'
        reason: string
        connectedShoeIndexes: number[]
        handScore: number
        footScore: number
        depthRole: string
        debug: string
      }
      const componentSizeLabel = (box: ReturnType<typeof metrics>) => {
        if (box.boxWidth >= 34 || box.boxHeight >= 34) return 'large'
        if (box.boxWidth >= 17 || box.boxHeight >= 17) return 'medium'
        return 'small'
      }
      const projectionGroups = (mask: Uint8Array, component: AngleComponent, axis: 'x' | 'y') => {
        const boxWidth = component.maxX - component.minX + 1
        const boxHeight = component.maxY - component.minY + 1
        const length = axis === 'x' ? boxWidth : boxHeight
        const cross = axis === 'x' ? boxHeight : boxWidth
        const values = new Array(length).fill(0)
        for (let y = component.minY; y <= component.maxY; y += 1) {
          for (let x = component.minX; x <= component.maxX; x += 1) {
            const index = y * width + x
            if (!mask[index]) continue
            values[axis === 'x' ? x - component.minX : y - component.minY] += 1
          }
        }
        const maxValue = Math.max(...values, 1)
        const threshold = Math.max(2, Math.min(cross * 0.18, maxValue * 0.32))
        let groups = 0
        let inGroup = false
        let activeLength = 0
        for (const value of values) {
          const active = value >= threshold
          if (active) {
            activeLength += 1
            if (!inGroup) {
              groups += 1
              inGroup = true
            }
          } else {
            inGroup = false
          }
        }
        return { groups, activeRatio: activeLength / Math.max(1, length) }
      }
      const componentInsideBoxRatio = (mask: Uint8Array, component: AngleComponent, box: ReturnType<typeof metrics>) => {
        const left = Math.round((box.left / 100) * width)
        const right = Math.round(((box.left + box.boxWidth) / 100) * width)
        const top = Math.round((box.top / 100) * height)
        const bottom = Math.round(((box.top + box.boxHeight) / 100) * height)
        let activePixels = 0
        let insidePixels = 0
        for (let y = component.minY; y <= component.maxY; y += 1) {
          for (let x = component.minX; x <= component.maxX; x += 1) {
            const index = y * width + x
            if (!mask[index]) continue
            activePixels += 1
            if (x >= left && x <= right && y >= top && y <= bottom) insidePixels += 1
          }
        }
        return activePixels ? insidePixels / activePixels : 0
      }
      const terminalShapeStats = (mask: Uint8Array, component: AngleComponent, axis: ReturnType<typeof axisForComponent>, terminal: 'start' | 'end') => {
        if (!axis) return { groups: 0, fillRatio: 1, areaRatio: 0, boxWidth: 0, boxHeight: 0 }
        const start = { x: (axis.start.x / 100) * width, y: (axis.start.y / 100) * height }
        const end = { x: (axis.end.x / 100) * width, y: (axis.end.y / 100) * height }
        const dx = end.x - start.x
        const dy = end.y - start.y
        const length = Math.max(1, Math.hypot(dx, dy))
        const vx = dx / length
        const vy = dy / length
        const px = -vy
        const py = vx
        const terminalLimit = length * 0.36
        let count = 0
        let minX = width
        let minY = height
        let maxX = 0
        let maxY = 0
        const qs: number[] = []
        for (let y = component.minY; y <= component.maxY; y += 1) {
          for (let x = component.minX; x <= component.maxX; x += 1) {
            const index = y * width + x
            if (!mask[index]) continue
            const projection = (x - start.x) * vx + (y - start.y) * vy
            const inTerminal = terminal === 'start' ? projection <= terminalLimit : projection >= length - terminalLimit
            if (!inTerminal) continue
            count += 1
            minX = Math.min(minX, x)
            minY = Math.min(minY, y)
            maxX = Math.max(maxX, x)
            maxY = Math.max(maxY, y)
            qs.push((x - start.x) * px + (y - start.y) * py)
          }
        }
        if (!count || !qs.length) return { groups: 0, fillRatio: 1, areaRatio: 0, boxWidth: 0, boxHeight: 0 }
        const qMin = Math.min(...qs)
        const qMax = Math.max(...qs)
        const binCount = Math.max(12, Math.min(36, Math.round((qMax - qMin) / Math.max(2, Math.max(width, height) * 0.006))))
        const bins = new Array(binCount).fill(0)
        for (const q of qs) {
          const index = Math.max(0, Math.min(binCount - 1, Math.floor(((q - qMin) / Math.max(1, qMax - qMin)) * binCount)))
          bins[index] += 1
        }
        const maxBin = Math.max(...bins, 1)
        const threshold = Math.max(2, maxBin * 0.28)
        let groups = 0
        let inGroup = false
        for (const value of bins) {
          if (value >= threshold) {
            if (!inGroup) {
              groups += 1
              inGroup = true
            }
          } else {
            inGroup = false
          }
        }
        const boxWidthPx = maxX - minX + 1
        const boxHeightPx = maxY - minY + 1
        return {
          groups,
          fillRatio: count / Math.max(1, boxWidthPx * boxHeightPx),
          areaRatio: count / Math.max(1, component.count),
          boxWidth: Math.round((boxWidthPx / width) * 100),
          boxHeight: Math.round((boxHeightPx / height) * 100),
        }
      }
      const pointBoxDistance = (point: { x: number; y: number }, box: ReturnType<typeof metrics>) => {
        const left = box.left
        const right = box.left + box.boxWidth
        const top = box.top
        const bottom = box.top + box.boxHeight
        const dx = point.x < left ? left - point.x : point.x > right ? point.x - right : 0
        const dy = point.y < top ? top - point.y : point.y > bottom ? point.y - bottom : 0
        return Math.hypot(dx, dy)
      }
      const componentPixelContact = (aMask: Uint8Array, a: AngleComponent, bMask: Uint8Array, b: AngleComponent) => {
        const radius = Math.max(2, Math.round(Math.max(width, height) * 0.008))
        let activePixels = 0
        let contactPixels = 0
        const minX = Math.max(0, b.minX - radius)
        const minY = Math.max(0, b.minY - radius)
        const maxX = Math.min(width - 1, b.maxX + radius)
        const maxY = Math.min(height - 1, b.maxY + radius)
        for (let y = a.minY; y <= a.maxY; y += 1) {
          for (let x = a.minX; x <= a.maxX; x += 1) {
            const index = y * width + x
            if (!aMask[index]) continue
            activePixels += 1
            if (x < minX || x > maxX || y < minY || y > maxY) continue
            let hasContact = false
            for (let dy = -radius; dy <= radius && !hasContact; dy += 1) {
              const ny = y + dy
              if (ny < b.minY || ny > b.maxY) continue
              for (let dx = -radius; dx <= radius; dx += 1) {
                const nx = x + dx
                if (nx < b.minX || nx > b.maxX) continue
                if (dx * dx + dy * dy > radius * radius) continue
                if (bMask[ny * width + nx]) {
                  hasContact = true
                  break
                }
              }
            }
            if (hasContact) contactPixels += 1
          }
        }
        return {
          contactPixels,
          ratio: activePixels ? contactPixels / activePixels : 0,
        }
      }
      const shoeLimbRelation = (limb: AngleComponent, shoe: AngleComponent) => {
        const limbBox = metrics(limb)
        const shoeBox = metrics(shoe)
        const axis = axisForComponent(masks.blue, limb)
        const contact = componentPixelContact(masks.blue, limb, masks.yellow, shoe)
        const endpointDistances = axis
          ? [pointBoxDistance(axis.start, shoeBox), pointBoxDistance(axis.end, shoeBox)]
          : [100, 100]
        const nearestEndpointDistance = Math.min(...endpointDistances)
        const centerDistance = boxCenterDistance(limb, shoe)
        const broadBoxOverlap = boxOverlapRatio(expandBox(limb, 0.04), expandBox(shoe, 0.04))
        const endpointClose = nearestEndpointDistance <= 7
        const realPixelContact = contact.contactPixels >= 10 && contact.ratio >= 0.0035
        const likelyOnlyBoxOverlap =
          broadBoxOverlap > 0.02 &&
          !realPixelContact &&
          !endpointClose
        const connected =
          !likelyOnlyBoxOverlap &&
          (
            (realPixelContact && centerDistance < 0.24) ||
            (endpointClose && centerDistance < 0.22) ||
            (realPixelContact && endpointClose)
          )
        return {
          connected,
          contactRatio: contact.ratio,
          contactPixels: contact.contactPixels,
          nearestEndpointDistance,
          centerDistance,
          broadBoxOverlap,
          likelyOnlyBoxOverlap,
          limbBox,
          shoeBox,
        }
      }
      type ShoeFirstBinding = {
        shoeIndex: number
        limbIndex: number
        relation: ReturnType<typeof shoeLimbRelation>
        insideRatio: number
        touchesClothing: boolean
        limbBox: ReturnType<typeof metrics>
        shoeBox: ReturnType<typeof metrics>
        role: 'worn' | 'hand-supported' | 'display'
        strength: number
        reason: string
      }
      const computeShoeFirstBindings = (components: AngleComponent[], shoes: AngleComponent[], clothes: AngleComponent[]) => {
        return shoes.map((shoe, shoeIndex): ShoeFirstBinding | null => {
          const shoeBox = metrics(shoe)
          const candidates = components.map((limb, limbIndex) => {
            const relation = shoeLimbRelation(limb, shoe)
            const limbBox = metrics(limb)
            const insideRatio = componentInsideBoxRatio(masks.blue, limb, shoeBox)
            const touchesClothing = touchesAny(limb, clothes, 0.12)
            const axis = axisForComponent(masks.blue, limb)
            const endpointLock = relation.nearestEndpointDistance <= 7
            const realContact = relation.contactPixels >= 20 || relation.contactRatio >= 0.004
            const softContact = relation.contactPixels >= 8 || relation.contactRatio >= 0.0025
            const wornHardEvidence =
              realContact ||
              insideRatio >= 0.08 ||
              (endpointLock && insideRatio > 0.02)
            const broadLimb = componentAreaRatio(limb) > 0.018 || limbBox.boxWidth > 24 || limbBox.boxHeight > 28
            const strength =
              (realContact ? 8 : 0) +
              (softContact && !realContact ? 3 : 0) +
              (endpointLock && wornHardEvidence ? 6 : endpointLock ? 2 : 0) +
              (insideRatio >= 0.18 ? 5 : insideRatio >= 0.08 ? 2 : 0) +
              (touchesClothing && wornHardEvidence ? 3 : touchesClothing ? 1 : 0) +
              (broadLimb ? 2 : 0) -
              (relation.likelyOnlyBoxOverlap ? 8 : 0)
            const handLikeOutside =
              relation.connected &&
              !touchesClothing &&
              insideRatio < 0.08 &&
              componentSizeLabel(limbBox) !== 'large' &&
              limbBox.centerY < shoeBox.centerY + shoeBox.boxHeight * 0.2
            return {
              shoeIndex,
              limbIndex,
              relation,
              insideRatio,
              touchesClothing,
              limbBox,
              shoeBox,
              axis,
              wornHardEvidence,
              softContact,
              strength,
              handLikeOutside,
            }
          }).sort((a, b) => b.strength - a.strength)
          const best = candidates[0]
          if (!best || best.strength < 5 || best.relation.likelyOnlyBoxOverlap) {
            return null
          }
          const handSupportEvidence =
            best.handLikeOutside &&
            (best.softContact || best.relation.nearestEndpointDistance <= 10) &&
            best.insideRatio < 0.08
          if (!best.wornHardEvidence && !handSupportEvidence) {
            return null
          }
          const role: ShoeFirstBinding['role'] =
            handSupportEvidence && !best.wornHardEvidence
              ? 'hand-supported'
              : best.handLikeOutside && best.insideRatio < 0.04
                ? 'hand-supported'
                : 'worn'
          return {
            shoeIndex,
            limbIndex: best.limbIndex,
            relation: best.relation,
            insideRatio: best.insideRatio,
            touchesClothing: best.touchesClothing,
            limbBox: best.limbBox,
            shoeBox: best.shoeBox,
            role,
            strength: best.strength,
            reason: `shoe-first ${role}: pixelContact=${best.relation.contactPixels}, endpointDist=${Math.round(best.relation.nearestEndpointDistance)}, inside=${best.insideRatio.toFixed(2)}, red=${best.touchesClothing ? 'yes' : 'no'}, hardWorn=${best.wornHardEvidence ? 'yes' : 'no'}, handSupport=${handSupportEvidence ? 'yes' : 'no'}, boxOnly=${best.relation.likelyOnlyBoxOverlap ? 'yes' : 'no'}, strength=${best.strength}`,
          }
        })
      }
      const classifyBlueRegions = (components: AngleComponent[], shoes: AngleComponent[], clothes: AngleComponent[], shoeFirstBindings: Array<ShoeFirstBinding | null>): BlueRegionAnalysis[] => {
        const largestBlueArea = Math.max(...components.map((component) => componentAreaRatio(component)), 0)
        return components.map((component, componentIndex) => {
          const box = metrics(component)
          const bboxArea = Math.max(1, (component.maxX - component.minX + 1) * (component.maxY - component.minY + 1))
          const fillRatio = component.count / bboxArea
          const areaRatio = componentAreaRatio(component)
          const axis = axisForComponent(masks.blue, component)
          const connectedShoeIndexes = shoes
            .map((shoe, index) => ({ shoe, index }))
            .filter(({ shoe }) => shoeLimbRelation(component, shoe).connected)
            .map(({ index }) => index)
          const componentBindings: ShoeFirstBinding[] = []
          for (const binding of shoeFirstBindings) {
            if (binding && binding.limbIndex === componentIndex) componentBindings.push(binding)
          }
          const boundAsWornShoes = componentBindings
            .filter((binding) => binding.role === 'worn')
            .map((binding) => binding.shoeIndex)
          const boundAsHandShoes = componentBindings
            .filter((binding) => binding.role === 'hand-supported')
            .map((binding) => binding.shoeIndex)
          const touchesClothing = touchesAny(component, clothes, 0.1)
          const touchesFrameEdge = box.left < 4 || box.top < 4 || box.left + box.boxWidth > 96 || box.top + box.boxHeight > 96
          const xProjection = projectionGroups(masks.blue, component, 'x')
          const yProjection = projectionGroups(masks.blue, component, 'y')
          const fingerLikeBranches = Math.max(xProjection.groups, yProjection.groups)
          const slender = Math.max(box.boxWidth, box.boxHeight) / Math.max(1, Math.min(box.boxWidth, box.boxHeight))
          const largeContinuousLimb = areaRatio > 0.022 || box.boxWidth > 24 || box.boxHeight > 28
          const smallComparedToLargest = largestBlueArea > 0 && areaRatio < largestBlueArea * 0.48
          const compactHandScale = componentSizeLabel(box) !== 'large' || (smallComparedToLargest && box.boxWidth < 26 && box.boxHeight < 28)
          const hasShoeRelationship = connectedShoeIndexes.length > 0
          const shoeBoxes = connectedShoeIndexes.map((index) => metrics(shoes[index]))
          const touchesShoeFromUpperSide = shoeBoxes.some((shoeBox) => box.centerY < shoeBox.centerY - 5 || box.top < shoeBox.top + shoeBox.boxHeight * 0.36)
          const shoeContainsLimbEndpoint = Boolean(axis && shoeBoxes.some((shoeBox) => {
            return pointBoxDistance(axis.start, shoeBox) <= 7 || pointBoxDistance(axis.end, shoeBox) <= 7
          }))
          const startTerminal = terminalShapeStats(masks.blue, component, axis, 'start')
          const endTerminal = terminalShapeStats(masks.blue, component, axis, 'end')
          const shoeNearStart = Boolean(axis && shoeBoxes.some((shoeBox) => pointBoxDistance(axis.start, shoeBox) <= 9))
          const shoeNearEnd = Boolean(axis && shoeBoxes.some((shoeBox) => pointBoxDistance(axis.end, shoeBox) <= 9))
          const shoeTerminal = shoeNearStart ? startTerminal : shoeNearEnd ? endTerminal : endTerminal.areaRatio >= startTerminal.areaRatio ? endTerminal : startTerminal
          const insideAnyShoeRatio = shoeBoxes.reduce((maxRatio, shoeBox) => Math.max(maxRatio, componentInsideBoxRatio(masks.blue, component, shoeBox)), 0)
          const ankleContourLike =
            hasShoeRelationship &&
            (shoeContainsLimbEndpoint || insideAnyShoeRatio >= 0.18) &&
            largeContinuousLimb &&
            slender >= 1.35 &&
            shoeTerminal.groups <= 2 &&
            shoeTerminal.fillRatio >= 0.34 &&
            (shoeTerminal.boxWidth >= 7 || shoeTerminal.boxHeight >= 7)
          const shoeFirstWornLock = boundAsWornShoes.length > 0
          const shoeFirstHandLock = boundAsHandShoes.length > 0 && !shoeFirstWornLock
          const fingerTerminalLike =
            hasShoeRelationship &&
            shoeTerminal.groups >= 2 &&
            shoeTerminal.fillRatio < 0.56 &&
            shoeTerminal.areaRatio < 0.45 &&
            (componentSizeLabel(box) !== 'large' || smallComparedToLargest)
          const fingerContourLike =
            fingerLikeBranches >= 3 ||
            (fingerLikeBranches >= 2 && fillRatio < 0.6 && slender >= 1.2) ||
            fingerTerminalLike
          const footScore =
            (hasShoeRelationship ? 3 : 0) +
            (touchesClothing ? 2 : 0) +
            (largeContinuousLimb ? 3 : 0) +
            (shoeContainsLimbEndpoint ? 2 : 0) +
            (insideAnyShoeRatio >= 0.18 ? 3 : 0) +
            (ankleContourLike ? 8 : 0) +
            (shoeFirstWornLock ? 12 : 0) +
            (touchesFrameEdge && areaRatio > 0.012 ? 1 : 0) +
            (box.centerY >= 45 ? 1 : 0)
          const handScore =
            (hasShoeRelationship ? 2 : 0) +
            (compactHandScale ? 2 : 0) +
            (fingerLikeBranches >= 3 ? 4 : fingerLikeBranches >= 2 ? 2 : 0) +
            (touchesShoeFromUpperSide ? 2 : 0) +
            (fingerContourLike ? 4 : 0) +
            (fingerTerminalLike ? 4 : 0) +
            (shoeFirstHandLock ? 8 : 0) +
            (smallComparedToLargest ? 1 : 0) +
            (!shoeContainsLimbEndpoint ? 1 : 0)
          const bindingDebug = componentBindings
            .map((binding) => `S${binding.shoeIndex + 1}:${binding.reason}`)
            .join(' | ') || 'none'
          const depthRole = hasShoeRelationship
            ? touchesShoeFromUpperSide && handScore > footScore
              ? 'foreground hand/support layer touching shoe'
              : shoeContainsLimbEndpoint || footScore >= handScore
                ? 'body limb under/inside worn shoe layer'
                : 'ambiguous support layer near shoe'
            : touchesClothing
              ? 'body limb connected under clothing layer'
              : 'isolated minor detail layer'
          const handLike =
            hasShoeRelationship &&
            !shoeFirstWornLock &&
            !ankleContourLike &&
            (compactHandScale || fingerContourLike) &&
            (
              fingerTerminalLike ||
              fingerContourLike ||
              (fingerLikeBranches >= 3 && fillRatio < 0.62 && areaRatio < 0.08) ||
              (fingerLikeBranches >= 2 && slender > 1.25 && fillRatio < 0.66 && touchesShoeFromUpperSide) ||
              (touchesClothing && smallComparedToLargest && touchesShoeFromUpperSide && !shoeContainsLimbEndpoint)
            )
          const legFootLike =
            shoeFirstWornLock ||
            ankleContourLike ||
            (touchesClothing && largeContinuousLimb && !handLike) ||
            (
              hasShoeRelationship &&
              largeContinuousLimb &&
              !handLike
            ) ||
            (
              touchesFrameEdge &&
              hasShoeRelationship &&
              areaRatio > 0.012 &&
              !handLike
            )
          if (areaRatio < 0.004 && !hasShoeRelationship && !touchesClothing) {
            return {
              component,
              kind: 'detail',
              confidence: 'medium',
              connectedShoeIndexes,
              handScore,
              footScore,
              depthRole,
              debug: `shoeFirst=${bindingDebug}`,
              reason: 'small isolated blue fragment; merge into nearest body detail and do not generate a separate limb',
            }
          }
          if (handLike) {
            return {
              component,
              kind: 'hand',
              confidence: fingerLikeBranches >= 3 ? 'high' : 'medium',
              connectedShoeIndexes,
              handScore,
              footScore,
              depthRole,
              debug: `shoeFirst=${bindingDebug}`,
              reason: `hand/wrist candidate wins: handScore ${handScore}, footScore ${footScore}, compact ${componentSizeLabel(box)} blue shape, finger-like branch count ${fingerLikeBranches}, terminal finger groups ${shoeTerminal.groups}, fill ${fillRatio.toFixed(2)}, near shoe S${connectedShoeIndexes.map((index) => index + 1).join('/S')}; generate as hand holding/supporting shoe, not as a leg`,
            }
          }
          if (legFootLike) {
            return {
              component,
              kind: 'leg-foot',
              confidence: touchesClothing || largeContinuousLimb ? 'high' : 'medium',
              connectedShoeIndexes,
              handScore,
              footScore,
              depthRole,
              debug: `shoeFirst=${bindingDebug}`,
              reason: `leg/foot/ankle candidate wins: handScore ${handScore}, footScore ${footScore}; ${touchesClothing ? 'connected to clothing, ' : ''}${hasShoeRelationship ? 'connected to shoe placement, ' : ''}${ankleContourLike ? 'ankle/instep continuous contour, ' : ''}large continuous limb ${largeContinuousLimb ? 'yes' : 'no'}; generate as visible leg/foot structure`,
            }
          }
          return {
            component,
            kind: hasShoeRelationship ? 'hand' : 'detail',
            confidence: 'low',
            connectedShoeIndexes,
            handScore,
            footScore,
            depthRole,
            debug: `shoeFirst=${bindingDebug}`,
            reason: hasShoeRelationship
              ? `ambiguous blue region near a shoe but not clothing; handScore ${handScore}, footScore ${footScore}; treat conservatively as hand/support detail, not an extra leg`
              : `ambiguous blue region; handScore ${handScore}, footScore ${footScore}; keep as minor body detail and do not create an extra leg`,
          }
        })
      }
      const splitMergedShoeByBlueFootAnchors = (component: AngleComponent) => {
        const footAnchors = blueComponents
          .map((limb) => {
            const contact = componentPixelContact(masks.blue, limb, masks.yellow, component)
            const overlap = boxOverlapRatio(expandBox(limb, 0.05), expandBox(component, 0.04))
            const limbBox = metrics(limb)
            const shoeBox = metrics(component)
            const lowerLimbNearShoe = limbBox.centerY < shoeBox.centerY + shoeBox.boxHeight * 0.45 && limbBox.centerY > shoeBox.top - 28
            return { limb, contact, overlap, limbBox, lowerLimbNearShoe }
          })
          .filter(({ contact, overlap, lowerLimbNearShoe }) =>
            lowerLimbNearShoe &&
            (contact.contactPixels >= 8 || contact.ratio >= 0.0025 || overlap > 0.025),
          )
          .sort((a, b) => a.limbBox.centerX - b.limbBox.centerX)
        if (footAnchors.length < 2) return [component]

        const boxWidth = component.maxX - component.minX + 1
        const boxHeight = component.maxY - component.minY + 1
        const wideEnoughForPair = boxWidth > width * 0.26 && boxHeight > height * 0.08
        const anchorSpread = footAnchors[footAnchors.length - 1].limbBox.centerX - footAnchors[0].limbBox.centerX
        if (!wideEnoughForPair || anchorSpread < 16) return [component]

        const splitXs = footAnchors.slice(0, -1).map((anchor, index) => {
          const next = footAnchors[index + 1]
          return Math.round(((anchor.limbBox.centerX + next.limbBox.centerX) / 2 / 100) * width)
        })
        const parts = footAnchors.map((_, anchorIndex) => {
          const leftLimit = anchorIndex === 0 ? component.minX : Math.max(component.minX, splitXs[anchorIndex - 1] + 1)
          const rightLimit = anchorIndex === splitXs.length ? component.maxX : Math.min(component.maxX, splitXs[anchorIndex])
          let minX = width
          let minY = height
          let maxX = 0
          let maxY = 0
          let count = 0
          for (let y = component.minY; y <= component.maxY; y += 1) {
            for (let x = leftLimit; x <= rightLimit; x += 1) {
              const index = y * width + x
              if (!masks.yellow[index]) continue
              minX = Math.min(minX, x)
              minY = Math.min(minY, y)
              maxX = Math.max(maxX, x)
              maxY = Math.max(maxY, y)
              count += 1
            }
          }
          return count > width * height * 0.0025 ? { minX, minY, maxX, maxY, count } : null
        }).filter(Boolean) as AngleComponent[]
        return parts.length >= 2 ? parts : [component]
      }
      const drawCoordinateGrid = (ctx: CanvasRenderingContext2D) => {
        ctx.save()
        ctx.strokeStyle = 'rgba(255,255,255,0.28)'
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.lineWidth = Math.max(1, Math.round(Math.max(width, height) * 0.002))
        ctx.font = `bold ${Math.max(12, Math.round(width * 0.022))}px Arial`
        ;[0, 25, 50, 75, 100].forEach((value) => {
          const x = Math.round((value / 100) * width)
          const y = Math.round((value / 100) * height)
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, height)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(width, y)
          ctx.stroke()
          ctx.fillText(`X${value}`, Math.min(width - 42, x + 4), 4)
          ctx.fillText(`Y${value}`, 4, Math.min(height - 20, y + 4))
        })
        ctx.restore()
      }
      const inferCameraView = (shoes: AngleComponent[], limbs: AngleComponent[], clothes: AngleComponent[]) => {
        const shoeBoxes = shoes.map(metrics)
        const limbBoxes = limbs.map(metrics)
        const clothingBoxes = clothes.map(metrics)
        const bodyOrigin = weightedCenter(clothes.length ? clothes : [...limbs, ...clothes])
        const limbTarget = weightedCenter(limbs)
        const shoeTarget = weightedCenter(shoes)
        const dx = bodyOrigin && shoeTarget ? shoeTarget.x - bodyOrigin.x : 0
        const dy = bodyOrigin && shoeTarget ? shoeTarget.y - bodyOrigin.y : 0
        const extensionDirection = directionFromDelta(dx, dy)
        const bodyOriginLabel = bodyOrigin ? pointLabel(bodyOrigin.x, bodyOrigin.y) : 'unknown'
        const limbTargetLabel = limbTarget ? pointLabel(limbTarget.x, limbTarget.y) : 'unknown'
        const shoeTargetLabel = shoeTarget ? pointLabel(shoeTarget.x, shoeTarget.y) : 'unknown'
        const vectorLength = Math.round(Math.sqrt(dx * dx + dy * dy))
        const largeShoePresence = shoeBoxes.some((box) => box.boxWidth >= 18 || box.boxHeight >= 18)
        const bodyAtFrameEdge = [...limbBoxes, ...clothingBoxes].some((box) => box.left < 8 || box.top < 8 || box.left + box.boxWidth > 92 || box.top + box.boxHeight > 92)
        const diagonalPose = Math.abs(dx) >= 10 && Math.abs(dy) >= 8
        const verticalStanding = Math.abs(dx) < 14 && dy > 12
        const bodyToShoesFromEdge = bodyOrigin && shoeTarget && bodyOrigin.x > 58 && bodyOrigin.y > 38 && shoeTarget.x < bodyOrigin.x - 10
        const edgeBodyToLeftShoes = bodyOrigin && shoeTarget && bodyOrigin.x > 70 && shoeTarget.x < bodyOrigin.x - 18
        const strongDownwardPose = largeShoePresence && (diagonalPose || bodyAtFrameEdge || bodyToShoesFromEdge || edgeBodyToLeftShoes)
        const cameraLabel = strongDownwardPose
          ? 'top-down / downward high-angle view, like looking down at legs and shoes'
          : verticalStanding
            ? 'standing lower-body front or three-quarter coordinate view'
            : 'coordinate-preserved angle-reference view'
        const instruction = [
          `Coordinate inference by code: body/clothing origin is ${bodyOriginLabel}${bodyOrigin ? ` at (${bodyOrigin.x}%, ${bodyOrigin.y}%)` : ''}; limb center is ${limbTargetLabel}${limbTarget ? ` at (${limbTarget.x}%, ${limbTarget.y}%)` : ''}; shoe target is ${shoeTargetLabel}${shoeTarget ? ` at (${shoeTarget.x}%, ${shoeTarget.y}%)` : ''}; extension vector from body to shoes is dx=${dx}, dy=${dy}, direction=${extensionDirection}, length=${vectorLength}.`,
          `Camera inference by code: ${cameraLabel}. Preserve this computed body-origin-to-shoe-target direction and camera relationship from the uploaded angle reference.`,
          strongDownwardPose ? 'This must be treated as a downward-looking composition, not an eye-level standing product shot.' : '',
          `Generated body/clothing must stay near the computed body origin (${bodyOriginLabel}); generated legs/shoes must extend toward ${extensionDirection}; do not recenter, flip, rotate, straighten into a generic vertical standing pose, or replace with an eye-level view unless the computed direction is vertical standing.`,
        ].join(' ')
        return {
          label: `${cameraLabel}; body ${bodyOriginLabel} to shoes ${shoeTargetLabel}; direction ${extensionDirection}`,
          instruction,
          bodyOrigin,
          shoeTarget,
          extensionDirection,
          strongDownwardPose,
        }
      }
      const drawMaskOutline = (ctx: CanvasRenderingContext2D, mask: Uint8Array, components: AngleComponent[], strokeStyle: string, lineWidthRatio = 0.004) => {
        const imageData = ctx.createImageData(width, height)
        const data = imageData.data
        for (const component of components) {
          for (let y = component.minY; y <= component.maxY; y += 1) {
            for (let x = component.minX; x <= component.maxX; x += 1) {
              const index = y * width + x
              if (!mask[index]) continue
              const offset = index * 4
              data[offset] = 255
              data[offset + 1] = 255
              data[offset + 2] = 255
              data[offset + 3] = 230
            }
          }
        }
        const tmp = document.createElement('canvas')
        tmp.width = width
        tmp.height = height
        const tmpCtx = tmp.getContext('2d')
        if (!tmpCtx) return
        tmpCtx.putImageData(imageData, 0, 0)
        ctx.save()
        ctx.globalAlpha = 0.24
        ctx.drawImage(tmp, 0, 0)
        ctx.globalAlpha = 1
        ctx.strokeStyle = strokeStyle
        ctx.lineWidth = Math.max(2, Math.round(Math.max(width, height) * lineWidthRatio))
        ctx.setLineDash([])
        for (const component of components) {
          const box = expandBox(component, 0.018)
          ctx.strokeRect(box.minX, box.minY, box.maxX - box.minX + 1, box.maxY - box.minY + 1)
        }
        ctx.restore()
      }
      const rawBlueComponents = mergeNearby(findComponents(masks.blue, 0.0012), 0.045).slice(0, 8)
      let blueComponents = rawBlueComponents
      const redComponents = mergeNearby(findComponents(masks.red, 0.002), 0.12).slice(0, 4)
      const rawYellowComponents = findComponents(masks.yellow, 0.0012)
      const yellowComponents = dedupeShoes(
        mergeShoeFragments(rawYellowComponents).flatMap(splitMergedShoeByBlueFootAnchors),
      ).slice(0, 6)
      const splitCrossedBlueLegs = (component: AngleComponent): AngleComponent[] => {
        const box = metrics(component)
        const areaRatio = componentAreaRatio(component)
        const nearbyShoes = yellowComponents
          .map((shoe, index) => {
            const shoeBox = metrics(shoe)
            const relation = shoeLimbRelation(component, shoe)
            const overlap = boxOverlapRatio(expandBox(component, 0.04), expandBox(shoe, 0.04))
            return { shoe, index, shoeBox, relation, overlap }
          })
          .filter(({ relation, overlap }) => relation.connected || overlap > 0.02 || relation.nearestEndpointDistance <= 12)
          .sort((a, b) => a.shoeBox.centerX - b.shoeBox.centerX)
        const likelyCrossedLegMass =
          nearbyShoes.length >= 2 &&
          areaRatio > 0.025 &&
          box.boxWidth >= 24 &&
          box.boxHeight >= 30
        if (!likelyCrossedLegMass) return [component]

        const anchors = nearbyShoes.slice(0, 3).map(({ shoeBox }) => ({ x: shoeBox.centerX, y: shoeBox.centerY }))
        if (anchors.length < 2) return [component]
        const assigned = anchors.map(() => ({
          minX: width,
          minY: height,
          maxX: 0,
          maxY: 0,
          count: 0,
        }))
        for (let y = component.minY; y <= component.maxY; y += 1) {
          for (let x = component.minX; x <= component.maxX; x += 1) {
            const index = y * width + x
            if (!masks.blue[index]) continue
            const px = (x / width) * 100
            const py = (y / height) * 100
            let bestIndex = 0
            let bestDistance = Number.POSITIVE_INFINITY
            anchors.forEach((anchor, anchorIndex) => {
              const distance = Math.hypot(px - anchor.x, py - anchor.y)
              if (distance < bestDistance) {
                bestDistance = distance
                bestIndex = anchorIndex
              }
            })
            const target = assigned[bestIndex]
            target.minX = Math.min(target.minX, x)
            target.minY = Math.min(target.minY, y)
            target.maxX = Math.max(target.maxX, x)
            target.maxY = Math.max(target.maxY, y)
            target.count += 1
          }
        }
        const minPartArea = width * height * 0.006
        const parts = assigned
          .filter((part) => part.count >= minPartArea)
          .map((part) => ({ minX: part.minX, minY: part.minY, maxX: part.maxX, maxY: part.maxY, count: part.count }))
        return parts.length >= 2 ? parts : [component]
      }
      blueComponents = rawBlueComponents.flatMap(splitCrossedBlueLegs).slice(0, 10)
      const crossedLegSplitApplied = blueComponents.length > rawBlueComponents.length
      const cameraInference = inferCameraView(yellowComponents, blueComponents, redComponents)
      const shoeFirstBindings = computeShoeFirstBindings(blueComponents, yellowComponents, redComponents)
      const blueRegionAnalysis = classifyBlueRegions(blueComponents, yellowComponents, redComponents, shoeFirstBindings)
      const legFootRegions = blueRegionAnalysis.filter((region) => region.kind === 'leg-foot')
      const handRegions = blueRegionAnalysis.filter((region) => region.kind === 'hand')
      const detailRegions = blueRegionAnalysis.filter((region) => region.kind === 'detail')
      const shoeConnectedToKind = (shoeIndex: number, kind: BlueRegionKind) => blueRegionAnalysis.some((region) => region.kind === kind && region.connectedShoeIndexes.includes(shoeIndex))
      const shoeHasStrongFootBinding = (shoeIndex: number) => {
        const shoe = yellowComponents[shoeIndex]
        if (!shoe) return false
        const binding = shoeFirstBindings[shoeIndex]
        if (binding?.role === 'worn') return true
        return blueComponents.some((limb) => {
          const relation = shoeLimbRelation(limb, shoe)
          const limbAnalysis = blueRegionAnalysis.find((region) => region.component === limb)
          return relation.connected &&
            limbAnalysis?.kind === 'leg-foot' &&
            (relation.nearestEndpointDistance <= 6 || relation.contactRatio >= 0.006)
        })
      }
      const wornShoeIndexes = yellowComponents
        .map((_, index) => index)
        .filter((index) => shoeFirstBindings[index]?.role === 'worn' || (shoeConnectedToKind(index, 'leg-foot') && shoeHasStrongFootBinding(index)))
      const handHeldShoeIndexes = yellowComponents
        .map((_, index) => index)
        .filter((index) => !wornShoeIndexes.includes(index) && (shoeFirstBindings[index]?.role === 'hand-supported' || shoeConnectedToKind(index, 'hand')))
      const displayShoeIndexes = yellowComponents
        .map((_, index) => index)
        .filter((index) => !wornShoeIndexes.includes(index) && !handHeldShoeIndexes.includes(index))
      const shoeInstanceCountFor = (shoeIndex: number) => {
        const shoe = yellowComponents[shoeIndex]
        const box = metrics(shoe)
        const nestedRawParts = rawYellowComponents.filter((component) => {
          if (componentAreaRatio(component) < 0.0022 && boxAreaRatio(component) < 0.018) return false
          return boxOverlapRatio(expandBox(component, 0.025), expandBox(shoe, 0.015)) > 0.62 ||
            boxesOverlap(expandBox(component, 0.04), expandBox(shoe, 0.01))
        })
        const separatedPartCount = dedupeShoes(nestedRawParts)
          .filter((component) => componentAreaRatio(component) > 0.004 || boxAreaRatio(component) > 0.026)
          .length
        const connectedLegs = blueRegionAnalysis.filter((region) => region.kind === 'leg-foot' && region.connectedShoeIndexes.includes(shoeIndex)).length
        const largePairBox =
          box.boxWidth >= 34 &&
          box.boxHeight >= 24 &&
          componentAreaRatio(shoe) > 0.025
        const veryWideDisplay =
          displayShoeIndexes.includes(shoeIndex) &&
          box.boxWidth >= 30 &&
          box.boxHeight >= 18
        const wornPairBox =
          wornShoeIndexes.includes(shoeIndex) &&
          (connectedLegs >= 2 || (largePairBox && box.boxWidth >= 38 && box.boxHeight >= 32))
        const inferred = Math.max(
          1,
          separatedPartCount,
          veryWideDisplay || wornPairBox ? 2 : 1,
        )
        return Math.min(2, inferred)
      }
      const shoeInstanceCounts = yellowComponents.map((_, index) => shoeInstanceCountFor(index))
      const roleInstanceCount = (indexes: number[]) => indexes.reduce((sum, index) => sum + (shoeInstanceCounts[index] || 1), 0)
      const mainShoeInstanceCount = shoeInstanceCounts.reduce((sum, count) => sum + count, 0)
      const wornShoeInstanceCount = roleInstanceCount(wornShoeIndexes)
      const handHeldShoeInstanceCount = roleInstanceCount(handHeldShoeIndexes)
      const displayShoeInstanceCount = roleInstanceCount(displayShoeIndexes)
      const shoeInstanceSuffix = (index: number) => {
        const count = shoeInstanceCounts[index] || 1
        return count > 1 ? ` x${count}` : ''
      }
      const shoeRoleList = (indexes: number[]) => indexes.length
        ? indexes.map((index) => `S${index + 1}${shoeInstanceSuffix(index)}`).join(', ')
        : 'none'
      const layerOrder = [
        redComponents.length ? 'Layer 1 clothing/red regions are the front garment or body-cover layer; they may cover blue limbs.' : '',
        blueComponents.length ? 'Layer 2 blue regions are body/limb structure behind clothing and connected to shoes or hands; use skeleton/candidate scores to split hands from feet.' : '',
        yellowComponents.length ? 'Layer 3 yellow S regions are shoe placement/angle objects over or around blue limbs; shoe appearance still comes only from product image.' : '',
        'Layer 4 black/empty regions are background/environment only.',
      ].filter(Boolean)
      const depthLayerMap = [
        'DEPTH LAYER MAP BY CODE:',
        ...layerOrder,
        'Depth rule: use this layer map only for occlusion, object order, and angle/depth interpretation. Do not use it for lighting, shadows, color, texture, or photographic style.',
      ].join('\n')
      const clothingRegionMap = [
        'CLOTHING REGION MAP BY CODE:',
        redComponents.length
          ? `redClothingRegionCount = ${redComponents.length}`
          : 'redClothingRegionCount = 0',
        ...redComponents.map((component, index) => {
          const box = metrics(component)
          const axis = axisForComponent(masks.red, component)
          const axisText = axis ? `axis (${axis.start.x}%,${axis.start.y}%) -> (${axis.end.x}%,${axis.end.y}%), direction ${axis.direction}` : 'axis unknown'
          const connectedBlue = blueRegionAnalysis
            .map((region, regionIndex) => ({ region, regionIndex }))
            .filter(({ region }) => touchesAny(component, [region.component], 0.08))
            .map(({ regionIndex }) => `B${regionIndex + 1}`)
          return `R${index + 1}: role=secondary-clothing-only, bbox left ${box.left}%, top ${box.top}%, width ${box.boxWidth}%, height ${box.boxHeight}%, center (${box.centerX}%,${box.centerY}%), ${axisText}, connectedBody=${connectedBlue.length ? connectedBlue.join('/') : 'none'}`
        }),
        'Clothing rule: red regions are only lower-body outfit support from the model reference. They define clothing placement/crop/occlusion around legs and shoes, not upper-body framing. Keep clothing secondary and keep the camera focused on product shoes.',
      ].join('\n')
      const skeletonMap = [
        'SKELETON MAP BY CODE:',
        ...blueRegionAnalysis.map((region, index) => {
          const box = metrics(region.component)
          const axis = axisForComponent(masks.blue, region.component)
          const axisText = axis ? `axis (${axis.start.x}%,${axis.start.y}%) -> (${axis.end.x}%,${axis.end.y}%), direction ${axis.direction}` : 'axis unknown'
          return `Skeleton B${index + 1}: role=${region.kind}, ${axisText}, center (${box.centerX}%,${box.centerY}%), depthRole=${region.depthRole}`
        }),
      ].join('\n')
      const candidateMap = [
        'HAND FOOT CANDIDATES BY CODE:',
        ...blueRegionAnalysis.map((region, index) => {
          const box = metrics(region.component)
          return `Candidate B${index + 1}: final=${region.kind}, confidence=${region.confidence}, handScore=${region.handScore}, footScore=${region.footScore}, center (${box.centerX}%,${box.centerY}%), connectedShoes=${region.connectedShoeIndexes.length ? region.connectedShoeIndexes.map((shoeIndex) => `S${shoeIndex + 1}`).join('/') : 'none'}, debug=${region.debug}`
        }),
      ].join('\n')
      const inferPoseType = () => {
        const body = cameraInference.bodyOrigin
        const shoe = cameraInference.shoeTarget
        const hasHandheld = handHeldShoeIndexes.length > 0 || handRegions.length > 0
        const bodyAtRightEdge = Boolean(body && body.x >= 74)
        const bodyAtTop = Boolean(body && body.y <= 32)
        const shoesLeftOfBody = Boolean(body && shoe && shoe.x < body.x - 14)
        const singleWornWithDisplay = wornShoeIndexes.length === 1 && (displayShoeIndexes.length > 0 || handHeldShoeIndexes.length > 0)
        if (bodyAtRightEdge && shoesLeftOfBody && !hasHandheld) return 'standing first-person downward POV'
        if (bodyAtRightEdge && shoesLeftOfBody && singleWornWithDisplay) return 'standing first-person downward POV with one worn shoe and one display shoe'
        if (hasHandheld && bodyAtTop) return 'seated or supported downward try-on pose with hand-held shoe'
        if (hasHandheld) return 'try-on product display pose with hand-held/supporting shoe'
        if (wornShoeIndexes.length === 1) return 'single-foot worn product pose'
        if (wornShoeIndexes.length >= 2 && cameraInference.strongDownwardPose) return 'two-foot downward worn-shoe pose'
        if (wornShoeIndexes.length >= 2) return 'two-foot worn-shoe pose'
        return 'display-shoe composition with no confirmed worn foot'
      }
      const poseType = inferPoseType()
      const footSideForShoe = (shoeIndex: number) => {
        if (!wornShoeIndexes.includes(shoeIndex)) return ''
        const worn = wornShoeIndexes.map((index) => ({ index, box: metrics(yellowComponents[index]) }))
        const ordered = worn.slice().sort((a, b) => {
          const xDelta = a.box.centerX - b.box.centerX
          if (Math.abs(xDelta) > 8) return xDelta
          return a.box.centerY - b.box.centerY
        })
        if (ordered.length === 1) {
          const box = ordered[0].box
          const body = cameraInference.bodyOrigin
          if (body && Math.abs(box.centerX - body.x) > 8) {
            return box.centerX < body.x ? 'outer/left-side foot by layout inference' : 'outer/right-side foot by layout inference'
          }
          return 'single visible foot; preserve the exact foot side and shoe orientation from the angle reference'
        }
        const position = ordered.findIndex((item) => item.index === shoeIndex)
        if (position < 0) return ''
        return position % 2 === 0 ? 'left foot of the visible pair' : 'right foot of the visible pair'
      }
      const wornPairDirectionLock = wornShoeIndexes.length >= 2
        ? 'LEFT/RIGHT WORN-SHOE PAIR LOCK: multiple worn shoes are visible. They must be rendered as a natural left-foot/right-foot pair, not two duplicated shoes from the same side. Keep each shoe on its assigned foot side and preserve its own toe/heel axis from the mask; do not copy one worn shoe direction onto the other, do not make both shoes identical same-side orientation, and do not swap left and right feet.'
        : wornShoeIndexes.length === 1
          ? 'SINGLE VISIBLE FOOT LOCK: only one worn shoe/foot is visible. Do not invent a second worn foot; preserve the exact single-foot side, toe direction, heel direction, and shoe orientation from the angle reference.'
          : ''
      const wornPairMap = wornShoeIndexes.length
        ? 'Worn shoe foot-side map: ' + wornShoeIndexes.map((shoeIndex) => {
            const box = metrics(yellowComponents[shoeIndex])
            return `S${shoeIndex + 1} = ${footSideForShoe(shoeIndex)} at center (${box.centerX}%, ${box.centerY}%)`
          }).join('; ') + '.'
        : ''
      const shoeLimbBindings = [
        'SHOE LIMB BINDINGS BY CODE:',
        ...yellowComponents.map((_, index) => {
          const boundLeg = blueRegionAnalysis
            .map((region, regionIndex) => ({ region, regionIndex }))
            .filter(({ region }) => region.kind === 'leg-foot' && region.connectedShoeIndexes.includes(index))
            .map(({ regionIndex }) => `B${regionIndex + 1}`)
          const boundHand = blueRegionAnalysis
            .map((region, regionIndex) => ({ region, regionIndex }))
            .filter(({ region }) => region.kind === 'hand' && region.connectedShoeIndexes.includes(index))
            .map(({ regionIndex }) => `B${regionIndex + 1}`)
          const role = wornShoeIndexes.includes(index)
            ? 'worn-on-foot'
            : handHeldShoeIndexes.includes(index)
              ? 'hand-supported-display'
              : 'standalone-display'
          const shoeFirst = shoeFirstBindings[index]
          const relationDetails = blueComponents
            .map((limb, limbIndex) => ({ relation: shoeLimbRelation(limb, yellowComponents[index]), limbIndex }))
            .filter(({ relation }) => relation.broadBoxOverlap > 0.015 || relation.contactPixels > 0 || relation.nearestEndpointDistance <= 10)
            .map(({ relation, limbIndex }) => `B${limbIndex + 1}:pixelContact=${relation.contactPixels},endpointDist=${Math.round(relation.nearestEndpointDistance)},boxOnly=${relation.likelyOnlyBoxOverlap ? 'yes' : 'no'}`)
            .join('; ')
          return `Binding S${index + 1}${shoeInstanceSuffix(index)}: role=${role}, representedShoeCount=${shoeInstanceCounts[index] || 1}, legFoot=${boundLeg.length ? boundLeg.join('/') : 'none'}, hand=${boundHand.length ? boundHand.join('/') : 'none'}, footSide=${footSideForShoe(index) || 'none'}${relationDetails ? `, relationCheck=${relationDetails}` : ''}, shoeFirst=${shoeFirst ? shoeFirst.reason : 'display/no strong blue binding'}`
        }),
        'Binding rule: box overlap or foreground occlusion alone is not worn-on-foot. A shoe is WORN only when a blue foot/ankle endpoint or real blue-yellow pixel contact binds to that shoe; otherwise overlapping shoes remain DISPLAY shoes.',
      ].join('\n')
      const structuredPoseSchema = [
        'STRUCTURED ANGLE SCHEMA BY CODE:',
        `poseType = ${poseType}`,
        `mainShoeCount = ${mainShoeInstanceCount}`,
        `shoeObjectCount = ${yellowComponents.length}`,
        `wornShoeCount = ${wornShoeInstanceCount}`,
        `handheldOrHandSupportedShoeCount = ${handHeldShoeInstanceCount}`,
        `standaloneDisplayShoeCount = ${displayShoeInstanceCount}`,
        `blueLegFootRegionCount = ${legFootRegions.length}`,
        `blueHandRegionCount = ${handRegions.length}`,
        `redClothingRegionCount = ${redComponents.length}`,
        `cameraView = ${cameraInference.label}`,
        'cropFocus = product-shoe close crop; show only shoes, feet, lower legs, hands if detected, and required clothing hem/partial lower garment; no head, face, portrait, torso, or full upper body',
        `wornShoes = ${shoeRoleList(wornShoeIndexes)}`,
        `handheldOrHandSupportedShoes = ${shoeRoleList(handHeldShoeIndexes)}`,
        `standaloneDisplayShoes = ${shoeRoleList(displayShoeIndexes)}`,
        'This schema overrides any generic fashion-photo wording. The final image must match these counts and roles.',
      ].join('\n')
      const controlCanvas = document.createElement('canvas')
      controlCanvas.width = width
      controlCanvas.height = height
      const control = controlCanvas.getContext('2d')
      if (!control) return null
      control.fillStyle = '#050505'
      control.fillRect(0, 0, width, height)
      drawCoordinateGrid(control)
      drawMaskOutline(control, masks.red, redComponents, '#b8b8b8', 0.003)
      drawMaskOutline(control, masks.blue, blueComponents, '#d8d8d8', 0.004)
      drawMaskOutline(control, masks.yellow, yellowComponents, '#ffffff', 0.005)
      control.fillStyle = '#ffffff'
      control.font = `bold ${Math.max(16, Math.round(width * 0.028))}px Arial`
      control.textBaseline = 'top'
      const drawSafeControlLabel = (text: string, rawX: number, rawY: number) => {
        const metrics = control.measureText(text)
        const labelWidth = Math.ceil(metrics.width)
        const fontHeightMatch = String(control.font).match(/(\d+(?:\.\d+)?)px/i)
        const fontHeight = fontHeightMatch ? Number(fontHeightMatch[1]) : Math.max(14, Math.round(width * 0.022))
        const x = Math.min(Math.max(6, rawX), Math.max(6, width - labelWidth - 8))
        const y = Math.min(Math.max(6, rawY), Math.max(6, height - fontHeight - 8))
        control.fillText(text, x, y)
      }
      yellowComponents.forEach((component, index) => {
        const connectedToLegFoot = shoeConnectedToKind(index, 'leg-foot')
        const connectedToHand = shoeConnectedToKind(index, 'hand')
        const label = connectedToLegFoot
          ? `S${index + 1} WORN${shoeInstanceSuffix(index)}`
          : connectedToHand
            ? `S${index + 1} HAND${shoeInstanceSuffix(index)}`
            : `S${index + 1} DISPLAY${shoeInstanceSuffix(index)}`
        drawSafeControlLabel(label, component.minX + 8, component.minY + 8)
      })
      control.font = `bold ${Math.max(13, Math.round(width * 0.02))}px Arial`
      blueRegionAnalysis.forEach((region, index) => {
        const label = region.kind === 'leg-foot'
          ? `B${index + 1} FOOT`
          : region.kind === 'hand'
            ? `B${index + 1} HAND`
            : `B${index + 1} DETAIL`
        drawSafeControlLabel(label, region.component.minX + 8, region.component.minY + 8)
      })
      redComponents.forEach((component, index) => {
        drawSafeControlLabel(`R${index + 1} CLOTHING`, component.minX + 8, component.minY + 8)
      })
      const blob = await canvasToBlob(controlCanvas, 'image/png')
      if (!blob) return null
      const fileName = file.name.replace(/\.[^.]+$/, '') || 'uploaded-angle'
      const controlFile = new File([blob], `${fileName}-clean-control.png`, { type: 'image/png' })
      const shoeLines = yellowComponents.map((component, index) => {
        const box = metrics(component)
        const axis = axisForComponent(masks.yellow, component)
        const orientation = box.boxWidth >= box.boxHeight * 1.15 ? 'mostly horizontal / side-view' : box.boxHeight >= box.boxWidth * 1.15 ? 'mostly vertical / front-back' : 'diagonal or three-quarter'
        const connectedToLegFoot = shoeConnectedToKind(index, 'leg-foot')
        const connectedToHand = shoeConnectedToKind(index, 'hand')
        const status = connectedToLegFoot
          ? 'WORN SHOE connected to a blue leg/foot/ankle region'
          : connectedToHand
            ? 'HANDHELD / HAND-SUPPORTED DISPLAY SHOE connected to a blue hand/finger region, not worn on a foot'
            : 'DISPLAY SHOE with no foot or leg inside it'
        const footSide = connectedToLegFoot ? footSideForShoe(index) : ''
        const body = cameraInference.bodyOrigin
        const toeHeel = axis && body
          ? (() => {
              const startDistance = Math.hypot(axis.start.x - body.x, axis.start.y - body.y)
              const endDistance = Math.hypot(axis.end.x - body.x, axis.end.y - body.y)
              const heel = startDistance <= endDistance ? axis.start : axis.end
              const toe = startDistance <= endDistance ? axis.end : axis.start
              return ` Code-inferred shoe axis: heel/body-side endpoint near (${heel.x}%, ${heel.y}%), toe/front endpoint toward (${toe.x}%, ${toe.y}%), toe direction ${directionFromDelta(toe.x - heel.x, toe.y - heel.y)}. Preserve this toe/heel direction and do not reverse the shoe.`
            })()
          : axis
            ? ` Code-inferred shoe axis endpoint A (${axis.start.x}%, ${axis.start.y}%) to endpoint B (${axis.end.x}%, ${axis.end.y}%), axis direction ${axis.direction}; preserve this shoe rotation.`
            : ''
        return `S${index + 1}${shoeInstanceSuffix(index)}: ${status}; representedShoeCount=${shoeInstanceCounts[index] || 1}${footSide ? `; foot-side inference: ${footSide}` : ''}; bbox left ${box.left}%, top ${box.top}%, width ${box.boxWidth}%, height ${box.boxHeight}%, center (${box.centerX}%, ${box.centerY}%), orientation ${orientation}.${toeHeel} If representedShoeCount is 2, generate two matching product shoes inside this S object while preserving this same layout region and role. If this is one of multiple WORN SHOES, it must remain the matching left/right foot counterpart indicated above and must not duplicate the other worn shoe direction. If DISPLAY or HANDHELD shoe, generate only the product shoe(s) at this coordinate and do not add a foot, ankle, leg, or body limb to wear it; if hand-supported, the hand may touch/support the shoe but must not become a foot.`
      })
      const limbLines = blueRegionAnalysis.map((region, index) => {
        const component = region.component
        const box = metrics(component)
        const axis = axisForComponent(masks.blue, component)
        const role = region.kind === 'leg-foot'
          ? 'LEG/FOOT/ANKLE'
          : region.kind === 'hand'
            ? 'HAND/HANDWRIST/FINGER'
            : 'MINOR BLUE DETAIL'
        const axisText = axis ? ` Main axis runs from (${axis.start.x}%, ${axis.start.y}%) to (${axis.end.x}%, ${axis.end.y}%), direction ${axis.direction}; preserve this object direction and bend.` : ''
        const shoeText = region.connectedShoeIndexes.length ? ` Connected shoe objects: ${region.connectedShoeIndexes.map((shoeIndex) => `S${shoeIndex + 1}`).join(', ')}.` : ''
        const footSideText = region.kind === 'leg-foot' && region.connectedShoeIndexes.length
          ? ` Foot-side binding: ${region.connectedShoeIndexes.map((shoeIndex) => `S${shoeIndex + 1} = ${footSideForShoe(shoeIndex) || 'preserve visible foot side from mask'}`).join('; ')}.`
          : ''
        const actionText = region.kind === 'leg-foot'
          ? 'Generate this region as natural female leg/foot/ankle anatomy; if connected to a shoe, that shoe is worn on this exact foot side. Do not mirror-copy another foot or shoe direction into this region.'
          : region.kind === 'hand'
            ? 'Generate this region as a realistic hand/wrist/fingers holding, touching, or supporting the nearby shoe; do not convert it into a leg or foot.'
            : 'Do not generate this as an extra independent limb; merge it into the nearest hand/foot detail if needed.'
        return `B${index + 1}: ${role} (${region.confidence} confidence); bbox left ${box.left}%, top ${box.top}%, width ${box.boxWidth}%, height ${box.boxHeight}%, center (${box.centerX}%, ${box.centerY}%).${axisText}${shoeText}${footSideText} ${actionText} Reason: ${region.reason}.`
      })
      const clothingLines = redComponents.map((component, index) => {
        const box = metrics(component)
        const axis = axisForComponent(masks.red, component)
        const axisText = axis ? ` Main clothing axis runs from (${axis.start.x}%, ${axis.start.y}%) to (${axis.end.x}%, ${axis.end.y}%), direction ${axis.direction}.` : ''
        const connectedBlue = blueRegionAnalysis
          .map((region, regionIndex) => ({ region, regionIndex }))
          .filter(({ region }) => touchesAny(component, [region.component], 0.08))
          .map(({ regionIndex }) => `B${regionIndex + 1}`)
        return `R${index + 1}: CLOTHING REGION / lower-body garment support, bbox left ${box.left}%, top ${box.top}%, width ${box.boxWidth}%, height ${box.boxHeight}%, center (${box.centerX}%, ${box.centerY}%).${axisText} Connected body regions: ${connectedBlue.length ? connectedBlue.join(', ') : 'none'}. Put model-reference clothing only inside this red/R region; do not create head, face, torso, or full upper body.`
      })
      const bodyDirectionLock = [
        cameraInference.bodyOrigin && cameraInference.shoeTarget
          ? `BODY DIRECTION LOCK: code detects the body/clothing origin at ${pointLabel(cameraInference.bodyOrigin.x, cameraInference.bodyOrigin.y)} and the shoe target at ${pointLabel(cameraInference.shoeTarget.x, cameraInference.shoeTarget.y)}. Legs and shoes must travel from the body origin toward ${cameraInference.extensionDirection}.`
          : '',
        cameraInference.strongDownwardPose
          ? 'CAMERA LOCK: use a top-down / first-person downward high-angle camera. Do not convert this to an eye-level, front-facing, side-view, standing catalog pose.'
          : '',
      ].filter(Boolean).join('\n')
      const controlImageExplanation = [
        'CONTROL IMAGE EXPLANATION FOR THIS UPLOADED ANGLE IMAGE:',
        'Dynamic explanation: this explanation is generated from the current uploaded angle image only. Do not reuse it for other angle images and do not treat it as a fixed template.',
        'Visual warning: the cleaned control image, labels, coordinate grid, line colors, guide fills, gray/white marks, and original yellow/blue/red/black mask colors are invisible metadata only. None of them may appear in the final generated image.',
        'Shoe-first binding rule from code: each yellow S shoe is first classified as WORN, HAND-SUPPORTED, or DISPLAY based on real blue-yellow pixel contact, blue endpoint distance, blue-inside-shoe ratio, red clothing connection, and box-only rejection. DISPLAY shoes must not gain feet or legs.',
        'Hand/leg contour rule from code: blue regions with a broad continuous ankle/instep contour entering a yellow shoe are LEG/FOOT. Blue regions ending in multiple narrow separated tips near a yellow shoe are HAND/FINGERS. This rule is applied dynamically to the current uploaded angle image.',
        crossedLegSplitApplied ? 'Crossed-leg rule from code: one connected blue body mass was split into separate B leg/foot regions because multiple shoe anchors indicate a crossed-leg pose. Preserve the crossing order and do not merge the two legs into one limb.' : '',
        `For this image, the detected pose is "${poseType}". The detected camera is "${cameraInference.label}". The required crop is a product-shoe close crop: shoes must be the main focus, with only feet, lower legs, hands if detected, and required clothing hem/partial lower garment.`,
        cameraInference.bodyOrigin && cameraInference.shoeTarget
          ? `For this image, the body/clothing origin is around (${cameraInference.bodyOrigin.x}%, ${cameraInference.bodyOrigin.y}%) and the shoe target is around (${cameraInference.shoeTarget.x}%, ${cameraInference.shoeTarget.y}%). Body/limbs/shoes must extend toward ${cameraInference.extensionDirection}; do not flip, recenter, or convert this into a generic pose.`
          : 'For this image, preserve the uploaded angle reference coordinate relationship exactly; do not recenter or replace it with a generic pose.',
        `For this image, detected shoe objects: ${yellowComponents.length}, represented actual shoe count: ${mainShoeInstanceCount}. Worn shoes: ${shoeRoleList(wornShoeIndexes)}. Hand-supported shoes: ${shoeRoleList(handHeldShoeIndexes)}. Standalone display shoes: ${shoeRoleList(displayShoeIndexes)}. If an S object has x2, it represents two product shoes within the same layout object.`,
        ...yellowComponents.map((component, index) => {
          const box = metrics(component)
          const role = wornShoeIndexes.includes(index)
            ? `worn on foot${footSideForShoe(index) ? ` (${footSideForShoe(index)})` : ''}`
            : handHeldShoeIndexes.includes(index)
              ? 'hand-supported / handheld display shoe'
              : 'standalone display shoe'
          const connectedLegs = blueRegionAnalysis
            .map((region, regionIndex) => ({ region, regionIndex }))
            .filter(({ region }) => region.kind === 'leg-foot' && region.connectedShoeIndexes.includes(index))
            .map(({ regionIndex }) => `B${regionIndex + 1}`)
          const connectedHands = blueRegionAnalysis
            .map((region, regionIndex) => ({ region, regionIndex }))
            .filter(({ region }) => region.kind === 'hand' && region.connectedShoeIndexes.includes(index))
            .map(({ regionIndex }) => `B${regionIndex + 1}`)
          return `S object explanation: S${index + 1}${shoeInstanceSuffix(index)} is ${role}, representedShoeCount=${shoeInstanceCounts[index] || 1}, located at bbox left ${box.left}%, top ${box.top}%, width ${box.boxWidth}%, height ${box.boxHeight}%, center (${box.centerX}%, ${box.centerY}%). Connected leg/foot regions: ${connectedLegs.length ? connectedLegs.join('/') : 'none'}. Connected hand regions: ${connectedHands.length ? connectedHands.join('/') : 'none'}.`
        }),
        ...blueRegionAnalysis.map((region, index) => {
          const box = metrics(region.component)
          const role = region.kind === 'leg-foot'
            ? 'real leg/foot/ankle anatomy'
            : region.kind === 'hand'
              ? 'real hand/wrist/fingers'
              : 'minor detail, not an independent limb'
          return `B object explanation: B${index + 1} is ${role}, confidence ${region.confidence}, center (${box.centerX}%, ${box.centerY}%), connected shoes ${region.connectedShoeIndexes.length ? region.connectedShoeIndexes.map((shoeIndex) => `S${shoeIndex + 1}`).join('/') : 'none'}.`
        }),
        redComponents.length
          ? `For this image, detected clothing support regions: ${redComponents.length}. They only create lower-body clothing/hem/partial garment from the model reference; they must not create head, face, torso, portrait, or full upper body.`
          : 'For this image, no major red clothing region is detected; keep clothing minimal and cropped out unless needed by the lower-body pose.',
        ...redComponents.map((component, index) => {
          const box = metrics(component)
          return `R object explanation: R${index + 1} is secondary clothing support only, located at bbox left ${box.left}%, top ${box.top}%, width ${box.boxWidth}%, height ${box.boxHeight}%, center (${box.centerX}%, ${box.centerY}%).`
        }),
        'Generation instruction from this explanation: first understand the S/B/R objects and their roles from this explanation, then generate a realistic commercial footwear photo. The final image must not look like the control image.',
      ].filter(Boolean).join('\n')
      const layout = [
        'CLEANED ANGLE CONTROL HARD CONSTRAINT:',
        'CODE CONTROL SCOPE: the cleaned control image and code analysis control only angle, depth ordering, pose, object counts, hand/foot candidates, shoe-limb bindings, coordinates, and occlusion. They do not control lighting, color grading, texture, shadow softness, material quality, background mood, contrast, or photographic finish.',
        'The cleaned control image is a neutral layout guide only. It is not a visual style reference. Do not render any control colors, mask colors, labels, grid lines, boxes, outlines, gray wash, white guide fills, or flat guide marks in the final image.',
        'Coordinate system: use the uploaded/cleaned angle image as a 2D canvas. X axis goes left-to-right from X0 to X100. Y axis goes top-to-bottom from Y0 to Y100. Keep every shoe, limb, clothing area, and background boundary at the same relative X/Y coordinates and scale.',
        controlImageExplanation,
        `Camera inference by code: ${cameraInference.label}. ${cameraInference.instruction}`,
        structuredPoseSchema,
        depthLayerMap,
        clothingRegionMap,
        skeletonMap,
        candidateMap,
        shoeLimbBindings,
        bodyDirectionLock,
        `Main shoe count is exactly ${mainShoeInstanceCount}. There are ${yellowComponents.length} S layout object(s); any S object marked x2 represents two actual product shoes inside that same layout object. Use S objects for product-shoe placement/angle only; product appearance still comes only from the uploaded product shoe image.`,
        'Internal shoe holes, straps, buckles, openings, shadows, and thin lines belong to their nearest S shoe object and must not become extra shoes.',
        `Blue region classification by code: ${legFootRegions.length} leg/foot/ankle region(s), ${handRegions.length} hand/wrist/finger region(s), ${detailRegions.length} minor detail region(s). A blue hand region must stay a hand; a blue leg/foot region must stay leg/foot. Do not turn hands into legs, do not turn finger fragments into extra limbs, and do not invent extra legs from the number of blue fragments.`,
        `Red clothing classification by code: ${redComponents.length} clothing support region(s). Red regions must become only the lower-body clothing portions required around the legs/shoes; they must not cause the model face, head, portrait, torso, or full upper body to appear.`,
        'Product-shoe crop rule: camera must be aimed at the product shoes. Keep the product shoes as the largest/clearest subject; crop away any unnecessary upper body.',
        wornPairDirectionLock,
        wornPairMap,
        'Worn/display rule: only yellow S regions with strong foot binding to a blue LEG/FOOT/ANKLE endpoint or real blue-yellow pixel contact are worn shoes. Box overlap, foreground occlusion, or a shoe crossing in front of a foot does not make it worn. Yellow S regions connected to blue HAND/HANDWRIST/FINGER regions are handheld or hand-supported display shoes, not worn shoes. Any yellow S region without strong foot binding is a standalone display shoe and must not have a foot, ankle, leg, or body limb generated inside or attached to it.',
        shoeLines.join('\n'),
        limbLines.length ? 'Blue body-limb regions:\n' + limbLines.join('\n') : 'No major blue body-limb region detected; do not invent extra limbs unless required by a yellow worn-shoe object.',
        clothingLines.length ? 'Red clothing regions:\n' + clothingLines.join('\n') : 'No major red clothing region detected; keep clothing minimal or cropped out.',
        'Black/empty areas in the cleaned control are background/environment areas from the uploaded background reference.',
        'Final image must not show labels S1/S2, mask colors, control colors, gray guide wash, boxes, outlines, grid lines, or flat color-block artifacts.',
      ].filter(Boolean).join('\n')
      return { file: controlFile, layout }
    } catch {
      return null
    }
  }

  async function buildSingleFootAngleControl(file: File) {
    const cleaned = await buildCleanedAngleControl(file)
    if (!cleaned) return null

    const forceSingleFootLayout = (layout: string, enabled: boolean, options: { cameraViewValue?: string; cameraLockLine?: string; pairAnalysisLine?: string } = {}) => {
      if (!enabled) return layout
      let next = layout
      const hasSeparateDisplayShoe = /\bS\d+\s+DISPLAY\s+x\d+\b|standaloneDisplayShoes\s*=\s*S\d+/i.test(next)
      if (hasSeparateDisplayShoe) {
        const shoeIds = new Set(Array.from(next.matchAll(/^S(\d+)\b/gim)).map((match) => match[1]))
        const visibleShoeCount = Math.max(1, shoeIds.size)
        next = next
          .replace(/\bS(\d+)\s+WORN\s+x\d+\b/g, 'S$1 WORN x1')
          .replace(/\bS(\d+)\s+DISPLAY\s+x\d+\b/g, 'S$1 DISPLAY x1')
          .replace(/\bS object explanation: S(\d+) x\d+ is worn/g, 'S object explanation: S$1 x1 is worn')
          .replace(/\bS object explanation: S(\d+) x\d+ is standalone display shoe/g, 'S object explanation: S$1 x1 is standalone display shoe')
          .replace(/\bBinding S(\d+) x\d+:/g, 'Binding S$1 x1:')
          .replace(/representedShoeCount=2, but single-foot override splits this as wornShoeCount=1 \+ displayShoeCount=1/g, 'representedShoeCount=1')
          .replace(/representedShoeCount=2/g, 'representedShoeCount=1')
          .replace(/^mainShoeCount\s*=\s*\d+$/gim, `mainShoeCount = ${visibleShoeCount}`)
          .replace(/^wornShoeCount\s*=\s*\d+$/gim, 'wornShoeCount = 1')
          .replace(/^standaloneDisplayShoeCount\s*=\s*\d+$/gim, 'standaloneDisplayShoeCount = 1')
          .replace(/^wornShoes\s*=\s*(S\d+)\s+x\d+.*$/gim, 'wornShoes = $1 x1')
          .replace(/^standaloneDisplayShoes\s*=\s*(S\d+)\s+x\d+.*$/gim, 'standaloneDisplayShoes = $1 x1')
          .replace(/Worn shoes:\s*(S\d+)\s*x\d+/gi, 'Worn shoes: $1 x1')
          .replace(/Standalone display shoes:\s*(S\d+)\s*x\d+/gi, 'Standalone display shoes: $1 x1')
          .replace(/represented actual shoe count:\s*\d+/gi, `represented actual shoe count: ${visibleShoeCount}`)
          .replace(/If an S object has x2, it represents two product shoes within the same layout object\./g, 'In this single-foot channel, follow the cleaned x1 worn/display role labels instead of raw x2 suffixes.')
          .replace(/If representedShoeCount is 2, generate two matching product shoes inside this S object while preserving this same layout region and role\./g, 'In this single-foot channel, each S object represents one visible product shoe unless the code explicitly says otherwise.')
          .replace(/any S object marked x2 represents two actual product shoes inside that same layout object/g, 'in this single-foot channel, use the cleaned single-foot role labels: exactly one worn shoe on footX1 and the separate DISPLAY S object as one bare display shoe')
      } else {
        next = next
          .replace(/\bS(\d+)\s+WORN\s+x2\b/g, 'S$1 WORN x1 + DISPLAY x1 (single-foot override)')
          .replace(/representedShoeCount=2/g, 'representedShoeCount=2, but single-foot override splits this as wornShoeCount=1 + displayShoeCount=1')
          .replace(/^standaloneDisplayShoes\s*=\s*none\s*$/gim, 'standaloneDisplayShoes = inferred display shoe from single-foot S x2 override')
          .replace(/Standalone display shoes:\s*none/gi, 'Standalone display shoes: inferred display shoe from single-foot S x2 override')
          .replace(/If representedShoeCount is 2, generate two matching product shoes inside this S object while preserving this same layout region and role\./g, 'If representedShoeCount is 2 in this single-foot channel, generate one product shoe worn on footX1 and one bare display product shoe, while preserving this same layout region and role.')
          .replace(/any S object marked x2 represents two actual product shoes inside that same layout object/g, 'in this single-foot channel, any S object marked x2 means one worn shoe on footX1 plus one bare display shoe in the same layout object')
      }
      if (options.cameraViewValue) {
        next = next
          .replace(/^cameraView\s*=.*$/gim, `cameraView = ${options.cameraViewValue}`)
          .replace(/^Camera inference by code:.*$/gim, `Camera inference by code: ${options.cameraViewValue}. ${options.cameraLockLine || ''}`.trim())
          .replace(/The detected camera is "[^"]+"/g, `The detected camera is "${options.cameraViewValue}"`)
      }
      if (options.cameraLockLine) {
        next = next.replace(/^CAMERA LOCK:.*$/gim, options.cameraLockLine)
      }
      if (options.pairAnalysisLine && !/SINGLE-FOOT SIDE PAIR ANALYSIS BY CODE/i.test(next)) {
        next = [next, options.pairAnalysisLine].filter(Boolean).join('\n')
      }
      return next
    }

    const singleFootBaseLines = [
      'SINGLE-FOOT ANGLE CHANNEL HARD CONSTRAINT:',
      'This addendum applies only to the uploaded angle reference single-foot channel. It must not change the normal angle-reference channel, the hand-angle channel, or the angle library.',
      'Single-foot rule: if the code detects only one blue foot/leg region, the final image must show exactly one worn foot/leg. Do not invent a second worn foot, second leg, or second ankle to balance the composition.',
      'Display-shoe rule: any yellow shoe object not bound to the single blue foot/leg region is a bare display product shoe only. It must not receive skin, toes, sock, ankle, leg, or a second foot inside it.',
      'S WORN x2 override rule: in this single-foot channel only, if the reused normal control text or image contains S WORN x2 while the code also detects footX1, do not read it as two worn shoes. Read it as one worn product shoe on footX1 plus one bare display product shoe in the same yellow layout area.',
    ]

    try {
      const bitmap = await createImageBitmap(file)
      const width = bitmap.width
      const height = bitmap.height
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) {
        return {
          ...cleaned,
          layout: [cleaned.layout, singleFootBaseLines.join('\n')].filter(Boolean).join('\n\n'),
        }
      }
      context.drawImage(bitmap, 0, 0, width, height)
      const pixels = context.getImageData(0, 0, width, height).data
      const masks = {
        yellow: new Uint8Array(width * height),
        blue: new Uint8Array(width * height),
        red: new Uint8Array(width * height),
      }
      for (let index = 0; index < width * height; index += 1) {
        const offset = index * 4
        const r = pixels[offset]
        const g = pixels[offset + 1]
        const b = pixels[offset + 2]
        const a = pixels[offset + 3]
        if (a < 24) continue
        if (r > 150 && g > 125 && b < 135 && r + g > b * 2 + 110) masks.yellow[index] = 1
        else if (b > 110 && r < 135 && g < 170 && b > r * 1.15 && b > g * 1.05) masks.blue[index] = 1
        else if (r > 135 && g < 130 && b < 130 && r > g * 1.2 && r > b * 1.2) masks.red[index] = 1
      }

      type SingleFootComponent = { minX: number; minY: number; maxX: number; maxY: number; count: number }
      const findComponents = (mask: Uint8Array, minRatio = 0.0015) => {
        const visited = new Uint8Array(mask.length)
        const components: SingleFootComponent[] = []
        const queue: number[] = []
        for (let startIndex = 0; startIndex < mask.length; startIndex += 1) {
          if (!mask[startIndex] || visited[startIndex]) continue
          let minX = width
          let minY = height
          let maxX = 0
          let maxY = 0
          let count = 0
          queue.length = 0
          queue.push(startIndex)
          visited[startIndex] = 1
          for (let head = 0; head < queue.length; head += 1) {
            const current = queue[head]
            const x = current % width
            const y = Math.floor(current / width)
            minX = Math.min(minX, x)
            minY = Math.min(minY, y)
            maxX = Math.max(maxX, x)
            maxY = Math.max(maxY, y)
            count += 1
            const neighbors = [current - 1, current + 1, current - width, current + width]
            for (const next of neighbors) {
              if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue
              const nx = next % width
              if ((next === current - 1 || next === current + 1) && Math.abs(nx - x) !== 1) continue
              visited[next] = 1
              queue.push(next)
            }
          }
          if (count > width * height * minRatio) components.push({ minX, minY, maxX, maxY, count })
        }
        return components.sort((a, b) => b.count - a.count)
      }
      const metrics = (component: SingleFootComponent) => {
        const left = Math.round((component.minX / width) * 100)
        const top = Math.round((component.minY / height) * 100)
        const boxWidth = Math.round(((component.maxX - component.minX + 1) / width) * 100)
        const boxHeight = Math.round(((component.maxY - component.minY + 1) / height) * 100)
        const centerX = Math.round((((component.minX + component.maxX) / 2) / width) * 100)
        const centerY = Math.round((((component.minY + component.maxY) / 2) / height) * 100)
        return { left, top, boxWidth, boxHeight, centerX, centerY }
      }
      const weightedCenter = (components: SingleFootComponent[]) => {
        const total = components.reduce((sum, component) => sum + component.count, 0)
        if (!total) return null
        const x = components.reduce((sum, component) => {
          const box = metrics(component)
          return sum + box.centerX * component.count
        }, 0) / total
        const y = components.reduce((sum, component) => {
          const box = metrics(component)
          return sum + box.centerY * component.count
        }, 0) / total
        return { x: Math.round(x), y: Math.round(y) }
      }

      const blueFootComponents = findComponents(masks.blue, 0.002).slice(0, 4)
      const yellowShoeComponents = findComponents(masks.yellow, 0.0025).slice(0, 8)
      const redClothingComponents = findComponents(masks.red, 0.002).slice(0, 4)
      const readLayoutCount = (key: string) => {
        const match = cleaned.layout.match(new RegExp(`^${key}\\s*=\\s*(\\d+)`, 'im'))
        return match ? Number(match[1]) : null
      }
      const layoutLegFootCount = readLayoutCount('blueLegFootRegionCount')
      const layoutHandCount = readLayoutCount('blueHandRegionCount')
      const layoutSaysSingleFoot = layoutLegFootCount === 1 && (layoutHandCount === null || layoutHandCount === 0)
      const singleFootDetected = true
      const mergedBlueFootComponent = blueFootComponents.length
        ? blueFootComponents.reduce<SingleFootComponent>((merged, component) => ({
            minX: Math.min(merged.minX, component.minX),
            minY: Math.min(merged.minY, component.minY),
            maxX: Math.max(merged.maxX, component.maxX),
            maxY: Math.max(merged.maxY, component.maxY),
            count: merged.count + component.count,
          }), { ...blueFootComponents[0] })
        : null
      const blueMain = singleFootDetected && mergedBlueFootComponent
        ? metrics(mergedBlueFootComponent)
        : blueFootComponents[0] ? metrics(blueFootComponents[0]) : null
      const yellowCenter = weightedCenter(yellowShoeComponents)
      const redMain = redClothingComponents[0] ? metrics(redClothingComponents[0]) : null
      const redAtRightEdge = Boolean(redMain && redMain.centerX >= 72 && redMain.left + redMain.boxWidth >= 88)
      const redAtTop = Boolean(redMain && redMain.top <= 18 && redMain.boxWidth >= 36)
      const shoeLeftOfFoot = Boolean(blueMain && yellowCenter && yellowCenter.x < blueMain.centerX - 8)
      const verticalLeg = Boolean(blueMain && blueMain.boxHeight > blueMain.boxWidth * 1.05)
      const overheadSingleFootCamera = Boolean(redAtRightEdge && (shoeLeftOfFoot || (blueMain && blueMain.boxWidth >= blueMain.boxHeight * 0.72)))
      const eyeLevelSingleFootCamera = Boolean(!overheadSingleFootCamera && redAtTop && verticalLeg)
      const footCountLabel = singleFootDetected ? 'footX1' : `footX${blueFootComponents.length}`
      const directionFromDeltaLocal = (dx: number, dy: number) => {
        const horizontal = dx < -8 ? 'left' : dx > 8 ? 'right' : ''
        const vertical = dy < -8 ? 'upper' : dy > 8 ? 'lower' : ''
        if (vertical && horizontal) return `${vertical}-${horizontal}`
        return vertical || horizontal || 'center'
      }
      type SingleFootShoeObject = SingleFootComponent & { source: 'component' | 'split' }
      const componentDistance = (a: ReturnType<typeof metrics>, b: { x: number; y: number }) => Math.hypot(a.centerX - b.x, a.centerY - b.y)
      const componentFromPixelPoints = (points: Array<{ x: number; y: number }>): SingleFootComponent | null => {
        if (!points.length) return null
        let minX = width
        let minY = height
        let maxX = 0
        let maxY = 0
        for (const point of points) {
          minX = Math.min(minX, point.x)
          minY = Math.min(minY, point.y)
          maxX = Math.max(maxX, point.x)
          maxY = Math.max(maxY, point.y)
        }
        return { minX, minY, maxX, maxY, count: points.length }
      }
      const splitSingleYellowShoeObject = (component: SingleFootComponent): [SingleFootShoeObject, SingleFootShoeObject] | null => {
        const points: Array<{ x: number; y: number }> = []
        const stride = Math.max(1, Math.round(Math.min(width, height) / 480))
        for (let y = component.minY; y <= component.maxY; y += stride) {
          for (let x = component.minX; x <= component.maxX; x += stride) {
            if (!masks.yellow[y * width + x]) continue
            points.push({ x, y })
          }
        }
        if (points.length < 20) return null
        const blueSeed = blueMain
          ? { x: (blueMain.centerX / 100) * width, y: (blueMain.centerY / 100) * height }
          : { x: (component.minX + component.maxX) / 2, y: (component.minY + component.maxY) / 2 }
        let first = { ...blueSeed }
        let second = points.reduce((farthest, point) => {
          const distance = Math.hypot(point.x - first.x, point.y - first.y)
          return distance > farthest.distance ? { point, distance } : farthest
        }, { point: points[0], distance: -1 }).point
        for (let iteration = 0; iteration < 8; iteration += 1) {
          const buckets = [
            { x: 0, y: 0, count: 0, points: [] as Array<{ x: number; y: number }> },
            { x: 0, y: 0, count: 0, points: [] as Array<{ x: number; y: number }> },
          ]
          for (const point of points) {
            const firstDistance = Math.hypot(point.x - first.x, point.y - first.y)
            const secondDistance = Math.hypot(point.x - second.x, point.y - second.y)
            const bucket = firstDistance <= secondDistance ? buckets[0] : buckets[1]
            bucket.x += point.x
            bucket.y += point.y
            bucket.count += 1
            bucket.points.push(point)
          }
          if (buckets[0].count) first = { x: buckets[0].x / buckets[0].count, y: buckets[0].y / buckets[0].count }
          if (buckets[1].count) second = { x: buckets[1].x / buckets[1].count, y: buckets[1].y / buckets[1].count }
        }
        const firstPoints: Array<{ x: number; y: number }> = []
        const secondPoints: Array<{ x: number; y: number }> = []
        for (const point of points) {
          const firstDistance = Math.hypot(point.x - first.x, point.y - first.y)
          const secondDistance = Math.hypot(point.x - second.x, point.y - second.y)
          ;(firstDistance <= secondDistance ? firstPoints : secondPoints).push(point)
        }
        const firstComponent = componentFromPixelPoints(firstPoints)
        const secondComponent = componentFromPixelPoints(secondPoints)
        if (!firstComponent || !secondComponent) return null
        return [{ ...firstComponent, source: 'split' }, { ...secondComponent, source: 'split' }]
      }
      const inferSingleFootShoeObjects = () => {
        const hasSeparateDisplayShoe = /\bS\d+\s+DISPLAY\s+x\d+\b|standaloneDisplayShoes\s*=\s*S\d+/i.test(cleaned.layout)
        let objects: SingleFootShoeObject[] = []
        if (hasSeparateDisplayShoe && yellowShoeComponents.length >= 2) {
          objects = yellowShoeComponents.slice(0, 2).map((component) => ({ ...component, source: 'component' as const }))
        } else if (yellowShoeComponents.length >= 2) {
          objects = yellowShoeComponents.slice(0, 2).map((component) => ({ ...component, source: 'component' as const }))
        } else if (yellowShoeComponents[0]) {
          objects = splitSingleYellowShoeObject(yellowShoeComponents[0]) || [{ ...yellowShoeComponents[0], source: 'component' as const }]
        }
        if (!objects.length) return null
        const bluePoint = blueMain ? { x: blueMain.centerX, y: blueMain.centerY } : yellowCenter || { x: 50, y: 50 }
        const ordered = objects
          .map((component) => ({ component, box: metrics(component) }))
          .sort((a, b) => componentDistance(a.box, bluePoint) - componentDistance(b.box, bluePoint))
        const worn = ordered[0]?.component
        const display = ordered[1]?.component
        return { worn, display }
      }
      const axisForSingleFootObject = (component: SingleFootComponent | null | undefined) => {
        if (!component) return null
        let count = 0
        let sumX = 0
        let sumY = 0
        for (let y = component.minY; y <= component.maxY; y += 1) {
          for (let x = component.minX; x <= component.maxX; x += 1) {
            if (!masks.yellow[y * width + x]) continue
            count += 1
            sumX += x
            sumY += y
          }
        }
        if (!count) return null
        const meanX = sumX / count
        const meanY = sumY / count
        let covXX = 0
        let covXY = 0
        let covYY = 0
        for (let y = component.minY; y <= component.maxY; y += 1) {
          for (let x = component.minX; x <= component.maxX; x += 1) {
            if (!masks.yellow[y * width + x]) continue
            const dx = x - meanX
            const dy = y - meanY
            covXX += dx * dx
            covXY += dx * dy
            covYY += dy * dy
          }
        }
        const angle = 0.5 * Math.atan2(2 * covXY, covXX - covYY)
        const vx = Math.cos(angle)
        const vy = Math.sin(angle)
        let minProjection = Number.POSITIVE_INFINITY
        let maxProjection = Number.NEGATIVE_INFINITY
        for (let y = component.minY; y <= component.maxY; y += 1) {
          for (let x = component.minX; x <= component.maxX; x += 1) {
            if (!masks.yellow[y * width + x]) continue
            const projection = (x - meanX) * vx + (y - meanY) * vy
            minProjection = Math.min(minProjection, projection)
            maxProjection = Math.max(maxProjection, projection)
          }
        }
        const endpointA = {
          x: Math.round(((meanX + vx * minProjection) / width) * 100),
          y: Math.round(((meanY + vy * minProjection) / height) * 100),
        }
        const endpointB = {
          x: Math.round(((meanX + vx * maxProjection) / width) * 100),
          y: Math.round(((meanY + vy * maxProjection) / height) * 100),
        }
        const bodyPoint = redMain ? { x: redMain.centerX, y: redMain.centerY } : blueMain ? { x: blueMain.centerX, y: blueMain.centerY } : { x: 50, y: 50 }
        const distanceA = Math.hypot(endpointA.x - bodyPoint.x, endpointA.y - bodyPoint.y)
        const distanceB = Math.hypot(endpointB.x - bodyPoint.x, endpointB.y - bodyPoint.y)
        const heel = distanceA <= distanceB ? endpointA : endpointB
        const toe = distanceA <= distanceB ? endpointB : endpointA
        return { heel, toe, direction: directionFromDeltaLocal(toe.x - heel.x, toe.y - heel.y) }
      }
      const footSideMatch = cleaned.layout.match(/footSide=([^,\n]+)/i) || cleaned.layout.match(/is worn on foot \(([^)]*side foot[^)]*)\)/i)
      const footSideText = String(footSideMatch?.[1] || '').toLowerCase()
      const inferredWornFootSide = /right-side/.test(footSideText)
        ? 'RIGHT'
        : /left-side/.test(footSideText)
          ? 'LEFT'
          : eyeLevelSingleFootCamera
            ? 'LEFT'
            : 'UNKNOWN'
      const wornFootSide = overheadSingleFootCamera ? 'RIGHT' : inferredWornFootSide
      const displayShoeSide = wornFootSide === 'RIGHT' ? 'LEFT' : wornFootSide === 'LEFT' ? 'RIGHT' : 'OPPOSITE'
      const wornBuckleSide = wornFootSide === 'RIGHT' ? 'viewer-right' : wornFootSide === 'LEFT' ? 'viewer-left' : 'the detected worn-shoe side'
      const displayBuckleSide = displayShoeSide === 'RIGHT' ? 'viewer-right' : displayShoeSide === 'LEFT' ? 'viewer-left' : 'the opposite side'
      const inferredSingleFootShoes = inferSingleFootShoeObjects()
      const wornShoeBox = inferredSingleFootShoes?.worn ? metrics(inferredSingleFootShoes.worn) : null
      const displayShoeBox = inferredSingleFootShoes?.display ? metrics(inferredSingleFootShoes.display) : null
      const wornShoeAxis = axisForSingleFootObject(inferredSingleFootShoes?.worn)
      const displayShoeAxis = axisForSingleFootObject(inferredSingleFootShoes?.display)
      const sharedToeDirection = wornShoeAxis?.direction || displayShoeAxis?.direction || 'preserve-reference'
      const displayPositionRelativeToWorn = displayShoeBox && wornShoeBox
        ? displayShoeBox.centerX < wornShoeBox.centerX
          ? 'viewer-left of S1 WORN x1'
          : displayShoeBox.centerX > wornShoeBox.centerX
            ? 'viewer-right of S1 WORN x1'
            : 'at the same horizontal center as S1 WORN x1'
        : 'at the detected S2 DISPLAY position relative to S1 WORN x1'
      const formatShoeBox = (box: ReturnType<typeof metrics> | null) => box
        ? `bbox left ${box.left}%, top ${box.top}%, width ${box.boxWidth}%, height ${box.boxHeight}%, center (${box.centerX}%, ${box.centerY}%)`
        : 'bbox inferred from the single-foot S x2 shoe mass'
      const formatAxis = (axis: ReturnType<typeof axisForSingleFootObject> | null, fallbackDirection = sharedToeDirection) => axis
        ? `heelPoint=(${axis.heel.x}%,${axis.heel.y}%), toePoint=(${axis.toe.x}%,${axis.toe.y}%), toeDirection=${axis.direction}`
        : `toeDirection=${fallbackDirection}`
      const singleFootCameraViewValue = overheadSingleFootCamera
        ? 'strict first-person downward POV / true top-down try-on view. The camera is above the wearer looking down at the foot and shoes on the ground plane. The visible foot wearing the shoe is planted flat on the floor/ground, with the shoe sole contacting the floor; show the top surface of the shoe and foot, not a side profile. The bare display shoe also lies on the same floor plane. Do not convert this into eye-level, side-view, front-view, standing catalog, floating-foot, or studio side product camera.'
        : eyeLevelSingleFootCamera
          ? 'eye-level or low side-view product try-on view. The leg drops from clothing above and the shoe is seen more from the side/front, like reference image 2. Do not convert it to first-person overhead/top-down view.'
          : 'preserve the uploaded single-foot angle exactly. Use the code control image coordinates, shoe/foot relationship, and visible camera height as the strongest camera reference.'
      const singleFootCameraLockLine = overheadSingleFootCamera
        ? 'CAMERA LOCK: use the single-foot first-person downward/top-down grounded-foot camera. Do not convert this to an eye-level, front-facing, side-view, standing catalog pose.'
        : eyeLevelSingleFootCamera
          ? 'CAMERA LOCK: use the single-foot eye-level or low side-view camera from the uploaded reference. Do not convert this to top-down, first-person downward, overhead, flat-lay, or standing catalog camera.'
          : 'CAMERA LOCK: preserve the uploaded single-foot camera height and shoe/foot perspective exactly.'
      const cameraLock = `cameraView = ${singleFootCameraViewValue}`
      const singleFootCameraSideLock = overheadSingleFootCamera
        ? `SINGLE-FOOT CAMERA SIDE LOCK BY CODE: cameraType=strict-first-person-downward/top-down-grounded-foot. The shoe worn on footX1 must be the ${wornFootSide} shoe with the buckle/clasp/strap fastener on ${wornBuckleSide}. The bare display shoe must be the ${displayShoeSide} shoe with the buckle/clasp/strap fastener on ${displayBuckleSide}. The worn shoe and display shoe must point their toes/fronts toward the same canvas direction; do not reverse one shoe toe direction to create the left/right pair. Keep this as one worn foot plus one bare display shoe, not two worn feet. The worn foot is on the floor and photographed from above; do not show a side silhouette or eye-level heel profile.`
        : eyeLevelSingleFootCamera
          ? `SINGLE-FOOT CAMERA SIDE LOCK BY CODE: cameraType=eye-level/side-view. The shoe worn on footX1 must be the ${wornFootSide} shoe with the buckle/clasp/strap fastener on ${wornBuckleSide}. The bare display shoe must be the ${displayShoeSide} shoe with the buckle/clasp/strap fastener on ${displayBuckleSide}. The worn shoe and display shoe must point their toes/fronts toward the same canvas direction; do not reverse one shoe toe direction to create the left/right pair. Keep this as one worn foot plus one bare display shoe, not two worn feet.`
          : `SINGLE-FOOT CAMERA SIDE LOCK BY CODE: cameraType=preserve-uploaded-angle. Keep exactly one shoe worn on footX1 and exactly one bare display shoe. Do not generate two worn feet; preserve the detected shoe coordinates and buckle/clasp side relationship from the uploaded single-foot angle reference. The worn shoe must be the ${wornFootSide} side and the display shoe must be the ${displayShoeSide} side. The worn shoe and display shoe must point their toes/fronts toward the same canvas direction as detected in the uploaded reference.`
      const singleFootToeDirectionLock = 'SINGLE-FOOT TOE DIRECTION SAME LOCK BY CODE: the shoe worn on footX1 and the bare display shoe must keep the same toe/front pointing direction on the canvas. Left/right shoe pairing is controlled by buckle/clasp side only; never flip one shoe so its toe points the opposite way.'
      const singleFootBuckleVerificationLock = `SINGLE-FOOT BUCKLE VISUAL VERIFICATION BY CODE: before generating, identify the uploaded product shoe buckle/clasp/strap fastener from the product reference. The ${wornFootSide} worn shoe must place that buckle/clasp on ${wornBuckleSide}; the ${displayShoeSide} bare display shoe must place that buckle/clasp on ${displayBuckleSide}. If the display shoe buckle appears on the same side as the worn shoe, on the inner side, or disappears, the result fails. Do not satisfy left/right pairing by rotating, mirroring, or reversing the toe direction; only the buckle/clasp side changes.`
      const singleFootWholeShoeSideLock = `SINGLE-FOOT WHOLE-SHOE SIDE LOCK BY CODE: left/right pairing is not just strap direction. The entire shoe body must be the opposite side shoe: toe box curve, opening shape, inner wall, outer wall, heel counter, strap anchor, buckle/clasp side, and side seam must all match the ${wornFootSide}+${displayShoeSide} pair. Do not create two same-side shoes with only the buckle or strap moved to the other side.`
      const singleFootSidePairAnalysisLock = `SINGLE-FOOT SIDE PAIR ANALYSIS BY CODE: wornFootSide=${wornFootSide}; displayShoeSide=${displayShoeSide}; wornShoeBuckleSide=${wornBuckleSide}; displayShoeBuckleSide=${displayBuckleSide}. If the worn shoe is ${wornFootSide}, the display shoe must be ${displayShoeSide}; do not generate the display shoe as the same ${wornFootSide} side. The two shoes must be an opposite left/right pair while their toe/front directions remain the same. Verify the pair by the whole shoe body and buckle/clasp side: the worn shoe buckle must be on ${wornBuckleSide}, and the display shoe buckle must be on ${displayBuckleSide}.`
      const singleFootIndependentShoeMap = [
        'SINGLE-FOOT INDEPENDENT SHOE MAP BY CODE:',
        `S1 WORN x1 = product shoe on footX1; ${formatShoeBox(wornShoeBox)}; ${formatAxis(wornShoeAxis)}; shoeSide=${wornFootSide}; buckleSide=${wornBuckleSide}.`,
        `S2 DISPLAY x1 = bare product display shoe only; ${formatShoeBox(displayShoeBox)}; ${formatAxis(displayShoeAxis, sharedToeDirection)}; shoeSide=${displayShoeSide}; buckleSide=${displayBuckleSide}.`,
        `S2 DISPLAY x1 must remain ${displayPositionRelativeToWorn}; do not swap the S1 worn-shoe and S2 display-shoe locations.`,
        `S2 toeDirection must equal S1 toeDirection (${sharedToeDirection}). S2 must be the opposite left/right side from S1, but must not reverse toe/front direction.`,
        'SINGLE-FOOT PAIR GUIDE VISUAL RULE: the small pair-guide panel in the control image only explains left/right shoe pairing, same toe direction, and opposite buckle side. It must not control final shoe color, material, texture, lighting, background, or photographic style.',
      ].join('\n')
      const singleFootEvidence = layoutSaysSingleFoot
        ? 'The cleaned control layout already reports blueLegFootRegionCount=1.'
        : `This is the dedicated single-foot upload channel; raw blue fragments were ${blueFootComponents.length}, but fragments inside one foot/ankle region must still be treated as footX1.`
      const singleFootLines = [
        ...singleFootBaseLines,
        `singleFootCodeCount = ${footCountLabel}`,
        singleFootDetected
          ? `SINGLE-FOOT SINGLE-VISIBLE-FOOT LOCK: this upload channel never represents double feet. ${singleFootEvidence} Treat every broken blue fragment inside the same B/foot area as one visible worn foot only: footX1. Generate only one foot/leg wearing one product shoe. If any S object is marked WORN x2 or representedShoeCount=2, split it as wornShoeCount=1 + displayShoeCount=1: one product shoe on footX1, and one bare display shoe with no foot/leg/skin/sock/toes inside. Do not generate two worn feet.`
          : `The code detected ${blueFootComponents.length} blue foot/leg regions. Follow this count exactly; do not add extra feet beyond the detected blue regions.`,
        `SINGLE-FOOT CAMERA DESCRIPTION BY CODE: ${cameraLock}`,
        singleFootCameraSideLock,
        singleFootToeDirectionLock,
        singleFootBuckleVerificationLock,
        singleFootWholeShoeSideLock,
        singleFootSidePairAnalysisLock,
        singleFootIndependentShoeMap,
      ].filter(Boolean)
      const singleFootLayout = forceSingleFootLayout(cleaned.layout, singleFootDetected, {
        cameraViewValue: singleFootCameraViewValue,
        cameraLockLine: singleFootCameraLockLine,
        pairAnalysisLine: singleFootSidePairAnalysisLock,
      })
      const orderedSingleFootLayout = [singleFootLines.join('\n'), singleFootLayout].filter(Boolean).join('\n\n')

      if (!cleaned.file) {
        return {
          ...cleaned,
          layout: orderedSingleFootLayout,
        }
      }

      const controlBitmap = await createImageBitmap(cleaned.file)
      const controlCanvas = document.createElement('canvas')
      controlCanvas.width = controlBitmap.width
      controlCanvas.height = controlBitmap.height
      const control = controlCanvas.getContext('2d')
      if (!control) {
        return {
          ...cleaned,
          layout: orderedSingleFootLayout,
        }
      }
      control.drawImage(controlBitmap, 0, 0)
      const drawSingleFootPairGuide = () => {
        const panelWidth = Math.min(controlCanvas.width - 16, Math.max(360, Math.round(controlCanvas.width * 0.48)))
        const panelHeight = Math.max(108, Math.round(controlCanvas.width * 0.13))
        const x = Math.max(8, controlCanvas.width - panelWidth - 8)
        const y = Math.max(8, controlCanvas.height - panelHeight - 8)
        control.save()
        control.fillStyle = 'rgba(5, 5, 5, 0.88)'
        control.fillRect(x, y, panelWidth, panelHeight)
        control.strokeStyle = '#ffffff'
        control.lineWidth = Math.max(2, Math.round(controlCanvas.width * 0.0025))
        control.strokeRect(x + 4, y + 4, panelWidth - 8, panelHeight - 8)
        const fontSize = Math.max(11, Math.round(controlCanvas.width * 0.014))
        control.font = `bold ${fontSize}px Arial`
        control.fillStyle = '#ffffff'
        control.textBaseline = 'top'
        control.fillText('SINGLE-FOOT PAIR GUIDE: same toe direction, opposite buckle side', x + 12, y + 10)
        const shoeY = y + Math.round(panelHeight * 0.48)
        const shoeW = Math.round(panelWidth * 0.28)
        const shoeH = Math.max(18, Math.round(panelHeight * 0.22))
        const firstX = x + Math.round(panelWidth * 0.14)
        const secondX = x + Math.round(panelWidth * 0.58)
        const drawShoeSymbol = (centerX: number, label: string, buckleSide: string) => {
          control.strokeStyle = '#ffffff'
          control.fillStyle = 'rgba(255,255,255,0.12)'
          control.lineWidth = Math.max(2, Math.round(controlCanvas.width * 0.002))
          control.beginPath()
          control.roundRect(centerX - shoeW / 2, shoeY, shoeW, shoeH, Math.max(6, shoeH * 0.45))
          control.fill()
          control.stroke()
          control.beginPath()
          control.moveTo(centerX - shoeW / 2 + 8, shoeY + shoeH * 0.5)
          control.lineTo(centerX + shoeW / 2 - 8, shoeY + shoeH * 0.5)
          control.stroke()
          const buckleX = buckleSide === 'viewer-right' ? centerX + shoeW * 0.22 : centerX - shoeW * 0.22
          control.fillStyle = '#ffffff'
          control.fillRect(buckleX - 4, shoeY + shoeH * 0.5 - 4, 8, 8)
          control.fillText(label, centerX - shoeW / 2, shoeY + shoeH + 8)
          control.fillText(`buckle ${buckleSide.replace('viewer-', '')}`, centerX - shoeW / 2, shoeY + shoeH + 8 + fontSize + 2)
        }
        drawShoeSymbol(firstX, `S1 WORN ${wornFootSide}`, wornBuckleSide === 'viewer-right' ? 'viewer-right' : 'viewer-left')
        drawShoeSymbol(secondX, `S2 DISPLAY ${displayShoeSide}`, displayBuckleSide === 'viewer-right' ? 'viewer-right' : 'viewer-left')
        control.strokeStyle = '#ffffff'
        control.lineWidth = Math.max(2, Math.round(controlCanvas.width * 0.002))
        const arrowY = y + Math.round(panelHeight * 0.34)
        control.beginPath()
        control.moveTo(x + Math.round(panelWidth * 0.18), arrowY)
        control.lineTo(x + Math.round(panelWidth * 0.82), arrowY)
        control.stroke()
        control.beginPath()
        control.moveTo(x + Math.round(panelWidth * 0.82), arrowY)
        control.lineTo(x + Math.round(panelWidth * 0.79), arrowY - 7)
        control.lineTo(x + Math.round(panelWidth * 0.79), arrowY + 7)
        control.closePath()
        control.fill()
        control.fillText(`toeDirection same: ${sharedToeDirection}`, x + 12, y + panelHeight - fontSize - 10)
        control.restore()
      }
      const drawInferredShoeBox = (component: SingleFootComponent | null | undefined, label: string) => {
        if (!component) return
        control.save()
        control.strokeStyle = '#ffffff'
        control.fillStyle = '#ffffff'
        control.lineWidth = Math.max(3, Math.round(controlCanvas.width * 0.004))
        control.strokeRect(
          Math.max(0, component.minX - 6),
          Math.max(0, component.minY - 6),
          Math.min(controlCanvas.width - component.minX, component.maxX - component.minX + 13),
          Math.min(controlCanvas.height - component.minY, component.maxY - component.minY + 13),
        )
        control.font = `bold ${Math.max(15, Math.round(controlCanvas.width * 0.022))}px Arial`
        control.textBaseline = 'top'
        control.strokeStyle = '#050505'
        control.lineWidth = Math.max(3, Math.round(controlCanvas.width * 0.003))
        const x = Math.min(controlCanvas.width - 180, Math.max(8, component.minX + 8))
        const y = Math.min(controlCanvas.height - 32, Math.max(8, component.minY + 8))
        control.strokeText(label, x, y)
        control.fillText(label, x, y)
        control.restore()
      }
      drawInferredShoeBox(inferredSingleFootShoes?.worn, 'S1 WORN x1')
      drawInferredShoeBox(inferredSingleFootShoes?.display, 'S2 DISPLAY x1')
      drawSingleFootPairGuide()
      if (singleFootDetected) {
        control.fillStyle = 'rgba(5, 5, 5, 0.86)'
        const overlayWidth = controlCanvas.width - 16
        const overlayHeight = Math.max(112, Math.round(controlCanvas.width * 0.14))
        control.fillRect(8, 8, overlayWidth, overlayHeight)
        control.fillStyle = '#ffffff'
        const overlayFontSize = Math.max(15, Math.round(controlCanvas.width * 0.022))
        control.font = `bold ${overlayFontSize}px Arial`
        control.textBaseline = 'top'
        const drawOverlayLine = (text: string, lineIndex: number) => {
          const lineY = 16 + lineIndex * Math.max(overlayFontSize + 4, Math.round(controlCanvas.width * 0.028))
          let fontSize = overlayFontSize
          control.font = `bold ${fontSize}px Arial`
          while (control.measureText(text).width > overlayWidth - 20 && fontSize > 11) {
            fontSize -= 1
            control.font = `bold ${fontSize}px Arial`
          }
          control.fillText(text, 18, Math.min(lineY, 8 + overlayHeight - fontSize - 6))
        }
        drawOverlayLine('S worn x2 override: footX1 + displayX1', 0)
        drawOverlayLine('only one visible worn foot', 1)
        drawOverlayLine(`${overheadSingleFootCamera ? 'top-down' : eyeLevelSingleFootCamera ? 'side-view' : 'single-foot'}: worn=${wornFootSide}, display=${displayShoeSide}`, 2)
      }
      control.fillStyle = '#ffffff'
      control.strokeStyle = '#050505'
      control.lineWidth = Math.max(3, Math.round(controlCanvas.width * 0.004))
      control.font = `bold ${Math.max(17, Math.round(controlCanvas.width * 0.026))}px Arial`
      control.textBaseline = 'top'
      const labelBlue = singleFootDetected ? (mergedBlueFootComponent || blueFootComponents[0]) : null
      if (labelBlue) {
        const x = Math.min(controlCanvas.width - 120, Math.max(8, labelBlue.minX + 8))
        const y = Math.min(controlCanvas.height - 36, Math.max(8, labelBlue.minY + Math.round(controlCanvas.width * 0.052)))
        control.strokeText('footX1', x, y)
        control.fillText('footX1', x, y)
      } else {
        control.strokeText(footCountLabel, 12, 12)
        control.fillText(footCountLabel, 12, 12)
      }
      const blob = await canvasToBlob(controlCanvas, 'image/png')
      if (!blob) {
        return {
          ...cleaned,
          layout: orderedSingleFootLayout,
        }
      }
      const fileName = cleaned.file.name.replace(/\.[^.]+$/, '') || 'single-foot-angle-control'
      return {
        file: new File([blob], `${fileName}-single-foot.png`, { type: 'image/png' }),
        layout: orderedSingleFootLayout,
      }
    } catch {
      return {
        ...cleaned,
        layout: [cleaned.layout, singleFootBaseLines.join('\n')].filter(Boolean).join('\n\n'),
      }
    }
  }

  async function buildHandAngleControl(file: File) {
    try {
      const bitmap = await createImageBitmap(file)
      const width = bitmap.width
      const height = bitmap.height
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) return null
      context.drawImage(bitmap, 0, 0, width, height)
      const pixels = context.getImageData(0, 0, width, height).data
      const masks = {
        yellow: new Uint8Array(width * height),
        blue: new Uint8Array(width * height),
        green: new Uint8Array(width * height),
        red: new Uint8Array(width * height),
        black: new Uint8Array(width * height),
      }
      for (let index = 0; index < width * height; index += 1) {
        const offset = index * 4
        const r = pixels[offset]
        const g = pixels[offset + 1]
        const b = pixels[offset + 2]
        const a = pixels[offset + 3]
        if (a < 24) continue
        if (r > 150 && g > 125 && b < 135 && r + g > b * 2 + 110) masks.yellow[index] = 1
        else if (g > 105 && r < 150 && b < 150 && g > r * 1.15 && g > b * 1.15) masks.green[index] = 1
        else if (b > 110 && r < 135 && g < 170 && b > r * 1.15 && b > g * 1.05) masks.blue[index] = 1
        else if (r > 135 && g < 130 && b < 130 && r > g * 1.2 && r > b * 1.2) masks.red[index] = 1
        else if (r < 55 && g < 55 && b < 55) masks.black[index] = 1
      }

      type HandAngleComponent = { minX: number; minY: number; maxX: number; maxY: number; count: number }
      const findComponents = (mask: Uint8Array, minRatio = 0.0012) => {
        const visited = new Uint8Array(mask.length)
        const components: HandAngleComponent[] = []
        const minCount = Math.max(10, width * height * minRatio)
        for (let startIndex = 0; startIndex < mask.length; startIndex += 1) {
          if (!mask[startIndex] || visited[startIndex]) continue
          const queue = [startIndex]
          visited[startIndex] = 1
          let cursor = 0
          let minX = width
          let minY = height
          let maxX = 0
          let maxY = 0
          let count = 0
          while (cursor < queue.length) {
            const current = queue[cursor++]
            const x = current % width
            const y = Math.floor(current / width)
            minX = Math.min(minX, x)
            minY = Math.min(minY, y)
            maxX = Math.max(maxX, x)
            maxY = Math.max(maxY, y)
            count += 1
            const neighbors = [current - 1, current + 1, current - width, current + width]
            for (const next of neighbors) {
              if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue
              const nx = next % width
              if (Math.abs(nx - x) > 1) continue
              visited[next] = 1
              queue.push(next)
            }
          }
          if (count >= minCount) components.push({ minX, minY, maxX, maxY, count })
        }
        return components.sort((a, b) => b.count - a.count)
      }
      const metrics = (component: HandAngleComponent) => {
        const left = Math.round((component.minX / width) * 100)
        const top = Math.round((component.minY / height) * 100)
        const boxWidth = Math.round(((component.maxX - component.minX + 1) / width) * 100)
        const boxHeight = Math.round(((component.maxY - component.minY + 1) / height) * 100)
        const centerX = Math.round((((component.minX + component.maxX) / 2) / width) * 100)
        const centerY = Math.round((((component.minY + component.maxY) / 2) / height) * 100)
        return { left, top, boxWidth, boxHeight, centerX, centerY }
      }
      const handDirectionFromDelta = (dx: number, dy: number) => {
        const horizontal = dx < -8 ? 'left' : dx > 8 ? 'right' : ''
        const vertical = dy < -8 ? 'upper' : dy > 8 ? 'lower' : ''
        if (vertical && horizontal) return `${vertical}-${horizontal}`
        return vertical || horizontal || 'center'
      }
      const axisForComponent = (mask: Uint8Array, component: HandAngleComponent) => {
        let count = 0
        let sumX = 0
        let sumY = 0
        for (let y = component.minY; y <= component.maxY; y += 1) {
          for (let x = component.minX; x <= component.maxX; x += 1) {
            const index = y * width + x
            if (!mask[index]) continue
            count += 1
            sumX += x
            sumY += y
          }
        }
        if (!count) return null
        const meanX = sumX / count
        const meanY = sumY / count
        let covXX = 0
        let covXY = 0
        let covYY = 0
        for (let y = component.minY; y <= component.maxY; y += 1) {
          for (let x = component.minX; x <= component.maxX; x += 1) {
            const index = y * width + x
            if (!mask[index]) continue
            const dx = x - meanX
            const dy = y - meanY
            covXX += dx * dx
            covXY += dx * dy
            covYY += dy * dy
          }
        }
        const angle = 0.5 * Math.atan2(2 * covXY, covXX - covYY)
        const vx = Math.cos(angle)
        const vy = Math.sin(angle)
        let minProjection = Number.POSITIVE_INFINITY
        let maxProjection = Number.NEGATIVE_INFINITY
        for (let y = component.minY; y <= component.maxY; y += 1) {
          for (let x = component.minX; x <= component.maxX; x += 1) {
            const index = y * width + x
            if (!mask[index]) continue
            const projection = (x - meanX) * vx + (y - meanY) * vy
            minProjection = Math.min(minProjection, projection)
            maxProjection = Math.max(maxProjection, projection)
          }
        }
        const start = {
          x: Math.round(((meanX + vx * minProjection) / width) * 100),
          y: Math.round(((meanY + vy * minProjection) / height) * 100),
        }
        const end = {
          x: Math.round(((meanX + vx * maxProjection) / width) * 100),
          y: Math.round(((meanY + vy * maxProjection) / height) * 100),
        }
        return { start, end, direction: handDirectionFromDelta(end.x - start.x, end.y - start.y) }
      }
      const expandBox = (component: HandAngleComponent, ratio = 0.08) => {
        const boxWidth = component.maxX - component.minX + 1
        const boxHeight = component.maxY - component.minY + 1
        const padX = Math.round(boxWidth * ratio)
        const padY = Math.round(boxHeight * ratio)
        return {
          minX: Math.max(0, component.minX - padX),
          minY: Math.max(0, component.minY - padY),
          maxX: Math.min(width - 1, component.maxX + padX),
          maxY: Math.min(height - 1, component.maxY + padY),
          count: component.count,
        }
      }
      const boxesOverlap = (a: HandAngleComponent, b: HandAngleComponent) =>
        a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
      const touchIndexes = (component: HandAngleComponent, others: HandAngleComponent[], ratio = 0.08) => {
        const expanded = expandBox(component, ratio)
        return others
          .map((other, index) => ({ other, index }))
          .filter(({ other }) => boxesOverlap(expanded, expandBox(other, ratio)))
          .map(({ index }) => index)
      }
      const drawMask = (ctx: CanvasRenderingContext2D, mask: Uint8Array, components: HandAngleComponent[], stroke: string, fill: string) => {
        ctx.save()
        ctx.fillStyle = fill
        for (const component of components) {
          for (let y = component.minY; y <= component.maxY; y += 1) {
            for (let x = component.minX; x <= component.maxX; x += 1) {
              const index = y * width + x
              if (!mask[index]) continue
              ctx.fillRect(x, y, 1, 1)
            }
          }
        }
        ctx.strokeStyle = stroke
        ctx.lineWidth = Math.max(2, Math.round(Math.max(width, height) * 0.004))
        for (const component of components) {
          const box = expandBox(component, 0.018)
          ctx.strokeRect(box.minX, box.minY, box.maxX - box.minX + 1, box.maxY - box.minY + 1)
        }
        ctx.restore()
      }
      const drawSafeLabel = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number) => {
        const padding = Math.max(4, Math.round(width * 0.008))
        const metrics = ctx.measureText(text)
        const textWidth = metrics.width
        const fontMatch = /(\d+(?:\.\d+)?)px/.exec(ctx.font)
        const fontSize = fontMatch ? Number(fontMatch[1]) : Math.max(12, Math.round(width * 0.02))
        const safeX = Math.max(padding, Math.min(x, width - textWidth - padding))
        const safeY = Math.max(padding, Math.min(y, height - fontSize - padding))
        ctx.fillText(text, safeX, safeY)
      }

      const shoes = findComponents(masks.yellow, 0.0012).slice(0, 8)
      const bodyCandidates = findComponents(masks.blue, 0.0012).slice(0, 10)
      const greenHandCandidates = findComponents(masks.green, 0.0012).slice(0, 10)
      const clothes = findComponents(masks.red, 0.002).slice(0, 6)
      const blueClassifications = bodyCandidates.map(() => ({
        kind: 'FOOT/LEG',
        reason: 'hand-angle channel color lock: blue regions are always leg/foot/ankle; only green regions can be hand/wrist/fingers',
      }))
      const greenClassifications = greenHandCandidates.map(() => ({
        kind: 'HAND',
        reason: 'explicit green region in hand-angle upload; green is directly locked as hand/wrist/fingers',
      }))
      const controlCanvas = document.createElement('canvas')
      controlCanvas.width = width
      controlCanvas.height = height
      const control = controlCanvas.getContext('2d')
      if (!control) return null
      control.fillStyle = '#050505'
      control.fillRect(0, 0, width, height)
      control.strokeStyle = 'rgba(255,255,255,0.25)'
      control.fillStyle = 'rgba(255,255,255,0.86)'
      control.lineWidth = Math.max(1, Math.round(Math.max(width, height) * 0.002))
      control.font = `bold ${Math.max(12, Math.round(width * 0.022))}px Arial`
      ;[0, 25, 50, 75, 100].forEach((value) => {
        const x = Math.round((value / 100) * width)
        const y = Math.round((value / 100) * height)
        control.beginPath()
        control.moveTo(x, 0)
        control.lineTo(x, height)
        control.stroke()
        control.beginPath()
        control.moveTo(0, y)
        control.lineTo(width, y)
        control.stroke()
        control.fillText(`X${value}`, Math.min(width - 42, x + 4), 4)
        control.fillText(`Y${value}`, 4, Math.min(height - 20, y + 4))
      })
      drawMask(control, masks.red, clothes, '#b8b8b8', 'rgba(184,184,184,0.28)')
      drawMask(control, masks.blue, bodyCandidates, '#d8d8d8', 'rgba(216,216,216,0.26)')
      drawMask(control, masks.green, greenHandCandidates, '#eeeeee', 'rgba(238,238,238,0.3)')
      drawMask(control, masks.yellow, shoes, '#ffffff', 'rgba(255,255,255,0.22)')
      control.fillStyle = '#ffffff'
      control.textBaseline = 'top'
      control.font = `bold ${Math.max(15, Math.round(width * 0.026))}px Arial`
      shoes.forEach((component, index) => {
        const touchingBlue = touchIndexes(component, bodyCandidates, 0.08)
        const touchingGreen = touchIndexes(component, greenHandCandidates, 0.08)
        const label = touchingBlue.length && touchingGreen.length
          ? `S${index + 1} SHOE / HAND + FOOT`
          : touchingGreen.length
            ? `S${index + 1} SHOE / HAND`
            : touchingBlue.length
              ? `S${index + 1} SHOE / FOOT`
              : `S${index + 1} DISPLAY`
        drawSafeLabel(control, label, component.minX + 8, component.minY + 8)
      })
      control.font = `bold ${Math.max(12, Math.round(width * 0.019))}px Arial`
      bodyCandidates.forEach((component, index) => {
        drawSafeLabel(control, `B${index + 1} ${blueClassifications[index]?.kind || 'FOOT/LEG'}`, component.minX + 8, component.minY + 8)
      })
      greenHandCandidates.forEach((component, index) => {
        drawSafeLabel(control, `G${index + 1} HAND`, component.minX + 8, component.minY + 8)
      })
      clothes.forEach((component, index) => {
        drawSafeLabel(control, `R${index + 1} CLOTHING`, component.minX + 8, component.minY + 8)
      })
      const blob = await canvasToBlob(controlCanvas, 'image/png')
      if (!blob) return null
      const fileName = file.name.replace(/\.[^.]+$/, '') || 'uploaded-angle-hand'
      const controlFile = new File([blob], `${fileName}-hand-control.png`, { type: 'image/png' })
      const shoeLines = shoes.map((component, index) => {
        const box = metrics(component)
        const axis = axisForComponent(masks.yellow, component)
        const touchingBlue = touchIndexes(component, bodyCandidates, 0.08).map((blueIndex) => `B${blueIndex + 1}`)
        const touchingGreen = touchIndexes(component, greenHandCandidates, 0.08).map((greenIndex) => `G${greenIndex + 1}`)
        return `S${index + 1}: shoe/yellow region, bbox left ${box.left}%, top ${box.top}%, width ${box.boxWidth}%, height ${box.boxHeight}%, center (${box.centerX}%,${box.centerY}%), axis ${axis ? `(${axis.start.x}%,${axis.start.y}%)->(${axis.end.x}%,${axis.end.y}%), direction ${axis.direction}` : 'unknown'}, touchingBlue=${touchingBlue.length ? touchingBlue.join('/') : 'none'}, touchingGreenHands=${touchingGreen.length ? touchingGreen.join('/') : 'none'}. Yellow controls product shoe placement/angle/scale/occlusion only; product shoe appearance comes only from uploaded product shoe.`
      })
      const bodyLines = bodyCandidates.map((component, index) => {
        const box = metrics(component)
        const axis = axisForComponent(masks.blue, component)
        const touchingShoes = touchIndexes(component, shoes, 0.08).map((shoeIndex) => `S${shoeIndex + 1}`)
        const touchingRed = touchIndexes(component, clothes, 0.08).map((redIndex) => `R${redIndex + 1}`)
        const classification = blueClassifications[index]
        return `B${index + 1}: ${classification?.kind || 'FOOT/LEG'} by code, bbox left ${box.left}%, top ${box.top}%, width ${box.boxWidth}%, height ${box.boxHeight}%, center (${box.centerX}%,${box.centerY}%), axis ${axis ? `(${axis.start.x}%,${axis.start.y}%)->(${axis.end.x}%,${axis.end.y}%), direction ${axis.direction}` : 'unknown'}, touchingShoes=${touchingShoes.length ? touchingShoes.join('/') : 'none'}, touchingClothing=${touchingRed.length ? touchingRed.join('/') : 'none'}, classificationReason=${classification?.reason || 'none'}. Generate this B region as leg/foot/ankle only; never generate it as hand, fingers, or wrist.`
      })
      const greenHandLines = greenHandCandidates.map((component, index) => {
        const box = metrics(component)
        const axis = axisForComponent(masks.green, component)
        const touchingShoes = touchIndexes(component, shoes, 0.08).map((shoeIndex) => `S${shoeIndex + 1}`)
        const touchingRed = touchIndexes(component, clothes, 0.08).map((redIndex) => `R${redIndex + 1}`)
        const classification = greenClassifications[index]
        return `G${index + 1}: HAND by explicit green region, bbox left ${box.left}%, top ${box.top}%, width ${box.boxWidth}%, height ${box.boxHeight}%, center (${box.centerX}%,${box.centerY}%), axis ${axis ? `(${axis.start.x}%,${axis.start.y}%)->(${axis.end.x}%,${axis.end.y}%), direction ${axis.direction}` : 'unknown'}, touchingShoes=${touchingShoes.length ? touchingShoes.join('/') : 'none'}, touchingClothing=${touchingRed.length ? touchingRed.join('/') : 'none'}, classificationReason=${classification.reason}. Generate this G region as hand/fingers/wrist only; never generate it as leg, foot, or ankle.`
      })
      const clothingLines = clothes.map((component, index) => {
        const box = metrics(component)
        return `R${index + 1}: clothing/red region, bbox left ${box.left}%, top ${box.top}%, width ${box.boxWidth}%, height ${box.boxHeight}%, center (${box.centerX}%,${box.centerY}%). Red controls only lower-body clothing support from model reference.`
      })
      const layout = [
        'HAND ANGLE CONTROL HARD CONSTRAINT:',
        'This is the dedicated code-generated control for the upload channel "angle reference with hands". It does not use the normal angle-reference code logic or normal angle-reference prompt.',
        'Color meaning: yellow/S = product shoe placement/angle/scale/occlusion; green/G = explicit hand/wrist/finger region; blue/B = leg/foot/ankle region only; red/R = clothing support; black/empty = background.',
        'Coordinate hard-lock: treat this hand-angle control as a fixed X0-X100 / Y0-Y100 canvas. Every S/B/G/R bbox left/top/width/height/center is mandatory. Do not recenter, rebalance, beautify, flip, straighten, or move objects into a generic commercial pose. The original uploaded angle image and aesthetic wording only verify the layout; they must not override the numeric S/B/G/R coordinates.',
        'Green/blue rule for this hand-angle channel: every green/G region is HAND and every blue/B region is FOOT/LEG. Follow these fixed color roles exactly; do not reinterpret green as leg or blue as hand.',
        'Hand-supported shoe rule: a yellow shoe touched by a green/G hand candidate may be handheld or hand-supported display shoe; it must not automatically become worn-on-foot. A yellow shoe worn by blue foot/ankle/lower-leg candidate becomes worn shoe.',
        `mainShoeObjectCount = ${shoes.length}`,
        `greenHandCount = ${greenHandCandidates.length}`,
        'blueHandCount = 0',
        `blueFootLegCount = ${blueClassifications.filter((item) => item.kind === 'FOOT/LEG').length}`,
        `redClothingRegionCount = ${clothes.length}`,
        clothes.length === 0 ? 'No red/R clothing region is detected in this hand-angle control. Do not generate clothing, garment, skirt hem, pants hem, sleeve, fabric panel, torso, or outfit area. Show only the shoes, green/G hands if present, and blue/B feet/legs required by the S/B/G layout.' : '',
        shoeLines.length ? 'SHOE/YELLOW MAP:\n' + shoeLines.join('\n') : 'SHOE/YELLOW MAP: none detected.',
        bodyLines.length ? 'BLUE LEG/FOOT MAP:\n' + bodyLines.join('\n') : 'BLUE LEG/FOOT MAP: none detected.',
        greenHandLines.length ? 'GREEN HAND MAP:\n' + greenHandLines.join('\n') : 'GREEN HAND MAP: none detected.',
        clothingLines.length ? 'RED CLOTHING MAP:\n' + clothingLines.join('\n') : 'RED CLOTHING MAP: none detected.',
        'Final image must not show labels, grid, gray guide fills, white boxes, or yellow/green/blue/red/black mask colors. Replace every region with realistic photographic content from the assigned references.',
      ].join('\n')
      return { file: controlFile, layout }
    } catch {
      return null
    }
  }

  function clampMergeDimension(value: string, fallback: number) {
    const parsed = Number.parseInt(value, 10)
    if (!Number.isFinite(parsed)) return fallback
    return Math.min(4096, Math.max(256, parsed))
  }

  function getImageNaturalSize(file: File) {
    return new Promise<{ width: number; height: number }>((resolve) => {
      const url = URL.createObjectURL(file)
      const image = new Image()
      image.onload = () => {
        const width = image.naturalWidth || 1024
        const height = image.naturalHeight || 1024
        URL.revokeObjectURL(url)
        resolve({ width, height })
      }
      image.onerror = () => {
        URL.revokeObjectURL(url)
        resolve({ width: 1024, height: 1024 })
      }
      image.src = url
    })
  }

  function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, type, quality)
    })
  }

  async function compressMergeReferenceFile(file: File, role: MergeImageSlot['id']) {
    const profile = {
      product: { maxSide: 1600, quality: 0.88, type: 'image/jpeg' },
      background: { maxSide: 1400, quality: 0.84, type: 'image/jpeg' },
      model: { maxSide: 1400, quality: 0.84, type: 'image/jpeg' },
      angle: { maxSide: 768, quality: 0.92, type: 'image/png' },
    }[role]
    try {
      const bitmap = await createImageBitmap(file)
      const scale = Math.min(1, profile.maxSide / Math.max(bitmap.width, bitmap.height))
      const width = Math.max(1, Math.round(bitmap.width * scale))
      const height = Math.max(1, Math.round(bitmap.height * scale))
      if (scale === 1 && file.size <= 900 * 1024 && role !== 'angle') return file
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) return file
      if (profile.type === 'image/jpeg') {
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, width, height)
      }
      context.drawImage(bitmap, 0, 0, width, height)
      bitmap.close?.()
      const blob = await canvasToBlob(canvas, profile.type, profile.quality)
      if (!blob || blob.size <= 0) return file
      if (blob.size >= file.size && scale === 1) return file
      const extension = profile.type === 'image/png' ? '.png' : '.jpg'
      const baseName = file.name.replace(/\.[^.]+$/, '') || role
      return new File([blob], `${baseName}-compressed${extension}`, { type: blob.type || profile.type })
    } catch {
      return file
    }
  }

  async function buildAngle01ShoePositionBoard(productReferences: Array<{ image: File; name: string }>) {
    if (productReferences.length === 0) return null
    const canvas = document.createElement('canvas')
    canvas.width = 540
    canvas.height = 720
    const context = canvas.getContext('2d')
    if (!context) return null
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    const targetBoxes = [
      { left: 0.361, top: 0.176, width: 0.494, height: 0.415 },
      { left: 0.11, top: 0.349, width: 0.556, height: 0.43 },
    ]
    context.lineWidth = 4
    context.strokeStyle = '#202020'
    context.fillStyle = 'rgba(32,32,32,0.04)'
    targetBoxes.forEach((box) => {
      const x = box.left * canvas.width
      const y = box.top * canvas.height
      const width = box.width * canvas.width
      const height = box.height * canvas.height
      context.fillRect(x, y, width, height)
      context.strokeRect(x, y, width, height)
      const centerX = x + width / 2
      const centerY = y + height / 2
      context.beginPath()
      context.arc(centerX, centerY, 7, 0, Math.PI * 2)
      context.fillStyle = '#202020'
      context.fill()
      context.beginPath()
      context.moveTo(centerX - 16, centerY)
      context.lineTo(centerX + 16, centerY)
      context.moveTo(centerX, centerY - 16)
      context.lineTo(centerX, centerY + 16)
      context.stroke()
      context.fillStyle = 'rgba(32,32,32,0.04)'
    })
    context.setLineDash([10, 8])
    context.lineWidth = 3
    context.strokeStyle = '#606060'
    context.beginPath()
    context.moveTo(0.555 * canvas.width, 0.58 * canvas.height)
    context.lineTo(0.592 * canvas.width, 0.556 * canvas.height)
    context.stroke()
    context.setLineDash([])
    const blob = await canvasToBlob(canvas, 'image/png')
    if (!blob || blob.size <= 0) return null
    return new File([blob], 'merge-angle01-position-board.png', { type: 'image/png' })
  }

  async function buildAngle05ShoePositionBoard(productReferences: Array<{ image: File; name: string }>) {
    if (productReferences.length === 0) return null
    const canvas = document.createElement('canvas')
    canvas.width = 540
    canvas.height = 720
    const context = canvas.getContext('2d')
    if (!context) return null
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    const targetBoxes = [
      { left: 0.094, top: 0.492, width: 0.591, height: 0.358 },
      { left: 0.424, top: 0.164, width: 0.426, height: 0.424 },
    ]
    for (let index = 0; index < targetBoxes.length; index += 1) {
      const reference = productReferences[index] || productReferences[0]
      if (!reference) continue
      try {
        const bitmap = await createImageBitmap(reference.image)
        const box = targetBoxes[index]
        const x = box.left * canvas.width
        const y = box.top * canvas.height
        const width = box.width * canvas.width
        const height = box.height * canvas.height
        const scale = Math.min(width / bitmap.width, height / bitmap.height)
        const drawWidth = bitmap.width * scale
        const drawHeight = bitmap.height * scale
        const drawX = x + (width - drawWidth) / 2
        const drawY = y + (height - drawHeight) / 2
        context.drawImage(bitmap, drawX, drawY, drawWidth, drawHeight)
        bitmap.close?.()
      } catch {
        // Skip unreadable product references; the original product images are still uploaded separately.
      }
    }
    const blob = await canvasToBlob(canvas, 'image/png')
    if (!blob || blob.size <= 0) return null
    return new File([blob], 'merge-angle05-position-board.png', { type: 'image/png' })
  }

  function snapMergeDimension(value: number) {
    return Math.max(256, Math.min(4096, Math.round(value / 8) * 8))
  }

  function scaleMergeSizeToResolution(width: number, height: number, resolution: MergeImageResolution) {
    const ratio = width > 0 && height > 0 ? width / height : 1
    const longSide = mergeImageResolutionOptions.find((item) => item.value === resolution)?.longSide || 1024
    const outputWidth = ratio >= 1 ? longSide : longSide * ratio
    const outputHeight = ratio >= 1 ? longSide / ratio : longSide
    return `${snapMergeDimension(outputWidth)}x${snapMergeDimension(outputHeight)}`
  }

  function normalizeMergeAutoSize(width: number, height: number) {
    return scaleMergeSizeToResolution(width, height, mergeImageResolution)
  }

  async function resolveMergeOutputSize(backgroundFile: File) {
    if (mergeImageSize === 'custom') {
      const width = clampMergeDimension(mergeCustomWidth, 1536)
      const height = clampMergeDimension(mergeCustomHeight, 1152)
      return scaleMergeSizeToResolution(width, height, mergeImageResolution)
    }
    if (mergeImageSize === 'auto') {
      const naturalSize = await getImageNaturalSize(backgroundFile)
      return normalizeMergeAutoSize(naturalSize.width, naturalSize.height)
    }
    const match = mergeImageSize.match(/(\d+)\s*[x×]\s*(\d+)/i)
    if (match) {
      return scaleMergeSizeToResolution(Number(match[1]), Number(match[2]), mergeImageResolution)
    }
    return scaleMergeSizeToResolution(1024, 1365, mergeImageResolution)
  }

  // Legacy builders are kept for rollback/reference; the UI no longer exposes separate hand/single-foot angle slots.
  void buildSingleFootAngleControl
  void buildHandAngleControl

  async function oneClickMergeImage() {
    if (!skill) return
    const productFiles = mergeImageFiles.product || []
    const backgroundFile = (mergeImageFiles.background || [])[0]
    const selectedLibraryAngles = selectedMergeAngleIds
      .map((id) => mergeAngleLibrary.find((item) => item.id === id))
      .filter((item): item is (typeof mergeAngleLibrary)[number] => Boolean(item))
      .slice(0, mergeAngleBatchLimit)
    if (productFiles.length === 0 || !backgroundFile || selectedLibraryAngles.length === 0) {
      setError('请上传产品鞋图、背景图，并在角度库选择一个角度。')
      return
    }
    if (selectedMergeAngleIds.length > mergeAngleBatchLimit) {
      setError(`一次最多选择 ${mergeAngleBatchLimit} 个角度生成。`)
      return
    }
    const outputSize = await resolveMergeOutputSize(backgroundFile)
    const userDemand = buildMergeImageUserDemand(brief)
    const effectiveBrief = buildMergeImageBrief(userDemand || 'Generate one final realistic product shoe-on-foot composite.')
    const controller = startWorkflowRequest()
    setLoading(true)
    setGenerating(true)
    setError('')
    setOperationStatus(isMergeImageSkill ? '' : '正在调用后台 GPT 生图 API，一键生成融合图...')
    setAnalysis(null)
    setDirectionResult(null)
    setImageResult(null)
    setImageResults([])
    setUploadedFiles([])
    const generationAngles: Array<{
      id: string
      label: string
      url: string
      uploadedFile: File | null
    }> = selectedLibraryAngles
      .map((item) => ({ id: item.id, label: item.label, url: item.url, uploadedFile: null }))
      .sort((a, b) => {
        if (a.id === 'angle-03' && b.id === 'angle-04') return -1
        if (a.id === 'angle-04' && b.id === 'angle-03') return 1
        return 0
      })
    setPendingPreviewCards(generationAngles.map((item) => ({ id: item.id, title: `${item.label} 生图中` })))
    try {
      const compressedProductFiles = await Promise.all(productFiles.map(async (file, index) => ({
          image: await compressMergeReferenceFile(file, 'product'),
          name: `merge-product-${index + 1}-${file.name}`,
        })))
      const compressedBackgroundFile = { image: await compressMergeReferenceFile(backgroundFile, 'background'), name: `merge-background-${backgroundFile.name}` }
      const uploadedModelFile = (mergeImageFiles.model || [])[0] || null
      const compressedModelFile = uploadedModelFile
        ? {
            image: await compressMergeReferenceFile(uploadedModelFile, 'model'),
            name: `merge-model-${uploadedModelFile.name}`,
          }
        : null
      const generatedImages: GeneratedImage[] = []
      let lastGenerated: ImageResult | null = null
      let angle03BaseOutputForAngle04: File | null = null
      const shouldUseAngle03AsAngle04Base = productFiles.length > 1
        && generationAngles.some((item) => item.id === 'angle-03')
        && generationAngles.some((item) => item.id === 'angle-04')
      for (const angleItem of generationAngles) {
        const angleProductFiles = selectMergeProductsForAngle(compressedProductFiles, angleItem.id)
        const sharedFiles = [
          ...angleProductFiles,
          compressedBackgroundFile,
        ]
        const useUploadedModelOutfitReference = shouldUseModelOutfitReference(angleItem.id) && Boolean(compressedModelFile)
        if (useUploadedModelOutfitReference && compressedModelFile) {
          sharedFiles.push(compressedModelFile)
        }
        const useAngle03BaseOutputForAngle04 = shouldUseAngle03AsAngle04Base
          && angleItem.id === 'angle-04'
          && Boolean(angle03BaseOutputForAngle04)
        const angle01PositionBoardFile = angleItem.id === 'angle-01'
          ? await buildAngle01ShoePositionBoard(angleProductFiles)
          : null
        const angle05PositionBoardFile = angleItem.id === 'angle-05'
          ? await buildAngle05ShoePositionBoard(angleProductFiles)
          : null
        const angleFile = angleItem.uploadedFile || await fileFromAsset(angleItem.url, `${angleItem.id}.png`)
        const useLibraryCoordinateControl = !angleItem.uploadedFile && shouldUseLibraryCoordinateControl(angleItem.id)
        const useLibraryAngleControlImage = !angleItem.uploadedFile && shouldUseLibraryAngleControlImage(angleItem.id)
        const fixedLegReferenceFile = useLibraryCoordinateControl
          ? await fileFromAsset(fixedSingleFootLegReferenceUrl, 'angle-03-fixed-leg-reference.png')
          : null
        const fixedLegReferenceUpload = fixedLegReferenceFile
          ? {
              image: fixedLegReferenceFile,
              name: `merge-model-fixed-angle-leg-reference-${angleItem.id}.png`,
            }
          : null
        const cleanedAngleControl = angleItem.uploadedFile || useLibraryCoordinateControl
          ? await buildCleanedAngleControl(angleFile)
          : useLibraryAngleControlImage
          ? await buildCleanedAngleControl(angleFile)
          : null
        const uploadedAngleIsRealPhoto = Boolean(angleItem.uploadedFile && cleanedAngleControl && !cleanedAngleControl.file)
        const fixedSingleFootReferenceLock = buildFixedSingleFootReferenceLock(angleItem.id)
        const angle06ReferenceLock = buildAngle06ReferenceLock(angleItem.id)
        const angle06YellowEdgeDistanceLock = !angleItem.uploadedFile && shouldUsePromptOnlyAngle(angleItem.id)
          ? await describeAngle06YellowEdgeDistances(angleFile)
          : ''
        const angleLayoutBrief = angleItem.uploadedFile
          ? [cleanedAngleControl?.layout].filter(Boolean).join('\n\n')
          : shouldUsePromptOnlyAngle(angleItem.id)
            ? [angle06ReferenceLock, angle06YellowEdgeDistanceLock].filter(Boolean).join('\n\n')
          : useLibraryCoordinateControl && cleanedAngleControl?.layout
            ? [cleanedAngleControl.layout, fixedSingleFootReferenceLock].filter(Boolean).join('\n\n')
          : useLibraryAngleControlImage && cleanedAngleControl?.layout
              ? [cleanedAngleControl.layout, angle06ReferenceLock].filter(Boolean).join('\n\n')
            : await describeAngleColorBlocks(angleFile, `${angleItem.label} / ${angleItem.id}`)
        const uploadedAngleSmartAnalysis = ''
        const uploadedAnglePrompt = angleItem.uploadedFile
          ? buildUploadedAngleGenerationPrompt([
              uploadedAngleIsRealPhoto ? 'REAL PHOTO ANGLE REFERENCE' : '',
              uploadedAngleSmartAnalysis,
            ].filter(Boolean).join('\n'))
          : ''
        const prompt = [
          angleItem.uploadedFile ? '' : mergeImageStrictReferenceLogic,
          angleItem.uploadedFile
            ? uploadedAnglePrompt
            : `Selected angle-library template: ${angleItem.label} (${angleItem.id}.png). This merge-angle image is the only pose/composition/semantic-mask template for this generation.`,
          angleItem.uploadedFile ? '' : mergeAnglePosePrompts[angleItem.id],
          angleItem.uploadedFile ? '' : mergeAngleRoleLocks[angleItem.id],
          angleItem.uploadedFile ? '' : mergeAnglePrecisionLocks[angleItem.id],
          angleItem.id === 'angle-05' && angle05PositionBoardFile
            ? 'ANGLE-05 HIDDEN SHOE-POSITION BOARD: a hidden product-shoe position board is included for angle-05. Use it only to lock the two shoes into the fixed lower-left and upper-right target areas and to keep their distance compact. The board uses a pure white placeholder background only to avoid transparent/gray control haze; do not copy the board white background, pasted-photo background, transparency, edges, lighting, flat layout style, haze, fog, or overlay into the final image.'
            : '',
          angleItem.id === 'angle-01' && angle01PositionBoardFile
            ? 'ANGLE-01 HIDDEN OUTLINE POSITION BOARD: a hidden pure coordinate/outline board is included for angle-01. It contains only neutral target boxes, center marks, and a nearest-gap line; it contains no product shoe photo and no product design. Use it only to match the two-shoe spacing from the current angle-01 reference: upper/right worn shoe target box about left 36.1%, top 17.6%, width 49.4%, height 41.5%; lower-left hand-supported shoe target box about left 11.0%, top 34.9%, width 55.6%, height 43.0%; center delta about X22.0% / Y18.0%; nearest yellow-to-yellow boundary gap about 4.94% of canvas width / 3.70% of canvas height. Product reference 1 corresponds to the upper/right worn shoe; product reference 2 corresponds to the lower-left hand-supported shoe. The board controls placement distance, target bounding areas, center points, and equal product prominence only; do not copy the board white background, gray/black outlines, center marks, dashed line, flat layout style, lighting, haze, fog, overlay, or any visual guide mark into the final image.'
            : '',
          angleItem.uploadedFile ? '' : fixedSingleFootReferenceLock,
          angleItem.uploadedFile ? '' : angle06ReferenceLock,
          angleItem.uploadedFile ? '' : angle06YellowEdgeDistanceLock,
          angleItem.uploadedFile ? '' : mergeAngleAddedPosePrompts[angleItem.id],
          useAngle03BaseOutputForAngle04
            ? 'ANGLE-04 FROM ANGLE-03 BASE OUTPUT MODE: This angle-04 generation receives the finished angle-03 image from the same batch as a base visual reference. Keep the generated angle-03 background, camera crop, leg anatomy, leg position, skin tone, shoe position, shoe size, shoe direction, perspective, contact shadow, highlight direction, exposure, and overall lighting exactly consistent. Replace only the worn shoe identity with product shoe reference 2. Product shoe reference 2 controls only shoe appearance, color, material, logo, stitching, straps/laces/buckles, sole, toe, heel, and texture. Do not repaint the background, do not change the leg, do not change shoe scale, and do not move or rotate the shoe away from the angle-03 base output.'
            : '',
          buildMergeProductAssignmentPrompt(angleProductFiles.length, angleItem.id),
          useLibraryCoordinateControl
            ? 'Fixed leg and magenta auxiliary reference image is provided as a hidden body-geometry reference for angle-03 and angle-04 only. Use the leg area only for model leg anatomy, calf shape, fair translucent skin tone, fine natural skin texture, leg size, ankle size, leg curvature, and natural leg structure. The final leg must be white/fair, clean, evenly toned, and naturally textured. Use the original angle yellow/S region as the exact shoe position, size, angle, direction, and bounding-area authority. Use the magenta region only as a secondary rough shoe-area hint, never as the primary placement source. Do not render magenta color, and do not copy any shoe appearance, product color, white background, props, lighting, shadows, or scene from this hidden reference. The uploaded background image is the only environment source, and the uploaded product shoe image is the only shoe appearance source.'
            : useUploadedModelOutfitReference
              ? 'Uploaded model reference image is provided for angle-05 / angle-06 only. Use it only for the model outfit and styling: clothing category, clothing color, fabric, drape, silhouette, hem/waistband details, and lower-body styling that supports the shoe display. Do not copy the model reference shoes, do not copy the model reference background, wall, floor, props, lighting, watermark, face, head, portrait, or full upper body. The selected angle mask still controls pose, crop, body-part placement, shoe placement, and occlusion; the uploaded product shoe image still controls shoe appearance 100%.'
              : 'No model reference image is uploaded. Generate simple natural body limbs/clothing only as required by the selected angle-library reference.',
          'Lower-body-only framing: never generate the model face, head, portrait, or full upper body. Keep the crop focused on shoes, feet, legs, hands if present in the angle mask, and only the clothing portion required around the lower body.',
          uploadedAngleIsRealPhoto
            ? 'The uploaded real angle photo must dominate pose and camera: shoe count, shoe placement, shoe direction, toe direction, heel direction, shoe angle, body-facing direction, foot/leg/hand/arm pose, camera height, lens perspective, scale relationship, crop, overlap, and occlusion must follow the real angle photo rather than the product photo or model photo. Do not convert it into a color-block mask workflow.'
            : 'The angle mask plus code-generated structure analysis must dominate pose and shoe layout: shoe count, shoe placement, shoe direction, toe direction, heel direction, body-facing direction, hand/foot candidate roles, shoe-limb bindings, depth ordering, camera angle, scale relationship, and occlusion must follow the angle reference rather than the product photo or model photo.',
          uploadedAngleIsRealPhoto
            ? 'The product shoe image must dominate shoe identity: replace the shoe identity in the real angle photo with the exact uploaded product shoe while preserving the real photo shoe placement, angle, size, toe direction, heel direction, perspective, worn/display role, hand/foot relationship, and occlusion. The final shoe must match the uploaded product shoe image 100%.'
            : 'The product shoe image must dominate shoe identity: redraw the exact uploaded product shoe according to the S/yellow placement and angle reference objects. Yellow/S objects only control shoe placement, angle, size, toe direction, heel position, perspective, and worn/display role; they never control shoe exterior appearance, silhouette, color, material, shape, style, sole, heel, toe, straps, buckles, laces, or details. The final shoe must match the uploaded product shoe image 100%.',
          'The background image must dominate environment: use the uploaded background exactly as it is, preserving only visible existing elements, lighting direction, color temperature, soft shadows, relative positions, scale, crop, perspective, and occlusion. Do not create any new background structure, edge line, room feature, prop, texture, or pattern that is not already visible. Do not use the model reference background.',
          userDemand ? 'Secondary user text demand, obey only when it does not conflict with the angle mask, model reference, product shoe lock, or background lock: ' + userDemand : '',
        ].filter(Boolean).join('\n')
        const generateForm = new FormData()
        generateForm.append('skillId', skill.id)
        generateForm.append('brief', effectiveBrief)
        generateForm.append('prompt', prompt)
        generateForm.append('size', outputSize)
        generateForm.append('angleSource', angleItem.uploadedFile ? (uploadedAngleIsRealPhoto ? 'User uploaded real photo angle reference' : 'User uploaded semantic color-block angle reference') : `${angleItem.label} / ${angleItem.id}`)
        generateForm.append('angleLayout', angleLayoutBrief)
        sharedFiles.forEach(({ image, name }) => generateForm.append('images', image, name))
        if (cleanedAngleControl?.file) {
          generateForm.append('images', cleanedAngleControl.file, `merge-angle-control-${cleanedAngleControl.file.name}`)
        }
        if (fixedLegReferenceUpload) {
          generateForm.append('images', fixedLegReferenceUpload.image, fixedLegReferenceUpload.name)
        }
        if (useAngle03BaseOutputForAngle04 && angle03BaseOutputForAngle04) {
          generateForm.append('images', angle03BaseOutputForAngle04, 'merge-angle03-base-output-for-angle04.png')
        }
        if (angle05PositionBoardFile) {
          generateForm.append('images', angle05PositionBoardFile, angle05PositionBoardFile.name)
        }
        if (angle01PositionBoardFile) {
          generateForm.append('images', angle01PositionBoardFile, angle01PositionBoardFile.name)
        }
        generateForm.append('images', await compressMergeReferenceFile(angleFile, 'angle'), `merge-angle-${angleFile.name}`)
        const generateResponse = await fetch('/api/run/merge-image-generate', {
          method: 'POST',
          body: generateForm,
          signal: controller.signal,
        })
        const generated = await readJsonResponse(generateResponse) as ImageResult & { uploadedFiles?: UploadedFile[]; error?: string }
        if (!generateResponse.ok) throw new Error(generated.error || `${angleItem.label} 生图失败。`)
        lastGenerated = generated
        generatedImages.push({
          id: crypto.randomUUID(),
          directionId: angleItem.id,
          imageUrl: generated.imageUrl,
          svgUrl: generated.svgUrl || '',
          title: angleItem.uploadedFile ? angleItem.label : angleItem.label,
          size: outputSize,
        })
        setImageResults([...generatedImages])
        setPendingPreviewCards(generationAngles.slice(generatedImages.length).map((item) => ({ id: item.id, title: `${item.label} 生图中` })))
        if (shouldUseAngle03AsAngle04Base && angleItem.id === 'angle-03') {
          angle03BaseOutputForAngle04 = await fileFromGeneratedImageUrl(generated.imageUrl, 'merge-angle03-base-output-for-angle04.png')
        }
      }
      if (lastGenerated) setImageResult(lastGenerated)
      setPendingPreviewCards([])
      setPromptConfirmed(false)
      setOperationStatus('')
    } catch (mergeError) {
      if (isAbortError(mergeError)) {
        setError('')
        return
      }
      setError(mergeError instanceof Error ? mergeError.message : '一键生图失败。')
      setPendingPreviewCards([])
    } finally {
      setLoading(false)
      setGenerating(false)
      if (workflowAbortRef.current === controller) workflowAbortRef.current = null
    }
  }

  function buildMultiAngleBrief(baseBrief: string) {
    if (!isMultiAngleSkill) return baseBrief
    const uploadedAngles = multiAngleSlots
      .filter((slot) => (multiAngleFiles[slot.id] || []).length > 0)
      .map((slot) => `${slot.label}: ${multiAngleFiles[slot.id].length} 张`)
      .join('\n')
    const modeText =
      multiAngleOutputMode === 'combined'
        ? '生成在同一张图片里，排版为多角度视图合集'
        : '分开生成，每个角度单独输出图片'
    const optionBrief = [
      '产品多角度视图专属配置：',
      `导出视图数量：${multiAngleViewCount} 个视图`,
      `输出方式：${modeText}`,
      '已上传角度：',
      uploadedAngles || '未按角度上传图片，但可能已通过通用参考图上传。',
      '一致性硬性要求：生成结果必须严格保持参考产品的同一 SKU 外观，不改变颜色、材质、比例、结构、Logo、标签、文字位置、纹理、接口、配件和包装信息。',
      '如果缺少某些角度，只能保守推断；隐藏结构不能确定时请在分析中标注风险。',
    ].join('\n')
    return [baseBrief.trim(), optionBrief].filter(Boolean).join('\n\n')
  }

  function selectMockupReferenceImages(files: FileList | File[] | null) {
    if (!files) return
    const pickedFiles = Array.from(files)
    const images = pickedFiles.filter((file) => file.type.startsWith('image/'))
    if (pickedFiles.length > 0 && images.length === 0) {
      setError('请上传图片作为样机参考图。')
      return
    }
    setError('')
    setMockupReferenceImages((current) => {
      const next = [...current, ...images].slice(0, 6)
      rememberLogoSelections({ mockupReferenceImages: next })
      return next
    })
  }

  function handleMockupReferenceDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsDraggingMockupReference(true)
  }

  function handleMockupReferenceDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDraggingMockupReference(false)
    }
  }

  function handleMockupReferenceDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDraggingMockupReference(false)
    selectMockupReferenceImages(event.dataTransfer.files)
  }

  function removeMockupReferenceImage(indexToRemove: number) {
    setMockupReferenceImages((current) => {
      const next = current.filter((_, index) => index !== indexToRemove)
      rememberLogoSelections({ mockupReferenceImages: next })
      return next
    })
  }

  function showLightboxImage(item: LightboxItem) {
    setLightboxZoom(1)
    setLightboxPan({ x: 0, y: 0 })
    setLightboxDrag(null)
    setLightboxConvertedSvgUrl('')
    setLightboxStatus('')
    setLightboxImage(item)
  }

  function openLightbox(imageUrl: string, title: string, items: LightboxItem[] = []) {
    const nextItems = items.length > 0 ? items : [{ imageUrl, title }]
    setLightboxItems(nextItems)
    showLightboxImage(nextItems.find((item) => item.imageUrl === imageUrl) || nextItems[0])
  }

  function resetLightboxView() {
    setLightboxZoom(1)
    setLightboxPan({ x: 0, y: 0 })
    setLightboxDrag(null)
  }

  function closeLightbox() {
    resetLightboxView()
    setLightboxConvertedSvgUrl('')
    setLightboxStatus('')
    setLightboxImage(null)
    setLightboxItems([])
  }

  function updateLightboxSvgUrl(imageUrl: string, svgUrl: string) {
    setLightboxImage((current) => current?.imageUrl === imageUrl ? { ...current, svgUrl } : current)
    setLightboxItems((current) => current.map((item) => item.imageUrl === imageUrl ? { ...item, svgUrl } : item))
    setImageResults((current) => current.map((item) => item.imageUrl === imageUrl ? { ...item, svgUrl } : item))
    setProjects((current) =>
      current.map((project) => ({
        ...project,
        images: project.images.map((image) => image.imageUrl === imageUrl ? { ...image, svgUrl } : image),
      })),
    )
  }

  function moveLightbox(delta: number) {
    if (!lightboxImage || lightboxItems.length <= 1) return
    const currentIndex = lightboxItems.findIndex((item) => item.imageUrl === lightboxImage.imageUrl)
    const safeIndex = currentIndex >= 0 ? currentIndex : 0
    const nextIndex = (safeIndex + delta + lightboxItems.length) % lightboxItems.length
    showLightboxImage(lightboxItems[nextIndex])
  }

  function zoomLightbox(nextZoom: number) {
    const clampedZoom = Math.min(5, Math.max(0.5, nextZoom))
    setLightboxZoom(clampedZoom)
    if (clampedZoom <= 1) {
      setLightboxPan({ x: 0, y: 0 })
      setLightboxDrag(null)
    }
  }

  function handleLightboxWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault()
    const direction = event.deltaY < 0 ? 1 : -1
    const step = event.ctrlKey ? 0.28 : 0.16
    zoomLightbox(lightboxZoom + direction * step)
  }

  function handleLightboxPointerDown(event: MouseEvent<HTMLDivElement>) {
    if (lightboxZoom <= 1) return
    event.preventDefault()
    setLightboxDrag({
      startX: event.clientX,
      startY: event.clientY,
      x: lightboxPan.x,
      y: lightboxPan.y,
    })
  }

  function handleLightboxPointerMove(event: MouseEvent<HTMLDivElement>) {
    if (!lightboxDrag) return
    setLightboxPan({
      x: lightboxDrag.x + event.clientX - lightboxDrag.startX,
      y: lightboxDrag.y + event.clientY - lightboxDrag.startY,
    })
  }

  function stopLightboxDrag() {
    setLightboxDrag(null)
  }

  function toggleGenerationTarget(directionId: string) {
    setSelectedGenerationIds((current) =>
      current.includes(directionId) ? current.filter((id) => id !== directionId) : [...current, directionId],
    )
  }

  function toggleDeliverySelection(optionId: string) {
    setSelectedDeliveryIds((current) => {
      const next = current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]
      rememberLogoSelections({ selectedDeliveryIds: next })
      return next
    })
  }

  async function confirmReferences() {
    if (!analysis) return
    if (hasOptionStep && selectedDeliveryIds.length === 0) {
      setError('请至少选择一个输出方向。')
      setViewStep(stepIndex.options)
      return
    }
    setLoading(true)
    setError('')
    const controller = startWorkflowRequest()
    try {
      const response = await fetch('/api/run/confirm-references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          projectId: analysis.projectId,
          selectedReferenceFiles: checkedReferences,
          selectedDeliveryIds,
          selectedThemeDirection,
          selectedInferredChoices: getSelectedInferredChoicePayload(),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '确认失败。')

      const nextDirection = data as DirectionResult
      setViewStep(stepIndex.direction)
      setDirectionResult(nextDirection)
      setSelectedDirection(nextDirection.directions[0]?.id || '')
      setGenerationScope('single')
      setSelectedGenerationIds([])
      setLogoVariantCount(1)
      setLogoMockupSize('1024x1024')
      setPromptText(nextDirection.imagePrompt.positive || '')
      setPromptConfirmed(false)
      setImageResult(null)
      setImageResults([])
      setExpansionResults([])
      setSelectedBaseImageId('')
      setExpansionSelections(isLogoSkill ? logoReuseState?.expansionSelections || expansionSelections : [])
      setExpansionDetails(isLogoSkill ? logoReuseState?.expansionDetails || expansionDetails : {})
      setMockupReferenceImages(isLogoSkill ? logoReuseState?.mockupReferenceImages || mockupReferenceImages : [])
      setGenerationQueue([])
      setPendingPreviewCards([])
      setFailedDirections([])
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content:
            checkedReferences.length > 0
              ? `已确认 ${checkedReferences.length} 个参考资料。请选择一个方向后继续确认提示词。`
              : '你没有选择参考资料。现在将仅基于技能说明和需求继续。',
        },
      ])
    } catch (confirmError) {
      if (isAbortError(confirmError)) {
        setError('')
        return
      }
      setError(confirmError instanceof Error ? confirmError.message : '确认失败。')
    } finally {
      setLoading(false)
      if (workflowAbortRef.current === controller) workflowAbortRef.current = null
    }
  }

  function confirmPrompt() {
    setPromptConfirmed(true)
    setViewStep(stepIndex.generate)
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '提示词已确认。现在可以调用 gpt-image-2 生图。',
      },
    ])
  }

  function getExpansionOptions() {
    if (isLogoSkill && (imageResults.length > 0 || expansionResults.length > 0)) {
      return inferLogoMockupOptions(brief)
    }
    const skillExpansions = skill?.guidance?.deliveryOptions || []
    const options = skillExpansions.filter((item) => !item.id.endsWith('-main') && !item.id.includes('hero'))
    if (imageResults.length > 0 || expansionResults.length > 0) {
      return [
        ...options,
        {
          id: 'custom-followup',
          title: '文字调整',
          description: '直接按照底部输入的文字，对选中图片继续调整。',
          selected: false,
        },
      ]
    }
    return options
  }

  function getSelectedExpansions() {
    return getExpansionOptions().filter((item) => expansionSelections.includes(item.id))
  }

  useEffect(() => {
    if (!isLogoSkill || imageResults.length === 0 || expansionSelections.length > 0) return
    const recommended = inferLogoMockupOptions(brief).find((item) => item.selected)
    if (recommended) setExpansionSelections([recommended.id])
  }, [brief, expansionSelections.length, imageResults.length, isLogoSkill])

  function getExpansionFields(optionId: string): ExpansionField[] {
    if (isLogoSkill && optionId.startsWith('logo-mockup-')) {
      return [
        {
          id: 'requirements',
          label: '样机要求',
          placeholder: '例如：放在奶茶杯、外卖袋和门店灯箱上，加入自然桌面、暖光、材质阴影和品牌色延展，Logo 清晰不变形。',
        },
      ]
    }
    if (isLogoSkill && optionId === 'custom-followup') {
      return [
        {
          id: 'requirements',
          label: '自定义样机场景',
          placeholder: '例如：生成宠物玩具品牌的包装盒、吊牌和店铺门头样机，风格温暖可爱。',
        },
      ]
    }
    const fields: Record<string, ExpansionField[]> = {
      'icon-set': [
        {
          id: 'subjects',
          label: '要生成哪些图标',
          placeholder: '例如：搜索、购物车、优惠券、客服、物流、会员。会按分隔符拆开，每个单独生成一张。',
        },
      ],
      'icon-single': [
        {
          id: 'target',
          label: '要精修哪里',
          placeholder: '例如：玻璃质感更通透、边缘高光更明显、主体更立体、减少背景装饰',
        },
        {
          id: 'strength',
          label: '精修强度',
          options: ['轻微调整', '明显优化', '大幅重塑'],
        },
      ],
      'icon-angles': [
        {
          id: 'angle',
          label: '统一成什么角度',
          options: ['等轴侧 45°', '正视角', '轻俯视', '左前方', '右前方'],
        },
        {
          id: 'layout',
          label: '呈现方式',
          options: ['单张主图', '多角度对比', '九宫格集合'],
        },
      ],
      'icon-materials': [
        {
          id: 'material',
          label: '改成什么材质',
          options: ['毛玻璃', '透明玻璃', '软糖凝胶', '金属铬', '陶瓷釉面', '液态金属'],
        },
        {
          id: 'color',
          label: '颜色系统',
          placeholder: '例如：蓝紫科技感、蓝黄高亮、银白透明、粉橙渐变',
        },
      ],
      'custom-followup': [
        {
          id: 'requirements',
          label: '调整要求',
          placeholder: '例如：把当前图标改成毛玻璃材质，保留蓝色科技感和等轴侧视角。',
        },
      ],
      'logo-symbol': [
        {
          id: 'requirements',
          label: '图形标要求',
          placeholder: '例如：只保留山水和云雾元素，不要文字，适合头像和 favicon。',
        },
      ],
      'logo-wordmark': [
        {
          id: 'requirements',
          label: '文字标要求',
          placeholder: '例如：中文更现代，英文更细长，整体高级简洁，字距更舒展。',
        },
      ],
      'logo-combination': [
        {
          id: 'layout',
          label: '组合方式',
          options: ['图左字右', '图上字下', '圆形徽章', '横版组合', '竖版组合'],
        },
        {
          id: 'requirements',
          label: '组合要求',
          placeholder: '例如：中文在上、英文在下，图形和文字可以拆开独立使用。',
        },
      ],
      'logo-colorways': [
        {
          id: 'colorway',
          label: '配色版本',
          options: ['黑白版', '主色版', '反白版', '金色高级版', '自然绿色版', '科技蓝版'],
        },
      ],
      'logo-usage': [
        {
          id: 'scene',
          label: '应用场景',
          options: ['门头招牌', '包装盒', '杯身/瓶身', '名片', '社媒头像', 'App 图标'],
        },
        {
          id: 'requirements',
          label: '预览要求',
          placeholder: '例如：放在茶叶包装和门店招牌上，保持 Logo 扁平清晰。',
        },
      ],
      'ip-three-view': [
        {
          id: 'viewType',
          label: '三视图类型',
          options: ['3D 三视图', '2D 平面三视图', '3D + 2D 都要'],
        },
        {
          id: 'consistency',
          label: '一致性要求',
          placeholder: '例如：严格保持当前主图的头身比、眼睛、核心视觉钩子和配色分区。',
        },
      ],
      'ip-expressions': [
        {
          id: 'style',
          label: '表情包风格',
          options: ['3D 哑光潮玩', '2D 粗黑描边', '3D + 2D 都要'],
        },
        {
          id: 'expressions',
          label: '表情清单',
          placeholder: '例如：傲娇、开心、俏皮、惊讶、愤怒、悲伤。留空则按默认 6 个表情。',
        },
      ],
      'ip-pose-sheet': [
        {
          id: 'style',
          label: '动作库风格',
          options: ['3D 哑光潮玩', '2D 粗黑描边', '3D + 2D 都要'],
        },
        {
          id: 'poses',
          label: '动作清单',
          placeholder: '例如：标准站姿、双手叉腰、蹲坐、挥手、奔跑、趴地。留空则按默认 6 个动作。',
        },
      ],
      'ip-merch': [
        {
          id: 'industryGroup',
          label: '周边行业分组',
          options: ['自动判断', '科技/互联网', '文创/教育', '潮玩/收藏', '餐饮/食品', '文旅/城市'],
        },
        {
          id: 'requirements',
          label: '周边要求',
          placeholder: '例如：六件套合图，笔记本居中，手机壳、咖啡纸杯、餐巾纸、毛绒钥匙扣和刺绣贴围绕展示。',
        },
      ],
      'ip-blind-box': [
        {
          id: 'theme',
          label: '盲盒主题',
          options: ['四季系列', '职业系列', '情绪系列', '节日系列', '自定义主题'],
        },
        {
          id: 'mode',
          label: '生图模式',
          options: ['产品陈列图', '场景故事海报墙', '两者都要'],
        },
        {
          id: 'requirements',
          label: '主题补充',
          placeholder: '例如：春日茶园、夏日冰饮、秋日桂花、冬日围炉、隐藏款山神茶灵。',
        },
      ],
      'ip-scenes': [
        {
          id: 'scene',
          label: '新场景主题',
          placeholder: '例如：门店新品发布、节日限定、城市打卡、包装互动、户外活动。',
        },
        {
          id: 'ratio',
          label: '画面比例',
          options: ['9:16 竖版海报', '16:9 横版海报', '1:1 社媒图'],
        },
      ],
      'ip-html-proposal': [
        {
          id: 'scope',
          label: '提案范围',
          options: ['完整品牌 IP 提案', '只整理当前已生成内容', '策略 + 应用拓展', '客户汇报简版'],
        },
        {
          id: 'requirements',
          label: '提案要求',
          placeholder: '例如：现代简洁，包含品牌背景、IP策略、方案展示、三视图、表情包、周边和方案对比。',
        },
      ],
      'set-add-selling-point': [
        {
          id: 'sellingPoint',
          label: '新增卖点',
          placeholder: '例如：防漏、快充、长续航、便携收纳。留空则按默认补充一张卖点页。',
        },
        {
          id: 'pageType',
          label: '画面页型',
          options: ['卖点页', '功能特写页', '使用场景页', '对比说明页', '配件清单页'],
        },
      ],
      'set-unify-style': [
        {
          id: 'style',
          label: '统一方向',
          placeholder: '例如：统一成自然干净的浅色棚拍，保留商品真实颜色，文字层级更清晰。',
        },
      ],
      'set-single-retouch': [
        {
          id: 'target',
          label: '优化重点',
          placeholder: '例如：商品主体更大、文字更清晰、减少背景装饰、加强材质细节。',
        },
      ],
      'set-resize': [
        {
          id: 'ratio',
          label: '目标比例',
          options: ['3:4', '4:3', '9:16', '16:9', '1:1', '1464×600'],
        },
        {
          id: 'requirements',
          label: '适配要求',
          placeholder: '例如：适配亚马逊 A+ 全宽图，保留主商品和核心卖点，不裁掉 logo。',
        },
      ],
    }
    return fields[optionId] || [
      {
        id: 'requirements',
        label: '补充扩展要求',
        placeholder: '说明你希望这次扩展具体改变什么、保留什么。',
      },
    ]
  }

  function updateExpansionDetail(optionId: string, fieldId: string, value: string) {
    setExpansionDetails((current) => {
      const next = {
        ...current,
        [optionId]: {
          ...(current[optionId] || {}),
          [fieldId]: value,
        },
      }
      rememberLogoSelections({ expansionDetails: next })
      return next
    })
  }

  function getExpansionDetailText(optionId: string) {
    const values = expansionDetails[optionId] || {}
    return getExpansionFields(optionId)
      .map((field) => {
        const value = values[field.id]?.trim()
        return value ? `${field.label}: ${value}` : ''
      })
      .filter(Boolean)
      .join('\n')
  }

  function splitIconSubjects(value: string) {
    return value
      .split(/[、,，;；\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  function buildExpansionTasks(baseImage: GeneratedImage, expansions: DeliveryOption[]) {
    return expansions.flatMap((expansion) => {
      const detailText =
        getExpansionDetailText(expansion.id) ||
        `按默认扩展方向执行：${expansion.title}。${expansion.description}`

      if (expansion.id === 'icon-set') {
        const subjects = splitIconSubjects(expansionDetails[expansion.id]?.subjects || '')
        if (subjects.length === 0) {
          return [{
            id: `${baseImage.id}-${expansion.id}-${crypto.randomUUID()}`,
            directionId: `${baseImage.directionId}-${expansion.id}`,
            title: expansion.title,
            description: expansion.description,
            expansion,
            detailText,
          }]
        }
        return subjects.map((subject) => ({
          id: `${baseImage.id}-${expansion.id}-${subject}-${crypto.randomUUID()}`,
          directionId: `${baseImage.directionId}-${expansion.id}-${subject}`,
          title: `${subject}图标`,
          description: expansion.description,
          expansion,
          detailText: [
            `单独生成图标: ${subject}`,
            '这是成套图标中的一个独立图标，不要把多个图标放在同一张图里。',
            `整套图标清单: ${subjects.join('、')}`,
          ].join('\n'),
        }))
      }

      return [{
        id: `${baseImage.id}-${expansion.id}-${crypto.randomUUID()}`,
        directionId: `${baseImage.directionId}-${expansion.id}`,
        title: expansion.title,
        description: expansion.description,
        expansion,
        detailText,
      }]
    })
  }

  async function retryFailedDirectionsWithReasoning(text: string, userMessage: ChatMessage) {
    if (!analysis || failedDirections.length === 0) return false
    setGenerating(true)
    setError('')
    setOperationStatus('Skills Expert 正在根据你的补充要求重新思考失败图片。')
    const controller = startWorkflowRequest()
    try {
      let data: { message?: string; promptPatch?: string } = {}
      try {
        const response = await fetch('/api/run/reason-followup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            projectId: analysis.projectId,
            userRequest: text,
            failedDirections,
            currentPrompt: promptText,
          }),
        })
        data = (await readJsonResponse(response)) as { message?: string; promptPatch?: string; error?: string }
        if (!response.ok) {
          data = {
            message: '推理接口暂时失败，我会先按你的文字要求直接重试失败图片。',
            promptPatch: text,
          }
        }
      } catch {
        data = {
          message: '推理接口暂时失败，我会先按你的文字要求直接重试失败图片。',
          promptPatch: text,
        }
      }
      const promptPatch = String(data.promptPatch || text)
      setMessages((current) => [
        ...current,
        userMessage,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.message || `我会按你的补充要求重试 ${failedDirections.length} 张失败图片。`,
        },
      ])
      setGenerationQueue(failedDirections.map((direction) => direction.id))
      setPendingPreviewCards((current) => [
        ...current,
        ...failedDirections.map((direction) => ({ id: direction.id, title: direction.title })),
      ])
      const { results, failures } = await generateDirections(failedDirections, promptPatch, controller.signal)
      if (results.length > 0) {
        setImageResult({ imageUrl: results[0].imageUrl, revisedPrompt: results[0].revisedPrompt })
        setSelectedBaseImageId((current) => current || results[0].id)
      }
      setFailedDirections(failures)
      if (failures.length) {
        setError(`还有 ${failures.length} 张生成失败，可以继续在底部描述要求后重试。`)
      } else {
        setError('')
        setOperationStatus('失败图片已重新生成完成。')
      }
      return true
    } catch (retryError) {
      if (isAbortError(retryError)) {
        setError('')
        return true
      }
      setError(retryError instanceof Error ? retryError.message : '重试失败。')
      return true
    } finally {
      setGenerating(false)
      setGenerationQueue([])
      setPendingPreviewCards([])
      if (workflowAbortRef.current === controller) workflowAbortRef.current = null
    }
  }

  async function submitFollowUp() {
    const text = followUpText.trim()
    if (!text) return
    if (!skill) return
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    }
    setFollowUpText('')
    setOperationStatus('')

    if (failedDirections.length > 0) {
      await retryFailedDirectionsWithReasoning(text, userMessage)
      return
    }

    if (adjustableImages.length > 0) {
      setExpansionSelections(['custom-followup'])
      setExpansionDetails({
        'custom-followup': {
          requirements: text,
        },
      })
      setViewStep(stepIndex.expansion)
      setMessages((current) => [
        ...current,
        userMessage,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '已把你的文字需求放入「文字调整」。请选择要调整的图片后，可以直接生成扩展图。',
        },
      ])
      return
    }

    setLoading(true)
    setViewStep(stepIndex.brief)
    setError('')
    setMessages((current) => [...current, userMessage])
    const controller = startWorkflowRequest()
    try {
      const response = await fetch('/api/run/brief-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          skillId: skill.id,
          currentBrief: brief,
          userMessage: text,
          history: messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      })
      const data = await readJsonResponse(response) as {
        message?: string
        updatedBrief?: string
        readyToAnalyze?: boolean
        providerError?: string
        error?: string
      }
      if (!response.ok) throw new Error(data.error || '需求整理失败。')
      if (data.updatedBrief) setBrief(data.updatedBrief)
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.message || '我已根据当前技能整理了你的需求，可以继续补充或发送给技能。',
        },
      ])
      setOperationStatus(
        data.providerError
          ? `智能推理暂时不可用，已改用本地规则整理：${toUserFacingChineseError(data.providerError)}`
          : data.readyToAnalyze
            ? '需求已整理完整，可以点击「发送给技能」进入下一步。'
            : '已更新上方需求输入框，你可以继续对话补充。',
      )
    } catch (chatError) {
      if (isAbortError(chatError)) {
        setError('')
        return
      }
      const fallbackBrief = [brief.trim(), text].filter(Boolean).join('\n')
      setBrief(fallbackBrief)
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: chatError instanceof Error
            ? `需求推理暂时失败，我先把你的内容整理进输入框：${chatError.message}`
            : '需求推理暂时失败，我先把你的内容整理进输入框。',
        },
      ])
    } finally {
      setLoading(false)
      if (workflowAbortRef.current === controller) workflowAbortRef.current = null
    }
  }

  async function generateImageForDirection(
    directionId: string,
    directionTitle: string,
    prompt?: string,
    referenceImageUrl?: string,
    signal?: AbortSignal,
    sizeOverride?: string,
    extraReferenceImages: File[] = [],
  ) {
    const promptSource = prompt || promptText.trim()
    if (!analysis || !promptSource) {
      throw new Error('请先确认提示词。')
    }
    const uploadReferenceNote = uploadedFiles.length
      ? `\n\n已上传 ${uploadedFiles.length} 张参考图。生成时必须把上传图作为产品主体/设计参考，保留真实产品的外形、颜色、材质、比例、文字和关键细节。`
      : ''
    const requestSize = sizeOverride || directionResult?.imagePrompt.size || '1024x1024'
    const requestPrompt = `${promptSource}${uploadReferenceNote}`
    const response = extraReferenceImages.length
      ? await fetch('/api/run/generate-image', {
          method: 'POST',
          body: (() => {
            const formData = new FormData()
            formData.append('projectId', analysis.projectId)
            formData.append('prompt', requestPrompt)
            formData.append('size', requestSize)
            formData.append('directionId', directionId)
            formData.append('directionTitle', directionTitle)
            if (referenceImageUrl) formData.append('referenceImageUrl', referenceImageUrl)
            extraReferenceImages.forEach((image) => formData.append('images', image))
            return formData
          })(),
          signal,
        })
      : await fetch('/api/run/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: analysis.projectId,
            prompt: requestPrompt,
            size: requestSize,
            directionId,
            directionTitle,
            referenceImageUrl,
          }),
          signal,
        })
    const data = await readJsonResponse(response)
    if (!response.ok) throw new Error(data.error || '生图失败。')
    return data as ImageResult
  }

  function buildDirectionPrompt(direction: DirectionOption, extraInstruction = '') {
    const prompt = isDetailPageSkill
          ? [
              promptText.trim(),
              `生成这个详情页模块：${direction.title}。`,
              direction.description,
              '这是一张横向电商详情页模块。上传产品图必须作为真实商品参考，版式需要包含标题或卖点文案空间、商品导向的商业主视觉、统一风格和完整详情页模块结构。',
            ].join('\n')
      : isLogoSkill
        ? [
            promptText.trim(),
            `生成这一套 Logo 方向：${direction.title}。`,
            direction.description,
            '必须是扁平矢量标志：干净线条、清晰边缘、适合缩放、符合专业品牌识别系统。',
            '必须使用纯白背景或透明背景效果，Logo 居中展示，周围留出干净安全边距；不要生成任何装饰性背景。',
            '不要样机场景，不要三维效果，不要真实摄影，不要复杂阴影，不要浮雕，不要厚重材质，不要蓝色科技背景，不要发光光晕，不要径向渐变底色。',
            '如果包含文字，品牌名称必须清晰可读，不能拼错、变形或生成乱码；中文笔画结构要稳定。',
            '构图应适合品牌主标识，可用于头像、门头、包装、网站和印刷。',
          ].join('\n')
      : isProductImageSetSkill
        ? [
            promptText.trim(),
            `生成这一张电商套图页面：${direction.title}。`,
            direction.description,
            productSetPageInstruction(direction.id, direction.title),
            '这一张必须是整套商品图中的独立页面，不要把多张图拼进同一张里。商品外观以用户上传商品图为准；主视觉、细节、包装类页面必须强还原产品，效果证明、场景、人物类页面可以让产品弱露出或不作为主视觉。',
            '继续沿用整组商品图的统一背景体系、光影系统、文字系统、色彩系统和品牌气质；不同页型可以变化构图，但不能跳成另一套风格。',
            '整套图要有真实电商节奏变化：至少包含产品主视觉、结果/利益证明、生活或使用场景、局部细节或对比说明，不要连续生成相同的产品陈列版式。',
            '描述和画面文字使用用户指定语言；没有确认的参数、认证、接口、配件不要编造。',
          ].join('\n')
        : promptText.trim()
    return [prompt, extraInstruction].filter(Boolean).join('\n\n')
  }

  function logoVariantInstruction(index: number, total: number) {
    if (total <= 1) {
      return 'This is one focused logo concept. Keep the selected direction clear and make the symbol, wordmark, spacing, and scalability feel production-ready.'
    }
    return [
      `This is logo variant ${index + 1} of ${total} for the same selected direction.`,
      'Keep the brand strategy and style direction consistent, but make this variant noticeably different from the others.',
      'Vary the composition, positive/negative space, symbol metaphor, letterform treatment, or icon-wordmark relationship.',
      'Do not create a mockup, 3D render, photo scene, textured background, or decorative presentation board.',
    ].join(' ')
  }

  async function generateDirections(targets: GenerationTarget[], extraInstruction = '', signal?: AbortSignal) {
    const concurrency = 1
    const settledResults: PromiseSettledResult<GeneratedImage>[] = []
    let cursor = 0
    async function worker() {
      while (cursor < targets.length) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
        const index = cursor
        cursor += 1
        const direction = targets[index]
        try {
        const generationId = direction.generationId || direction.id
        const result = await generateImageForDirection(
          direction.sourceDirectionId || direction.id,
          direction.title,
          buildDirectionPrompt(direction, extraInstruction),
          '',
          signal,
        )
        const requestedSize = directionResult?.imagePrompt.size || '1024x1024'
        const item: GeneratedImage = {
          id: crypto.randomUUID(),
          directionId: generationId,
          title: direction.title,
          imageUrl: result.imageUrl,
          svgUrl: result.svgUrl,
          size: requestedSize,
          revisedPrompt: result.revisedPrompt,
        }
        setImageResults((current) => [...current, item])
        setPendingPreviewCards((current) => current.filter((card) => card.id !== generationId))
          settledResults[index] = { status: 'fulfilled', value: item }
        } catch (reason) {
          settledResults[index] = { status: 'rejected', reason }
        }
      }
    }
    await Promise.all(Array.from({ length: concurrency }, () => worker()))
    const results = settledResults
      .filter((result): result is PromiseFulfilledResult<GeneratedImage> => result.status === 'fulfilled')
      .map((result) => result.value)
    const failures = settledResults.flatMap((result, index) => {
      if (result.status === 'fulfilled') return []
      const reason = result.reason instanceof Error ? result.reason.message : '生图失败。'
      return [{ ...targets[index], id: targets[index].generationId || targets[index].id, reason }]
    })
    return { results, failures }
  }

  async function generateImage() {
    if (!analysis || !promptText.trim()) {
      setError('请先确认提示词。')
      return
    }
    setGenerating(true)
    setError('')
    const controller = startWorkflowRequest()
    try {
      const directions = directionResult?.directions || []
      const baseTargets = generationScope === 'all'
        ? directions
        : generationScope === 'multiple'
          ? directions.filter((direction) => selectedGenerationIds.includes(direction.id))
          : directions.filter((direction) => direction.id === (selectedDirection || directions[0]?.id))
      const targets: GenerationTarget[] = isLogoSkill && baseTargets.length
        ? Array.from({ length: logoVariantCount }, (_, index) => {
            const direction = baseTargets[0]
            return {
              ...direction,
              id: direction.id,
              generationId: `${direction.id}__variant_${index + 1}`,
              sourceDirectionId: direction.id,
              title: logoVariantCount > 1 ? `${direction.title} · Variant ${index + 1}` : direction.title,
              description: [
                direction.description,
                logoVariantInstruction(index, logoVariantCount),
              ].join('\n\n'),
            }
          })
        : baseTargets
      if (!targets.length) {
        throw new Error(generationScope === 'multiple' ? '请至少选择一个要生成的页面。' : '没有可生成的方向。')
      }
      setImageResult(null)
      setImageResults([])
      setExpansionResults([])
      setSelectedBaseImageId('')
      setGenerationQueue(targets.map((direction) => direction.generationId || direction.id))
      setPendingPreviewCards(targets.map((direction) => ({ id: direction.generationId || direction.id, title: direction.title })))
      setFailedDirections([])
      const { results, failures } = await generateDirections(targets, '', controller.signal)
      if (failures.length && results.length === 0) {
        setFailedDirections(failures)
        setViewStep(stepIndex.generate)
        setError(`本次 ${failures.length} 张都生成失败。已保留失败方向，可以在下方输入“继续生成失败的图”只重试这些方向。失败原因：${failures[0]?.reason || '生图失败。'}`)
        return
      }
      if (failures.length) {
        setFailedDirections(failures)
        setError(`有 ${failures.length} 张生成失败，成功图片已保留在左侧画廊。可以在下方输入“继续生成失败的图”让系统只重试失败方向。`)
      }
      setSelectedBaseImageId(results[0]?.id || '')
      setImageResult(results[0] ? { imageUrl: results[0].imageUrl, revisedPrompt: results[0].revisedPrompt } : null)
      setViewStep(stepIndex.expansion)
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '图片已生成并保存到当前项目目录。',
        },
      ])
    } catch (generateError) {
      if (isAbortError(generateError)) {
        setError('')
        return
      }
      setError(generateError instanceof Error ? generateError.message : '生图失败。')
    } finally {
      setGenerating(false)
      setGenerationQueue([])
      setPendingPreviewCards([])
      if (workflowAbortRef.current === controller) workflowAbortRef.current = null
    }
  }

  function toggleExpansion(optionId: string) {
    setExpansionSelections((current) => {
      const next = current.includes(optionId) ? current.filter((item) => item !== optionId) : [...current, optionId]
      rememberLogoSelections({ expansionSelections: next })
      return next
    })
  }

  async function downloadImage(imageUrl: string, title: string) {
    if (!imageUrl) throw new Error('没有可下载的图片。')
    const downloadExt = 'png'
    const suggestedName = `${safeClientFileName(title || 'skillcrew-image')}.${downloadExt}`
    const response = await fetch('/api/save-image-as', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: imageUrl,
        name: title || 'skillcrew-image',
      }),
    })
    const data = await readJsonResponse(response)
    if (!response.ok) {
      fallbackBrowserDownload(imageUrl, title || 'skillcrew-image', suggestedName)
      throw new Error(data.error || '无法打开保存窗口，已尝试使用浏览器下载。')
    }
    if (data.canceled) {
      setOperationStatus('已取消下载。')
      return
    }
    setOperationStatus(`图片已保存到：${data.path}`)
  }

  async function downloadImages(items: DownloadImageItem[]) {
    const downloadableItems = items.filter((item) => item.imageUrl)
    if (downloadableItems.length === 0) throw new Error('No images to download.')
    if (downloadableItems.length === 1) {
      await downloadImage(downloadableItems[0].imageUrl, downloadableItems[0].title)
      return
    }

    const response = await fetch('/api/save-images-as', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: downloadableItems.map((item) => ({
          file: item.imageUrl,
          name: item.title || 'skillcrew-image',
        })),
      }),
    })
    const data = await readJsonResponse(response)
    if (!response.ok) {
      throw new Error(data.error || '批量保存失败。')
    }
    if (data.canceled) {
      setOperationStatus('已取消下载。')
      return
    }
    setOperationStatus(`已保存 ${data.count || downloadableItems.length} 张图片到：${data.folder || '所选文件夹'}`)
  }

  async function removeLightboxBackground() {
    if (!lightboxImage?.imageUrl) return
    if (lightboxImage.imageUrl.toLowerCase().split('?')[0].endsWith('.svg')) {
      setLightboxStatus('SVG 包装图暂不支持抠图，请打开原始 PNG/JPG 图片。')
      return
    }
    const sourceImage = lightboxImage
    setCutoutLoadingUrl(sourceImage.imageUrl)
    setLightboxStatus('正在抠图并导出透明 PNG...')
    setError('')
    try {
      const response = await fetch('/api/remove-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: sourceImage.imageUrl,
          name: sourceImage.title || 'skillcrew-image',
        }),
      })
      const data = await readJsonResponse(response) as {
        imageUrl?: string
        title?: string
        error?: string
      }
      if (!response.ok || !data.imageUrl) {
        throw new Error(data.error || '抠图失败。')
      }
      const nextItem = {
        imageUrl: data.imageUrl,
        title: data.title || `${sourceImage.title || '图片'} 透明 PNG`,
      }
      setLightboxItems((current) => {
        const baseItems = current.length > 0 ? current : [sourceImage]
        return baseItems.some((item) => item.imageUrl === nextItem.imageUrl) ? baseItems : [...baseItems, nextItem]
      })
      showLightboxImage(nextItem)
      setLightboxStatus('已生成透明 PNG，可以直接下载。')
      setOperationStatus('透明 PNG 抠图已生成。')
      if (projectsOpen) {
        const projectsResponse = await fetch('/api/projects')
        const projectsData = await readJsonResponse(projectsResponse)
        if (projectsResponse.ok) {
          setProjects(Array.isArray(projectsData.projects) ? projectsData.projects as ProjectItem[] : [])
        }
      }
    } catch (cutoutError) {
      const message = cutoutError instanceof Error ? cutoutError.message : '抠图失败。'
      setLightboxStatus(message)
      setError(message)
    } finally {
      setCutoutLoadingUrl('')
    }
  }

  async function convertLightboxToSvg() {
    if (!lightboxImage?.imageUrl) return
    if (lightboxImage.imageUrl.toLowerCase().split('?')[0].endsWith('.svg')) {
      setLightboxStatus('当前已经是 SVG 文件。')
      return
    }
    const sourceImage = lightboxImage
    setSvgConvertingUrl(sourceImage.imageUrl)
    setLightboxStatus('正在转换 SVG...')
    setError('')
    try {
      const response = await fetch('/api/convert-svg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: sourceImage.imageUrl,
          name: sourceImage.title || 'skillcrew-image',
        }),
      })
      const data = await readJsonResponse(response) as {
        svgUrl?: string
        error?: string
      }
      if (!response.ok || !data.svgUrl) {
        throw new Error(data.error || 'SVG 转换失败。')
      }
      updateLightboxSvgUrl(sourceImage.imageUrl, data.svgUrl)
      setLightboxConvertedSvgUrl(data.svgUrl)
      setLightboxStatus('SVG 已转换完成，可以下载。')
      setOperationStatus('SVG 已转换完成。')
    } catch (svgError) {
      const message = svgError instanceof Error ? svgError.message : 'SVG 转换失败。'
      setLightboxStatus(message)
      setError(message)
    } finally {
      setSvgConvertingUrl('')
    }
  }

  async function generateExpansions() {
    if (!analysis || !promptText.trim()) {
      setError('请先完成主图生成。')
      return
    }
    const baseImage = adjustableImages.find((item) => item.id === selectedBaseImageId) || adjustableImages[0]
    const expansions = getSelectedExpansions()
    if (!baseImage || expansions.length === 0) {
      setError('请先选择一张主图和至少一个扩展项。')
      return
    }
    const expansionTasks = buildExpansionTasks(baseImage, expansions)
    if (expansionTasks.length === 0) {
      setError('没有可生成的扩展任务。')
      return
    }
    const requestedExpansionSize = isLogoSkill ? logoMockupSize : directionResult?.imagePrompt.size || '1024x1024'
    const mockupReferenceNote = isLogoSkill && mockupReferenceImages.length > 0
      ? `已上传 ${mockupReferenceImages.length} 张样机参考图。必须高度参考这些图的样机场景、构图关系、材质质感、光影氛围、道具组合和行业视觉语言；Logo 仍以当前选中的 Logo 方案为准，不要照搬参考图里的其他品牌标识或文字。`
      : ''
    rememberLogoSelections()
    setGenerating(true)
    setError('')
    const pendingCards = expansionTasks.map((task) => ({
      id: task.id,
      title: `${task.title} · ${baseImage.title}`,
    }))
    setPendingPreviewCards((current) => [...current, ...pendingCards])
    const controller = startWorkflowRequest()
    try {
      let expansionReasoning: { message?: string; taskPrompts?: Array<{ id: string; promptPatch: string }> } = {}
      try {
        const response = await fetch('/api/run/reason-expansion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            projectId: analysis.projectId,
            currentPrompt: promptText,
            baseImage: {
              title: baseImage.title,
              directionId: baseImage.directionId,
            },
            expansionTasks: expansionTasks.map((task) => ({
              id: task.id,
              directionId: task.directionId,
              title: task.title,
              description: task.description,
              expansionId: task.expansion.id,
              detailText: task.detailText,
            })),
          }),
        })
        const data = await readJsonResponse(response)
        if (response.ok) {
          expansionReasoning = data as { message?: string; taskPrompts?: Array<{ id: string; promptPatch: string }> }
        }
      } catch {
        expansionReasoning = {}
      }
      const promptPatchByTask = new Map(
        (expansionReasoning.taskPrompts || []).map((item) => [item.id, item.promptPatch]),
      )
      const nextResults: GeneratedExpansion[] = []
      for (const [index, task] of expansionTasks.entries()) {
        if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError')
        const reasonedPatch = promptPatchByTask.get(task.id)
        const expansionPrompt = [
          promptText.trim(),
          `基于当前选中的生成结果继续延展：${baseImage.title}。`,
          `生成扩展输出：${task.title}。${task.description}`,
          `扩展要求：\n${task.detailText}`,
          reasonedPatch ? `推理模型整理后的扩展补充要求：\n${reasonedPatch}` : '',
          mockupReferenceNote,
          isLogoSkill
            ? task.expansion.id.startsWith('logo-mockup-') || task.expansion.id === 'custom-followup'
              ? logoMockupPromptNote(task.title, task.detailText, brief, requestedExpansionSize)
              : task.expansion.id === 'logo-usage'
              ? '这是 Logo 应用预览，可以放入真实品牌应用场景，但 Logo 本体仍必须保持扁平、清晰、可读，不要变形。'
              : '这是 Logo 延展输出，必须保持扁平矢量、线条干净、适合缩放；使用纯白或透明背景效果，不要三维效果、样机、复杂阴影、写实效果、蓝色科技背景或发光光晕。'
            : '',
          isProductImageSetSkill
            ? '保持电商套图一致性：商品主体按原图和选中图片延展，背景体系、光影系统、文字系统、色彩系统、品牌气质与整套图一致；不要编造不存在的参数、配件或功能。'
            : '保持同一个品牌角色或主体的一致性，包括轮廓、色彩系统、材质语言、面部特征和商业视觉风格。',
        ].join('\n')
        const result = await generateImageForDirection(
          task.directionId,
          task.title,
          expansionPrompt,
          baseImage.imageUrl,
          controller.signal,
          requestedExpansionSize,
          isLogoSkill ? mockupReferenceImages : [],
        )
        const nextItem = {
          id: crypto.randomUUID(),
          directionId: task.directionId,
          title: task.title,
          description: task.description,
          imageUrl: result.imageUrl,
          size: requestedExpansionSize,
          baseTitle: baseImage.title,
        }
        nextResults.push(nextItem)
        setExpansionResults((current) => [...current, nextItem])
        setPendingPreviewCards((current) => current.filter((card) => card.id !== pendingCards[index].id))
      }
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: expansionReasoning.message || `已基于「${baseImage.title}」生成 ${nextResults.length} 张扩展图。`,
        },
      ])
    } catch (expandError) {
      if (isAbortError(expandError)) {
        setError('')
        return
      }
      setError(expandError instanceof Error ? expandError.message : '扩展生成失败。')
    } finally {
      setGenerating(false)
      setPendingPreviewCards((current) => current.filter((card) => !pendingCards.some((pending) => pending.id === card.id)))
      if (workflowAbortRef.current === controller) workflowAbortRef.current = null
    }
  }

  return (
    <main
      className="app-frame"
      data-current-skill-id={skill?.id || ''}
      data-current-skill-name={skill?.name || ''}
      data-current-skill-display-name={skill?.displayName || ''}
    >
      <section className="workspace" aria-label="Skill Runner">
        <header className="topbar">
          <div>
            <p className="brand">燃点skill-固定角度</p>
            <span>local workflow studio</span>
          </div>
          <nav aria-label="Workflow navigation">
            <button type="button" onClick={() => setSkillsOpen(true)}>技能</button>
            <button type="button" onClick={openProjectsPanel}>生成记录</button>
            <button type="button" onClick={() => setSettingsOpen(true)}>
              设置
            </button>
          </nav>
          <div className="plus-menu-wrap" ref={plusMenuRef}>
            <input
              ref={skillDirectoryInputRef}
              className="file-input"
              type="file"
              // @ts-expect-error webkitdirectory is supported by Chromium for folder selection.
              webkitdirectory=""
              multiple
              onChange={(event) => importSkillFromDirectory(event.currentTarget.files)}
            />
            <button
              className="close-button"
              type="button"
              aria-label="Open skill actions"
              aria-expanded={plusMenuOpen}
              onClick={() => setPlusMenuOpen((current) => !current)}
            >
              +
            </button>
            {plusMenuOpen && (
              <div className="plus-menu" role="menu" aria-label="Skill actions">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => skillDirectoryInputRef.current?.click()}
                  disabled={importingSkill}
                >
                  <strong>读取</strong>
                  <span>{importingSkill ? '读取中' : '选择本地路径加载 Skill'}</span>
                </button>
                <button type="button" role="menuitem" onClick={openCreateSkillPanel}>
                  <strong>创建</strong>
                  <span>创建属于自己的 Skill</span>
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="panels">
          <section className="left-panel">
            <div className="lime-band">
              <div className="skill-select-row">
                <label htmlFor="skill-select">Skills Expert</label>
                <div className="skill-dropdown" ref={skillMenuRef}>
                  <button
                    type="button"
                    className="skill-trigger"
                    aria-expanded={skillMenuOpen}
                    aria-haspopup="listbox"
                    onClick={() => setSkillMenuOpen((current) => !current)}
                  >
                    <span className="skill-trigger-copy">
                      <strong>{skill?.displayName}</strong>
                      <small>{skill?.name}</small>
                    </span>
                    <span className="skill-trigger-icon" aria-hidden="true">
                      ▾
                    </span>
                  </button>
                  {skillMenuOpen && (
                    <div className="skill-menu" role="listbox" aria-label="技能选择">
                      {skills.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          role="option"
                          aria-selected={item.id === selectedSkill}
                          className={item.id === selectedSkill ? 'selected' : ''}
                          onClick={() => {
                            setSelectedSkill(item.id)
                            setSkillMenuOpen(false)
                          }}
                        >
                          <span>
                            <strong>{item.displayName}</strong>
                            <small>{item.description}</small>
                          </span>
                          <em>{item.referencesCount}</em>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="skill-card">
                <span className="avatar">{skill?.displayName.slice(0, 2) || 'SK'}</span>
                <div>
                  <p>{skill?.displayName}</p>
                  <small>{skill?.name}</small>
                </div>
              </div>
              <h1>
                Every run
                <span> starts with a skill.</span>
              </h1>
            </div>

            <div className={`left-content ${isMergeImageSkill ? 'merge-left-content' : ''}`}>
              {isMergeImageSkill ? (
                <>
                  <p className="description">{skill?.guidance?.summary || skill?.description}</p>
                  <div className="summary-grid">
                    <article>
                      <span>参考资料</span>
                      <strong>{skill?.referencesCount ?? 0}</strong>
                    </article>
                    <article>
                      <span>模式</span>
                      <strong>分步确认</strong>
                    </article>
                  </div>
                  <div className="step-list merge-step-list">
                    <button type="button" className="step active">
                      <span>1</span>
                      <p>生图</p>
                    </button>
                  </div>
                  {(imageResults.length > 0 || pendingPreviewCards.length > 0) && (
                    <div className="merge-left-result-strip" aria-label="AI产品背景融合生成结果">
                      {imageResults.map((item) => (
                        <button
                          type="button"
                          className="merge-left-result"
                          key={item.id}
                          onClick={() => openLightbox(item.imageUrl, item.title, imageResults.map((image) => ({ imageUrl: image.imageUrl, title: image.title, svgUrl: image.svgUrl })))}
                        >
                          <img src={item.imageUrl} alt={item.title} />
                        </button>
                      ))}
                      {pendingPreviewCards.map((item) => (
                        <div className="merge-left-result merge-left-pending" key={item.id}>
                          <span className="merge-left-spinner" aria-hidden="true" />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="description">{skill?.guidance?.summary || skill?.description}</p>
                  <div className="summary-grid">
                    <article>
                      <span>参考资料</span>
                      <strong>{skill?.referencesCount ?? 0}</strong>
                    </article>
                    <article>
                      <span>模式</span>
                      <strong>分步确认</strong>
                    </article>
                  </div>
                  <div className="step-list">
                    {workflowStepLabels.map((label, index) => (
                      <button
                        type="button"
                        className={`step ${index < activeStep ? 'confirmed' : ''} ${
                          index === visibleStep ? 'active' : ''
                        }`}
                        key={label}
                        disabled={index > activeStep || loading}
                        onClick={() => setViewStep(index)}
                      >
                        <span>{index + 1}</span>
                        <p>{label}</p>
                      </button>
                    ))}
                  </div>
                  {(promptConfirmed || imageResult) && (
                    <PreviewGallery
                      items={previewItems}
                      previewAspectRatio={previewAspectRatio}
                      onOpenLightbox={openLightbox}
                      onDownload={(imageUrl, title) => downloadImage(imageUrl, title)}
                      onDownloadMany={downloadImages}
                      onError={setError}
                    />
                  )}
                </>
              )}
            </div>
          </section>

          <section className="right-panel">
            <div className="right-heading">
              <p>AI workflow</p>
              <h2>
                Tell the skill
                <span> what to make.</span>
              </h2>
            </div>

            <div className="right-scroll" ref={rightScrollRef}>
              <section className="chat-thread" aria-label="Skill conversation">
                {messages
                  .filter((message) => !(isMergeImageSkill && message.role === 'assistant' && /已完成一键|角度参考|参考图|角色锁定/.test(message.content)))
                  .map((message) => (
                  <div className={`message ${message.role}-message`} key={message.id}>
                    <span>{message.role === 'assistant' ? 'Skills Expert' : '你'}</span>
                    <p>{toUserFacingChineseError(message.content)}</p>
                  </div>
                ))}

                {loading && !isMergeImageSkill && (
                  <div className="message assistant-message thinking-message" key="thinking">
                    <span>{isMergeImageSkill ? 'GPT 生图' : 'Skills Expert'}</span>
                    <div className="thinking-row">
                      <i className="thinking-spinner" aria-hidden="true" />
                      <p>{isMergeImageSkill ? '正在调用后台 GPT 生图 API' : 'Skills Expert 正在计算中'}</p>
                      <button type="button" onClick={stopWorkflowGeneration}>
                        暂停生成
                      </button>
                    </div>
                  </div>
                )}

                {skill?.guidance?.checklist && visibleStep === stepIndex.brief && !isInitialThinking && (
                  <div className="requirement-hints" aria-label="Skill requirement hints">
                    {skill.guidance.checklist.map((item) => (
                      <button
                        type="button"
                        className={hasRequirementField(item) ? 'active' : ''}
                        key={item}
                        onClick={() => toggleRequirementField(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}

                {visibleStep === stepIndex.brief && !isInitialThinking && (
                  <div
                    className={`message user-composer ${isDraggingReference ? 'drag-over' : ''}`}
                    onDragEnter={handleReferenceDragOver}
                    onDragOver={handleReferenceDragOver}
                    onDragLeave={handleReferenceDragLeave}
                    onDrop={handleReferenceDrop}
                  >
                    <label htmlFor="brief-input">输入你的需求</label>
                    <input
                      ref={fileInputRef}
                      className="file-input"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(event) => {
                        selectReferenceImages(event.target.files)
                        event.currentTarget.value = ''
                      }}
                    />
                    <textarea
                      id="brief-input"
                      ref={briefInputRef}
                      value={brief}
                      onChange={(event) => setBrief(event.target.value)}
                      placeholder={skill?.guidance?.placeholder || '例如：说明你的具体需求、用途、素材和风格要求。'}
                    />
                    {!isMergeImageSkill && referenceImages.length > 0 && (
                      <div className="upload-list" aria-label="已选择的参考图">
                        {referenceImages.map((file, index) => (
                          <button type="button" key={`${file.name}-${index}`} onClick={() => removeReferenceImage(index)}>
                            <span>{file.name}</span>
                            <em>×</em>
                          </button>
                        ))}
                      </div>
                    )}
                    {!isMergeImageSkill && uploadedFiles.length > 0 && (
                      <div className="uploaded-note">
                        已保存 {uploadedFiles.length} 张{isMergeImageSkill ? '融合角色图' : '参考图'}，生图时会作为{isMergeImageSkill ? '产品/背景/角度硬参考' : '产品主体/视觉参考'}一起传入。
                      </div>
                    )}
                    {isMergeImageSkill && (
                      <div className="multi-angle-composer merge-image-composer">
                        <div className="multi-angle-upload-grid merge-image-upload-grid">
                          {visibleMergeImageSlots.map((slot) => {
                            const slotFiles = mergeImageFiles[slot.id] || []
                            return (
                              <section
                                className={`multi-angle-slot merge-image-slot ${slotFiles.length ? 'has-files' : ''} ${draggingMergeImageSlot === slot.id ? 'drag-over' : ''}`}
                                key={slot.id}
                                onDragEnter={(event) => handleMergeImageDragOver(event, slot.id)}
                                onDragOver={(event) => handleMergeImageDragOver(event, slot.id)}
                                onDragLeave={(event) => handleMergeImageDragLeave(event, slot.id)}
                                onDrop={(event) => handleMergeImageDrop(event, slot.id)}
                              >
                                <label>
                                  <span className="slot-plus" aria-hidden="true" />
                                  <span className="slot-copy">
                                    <strong>{slot.label}</strong>
                                    <small>{slot.hint}</small>
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple={isMergeMultiReferenceSlot(slot.id)}
                                    onChange={(event) => {
                                      selectMergeImage(slot.id, event.currentTarget.files)
                                      event.currentTarget.value = ''
                                    }}
                                  />
                                </label>
                                {slotFiles.length > 0 && (
                                  <button
                                    type="button"
                                    className={`slot-preview ${isMergeMultiReferenceSlot(slot.id) && slotFiles.length > 1 ? 'slot-preview-stack' : ''}`}
                                    onClick={() => {
                                      if (isMergeMultiReferenceSlot(slot.id) && slotFiles.length > 1) setMergeReferenceModalSlot(slot.id)
                                    }}
                                    aria-label={isMergeMultiReferenceSlot(slot.id) && slotFiles.length > 1 ? `查看全部${slot.label}` : `${slot.label}预览`}
                                  >
                                    {slotFiles.map((file, index) => (
                                      <figure className="slot-preview-item" key={`${file.name}-${index}`}>
                                        <img
                                          src={mergeImagePreviewUrls[`${slot.id}-${index}`]}
                                          alt={`${slot.label}预览 ${index + 1}`}
                                        />
                                        {(!isMergeMultiReferenceSlot(slot.id) || slotFiles.length === 1) && (
                                          <span
                                            className="slot-preview-remove"
                                            role="button"
                                            tabIndex={0}
                                            aria-label={`删除${slot.label} ${index + 1}`}
                                            title="删除"
                                            onClick={(event) => {
                                              event.stopPropagation()
                                              removeMergeImage(slot.id, index)
                                            }}
                                            onKeyDown={(event) => {
                                              if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault()
                                                event.stopPropagation()
                                                removeMergeImage(slot.id, index)
                                              }
                                            }}
                                          >
                                            ×
                                          </span>
                                        )}
                                      </figure>
                                    ))}
                                    {isMergeMultiReferenceSlot(slot.id) && slotFiles.length > 1 && <span className="slot-preview-count">{slotFiles.length}</span>}
                                  </button>
                                )}
                              </section>
                            )
                          })}
                        </div>
                        <div className="merge-angle-library">
                          <div className="merge-angle-library-head">
                            <div>
                              <strong>角度库</strong>
                              <span>可多选角度批量生成；每个角度会共用产品鞋图和背景图分别生成。</span>
                            </div>
                            <button
                              type="button"
                              className="merge-clear-selection"
                              disabled={selectedMergeAngleIds.length === 0}
                              onClick={() => setSelectedMergeAngleIds([])}
                              title="取消选择"
                            >
                              <ClearSelectionIcon />
                              <span>取消选择</span>
                            </button>
                          </div>
                          <div className="merge-angle-grid">
                            {mergeAngleLibrary.map((item) => (
                              <Fragment key={item.id}>
                                {item.dividerBefore ? (
                                  <div className="merge-angle-divider" aria-hidden="true" />
                                ) : null}
                                <button
                                  type="button"
                                  className={selectedMergeAngleIds.includes(item.id) ? 'selected' : ''}
                                  onClick={() => {
                                    setSelectedMergeAngleIds((current) =>
                                      current.includes(item.id)
                                        ? current.filter((id) => id !== item.id)
                                        : current.length >= mergeAngleBatchLimit
                                          ? current
                                          : [...current, item.id],
                                    )
                                    setMergeImageFiles((current) => ({ ...current, angle: [] }))
                                  }}
                                >
                                  <img src={item.url} alt={item.label} />
                                  <span>{item.label}</span>
                                  <em>{mergeAngleLibraryAnalyses[item.id] ? '已解析' : '解析中'}</em>
                                </button>
                              </Fragment>
                            ))}
                          </div>
                        </div>
                        <div className="merge-size-panel">
                          <div>
                            <strong>输出尺寸</strong>
                            <span>选择一键生图的画幅，生成时会传给后台 GPT 生图接口。</span>
                          </div>
                          <div className="segmented-options merge-size-options">
                            {mergeImageSizeOptions.map((item) => (
                              <button
                                type="button"
                                className={mergeImageSize === item.value ? 'selected' : ''}
                                key={item.value}
                                onClick={() => setMergeImageSize(item.value)}
                              >
                                <strong>{item.label}</strong>
                                <span>{item.detail}</span>
                                <em>{item.value === 'auto' ? '自动' : item.value === 'custom' ? '输入' : item.value}</em>
                              </button>
                            ))}
                          </div>
                          {mergeImageSize === 'custom' && (
                            <div className="merge-custom-size">
                              <label>
                                <span>宽度</span>
                                <input
                                  type="number"
                                  min="256"
                                  max="4096"
                                  step="8"
                                  value={mergeCustomWidth}
                                  onChange={(event) => setMergeCustomWidth(event.currentTarget.value)}
                                />
                              </label>
                              <span className="merge-custom-size-separator">x</span>
                              <label>
                                <span>高度</span>
                                <input
                                  type="number"
                                  min="256"
                                  max="4096"
                                  step="8"
                                  value={mergeCustomHeight}
                                  onChange={(event) => setMergeCustomHeight(event.currentTarget.value)}
                                />
                              </label>
                            </div>
                          )}
                        </div>
                        <div className="merge-resolution-panel">
                          <div>
                            <strong>输出分辨率</strong>
                            <span>保持上方画幅比例，按所选长边像素生成并保存。</span>
                          </div>
                          <div className="segmented-options merge-resolution-options">
                            {mergeImageResolutionOptions.map((item) => (
                              <button
                                type="button"
                                className={mergeImageResolution === item.value ? 'selected' : ''}
                                key={item.value}
                                onClick={() => setMergeImageResolution(item.value)}
                              >
                                <strong>{item.label}</strong>
                                <span>{item.detail}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {isMultiAngleSkill && (
                      <div className="multi-angle-composer">
                        <div className="multi-angle-upload-grid">
                          {multiAngleSlots.map((slot) => {
                            const slotFiles = multiAngleFiles[slot.id] || []
                            return (
                              <section className={`multi-angle-slot ${slotFiles.length ? 'has-files' : ''}`} key={slot.id}>
                                <label>
                                  <span className="slot-plus">+</span>
                                  <strong>{slot.label}</strong>
                                  <small>{slot.hint}</small>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(event) => {
                                      selectMultiAngleImages(slot.id, event.currentTarget.files)
                                      event.currentTarget.value = ''
                                    }}
                                  />
                                </label>
                                {slotFiles.length > 0 && (
                                  <div className="slot-file-list">
                                    {slotFiles.map((file, index) => (
                                      <button
                                        type="button"
                                        key={`${slot.id}-${file.name}-${file.lastModified}-${index}`}
                                        onClick={() => removeMultiAngleImage(slot.id, index)}
                                      >
                                        <span>{file.name}</span>
                                        <em>x</em>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </section>
                            )
                          })}
                        </div>
                        <div className="multi-angle-options">
                          <section>
                            <strong>导出视图数量</strong>
                            <div className="segmented-options">
                              {multiAngleViewCounts.map((count) => (
                                <button
                                  type="button"
                                  className={multiAngleViewCount === count ? 'selected' : ''}
                                  key={count}
                                  onClick={() => setMultiAngleViewCount(count)}
                                >
                                  {count} 视图
                                </button>
                              ))}
                            </div>
                          </section>
                          <section>
                            <strong>输出方式</strong>
                            <div className="segmented-options output-options">
                              <button
                                type="button"
                                className={multiAngleOutputMode === 'combined' ? 'selected' : ''}
                                onClick={() => setMultiAngleOutputMode('combined')}
                              >
                                <strong>生成在同一张里</strong>
                                <span>适合主图、多角度合集</span>
                              </button>
                              <button
                                type="button"
                                className={multiAngleOutputMode === 'separate' ? 'selected' : ''}
                                onClick={() => setMultiAngleOutputMode('separate')}
                              >
                                <strong>分开生成</strong>
                                <span>适合单独导出每个角度</span>
                              </button>
                            </div>
                          </section>
                        </div>
                      </div>
                    )}
                    <div className="composer-actions">
                      {!isMergeImageSkill && (
                        <button type="button" className="secondary" onClick={() => fileInputRef.current?.click()}>
                          <UploadChoiceIcon />
                          上传参考图
                        </button>
                      )}
                      <button type="button" className="primary" onClick={isMergeImageSkill ? oneClickMergeImage : submitBrief} disabled={loading || generating}>
                        {isMergeImageSkill ? (loading || generating ? '生图中' : '一键生图') : loading ? '分析中' : '发送给技能'}
                      </button>
                      {isMergeImageSkill && (
                        <button type="button" className="secondary" onClick={stopWorkflowGeneration} disabled={!loading && !generating}>
                          暂停生成
                        </button>
                      )}
                    </div>
                    {isMergeImageSkill && (generating || pendingPreviewCards.length > 0 || imageResults.length > 0) && (
                      <div className="merge-inline-result">
                        <div className="merge-inline-progress">
                          <div>
                            {generating || pendingPreviewCards.length > 0 ? <span className="merge-inline-spinner" aria-hidden="true" /> : null}
                            <strong>{generating || pendingPreviewCards.length > 0 ? '正在生成融合图' : '生成完成'}</strong>
                          </div>
                          <em>{imageResults.length}/{imageResults.length + pendingPreviewCards.length}</em>
                        </div>
                        {imageResults.length > 0 ? (
                          <div className="merge-inline-grid">
                            {imageResults.map((item) => (
                              <button
                                type="button"
                                className="merge-inline-preview"
                                key={item.id}
                                onClick={() => openLightbox(item.imageUrl, item.title, imageResults.map((image) => ({ imageUrl: image.imageUrl, title: image.title, svgUrl: image.svgUrl })))}
                              >
                                <img src={item.imageUrl} alt={item.title} />
                                <span>{item.title}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="merge-inline-empty">
                            <p>等待第一张图片生成...</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>

              {error && <p className="error-text">{error}</p>}

              {analysis && visibleStep === stepIndex.references && (
                <section className="confirm-card">
                  <div>
                    <span className="status-dot" />
                    <p>{analysis.confirmation?.title || '确认这些参考资料后继续'}</p>
                  </div>
                  {analysis.confirmation?.description && (
                    <p className="confirm-description">配置智能推理后，这一步会自动分析参考资料并给出选择理由；当前已先用本地规则继续。</p>
                  )}
                  {analysis.providerError && (
                    <p className="provider-note">智能推理暂时不可用，已改用本地规则继续：{toUserFacingChineseError(analysis.providerError)}</p>
                  )}
                  {analysis.inferredChoices && analysis.inferredChoices.length > 0 && (
                    <div className="inferred-choice-list" aria-label="智能补全确认">
                      {analysis.inferredChoices.map((choice) => {
                        const selectedId = selectedInferredChoices[choice.id] || choice.options[0]?.id || ''
                        return (
                          <section className="inferred-choice" key={choice.id}>
                            <div>
                              <strong>{choice.title}</strong>
                              {choice.description && <span>{choice.description}</span>}
                            </div>
                            <div className="choice-row">
                              {choice.options.map((option) => (
                                <button
                                  type="button"
                                  className={selectedId === option.id ? 'selected' : ''}
                                  key={option.id}
                                  onClick={() => updateInferredChoice(choice.id, option.id)}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                            {selectedId === 'custom' && (
                              <input
                                type="text"
                                value={customInferredChoices[choice.id] || ''}
                                onChange={(event) => updateCustomInferredChoice(choice.id, event.target.value)}
                                placeholder={`填写${choice.field}`}
                              />
                            )}
                            {choice.options.find((option) => option.id === selectedId)?.description && selectedId !== 'custom' && (
                              <small>{choice.options.find((option) => option.id === selectedId)?.description}</small>
                            )}
                          </section>
                        )
                      })}
                    </div>
                  )}
                  {analysis.confirmation?.options && analysis.confirmation.options.length > 0 && (
                    <div className="direction-list theme-list" aria-label="主题方向">
                      {analysis.confirmation.options.map((option) => (
                        <button
                          type="button"
                          key={option}
                          className={selectedThemeDirection === option ? 'selected' : ''}
                          onClick={() => setSelectedThemeDirection(option)}
                        >
                          <strong>{option}</strong>
                          <span>{option === '稳妥主方向'
                            ? '优先输出当前技能最稳的主题方向。'
                            : option === '强化记忆点方向'
                              ? '优先突出品牌识别元素和传播记忆点。'
                              : '优先考虑可直接用于落地执行的视觉方向。'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="reference-section-title">
                    <strong>参考资料选择</strong>
                    <span>勾选要带入后续方向生成的资料；不勾选也可以继续。</span>
                  </div>
                  <div className="reference-list">
                    {analysis.selectedReferences.map((item) => (
                      <label key={item.file}>
                        <input
                          type="checkbox"
                          checked={checkedReferences.includes(item.file)}
                          onChange={() => toggleReference(item.file)}
                        />
                        <span>
                          <strong>{item.title}</strong>
                          <small>
                            {item.reason} · {item.score}%
                          </small>
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="actions">
                    <button type="button" className="secondary" onClick={submitBrief} disabled={loading}>
                      重新选择
                    </button>
                    <button
                      type="button"
                      className="primary"
                      onClick={() => {
                        if (hasOptionStep) {
                          setViewStep(stepIndex.options)
                          return
                        }
                        confirmReferences()
                      }}
                    >
                      {loading ? '生成方向中' : hasOptionStep ? '进入选项配置' : '确认并继续'}
                    </button>
                  </div>
                </section>
              )}

              {analysis && hasOptionStep && visibleStep === stepIndex.options && (
                <section className="confirm-card option-card">
                  <div>
                    <span className="status-dot" />
                    <p>选择这次要走的输出方向</p>
                  </div>
                  <p className="confirm-description">
                    这里的选择会影响后续方向和提示词。可以只选一个，也可以多选后批量生成。
                  </p>
                  {isLogoSkill && (
                    <div className="logo-option-groups">
                      {logoReuseState?.selectedDeliveryIds.length ? (
                        <button type="button" className="secondary reuse-choice-button" onClick={() => applyLogoReuseState('options')}>
                          沿用上次风格和重点
                        </button>
                      ) : null}
                      <section className="logo-option-group">
                        <h3>Logo 风格</h3>
                        <p>先选视觉气质，可以多选，系统会按品牌行业筛掉不合适的风格。</p>
                        <div className="delivery-list">
                          {logoStyleOptions.map((item) => (
                            <button
                              type="button"
                              key={item.id}
                              className={selectedDeliveryIds.includes(item.id) ? 'selected' : ''}
                              onClick={() => toggleDeliverySelection(item.id)}
                            >
                              <strong>{item.title}</strong>
                              <span>{item.description}</span>
                            </button>
                          ))}
                        </div>
                      </section>
                      <section className="logo-option-group emphasis">
                        <h3>信息重点</h3>
                        <p>再选 Logo 要优先传达什么，后续方向会把这些重点写进方案和提示词。</p>
                        <div className="delivery-list">
                          {logoEmphasisOptions.map((item) => (
                            <button
                              type="button"
                              key={item.id}
                              className={selectedDeliveryIds.includes(item.id) ? 'selected' : ''}
                              onClick={() => toggleDeliverySelection(item.id)}
                            >
                              <strong>{item.title}</strong>
                              <span>{item.description}</span>
                            </button>
                          ))}
                        </div>
                      </section>
                    </div>
                  )}
                  {!isLogoSkill && (
                  <div className="delivery-list">
                    {activeDeliveryOptions.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        className={selectedDeliveryIds.includes(item.id) ? 'selected' : ''}
                        onClick={() => toggleDeliverySelection(item.id)}
                      >
                        <strong>{isLogoSkill && item.id.startsWith('logo-emphasis-') ? `重点：${item.title}` : isLogoSkill && item.id.startsWith('logo-style-') ? `风格：${item.title}` : item.title}</strong>
                        <span>{item.description}</span>
                      </button>
                    ))}
                  </div>
                  )}
                  <div className="actions">
                    <button type="button" className="secondary" onClick={() => setViewStep(stepIndex.references)}>
                      返回参考资料
                    </button>
                    <button type="button" className="primary" onClick={confirmReferences} disabled={loading || selectedDeliveryIds.length === 0}>
                      {loading ? '生成方向中' : '按这些选项继续'}
                    </button>
                  </div>
                </section>
              )}

              {directionResult && visibleStep === stepIndex.direction && (
                <section className="confirm-card">
                  <div>
                    <span className="status-dot" />
                    <p>
                      {isDetailPageSkill
                        ? '确认详情页 Section 和总提示词'
                        : isProductImageSetSkill
                          ? '确认整套商品图和总提示词'
                          : '选择方向并确认提示词'}
                    </p>
                  </div>
                  {directionResult.providerError && (
                    <p className="provider-note">智能推理暂时不可用，已改用本地规则继续：{toUserFacingChineseError(directionResult.providerError)}</p>
                  )}
                  <div className="direction-list">
                    {directionResult.directions.map((direction) => (
                      <button
                        type="button"
                        className={selectedDirection === direction.id ? 'selected' : ''}
                        key={direction.id}
                        onClick={() => setSelectedDirection(direction.id)}
                      >
                        <strong>{direction.title}</strong>
                        <span>{direction.description}</span>
                      </button>
                    ))}
                  </div>
                  <label className="prompt-editor">
                    {isDetailPageSkill
                      ? '详情页总生成提示词'
                      : isProductImageSetSkill
                        ? '套图总生成提示词'
                        : isLogoSkill
                          ? 'Logo 总生成提示词'
                        : '最终生图提示词'}
                    <textarea value={promptText} onChange={(event) => setPromptText(event.target.value)} />
                  </label>
                  <div className="prompt-meta">
                    <span>尺寸：{directionResult.imagePrompt.size || '1024x1024'}</span>
                    <span>反向约束：{directionResult.imagePrompt.negative || '已按 Skill 默认约束处理'}</span>
                  </div>
                  <div className={isLogoSkill ? 'actions prompt-confirm-actions' : 'actions'}>
                    {isLogoSkill && (
                      <button
                        type="button"
                        className="secondary icon-back-button prompt-back-button"
                        onClick={() => setViewStep(stepIndex.options)}
                        aria-label="返回重选风格和重点"
                        title="返回重选风格/重点"
                      >
                        返回重选风格/重点
                      </button>
                    )}
                    <button type="button" className="secondary" onClick={() => setPromptConfirmed(false)}>
                      调整提示词
                    </button>
                    <button type="button" className="primary" onClick={confirmPrompt}>
                      确认提示词
                    </button>
                  </div>
                </section>
              )}

              {promptConfirmed && visibleStep === stepIndex.generate && (
                <section className="confirm-card image-card">
                  <div>
                    <span className="status-dot" />
                    <p>{isDetailPageSkill ? '生成详情页模块' : isProductImageSetSkill ? '生成整套商品图' : isLogoSkill ? '生成 Logo 方向' : '生成图片'}</p>
                  </div>
                  {isLogoSkill && (
                    <div className="generation-variant-panel">
                      <button
                        type="button"
                        className="secondary icon-back-button variant-back-button"
                        onClick={() => setViewStep(stepIndex.options)}
                        aria-label="返回重选风格和重点"
                        title="返回重选风格/重点"
                      >
                        返回重选风格/重点
                      </button>
                      <div>
                        <span>选择生成张数</span>
                        <div className="generation-scope" aria-label="Logo variant count">
                          {[1, 2, 3, 4].map((count) => (
                            <button
                              type="button"
                              key={count}
                              className={logoVariantCount === count ? 'selected' : ''}
                              onClick={() => setLogoVariantCount(count)}
                            >
                              {count} 张
                            </button>
                          ))}
                        </div>
                        <p>同一个 Logo 方向会生成多个差异化方案，让 AI 在构图、符号隐喻、正负形和字标关系上发散。</p>
                      </div>
                    </div>
                  )}
                  {!isLogoSkill && (
                  <div className="generation-scope" aria-label="Generation scope">
                    <button
                      type="button"
                      className={generationScope === 'single' ? 'selected' : ''}
                      onClick={() => setGenerationScope('single')}
                    >
                      单张
                    </button>
                    <button
                      type="button"
                      className={generationScope === 'multiple' ? 'selected' : ''}
                      onClick={() => setGenerationScope('multiple')}
                      disabled={!canGenerateAllDirections}
                    >
                      多张
                    </button>
                    <button
                      type="button"
                      className={generationScope === 'all' ? 'selected' : ''}
                      onClick={() => setGenerationScope('all')}
                      disabled={!canGenerateAllDirections}
                    >
                      全部
                    </button>
                  </div>
                  )}
                  {generationScope === 'single' && directionResult && (
                    <div className="generation-pick-list" aria-label="选择单张生成页面">
                      {directionResult.directions.map((direction, index) => (
                        <button
                          type="button"
                          key={direction.id}
                          className={[
                            selectedDirection === direction.id ? 'selected' : '',
                            generatedDirectionIds.has(direction.id) ? 'generated' : '',
                            generationQueue.includes(direction.id) ? 'generating' : '',
                            failedDirectionIds.has(direction.id) ? 'failed' : '',
                          ].filter(Boolean).join(' ')}
                          onClick={() => setSelectedDirection(direction.id)}
                        >
                          <strong>{isLogoSkill ? `第 ${index + 1} 个方向` : `第 ${index + 1} 屏`}</strong>
                          <span>{cleanGenerationTitle(direction.title)}</span>
                          <em className="generation-status">
                            {generationQueue.includes(direction.id)
                              ? '生成中'
                              : generatedDirectionIds.has(direction.id)
                                ? '已生成'
                                : failedDirectionIds.has(direction.id)
                                  ? '失败'
                                  : '未生成'}
                          </em>
                        </button>
                      ))}
                    </div>
                  )}
                  {generationScope === 'multiple' && directionResult && (
                    <div className="generation-pick-list multi" aria-label="选择多张生成页面">
                      {directionResult.directions.map((direction, index) => (
                        <button
                          type="button"
                          key={direction.id}
                          className={[
                            selectedGenerationIds.includes(direction.id) ? 'selected' : '',
                            generatedDirectionIds.has(direction.id) ? 'generated' : '',
                            generationQueue.includes(direction.id) ? 'generating' : '',
                            failedDirectionIds.has(direction.id) ? 'failed' : '',
                          ].filter(Boolean).join(' ')}
                          onClick={() => toggleGenerationTarget(direction.id)}
                        >
                          <strong>{selectedGenerationIds.includes(direction.id) ? '已选' : isLogoSkill ? `第 ${index + 1} 个方向` : `第 ${index + 1} 屏`}</strong>
                          <span>{cleanGenerationTitle(direction.title)}</span>
                          <em className="generation-status">
                            {generationQueue.includes(direction.id)
                              ? '生成中'
                              : generatedDirectionIds.has(direction.id)
                                ? '已生成'
                                : failedDirectionIds.has(direction.id)
                                  ? '失败'
                                  : '未生成'}
                          </em>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="actions single-action">
                    <button type="button" className="primary" onClick={generateImage} disabled={generating}>
                      {generating
                        ? `生成中${generationQueue.length ? `（${generationQueue.length}）` : ''}`
                        : isLogoSkill
                          ? `生成 ${logoVariantCount} 张 Logo 方案`
                        : isDetailPageSkill
                          ? generationScope === 'all'
                            ? `生成全部 ${directionResult?.directions.length || 0} 个详情页模块`
                            : generationScope === 'multiple'
                              ? `生成已选 ${selectedGenerationIds.length} 个详情页模块`
                              : '生成单张详情页模块'
                          : isProductImageSetSkill
                            ? generationScope === 'all'
                              ? `生成全部 ${directionResult?.directions.length || 0} 张商品图`
                              : generationScope === 'multiple'
                                ? `生成已选 ${selectedGenerationIds.length} 张商品图`
                                : '生成单张商品图'
                            : isLogoSkill
                              ? generationScope === 'all'
                                ? `生成全部 ${directionResult?.directions.length || 0} 个 Logo 方向`
                                : generationScope === 'multiple'
                                  ? `生成已选 ${selectedGenerationIds.length} 个 Logo 方向`
                                  : '生成当前 Logo 方向'
                              : generationScope === 'all'
                                ? `生成全部 ${directionResult?.directions.length || 0} 张图片`
                                : generationScope === 'multiple'
                                  ? `生成已选 ${selectedGenerationIds.length} 张图片`
                                  : `调用 ${settings?.openai.imageModel || 'gpt-image-2'} 生图`}
                    </button>
                    {generating && (
                      <button type="button" className="secondary" onClick={stopWorkflowGeneration}>
                        暂停生成
                      </button>
                    )}
                  </div>
                  {imageResults.length > 0 && (
                    <p className="image-note">
                      {isDetailPageSkill
                        ? '详情页模块已保留在左侧画廊。当前阶段先逐张生成详情页模块，下一步再做整页拼接交付。'
                        : isProductImageSetSkill
                          ? '整套商品图已保留在左侧画廊。每张都是独立页面，可继续补卖点图、统一风格、改比例或单张优化。'
                        : isLogoSkill
                          ? 'Logo 方案已保留在左侧画廊。下一步可以选择其中一张继续生成行业样机。'
                          : '已生成的作品会保留在左侧画廊，可点击放大或下载。'}
                    </p>
                  )}
                </section>
              )}

              {adjustableImages.length > 0 && visibleStep === stepIndex.expansion && (
                <section className="confirm-card expansion-card">
                  <div>
                    <span className="status-dot" />
                    <p>{isLogoSkill ? '继续生成样机' : '继续扩展'}</p>
                  </div>
                  {isLogoSkill && logoReuseState && (
                    <button type="button" className="secondary reuse-choice-button" onClick={() => applyLogoReuseState('mockup')}>
                      沿用上次样机选择
                    </button>
                  )}
                  <p className="confirm-description">
                    {isLogoSkill
                      ? '先选择一张已生成的 Logo 方案，再选择要生成的行业样机。样机风格可后续从花瓣灵感库人工收录扩展。'
                      : '先选择一张已生成图片，再选择要继续扩展的内容。'}
                  </p>
                  <div className="base-image-strip" aria-label={isLogoSkill ? '选择 Logo 方案' : '选择基准图片'}>
                    {adjustableImages.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        className={selectedBaseImageId === item.id ? 'selected' : ''}
                        onClick={() => setSelectedBaseImageId(item.id)}
                      >
                        <img src={item.imageUrl} alt={item.title} />
                        <em>{item.badge}</em>
                        <span>{item.title}</span>
                      </button>
                    ))}
                  </div>
                  {failedDirections.length > 0 && (
                    <p className="image-note">
                      还有 {failedDirections.length} 张生成失败。底部输入补充要求后，会先调用推理模型重写提示词，并只重试失败图片。
                    </p>
                  )}
                  <div className="delivery-grid">
                    <p className="delivery-title">{isLogoSkill ? '选择样机品类' : '继续扩展图'}</p>
                    <div className="delivery-list">
                      {getExpansionOptions().map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          className={expansionSelections.includes(item.id) ? 'selected' : ''}
                          onClick={() => toggleExpansion(item.id)}
                        >
                          <strong>{item.title}</strong>
                          <span>{item.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {isLogoSkill && (
                    <div className="logo-mockup-size-panel">
                      <p className="delivery-title">选择样机尺寸</p>
                      <div className="mockup-size-options">
                        {[
                          { label: '1:1 方图', value: '1024x1024' },
                          { label: '4:3 横图', value: '1536x1152' },
                          { label: '3:4 竖图', value: '1024x1365' },
                          { label: '16:9 场景横图', value: '1536x864' },
                        ].map((item) => (
                          <button
                            type="button"
                            key={item.value}
                            className={logoMockupSize === item.value ? 'selected' : ''}
                            onClick={() => {
                              setLogoMockupSize(item.value)
                              rememberLogoSelections({ logoMockupSize: item.value })
                            }}
                          >
                            <strong>{item.label}</strong>
                            <span>{item.value}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {getSelectedExpansions().length > 0 && (
                    <div className="expansion-detail-list">
                      {getSelectedExpansions().map((item) => (
                        <section className="expansion-detail" key={item.id}>
                          <p>{item.title} 可选补充</p>
                          {getExpansionFields(item.id).map((field) => (
                            <label key={field.id}>
                              <span>{field.label}</span>
                              {field.options ? (
                                <div className="choice-row">
                                  {field.options.map((option) => (
                                    <button
                                      type="button"
                                      key={option}
                                      className={expansionDetails[item.id]?.[field.id] === option ? 'selected' : ''}
                                      onClick={() => updateExpansionDetail(item.id, field.id, option)}
                                    >
                                      {option}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <textarea
                                  value={expansionDetails[item.id]?.[field.id] || ''}
                                  onChange={(event) => updateExpansionDetail(item.id, field.id, event.target.value)}
                                  placeholder={field.placeholder}
                                />
                              )}
                            </label>
                          ))}
                        </section>
                      ))}
                      {isLogoSkill && (
                        <section className="expansion-detail mockup-reference-uploader">
                          <p>样机参考图</p>
                          <div
                            className={`mockup-upload-dropzone ${isDraggingMockupReference ? 'drag-over' : ''}`}
                            onDragEnter={handleMockupReferenceDragOver}
                            onDragOver={handleMockupReferenceDragOver}
                            onDragLeave={handleMockupReferenceDragLeave}
                            onDrop={handleMockupReferenceDrop}
                          >
                            <input
                              id="mockup-reference-input"
                              className="file-input"
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(event) => {
                                selectMockupReferenceImages(event.target.files)
                                event.currentTarget.value = ''
                              }}
                            />
                            <button
                              type="button"
                              className="mockup-upload-button"
                              aria-label="上传样机参考图"
                              title="上传样机参考图"
                              onClick={() => document.getElementById('mockup-reference-input')?.click()}
                            >
                              <span aria-hidden="true">+</span>
                            </button>
                            <span>点击上传，或把样机/场景参考图拖到这里。最多 6 张，只参考场景、材质和构图。</span>
                          </div>
                          {mockupReferenceImages.length > 0 && (
                            <div className="upload-list mockup-upload-list" aria-label="已选择的样机参考图">
                              {mockupReferenceImages.map((file, index) => (
                                <button type="button" key={`${file.name}-${index}`} onClick={() => removeMockupReferenceImage(index)}>
                                  <span>{file.name}</span>
                                  <em>×</em>
                                </button>
                              ))}
                            </div>
                          )}
                        </section>
                      )}
                    </div>
                  )}
                  <div className={isLogoSkill ? 'actions logo-expansion-actions' : 'actions'}>
                    <button
                      type="button"
                      className={isLogoSkill ? 'secondary icon-back-button' : 'secondary'}
                      onClick={() => setViewStep(stepIndex.generate)}
                      disabled={generating}
                      aria-label={isLogoSkill ? '返回生成 Logo' : undefined}
                      title={isLogoSkill ? '返回生成 Logo' : undefined}
                    >
                      {isLogoSkill ? '' : '生成其他画面'}
                    </button>
                    <button
                      type="button"
                      className="primary"
                      onClick={generateExpansions}
                      disabled={generating}
                    >
                      {generating ? (isLogoSkill ? '样机生成中' : '扩展生成中') : (isLogoSkill ? '生成样机图' : '生成扩展图')}
                    </button>
                    {generating && (
                      <button type="button" className="secondary" onClick={stopWorkflowGeneration}>
                        暂停生成
                      </button>
                    )}
                  </div>
                  {expansionResults.length > 0 && <p className="image-note">{isLogoSkill ? '样机图已追加到左侧画廊，不会覆盖之前的 Logo 方案。' : '扩展图已追加到左侧画廊，不会覆盖之前的方向图。'}</p>}
                </section>
              )}
              {!isMergeImageSkill && operationStatus && <p className="operation-status">{operationStatus}</p>}
            </div>
            <form
              className="followup-composer"
              onSubmit={(event) => {
                event.preventDefault()
                submitFollowUp()
              }}
            >
              <textarea
                value={followUpText}
                onChange={(event) => setFollowUpText(event.target.value)}
                placeholder={
                  failedDirections.length > 0
                    ? '补充失败图片的重试要求，例如：润肤卖点用人物皮肤状态表达，不要产品摆拍'
                    : adjustableImages.length === 0
                      ? '和 Skills Expert 对话整理需求，例如：我想了解你能不能做偏欧美人物的佩戴效果'
                    : '继续描述需求，或对选中的图片布置调整任务'
                }
                rows={2}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    submitFollowUp()
                  }
                }}
              />
              <button type="submit" disabled={!followUpText.trim() || loading || generating}>
                发送
              </button>
            </form>
          </section>
        </div>
      </section>

      {skillsOpen && (
        <div className="settings-backdrop utility-backdrop" role="presentation">
          <section className="settings-panel utility-panel skills-panel" aria-label="Local skills" ref={skillsPanelRef}>
            <div className="settings-head">
              <div>
                <p>Skills</p>
                <h3>本地技能列表</h3>
              </div>
              <button
                type="button"
                className="settings-close-button"
                aria-label="关闭"
                onClick={() => setSkillsOpen(false)}
              />
            </div>
            <div className="skill-directory-list">
              {skills.map((item, index) => (
                <Fragment key={item.id}>
                  {draggingSkillId && skillDragDropIndex === index && (
                    <div className="skill-drop-marker" aria-hidden="true" />
                  )}
                  <article
                  className={draggingSkillId === item.id ? 'skill-card-dragging' : ''}
                  data-skill-id={item.id}
                >
                  <div>
                    <strong>{item.displayName}</strong>
                    <span>{item.name}</span>
                  </div>
                  <p>{item.description}</p>
                  <code>{item.path || item.folder}</code>
                  <footer>
                    <em>{item.referencesCount} 个参考资料</em>
                    <div className="skill-card-actions">
                      <div className={`skill-sort-actions ${openSkillMoveId === item.id ? 'open' : ''}`}>
                        <button
                          type="button"
                          className="skill-icon-button skill-move-toggle"
                          aria-label="移动"
                          title="移动"
                          aria-expanded={openSkillMoveId === item.id}
                          onPointerDown={(event) => beginSkillPointerMove(item.id, event)}
                          onPointerMove={updateSkillPointerMove}
                          onPointerUp={finishSkillPointerMove}
                          onPointerCancel={cancelSkillPointerMove}
                          onClick={(event) => {
                            if (skillDragClickBlockedRef.current) {
                              event.preventDefault()
                              skillDragClickBlockedRef.current = false
                              return
                            }
                            setOpenSkillMoveId((current) => current === item.id ? '' : item.id)
                          }}
                        >
                          <MoveIcon />
                        </button>
                        {openSkillMoveId === item.id && (
                          <div className="skill-sort-expanded" aria-label="技能排序">
                            <button
                              type="button"
                              className="skill-icon-button"
                              aria-label="一键置顶"
                              title="一键置顶"
                              disabled={index === 0 || movingSkillId === item.id}
                              onClick={() => reorderSkill(item.id, 'top')}
                            >
                              <PinTopIcon />
                            </button>
                            <button
                              type="button"
                              className="skill-icon-button"
                              aria-label="上移"
                              title="上移"
                              disabled={index === 0 || movingSkillId === item.id}
                              onClick={() => reorderSkill(item.id, 'up')}
                            >
                              <MoveUpIcon />
                            </button>
                            <button
                              type="button"
                              className="skill-icon-button"
                              aria-label="下移"
                              title="下移"
                              disabled={index === skills.length - 1 || movingSkillId === item.id}
                              onClick={() => reorderSkill(item.id, 'down')}
                            >
                              <MoveDownIcon />
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="skill-delete-button"
                        onClick={() => setSkillDeleteConfirm({ id: item.id, displayName: item.displayName })}
                      >
                        <TrashIcon />
                        删除
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSkill(item.id)
                          setSkillsOpen(false)
                        }}
                      >
                        使用这个 Skill
                      </button>
                    </div>
                  </footer>
                  </article>
                  {draggingSkillId && skillDragDropIndex === skills.length && index === skills.length - 1 && (
                    <div className="skill-drop-marker" aria-hidden="true" />
                  )}
                </Fragment>
              ))}
            </div>
            {skillDeleteConfirm && (
              <div className="skill-confirm-backdrop" role="presentation">
                <section className="skill-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="skill-delete-title">
                  <div>
                    <p>Confirm</p>
                    <h3 id="skill-delete-title">删除 Skill</h3>
                  </div>
                  <p>{`确定删除「${skillDeleteConfirm.displayName}」吗？删除后将从本地技能列表移除。`}</p>
                  <div className="skill-confirm-actions">
                    <button
                      type="button"
                      className="skill-confirm-cancel"
                      disabled={deletingSkill}
                      onClick={() => setSkillDeleteConfirm(null)}
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      className="skill-confirm-delete"
                      disabled={deletingSkill}
                      onClick={() => deleteSkill(skillDeleteConfirm)}
                    >
                      <TrashIcon />
                      {deletingSkill ? '删除中' : '确认删除'}
                    </button>
                  </div>
                </section>
              </div>
            )}
            <button
              type="button"
              className="project-back-top skill-back-top"
              aria-label="返回顶部"
              onClick={() => skillsPanelRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <BackToTopIcon />
            </button>
          </section>
        </div>
      )}

      <ProjectsPanel
        open={projectsOpen}
        loading={projectsLoading}
        projects={projects}
        onClose={() => setProjectsOpen(false)}
        onRefresh={refreshProjectsPanel}
        onOpenLightbox={openLightbox}
        onDownload={(imageUrl, title) => downloadImage(imageUrl, title)}
        onDownloadMany={downloadImages}
        onDeleteProjects={deleteProjects}
        onDeleteImages={deleteProjectImages}
        onReuseProjectReferences={reuseProjectReferences}
        onError={setError}
      />

      {createSkillOpen && (
        <div className="settings-backdrop utility-backdrop" role="presentation">
          <section className="settings-panel utility-panel create-skill-panel" aria-label="创建技能">
            <div className="settings-head">
              <div>
                <p>创建技能</p>
                <h3>创建自己的技能</h3>
              </div>
              <button
                type="button"
                className="settings-close-button"
                aria-label="关闭"
                onClick={() => setCreateSkillOpen(false)}
              />
            </div>
            <div className="create-skill-layout">
              <div className="create-skill-form">
                <label>
                  显示名称
                  <input
                    value={skillCreateForm.displayName}
                    onChange={(event) => updateSkillCreateField('displayName', event.target.value)}
                    placeholder="例如：包装文案专家"
                  />
                </label>
                <label>
                  技术名
                  <input
                    value={skillCreateForm.name}
                    onChange={(event) => updateSkillCreateField('name', event.target.value)}
                    placeholder="可留空，自动生成英文连字符名称"
                  />
                </label>
                <label>
                  分类
                  <input
                    value={skillCreateForm.category}
                    onChange={(event) => updateSkillCreateField('category', event.target.value)}
                  />
                </label>
                <label>
                  用途与触发
                  <textarea
                    value={skillCreateForm.purpose}
                    onChange={(event) => updateSkillCreateField('purpose', event.target.value)}
                    placeholder="这个技能具体帮你做什么？什么时候应该触发？"
                  />
                </label>
                <label>
                  触发关键词/边界
                  <textarea
                    value={skillCreateForm.triggers}
                    onChange={(event) => updateSkillCreateField('triggers', event.target.value)}
                    placeholder="例如：用户提到包装文案、卖点提炼、包装背标时使用；普通 Logo 设计不使用。"
                  />
                </label>
                <label>
                  领域知识
                  <textarea
                    value={skillCreateForm.knowledge}
                    onChange={(event) => updateSkillCreateField('knowledge', event.target.value)}
                    placeholder="写入它需要知道的专业流程、判断标准、行业规则。"
                  />
                </label>
                <label>
                  输出格式与约束
                  <textarea
                    value={skillCreateForm.outputFormat}
                    onChange={(event) => updateSkillCreateField('outputFormat', event.target.value)}
                    placeholder="希望输出 Markdown、JSON、清单、提示词、方案表等。"
                  />
                </label>
                <label>
                  限制与禁区
                  <textarea
                    value={skillCreateForm.constraints}
                    onChange={(event) => updateSkillCreateField('constraints', event.target.value)}
                    placeholder="例如：不要输出泛泛建议；不要处理无关任务；信息不足时先确认关键条件。"
                  />
                </label>
                <label>
                  模型/能力需求
                  <textarea
                    value={skillCreateForm.modelNeeds}
                    onChange={(event) => updateSkillCreateField('modelNeeds', event.target.value)}
                    placeholder="例如：需要读取参考资料；需要图片生成；只需要文本推理。"
                  />
                </label>
                <label>
                  参考资料计划或内容
                  <textarea
                    value={skillCreateForm.referenceContent || skillCreateForm.referencesPlan}
                    onChange={(event) => {
                      updateSkillCreateField('referencesPlan', event.target.value)
                      updateSkillCreateField('referenceContent', event.target.value)
                    }}
                    placeholder="可以粘贴长规范、案例、术语表；创建时会保存为参考资料。"
                  />
                </label>
                <button type="button" className="primary" onClick={draftSkillOutline} disabled={draftingSkill}>
                  {draftingSkill ? '生成大纲中' : '生成设计大纲'}
                </button>
              </div>
              <div className="create-skill-outline">
                <div>
                  <strong>设计大纲</strong>
                  <span>确认后才会写入本地技能文件夹</span>
                </div>
                {skillCreateProviderError && <p className="provider-note">{skillCreateProviderError}</p>}
                <textarea
                  value={skillCreateOutline}
                  onChange={(event) => setSkillCreateOutline(event.target.value)}
                  placeholder="先填写左侧信息，然后生成设计大纲。"
                />
                {skillCreateStatus && <p className="operation-status">{skillCreateStatus}</p>}
                <button type="button" className="primary" onClick={createLocalSkill} disabled={creatingSkill || !skillCreateOutline.trim()}>
                  {creatingSkill ? '创建中' : '确认创建本地技能'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {settingsOpen && (
        <div className="settings-backdrop" role="presentation">
          <section className="settings-panel" aria-label="接口设置">
            <div className="settings-head">
              <div>
                <p>设置</p>
                <h3>接口配置</h3>
              </div>
              <button
                type="button"
                className="settings-close-button"
                aria-label="关闭"
                onClick={() => setSettingsOpen(false)}
              />
            </div>

            <div className="settings-status">
              <button
                type="button"
                className={settingsTab === 'reasoning' ? 'active' : ''}
                onClick={() => setSettingsTab('reasoning')}
              >
                <strong>智能推理</strong>
                <span>{settings?.reasoning.configured ? settings.reasoning.apiKeyMasked : '未配置'}</span>
              </button>
              <button
                type="button"
                className={settingsTab === 'openai' ? 'active' : ''}
                onClick={() => setSettingsTab('openai')}
              >
                <strong>GPT 生图</strong>
                <span>{settings?.openai.configured ? settings.openai.apiKeyMasked : '未配置'}</span>
              </button>
            </div>

            {settingsTab === 'reasoning' && (
              <div className="settings-section">
                <div className="settings-copy">
                  <p>智能推理配置</p>
                  <span>用于读取技能说明、识别参考资料、生成确认卡和提示词方向。</span>
                </div>
                <div className="settings-grid single-provider">
                  <label>
                    接口密钥
                    <input
                      type="password"
                      value={settingsForm.reasoningApiKey}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, reasoningApiKey: event.target.value }))
                      }
                      placeholder="留空则保留已保存的 Key"
                    />
                  </label>
                  <label>
                    Base URL
                    <input
                      value={settingsForm.reasoningBaseURL}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, reasoningBaseURL: event.target.value }))
                      }
                      placeholder="https://..."
                    />
                  </label>
                  <label>
                    模型
                    <input
                      value={settingsForm.reasoningModel}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, reasoningModel: event.target.value }))
                      }
                      placeholder="gpt-5.5..."
                    />
                  </label>
                </div>
              </div>
            )}

            {settingsTab === 'openai' && (
              <div className="settings-section">
                <div className="settings-copy">
                  <p>GPT 生图配置</p>
                  <span>用于最终确认提示词后调用图片模型生成并保存结果。</span>
                </div>
                <div className="settings-grid single-provider">
                  <label>
                    接口密钥
                    <input
                      type="password"
                      value={settingsForm.openaiApiKey}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, openaiApiKey: event.target.value }))
                      }
                      placeholder="留空则保留已保存的 Key"
                    />
                  </label>
                  <label>
                    Base URL
                    <input
                      value={settingsForm.openaiBaseURL}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, openaiBaseURL: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    生图模型
                    <input
                      value={settingsForm.openaiImageModel}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, openaiImageModel: event.target.value }))
                      }
                    />
                  </label>
                </div>
              </div>
            )}

            <button type="button" className="primary save-settings" onClick={saveSettings} disabled={savingSettings}>
              {savingSettings ? '保存中' : '保存配置'}
            </button>
          </section>
        </div>
      )}

      {mergeReferenceModalSlot && (
        <div className="merge-reference-modal-backdrop" role="presentation" onClick={() => setMergeReferenceModalSlot('')}>
          <section className="merge-reference-modal" role="dialog" aria-modal="true" aria-label={`${mergeReferenceSlotLabel(mergeReferenceModalSlot)}管理`} onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <strong>{mergeReferenceSlotLabel(mergeReferenceModalSlot)}</strong>
                <span>{(mergeImageFiles[mergeReferenceModalSlot] || []).length} {mergeReferenceModalHint(mergeReferenceModalSlot)}</span>
              </div>
              <button type="button" aria-label="关闭" onClick={() => setMergeReferenceModalSlot('')}>
                ×
              </button>
            </header>
            <div className="merge-reference-modal-grid">
              {(mergeImageFiles[mergeReferenceModalSlot] || []).map((file, index) => (
                <figure key={`${file.name}-${index}`}>
                  <img src={mergeImagePreviewUrls[`${mergeReferenceModalSlot}-${index}`]} alt={`${mergeReferenceSlotLabel(mergeReferenceModalSlot)} ${index + 1}`} />
                  <button type="button" onClick={() => removeMergeImage(mergeReferenceModalSlot, index)}>
                    ×
                  </button>
                  <figcaption>{mergeReferenceSlotLabel(mergeReferenceModalSlot)} {index + 1}</figcaption>
                </figure>
              ))}
              {(mergeImageFiles[mergeReferenceModalSlot] || []).length < mergeAngleBatchLimit && (
                <label
                  className={`merge-reference-add ${draggingMergeImageSlot === `${mergeReferenceModalSlot}-modal` ? 'drag-over' : ''}`}
                  onDragEnter={(event) => handleMergeImageDragOver(event, `${mergeReferenceModalSlot}-modal`)}
                  onDragOver={(event) => handleMergeImageDragOver(event, `${mergeReferenceModalSlot}-modal`)}
                  onDragLeave={(event) => handleMergeImageDragLeave(event, `${mergeReferenceModalSlot}-modal`)}
                  onDrop={(event) => {
                    event.preventDefault()
                    setDraggingMergeImageSlot('')
                    selectMergeImage(mergeReferenceModalSlot, event.dataTransfer.files)
                  }}
                >
                  <span className="slot-plus" aria-hidden="true" />
                  <strong>添加{mergeReferenceSlotLabel(mergeReferenceModalSlot)}</strong>
                  <small>点击上传或拖入图片</small>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => {
                      selectMergeImage(mergeReferenceModalSlot, event.currentTarget.files)
                      event.currentTarget.value = ''
                    }}
                  />
                </label>
              )}
            </div>
          </section>
        </div>
      )}
      {lightboxImage && (
        <div className="lightbox-backdrop" role="presentation" onClick={closeLightbox}>
          <section className="lightbox-panel" aria-label="Image preview" onClick={(event) => event.stopPropagation()}>
            <div className="lightbox-head">
              <p>
                {lightboxImage.title}
                {lightboxItems.length > 1 && (
                  <span>{` ${Math.max(1, lightboxItems.findIndex((item) => item.imageUrl === lightboxImage.imageUrl) + 1)} / ${lightboxItems.length}`}</span>
                )}
              </p>
              <div>
                <span className="lightbox-zoom-label">{Math.round(lightboxZoom * 100)}%</span>
                <button type="button" onClick={resetLightboxView}>
                  <ResetIcon />
                  重置
                </button>
                <button
                  type="button"
                  className="lightbox-svg-button"
                  aria-describedby="svg-convert-tip"
                  disabled={Boolean(svgConvertingUrl)}
                  onClick={() => convertLightboxToSvg()}
                >
                  <SvgConvertIcon />
                  {svgConvertingUrl === lightboxImage.imageUrl ? '转换中' : '转 SVG'}
                  <span id="svg-convert-tip" className="lightbox-button-tip" role="tooltip">
                    如当前图片中有比较小的文字，识别会不够完美，需手动调整。
                  </span>
                </button>
                {lightboxConvertedSvgUrl && (
                  <button
                    type="button"
                    className="lightbox-svg-button"
                    onClick={() =>
                      downloadImage(lightboxConvertedSvgUrl, `${lightboxImage.title} SVG`).catch((e) =>
                        setError(e instanceof Error ? e.message : 'SVG 下载失败。'),
                      )
                    }
                  >
                    <DownloadIcon />
                    下载 SVG
                  </button>
                )}
                <button
                  type="button"
                  className="lightbox-cutout-button"
                  disabled={Boolean(cutoutLoadingUrl)}
                  onClick={() => removeLightboxBackground()}
                >
                  <CutoutIcon />
                  {cutoutLoadingUrl === lightboxImage.imageUrl ? '抠图中' : '抠图'}
                </button>
                <button type="button" onClick={() => downloadImage(lightboxImage.imageUrl, lightboxImage.title).catch((e) => setError(e instanceof Error ? e.message : '下载失败。'))}>
                  <DownloadIcon />
                  下载
                </button>
                <button type="button" className="lightbox-close-button" aria-label="关闭" onClick={closeLightbox}>
                  <CloseIcon />
                </button>
              </div>
            </div>
            <div
              className={`lightbox-image-stage ${lightboxZoom > 1 ? 'zoomed' : ''} ${lightboxDrag ? 'dragging' : ''}`}
              onWheel={handleLightboxWheel}
              onMouseDown={handleLightboxPointerDown}
              onMouseMove={handleLightboxPointerMove}
              onMouseUp={stopLightboxDrag}
              onMouseLeave={stopLightboxDrag}
              onDoubleClick={resetLightboxView}
            >
              {lightboxStatus && <div className="lightbox-status">{lightboxStatus}</div>}
              {lightboxItems.length > 1 && (
                <>
                  <button
                    type="button"
                    className="lightbox-nav-button previous"
                    aria-label="Previous image"
                    onClick={(event) => {
                      event.stopPropagation()
                      moveLightbox(-1)
                    }}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="lightbox-nav-button next"
                    aria-label="Next image"
                    onClick={(event) => {
                      event.stopPropagation()
                      moveLightbox(1)
                    }}
                  >
                    ›
                  </button>
                </>
              )}
              <img
                src={lightboxImage.imageUrl}
                alt={lightboxImage.title}
                draggable={false}
                style={{
                  transform: `translate(${lightboxPan.x}px, ${lightboxPan.y}px) scale(${lightboxZoom})`,
                }}
              />
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default App


