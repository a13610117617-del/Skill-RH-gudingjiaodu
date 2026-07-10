(() => {
  const skillName = 'ai-multi-angle-skill'
  const maxFilesPerSlot = 3
  const defaultReferenceUrl = '/assets/multi-angle-default-reference.jpg'
  const requiredCustomSlots = ['front', 'left', 'back']
  const slots = [
    ['front', '\u6b63\u89c6\u56fe', '\u5546\u54c1\u6b63\u9762\u3001\u4e3b\u56fe\u89d2\u5ea6'],
    ['left', '\u5de6\u4fa7\u89c6\u56fe', '\u5de6\u4fa7\u8f6e\u5ed3\u4e0e\u539a\u5ea6'],
    ['back', '\u80cc\u9762', '\u80cc\u90e8\u7ed3\u6784\u3001\u6807\u7b7e\u6216\u63a5\u53e3'],
    ['right', '\u53f3\u4fa7\u89c6\u56fe', '\u53f3\u4fa7\u8f6e\u5ed3\u4e0e\u7ec6\u8282'],
    ['top', '\u9876\u90e8', '\u9876\u90e8\u6309\u94ae\u3001\u5f00\u53e3\u6216\u7eb9\u7406'],
    ['bottom', '\u5e95\u90e8', '\u5e95\u6807\u3001\u811a\u57ab\u6216\u5e95\u5ea7'],
    ['detail', '\u7ec6\u8282\u7279\u5199', 'Logo\u3001\u6750\u8d28\u3001\u7eb9\u7406\u3001\u63a5\u53e3'],
    ['package', '\u5305\u88c5/\u914d\u4ef6', '\u5305\u88c5\u76d2\u3001\u914d\u4ef6\u3001\u5957\u88c5'],
    ['other', '\u5176\u4ed6\u89c6\u89d2', '\u659c\u4fa7\u3001\u5185\u90e8\u3001\u7279\u6b8a\u89d2\u5ea6\u6216\u5176\u4ed6\u53c2\u8003'],
  ]
  const viewTemplate = [
    '\u5de6\u524d 45 \u5ea6',
    '\u53f3\u524d 45 \u5ea6',
    '\u4fef\u89c6\u659c\u524d\u89d2\u5ea6',
    '\u5c40\u90e8\u7ec6\u8282\u7279\u5199',
    '\u6b63\u9876\u89c6',
    '\u53f3\u4fa7\u659c\u524d\u89d2\u5ea6',
    '\u5de6\u4fa7\u5e73\u89c6',
    '\u5e95\u90e8\u6216\u5e95\u9762',
    '\u53f3\u4fa7\u5e73\u89c6',
    '\u540c\u6b3e\u591a\u8272\u7ec4\u5408',
    '\u80cc\u9762\u5e73\u89c6',
    '\u7ec4\u5408\u9648\u5217\u89d2\u5ea6',
  ]

  let skillId = ''
  let generationMode = 'random'
  let viewCount = 6
  let outputMode = 'combined'
  let selectedSize = 'auto'
  let running = false
  let extraNote = ''
  const filesBySlot = new Map()
  const customReferenceFiles = []
  const sizeOptions = [
    ['1024x1024', '1:1'],
    ['1024x1364', '3:4'],
    ['1536x1152', '4:3'],
    ['1536x864', '16:9'],
    ['864x1536', '9:16'],
    ['1536x658', '21:9'],
    ['auto', '\u667a\u80fd\u5c3a\u5bf8'],
  ]

  const style = document.createElement('style')
  style.textContent = `
    .multi-angle-shell { display:grid; gap:10px; margin-top:14px; }
    .multi-angle-mode-card, .multi-angle-adapter { border:1px solid rgba(232,238,242,.16); border-radius:8px; background:rgba(255,255,255,.045); }
    .multi-angle-mode-card { display:grid; gap:8px; padding:12px; }
    .multi-angle-mode-card > span { color:rgba(247,251,253,.62); font-size:.78rem; line-height:1.4; }
    .multi-angle-adapter { display:grid; gap:16px; padding:16px; }
    .multi-angle-adapter-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
    .multi-angle-adapter h3 { margin:0 0 5px; color:#f7fbfd; font-size:1rem; letter-spacing:0; }
    .multi-angle-adapter p, .multi-angle-status, .multi-angle-result { margin:0; color:rgba(247,251,253,.68); font-size:.82rem; line-height:1.5; }
    .multi-angle-count { flex:none; padding:5px 9px; border-radius:999px; background:rgba(223,255,0,.14); color:#dfff00; font-size:.78rem; }
    .multi-angle-mode { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
    .multi-angle-mode button, .multi-angle-segment button, .multi-angle-size button, .multi-angle-output button, .multi-angle-submit { min-height:38px; border:1px solid rgba(232,238,242,.16); border-radius:7px; background:rgba(255,255,255,.055); color:rgba(247,251,253,.78); cursor:pointer; }
    .multi-angle-mode button { display:grid; gap:3px; padding:10px; text-align:left; }
    .multi-angle-mode button.active, .multi-angle-segment button.active, .multi-angle-size button.active, .multi-angle-output button.active { border-color:#dfff00; background:#dfff00; color:#11151a; }
    .multi-angle-mode span, .multi-angle-output span { color:inherit; opacity:.72; font-size:.72rem; line-height:1.35; }
    .multi-angle-hint { padding:10px 11px; border:1px solid rgba(223,255,0,.18); border-radius:8px; background:rgba(223,255,0,.06); color:rgba(247,251,253,.72); font-size:.78rem; line-height:1.5; }
    .multi-angle-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
    .multi-angle-slot { min-height:116px; border:1px dashed rgba(232,238,242,.22); border-radius:8px; background:rgba(255,255,255,.035); overflow:hidden; }
    .multi-angle-slot.required-missing { border-color:rgba(255,178,178,.65); background:rgba(255,178,178,.045); }
    .multi-angle-slot.has-file { border-style:solid; border-color:rgba(223,255,0,.56); background:rgba(223,255,0,.055); }
    .multi-angle-slot input { display:none; }
    .multi-angle-slot > button { width:100%; min-height:92px; padding:12px; border:0; background:transparent; color:#f7fbfd; text-align:left; cursor:pointer; }
    .multi-angle-slot > button:disabled { cursor:not-allowed; opacity:.5; }
    .multi-angle-slot strong, .multi-angle-option-label { display:block; color:#f7fbfd; font-size:.84rem; }
    .multi-angle-slot span { display:block; margin-top:5px; color:rgba(247,251,253,.56); font-size:.76rem; line-height:1.45; }
    .multi-angle-slot .required-mark { color:#ffb2b2; }
    .multi-angle-preview-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; padding:0 8px 8px; }
    .multi-angle-preview-grid figure { position:relative; margin:0; overflow:hidden; border-radius:6px; background:rgba(0,0,0,.2); }
    .multi-angle-preview-grid img { display:block; width:100%; aspect-ratio:1/1; object-fit:cover; }
    .multi-angle-preview-grid figcaption { position:absolute; right:4px; bottom:4px; left:4px; overflow:hidden; padding:3px 5px; border-radius:4px; background:rgba(0,0,0,.56); color:rgba(247,251,253,.86); text-overflow:ellipsis; white-space:nowrap; font-size:.66rem; }
    .multi-angle-preview-grid a { position:absolute; top:4px; right:4px; padding:2px 5px; border-radius:4px; background:rgba(0,0,0,.62); color:#ffb2b2; text-decoration:none; font-size:.66rem; cursor:pointer; }
    .multi-angle-options { display:grid; gap:12px; }
    .multi-angle-segment { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin-top:8px; }
    .multi-angle-size { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin-top:8px; }
    .multi-angle-size button { min-height:36px; padding:0 8px; text-align:center; white-space:nowrap; }
    .multi-angle-output { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; margin-top:8px; }
    .multi-angle-output button { display:grid; gap:3px; padding:10px; text-align:left; }
    .multi-angle-note { display:grid; gap:8px; }
    .multi-angle-note textarea { width:100%; min-height:86px; resize:vertical; padding:10px 11px; border:1px solid rgba(232,238,242,.16); border-radius:8px; outline:0; background:rgba(255,255,255,.045); color:#f7fbfd; font:inherit; font-size:.82rem; line-height:1.5; }
    .multi-angle-note textarea::placeholder { color:rgba(247,251,253,.38); }
    .multi-angle-submit { min-height:44px; border-color:#dfff00; background:#dfff00; color:#11151a; font-weight:760; }
    .multi-angle-submit:disabled { border-color:rgba(232,238,242,.16); background:rgba(255,255,255,.06); color:rgba(247,251,253,.38); cursor:not-allowed; }
    .multi-angle-result { white-space:pre-wrap; }
    .multi-angle-error { color:#ffb2b2; }
    .multi-angle-generated-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-top:10px; }
    .multi-angle-generated-grid figure { margin:0; overflow:hidden; border:1px solid rgba(232,238,242,.14); border-radius:8px; background:rgba(255,255,255,.045); }
    .multi-angle-generated-grid img { display:block; width:100%; aspect-ratio:1/1; object-fit:cover; background:rgba(0,0,0,.18); }
    .multi-angle-generated-grid button { display:block; width:100%; padding:0; border:0; background:transparent; cursor:zoom-in; }
    .multi-angle-generated-grid figcaption { padding:8px; color:rgba(247,251,253,.74); font-size:.76rem; line-height:1.35; }
    .multi-angle-lightbox { position:fixed; inset:0; z-index:99999; display:grid; place-items:center; padding:28px; background:rgba(0,0,0,.82); }
    .multi-angle-lightbox-panel { width:min(96vw,1100px); max-height:92vh; display:grid; gap:12px; }
    .multi-angle-lightbox-head { display:flex; align-items:center; justify-content:space-between; gap:12px; color:#f7fbfd; }
    .multi-angle-lightbox-head strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .multi-angle-lightbox-actions { display:flex; gap:8px; flex:none; }
    .multi-angle-lightbox-actions button, .multi-angle-lightbox-actions a { min-width:34px; min-height:34px; display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:0 10px; border:1px solid rgba(247,251,253,.22); border-radius:7px; background:rgba(7,12,15,.74); color:#f7fbfd; text-decoration:none; font-size:.78rem; line-height:1; backdrop-filter:blur(10px); cursor:pointer; }
    .multi-angle-lightbox-actions svg { width:15px; height:15px; display:block; stroke:currentColor; }
    .multi-angle-lightbox-actions .download { border-color:rgba(223,255,0,.55); color:#dfff00; }
    .multi-angle-lightbox-viewport { overflow:hidden; display:grid; place-items:center; max-height:calc(92vh - 58px); border-radius:8px; background:#11151a; }
    .multi-angle-lightbox img { display:block; max-width:100%; max-height:calc(92vh - 58px); margin:auto; border-radius:8px; object-fit:contain; transform-origin:center center; transition:transform .12s ease; cursor:zoom-in; }
    @media (max-width:760px) { .multi-angle-grid, .multi-angle-output, .multi-angle-generated-grid, .multi-angle-mode { grid-template-columns:1fr; } .multi-angle-segment, .multi-angle-size { grid-template-columns:repeat(2,minmax(0,1fr)); } }
  `
  document.head.appendChild(style)

  function isMultiAngleSelected() {
    const frame = document.querySelector('[data-current-skill-id]')
    const id = frame?.dataset.currentSkillId || ''
    const name = frame?.dataset.currentSkillName || ''
    const displayName = frame?.dataset.currentSkillDisplayName || ''
    return (
      name === skillName ||
      id === 'ai-multi-angle-skill-local' ||
      /multi-angle/i.test(id) ||
      displayName === '\u4ea7\u54c1\u591a\u89d2\u5ea6\u89c6\u56fe'
    )
  }

  async function resolveSkillId() {
    if (skillId) return skillId
    const response = await fetch('/api/skills')
    const data = await response.json()
    const skill = Array.isArray(data.skills) ? data.skills.find((item) => item.name === skillName) : null
    skillId = skill?.id || ''
    return skillId
  }

  function totalFiles() {
    return [...filesBySlot.values()].reduce((sum, files) => sum + files.length, 0)
  }

  function customReady() {
    return requiredCustomSlots.every((slotId) => (filesBySlot.get(slotId) || []).length > 0)
  }

  function canSubmit() {
    return generationMode === 'custom' ? customReady() : totalFiles() > 0
  }

  function selectedSizeLabel() {
    const option = sizeOptions.find(([value]) => value === selectedSize)
    return option?.[1] || '\u667a\u80fd\u5c3a\u5bf8'
  }

  function normalizeSeparateTargets(directions) {
    const source = Array.isArray(directions) ? directions : []
    return Array.from({ length: viewCount }, (_, index) => {
      const direction = source[index] || {}
      const title = direction.title || viewTemplate[index] || `\u89c6\u56fe ${index + 1}`
      return {
        id: direction.id || `multi-angle-view-${index + 1}`,
        title,
        description: direction.description || `\u5355\u72ec\u751f\u6210\u7b2c ${index + 1} \u5f20\u4ea7\u54c1\u591a\u89d2\u5ea6\u89c6\u56fe\uff1a${title}\u3002\u53ea\u8f93\u51fa\u8fd9\u4e00\u4e2a\u89d2\u5ea6\uff0c\u4e0d\u8981\u505a\u591a\u56fe\u62fc\u7248\u6216\u5408\u96c6\u3002`,
      }
    })
  }

  function slotLabel(slotId) {
    const slot = slots.find(([id]) => id === slotId)
    return slot?.[1] || slotId
  }

  function viewMapText() {
    const lines = []
    slots.forEach(([id, label]) => {
      ;(filesBySlot.get(id) || []).forEach((file, index) => {
        lines.push(`product-view-${id}-${index + 1} = ${label} = ${file.name}`)
      })
    })
    if (generationMode === 'custom') {
      customReferenceFiles.forEach((file, index) => {
        lines.push(`view-layout-reference-${index + 1} = \u89d2\u5ea6\u53c2\u8003\u56fe = ${file.name}`)
      })
      if (!customReferenceFiles.length) lines.push('view-layout-reference-default = \u9ed8\u8ba4 12 \u5bab\u683c\u89d2\u5ea6\u53c2\u8003\u56fe')
    }
    return lines.join('\n')
  }

  function buildBrief() {
    const uploadedAngles = slots
      .filter(([id]) => (filesBySlot.get(id) || []).length > 0)
      .map(([id, label]) => `${label}: ${(filesBySlot.get(id) || []).length} \u5f20`)
      .join('\n')
    const customReference = generationMode === 'custom'
      ? customReferenceFiles.length
        ? `\u81ea\u5b9a\u4e49\u89d2\u5ea6\u53c2\u8003\u56fe\uff1a${customReferenceFiles.length} \u5f20\uff0c\u8bf7\u4e25\u683c\u6309\u7528\u6237\u7ed9\u7684\u53c2\u8003\u56fe\u89c6\u89d2\u751f\u6210\u3002`
        : `\u81ea\u5b9a\u4e49\u89d2\u5ea6\u53c2\u8003\u56fe\uff1a\u7528\u6237\u672a\u4e0a\u4f20\uff0c\u8bf7\u6309\u7cfb\u7edf\u9644\u5e26\u7684 12 \u5bab\u683c\u978b\u5b50\u53c2\u8003\u56fe\u7684\u89c6\u89d2\u7ed3\u6784\u751f\u6210\uff0c\u89c6\u89d2\u987a\u5e8f\u4e3a\uff1a${viewTemplate.slice(0, viewCount).join('\u3001')}\u3002`
      : '\u968f\u673a\u6a21\u5f0f\uff1a\u6839\u636e\u7528\u6237\u4e0a\u4f20\u7684\u4ea7\u54c1\u56fe\u81ea\u52a8\u5206\u6790\u5e76\u9009\u62e9\u9002\u5408\u7684\u7535\u5546\u89c6\u89d2\u3002'
    return [
      '\u4efb\u52a1\uff1a\u6839\u636e\u7528\u6237\u4e0a\u4f20\u7684\u4ea7\u54c1\u56fe\u7247\u751f\u6210\u7535\u5546\u4ea7\u54c1\u591a\u89d2\u5ea6\u89c6\u56fe\u3002',
      `\u751f\u6210\u6a21\u5f0f\uff1a${generationMode === 'custom' ? '\u81ea\u5b9a\u4e49' : '\u968f\u673a'}\u3002`,
      generationMode === 'custom' ? '\u81ea\u5b9a\u4e49\u6a21\u5f0f\u5df2\u8981\u6c42\u7528\u6237\u5fc5\u987b\u4e0a\u4f20\u6b63\u89c6\u56fe\u3001\u5de6\u4fa7\u89c6\u56fe\u548c\u80cc\u9762\u4e09\u89c6\u56fe\u3002\u4ea7\u54c1\u5916\u89c2\u4ee5\u4e09\u89c6\u56fe\u4e3a\u4e3b\uff0c\u89c6\u89d2\u6784\u56fe\u4ee5\u89d2\u5ea6\u53c2\u8003\u56fe\u4e3a\u4e3b\u3002' : '\u968f\u673a\u6a21\u5f0f\u4e0d\u5f3a\u5236\u4e09\u89c6\u56fe\uff0c\u53ef\u6839\u636e\u5df2\u4e0a\u4f20\u56fe\u7247\u5206\u6790\u51fa\u6700\u5408\u9002\u89c6\u89d2\u3002',
      `\u7528\u6237\u9009\u62e9\u5bfc\u51fa\uff1a${viewCount} \u4e2a\u89c6\u56fe\u3002`,
      `\u8f93\u51fa\u65b9\u5f0f\uff1a${outputMode === 'combined' ? '\u751f\u6210\u5728\u540c\u4e00\u5f20\u56fe\u7247\u91cc' : '\u5206\u5f00\u751f\u6210\uff0c\u6bcf\u4e2a\u89d2\u5ea6\u5355\u72ec\u8f93\u51fa\u56fe\u7247'}\u3002`,
      `\u5c3a\u5bf8\u6bd4\u4f8b\uff1a${selectedSizeLabel()}${selectedSize === 'auto' ? '\uff0c\u7531\u540e\u53f0\u6839\u636e\u5e73\u53f0\u7528\u9014\u667a\u80fd\u5224\u65ad' : `\uff0c\u8bf7\u4e25\u683c\u6309 ${selectedSize} \u753b\u5e03\u751f\u6210`}\u3002`,
      '\u5df2\u4e0a\u4f20\u4ea7\u54c1\u89d2\u5ea6\uff1a',
      uploadedAngles || '\u7528\u6237\u5df2\u4e0a\u4f20\u4ea7\u54c1\u56fe\u7247\uff0c\u4f46\u672a\u6307\u5b9a\u5177\u4f53\u89d2\u5ea6\u3002',
      '\u4e0a\u4f20\u56fe\u7247\u89c6\u56fe\u5bf9\u7167\u8868\uff08\u751f\u6210\u65f6\u5fc5\u987b\u6309\u8fd9\u4e2a\u5bf9\u7167\u8868\u8bfb\u53d6\u6bcf\u5f20\u53c2\u8003\u56fe\uff09\uff1a',
      viewMapText() || '\u6682\u65e0\u89c6\u56fe\u5bf9\u7167\u8868\u3002',
      customReference,
      extraNote.trim() ? `\u7528\u6237\u8865\u5145\u8bf4\u660e\uff1a\n${extraNote.trim()}` : '\u7528\u6237\u6ca1\u6709\u586b\u5199\u8865\u5145\u8bf4\u660e\u3002',
      '\u4e00\u81f4\u6027\u786c\u6027\u8981\u6c42\uff1a\u751f\u6210\u7ed3\u679c\u5fc5\u987b\u8bfb\u53d6\u5e76\u4ee5\u7528\u6237\u4e0a\u4f20\u7684\u4ea7\u54c1\u89c6\u56fe\u4e3a\u786c\u53c2\u8003\uff0c\u4fdd\u6301\u540c\u4e00 SKU \u548c\u540c\u4e00\u4ef6\u4ea7\u54c1\uff0c\u4e0d\u80fd\u6362\u6210\u76f8\u4f3c\u6b3e\u3001\u65b0\u6b3e\u6216\u91cd\u65b0\u8bbe\u8ba1\u7684\u4ea7\u54c1\u3002',
      '\u4ea7\u54c1\u5fc5\u987b 100% \u4e00\u81f4\uff1a\u989c\u8272\u3001\u6750\u8d28\u3001\u6bd4\u4f8b\u3001\u8f6e\u5ed3\u3001\u7ed3\u6784\u3001Logo\u3001\u6807\u7b7e\u3001\u6587\u5b57\u4f4d\u7f6e\u3001\u7eb9\u7406\u3001\u7f1d\u7ebf\u3001\u63a5\u53e3\u3001\u914d\u4ef6\u548c\u5305\u88c5\u4fe1\u606f\u90fd\u8981\u4e0e\u4e0a\u4f20\u56fe\u4e00\u81f4\u3002\u53ea\u80fd\u6539\u53d8\u76f8\u673a\u89d2\u5ea6\u548c\u753b\u9762\u6392\u7248\uff0c\u4e0d\u80fd\u6539\u4ea7\u54c1\u672c\u8eab\u3002',
      '\u5982\u679c\u4e0a\u4f20\u4e86\u591a\u4e2a\u89c6\u56fe\uff0c\u8bf7\u7efc\u5408\u6b63\u89c6\u56fe\u3001\u4fa7\u89c6\u56fe\u3001\u80cc\u9762\u3001\u9876\u90e8\u3001\u5e95\u90e8\u548c\u7ec6\u8282\u56fe\u6765\u8fd8\u539f\u4ea7\u54c1\uff0c\u751f\u6210\u65b0\u89d2\u5ea6\u65f6\u5fc5\u987b\u7b26\u5408\u8fd9\u4e9b\u5df2\u77e5\u7ed3\u6784\u3002',
      '\u5982\u679c\u7f3a\u5c11\u67d0\u4e9b\u89d2\u5ea6\uff0c\u53ea\u80fd\u4fdd\u5b88\u63a8\u65ad\uff1b\u9690\u85cf\u7ed3\u6784\u4e0d\u80fd\u786e\u5b9a\u65f6\u8bf7\u5728\u5206\u6790\u4e2d\u6807\u6ce8\u98ce\u9669\u3002',
      '\u9002\u7528\u5e73\u53f0\uff1a\u4e2d\u56fd\u7535\u5546\u5e73\u53f0\u548c Amazon\u3002\u4e3b\u56fe\u98ce\u683c\u5e94\u5e72\u51c0\u3001\u4ea7\u54c1\u5c45\u4e2d\u3001\u5b8c\u6574\u53ef\u89c1\u3001\u80cc\u666f\u7b80\u6d01\u3002',
    ].join('\n')
  }

  function addFiles(slotId, fileList) {
    const current = filesBySlot.get(slotId) || []
    const remaining = Math.max(0, maxFilesPerSlot - current.length)
    const nextFiles = Array.from(fileList || [])
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, remaining)
    if (!nextFiles.length) return
    filesBySlot.set(slotId, [...current, ...nextFiles])
    mount(true)
  }

  function addCustomReferences(fileList) {
    const remaining = Math.max(0, maxFilesPerSlot - customReferenceFiles.length)
    const nextFiles = Array.from(fileList || [])
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, remaining)
    if (!nextFiles.length) return
    customReferenceFiles.push(...nextFiles)
    mount(true)
  }

  function removeFile(slotId, index) {
    const next = [...(filesBySlot.get(slotId) || [])]
    next.splice(index, 1)
    filesBySlot.set(slotId, next)
    mount(true)
  }

  function removeCustomReference(index) {
    customReferenceFiles.splice(index, 1)
    mount(true)
  }

  function renderPreviews(files, container, removeHandler) {
    container.innerHTML = ''
    files.forEach((file, index) => {
      const figure = document.createElement('figure')
      const img = document.createElement('img')
      img.src = URL.createObjectURL(file)
      img.onload = () => URL.revokeObjectURL(img.src)
      img.alt = file.name
      const caption = document.createElement('figcaption')
      caption.textContent = file.name
      const remove = document.createElement('a')
      remove.textContent = '\u79fb\u9664'
      remove.onclick = () => removeHandler(index)
      figure.append(img, caption, remove)
      container.append(figure)
    })
  }

  function renderGenerated(images, container) {
    container.innerHTML = ''
    if (!images.length) return
    const grid = document.createElement('div')
    grid.className = 'multi-angle-generated-grid'
    images.forEach((image) => {
      const figure = document.createElement('figure')
      const button = document.createElement('button')
      button.type = 'button'
      button.title = '\u70b9\u51fb\u67e5\u770b\u5927\u56fe'
      const img = document.createElement('img')
      img.src = image.imageUrl
      img.alt = image.title
      button.append(img)
      button.onclick = () => openImageLightbox(image)
      const caption = document.createElement('figcaption')
      caption.textContent = image.title
      figure.append(button, caption)
      grid.append(figure)
    })
    container.append(grid)
  }

  function openImageLightbox(image) {
    document.querySelector('[data-multi-angle-lightbox="true"]')?.remove()
    const overlay = document.createElement('div')
    overlay.className = 'multi-angle-lightbox'
    overlay.dataset.multiAngleLightbox = 'true'
    overlay.innerHTML = `
      <div class="multi-angle-lightbox-panel" role="dialog" aria-label="\u67e5\u770b\u751f\u6210\u56fe\u7247">
        <div class="multi-angle-lightbox-head">
          <strong></strong>
          <div class="multi-angle-lightbox-actions">
            <a class="download" title="\u4e0b\u8f7d" aria-label="\u4e0b\u8f7d">
              <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
              <span>\u4e0b\u8f7d</span>
            </a>
            <button type="button" title="\u5173\u95ed" aria-label="\u5173\u95ed">
              <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>
        <div class="multi-angle-lightbox-viewport"><img></div>
      </div>
    `
    overlay.querySelector('strong').textContent = image.title || '\u751f\u6210\u56fe\u7247'
    const link = overlay.querySelector('a')
    link.href = `/api/download?file=${encodeURIComponent(image.imageUrl)}&name=${encodeURIComponent(image.title || 'multi-angle-image')}`
    link.download = `${image.title || 'multi-angle-image'}.png`
    const img = overlay.querySelector('img')
    img.src = image.imageUrl
    img.alt = image.title || '\u751f\u6210\u56fe\u7247'
    let zoom = 1
    const viewport = overlay.querySelector('.multi-angle-lightbox-viewport')
    viewport.onwheel = (event) => {
      event.preventDefault()
      zoom = Math.min(4, Math.max(0.5, zoom + (event.deltaY < 0 ? 0.15 : -0.15)))
      img.style.transform = `scale(${zoom})`
      img.style.cursor = zoom > 1 ? 'zoom-out' : 'zoom-in'
    }
    overlay.querySelector('button').onclick = () => overlay.remove()
    overlay.onclick = (event) => {
      if (event.target === overlay) overlay.remove()
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        overlay.remove()
        window.removeEventListener('keydown', onKeyDown)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    document.body.append(overlay)
  }

  async function appendDefaultReference(form) {
    const response = await fetch(defaultReferenceUrl)
    if (!response.ok) return
    const blob = await response.blob()
    form.append('images', blob, 'custom-view-default-reference.jpg')
  }

  function appendProductReferenceImages(form) {
    slots.forEach(([slotId]) => {
      ;(filesBySlot.get(slotId) || []).forEach((file, index) => {
        form.append('images', file, `product-view-${slotId}-${index + 1}__${slotLabel(slotId)}__${file.name}`)
      })
    })
  }

  async function analyzeAndGenerate(status, result, submit) {
    const id = await resolveSkillId()
    if (!id) throw new Error('\u6ca1\u6709\u627e\u5230 ai-Multi-angle-skill\u3002')
    if (generationMode === 'custom' && !customReady()) {
      throw new Error('\u81ea\u5b9a\u4e49\u6a21\u5f0f\u9700\u8981\u5148\u4e0a\u4f20\u6b63\u89c6\u56fe\u3001\u5de6\u4fa7\u89c6\u56fe\u548c\u80cc\u9762\u3002')
    }

    const analyzeForm = new FormData()
    analyzeForm.append('skillId', id)
    analyzeForm.append('brief', buildBrief())
    slots.forEach(([slotId]) => {
      ;(filesBySlot.get(slotId) || []).forEach((file, index) => analyzeForm.append('images', file, `product-view-${slotId}-${index + 1}__${slotLabel(slotId)}__${file.name}`))
    })
    if (generationMode === 'custom') {
      if (customReferenceFiles.length) {
        customReferenceFiles.forEach((file, index) => analyzeForm.append('images', file, `view-layout-reference-${index + 1}__angle-reference__${file.name}`))
      } else {
        await appendDefaultReference(analyzeForm)
      }
    }

    status.textContent = '\u6b63\u5728\u5206\u6790\u4e0a\u4f20\u56fe\u7247\u548c\u8f93\u51fa\u9009\u9879...'
    const analyzeResponse = await fetch('/api/run/analyze', { method: 'POST', body: analyzeForm })
    const analysis = await analyzeResponse.json()
    if (!analyzeResponse.ok) throw new Error(analysis.error || '\u5206\u6790\u5931\u8d25')

    const basePrompt = analysis.imagePrompt?.positive || buildBrief()
    const size = selectedSize === 'auto' ? (analysis.imagePrompt?.size || '1024x1024') : selectedSize
    const fallbackTitle = outputMode === 'combined' ? `${viewCount}\u89c6\u56fe\u5408\u96c6` : '\u591a\u89c6\u89d2\u56fe\u7247'
    const directions = Array.isArray(analysis.directions) && analysis.directions.length
      ? analysis.directions
      : [{ id: 'multi-angle-output', title: fallbackTitle, description: outputMode === 'combined' ? '\u751f\u6210\u4e00\u5f20\u591a\u89d2\u5ea6\u5408\u96c6\u56fe' : '\u5206\u522b\u751f\u6210\u591a\u89d2\u5ea6\u56fe\u7247' }]
    const targets = outputMode === 'combined' ? directions.slice(0, 1) : normalizeSeparateTargets(directions)
    const generated = []

    async function generateTarget(direction, index) {
      const generateForm = new FormData()
      generateForm.append('projectId', analysis.projectId)
      generateForm.append('prompt', `${basePrompt}\n\n\u672c\u6b21\u751f\u56fe\u53ea\u628a\u7528\u6237\u4e0a\u4f20\u5230\u4ea7\u54c1\u89c6\u56fe\u69fd\u4f4d\u7684\u539f\u56fe\u4f5c\u4e3a\u4ea7\u54c1\u5916\u89c2\u786c\u53c2\u8003\u3002\u89d2\u5ea6\u53c2\u8003\u56fe\u53ea\u80fd\u7528\u4e8e\u6784\u56fe\u601d\u8def\uff0c\u4e0d\u80fd\u5f71\u54cd\u6216\u66ff\u6362\u4ea7\u54c1\u5916\u89c2\u3002\u5fc5\u987b\u6309\u4e0b\u9762\u7684\u89c6\u56fe\u5bf9\u7167\u8868\u9010\u5f20\u8bfb\u53d6\uff0c\u4e0d\u80fd\u628a\u6b63\u89c6\u56fe\u3001\u5de6\u4fa7\u89c6\u56fe\u3001\u80cc\u9762\u3001\u5e95\u90e8\u6216\u7ec6\u8282\u56fe\u6df7\u6dc6\u3002\u4ea7\u54c1\u5916\u89c2\u5fc5\u987b 100% \u4e00\u81f4\uff0c\u4e0d\u8981\u53ea\u6839\u636e\u6587\u5b57\u63cf\u8ff0\u91cd\u65b0\u8bbe\u8ba1\u6216\u731c\u6d4b\u4ea7\u54c1\u3002${outputMode === 'separate' ? '\n\n\u8f93\u51fa\u65b9\u5f0f\u662f\u5206\u5f00\u751f\u6210\uff1a\u8fd9\u4e00\u6b21\u53ea\u751f\u6210\u4e00\u5f20\u5355\u72ec\u89d2\u5ea6\u56fe\uff0c\u4e0d\u8981\u628a\u591a\u4e2a\u89c6\u56fe\u653e\u5728\u540c\u4e00\u5f20\u56fe\u91cc\uff0c\u4e0d\u8981\u505a\u62fc\u56fe\u3001\u5bab\u683c\u6216\u5408\u96c6\u3002' : ''}\n\n\u89c6\u56fe\u5bf9\u7167\u8868\uff1a\n${viewMapText()}\n\n\u5f53\u524d\u8f93\u51fa\uff1a${direction.title}\n${direction.description || ''}`)
      generateForm.append('size', size)
      generateForm.append('directionId', direction.id || `view-${index + 1}`)
      generateForm.append('directionTitle', direction.title || `\u89c6\u56fe ${index + 1}`)
      appendProductReferenceImages(generateForm)

      const generateResponse = await fetch('/api/run/generate-image', { method: 'POST', body: generateForm })
      const image = await generateResponse.json()
      if (!generateResponse.ok) throw new Error(image.error || '\u751f\u6210\u56fe\u7247\u5931\u8d25')
      return { imageUrl: image.imageUrl, title: image.title || direction.title || `\u89c6\u56fe ${index + 1}` }
    }

    result.textContent = analysis.message || '\u5206\u6790\u5b8c\u6210\uff0c\u5f00\u59cb\u751f\u6210\u56fe\u7247\u3002'
    if (outputMode === 'separate') {
      let completed = 0
      status.textContent = `\u6b63\u5728\u5e76\u884c\u751f\u6210 ${targets.length} \u5f20\u56fe\u7247...`
      await Promise.all(targets.map(async (direction, index) => {
        const image = await generateTarget(direction, index)
        generated[index] = image
        completed += 1
        status.textContent = `\u5df2\u751f\u6210 ${completed}/${targets.length} \u5f20\uff0c\u5176\u4f59\u56fe\u7247\u7ee7\u7eed\u751f\u6210\u4e2d...`
        renderGenerated(generated.filter(Boolean), result)
      }))
    } else {
      for (let index = 0; index < targets.length; index += 1) {
        const direction = targets[index]
        status.textContent = `\u6b63\u5728\u751f\u6210\u56fe\u7247 ${index + 1}/${targets.length}...`
        generated.push(await generateTarget(direction, index))
      renderGenerated(generated, result)
      }
    }

    status.textContent = '\u5206\u6790\u548c\u56fe\u7247\u751f\u6210\u5df2\u5b8c\u6210\u3002'
    submit.textContent = '\u91cd\u65b0\u5206\u6790\u5e76\u751f\u6210'
  }

  function renderUploadSlot(id, label, hint, grid, options = {}) {
    const files = options.files || filesBySlot.get(id) || []
    const isRequired = generationMode === 'custom' && requiredCustomSlots.includes(id) && !options.reference
    const missing = isRequired && !files.length
    const card = document.createElement('div')
    card.className = `multi-angle-slot ${files.length ? 'has-file' : ''} ${missing ? 'required-missing' : ''}`
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = () => (options.reference ? addCustomReferences(input.files || []) : addFiles(id, input.files || []))
    const button = document.createElement('button')
    button.type = 'button'
    button.disabled = files.length >= maxFilesPerSlot
    const requiredText = isRequired ? '<span class="required-mark">\u5fc5\u4f20\uff1a\u81ea\u5b9a\u4e49\u6a21\u5f0f\u9700\u8981\u4e09\u89c6\u56fe</span>' : ''
    button.innerHTML = `<strong>${label}</strong><span>${hint}</span>${requiredText}<span>${files.length}/${maxFilesPerSlot} \u5f20\uff0c\u70b9\u51fb\u4e0a\u4f20\u6216\u62d6\u5165\u56fe\u7247</span>`
    button.onclick = () => input.click()
    card.ondragover = (event) => event.preventDefault()
    card.ondrop = (event) => {
      event.preventDefault()
      options.reference ? addCustomReferences(event.dataTransfer.files || []) : addFiles(id, event.dataTransfer.files || [])
    }
    const previews = document.createElement('div')
    previews.className = 'multi-angle-preview-grid'
    renderPreviews(files, previews, options.reference ? removeCustomReference : (index) => removeFile(id, index))
    card.append(input, button, previews)
    grid.append(card)
  }

  function createAdapter() {
    const root = document.createElement('div')
    root.className = 'multi-angle-shell'
    root.dataset.multiAngleAdapter = 'true'

    const modeCard = document.createElement('section')
    modeCard.className = 'multi-angle-mode-card'
    modeCard.innerHTML = `<span>\u751f\u6210\u6a21\u5f0f</span>`

    const mode = document.createElement('div')
    mode.className = 'multi-angle-mode'
    ;[
      ['random', '\u968f\u673a', '\u6309\u5df2\u4e0a\u4f20\u4ea7\u54c1\u56fe\u81ea\u52a8\u5206\u6790\u5408\u9002\u89c6\u89d2'],
      ['custom', '\u81ea\u5b9a\u4e49', '\u4e09\u89c6\u56fe\u5fc5\u4f20\uff0c\u53ef\u6309\u53c2\u8003\u56fe\u89c6\u89d2\u751f\u6210'],
    ].forEach(([id, label, desc]) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = generationMode === id ? 'active' : ''
      button.innerHTML = `<strong>${label}</strong><span>${desc}</span>`
      button.onclick = () => {
        generationMode = id
        mount(true)
      }
      mode.append(button)
    })
    modeCard.append(mode)
    root.append(modeCard)

    const uploadCard = document.createElement('section')
    uploadCard.className = 'multi-angle-adapter'

    const head = document.createElement('div')
    head.className = 'multi-angle-adapter-head'
    head.innerHTML = `
      <div>
        <h3>\u4e0a\u4f20\u4ea7\u54c1\u89d2\u5ea6\u56fe</h3>
        <p>\u968f\u673a\u6a21\u5f0f\u4fdd\u6301\u539f\u6765\u903b\u8f91\uff1b\u81ea\u5b9a\u4e49\u6a21\u5f0f\u5fc5\u987b\u4e0a\u4f20\u6b63\u89c6\u56fe\u3001\u5de6\u4fa7\u89c6\u56fe\u548c\u80cc\u9762\u3002</p>
      </div>
      <span class="multi-angle-count">${totalFiles()} \u5f20</span>
    `
    uploadCard.append(head)

    if (generationMode === 'custom') {
      const hint = document.createElement('div')
      hint.className = 'multi-angle-hint'
      hint.textContent = customReferenceFiles.length
        ? '\u5df2\u4e0a\u4f20\u81ea\u5b9a\u4e49\u89d2\u5ea6\u53c2\u8003\u56fe\uff0c\u751f\u6210\u65f6\u4f1a\u6309\u8fd9\u4e9b\u89c6\u89d2\u53bb\u51fa\u56fe\u3002'
        : '\u5982\u679c\u4e0d\u4e0a\u4f20\u89d2\u5ea6\u53c2\u8003\u56fe\uff0c\u7cfb\u7edf\u4f1a\u6309\u9ed8\u8ba4 12 \u5bab\u683c\u978b\u5b50\u53c2\u8003\u56fe\u7684\u89c6\u89d2\u53bb\u751f\u6210\u3002'
      uploadCard.append(hint)
    }

    const grid = document.createElement('div')
    grid.className = 'multi-angle-grid'
    slots.forEach(([id, label, hint]) => renderUploadSlot(id, label, hint, grid))
    if (generationMode === 'custom') {
      renderUploadSlot('custom-reference', '\u89d2\u5ea6\u53c2\u8003\u56fe\uff08\u53ef\u9009\uff09', '\u7528\u6765\u6307\u5b9a\u5e0c\u671b\u751f\u6210\u7684\u6446\u653e\u89d2\u5ea6\u548c\u6784\u56fe\uff0c\u4e0d\u4e0a\u4f20\u5219\u4f7f\u7528\u9ed8\u8ba4\u53c2\u8003', grid, { reference: true, files: customReferenceFiles })
    }
    uploadCard.append(grid)

    const options = document.createElement('div')
    options.className = 'multi-angle-options'
    options.innerHTML = `
      <div>
        <span class="multi-angle-option-label">\u5bfc\u51fa\u89c6\u56fe\u6570\u91cf</span>
        <div class="multi-angle-segment"></div>
      </div>
      <div>
        <span class="multi-angle-option-label">\u5c3a\u5bf8\u6bd4\u4f8b</span>
        <div class="multi-angle-size"></div>
      </div>
      <div>
        <span class="multi-angle-option-label">\u8f93\u51fa\u65b9\u5f0f</span>
        <div class="multi-angle-output"></div>
      </div>
    `
    const segment = options.querySelector('.multi-angle-segment')
    ;[3, 6, 9, 12].forEach((count) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = viewCount === count ? 'active' : ''
      button.textContent = `${count} \u89c6\u56fe`
      button.onclick = () => {
        viewCount = count
        mount(true)
      }
      segment.append(button)
    })
    const sizeWrap = options.querySelector('.multi-angle-size')
    sizeOptions.forEach(([value, label]) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = selectedSize === value ? 'active' : ''
      button.textContent = label
      button.onclick = () => {
        selectedSize = value
        mount(true)
      }
      sizeWrap.append(button)
    })
    const output = options.querySelector('.multi-angle-output')
    ;[
      ['combined', '\u751f\u6210\u5728\u540c\u4e00\u5f20\u91cc', '\u9002\u5408\u4e3b\u56fe\u3001\u5e73\u53f0\u5bf9\u6bd4\u56fe\u3001\u591a\u89d2\u5ea6\u5408\u96c6'],
      ['separate', '\u5206\u5f00\u751f\u6210', '\u9002\u5408\u5206\u522b\u5bfc\u51fa\u6bcf\u4e2a\u89d2\u5ea6\u7d20\u6750'],
    ].forEach(([id, label, desc]) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = outputMode === id ? 'active' : ''
      button.innerHTML = `<strong>${label}</strong><span>${desc}</span>`
      button.onclick = () => {
        outputMode = id
        mount(true)
      }
      output.append(button)
    })
    uploadCard.append(options)

    const noteWrap = document.createElement('div')
    noteWrap.className = 'multi-angle-note'
    noteWrap.innerHTML = `
      <span class="multi-angle-option-label">\u8865\u5145\u8bf4\u660e\uff08\u53ef\u9009\uff09</span>
      <textarea placeholder="\u4f8b\u5982\uff1a\u5e0c\u671b\u4fdd\u6301\u767d\u5e95\uff0c\u4e0d\u8981\u6dfb\u52a0\u9053\u5177\uff1b\u4fa7\u9762\u4ee5\u5de6\u56fe\u4e3a\u51c6\uff1bLogo \u4e0d\u8981\u53d8\u5f62\u3002"></textarea>
    `
    const textarea = noteWrap.querySelector('textarea')
    textarea.value = extraNote
    textarea.oninput = () => {
      extraNote = textarea.value
    }
    uploadCard.append(noteWrap)

    const submit = document.createElement('button')
    submit.type = 'button'
    submit.className = 'multi-angle-submit'
    submit.disabled = !canSubmit() || running
    submit.textContent = running ? '\u6b63\u5728\u751f\u6210...' : '\u5206\u6790\u5e76\u751f\u6210\u65b9\u6848'
    uploadCard.append(submit)

    const status = document.createElement('p')
    status.className = 'multi-angle-status'
    status.textContent = generationMode === 'custom' && !customReady()
      ? '\u81ea\u5b9a\u4e49\u6a21\u5f0f\u9700\u8981\u5148\u4e0a\u4f20\u6b63\u89c6\u56fe\u3001\u5de6\u4fa7\u89c6\u56fe\u548c\u80cc\u9762\u3002'
      : ''
    uploadCard.append(status)

    const result = document.createElement('div')
    result.className = 'multi-angle-result'
    uploadCard.append(result)

    submit.onclick = async () => {
      if (running || !canSubmit()) return
      extraNote = textarea.value
      running = true
      submit.disabled = true
      submit.textContent = '\u6b63\u5728\u751f\u6210...'
      status.classList.remove('multi-angle-error')
      result.textContent = ''
      try {
        await analyzeAndGenerate(status, result, submit)
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : '\u5206\u6790\u6216\u751f\u6210\u5931\u8d25'
        status.classList.add('multi-angle-error')
      } finally {
        running = false
        submit.disabled = !canSubmit()
        if (submit.textContent === '\u6b63\u5728\u751f\u6210...') submit.textContent = '\u5206\u6790\u5e76\u751f\u6210\u65b9\u6848'
      }
    }

    root.append(uploadCard)
    return root
  }

  function hideOriginalComposer(region) {
    region.querySelectorAll('.user-composer').forEach((node) => {
      if (!node.dataset.multiAngleOriginalDisplay) node.dataset.multiAngleOriginalDisplay = node.style.display || '__empty__'
      node.style.display = 'none'
    })
    const labels = ['\u8f93\u5165\u4f60\u7684\u9700\u6c42', '\u4e0a\u4f20\u53c2\u8003\u56fe', '\u53d1\u9001\u7ed9 Skill']
    labels.forEach((text) => {
      region.querySelectorAll('button, textarea, input, [aria-label], div').forEach((node) => {
        const content = `${node.textContent || ''} ${node.getAttribute?.('aria-label') || ''} ${node.getAttribute?.('placeholder') || ''}`
        if (content.includes(text)) {
          if (!node.dataset.multiAngleOriginalDisplay) node.dataset.multiAngleOriginalDisplay = node.style.display || '__empty__'
          node.style.display = 'none'
        }
      })
    })
  }

  function restoreOriginalComposer() {
    document.querySelectorAll('[data-multi-angle-original-display]').forEach((node) => {
      const original = node.dataset.multiAngleOriginalDisplay
      node.style.display = original === '__empty__' ? '' : original
      delete node.dataset.multiAngleOriginalDisplay
    })
  }

  function mount(force = false) {
    const old = document.querySelector('[data-multi-angle-adapter="true"]')
    if (!isMultiAngleSelected()) {
      if (old) old.remove()
      restoreOriginalComposer()
      return
    }
    const region = document.querySelector('[aria-label="Skill conversation"]') || document.querySelector('section, main')
    if (!region) return
    hideOriginalComposer(region)
    if (old && !force) return
    if (old) old.remove()
    region.append(createAdapter())
  }

  const observer = new MutationObserver(() => mount(false))
  observer.observe(document.body, { attributes: true, attributeFilter: ['data-current-skill-id', 'data-current-skill-name', 'data-current-skill-display-name'], childList: true, characterData: true, subtree: true })
  window.addEventListener('load', () => mount(false))
  setTimeout(() => mount(false), 800)
})()
