<script>
	import PostList from "./PostList.svelte";
	import PostEditor from "./PostEditor.svelte";

	// --- State ---
	let posts = $state([]);
	let selectedSlug = $state(null);
	let editingPost = $state(null); // { slug, frontmatter, content } | null
	let isNew = $state(false);
	let loading = $state(true);
	let saving = $state(false);
	let buildStatus = $state({ building: false, success: false, lastBuildTime: 0, lastBuildLog: "", lastBuildError: "" });
	let buildLogVisible = $state(false);
	let message = $state("");

	// --- Computed ---
	let selectedPost = $derived(posts.find((p) => p.slug === selectedSlug) || null);

	// --- Auth check ---
	async function checkAuth() {
		try {
			const res = await fetch("/api/admin/auth");
			const data = await res.json();
			if (!data.ok) {
				window.location.href = "/admin/login";
				return false;
			}
			return true;
		} catch {
			window.location.href = "/admin/login";
			return false;
		}
	}

	// --- Data loading ---
	async function loadPosts() {
		const res = await fetch("/api/admin/posts");
		if (res.status === 401) {
			window.location.href = "/admin/login";
			return;
		}
		posts = await res.json();
	}

	async function loadBuildStatus() {
		try {
			const res = await fetch("/api/admin/rebuild");
			buildStatus = await res.json();
		} catch { /* ignore */ }
	}

	// --- Actions ---
	function selectPost(slug) {
		if (saving) return;
		isNew = false;
		selectedSlug = slug;
		editingPost = null;
		loadPost(slug);
	}

	async function loadPost(slug) {
		const res = await fetch(`/api/admin/posts/${slug}`);
		if (res.status === 401) { window.location.href = "/admin/login"; return; }
		editingPost = await res.json();
	}

	function newPost() {
		if (saving) return;
		isNew = true;
		selectedSlug = null;
		editingPost = {
			slug: "",
			frontmatter: {
				title: "",
				published: new Date().toISOString().slice(0, 10),
				description: "",
				image: "",
				tags: [],
				category: "",
				draft: false,
				pinned: false,
				comment: true,
			},
			content: "",
		};
	}

	async function savePost(frontmatter, content) {
		saving = true;
		showMessage("保存中...");
		try {
			let res, data;
			if (isNew) {
				res = await fetch("/api/admin/posts", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ frontmatter, content }),
				});
			} else {
				res = await fetch(`/api/admin/posts/${editingPost.slug}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ frontmatter, content }),
				});
			}
			data = await res.json();
			if (res.ok) {
				showMessage("保存成功！");
				isNew = false;
				await loadPosts();
				selectedSlug = data.slug;
				await loadPost(data.slug);
			} else {
				showMessage(data.error || "保存失败", true);
			}
		} catch (err) {
			showMessage("网络错误: " + (err.message || "未知"), true);
		} finally {
			saving = false;
		}
	}

	async function deletePost(slug) {
		if (!confirm("确定要删除这篇文章吗？\n（会移到回收站）")) return;
		const res = await fetch(`/api/admin/posts/${slug}`, { method: "DELETE" });
		if (res.ok) {
			showMessage("已删除");
			posts = posts.filter((p) => p.slug !== slug);
			if (selectedSlug === slug) {
				selectedSlug = null;
				editingPost = null;
			}
		} else {
			const data = await res.json();
			showMessage(data.error || "删除失败", true);
		}
	}

	async function triggerBuild() {
		buildLogVisible = true;
		buildStatus = { ...buildStatus, building: true };
		showMessage("构建中...");
		try {
			const res = await fetch("/api/admin/rebuild", { method: "POST" });
			buildStatus = await res.json();
			if (buildStatus.success) {
				showMessage("构建完成！博客已更新。");
			} else {
				showMessage("构建失败！查看日志了解详情。", true);
			}
		} catch {
			showMessage("构建请求失败", true);
		}
	}

	async function logout() {
		await fetch("/api/admin/auth", { method: "DELETE" });
		window.location.href = "/admin/login";
	}

	let msgTimer = null;
	function showMessage(msg, isError = false) {
		message = msg;
		if (msgTimer) clearTimeout(msgTimer);
		if (!isError) msgTimer = setTimeout(() => (message = ""), 3000);
	}

	// --- Init ---
	$effect(() => {
		(async () => {
			const authed = await checkAuth();
			if (!authed) return;
			await Promise.all([loadPosts(), loadBuildStatus()]);
			loading = false;
		})();
	});
</script>

{#if loading}
	<div class="loading-screen">
		<div class="spinner"></div>
		<p>加载中...</p>
	</div>
{:else}
	<div class="admin-layout">
		<!-- Header -->
		<header class="admin-header">
			<div class="header-left">
				<h1>🌸 博客管理</h1>
				<a href="/" target="_blank" class="view-site">查看网站 ↗</a>
			</div>
			<div class="header-actions">
				<button class="btn btn-primary" onclick={newPost}>+ 新建文章</button>
				<button
					class="btn btn-build"
					onclick={triggerBuild}
					disabled={buildStatus.building}
				>
					{buildStatus.building ? "⏳ 构建中..." : "🔄 重新构建"}
				</button>
				<button class="btn btn-logout" onclick={logout}>退出</button>
			</div>
		</header>

		<!-- Message toast -->
		{#if message}
			<div class="toast">{message}</div>
		{/if}

		<!-- Main content -->
		<div class="admin-body">
			<!-- Left sidebar: Post list -->
			<aside class="sidebar">
				<PostList
					{posts}
					{selectedSlug}
					onSelect={selectPost}
					onDelete={deletePost}
				/>
			</aside>

			<!-- Right: Editor -->
			<main class="editor-area">
				{#if editingPost}
					<PostEditor
						post={editingPost}
						{isNew}
						{saving}
						onSave={savePost}
					/>
				{:else}
					<div class="empty-state">
						<div class="empty-icon">📝</div>
						<h3>选择文章开始编辑</h3>
						<p>从左侧列表选择一篇文章，或点击「新建文章」</p>
						<button class="btn btn-primary" onclick={newPost}>创建第一篇文章</button>
					</div>
				{/if}
			</main>
		</div>

		<!-- Build log -->
		{#if buildLogVisible}
			<div class="build-log-overlay" onclick={() => (buildLogVisible = false)}>
				<div class="build-log" onclick={(e) => e.stopPropagation()}>
					<div class="build-log-header">
						<h3>构建日志</h3>
						<button class="btn-close" onclick={() => (buildLogVisible = false)}>✕</button>
					</div>
					<pre class="build-log-content">{buildStatus.lastBuildLog || "暂无日志"}</pre>
					{#if buildStatus.lastBuildError}
						<pre class="build-log-error">{buildStatus.lastBuildError}</pre>
					{/if}
					{#if buildStatus.lastBuildTime}
						<p class="build-log-time">构建时间: {new Date(buildStatus.lastBuildTime).toLocaleString("zh-CN")}</p>
					{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.loading-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		gap: 16px;
		color: var(--text-secondary);
	}
	.spinner {
		width: 36px;
		height: 36px;
		border: 3px solid var(--border);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }

	.admin-layout {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}
	.admin-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 20px;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}
	.header-left {
		display: flex;
		align-items: center;
		gap: 16px;
	}
	.header-left h1 {
		font-size: 1.15rem;
		font-weight: 600;
	}
	.view-site {
		color: var(--text-muted);
		text-decoration: none;
		font-size: 0.8rem;
	}
	.view-site:hover { color: var(--accent); }
	.header-actions {
		display: flex;
		gap: 8px;
	}

	/* Buttons */
	.btn {
		padding: 8px 16px;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg-card);
		color: var(--text-primary);
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
	}
	.btn:hover { background: var(--bg-hover); }
	.btn:disabled { opacity: 0.5; cursor: not-allowed; }
	.btn-primary {
		background: var(--accent);
		border-color: var(--accent);
		color: white;
	}
	.btn-primary:hover { background: var(--accent-hover); }
	.btn-build { font-size: 0.8rem; }
	.btn-logout {
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	/* Toast */
	.toast {
		position: fixed;
		top: 60px;
		left: 50%;
		transform: translateX(-50%);
		background: var(--accent);
		color: white;
		padding: 8px 24px;
		border-radius: 20px;
		font-size: 0.85rem;
		z-index: 1000;
		animation: fadeIn 0.2s;
	}
	@keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(-8px); } }

	/* Body */
	.admin-body {
		display: flex;
		flex: 1;
		overflow: hidden;
	}
	.sidebar {
		width: 320px;
		flex-shrink: 0;
		border-right: 1px solid var(--border);
		background: var(--bg-secondary);
		overflow-y: auto;
	}
	.editor-area {
		flex: 1;
		overflow-y: auto;
		background: var(--bg-primary);
	}
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 12px;
		color: var(--text-muted);
	}
	.empty-icon { font-size: 3rem; }
	.empty-state h3 { font-size: 1.1rem; color: var(--text-secondary); }
	.empty-state p { font-size: 0.85rem; }

	/* Build log overlay */
	.build-log-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 500;
	}
	.build-log {
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: 12px;
		width: 90%;
		max-width: 700px;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
	}
	.build-log-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 18px;
		border-bottom: 1px solid var(--border);
	}
	.build-log-header h3 { font-size: 1rem; }
	.btn-close {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 1.1rem;
		cursor: pointer;
	}
	.build-log-content, .build-log-error {
		flex: 1;
		overflow-y: auto;
		padding: 14px 18px;
		font-family: "JetBrains Mono", monospace;
		font-size: 0.78rem;
		line-height: 1.5;
		white-space: pre-wrap;
		word-break: break-all;
	}
	.build-log-error { color: var(--danger); }
	.build-log-time {
		padding: 10px 18px;
		font-size: 0.78rem;
		color: var(--text-muted);
		border-top: 1px solid var(--border);
	}
</style>
