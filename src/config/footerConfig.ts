import type { FooterConfig } from "../types/config";
// 页脚配置
export const footerConfig: FooterConfig = {
	enable: true,
	customHtml: `<div style="display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;font-size:0.85rem;color:var(--text-secondary);padding:8px 0;">
		<a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" style="color:inherit;text-decoration:none;">鄂ICP备2026038750号-1</a>
		<a href="https://beian.mps.gov.cn/#/query/webSearch?code=42130202448248" rel="noreferrer" target="_blank" style="color:inherit;text-decoration:none;display:inline-flex;align-items:center;gap:4px;">
			<img src="/images/beian.png" alt="" style="height:16px;vertical-align:middle;" />鄂公网安备42130202448248号
		</a>
	</div>`,
};
