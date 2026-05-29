# Goal 3 Input

/goal 接手comath-pi-lab项目,阅读并严格执行以下两份文档： 

1. `CoMath_Pi_Lab_No_Reinvent_Audit_2026-05-29.md`
2. `CoMath_Open_Formal_Workbench_GA_Design_2026-05-29.md`

目标：将当前 CoMath Pi Lab 从现有 alpha/vertical-slice 状态，多子agent协作, 大幅重构为开源 GA 级自动形式化数学研究工作台。
同个目录下还有给agent编排好的提示词.

硬性原则：

* 不要重复造轮子。
* CoMath 不实现自己的数学验证器、不自建通用定理库、不替代 Lean/mathlib。
* 数学正确性的唯一最终权威是 Lean4/mathlib kernel clean replay。
* CoMath 只负责：agent 调度、研究工作区、文献/工具接入、形式化任务规划、证据链、Lean 调用真实性、命题边界一致性、无作弊逃逸、最终门控审查。
* 优先复用维护良好的开源工具和外部接口：Lean/mathlib、Loogle、LeanSearch、Moogle、LeanDojo、arXiv、Semantic Scholar、OpenAlex、Crossref、Unpaywall、Jina Reader/Search、AnySearch 等。
* 外部论文、搜索、CAS/SMT/SAT、agent vote 只能作为 hint/evidence/refutation source，不能作为 proof authority。

开发任务：

1. 删除 toy/Nat-only production path、synthetic V1 winner、默认 `n : Nat` 等错误设计。
2. 实现 FormalSpecLock、AssumptionLedger、StatementDiffGate，确保命题边界不可漂移。
3. 实现真实 1 主 agent + 8 子 agent 工作流，并支持 stage-local 多候选/八变体生成、审查、投票、淘汰。
4. 实现 external wheel registry，用 adapter 方式接入 Lean theorem search、文献检索、PDF/TeX/Markdown ingestion、CAS/SMT/SAT 工具。
5. 实现 Lean Authority v3：per-candidate replay、final hermetic clean replay、pinned dependency、append-only replay manifest、provenance audit event。
6. 实现 DependencyClosureV2、LeanIntegrityScannerV2、AxiomProfileV2、No-Cheat Gate、Statement Drift Red Team。
7. 实现 Pi goal-mode：用户输入研究目标和附件/论文位置后，系统自动规划、创建 workspace、检索资料、拆 lemma、生成 Lean skeleton、运行 Lean、修复失败、红队审查，直到得到 terminal proof / counterexample / replayable blocker。
8. 将 MathProve-Skill 的流程原则内化为 CoMath native workflow，不再依赖外挂 skill。
9. 更新 README、架构文档、配置样例、agent prompt、GA acceptance tests 和 threat model。
10. 所有改动必须有测试，不能只改文档；优先交付可运行的端到端 proof research workflow。

完成标准：

* 任意 promoted proof artifact 必须能在 clean workspace 中由 Lean4/mathlib replay 通过。
* 所有 proof claim 都必须绑定 FormalSpecLock、dependency lock、toolchain hash、artifact hash、replay manifest。
* 没有 Lean clean replay 的产物只能标为 draft/hypothesis/candidate，不能标为 proven。
* 代码、文档、测试、CLI/Pi 交互体验必须达到可开源发布的 GA 质量。
