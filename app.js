mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose"
});

async function loadMarkdown(filePath) {
  const contentElement = document.getElementById("markdown-content");

  try {
    contentElement.innerHTML = "<p>Loading...</p>";

    const response = await fetch(filePath);

    if (!response.ok) {
      throw new Error(`Cannot load markdown file: ${filePath}`);
    }

    const markdownText = await response.text();

    const rawHtml = marked.parse(markdownText);
    const cleanHtml = DOMPurify.sanitize(rawHtml);

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

loadMarkdown("docs/index.md");