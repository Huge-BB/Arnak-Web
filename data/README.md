# 研究轨人工数据录入说明

本目录里人工维护两份研究轨数据：

- `research-manual-data.json`：路线费用、路线限制、特殊层级修正、神庙到达分。
- `research-rewards-manual.json`：放大镜 / 书本到达研究行时获得的固定奖励。

自动生成的节点 ID、路线 `from/to` 不要自行改名。实体版图与自动拓扑不一致时，保留现状并单独标记。

## 1. 通用字段

### `verified`

人工对照版图确认后改成：

```json
"verified": true
```

未确认保持 `false`。

### 研究标记

| JSON | 含义 |
|---|---|
| `magnifying` | 放大镜 |
| `journal` | 书本 / 日志本 |

---

## 2. `research-manual-data.json`

### 2.1 普通资源费用 `cost`

| JSON | 游戏资源 |
|---|---|
| `coin` | 金币 |
| `compass` | 罗盘 |
| `tablet` | 石板 |
| `arrowhead` | 箭头 |
| `jewel` | 宝石 |
| `usableIdol` | 一个仍可用、未放进神像奖励槽的神像 |

没有用到的资源不要写 `0`。

```json
"cost": {
  "coin": 1,
  "tablet": 2
}
```

蛇庙支付一个可用神像：

```json
"cost": {
  "usableIdol": 1
}
```

`usableIdol` 只能使用尚未放入 idol slot 的神像；支付后移出游戏。

### 2.2 猴庙交通费用

交通费用写在 `cost.travel`：

| JSON | 图标 |
|---|---|
| `boot` | 步行 |
| `car` | 汽车 |
| `boat` | 船 |
| `plane` | 飞机 |

```json
"cost": {
  "travel": {
    "boat": 1
  }
}
```

```json
"cost": {
  "travel": {
    "car": 1,
    "boot": 1
  }
}
```

玩家实际支付时从手牌选择旅行图标，引擎按交通替代规则校验。

### 2.3 路线限制 `allowedTokens`

省略该字段表示两种研究标记都可以走。

仅放大镜：

```json
"allowedTokens": ["magnifying"]
```

仅书本：

```json
"allowedTokens": ["journal"]
```

猴庙左右支路的单 token 限制在这里填写。

### 2.4 神庙到达分 `templeArrivalPoints`

每张研究板单独填写：

```json
"templeArrivalPoints": [第一名, 第二名, 第三名, 第四名]
```

不要从其他神庙推断。

### 2.5 `nodeOverrides`

只处理“一个实体格跨两个逻辑层级”之类的特殊情况。

```json
{
  "node": "example:r4:p1",
  "researchLevel": 5,
  "spansLevels": [4, 5],
  "verified": true
}
```

---

## 3. `research-rewards-manual.json`

### 3.1 当前基础 / 一扩：按行录奖励

Bird、Snake、Monkey、Lizard 同一研究行的不同路线格奖励相同，因此模板按：

```text
row × token
```

录入。

例如：

```json
{
  "row": "bird:r0",
  "token": "magnifying",
  "rewards": [],
  "verified": false
}
```

对应书本：

```json
{
  "row": "bird:r0",
  "token": "journal",
  "rewards": [],
  "verified": false
}
```

你只填写 `rewards`，确认后改 `verified: true`。

行级奖励会自动应用到该行的全部路线节点，例如 `bird:r3` 会覆盖 `bird:r3:p0 / p1 / p2`。

### 3.2 节点级覆盖：留给同行不同格奖励

以后蜘蛛庙等出现“同一行不同格奖励不同”的情况，使用 `node`：

```json
{
  "node": "spider:r3:p1",
  "token": "magnifying",
  "rewards": [
    { "type": "GAIN_RESOURCE", "resource": "jewel", "amount": 1 }
  ],
  "verified": true
}
```

查询规则：

```text
节点级奖励 > 行级奖励 > 无固定奖励
```

同一条记录只能写 `row` 或 `node` 其中一个，不能同时写。

---

## 4. 奖励类型

### `GAIN_RESOURCE` 获得资源

支持 `coin / compass / tablet / arrowhead / jewel`。

```json
{
  "type": "GAIN_RESOURCE",
  "resource": "compass",
  "amount": 1
}
```

多个资源直接写多个 reward：

```json
"rewards": [
  { "type": "GAIN_RESOURCE", "resource": "coin", "amount": 1 },
  { "type": "GAIN_RESOURCE", "resource": "tablet", "amount": 1 }
]
```

### `DRAW_CARD` 抽牌

```json
{ "type": "DRAW_CARD", "amount": 1 }
```

### `GAIN_FEAR_CARD` 获得恐惧牌

将对应数量的基础恐惧牌置入玩家弃牌堆。

```json
{ "type": "GAIN_FEAR_CARD", "amount": 1 }
```

### `CLAIM_ASSISTANT` 获得银助手

```json
{ "type": "CLAIM_ASSISTANT", "level": "silver" }
```

### `UPGRADE_ASSISTANT` 升级助手

```json
{ "type": "UPGRADE_ASSISTANT", "level": "gold" }
```

### `REFRESH_ASSISTANTS` 重置助手

全部重置：

```json
{ "type": "REFRESH_ASSISTANTS", "amount": "all" }
```

固定数量：

```json
{ "type": "REFRESH_ASSISTANTS", "amount": 1 }
```

数值数量会要求玩家明确选择相同数量、且彼此不同的助手；`"all"` 则直接重置全部助手。

### `UPGRADE_AND_REFRESH_ASSISTANT` 升级并重置助手

```json
{ "type": "UPGRADE_AND_REFRESH_ASSISTANT", "level": "gold" }
```

玩家选择一名自己的银助手，将其升级为金助手，并立刻重置同一名助手。

### `ACQUIRE_ARTIFACT_FREE` 免费获得神器

```json
{ "type": "ACQUIRE_ARTIFACT_FREE" }
```

需要玩家从当前神器市场选择。

### `OVERCOME_GUARDIAN_FREE` 免费击败守卫

Bird 研究轨存在该奖励：

```json
{ "type": "OVERCOME_GUARDIAN_FREE" }
```

这是需要选择合法守卫目标的奖励。研究奖励层先生成结构化 pending，最终击败结算复用统一守卫规则。

### `ACTIVATE_DISCOVERED_LEVEL1_SITE` 触发已探索一级地点

```json
{ "type": "ACTIVATE_DISCOVERED_LEVEL1_SITE" }
```

### `ACTIVATE_VISIBLE_SILVER_ASSISTANT_THEN_BOTTOM` 触发供应堆银助手并沉底

```json
{ "type": "ACTIVATE_VISIBLE_SILVER_ASSISTANT_THEN_BOTTOM" }
```

### `BONUS_TILE` 随机研究奖励板块

```json
{ "type": "BONUS_TILE" }
```

普通情况下无需手录，位置会从 TTS 自动提取，实际奖励在 setup 时随机确定。

### `CHOOSE` 多选一

例如获得助手 / 升级助手二选一：

```json
{
  "type": "CHOOSE",
  "count": 1,
  "options": [
    { "type": "CLAIM_ASSISTANT", "level": "silver" },
    { "type": "UPGRADE_ASSISTANT", "level": "gold" }
  ]
}
```

### `SEQUENCE` 顺序执行

只有效果明确要求顺序时使用：

```json
{
  "type": "SEQUENCE",
  "rewards": [
    { "type": "GAIN_RESOURCE", "resource": "coin", "amount": 1 },
    { "type": "DRAW_CARD", "amount": 1 }
  ]
}
```

普通同时获得多个效果，直接在外层 `rewards` 写多项。

### `TEMPLE_SPECIAL` 暂未正式建模的神庙效果

```json
{
  "type": "TEMPLE_SPECIAL",
  "code": "SOME_EXPLICIT_SPECIAL_RULE",
  "data": {}
}
```

只用于 README 中尚无明确类型的新机制。

---

## 5. 当前四轨特殊机制

### Bird

- 普通五资源研究费用。
- 放大镜 / 书本奖励分开。
- 存在 `OVERCOME_GUARDIAN_FREE` 免费击败守卫奖励。

### Snake

- `usableIdol`：支付一个尚未使用的神像。
- `GAIN_FEAR_CARD`：获得恐惧牌。
- `ACQUIRE_ARTIFACT_FREE`：免费获得神器。

### Monkey

- `cost.travel`：交通符号费用。
- `allowedTokens`：部分路线仅允许放大镜或书本。
- `REFRESH_ASSISTANTS`：重置双助手。
- `CHOOSE`：获得助手 / 升级助手二选一。
- `ACTIVATE_DISCOVERED_LEVEL1_SITE`：触发已探索一级地点。
- `ACTIVATE_VISIBLE_SILVER_ASSISTANT_THEN_BOTTOM`：触发供应堆顶银助手后沉底。
- `BUY_ARTIFACT_WITH_DISCOUNT`：选择市场中的神器，以给定指南针折扣购买并补充神器行。
- `BURN_UNOCCUPIED_LEVEL1_SITE_REFILL_IDOL`：选择一个没有考古学家的已探索一级地点，触发、烧毁该地点，并在其位置补上一枚正面神像。
- 轨道神器由 Monkey temple plugin 管理，不重复写成普通行奖励。

### Lizard

- 轨道怪物阻挡与击败由 Lizard temple plugin 管理。
- “触发并烧毁一级地点及其守卫”属于 Lizard 专属动作。

---

## 6. 录入约定

1. 不修改自动生成的 `from / to / node`。
2. topology 文件只写费用、路线限制、层级修正、到达分。
3. rewards 文件只写奖励。
4. 当前基础 / 一扩优先使用 `row`；只有同行不同格奖励才使用 `node`。
5. 放大镜和书本永远分开填写。
6. 核对后才设 `verified: true`。
7. 新图标或新机制没有对应字段时保持空并说明，不自行创造字段。

校验：

```bash
cd web
npm run validate:research
npm test
```
