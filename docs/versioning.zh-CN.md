# JSRay 版本管理

[English](versioning.md) · **简体中文**

JSRay Core 采用单项目版本号。平台插件在各自仓库里维护自己的版本文件。

当前版本:`0.0.2-beta.1`
当前通道:`beta`
公开测试版已发布:是

JSRay Core 是独立的 JavaScript 原生代码渲染内核。平台插件(包括 WordPress 插件)是独立仓库，它们消费并捆绑 Core。

内部测试版本可以私下分享，但不应对外描述为公开测试版。

## 通道

| 通道 | 格式 | 含义 |
|---|---|---|
| 内部版 | `0.0.1-internal.N` | 公开 beta 之前的私有测试构建。 |
| 公开测试版 | `0.0.P-beta.N` | 对外发布的公开测试构建。 |
| 稳定版 | `0.1.0` | 稳定的公开发布。 |

### 版本阶梯

每个 beta 递增**补丁号**;后面那个计数器保留,一是 `check:versions` 强制要求,
二是排序用的是 `version_compare()` —— 字符串排序会把 `0.0.10` 排在 `0.0.2` 前面。

```
0.0.1-beta.1 … 0.0.1-beta.5 → 0.0.2-beta.1 → 0.0.3-beta.1 → …… → 0.1.0
```

`0.0.1` 这条线在 beta.5 结束。`0.1.0` 才是脱掉 beta 标签的地方,因此 `0.0.1`
永远不会作为稳定版发布 —— 阶梯直接走过它。

各集成走同样的台阶,但**记法不同**。Core 保留计数器,是因为它的 beta 在同一个
补丁号**之内**迭代 —— `0.0.1-beta.1` 到 `0.0.1-beta.5` 是同一个补丁号的五次发布。
集成每发一版就换补丁号,那个计数器永远是 1、不承载信息,所以 `jsray-wp` 走的是
`0.0.1-beta → 0.0.2-beta → …… → 0.1.0`。两种记法在 `version_compare()` 下都排序
正确 —— 而那正是 WordPress 判断"是否有新版本"所用的函数。

真正所有仓库共用的,是"集成主版本号 = 内置 Core 主版本号"这条规矩,它让每一个
集成在 Core 走到 `0.1.0` 之前都停在 `0.x`。

## 规则

1. `version.json` 是 Core 发布通道的权威摘要。
2. `package.json` 与 `tokens.json` 跟随 Core 版本。
3. 平台插件的版本在各自仓库中，可以与 Core 版本不同。
4. Core 的内部构建保持 `package.json` 中的 `"private": true`，防止误发到 npm。
5. 提交版本变更前先运行 `npm run check:versions`。

## 晋级

当 Core 准备好首个公开测试版时：

1. 把 `version.json` 的版本改为 `0.0.1-beta.1`、`channel` 改为 `beta`。
2. 只有确实要发 npm 时，才移除 `package.json` 里的 `"private": true`。
3. 把 README 徽章与 changelog 的状态从内部测试更新为公开测试版。

## npm 发布

包以 [`@jsray/core`](https://www.npmjs.com/package/@jsray/core) 发布。无作用域的
`jsray` 拿不到 —— npm 判定它与已有的 `js-ray` 过于相似而拒绝 —— 而 `@jsray`
作用域的好处是一次性把整个家族(`@jsray/wp`、`@jsray/vscode`、`@jsray/terminal`)
都占住。

| 通道 | npm 命令 | 用户安装方式 |
|---|---|---|
| beta | `npm publish --tag beta` | `npm install @jsray/core@beta` |
| stable | `npm publish` | `npm install @jsray/core` |

带作用域的包默认是受限访问；`package.json` 里的 `publishConfig.access: "public"`
让每次发布都保持公开，不必额外加参数。

预发布版本发在 `beta` 标签下，这样它永远不会把稳定版从默认安装的位置上挤掉。

**但 1.0 之前根本没有稳定版可挤,** 而 `latest` 必须指向某个版本 —— 无论有没有
人做决定，npm 都会给它挑一个。此时"不去动它"并不等于"没有默认版本"，而是默认
版本被冻结在最早占住这个标签的那个预发布版上。beta.2 到 beta.3 之间发生的正是
这件事:`npm install @jsray/core`（README 里教的那条命令）一直装的是
0.0.1-beta.2 —— 比当前发布版更旧，而且带着一个拒绝服务漏洞 —— 修复只在
`@beta` 里。

所以：只要 registry 上还不存在稳定版，`tools/release.sh` 就会把 `latest` 一并
指向最新的预发布版。它查的是 registry 而不是某个开关，因此 1.0 发布的那一刻
这个行为会自动结束：从此 `latest` 归稳定版所有，预发布版再也拿不回去。

`package.json` 在晋级 beta 时去掉 `"private": true` —— `check:versions` 只在
internal 通道上强制该标记。

发布内容由 `files` 数组决定：`dist/`、`types/`、`tokens.json`、
`vocabulary.json`、`integrity.json`、`assets/brand`、README、LICENSE、CHANGELOG。
后面两个 JSON 不是可有可无的 —— 集成用 `vocabulary.json` 校验用户的自定义
调色板，用 `integrity.json` 验证自己捆绑的 Core 快照是否为官方构建。少发其中
任何一个，都会在不影响本仓库的情况下把集成搞坏。`tests/contract.test.mjs` 会断言
这两个文件仍在包里；`npm pack --dry-run` 可以看到完整清单。
