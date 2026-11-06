# Changelog

本文件记录 knowledge-animation-video 的版本变更。
每次推送 GitHub 都会打一个新 tag，版本号与 SKILL.md 的 `metadata.version` 一致。

## v1.2.0 · 2026-11-06

- docs: README 与 SKILL.md 明确「每次推送必打新 tag」的发布约定
- fix: release.py 解析符号链接，分发包正确输出到物理目录；推送前自动 fetch+rebase

## v1.1.0 · 2026-11-06

- feat: 补充作者署名信息（frontmatter metadata、32 个源文件版权头、各组件 README）
- feat: 新增 tools/release.py 一键发布脚本，每次推送自动打新 tag
- docs: 新增 CHANGELOG.md

