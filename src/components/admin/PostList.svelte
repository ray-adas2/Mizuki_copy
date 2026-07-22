<script>
	let { posts = [], selectedSlug = null, onSelect, onDelete } = $props();

	let search = $state("");
	let filterDraft = $state(false);

	let filteredPosts = $derived(
		posts.filter((p) => {
			if (filterDraft && !p.frontmatter.draft) return false;
			if (!search) return true;
			const q = search.toLowerCase();
			const title = (p.frontmatter.title || "").toLowerCase();
			const desc = (p.frontmatter.description || "").toLowerCase();
			const tags = (p.frontmatter.tags || []).join(" ").toLowerCase();
			const cat = (p.frontmatter.category || "").toLowerCase();
			return (
				title.includes(q) ||
				desc.includes(q) ||
				tags.includes(q) ||
				cat.includes(q)
			);
		}),
	);

	function statusIcon(fm) {
		if (fm.draft) return "📄";
		if (fm.pinned) return "📌";
		return "📝";
	}
</script>

<div class="post-list">
	<!-- Search & filter -->
	<div class="list-header">
		<input
			type="text"
			class="search-input"
			placeholder="搜索文章..."
			bind:value={search}
		/>
		<label class="filter-draft">
			<input type="checkbox" bind:checked={filterDraft} />
			<span>仅草稿</span>
		</label>
	</div>

	<!-- Post items -->
	<div class="list-items">
		{#if filteredPosts.length === 0}
			<div class="no-posts">
				{search ? "没有匹配的文章" : "还没有文章"}
			</div>
		{:else}
			{#each filteredPosts as post (post.slug)}
				<div
					class="post-item"
					class:active={post.slug === selectedSlug}
					role="button"
					tabindex="0"
					onclick={() => onSelect?.(post.slug)}
					onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(post.slug); } }}
				>
					<div class="post-item-main">
						<span class="post-icon">{statusIcon(post.frontmatter)}</span>
						<div class="post-info">
							<span class="post-title">{post.frontmatter.title || "(无标题)"}</span>
							<span class="post-meta">
								{post.frontmatter.published || "?"}
								{#if post.frontmatter.category}
									· {post.frontmatter.category}
								{/if}
								{#if post.frontmatter.draft}
									<span class="badge-draft">草稿</span>
								{/if}
								{#if post.frontmatter.pinned}
									<span class="badge-pin">置顶</span>
								{/if}
							</span>
						</div>
					</div>
					<button
						class="btn-delete"
						onclick={(e) => {
							e.stopPropagation();
							onDelete?.(post.slug);
						}}
						title="删除"
					>🗑️</button>
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.post-list {
		display: flex;
		flex-direction: column;
		height: 100%;
	}
	.list-header {
		padding: 12px;
		border-bottom: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.search-input {
		width: 100%;
		padding: 8px 12px;
		background: var(--bg-primary);
		border: 1px solid var(--border);
		border-radius: 8px;
		color: var(--text-primary);
		font-size: 0.85rem;
		outline: none;
	}
	.search-input:focus {
		border-color: var(--accent);
	}
	.search-input::placeholder {
		color: var(--text-muted);
	}
	.filter-draft {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.78rem;
		color: var(--text-muted);
		cursor: pointer;
	}
	.filter-draft input { accent-color: var(--accent); }

	.list-items {
		flex: 1;
		overflow-y: auto;
	}
	.no-posts {
		padding: 32px 16px;
		text-align: center;
		color: var(--text-muted);
		font-size: 0.85rem;
	}

	.post-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 12px 14px;
		background: none;
		border: none;
		border-bottom: 1px solid rgba(42,42,58,0.3);
		color: var(--text-primary);
		cursor: pointer;
		text-align: left;
		transition: background 0.1s;
	}
	.post-item:hover { background: var(--bg-hover); }
	.post-item.active { background: rgba(99,102,241,0.1); border-left: 3px solid var(--accent); }

	.post-item-main {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		flex: 1;
		min-width: 0;
	}
	.post-icon { font-size: 1rem; flex-shrink: 0; margin-top: 1px; }
	.post-info {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
	}
	.post-title {
		font-size: 0.88rem;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.post-meta {
		font-size: 0.72rem;
		color: var(--text-muted);
		display: flex;
		gap: 4px;
		align-items: center;
		flex-wrap: wrap;
	}
	.badge-draft, .badge-pin {
		font-size: 0.65rem;
		padding: 1px 6px;
		border-radius: 4px;
	}
	.badge-draft { background: rgba(245,158,11,0.2); color: var(--warning); }
	.badge-pin { background: rgba(99,102,241,0.2); color: var(--accent); }

	.btn-delete {
		background: none;
		border: none;
		font-size: 0.85rem;
		cursor: pointer;
		opacity: 0;
		transition: opacity 0.15s;
		padding: 4px;
		flex-shrink: 0;
	}
	.post-item:hover .btn-delete { opacity: 0.6; }
	.btn-delete:hover { opacity: 1 !important; }
</style>
