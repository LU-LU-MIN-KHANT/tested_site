function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function renderMarkdown(value) {
  return escapeHtml(value).split(/\n\n+/).map((block) => {
    if (block.startsWith("### ")) return `<h3>${block.slice(4)}</h3>`;
    if (block.startsWith("## ")) return `<h2>${block.slice(3)}</h2>`;
    if (block.startsWith("# ")) return `<h2>${block.slice(2)}</h2>`;
    return `<p>${block.replace(/\n/g, "<br>").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`(.+?)`/g, "<code>$1</code>")}</p>`;
  }).join("");
}

async function loadPost() {
  const slug = decodeURIComponent(window.location.pathname.replace(/^\/post\//, ""));
  const article = document.querySelector("#article");
  try {
    const response = await fetch("/api/posts");
    const posts = await response.json();
    const post = posts.find((item) => item.slug === slug);
    if (!post) throw new Error("Missing post");
    document.title = `${post.title} | Quietly Curious`;
    article.innerHTML = `<div class="article-meta"><span>${escapeHtml(post.category)}</span><span>${new Date(post.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span></div><h1>${escapeHtml(post.title)}</h1><p class="article-excerpt">${escapeHtml(post.excerpt)}</p>${post.coverImage ? `<img class="article-image" src="${escapeHtml(post.coverImage)}" alt="">` : ""}<div class="article-body">${renderMarkdown(post.body)}</div>`;
  } catch {
    article.innerHTML = '<h1>That story could not be found.</h1><p class="article-excerpt">It may have been moved or is still being written.</p>';
  }
}

loadPost();