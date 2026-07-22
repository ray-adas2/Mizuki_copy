<script>
	import { marked } from "marked";

	let { post, isNew = false, saving = false, onSave } = $props();

	// Local copies for editing
	let title = $state(post?.frontmatter?.title || "");
	let published = $state(post?.frontmatter?.published || "");
	let description = $state(post?.frontmatter?.description || "");
	let tagsStr = $state((post?.frontmatter?.tags || []).join(", "));
	let category = $state(post?.frontmatter?.category || "");
	let image = $state(post?.frontmatter?.image || "");
	let draft = $state(post?.frontmatter?.draft ?? false);
	let pinned = $state(post?.frontmatter?.pinned ?? false);
	let comment = $state(post?.frontmatter?.comment ?? true);
	let content = $state(post?.content || "");

	let previewHtml = $state("");
	let showPreview = $state(false);
	let uploading = $state(false);
	let cursorPos = $state(0);

	// Sync when post changes
	$effect(() => {
		if (post) {
			title = post.frontmatter?.title || "";
			published = post.frontmatter?.published || "";
			description = post.frontmatter?.description || "";
			tagsStr = (post.frontmatter?.tags || []).join(", ");
			category = post.frontmatter?.category || "";
			image = post.frontmatter?.image || "";
			draft = post.frontmatter?.draft ?? false;
			pinned = post.frontmatter?.pinned ?? false;
			comment = post.frontmatter?.comment ?? true;
			content = post.content || "";
			showPreview = false;
		}
	});

	// Generate preview
	$effect(() => {
		if (showPreview) {
			try {
				previewHtml = marked.parse(content);
			} catch {
				previewHtml = "<p>预览失败</p>";
			}
		}
	});

	function buildFrontmatter() {
		return {
			title: title || "Untitled",
			published: published || new Date().toISOString().slice(0, 10),
			description: description || undefined,
			image: image || undefined,
			tags: tagsStr
				.split(",")
				.map((t) => t.trim())
				.filter(Boolean),
			category: category || undefined,
			draft,
			pinned,
			comment,
		};
	}

	function handleSave() {
		onSave?.(buildFrontmatter(), content);
	}

	// --- Toolbar helpers ---
	let textareaRef = $state(null);

	function insertText(before, after = "") {
		const ta = textareaRef;
		if (!ta) return;
		const start = ta.selectionStart;
		const end = ta.selectionEnd;
		const selected = content.slice(start, end);
		const newText = content.slice(0, start) + before + selected + after + content.slice(end);
		content = newText;
		// Restore cursor after state update
		setTimeout(() => {
			ta.focus();
			const pos = start + before.length + selected.length + after.length;
			ta.setSelectionRange(pos, pos);
		}, 0);
	}

	function insertBold() { insertText("**", "**"); }
	function insertItalic() { insertText("*", "*"); }
	function insertHeading() { insertText("### "); }
	function insertLink() { insertText("[", "](url)"); }
	function insertImage() { insertText("![alt](", ")"); }
	function insertCode() { insertText("`", "`"); }
	function insertCodeBlock() { insertText("```\n", "\n```"); }
	function insertQuote() { insertText("> "); }
	function insertList() { insertText("- "); }
	function insertNumberedList() { insertText("1. "); }
	function insertHorizontalRule() { insertText("\n---\n"); }

	// --- Image upload ---
	async function handleImageUpload(e) {
		const file = e.target.files?.[0];
		if (!file) return;
		uploading = true;
		try {
			const formData = new FormData();
			formData.append("file", file);
			const res = await fetch("/api/admin/upload", {
				method: "POST",
				body: formData,
			});
			const data = await res.json();
			if (res.ok) {
				insertImage();
				// Replace the "url" placeholder in the inserted image syntax
				const ta = textareaRef;
				if (ta) {
					const pos = ta.selectionStart;
					const imgUrl = data.url;
					const before = content.slice(0, pos);
					const after = content.slice(pos);
					content = before + imgUrl + after;
					setTimeout(() => {
						ta.focus();
						const newPos = pos + imgUrl.length;
						ta.setSelectionRange(newPos, newPos);
					}, 0);
				}
			} else {
				alert("上传失败: " + (data.error || "未知错误"));
			}
		} catch {
			alert("上传失败: 网络错误");
		} finally {
			uploading = false;
			// Reset file input
			e.target.value = "";
		}
	}

	// --- Drag & drop image ---
	function handleDrop(e) {
		e.preventDefault();
		const file = e.dataTransfer?.files?.[0];
		if (!file?.type.startsWith("image/")) return;
		const dt = new DataTransfer();
		dt.items.add(file);
		const input = document.createElement("input");
		input.type = "file";
		input.files = dt.files;
		handleImageUpload({ target: input });
	}

	function handleDragOver(e) {
		e.preventDefault();
	}
</script>

<div class="editor">
	<!-- Title bar -->
	<div class="editor-header">
		<div class="editor-title-row">
			<input
				type="text"
				class="title-input"
				placeholder="文章标题"
				bind:value={title}
			/>
			<button
				class="btn-save"
				onclick={handleSave}
				disabled={saving || !title.trim()}
			>
				{saving ? "保存中..." : "💾 保存"}
			</button>
		</div>

		<!-- Frontmatter row -->
		<div class="fm-row">
			<div class="fm-field">
				<label>日期</label>
				<input type="date" bind:value={published} />
			</div>
			<div class="fm-field">
				<label>分类</label>
				<input type="text" placeholder="Frontend" bind:value={category} />
			</div>
			<div class="fm-field">
				<label>标签 (逗号分隔)</label>
				<input type="text" placeholder="tag1, tag2" bind:value={tagsStr} />
			</div>
			<div class="fm-field">
				<label>封面图</label>
				<input type="text" placeholder="/images/cover.jpg" bind:value={image} />
			</div>
		</div>
		<div class="fm-row">
			<div class="fm-field">
				<label>描述</label>
				<input type="text" placeholder="文章简介..." bind:value={description} />
			</div>
		</div>
		<div class="fm-toggles">
			<label><input type="checkbox" bind:checked={draft} /> 草稿</label>
			<label><input type="checkbox" bind:checked={pinned} /> 置顶</label>
			<label><input type="checkbox" bind:checked={comment} /> 允许评论</label>
		</div>
	</div>

	<!-- Toolbar -->
	<div class="toolbar">
		<button title="粗体 (Ctrl+B)" onclick={insertBold}><strong>B</strong></button>
		<button title="斜体 (Ctrl+I)" onclick={insertItalic}><em>I</em></button>
		<button title="标题" onclick={insertHeading}>H</button>
		<button title="链接" onclick={insertLink}>🔗</button>
		<button title="图片" onclick={insertImage}>🖼️</button>
		<button title="行内代码" onclick={insertCode}>&lt;/&gt;</button>
		<button title="代码块" onclick={insertCodeBlock}>📋</button>
		<button title="引用" onclick={insertQuote}>❝</button>
		<button title="列表" onclick={insertList}>•</button>
		<button title="编号列表" onclick={insertNumberedList}>1.</button>
		<button title="分隔线" onclick={insertHorizontalRule}>—</button>
		<span class="toolbar-divider"></span>
		<label class="upload-btn" title="上传图片 (可拖拽)">
			📤 {uploading ? "上传中..." : ""}
			<input type="file" accept="image/*" onchange={handleImageUpload} hidden />
		</label>
		<span class="toolbar-spacer"></span>
		<button
			class="preview-toggle"
			class:active={showPreview}
			onclick={() => (showPreview = !showPreview)}
		>
			{showPreview ? "✏️ 编辑" : "👁️ 预览"}
		</button>
	</div>

	<!-- Editor / Preview -->
	<div
		class="editor-content"
		ondragover={handleDragOver}
		ondrop={handleDrop}
	>
		{#if showPreview}
			<div class="preview-pane">
				{@html previewHtml}
			</div>
		{:else}
			<textarea
				bind:this={textareaRef}
				class="content-textarea"
				placeholder="开始写 Markdown 内容..."
				bind:value={content}
				onkeydown={(e) => {
					if ((e.ctrlKey || e.metaKey) && e.key === "s") {
						e.preventDefault();
						handleSave();
					}
				}}
			></textarea>
		{/if}
	</div>
</div>

<style>
	.editor {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	/* Header */
	.editor-header {
		padding: 16px 20px;
		border-bottom: 1px solid var(--border);
		background: var(--bg-secondary);
		flex-shrink: 0;
	}
	.editor-title-row {
		display: flex;
		gap: 12px;
		align-items: center;
		margin-bottom: 12px;
	}
	.title-input {
		flex: 1;
		padding: 10px 14px;
		font-size: 1.2rem;
		background: var(--bg-primary);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--text-primary);
		outline: none;
		font-weight: 600;
	}
	.title-input:focus { border-color: var(--accent); }
	.title-input::placeholder { color: var(--text-muted); font-weight: 400; }

	.btn-save {
		padding: 10px 24px;
		background: var(--accent);
		border: none;
		border-radius: var(--radius);
		color: white;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
	}
	.btn-save:hover { background: var(--accent-hover); }
	.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

	/* Frontmatter */
	.fm-row {
		display: flex;
		gap: 12px;
		margin-bottom: 8px;
		flex-wrap: wrap;
	}
	.fm-field {
		display: flex;
		flex-direction: column;
		gap: 3px;
		flex: 1;
		min-width: 120px;
	}
	.fm-field label {
		font-size: 0.7rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		font-weight: 500;
	}
	.fm-field input {
		padding: 6px 10px;
		font-size: 0.82rem;
		background: var(--bg-primary);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--text-primary);
		outline: none;
	}
	.fm-field input:focus { border-color: var(--accent); }

	.fm-toggles {
		display: flex;
		gap: 16px;
		align-items: center;
		font-size: 0.8rem;
		color: var(--text-secondary);
	}
	.fm-toggles label {
		display: flex;
		align-items: center;
		gap: 5px;
		cursor: pointer;
	}
	.fm-toggles input { accent-color: var(--accent); }

	/* Toolbar */
	.toolbar {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 6px 12px;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
		flex-wrap: wrap;
	}
	.toolbar button {
		padding: 5px 10px;
		background: none;
		border: 1px solid transparent;
		border-radius: 6px;
		color: var(--text-secondary);
		cursor: pointer;
		font-size: 0.82rem;
		white-space: nowrap;
	}
	.toolbar button:hover { background: var(--bg-hover); color: var(--text-primary); }
	.toolbar-divider {
		width: 1px;
		height: 20px;
		background: var(--border);
		margin: 0 4px;
	}
	.toolbar-spacer { flex: 1; }
	.upload-btn {
		padding: 5px 10px;
		font-size: 0.82rem;
		color: var(--accent);
		cursor: pointer;
		border-radius: 6px;
	}
	.upload-btn:hover { background: var(--bg-hover); }
	.preview-toggle { font-size: 0.82rem; }
	.preview-toggle.active { color: var(--accent); border-color: var(--accent) !important; }

	/* Content */
	.editor-content {
		flex: 1;
		overflow: hidden;
		display: flex;
	}
	.content-textarea {
		flex: 1;
		padding: 20px;
		background: var(--bg-primary);
		border: none;
		color: var(--text-primary);
		font-family: "JetBrains Mono", "Fira Code", monospace;
		font-size: 0.9rem;
		line-height: 1.7;
		resize: none;
		outline: none;
	}
	.content-textarea::placeholder { color: var(--text-muted); }

	/* Preview */
	.preview-pane {
		flex: 1;
		padding: 20px 30px;
		overflow-y: auto;
		line-height: 1.8;
	}
	.preview-pane :global(h1),
	.preview-pane :global(h2),
	.preview-pane :global(h3) {
		margin-top: 1.5em;
		margin-bottom: 0.5em;
	}
	.preview-pane :global(p) {
		margin-bottom: 1em;
	}
	.preview-pane :global(pre) {
		background: var(--bg-secondary);
		padding: 14px 18px;
		border-radius: 8px;
		overflow-x: auto;
		margin: 1em 0;
		font-size: 0.85rem;
	}
	.preview-pane :global(code) {
		font-family: "JetBrains Mono", monospace;
		font-size: 0.85em;
	}
	.preview-pane :global(blockquote) {
		border-left: 3px solid var(--accent);
		margin: 1em 0;
		padding: 8px 16px;
		color: var(--text-secondary);
		background: rgba(99,102,241,0.05);
	}
	.preview-pane :global(img) {
		max-width: 100%;
		border-radius: 8px;
		margin: 1em 0;
	}
	.preview-pane :global(a) {
		color: var(--accent);
	}
	.preview-pane :global(ul), .preview-pane :global(ol) {
		padding-left: 1.5em;
		margin: 0.5em 0;
	}
	.preview-pane :global(table) {
		border-collapse: collapse;
		width: 100%;
		margin: 1em 0;
	}
	.preview-pane :global(th),
	.preview-pane :global(td) {
		border: 1px solid var(--border);
		padding: 8px 12px;
		text-align: left;
	}
	.preview-pane :global(th) {
		background: var(--bg-secondary);
	}
	.preview-pane :global(hr) {
		border: none;
		border-top: 1px solid var(--border);
		margin: 2em 0;
	}
</style>
