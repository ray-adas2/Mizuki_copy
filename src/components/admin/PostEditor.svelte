<script>
	import { marked } from "marked";
	let { post, isNew = false, saving = false, onSave } = $props();

	let title = $state(""), published = $state(""), description = $state("");
	let tagsStr = $state(""), category = $state(""), image = $state("");
	let draft = $state(false), pinned = $state(false), comment = $state(true);
	let content = $state(""), showPreview = $state(false), previewHtml = $state("");
	let uploading = $state(false), textareaRef = $state(null);
	let infoExpanded = $state(false);
	let today = $state(new Date().toISOString().slice(0, 10));

	$effect(() => {
		if (!post) return;
		title = post.frontmatter?.title || ""; published = post.frontmatter?.published || "";
		description = post.frontmatter?.description || ""; tagsStr = (post.frontmatter?.tags || []).join(", ");
		category = post.frontmatter?.category || ""; image = post.frontmatter?.image || "";
		draft = post.frontmatter?.draft ?? false; pinned = post.frontmatter?.pinned ?? false;
		comment = post.frontmatter?.comment ?? true; content = post.content || ""; showPreview = false;
		infoExpanded = false;
	});

	$effect(() => {
		if (showPreview && content) { try { previewHtml = marked.parse(content); } catch { previewHtml = "<p>预览出错</p>"; } }
	});

	function buildFm() {
		return { title: title || "Untitled", published: published || new Date().toISOString().slice(0, 10), description: description || undefined, image: image || undefined, tags: tagsStr.split(",").map(t => t.trim()).filter(Boolean), category: category || undefined, draft, pinned, comment };
	}
	function handleSave() { onSave?.(buildFm(), content); }

	function insert(before, after = "") {
		const ta = textareaRef; if (!ta) return;
		const s = ta.selectionStart, e = ta.selectionEnd, sel = content.slice(s, e);
		content = content.slice(0, s) + before + sel + after + content.slice(e);
		setTimeout(() => { ta.focus(); ta.setSelectionRange(s + before.length + sel.length + after.length, s + before.length + sel.length + after.length); }, 0);
	}

	async function handleUpload(e) {
		const file = e.target.files?.[0]; if (!file) return;
		uploading = true;
		try {
			const fd = new FormData(); fd.append("file", file);
			const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
			const data = await res.json();
			if (res.ok) { insert(`![${file.name}](${data.url})`); } else { alert("上传失败: " + (data.error || "")); }
		} catch { alert("上传失败"); }
		finally { uploading = false; e.target.value = ""; }
	}

	function onDrop(e) {
		e.preventDefault();
		const file = e.dataTransfer?.files?.[0];
		if (!file?.type.startsWith("image/")) return;
		const dt = new DataTransfer(); dt.items.add(file);
		const inp = document.createElement("input"); inp.type = "file"; inp.files = dt.files;
		handleUpload({ target: inp });
	}
</script>

<div class="editor" ondragover={(e) => e.preventDefault()} ondrop={onDrop}>
	<div class="section section-info">
		<div class="section-header">
			<h3>📋 文章信息</h3>
			<div style="display:flex;align-items:center;gap:8px;">
				<span class="section-badge" class:draft class:published={!draft}>{draft ? "草稿" : "已发布"}</span>
				<button class="tool-btn" onclick={() => infoExpanded = !infoExpanded}>{infoExpanded ? "▲ 收起" : "▼ 展开详情"}</button>
			</div>
		</div>
		<div class="field-row"><input type="text" class="input input-title" placeholder="输入文章标题..." bind:value={title} /></div>
		{#if infoExpanded}
			<div class="field-grid">
				<div class="field"><label>📅 发布日期</label><input type="date" class="input" max={today} bind:value={published} /></div>
				<div class="field"><label>📂 分类</label><input type="text" class="input" placeholder="例如：技术、生活" bind:value={category} /></div>
				<div class="field"><label>🏷️ 标签</label><input type="text" class="input" placeholder="用逗号分隔，如：JS, CSS" bind:value={tagsStr} /></div>
				<div class="field"><label>🖼️ 封面图</label><input type="text" class="input" placeholder="/images/cover.jpg" bind:value={image} /></div>
			</div>
			<div class="field-row"><div class="field field-full"><label>📝 文章摘要</label><input type="text" class="input" placeholder="简短描述文章内容（会显示在文章列表卡片中）" bind:value={description} /></div></div>
			<div class="toggle-row">
				<button class="toggle-btn" class:on={pinned} onclick={() => pinned = !pinned}>📌 置顶</button>
				<button class="toggle-btn" class:on={comment} onclick={() => comment = !comment}>💬 允许评论</button>
				<button class="toggle-btn" class:on={draft} onclick={() => draft = !draft}>📄 草稿模式</button>
				<span class="field-hint">草稿不会在首页显示</span>
			</div>
		{/if}
	</div>

	<div class="section section-content">
		<div class="section-header">
			<h3>✍️ 文章内容</h3>
			<div class="header-actions">
				<button class="tool-btn" onclick={() => showPreview = !showPreview}>{showPreview ? "✏️ 编辑" : "👁️ 预览"}</button>
				<button class="btn-save" onclick={handleSave} disabled={saving || !title.trim()}>{saving ? "⏳ 保存中..." : "💾 保存文章"}</button>
			</div>
		</div>
		<div class="toolbar">
			<button class="tb-btn" onclick={() => insert("**","**")} title="粗体"><b>B</b></button>
			<button class="tb-btn" onclick={() => insert("*","*")} title="斜体"><i>I</i></button>
			<button class="tb-btn" onclick={() => insert("### ")} title="标题">H</button>
			<button class="tb-btn" onclick={() => insert("[", "](url)")} title="链接">🔗</button>
			<button class="tb-btn" onclick={() => insert("![alt](", ")")} title="图片">🖼</button>
			<button class="tb-btn" onclick={() => insert("`","`")} title="行内代码">&lt;/&gt;</button>
			<button class="tb-btn" onclick={() => insert("```\n","\n```")} title="代码块">📋</button>
			<button class="tb-btn" onclick={() => insert("> ")} title="引用">❝</button>
			<button class="tb-btn" onclick={() => insert("- ")} title="列表">•</button>
			<button class="tb-btn" onclick={() => insert("1. ")} title="编号">1.</button>
			<span class="tb-divider"></span>
			<label class="tb-upload" title="上传图片（支持拖拽）">📤 {uploading ? "上传中..." : "上传图片"}<input type="file" accept="image/*" onchange={handleUpload} hidden /></label>
		</div>
		<div class="editor-area">
			{#if showPreview}
				<div class="preview">{@html previewHtml}</div>
			{:else}
				<textarea bind:this={textareaRef} class="textarea"
					placeholder="开始写 Markdown 内容...&#10;&#10;提示：&#10;- 拖拽图片到编辑区可自动上传&#10;- Ctrl+S 快速保存"
					bind:value={content}
					onkeydown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); } }}>
				</textarea>
			{/if}
		</div>
	</div>
</div>
