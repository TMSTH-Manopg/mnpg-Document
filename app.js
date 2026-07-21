async function loadMarkdown(filePath) {
  const contentElement = document.getElementById("markdown-content");

  try {
    contentElement.innerHTML = "<p>Loading document...</p>";

    const response = await fetch(filePath);

    if (!response.ok) {
      throw new Error(`Cannot load markdown file: ${filePath}`);
    }

    const markdownText = await response.text();

    const rawHtml = marked.parse(markdownText);
    const cleanHtml = DOMPurify.sanitize(rawHtml);

    contentElement.innerHTML = cleanHtml;
  } catch (error) {
    contentElement.innerHTML = `
      <h2>เกิดข้อผิดพลาด</h2>
      <p>ไม่สามารถโหลดเอกสารได้</p>
      <pre>${error.message}</pre>
    `;
  }
}

loadMarkdown("docs/index.md");