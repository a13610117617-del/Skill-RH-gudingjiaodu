import fs from 'node:fs'
import path from 'node:path'

const owner = process.env.GITHUB_OWNER || 'a13610117617-del'
const repo = process.env.GITHUB_REPO || 'Skill-RH-gudingjiaodu'
const branch = process.env.GITHUB_BRANCH || 'main'
const token = process.env.GITHUB_TOKEN
const message = process.argv.slice(2).join(' ').trim() || 'Update fixed-angle product fusion skill'
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
  'build/icon.ico',
  'build/icon.png',
  'electron/main.cjs',
  'public/assets/merge-angle-library/angle-01.png',
  'public/assets/merge-angle-library/angle-02.webp',
  'public/assets/merge-angle-library/angle-03.webp',
  'public/assets/merge-angle-library/angle-03-fixed-leg-reference-clean.png',
  'public/assets/merge-angle-library/angle-03-fixed-leg-reference-full.png',
  'public/assets/merge-angle-library/angle-03-fixed-leg-reference-magenta.png',
  'public/assets/merge-angle-library/angle-03-fixed-leg-reference.png',
  'public/assets/multi-angle-default-reference.jpg',
  'public/favicon.svg',
  'public/icons.svg',
  'public/multi-angle-adapter.js',
  'scripts/push-fixed-angle-github.mjs',
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
  console.error('Missing GITHUB_TOKEN.')
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
      'User-Agent': 'fixed-angle-skill-push',
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

async function createBlob(file) {
  const fullPath = path.join(root, file)
  const buffer = fs.readFileSync(fullPath)
  const body = isBinary(file)
    ? { content: buffer.toString('base64'), encoding: 'base64' }
    : { content: buffer.toString('utf8'), encoding: 'utf-8' }
  const blob = await github('/git/blobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return {
    path: `app/${file.replace(/\\/g, '/')}`,
    mode: '100644',
    type: 'blob',
    sha: blob.sha,
  }
}

const ref = await github(`/git/ref/heads/${branch}`)
const baseCommitSha = ref.object.sha
const baseCommit = await github(`/git/commits/${baseCommitSha}`)

const files = includeFiles.filter((file) => fs.existsSync(path.join(root, file)))
const tree = []
for (const file of files) {
  tree.push(await createBlob(file))
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
