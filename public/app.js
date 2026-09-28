function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function renderExcerpt(value) {
  return escapeHtml(value).replace(/\n/g, " ");
}

async function loadPosts() {
  const list = document.querySelector("#post-list");
  try {
    const response = await fetch("/api/posts");
    const posts = await response.json();
    document.querySelector("#post-count").textContent = `${posts.length} ${posts.length === 1 ? "story" : "stories"}`;
    if (!posts.length) {
      list.innerHTML = '<p class="empty-state">The first story is still taking shape.</p>';
      return;
    }
    list.innerHTML = posts.map((post, index) => `<a class="post-card ${index === 0 ? "featured" : ""}" href="/post/${encodeURIComponent(post.slug)}" target="_blank" rel="noreferrer"><span class="post-number">${String(index + 1).padStart(2, "0")}</span><div class="post-card-content"><div class="post-meta"><span>${escapeHtml(post.category)}</span><span>${new Date(post.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span></div><h3>${escapeHtml(post.title)}</h3><p>${renderExcerpt(post.excerpt)}</p><span class="read-link">Read story ↗</span></div></a>`).join("");
  } catch {
    list.innerHTML = '<p class="empty-state">Stories are resting for a moment. Please refresh.</p>';
  }
}

loadPosts();