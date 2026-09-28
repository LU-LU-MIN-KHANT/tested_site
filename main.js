const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { URL } = require("node:url");
const { MongoClient } = require("mongodb");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const mongoUri = process.env.MONGODB_URI || "mongodb+srv://Geek:m5tN8NOKPKvj5hP0@cluster0.14ykwqi.mongodb.net/?appName=Cluster0";
const mongoDbName = process.env.MONGODB_DB || "quietly-curious";
const mongoClient = mongoUri ? new MongoClient(mongoUri) : null;
let postsCollection;

function slugify(value) {
	return String(value || "post")
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "") || "post";
}

function normalizePost(raw, index = 0) {
	const title = raw.title || raw.mainHeader || raw.main_header || raw.header || raw["main header"] || `Untitled post ${index + 1}`;
	const sections = Array.isArray(raw.sections)
		? raw.sections
		: Object.keys(raw)
				.filter((key) => /^header\d+$/i.test(key))
				.sort((a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")))
				.map((headerKey) => {
					const number = headerKey.replace(/\D/g, "");
					return { heading: raw[headerKey], body: raw[`body${number}`] || "" };
				});
	const body = raw.body || raw.content || (sections.length ? sections.map((section) => `## ${section.heading}\n\n${section.body}`).join("\n\n") : "");
	const createdAt = raw.createdAt || raw.date || new Date().toISOString();
	return {
		id: raw.id || crypto.randomUUID(),
		slug: slugify(raw.slug || title),
		title: String(title).trim(),
		excerpt: String(raw.excerpt || body.replace(/[#*_`>\n]/g, " ").replace(/\s+/g, " ").trim().slice(0, 170)),
		body: String(body).trim(),
		category: String(raw.category || "Notes"),
		coverImage: String(raw.coverImage || raw.image || ""),
		createdAt,
		updatedAt: new Date().toISOString()
	};
}

function uniqueSlug(posts, desiredSlug, currentId) {
	const base = slugify(desiredSlug);
	let slug = base;
	let count = 2;
	while (posts.some((post) => post.slug === slug && post.id !== currentId)) {
		slug = `${base}-${count}`;
		count += 1;
	}
	return slug;
}

function sendJson(response, status, payload) {
	response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
	response.end(JSON.stringify(payload));
}

function sendFile(response, filePath, contentType) {
	fs.readFile(filePath, (error, content) => {
		if (error) {
			response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
			response.end("Not found");
			return;
		}
		response.writeHead(200, { "Content-Type": contentType });
		response.end(content);
	});
}

function readRequestBody(request) {
	return new Promise((resolve, reject) => {
		let body = "";
		request.on("data", (chunk) => {
			body += chunk;
			if (body.length > 2 * 1024 * 1024) {
				reject(new Error("Request is too large"));
				request.destroy();
			}
		});
		request.on("end", () => resolve(body));
		request.on("error", reject);
	});
}

async function handleImport(request, response) {
	try {
		const imported = JSON.parse(await readRequestBody(request));
		const sourcePosts = Array.isArray(imported) ? imported : imported.posts ? imported.posts : [imported];
		if (!sourcePosts.length || sourcePosts.some((post) => !post || typeof post !== "object")) {
			sendJson(response, 400, { error: "Provide a JSON object or an array of post objects." });
			return;
		}
		const posts = await postsCollection.find({}, { projection: { _id: 0 } }).toArray();
		const saved = [];
		sourcePosts.forEach((raw, index) => {
			const normalized = normalizePost(raw, index);
			normalized.slug = uniqueSlug([...posts, ...saved], normalized.slug, normalized.id);
			saved.push(normalized);
		});
		await postsCollection.insertMany(saved);
		sendJson(response, 201, { message: `${saved.length} post${saved.length === 1 ? "" : "s"} published.`, posts: saved });
	} catch (error) {
		const status = error.message.includes("JSON") || error.message.includes("Request is too large") ? 400 : 500;
		sendJson(response, status, { error: error.message.includes("JSON") ? "The request is not valid JSON." : error.message });
	}
}

const server = http.createServer(async (request, response) => {
	const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
	const pathname = decodeURIComponent(requestUrl.pathname);

	if (request.method === "GET" && pathname === "/api/posts") {
		const posts = await postsCollection.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
		sendJson(response, 200, posts);
		return;
	}

	if (request.method === "POST" && pathname === "/api/admin/posts/import") {
		await handleImport(request, response);
		return;
	}

	if (request.method === "GET" && pathname.startsWith("/post/")) {
		sendFile(response, path.join(PUBLIC_DIR, "post.html"), "text/html; charset=utf-8");
		return;
	}

	if (request.method === "GET" && pathname === "/admin/post") {
		sendFile(response, path.join(PUBLIC_DIR, "admin.html"), "text/html; charset=utf-8");
		return;
	}

	const files = {
		"/": ["index.html", "text/html; charset=utf-8"],
		"/index.html": ["index.html", "text/html; charset=utf-8"],
		"/styles.css": ["styles.css", "text/css; charset=utf-8"],
		"/app.js": ["app.js", "text/javascript; charset=utf-8"],
		"/post.js": ["post.js", "text/javascript; charset=utf-8"],
		"/admin.js": ["admin.js", "text/javascript; charset=utf-8"]
	};
	if (request.method === "GET" && files[pathname]) {
		sendFile(response, path.join(PUBLIC_DIR, files[pathname][0]), files[pathname][1]);
		return;
	}

	response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
	response.end("Not found");
});

async function start() {
	if (!mongoUri) {
		throw new Error("MONGODB_URI is required. Add your MongoDB connection string to the environment.");
	}
	await mongoClient.connect();
	postsCollection = mongoClient.db(mongoDbName).collection("posts");
	await postsCollection.createIndex({ slug: 1 }, { unique: true });
	server.listen(PORT, "0.0.0.0", () => {
		console.log(`Blog running at http://localhost:${PORT}`);
	});
}

start().catch((error) => {
	console.error(`Could not connect to MongoDB: ${error.message}`);
	process.exitCode = 1;
});