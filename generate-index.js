import fs from "fs";
import path from "path";

const rootDir = "."; // root folder
const excludeFile = path.join(rootDir, "exclude.txt");

// Read excluded paths
let excludedPaths = [];
if (fs.existsSync(excludeFile)) {
  excludedPaths = fs
    .readFileSync(excludeFile, "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/\\/g, "/")); // normalize slashes
}

// Recursive function: returns array of {name, path, children}
// Only generate a link if index.html exists
function getDirsWithIndex(dir, basePath = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const result = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name).replace(/\\/g, "/");

      // Skip excluded paths
      if (excludedPaths.includes(relativePath)) continue;

      const hasIndex = fs.existsSync(path.join(fullPath, "index.html"));
      const children = getDirsWithIndex(fullPath, relativePath);

      // Only include this folder if it has index.html OR has children with index.html
      if (hasIndex || children.length > 0) {
        result.push({
          name: entry.name,
          path: hasIndex ? relativePath : null, // only generate link if index.html exists
          children,
        });
      }
    }
  }

  return result;
}

// Generate nested HTML list
function generateHTMLList(items) {
  if (!items.length) return "";
  return `<ul>
    ${items
      .map(
        (item) => `
      <li>
        ${
          item.path ? `<a href="${item.path}/">${item.name}</a>` : `<span>${item.name}</span>` // no link if index.html missing
        }
        ${generateHTMLList(item.children)}
      </li>`
      )
      .join("")}
  </ul>`;
}

// Build the table of contents
const tocStructure = getDirsWithIndex(rootDir);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Table of Contents</title>
  <style>
    body { font-family: sans-serif; padding: 2rem; background: #f5f5f5; }
    h1 { margin-bottom: 1rem; }
    ul { list-style: none; padding-left: 1rem; }
    li { margin: 0.25rem 0; }
    a { text-decoration: none; color: #007acc; }
    a:hover { text-decoration: underline; }
    span { color: #555; }
  </style>
</head>
<body>
  <h1>Table of Contents</h1>
  ${generateHTMLList(tocStructure)}
</body>
</html>
`;

fs.writeFileSync(path.join(rootDir, "index.html"), html);
// eslint-disable-next-line no-undef
console.log("Root index.html with hierarchical TOC generated!");
