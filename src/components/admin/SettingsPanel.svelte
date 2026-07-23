<script>
	let loading = $state(true);
	let saving = $state(false);
	let values = $state({});
	let fields = $state([]);
	let message = $state("");
	let aboutContent = $state("");
	let aboutSaving = $state(false);
	let aboutMsg = $state("");

	async function loadConfig() {
		loading = true;
		try {
			const res = await fetch("/api/admin/config");
			const data = await res.json();
			fields = data.fields || [];
			values = data.values || {};
		} catch { message = "加载失败"; }
		finally { loading = false; }
	}

	async function saveConfig() {
		saving = true; message = "";
		try {
			const res = await fetch("/api/admin/config", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(values),
			});
			const data = await res.json();
			if (data.ok) {
				message = "✅ 设置已保存！请点击右上角「发布更新」重建网站";
			} else {
				message = "❌ 保存失败: " + (data.error || "");
			}
		} catch { message = "❌ 网络错误"; }
		finally { saving = false; }
	}

	async function loadAbout() {
		try {
			const res = await fetch("/api/admin/about");
			const data = await res.json();
			aboutContent = data.content || "";
		} catch { aboutContent = ""; }
	}

	async function saveAbout() {
		aboutSaving = true; aboutMsg = "";
		try {
			const res = await fetch("/api/admin/about", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: aboutContent }),
			});
			const data = await res.json();
			aboutMsg = data.ok ? "✅ 关于页面已保存！请点右上角「发布更新」" : "❌ 保存失败: " + (data.error || "");
		} catch { aboutMsg = "❌ 网络错误"; }
		finally { aboutSaving = false; }
	}

	$effect(() => { loadConfig(); loadAbout(); });

	let { onNeedRebuild } = $props();
</script>

{#if loading}
	<div class="loading-screen"><div class="spinner"></div><p>加载设置...</p></div>
{:else}
	<div class="settings-panel">
		<!-- ===== Site Settings ===== -->
		<div class="section">
			<div class="section-header"><h3>🌐 站点设置</h3></div>
			<div class="field-grid">
				<div class="field">
					<label>站点标题</label>
					<input type="text" class="input" bind:value={values.title} placeholder="Mizuki" />
				</div>
				<div class="field">
					<label>副标题</label>
					<input type="text" class="input" bind:value={values.subtitle} placeholder="One demo website" />
				</div>
				<div class="field">
					<label>首页大标题</label>
					<input type="text" class="input" bind:value={values["banner.homeText.title"]} placeholder="わたしの部屋" />
				</div>
				<div class="field">
					<label>站点URL（以 / 结尾）</label>
					<input type="text" class="input" bind:value={values.siteURL} placeholder="https://mizuki.mysqil.com/" />
				</div>
				<div class="field">
					<label>语言</label>
					<select class="input" bind:value={values.lang}>
						<option value="zh_CN">中文</option>
						<option value="en">English</option>
						<option value="ja">日本語</option>
					</select>
				</div>
				<div class="field">
					<label>主题色 (色相 0-360)</label>
					<div class="hue-row">
						<input type="range" min="0" max="360" bind:value={values["themeColor.hue"]} class="hue-slider" />
						<span class="hue-val">{values["themeColor.hue"] || 240}°</span>
					</div>
				</div>
			</div>
		</div>

		<!-- ===== Profile Settings ===== -->
		<div class="section">
			<div class="section-header"><h3>👤 个人资料</h3></div>
			<div class="field-grid">
				<div class="field">
					<label>头像路径</label>
					<input type="text" class="input" bind:value={values.avatar} placeholder="assets/home/home.webp" />
				</div>
				<div class="field">
					<label>昵称</label>
					<input type="text" class="input" bind:value={values.name} placeholder="まつざか ゆき" />
				</div>
				<div class="field field-full">
					<label>个人简介</label>
					<input type="text" class="input" bind:value={values.bio} placeholder="写一行自我介绍..." />
				</div>
			</div>
		</div>

		<!-- 社交链接请直接编辑 src/config/profileConfig.ts 中的 links 数组 -->

		<!-- ===== About Page ===== -->
		<div class="section">
			<div class="section-header"><h3>📖 关于页面</h3></div>
			<p style="font-size:0.8rem;color:var(--atext2);margin-bottom:10px;">编辑「关于」页面的内容，支持 Markdown 语法</p>
			<textarea class="about-textarea" bind:value={aboutContent} placeholder="写一些自我介绍..."></textarea>
			{#if aboutMsg}<p class="msg" style="margin-top:6px;">{aboutMsg}</p>{/if}
		</div>

		<!-- Save -->
		<div class="section">
			<button class="btn-save" onclick={() => { saveConfig(); saveAbout(); }} disabled={saving}>
				{saving ? "⏳ 保存中..." : "💾 保存设置"}
			</button>
			{#if message}<p class="msg">{message}</p>{/if}
		</div>
	</div>
{/if}

<style>
	.settings-panel { padding-bottom: 40px; }
	.section { padding: 20px 24px; border-bottom: 1px solid var(--aborder, #e8e8ef); }
	.section-header { margin-bottom: 14px; }
	.section-header h3 { font-size: 0.9rem; font-weight: 700; }
	.field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
	.field { display: flex; flex-direction: column; gap: 4px; }
	.field-full { grid-column: 1 / -1; }
	.field label {
		font-size: 0.72rem; font-weight: 600; color: var(--atext2, #6b6b80);
		text-transform: uppercase; letter-spacing: 0.5px;
	}
	.input {
		padding: 8px 12px; border: 1px solid var(--aborder, #e8e8ef);
		border-radius: var(--arad-sm, 8px); font-size: 0.85rem;
		background: var(--asurf, #fff); color: var(--atext, #1a1a2e);
		outline: none; font-family: inherit; width: 100%;
	}
	.input:focus { border-color: var(--apri, #6366f1); }
	.hue-row { display: flex; align-items: center; gap: 10px; }
	.hue-slider { flex: 1; accent-color: var(--apri, #6366f1); }
	.hue-val { font-size: 0.85rem; font-weight: 600; color: var(--apri, #6366f1); min-width: 40px; }
	.btn-save {
		padding: 10px 24px; background: var(--apri, #6366f1); color: white;
		border: none; border-radius: var(--arad-sm, 8px); font-size: 0.9rem;
		font-weight: 600; cursor: pointer; font-family: inherit;
	}
	.btn-save:hover { background: #5558e6; }
	.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
	.msg { margin-top: 10px; font-size: 0.85rem; color: var(--atext2, #6b6b80); }
	.loading-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 16px; color: var(--atext2); }
	.spinner { width: 36px; height: 36px; border: 3px solid var(--aborder); border-top-color: var(--apri); border-radius: 50%; animation: spin .7s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }
	.about-textarea {
		width: 100%; min-height: 250px; padding: 12px 14px;
		border: 1px solid var(--aborder, #e8e8ef); border-radius: var(--arad-sm, 8px);
		font-size: 0.85rem; font-family: "JetBrains Mono", monospace;
		background: var(--asurf, #fff); color: var(--atext, #1a1a2e);
		outline: none; resize: vertical; line-height: 1.7;
	}
	.about-textarea:focus { border-color: var(--apri, #6366f1); }
	.about-textarea::placeholder { color: var(--atext3, #9b9bb0); }
</style>
