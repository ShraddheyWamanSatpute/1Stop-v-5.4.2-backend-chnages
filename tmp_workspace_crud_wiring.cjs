const fs = require("fs")
const path = require("path")

const root = "A:/Code/1Stop/Combined/1Stop Final"
const scanRoots = [path.join(root, "app/frontend"), path.join(root, "admin/frontend")]
const skipFile = path.join(root, "app/frontend/components/reusable/CRUDModal.tsx")

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath, out)
      continue
    }
    if (entry.isFile() && fullPath.endsWith(".tsx")) out.push(fullPath)
  }
  return out
}

function capitalize(value) {
  return value ? value[0].toUpperCase() + value.slice(1) : value
}

function lowerCamelFromFilename(filePath) {
  const base = path.basename(filePath, path.extname(filePath))
  const parts = base.split(/[^A-Za-z0-9]+/).filter(Boolean)
  if (parts.length === 0) return "crudModal"
  const first = parts[0][0].toLowerCase() + parts[0].slice(1)
  return [first, ...parts.slice(1).map(capitalize)].join("")
}

function findMatching(text, startIndex, openChar, closeChar) {
  let depth = 0
  let quote = null
  let templateDepth = 0
  for (let i = startIndex; i < text.length; i += 1) {
    const char = text[i]
    const prev = i > 0 ? text[i - 1] : ""
    if (quote) {
      if (quote === "`" && char === "$" && text[i + 1] === "{") {
        templateDepth += 1
        i += 1
        continue
      }
      if (char === quote && prev !== "\\") {
        if (quote !== "`" || templateDepth === 0) {
          quote = null
        }
      }
      if (quote === "`" && char === "}" && templateDepth > 0) {
        templateDepth -= 1
      }
      continue
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char
      continue
    }
    if (char === openChar) {
      depth += 1
      continue
    }
    if (char === closeChar) {
      depth -= 1
      if (depth === 0) return i
    }
  }
  return -1
}

function findJsxTagEnd(text, startIndex) {
  let braceDepth = 0
  let quote = null
  for (let i = startIndex; i < text.length; i += 1) {
    const char = text[i]
    const prev = i > 0 ? text[i - 1] : ""
    if (quote) {
      if (char === quote && prev !== "\\") quote = null
      continue
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char
      continue
    }
    if (char === "{") {
      braceDepth += 1
      continue
    }
    if (char === "}") {
      braceDepth = Math.max(0, braceDepth - 1)
      continue
    }
    if (char === ">" && braceDepth === 0) return i
  }
  return -1
}

function getIndentAt(text, index) {
  const lineStart = text.lastIndexOf("\n", index) + 1
  const match = /^[ \t]*/.exec(text.slice(lineStart, index))
  return match ? match[0] : ""
}

function getProp(tag, name) {
  const regex = new RegExp(`(^|[\\s])${name}=`, "g")
  let match
  while ((match = regex.exec(tag))) {
    const propStart = match.index + match[1].length
    const valueStart = propStart + name.length + 1
    const kind = tag[valueStart]
    if (kind === "{") {
      const end = findMatching(tag, valueStart, "{", "}")
      if (end === -1) continue
      return {
        start: propStart,
        end: end + 1,
        kind: "expr",
        value: tag.slice(valueStart + 1, end).trim(),
      }
    }
    if (kind === '"') {
      let end = valueStart + 1
      while (end < tag.length) {
        if (tag[end] === '"' && tag[end - 1] !== "\\") break
        end += 1
      }
      return {
        start: propStart,
        end: end + 1,
        kind: "string",
        value: tag.slice(valueStart + 1, end),
      }
    }
  }
  return null
}

function replaceRange(text, start, end, replacement) {
  return text.slice(0, start) + replacement + text.slice(end)
}

function addUseLocationImport(text) {
  if (/useLocation/.test(text) && /react-router-dom/.test(text)) return text

  const importRegex = /import\s+([^;]+?)\s+from\s+"react-router-dom"/m
  const match = text.match(importRegex)
  if (match) {
    const full = match[0]
    if (full.includes("useLocation")) return text
    if (full.includes("{")) {
      const updated = full.replace(/\{([^}]*)\}/, (_m, inner) => {
        const names = inner
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean)
        if (!names.includes("useLocation")) names.unshift("useLocation")
        return `{ ${names.join(", ")} }`
      })
      return text.replace(full, updated)
    }
    const updated = full.replace(' from "react-router-dom"', ', { useLocation } from "react-router-dom"')
    return text.replace(full, updated)
  }

  const lines = text.split("\n")
  let insertAt = 0
  while (insertAt < lines.length && /^("|\/\/|\/\*)/.test(lines[insertAt])) insertAt += 1
  while (insertAt < lines.length && /^import /.test(lines[insertAt])) insertAt += 1
  lines.splice(insertAt, 0, 'import { useLocation } from "react-router-dom"')
  return lines.join("\n")
}

function addCrudModalImports(text, filePath) {
  const importRegex = /import\s+CRUDModal(?:\s*,\s*\{[\s\S]*?\})?\s+from\s+"([^"]+CRUDModal)"/m
  const match = text.match(importRegex)
  if (!match) throw new Error(`CRUDModal import not found in ${filePath}`)
  const importPath = match[1]
  const replacement = `import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "${importPath}"`
  return text.replace(importRegex, replacement)
}

function addLocationHook(text, filePath) {
  if (/\bconst location = useLocation\(\)/.test(text)) return text

  const patterns = [
    /const\s+[A-Za-z0-9_]+\s*:\s*React\.[^{=]+\=\s*\([^)]*\)\s*=>\s*\{/m,
    /const\s+[A-Za-z0-9_]+\s*=\s*\([^)]*\)\s*:\s*[^=]+\s*=>\s*\{/m,
    /const\s+[A-Za-z0-9_]+\s*=\s*\([^)]*\)\s*=>\s*\{/m,
    /export\s+default\s+function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{/m,
    /function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{/m,
  ]

  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (!match) continue
    const insertIndex = match.index + match[0].length
    const indent = getIndentAt(text, match.index) + "  "
    return `${text.slice(0, insertIndex)}\n${indent}const location = useLocation()${text.slice(insertIndex)}`
  }

  throw new Error(`Component body not found in ${filePath}`)
}

function makeWorkspaceObject(propIndent, entityName, modeExpr) {
  return [
    `${propIndent}workspaceFormShortcut={{`,
    `${propIndent}  crudEntity: "${entityName}",`,
    `${propIndent}  crudMode: ${modeExpr},`,
    `${propIndent}}}`,
  ].join("\n")
}

function wrapOnClose(expr, setterName, propIndent) {
  if (!expr) return null
  if (!setterName) {
    return [
      `${propIndent}onClose={(reason) => {`,
      `${propIndent}  const __workspaceOnClose = ${expr}`,
      `${propIndent}  if (typeof __workspaceOnClose === "function") {`,
      `${propIndent}    __workspaceOnClose(reason)`,
      `${propIndent}  }`,
      `${propIndent}}}`,
    ].join("\n")
  }
  if (expr === "onClose") {
    return [
      `${propIndent}onClose={(reason) => {`,
      `${propIndent}  ${setterName}(false)`,
      `${propIndent}  const __workspaceOnClose = ${expr}`,
      `${propIndent}  if (typeof __workspaceOnClose === "function") {`,
      `${propIndent}    __workspaceOnClose(reason)`,
      `${propIndent}  }`,
      `${propIndent}}}`,
    ].join("\n")
  }
  return [
    `${propIndent}onClose={(reason) => {`,
    `${propIndent}  ${setterName}(false)`,
    `${propIndent}  if (isCrudModalHardDismiss(reason)) {`,
    `${propIndent}    const __workspaceOnClose = ${expr}`,
    `${propIndent}    if (typeof __workspaceOnClose === "function") {`,
    `${propIndent}      __workspaceOnClose(reason)`,
    `${propIndent}    }`,
    `${propIndent}  }`,
    `${propIndent}}}`,
  ].join("\n")
}

function wrapOnSave(expr, propIndent, entityName, modeExpr) {
  if (!expr || expr === "undefined") return null
  return [
    `${propIndent}onSave={async (...args) => {`,
    `${propIndent}  const __workspaceOnSave = ${expr}`,
    `${propIndent}  if (typeof __workspaceOnSave !== "function") return undefined`,
    `${propIndent}  const result = await __workspaceOnSave(...args)`,
    `${propIndent}  removeWorkspaceFormDraft(location.pathname, {`,
    `${propIndent}    crudEntity: "${entityName}",`,
    `${propIndent}    crudMode: ${modeExpr},`,
    `${propIndent}  })`,
    `${propIndent}  return result`,
    `${propIndent}}}`,
  ].join("\n")
}

function patchCrudModals(text, filePath) {
  let index = 0
  let modalCounter = 0
  const baseName = lowerCamelFromFilename(filePath)

  while (true) {
    const start = text.indexOf("<CRUDModal", index)
    if (start === -1) break
    const end = findJsxTagEnd(text, start)
    if (end === -1) throw new Error(`Could not find end of CRUDModal tag in ${filePath}`)

    let tag = text.slice(start, end + 1)
    if (tag.includes("workspaceFormShortcut")) {
      index = end + 1
      continue
    }

    modalCounter += 1
    const entityName = `${baseName}Modal${modalCounter}`
    const baseIndent = getIndentAt(text, start)
    const propIndent = `${baseIndent}  `
    const closeProp = getProp(tag, "onClose")
    const saveProp = getProp(tag, "onSave")
    const openProp = getProp(tag, "open")
    const modeProp = getProp(tag, "mode")
    const modeExpr =
      modeProp?.kind === "string"
        ? JSON.stringify(modeProp.value)
        : modeProp?.value || JSON.stringify("edit")
    const setterName =
      openProp &&
      openProp.kind === "expr" &&
      /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(openProp.value) &&
      text.includes(`${"set" + capitalize(openProp.value)}(`)
        ? `set${capitalize(openProp.value)}`
        : ""

    if (closeProp) {
      const replacement = wrapOnClose(closeProp.value, setterName, propIndent)
      tag = replaceRange(tag, closeProp.start, closeProp.end, replacement)
    }

    if (saveProp) {
      const replacement = wrapOnSave(saveProp.value, propIndent, entityName, modeExpr)
      if (replacement) {
        tag = replaceRange(tag, saveProp.start, saveProp.end, replacement)
      }
    }

    const titleProp = getProp(tag, "title")
    const workspaceProp = makeWorkspaceObject(propIndent, entityName, modeExpr)
    if (titleProp) {
      tag = `${tag.slice(0, titleProp.start)}${workspaceProp}\n${tag.slice(titleProp.start)}`
    } else {
      tag = `${tag.slice(0, -1)}\n${workspaceProp}\n${baseIndent}>`
    }

    text = `${text.slice(0, start)}${tag}${text.slice(end + 1)}`
    index = start + tag.length
  }

  return { text, modalCounter }
}

const files = scanRoots
  .flatMap((dir) => walk(dir))
  .filter((filePath) => filePath !== skipFile)
  .filter((filePath) => {
    const text = fs.readFileSync(filePath, "utf8")
    return text.includes("<CRUDModal") && !text.includes("workspaceFormShortcut")
  })

const modified = []
const failures = []

for (const filePath of files) {
  try {
    let text = fs.readFileSync(filePath, "utf8")
    const original = text
    text = addUseLocationImport(text)
    text = addCrudModalImports(text, filePath)
    text = addLocationHook(text, filePath)
    text = patchCrudModals(text, filePath).text
    if (text !== original) {
      fs.writeFileSync(filePath, text)
      modified.push(filePath)
    }
  } catch (error) {
    failures.push({ filePath, message: error instanceof Error ? error.message : String(error) })
  }
}

console.log(JSON.stringify({ modifiedCount: modified.length, modified, failures }, null, 2))
