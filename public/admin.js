const form = document.querySelector("#upload-form");
const jsonInput = document.querySelector("#json-input");
const message = document.querySelector("#form-message");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.className = "form-message";
  message.textContent = "Publishing...";
  try {
    const contents = jsonInput.value.trim();
    if (!contents) throw new Error("Paste some JSON first.");
    const response = await fetch("/api/admin/posts/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: contents });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not publish this post.");
    message.className = "form-message success";
    message.textContent = `${result.message} Your story is now visible on the homepage.`;
    form.reset();
  } catch (error) {
    message.className = "form-message error";
    message.textContent = error.message;
  }
});