<script>
	import PostList from "./PostList.svelte";
	import PostEditor from "./PostEditor.svelte";
	import SettingsPanel from "./SettingsPanel.svelte";

	let currentTab = $state("posts");
	let posts = $state([]);
	let selectedSlug = $state(null);
	let editingPost = $state(null);
	let isNew = $state(false);
	let loading = $state(true);
	let saving = $state(false);
	let buildStatus = $state({ building: false, success: false, lastBuildTime: 0, lastBuildLog: "", lastBuildError: "" });
	let buildLogVisible = $state(false);
	let toast = $state(null);

	let draftCount = $derived(posts.filter(p => p.frontmatter.draft).length);
	let publishedCount = $derived(posts.filter(p => !p.frontmatter.draft).length);

	function showToast(text, type = "info") {
		toast = { text, type };
		setTimeout(() => { if (toast?.text === text) toast = null; }, 3000);
	}

	async function checkAuth() {
		try {
			const res = await fetch("/api/admin/auth");
			if (!(await res.json()).ok) { window.location.href = "/admin/login"; return false; }
			return true;
		} catch { window.location.href = "/admin/login"; return false; }
	}

	async function loadAll() {
		const [postsRes, buildRes] = await Promise.all([
			fetch("/api/admin/posts"), fetch("/api/admin/rebuild")
		]);
		if (postsRes.status === 401) { window.location.href = "/admin/login"; return; }
		posts = await postsRes.json();
		try { buildStatus = await buildRes.json(); } catch { /* */ }
	}

	function selectPost(slug) {
		if (saving) return;
		isNew = false; selectedSlug = slug;
		fetch(`/api/admin/posts/${slug}`).then(r => r.json()).then(p => editingPost = p);
	}

	function newPost() {
		if (saving) return;
		isNew = true; selectedSlug = null;
		editingPost = {
			slug: "",
			frontmatter: {
				title: "", published: new Date().toISOString().slice(0, 10),
				description: "", image: "", tags: [], category: "",
				draft: false, pinned: false, comment: true,
			},
			content: "",
		};
	}

	async function savePost(fm, content) {
		saving = true; showToast("保存中...", "info");
		try {
			const url = isNew ? "/api/admin/posts" : `/api/admin/posts/${editingPost.slug}`;
			const method = isNew ? "POST" : "PUT";
			const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ frontmatter: fm, content }) });
			const data = await res.json();
			if (res.ok) {
				showToast("✅ 保存成功", "success"); isNew = false;
				await loadAll(); selectedSlug = data.slug;
				fetch(`/api/admin/posts/${data.slug}`).then(r => r.json()).then(p => editingPost = p);
			} else { showToast("❌ " + (data.error || "保存失败"), "error"); }
		} catch { showToast("❌ 网络错误", "error"); }
		finally { saving = false; }
	}

	async function deletePost(slug) {
		if (!confirm("确定删除这篇文章？")) return;
		const res = await fetch(`/api/admin/posts/${slug}`, { method: "DELETE" });
		if (res.ok) {
			showToast("🗑️ 已删除", "success");
			posts = posts.filter(p => p.slug !== slug);
			if (selectedSlug === slug) { selectedSlug = null; editingPost = null; }
		} else { showToast("❌ 删除失败", "error"); }
	}

	async function triggerBuild() {
		buildLogVisible = true; buildStatus = { ...buildStatus, building: true };
		showToast("🔨 构建中...", "info");
		try {
			const res = await fetch("/api/admin/rebuild", { method: "POST" });
			buildStatus = await res.json();
			if (buildStatus.success) showToast("✅ 构建完成！博客已更新", "success");
			else showToast("❌ 构建失败，查看日志", "error");
		} catch { showToast("❌ 网络错误", "error"); }
	}

	function logout() {
		fetch("/api/admin/auth", { method: "DELETE" }).then(() => { window.location.href = "/admin/login"; });
	}

	$effect(() => {
		(async () => {
			if (!(await checkAuth())) return;
			await loadAll();
			loading = false;
		})();
	});
</script>

{#if loading}
	<div class="loading-screen">
		<div class="spinner"></div>
		<p>正在加载管理后台...</p>
	</div>
{:else}
	<div class="admin-app">
		<header class="topbar">
			<div class="topbar-brand">
				<span class="brand-icon">🌸</span>
				<div><h1>博客管理</h1><span class="brand-sub">Mizuki Admin</span></div>
			</div>
			<div class="topbar-stats">
				<div class="stat-item"><span class="stat-num">{publishedCount}</span><span class="stat-label">已发布</span></div>
				<div class="stat-item"><span class="stat-num">{draftCount}</span><span class="stat-label">草稿</span></div>
				{#if buildStatus.lastBuildTime}
					<div class="stat-item"><span class="stat-num stat-time">{new Date(buildStatus.lastBuildTime).toLocaleTimeString("zh-CN", {hour:"2-digit",minute:"2-digit"})}</span><span class="stat-label">上次构建</span></div>
				{/if}
			</div>
			<div class="topbar-actions">
				<button class="btn btn-outline" onclick={newPost}><span class="btn-icon">＋</span> 写文章</button>
				<button class="btn btn-primary" onclick={triggerBuild} disabled={buildStatus.building}>
					<span class="btn-icon">{buildStatus.building ? "⏳" : "🚀"}</span> {buildStatus.building ? "构建中..." : "发布更新"}
				</button>
				<a href="/" target="_blank" class="btn btn-ghost" title="查看网站">🔗</a>
				<button class="btn btn-ghost" onclick={logout} title="退出登录">🚪</button>
			</div>
		</header>

		{#if toast}<div class="toast toast-{toast.type}">{toast.text}</div>{/if}

		<div class="admin-body">
			<aside class="sidebar">
				<div class="tab-bar">
					<button class="tab-btn" class:active={currentTab === "posts"} onclick={() => currentTab = "posts"}>📝 文章</button>
					<button class="tab-btn" class:active={currentTab === "settings"} onclick={() => currentTab = "settings"}>⚙️ 设置</button>
				</div>
				{#if currentTab === "posts"}
					<div class="sidebar-header"><h2>文章列表</h2><span class="sidebar-count">{posts.length} 篇</span></div>
					<PostList {posts} {selectedSlug} onSelect={selectPost} onDelete={deletePost} />
				{/if}
			</aside>
			<main class="main-area">
				{#if currentTab === "settings"}
					<SettingsPanel />
				{:else if editingPost}
					<PostEditor post={editingPost} {isNew} {saving} onSave={savePost} />
				{:else}
					<div class="welcome">
						<div class="welcome-card">
							<div class="welcome-illustration">✍️</div>
							<h2>欢迎使用博客管理后台</h2>
							<p>在这里你可以轻松管理博客文章，无需接触代码</p>
							<div class="quick-actions">
								<button class="quick-action primary" onclick={newPost}>
									<span class="qa-icon">📝</span>
									<div><strong>写一篇新文章</strong><span>使用 Markdown 编辑器开始创作</span></div>
								</button>
								<button class="quick-action" onclick={() => posts[0] && selectPost(posts[0].slug)}>
									<span class="qa-icon">📋</span>
									<div><strong>编辑已有文章</strong><span>从左侧列表选择一篇文章开始编辑</span></div>
								</button>
								<button class="quick-action" onclick={triggerBuild}>
									<span class="qa-icon">🚀</span>
									<div><strong>发布更新</strong><span>文章修改后，点击这里让改动生效</span></div>
								</button>
							</div>
							<div class="welcome-tip">💡 <strong>提示：</strong>编辑器中按 <kbd>Ctrl+S</kbd> 可快速保存</div>
						</div>
					</div>
				{/if}
			</main>
		</div>

		{#if buildLogVisible}
			<div class="modal-overlay" onclick={() => buildLogVisible = false}>
				<div class="modal" onclick={e => e.stopPropagation()}>
					<div class="modal-header">
						<h3>📋 构建日志</h3>
						<button class="btn-close" onclick={() => buildLogVisible = false}>✕</button>
					</div>
					<pre class="modal-log">{buildStatus.lastBuildLog || "暂无日志"}</pre>
					{#if buildStatus.lastBuildError}<pre class="modal-log modal-log-error">{buildStatus.lastBuildError}</pre>{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}
