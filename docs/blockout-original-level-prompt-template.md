# Block Out 原创关卡 Prompt 模板

此模板只用于生成本项目 `LevelSpec` 结构的候选关卡。竞品数据只提供难度目标和机制节奏，不得复制竞品棋盘坐标、色块轮廓组合、出口位置、名称或文案。

## 输入

```json
{
  "level_id": 1,
  "chapter": 1,
  "chapter_position": 1,
  "target_difficulty": 18,
  "target_components": {
    "buffer_tightness": 0.20,
    "hidden_information": 0.00,
    "mechanism_diversity": 0.14,
    "exit_competition": 0.25
  },
  "allowed_mechanics": ["irregular-board"],
  "visible_block_range": [2, 5],
  "time_seconds": 180,
  "seed": "blockout-ch01-lv001-v1"
}
```

## 生成指令

你是 Block Out 关卡生成器。生成一个原创、可执行的 `LevelSpec` JSON 对象，并满足以下要求：

1. 色块是正交网格上的刚体，只能整体平移，不能旋转、拆分或穿过其他色块。
2. 每个清除阶段都必须存在同色出口；出口跨度必须容纳对应色块在该边方向上的完整投影。
3. 棋盘外形由 `playable` 明确定义；`blocked` 保持为空。难度来自外轮廓、可移动色块、出口与临时机制，不用内部永久墙制造假难度。
4. 先构造一个明确可清空的终局与清除顺序，再只使用可逆的合法平移逆向打乱开局。把这条已知解作为 `solution_witness` 一并输出。
5. 难度按 `blockout-d1` 计算：

   `D = 100 × (0.35×缓冲紧张度 + 0.20×隐藏信息 + 0.20×机制多样性 + 0.25×出口竞争)`

6. 候选分数应落在目标值 ±5；超出时只调整一项主变量，重新求解后再评分。
7. 普通关至少保留一个可读起手；困难关允许共享通道竞争；超难关可以叠加阶段机制，但开局不能完全无合法移动。
8. 新机制首秀关只教学一个新变量，使用普通难度和 180 秒；下一关再与旧机制组合。
9. 名称必须描述本关真实机制或空间课题，不得复用已有名称。
10. 输出前执行原创性门禁：忽略名称、ID 和颜色后，与既有关卡的旋转、镜像规范签名也不得相同。

## 输出结构

```json
{
  "candidate": {
    "id": 1,
    "name": "原创名称",
    "difficulty": "normal",
    "timeSeconds": 180,
    "reward": 20,
    "parMoves": 4,
    "width": 7,
    "height": 8,
    "playable": [[0, 0]],
    "blocked": [],
    "gates": [],
    "blocks": [],
    "shutters": [],
    "elevators": [],
    "conveyors": []
  },
  "solution_witness": [],
  "generation_evidence": {
    "seed": "blockout-ch01-lv001-v1",
    "target_score": 18,
    "calculated_score": 17.6,
    "canonical_layout_signature": "sha256-or-canonical-string"
  }
}
```

## 拒收条件

- 求解器没有返回完整清除路线，或路线回放失败。
- 仅因搜索达到状态上限而返回“未判定”。
- 色块缺少同色出口、出口跨度不足、开局重叠、色块越出 `playable`。
- 通过换色、改名、镜像或旋转已有布局来伪装成新关。
- 从竞品截图复制坐标、轮廓或出口排布。
- 难度标签与实际计时、机关和求解路径不一致。
