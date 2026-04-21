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
    } else if (entry.isFile() && fullPath.endsWith(".tsx")) {
      out.push(fullPath)
    }
  }
  return out
}

function capitalize(value) {
  return value ? value[0].toUpperCase() + value.slice(1) : value
}

function lowerCamelFromFilename(filePath) {
  const base = path.basename(filePath, path.extname(filePath))
  const parts = base.split(/[^A-Za-z0-9]+/).filter(Boolean)
  if (!parts.length) return "crudModal"
  return [parts[0][0].toLowerCase() + parts[0].slice(1), ...parts.slice(1).map((part) => part[0].toUpperCase() + part.slice(1))].join("")
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
        if (quote !== "`" || templateDepth === 0) quote = null
      }
      if (quote === "`" && char === "}" && templateDepth > 0) templateDepth -= 1
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
  const startLine = text.lastIndexOf("\n", startIndex) + 1
  const remaining = text.slice(startLine)
  const lines = remaining.split("\n")
  let offset = 0
  for (const line of lines) {
    offset += line.length + 1
    if (/^\s*>\s*$/.test(line)) {
      return startLine + offset - 2
    }
    if (/^\s*<\/CRUDModal>\s*$/.test(line)) {
      break
    }
  }
  return -1
}

function getIndentAt(text, index) {
  const lineStart = text.lastIndexOf("\n", index) + 1
  const match = /^[ \t]*/.exec(text.slice(lineStart, index))
  return match ? match[0] : ""
}

function cleanupReactImport(text) {
  text = text.replace(/import\s+React,\s*\{([^}]*)\}\s+from\s+(['"])react\2/g, (_m, inner, quote) => {
    const names = inner.split(",").map((part) => part.trim()).filter(Boolean).filter((name) => name !== "useLocation")
    return names.length ? `import React, { ${names.join(", ")} } from ${quote}react${quote}` : `import React from ${quote}react${quote}`
  })
  text = text.replace(/import\s+\{([^}]*)\}\s+from\s+(['"])react\2/g, (_m, inner, quote) => {
    const names = inner.split(",").map((part) => part.trim()).filter(Boolean).filter((name) => name !== "useLocation")
    return `import { ${names.join(", ")} } from ${quote}react${quote}`
  })
  return text
}

function ensureUseLocationImport(text) {
  text = cleanupReactImport(text)
  const routerImport = /import\s+([^;]+?)\s+from\s+(['"])react-router-dom\2/m.exec(text)
  if (routerImport) {
    const full = routerImport[0]
    if (full.includes("useLocation")) return text
    if (full.includes("{")) {
      const updated = full.replace(/\{([^}]*)\}/, (_m, inner) => {
        const names = inner.split(",").map((part) => part.trim()).filter(Boolean)
        if (!names.includes("useLocation")) names.unshift("useLocation")
        return `{ ${names.join(", ")} }`
      })
      return text.replace(full, updated)
    }
    const updated = full.replace(/from\s+(['"])react-router-dom\1/, `, { useLocation } from $1react-router-dom$1`)
    return text.replace(full, updated)
  }

  const lines = text.split("\n")
  let insertAt = 0
  while (insertAt < lines.length && /^("|\/\/|\/\*)/.test(lines[insertAt])) insertAt += 1
  while (insertAt < lines.length && /^import /.test(lines[insertAt])) insertAt += 1
  lines.splice(insertAt, 0, `import { useLocation } from "react-router-dom"`)
  return lines.join("\n")
}

function ensureCrudImport(text, filePath) {
  const match = text.match(/import\s+CRUDModal(?:\s*,\s*\{[\s\S]*?\})?\s+from\s+(['"])([^'"]+CRUDModal)\1/m)
  if (!match) throw new Error(`CRUDModal import not found in ${filePath}`)
  const quote = match[1]
  const importPath = match[2]
  const replacement = `import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from ${quote}${importPath}${quote}`
  return text.replace(match[0], replacement)
}

function ensureLocationHook(text, filePath) {
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

function scanTopLevelProps(tag) {
  const props = []
  let i = tag.indexOf("CRUDModal") + "CRUDModal".length
  let quote = null
  let braceDepth = 0
  while (i < tag.length) {
    const char = tag[i]
    const prev = i > 0 ? tag[i - 1] : ""
    if (quote) {
      if (char === quote && prev !== "\\") quote = null
      i += 1
      continue
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char
      i += 1
      continue
    }
    if (char === "{") {
      braceDepth += 1
      i += 1
      continue
    }
    if (char === "}") {
      braceDepth = Math.max(0, braceDepth - 1)
      i += 1
      continue
    }
    if (braceDepth > 0) {
      i += 1
      continue
    }
    if (char === "/" || char === ">") break
    if (/\s/.test(char)) {
      i += 1
      continue
    }
    if (char === "/" && tag[i + 1] === "/") {
      while (i < tag.length && tag[i] !== "\n") i += 1
      continue
    }
    if (char === "/" && tag[i + 1] === "*") {
      const end = tag.indexOf("*/", i + 2)
      i = end === -1 ? tag.length : end + 2
      continue
    }
    const nameMatch = /^[A-Za-z_][A-Za-z0-9_-]*/.exec(tag.slice(i))
    if (!nameMatch) {
      i += 1
      continue
    }
    const name = nameMatch[0]
    const start = i
    i += name.length
    while (i < tag.length && /\s/.test(tag[i])) i += 1
    if (tag[i] !== "=") continue
    i += 1
    while (i < tag.length && /\s/.test(tag[i])) i += 1
    const valueStart = i
    let end = i
    let kind = "expr"
    let value = ""
    if (tag[i] === "{") {
      end = findMatching(tag, i, "{", "}")
      if (end === -1) {
        end = tag.length
      }
      value = tag.slice(i + 1, end).trim()
      if (end < tag.length) end += 1
      kind = "expr"
    } else if (tag[i] === '"') {
      kind = "string"
      i += 1
      while (i < tag.length) {
        if (tag[i] === '"' && tag[i - 1] !== "\\") break
        i += 1
      }
      end = i + 1
      value = tag.slice(valueStart + 1, i)
    } else if (tag[i] === "'") {
      kind = "string"
      i += 1
      while (i < tag.length) {
        if (tag[i] === "'" && tag[i - 1] !== "\\") break
        i += 1
      }
      end = i + 1
      value = tag.slice(valueStart + 1, i)
    } else {
      while (end < tag.length && !/\s|>/.test(tag[end])) end += 1
      value = tag.slice(valueStart, end).trim()
    }
    props.push({ name, kind, value, start, end, order: props.length })
    i = end
  }
  return props
}

function buildPropText(name, prop, indent) {
  if (prop.kind === "string") return `${indent}${name}="${prop.value}"`
  return `${indent}${name}={${prop.value}}`
}

function recoverOriginalExpr(value, token) {
  const marker = `const ${token} =`
  const start = value.indexOf(marker)
  if (start === -1) return value.trim()
  const afterMarker = start + marker.length
  const tail = value.slice(afterMarker)
  const endMarkers = [
    `if (typeof ${token}`,
    `if(typeof ${token}`,
    `${token}(reason)`,
  ]
  let end = tail.length
  for (const markerText of endMarkers) {
    const idx = tail.indexOf(markerText)
    if (idx !== -1 && idx < end) end = idx
  }
  return tail.slice(0, end).trim()
}

function buildOnCloseText(onCloseExpr, setterName, indent) {
  if (!onCloseExpr) return null
  if (!setterName) {
    return [
      `${indent}onClose={(reason) => {`,
      `${indent}  const __workspaceOnClose = ${onCloseExpr}`,
      `${indent}  if (typeof __workspaceOnClose === "function") {`,
      `${indent}    __workspaceOnClose(reason)`,
      `${indent}  }`,
      `${indent}}}`,
    ].join("\n")
  }
  if (onCloseExpr === "onClose") {
    return [
      `${indent}onClose={(reason) => {`,
      `${indent}  ${setterName}(false)`,
      `${indent}  const __workspaceOnClose = ${onCloseExpr}`,
      `${indent}  if (typeof __workspaceOnClose === "function") {`,
      `${indent}    __workspaceOnClose(reason)`,
      `${indent}  }`,
      `${indent}}}`,
    ].join("\n")
  }
  return [
    `${indent}onClose={(reason) => {`,
    `${indent}  ${setterName}(false)`,
    `${indent}  if (isCrudModalHardDismiss(reason)) {`,
    `${indent}    const __workspaceOnClose = ${onCloseExpr}`,
    `${indent}    if (typeof __workspaceOnClose === "function") {`,
    `${indent}      __workspaceOnClose(reason)`,
    `${indent}    }`,
    `${indent}  }`,
    `${indent}}}`,
  ].join("\n")
}

function buildOnSaveText(onSaveExpr, entityName, modeExpr, indent) {
  if (!onSaveExpr || onSaveExpr === "undefined") return null
  return [
    `${indent}onSave={async (...args) => {`,
    `${indent}  const __workspaceOnSave = ${onSaveExpr}`,
    `${indent}  if (typeof __workspaceOnSave !== "function") return undefined`,
    `${indent}  const result = await __workspaceOnSave(...args)`,
    `${indent}  removeWorkspaceFormDraft(location.pathname, {`,
    `${indent}    crudEntity: "${entityName}",`,
    `${indent}    crudMode: ${modeExpr},`,
    `${indent}  })`,
    `${indent}  return result`,
    `${indent}}}`,
  ].join("\n")
}

function rebuildCrudModals(text, filePath) {
  let index = 0
  let modalCounter = 0
  const baseName = lowerCamelFromFilename(filePath)

  while (true) {
    const start = text.indexOf("<CRUDModal", index)
    if (start === -1) break
    const end = findJsxTagEnd(text, start)
    if (end === -1) throw new Error(`Could not find end of CRUDModal tag in ${filePath}`)
    const tag = text.slice(start, end + 1)
    const props = scanTopLevelProps(tag)
    if (!props.length) {
      index = end + 1
      continue
    }

    modalCounter += 1
    const entityName = `${baseName}Modal${modalCounter}`
    const baseIndent = getIndentAt(text, start)
    const propIndent = `${baseIndent}  `
    const lastByName = new Map()
    props.forEach((prop) => lastByName.set(prop.name, prop))

    const openProp = lastByName.get("open")
    const modeProp = lastByName.get("mode")
    const onCloseProp = lastByName.get("onClose")
    const onSaveProp = lastByName.get("onSave")
    const modeExpr = modeProp ? (modeProp.kind === "string" ? JSON.stringify(modeProp.value) : modeProp.value) : JSON.stringify("edit")

    const openValue = openProp ? (openProp.kind === "string" ? JSON.stringify(openProp.value) : openProp.value) : null
    const setterName =
      openProp &&
      openProp.kind === "expr" &&
      /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(openProp.value) &&
      text.includes(`set${capitalize(openProp.value)}(`)
        ? `set${capitalize(openProp.value)}`
        : ""

    const onCloseExpr = onCloseProp ? recoverOriginalExpr(onCloseProp.value, "__workspaceOnClose") : ""
    const onSaveExpr = onSaveProp ? recoverOriginalExpr(onSaveProp.value, "__workspaceOnSave") : ""

    const orderedNames = []
    props.forEach((prop) => {
      if (!orderedNames.includes(prop.name)) orderedNames.push(prop.name)
    })

    const reserved = new Set(["open", "onClose", "workspaceFormShortcut", "title", "subtitle", "icon", "mode", "onEdit", "onSave"])
    const preserved = orderedNames
      .map((name) => lastByName.get(name))
      .filter(Boolean)
      .filter((prop) => !reserved.has(prop.name))

    const lines = [`${baseIndent}<CRUDModal`]
    if (openProp) lines.push(buildPropText("open", openProp, propIndent))
    const onCloseText = buildOnCloseText(onCloseExpr, setterName, propIndent)
    if (onCloseText) lines.push(onCloseText)
    lines.push(
      `${propIndent}workspaceFormShortcut={{`,
      `${propIndent}  crudEntity: "${entityName}",`,
      `${propIndent}  crudMode: ${modeExpr},`,
      `${propIndent}}}`,
    )
    for (const name of ["title", "subtitle", "icon", "mode", "onEdit"]) {
      const prop = lastByName.get(name)
      if (prop) lines.push(buildPropText(name, prop, propIndent))
    }
    const onSaveText = buildOnSaveText(onSaveExpr, entityName, modeExpr, propIndent)
    if (onSaveText) lines.push(onSaveText)
    preserved.forEach((prop) => lines.push(buildPropText(prop.name, prop, propIndent)))
    lines.push(`${baseIndent}>`)

    const replacement = lines.join("\n")
    text = text.slice(0, start) + replacement + text.slice(end + 1)
    index = start + replacement.length
  }

  return text
}

const files = scanRoots
  .flatMap((dir) => walk(dir))
  .filter((filePath) => filePath !== skipFile)
  .filter((filePath) => {
    const text = fs.readFileSync(filePath, "utf8")
    return text.includes("<CRUDModal") && (text.includes("__workspaceOnClose") || text.includes("__workspaceOnSave") || !text.includes("workspaceFormShortcut"))
  })

const modified = []
const failures = []

for (const filePath of files) {
  try {
    let text = fs.readFileSync(filePath, "utf8")
    const original = text
    text = ensureUseLocationImport(text)
    text = ensureCrudImport(text, filePath)
    text = ensureLocationHook(text, filePath)
    text = rebuildCrudModals(text, filePath)
    if (text !== original) {
      fs.writeFileSync(filePath, text)
      modified.push(filePath)
    }
  } catch (error) {
    failures.push({ filePath, message: error instanceof Error ? error.message : String(error) })
  }
}

console.log(JSON.stringify({ modifiedCount: modified.length, modified, failures }, null, 2))
