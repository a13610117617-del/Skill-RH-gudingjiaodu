import fs from 'node:fs'
import path from 'node:path'

const owner = process.env.GITHUB_OWNER || 'jimfourlin'
const repo = process.env.GITHUB_REPO || 'randian-skills'
const branch = process.env.GITHUB_BRANCH || 'main'
const token = process.env.GITHUB_TOKEN
const message = process.argv.slice(2).join(' ').trim() || 'Update local skills app'
const root = process.cwd()

const includeFiles = [
  'AGENTS.md',
  'README.md',
  'eslint.config.js',
  'index.html',
  'package-lock.json',
  'package.json',
  'tsconfig.app.json',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite.config.ts',
  'public/assets/multi-angle-default-reference.jpg',
  'public/assets/merge-angle-library/angle-01.png',
  'public/assets/merge-angle-library/angle-02.webp',
  'public/assets/merge-angle-library/angle-03-fixed-leg-reference-clean.png',
  'public/assets/merge-angle-library/angle-03-fixed-leg-reference-full.png',
  'public/assets/merge-angle-library/angle-03-fixed-leg-reference-magenta.png',
  'public/assets/merge-angle-library/angle-03-fixed-leg-reference.png',
  'public/assets/merge-angle-library/angle-03.png',
  'public/assets/merge-angle-library/angle-03.webp',
  'public/assets/merge-angle-library/angle-05.png',
  'public/assets/merge-angle-library/angle-06.png',
  'public/favicon.svg',
  'public/icons.svg',
  'public/multi-angle-adapter.js',
  'scripts/push-github.mjs',
  'server/index.js',
  'src/App.css',
  'src/App.tsx',
  'src/assets/hero.png',
  'src/assets/react.svg',
  'src/assets/vite.svg',
  'src/components/PreviewGallery.tsx',
  'src/components/ProjectsPanel.tsx',
  'src/index.css',
  'src/main.tsx',
]

if (!token) {
  console.error('Missing GITHUB_TOKEN. Set it in the current shell before running this script.')
  process.exit(1)
}

function isBinary(file) {
  return /\.(png|jpg|jpeg|gif|webp|ico)$/i.test(file)
}

async function github(pathname, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'randian-skills-push-script',
      ...(options.headers || {}),
    },
  })
  const text = await response.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${typeof data === 'string' ? data : JSON.stringify(data)}`)
  }
  return data
}

const ref = await github(`/git/ref/heads/${branch}`)
const baseCommitSha = ref.object.sha
const baseCommit = await github(`/git/commits/${baseCommitSha}`)
const tree = []

for (const file of includeFiles) {
  const fullPath = path.join(root, file)
  if (!fs.existsSync(fullPath)) continue
  const content = fs.readFileSync(fullPath)
  tree.push({
    path: `app/${file.replace(/\\/g, '/')}`,
    mode: '100644',
    type: 'blob',
    content: isBinary(file) ? content.toString('base64') : content.toString('utf8'),
    encoding: isBinary(file) ? 'base64' : 'utf-8',
  })
}

const newTree = await github('/git/trees', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree }),
})

const newCommit = await github('/git/commits', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message,
    tree: newTree.sha,
    parents: [baseCommitSha],
  }),
})

await github(`/git/refs/heads/${branch}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sha: newCommit.sha, force: false }),
})

console.log(JSON.stringify({ repo: `${owner}/${repo}`, branch, commit: newCommit.sha, files: tree.length }, null, 2))
