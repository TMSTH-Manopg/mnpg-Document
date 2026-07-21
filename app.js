const GITHUB_OWNER = "TMSTH-Manopg";
const GITHUB_REPO = "mnpg-Document";
const GITHUB_BRANCH = "main";
const DOCS_ROOT = "docs";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose"
});

document.addEventListener("DOMContentLoaded", async () => {
  await buildDocumentMenu();

  // โหลดหน้าแรกอัตโนมัติ
  loadMarkdown("docs/index.md");
});

async function buildDocumentMenu() {
  const menuElement = document.getElementById("doc-menu");

  try {
    menuElement.innerHTML = "<p>Loading menu...</p>";

    const docsTree = await getGitHubDirectoryTree(DOCS_ROOT);

    menuElement.innerHTML = "";

    const homeButton = createMenuButton("Home", "docs/index.md");
    menuElement.appendChild(homeButton);

    renderMenuItems(menuElement, docsTree);

  } catch (error) {
    menuElement.innerHTML = `
      <div class="menu-error">
        <p>ไม่สามารถโหลดเมนูเอกสารได้</p>
        <pre>${error.message}</pre>
      </div>
    `;
  }
}

async function getGitHubDirectoryTree(path) {
  const apiUrl =
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`;

  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`Cannot read GitHub folder: ${path}`);
  }

  const items = await response.json();

  const result = [];

  for (const item of items) {
    if (item.type === "dir") {
      const children = await getGitHubDirectoryTree(item.path);

      result.push({
        type: "dir",
        name: item.name,
        path: item.path,
        children: children
      });
    }

    if (item.type === "file" && item.name.toLowerCase().endsWith(".md")) {
      // ไม่แสดง docs/index.md ซ้ำ เพราะมี Home แล้ว
      if (item.path !== "docs/index.md") {
        result.push({
          type: "file",
          name: item.name,
          path: item.path
        });
      }
    }
  }

  return sortMenuItems(result);
}

function sortMenuItems(items) {
  return items.sort((a, b) => {
    if (a.type === "dir" && b.type === "file") return -1;
    if (a.type === "file" && b.type === "dir") return 1;
    return a.name.localeCompare(b.name);
  });
}

function renderMenuItems(parentElement, items) {
  items.forEach(item => {
    if (item.type === "dir") {
      const sectionTitle = document.createElement("h3");
      sectionTitle.textContent = formatTitle(item.name);
      parentElement.appendChild(sectionTitle);

      renderMenuItems(parentElement, item.children);
    }

    if (item.type === "file") {
      const button = createMenuButton(formatFileName(item.name), item.path);
      parentElement.appendChild(button);
    }
  });
}

function createMenuButton(title, filePath) {
  const button = document.createElement("button");

  button.textContent = title;
  button.onclick = () => loadMarkdown(filePath);

  return button;
}

async function loadMarkdown(filePath) {
  const contentElement = document.getElementById("markdown-content");

  try {
    contentElement.innerHTML = "<p>Loading...</p>";

    const rawUrl =
      `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${filePath}`;

    const response = await fetch(rawUrl);

    if (!response.ok) {
      throw new Error(`Cannot load markdown file: ${filePath}`);
    }

    const markdownText = await response.text();

    const rawHtml = marked.parse(markdownText);
    const cleanHtml = DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: ["iframe"],
      ADD_ATTR: ["target"]
    });

    contentElement.innerHTML = cleanHtml;

    convertMermaidBlocks(contentElement);

    await mermaid.run({
      nodes: contentElement.querySelectorAll(".mermaid")
    });

  } catch (error) {
    contentElement.innerHTML = `
      <h2>เกิดข้อผิดพลาด</h2>
      <p>ไม่สามารถโหลดเอกสารได้</p>
      <pre>${error.message}</pre>
    `;
  }
}

function convertMermaidBlocks(container) {
  const blocks = container.querySelectorAll(
    "pre code.language-mermaid, pre code.lang-mermaid"
  );

  blocks.forEach((block) => {
    const mermaidDiv = document.createElement("div");
    mermaidDiv.className = "mermaid";
    mermaidDiv.textContent = block.textContent;

    block.parentElement.replaceWith(mermaidDiv);
  });
}

function formatFileName(fileName) {
  return fileName
    .replace(".md", "")
    .replace(/_/g, " ")
    .replace(/-/g, " ");
}

function formatTitle(folderName) {
  return folderName
    .replace(/_/g, " ")
    .replace(/-/g, " ");
}