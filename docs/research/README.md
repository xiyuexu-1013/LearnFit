# LearnFit 科研资料索引

`legacy/` 保存 LearnFit 从 Python + WebSocket 科研原型到纯前端产品的完整代码演进证据。

## 已归档资料

- `legacy/backend/`：原始 MediaPipe、EAR、眨眼检测、注意力评分与 WebSocket 后端
- `legacy/main.py`：原始视觉管线主入口
- `legacy/dashboard_original.html`：原始科研仪表板
- `legacy/README_original.md`：原始研究背景、假设与实验说明
- `legacy/demo/`、`legacy/core/`、`legacy/extension/`：仓库中已有的早期前端产品化探索

## 预期科研文档

任务中提到以下资料，但它们不在本次收到的本地仓库中，GitHub `main` 分支也未包含这些文件，因此没有创建伪造副本：

- `有方-科研竞赛培养方案(1).pdf` → 计划归档为 `legacy/docs/research_plan.pdf`
- `hw1_Jun7.docx` → 方法论研究
- `net1.docx` → 参数优化实验设计

获得原文件后，请将其放入 `legacy/docs/`。它们将与现有代码共同构成 LearnFit 从科研原型到产品化版本的完整演进证据。

## 真实用户测试（v0.7 / 扩展 v1.2.0）

- 所有学习会话只累计无标识符的开始/完成总数；不会为这一层保存测试者或会话 ID、分数、时长或回答。
- 用户完成网页或 Chrome 扩展学习后，可自愿填写约 5 分钟匿名测评。
- 测评收集易用性、帮助程度、分数解释清晰度、再次使用意愿，以及两道开放题。
- 摄像头画面、眼动测量、学习任务、浏览记录和本地反思不会上传。
- Cloudflare D1 只保存明确同意后的匿名事件与反馈，12 个月后自动删除。
- 统计后台：<https://learnfit.pages.dev/admin>
- 后台密钥仅保存在项目根目录的 `.learnfit-admin-key`；该文件已被忽略，不会打进网站或插件包。
- 后台可导出 CSV，适合作为比赛的真实测试过程证据。请保留原始匿名反馈，不要修改成更“好看”的结果。
