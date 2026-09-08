# 原创关卡求解报告

输入：`deliverables\original-levels\blockout-original-levels-101-120-completed.json`  
关卡：101–101  
算法：宏动作内部 BFS + 外层 A*；最少步数按逐格平移计。完整规则见 [original-levels-solver-rules.md](../../../docs/original-levels-solver-rules.md)。

| level_id | 可解性 | 求解步数 | 估算耗时(s) | expected(s) | 偏差(s) |
|---:|---|---:|---:|---:|---:|
| 101 | 未判定 | — | — | 11 | — |

## 不可解、配置错误或未判定

- **Level 101**：达到 10000 状态上限；当前最好状态已清除 8/11 块；卡死状态 -1,-1|0,4|-1,-1|-1,-1|2,3|-1,-1|-1,-1|-1,-1|-1,-1|-1,-1|3,4
