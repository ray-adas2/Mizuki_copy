<script>
	let { posts = [], selectedSlug = null, onSelect, onDelete } = $props();
	let search = $state("");
	let filterDraft = $state(false);

	let filteredPosts = $derived(
		posts.filter(p => {
			if (filterDraft && !p.frontmatter.draft) return false;
			if (!search) return true;
			const q = search.toLowerCase();
			return [p.frontmatter.title, p.frontmatter.description, (p.frontmatter.tags||[]).join(" "), p.frontmatter.category]
				.some(s => (s||"").toLowerCase().includes(q));
		}),
	);
</script>

<div class="post-list">
	<div class="search-box">
		<span class="search-icon">🔍</span>
		<input type="text" placeholder="搜索文章标题、标签、分类..." bind:value={search} />
		{#if search}<button class="search-clear" onclick={() => search = ""}>✕</button>{/if}
	</div>
	<div class="filter-row">
		<button class="filter-chip" class:active={!filterDraft} onclick={() => filterDraft = false}>全部 ({posts.length})</button>
		<button class="filter-chip" class:active={filterDraft} onclick={() => filterDraft = true}>草稿 ({posts.filter(p => p.frontmatter.draft).length})</button>
	</div>
	<div class="list-scroll">
		{#if filteredPosts.length === 0}
			<div class="empty-list"><span class="empty-icon">{search ? "🔍" : "📭"}</span><p>{search ? "没有匹配的文章" : "还没有文章"}</p></div>
		{:else}
			{#each filteredPosts as post (post.slug)}
				<div class="post-card" class:active={post.slug === selectedSlug} role="button" tabindex="0"
					onclick={() => onSelect?.(post.slug)}
					onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(post.slug); } }}>
					<div class="post-card-top">
						<span class="post-status-icon">{post.frontmatter.pinned ? "📌" : post.frontmatter.draft ? "📄" : "📝"}</span>
						<div class="post-card-info">
							<div class="post-card-title">{post.frontmatter.title || "(无标题)"}</div>
							<div class="post-card-meta">
								<span>{post.frontmatter.published || "?"}</span>
								{#if post.frontmatter.category}<span class="meta-cat">{post.frontmatter.category}</span>{/if}
							</div>
						</div>
					</div>
					<div class="post-card-badges">
						{#if post.frontmatter.draft}<span class="tag tag-draft">草稿</span>{/if}
						{#if post.frontmatter.pinned}<span class="tag tag-pin">置顶</span>{/if}
					</div>
					<button class="post-delete" onclick={(e) => { e.stopPropagation(); onDelete?.(post.slug); }} title="删除">🗑️</button>
				</div>
			{/each}
		{/if}
	</div>
</div>
