/* ============================================================
 * PCIe 6.0 学习系统 - 知识库数据
 * 结构：MODULES 定义模块，KNOWLEDGE 定义知识卡片
 * 卡片字段：id / module / title / tags / body / verify(验证要点)
 * body 支持极简格式：**粗体**、`代码`、- 列表项、空行分段
 * ============================================================ */

const GROUPS = [
  { id: 'pcie', name: 'PCIe 6.0', icon: '⚡' },
  { id: 'rdma', name: 'RDMA / RoCEv2', icon: '🌐' },
];

const MODULES = [
  { id: 'm1',  group: 'pcie', name: 'M1 PCIe 基础回顾',        desc: '分层模型 / TLP / 流控 / LTSSM / 枚举 / 排序' },
  { id: 'm2',  group: 'pcie', name: 'M2 PCIe 6.0 总览',         desc: '演进路线与四大技术支柱' },
  { id: 'm3',  group: 'pcie', name: 'M3 FLIT 机制',             desc: 'FLIT 结构 / 类型 / TLP 打包' },
  { id: 'm4',  group: 'pcie', name: 'M4 PAM4 信令',             desc: '四电平调制 / 格雷码 / 预编码' },
  { id: 'm5',  group: 'pcie', name: 'M5 FEC 与错误处理',        desc: 'RS 纠错码 / 双 CRC / First Retry' },
  { id: 'm6',  group: 'pcie', name: 'M6 电源管理',              desc: 'L0p / ASPM 回顾' },
  { id: 'm7',  group: 'pcie', name: 'M7 流控变化',              desc: 'FLIT 粒度流控 / 共享缓冲池' },
  { id: 'm8',  group: 'pcie', name: 'M8 均衡与链路训练',        desc: '均衡回顾 / PAM4 均衡 / 环回测试' },
  { id: 'm9',  group: 'pcie', name: 'M9 UIO 与 6.1 新特性',     desc: 'Unordered I/O / CXL 关联' },
  { id: 'm10', group: 'pcie', name: 'M10 验证重难点专题',       desc: '错误注入 / 覆盖率 / 断言 / 互操作 / 环境' },
  { id: 'm11', group: 'pcie', name: 'M11 参考资料',             desc: '规范 / 白皮书 / 文章 / 书籍' },
  { id: 'm12', group: 'pcie', name: 'M12 VIP 与验证实战',       desc: 'VIP 生态 / bring-up / 注错矩阵 / 集成经验' },
  { id: 'm13', group: 'pcie', name: 'M13 样片定位案例',         desc: 'debug 方法论 / 8 个典型失败模式案例' },
  { id: 'r1',  group: 'rdma', name: 'R1 RDMA 体系结构',         desc: 'IB/RoCE/iWARP / verbs 对象 / MR / Doorbell / CQ' },
  { id: 'r2',  group: 'rdma', name: 'R2 QP 状态机与传输类型',   desc: 'RC/UC/UD/XRC / 状态迁移 / RTR-RTS 属性 / 操作全集' },
  { id: 'r3',  group: 'rdma', name: 'R3 RoCEv2 报文格式',       desc: '封装 / BTH/DETH/扩展头 / Opcode / GRH / ICRC' },
  { id: 'r4',  group: 'rdma', name: 'R4 可靠传输与错误处理',    desc: 'PSN/ACK / Go-Back-N / RNR / 完成状态码' },
  { id: 'r5',  group: 'rdma', name: 'R5 无损网络与拥塞控制',    desc: 'PFC / 死锁与 headroom / ECN/CNP / DCQCN / ETS' },
  { id: 'r6',  group: 'rdma', name: 'R6 应用场景',              desc: 'AI 训练 / NVMe-oF / MPI / 云虚拟化 / IB 拓扑' },
  { id: 'r7',  group: 'rdma', name: 'R7 RDMA 验证专题',         desc: '环境架构 / 流量模型 / 注错矩阵 / 覆盖 / 性能 / 合规' },
  { id: 'r8',  group: 'rdma', name: 'R8 VIP 与实战',            desc: 'VIP 生态 / SoftRoCE 参考模型 / PCIe 协同 / 常见坑' },
  { id: 'r9',  group: 'rdma', name: 'R9 资料与工具',            desc: 'IBTA 规范 / rdma-core / perftest / SPDK' },
];

const KNOWLEDGE = [

/* ---------------- M1 基础回顾 ---------------- */
{
  id: 'k-m1-01', module: 'm1', title: '分层模型：TL / DL / PL',
  tags: ['分层', '架构'],
  body: [
    'PCIe 采用三层协议栈，自上而下：',
    '- **Transaction Layer（事务层）**：生成/接收 TLP，管理 VC/TC 映射、事务排序、流控发起端（根据 credit 决定能否发送）。',
    '- **Data Link Layer（数据链路层）**：负责 TLP 的可靠交付——加序列号和 LCRC、Ack/Nak 应答、Replay 重传缓冲管理、流控接收端（统计并返回 credit）。',
    '- **Physical Layer（物理层）**：加 Start/End 等帧定界、加扰码（scrambling）、编码（8b/10b 或 128b/130b）、并/串转换，以及链路训练（LTSSM）。',
    '',
    '验证视角：每层都有独立的错误检测与处理职责（ECRC/序列号+LCRC/物理层训练），监控组件通常按层拆分 checker。'
  ].join('\n'),
  verify: '按层设计 monitor/checker；检查扰码同步、帧定界合法组合（如 STP 后必须跟有效 TLP）。'
},
{
  id: 'k-m1-02', module: 'm1', title: 'TLP 基本格式与类型',
  tags: ['TLP', 'header', '3DW', '4DW'],
  body: [
    'TLP = Header（3 或 4 双字）+ 可选 Digest（ECRC，4B）+ 可选 Data Payload。',
    '- **4 大空间**：Memory（Rd/Wr）、IO、Configuration（Type 0/Type 1）、Messages。',
    '- **3DW Header**：用于不带地址高位的 32 位 Memory 和 IO/Config 事务；**4DW Header** 用于 64 位地址 Memory 事务。',
    '- 关键字段：Fmt/Type、TC、Attr（Relaxed Ordering / No Snoop）、Length（以 DW 计，最大 1024 DW = 4KB）。',
    '- **Digest/ECRC**：端到端 CRC，由 RC 或最终 EP 校验，中间节点不检查。',
    '',
    '消息（Message）TLP 无地址，用路由型 Code 路由，如 INTx 中断模拟、错误消息、热插拔事件等。'
  ].join('\n'),
  verify: '构造非法 Fmt/Type 组合、Length 与实际 payload 不符、4KB 边界读，检查协议违规报告与 ECRC 错误隔离（ECRC 错不影响链路层重传）。'
},
{
  id: 'k-m1-03', module: 'm1', title: '流控（Flow Control）机制',
  tags: ['流控', 'credit', 'FC'],
  body: [
    '发送方只有在收到足够 credit 后才能发对应类型的 TLP，防止接收缓冲溢出。',
    '- **三类独立 credit**：Posted（如 MemWr）、Non-Posted（如 MemRd、CfgRd）、Completion，各按 header 与 data 分开计数。',
    '- 初始化：链路训练后交换 InitFC1/InitFC2 DLLP；运行期用 UpdateFC DLLP 归还 credit（返回值是"累计已释放量"，发送方做减法得可用 credit）。',
    '- credit 用尽仍发送 = 协议违规；连续 2 次比较后判定错误。',
    '',
    '死锁避免：规则要求设备周期性返回 credit、避免 NP 无限占据资源（这也是排序规则的动机之一）。'
  ].join('\n'),
  verify: '用例：故意耗尽某类 credit 后停发 UpdateFC，检查 DUT 停发并报错；突然归还大额 credit 的边界；credit 溢出（wrap）场景。'
},
{
  id: 'k-m1-04', module: 'm1', title: 'DLLP、Ack/Nak 与 Replay',
  tags: ['DLLP', 'Ack', 'Nak', '重传'],
  body: [
    '- DLLP 类型：Ack、Nak、FC（Init/Update）、功耗管理（如 PM_Enter_L1）等，16B CRC 保护。',
    '- 发送方把已发未确认的 TLP 存入 **Replay Buffer**；收到 Nak 或超时则从指定序列号起重传。',
    '- Ack/Nak 携带下一个期望接收的序列号（Rx 未确认的最老 TLP 的序号+1）。',
    '- 接收端发现 LCRC 错或序列号跳变，发 Nak 并丢弃后续 TLP 直到重传补齐。',
    '',
    '注意：Ack/Nak 与 FC 是两套独立机制——credit 只管"对方能不能收"，Ack 只管"对方收没收到"。'
  ].join('\n'),
  verify: '注入 LCRC 错误触发 Nak；测试 Replay Buffer 溢出边界（REPLAY_NUM 滚动计数导致进 Recovery）；乱序 Ack 边界；Replay 期间新 Ack 的处理。'
},
{
  id: 'k-m1-05', module: 'm1', title: 'LTSSM 状态机总览',
  tags: ['LTSSM', '链路训练'],
  body: [
    '链路由双方 Electrically Idle → Detect → Polling（训练 8b/10b 或 TS 有序集）→ Configuration（协商 lane 极性反转、lane 编号、链路宽度）→ L0（正常工作）。',
    '- **Recovery**：速率改变、均衡（Gen3+）、退出低功耗后回 L0 的必经状态。',
    '- **Configuration / Recovery 中的子状态**按 RcvrLock/RcvrCfg 流转，超时计数触发重试或降级。',
    '- **低功耗状态**：L1（含 ASPM L1.0/L1.1/L1.2 子状态）、L2（深度休眠）。',
    '- **Loopback / Disable / Hot Reset**：测试与控制状态。',
    '',
    'LTSSM 是验证覆盖率的重灾区：状态 × 触发条件 × 超时路径的组合爆炸，必须建覆盖模型有意识地收敛。'
  ].join('\n'),
  verify: '为每个状态转移写覆盖点（from-state × event），重点：Recovery 重试上限后降速到 2.5GT/s、lane 极性/编号反转协商、各子状态超时路径。'
},
{
  id: 'k-m1-06', module: 'm1', title: '配置空间与枚举',
  tags: ['配置空间', '枚举', 'BAR', 'ECAM'],
  body: [
    '- 每个功能最多 4KB 配置空间：头 64B（Type 0 是端点、Type 1 是桥/交换器）+ 可选 capability 链。',
    '- **BAR（Base Address Register）**：软件读 BAR 探测地址空间大小，写值设定映射基址。',
    '- 枚举：RC 从总线 0 出发，对每个总线扫描设备，读 VendorID 判断存在 → 分配 BAR → 配桥的总线号窗口 → 递归下行，最终形成路由拓扑。',
    '- **ECAM/MMCFG**：把配置空间映射到内存地址（总线/设备/功能编码进地址），支持超过传统 256B 配置访问的 Enhanced 空间。',
    '- PCIe capability（Offset 0x70 起）里有链路控制、状态、速率宽度字段，是链路层验证常用的观测/注入点。'
  ].join('\n'),
  verify: '枚举顺序与总线号窗口路由用例（Type 1 头的 Memory/IO 基限寄存器过滤）；热插拔后重新枚举；ECAM 访问未挂设备时的 Master Abort 行为。'
},
{
  id: 'k-m1-07', module: 'm1', title: '事务排序规则（UIO 的前置知识）',
  tags: ['排序', 'relaxed ordering'],
  body: [
    '经典 PCIe 用一组保守的排序规则防止死锁并保证写入可见性：',
    '- Posted 写不得越过更早的 Posted 写（同 TC 同路径）。',
    '- Completion 不得越过更早的 Posted 写（防止旧平台 DMA 一致性问题）。',
    '- Non-Posted 不得越过更早的 Non-Posted。',
    '- **Relaxed Ordering 属性**可放松部分限制提升乱序执行性能，但默认仍保守。',
    '',
    '这套规则在单路径 RC-EP 拓扑下没问题，但在**多路径交换 fabric（AI 集群）**里会成为吞吐瓶颈——这正是 6.x 引入 UIO 的动机。'
  ].join('\n'),
  verify: '构造同 TC 事务流，检查交换器/RC 的重排边界是否符合规则矩阵（规范有完整排序表）；RO 置位前后行为差异。'
},

/* ---------------- M2 6.0 总览 ---------------- */
{
  id: 'k-m2-01', module: 'm2', title: '速率演进与编码方式',
  tags: ['速率', '历史', '带宽'],
  body: [
    '| 代 | 速率 | 编码 | 每 lane 有效带宽（约） |',
    '| Gen1 | 2.5 GT/s | 8b/10b（80%） | 250 MB/s |',
    '| Gen2 | 5 GT/s | 8b/10b | 500 MB/s |',
    '| Gen3 | 8 GT/s | 128b/130b（~98.5%） | ~985 MB/s |',
    '| Gen4 | 16 GT/s | 128b/130b | ~1.97 GB/s |',
    '| Gen5 | 32 GT/s | 128b/130b | ~3.94 GB/s |',
    '| **Gen6** | **64 GT/s** | **FLIT + FEC+CRC（~96%净荷）** | **~7.5 GB/s** |',
    '',
    '- Gen6 x16 单向聚合带宽约 **121 GB/s**（翻倍于 Gen5 x16）。',
    '- 首次出现：速率翻倍但**信道损耗与 Nyquist 频率不变**（PAM4 的功劳），意味着布线/连接器/Retimer 生态可部分沿用。'
  ].join('\n'),
  verify: '对比测试：相同拓扑下 Gen5 与 Gen6 的有效吞吐与编码效率；FEC/CRC 开销对带宽利用率的量化影响。'
},
{
  id: 'k-m2-02', module: 'm2', title: '四大技术支柱',
  tags: ['PAM4', 'FLIT', 'FEC', 'L0p'],
  body: [
    'Gen6 的全部重大变化可归纳为四点，互为因果：',
    '- **PAM4**：4 电平调制，速率翻倍而符号率不变 → 但 SNR 裕量骤减、误码率上升。',
    '- **FEC**：因为误码率升高，必须引入前向纠错把链路 BER 拉回可用区间 → 而 FEC 需要固定长度的码块。',
    '- **FLIT**：固定 256B 的传输单元，为 FEC 提供固定结构，同时把重传代价固定化（First Retry 延迟可控）。',
    '- **L0p**：新的低功耗状态，配合按需带宽在细粒度上省电。',
    '',
    '逻辑链：**速率翻倍 → PAM4 → 误码率升高 → FEC → 固定长度 FLIT → 固定延迟重传**。理解这条因果链，所有细节就都有了归属。'
  ].join('\n'),
  verify: '每个特性都有独立的验证主题：PAM4（PHY 层均衡/FEC 注错）、FLIT（打包/流控）、L0p（状态机）。按这条链组织验证计划。'
},
{
  id: 'k-m2-03', module: 'm2', title: '向后兼容与速率协商',
  tags: ['互操作', '协商'],
  body: [
    '- 所有 Gen6 设备必须能以 2.5 GT/s 启动（训练始终从 Gen1 速率开始）。',
    '- 链路在 Configuration 阶段交换双方支持的速率能力，先以 2.5 GT/s 到 L0，再经 **Recovery → 速率提升**逐级爬升（可跳级，若训练失败则回退重试）。',
    '- 速率切换后需重新做均衡（Gen3+ 流程；Gen6 使用 PAM4 专属 preset 与接收端训练）。',
    '- 驱动可通过链路控制寄存器限制目标速率（调试常用：锁定在低速率验证逻辑功能）。',
    '',
    '互操作测试是硅后与 EM 验证的重点：Gen6 EP 插 Gen5 RC、经 Retimer 的三方组合、不同损耗信道下的训练鲁棒性。'
  ].join('\n'),
  verify: '速率爬升/回退全路径覆盖（64↔32↔16…）；训练失败注入（改错 TS 中速率能力位）；限速寄存器生效检查。'
},

/* ---------------- M3 FLIT ---------------- */
{
  id: 'k-m3-01', module: 'm3', title: '为什么需要 FLIT',
  tags: ['FLIT', '动机'],
  body: [
    '- FEC 编解码要求**固定大小、固定到达节奏**的码块——变长的 TLP 无法直接做低延迟 FEC。',
    '- 256B 固定长度 FLIT 让 RS(544,528) 的纠错与校验时延变成**常数**，从而 First Retry 的延迟也是常数，满足时延敏感场景。',
    '- 固定结构附带红利：流控、Ack/重传全部以 FLIT 为单位，比按 TLP 粒度更规整，物理层不再需要在符号流里"搜索"帧边界。',
    '- 代价：小 TLP 拼包、跨 FLIT 的带宽浪费需要精心规则来抑制（见 TLP 打包卡）。',
    '',
    '一句话：**FLIT 不是为了带宽，而是为了让 PAM4 + FEC 的世界可以预测。**'
  ].join('\n'),
  verify: '验证 FLIT 发送节奏的恒定性（idle 时发 NULL flit）；FEC 解码延迟为常数的时序断言。'
},
{
  id: 'k-m3-02', module: 'm3', title: 'FLIT 结构（256 字节）',
  tags: ['FLIT', 'CRC', 'FEC', '结构'],
  body: [
    '一个 FLIT 固定 256 字节，大致划分（精确域边界以 spec 为准）：',
    '- **~236B TLP 装载域**：可容纳 TLP header 或 payload 的净荷区。',
    '- **双 CRC**：CRC-1（2B，覆盖装载域头部区域）+ CRC-2（4B，覆盖整个 FLIT）。',
    '- **14B FEC 域**：承载 RS(544,528) 纠错码校验位（跨 FLIT 交织布放）。',
    '',
    '- 双 CRC 的用意：CRC-1 覆盖的头部区域可**先于 FEC 解码**校验，让"这个 FLIT 是否需要重传"的判决提前，压缩 First Retry 延迟。',
    '- FLIT 的概念存在于**协议侧（flit mode）**；物理层仍可能以 symbol/块为单位串化，但对 DL 及以上，FLIT 是原子单位。'
  ].join('\n'),
  verify: '单独翻转 CRC-1 / CRC-2 / FEC 域位，观察判决路径与时序差异；检查 NULL flit 在 idle 时的合法填充。'
},
{
  id: 'k-m3-03', module: 'm3', title: 'FLIT 的六种类型',
  tags: ['FLIT', '类型'],
  body: [
    '按头域编码区分：',
    '- **Optimized Header Flit**：装载优化格式的 TLP 头（无/小 payload 场景，头更紧凑）。',
    '- **Standard Header Flit**：装载标准 TLP 头。',
    '- **Data Payload Flit**：纯数据，承接大 TLP 的 payload（payload 大时先发 header flit，后续整 flit 都是数据）。',
    '- **Link Control Flit**：承载 Ack/Nak、流控更新等链路管理信息。',
    '- **Retimer Folio Flit**：透明 Retimer 相关信息。',
    '- **NULL Flit**：链路空闲或对齐时的填充。',
    '',
    '流控 DLLP 不再是独立的物理帧，而是**搭 FLIT 的便车**（Link Control flit），这是 6.0 链路层"外观"最大的变化之一。'
  ].join('\n'),
  verify: '每类 flit 的合法/非法头编码 checker；Link Control flit 搭载 FC 更新的时序（是否满足 credit 归还时限）。'
},
{
  id: 'k-m3-04', module: 'm3', title: 'TLP 打包规则与 Corner Cases',
  tags: ['打包', 'corner case'],
  body: [
    '- TLP **不能跨 FLIT 边界拆分**：放不进当前 FLIT 剩余空间的 TLP 等下一个 FLIT（剩余空间浪费）。',
    '- payload 大的 TLP：header flit 之后跟整数个 **Data Payload flit**，最后不足一个 flit 的尾部填充（pad）。',
    '- 多个小 TLP 可拼进同一 FLIT（header+header+payload 混排），需遵循类型兼容与对齐规则。',
    '- FLIT 模式下不再依赖周期性 SKP 有序集做时钟容差补偿（由 PHY 层机制处理），插入逻辑简化，但**idle 场景必须发 NULL flit 维持节奏**。',
    '',
    '打包规则的边界值是 bug 高发区：恰好填满、差 1B、1024DW 最大 payload、ECRC 存在时的布局。'
  ].join('\n'),
  verify: '定向用例：差 1B/恰好填满/最大长度 TLP/多小 TLP 拼包/pad 值检查；属性（TC/Attr）不同的 TLP 拼包限制。'
},

/* ---------------- M4 PAM4 ---------------- */
{
  id: 'k-m4-01', module: 'm4', title: 'PAM4 基本原理',
  tags: ['PAM4', '调制', '眼图'],
  body: [
    '- **PAM4 = 4-Level Pulse Amplitude Modulation**：4 个电平（约 -1、-1/3、+1/3、+1 归一化摆幅），每个符号携带 **2 bit**。',
    '- 数据率 64 GT/s 时符号率仅 **32 GBaud** —— 与 Gen5 NRZ（32 GT/s → 32 GBaud）相同，**Nyquist 频率同为 ~16 GHz**，这是"速率翻倍但信道不用推倒重来"的原因。',
    '- 代价：电平间隔缩小为 NRZ 的 **1/3**，眼图高度骤降，SNR 裕量损失约 **9 dB 量级**，裸误码率比 NRZ 高多个数量级。',
    '- 4 个电平有 24 种 2bit 映射，采用**格雷码（Gray coding）**：相邻电平只差 1 bit，判决出错时最可能只错 1 bit，减轻 FEC 负担。'
  ].join('\n'),
  verify: 'PHY 验证关注：4 电平判决边界、符号对齐、格雷映射正确性；协议层建模时按 2bit/symbol 生成符号流。'
},
{
  id: 'k-m4-02', module: 'm4', title: '预编码（Precoding）',
  tags: ['PAM4', '预编码', '突发错误'],
  body: [
    '- 信道反射与 ISI 会让**一个噪声事件污染连续多个符号**（burst error），连续多符号错会耗尽 FEC 的纠错能力。',
    '- 发送端 **precoding**（对相邻符号做预运算，接收端逆运算）可以把信道造成的相关性错误**打散成孤立的符号错**，让 RS FEC 的随机纠错能力充分发挥。',
    '- 预编码在链路训练期间协商启用（TS 中交换能力），两端必须一致。',
    '',
    '类比：把"连环追尾"变成"各自独立的剐蹭"，保险公司（FEC）才赔得起。'
  ].join('\n'),
  verify: '训练协商位翻转导致两端预编码不一致的行为；burst 错误注入下"开/关 precoding"的纠错结果对比。'
},
{
  id: 'k-m4-03', module: 'm4', title: 'PAM4 对均衡的挑战',
  tags: ['PAM4', '均衡', 'ISI'],
  body: [
    '- 电平间距 1/3 → 对 ISI/串扰/抖动极其敏感，需要更强的 TX FFE、CTLE、DFE 组合。',
    '- Gen6 定义了 **PAM4 专属的 preset 集合**（preset 是参数化的均衡配置编号，训练时协商选用）。',
    '- 接收端训练（receiver training / eye 调整流程）在 Gen6 中负担更重：要同时对齐电平判决参考与采样相位。',
    '- 信道插损预算仍在 ~36dB 量级（与 Gen5 相当），但留给器件的裕量被压缩，硅后 SI 调试量增大。'
  ].join('\n',
  ),
  verify: '均衡相关用例多在 PHY/仿真域：preset 协商覆盖、训练超时回退、preset 切换期间 symbol 错误的容忍度。'
},

/* ---------------- M5 FEC 与错误处理 ---------------- */
{
  id: 'k-m5-01', module: 'm5', title: '为什么必须要 FEC',
  tags: ['FEC', 'BER', '动机'],
  body: [
    '- PCIe 链路历来要求极低误码率（BER 达 1e-12 量级目标）。',
    '- PAM4 的 SNR 损失使裸信道 BER 只能做到 **1e-4 ~ 1e-6 量级**——靠纯重传的话重传风暴会吃掉带宽与时延。',
    '- 方案：**轻量 FEC 先纠**大部分错误，**纠不了的整 FLIT 重传**（First Retry）。',
    '- 结果：FEC + 重传的组合达成等效 BER 目标，且时延（P99）可控——这是"低延迟重传"路线，对比以太网 56G/112G 的重 FEC（大延迟大算力）是刻意的设计取舍。'
  ].join('\n'),
  verify: '核心用例矩阵：0 错 / 可纠错 / 超纠错能力 / CRC 错 FEC 对，四种组合下 DUT 的行为与延迟。'
},
{
  id: 'k-m5-02', module: 'm5', title: 'RS(544,528) 纠错码',
  tags: ['RS', 'FEC', '纠错能力'],
  body: [
    '- Gen6 采用 **Reed-Solomon RS(544,528)**，在 GF(2^10) 上运算：528 个信息符号 + 16 个校验符号 = 544 符号码字，每符号 10 bit。',
    '- 纠错能力：**最多纠 8 个符号错**（校验符号数的一半）。',
    '- 码字**跨多个 FLIT 交织**布放：连续 burst 错被摊到多个码字里，每个码字都不超 8 个错 → 配合 precoding 极大提高可纠率。',
    '- FEC 编解码时延是固定的（结构决定），这正是 FLIT 延迟可预测的保障。'
  ].join('\n'),
  verify: '注错试验：单 flit 内 1~8 个符号错（预期纠正）、>8 个错（预期不可纠→触发重传路径）、跨 flit 分布的 burst（交织是否兜住）。'
},
{
  id: 'k-m5-03', module: 'm5', title: '双 CRC 与快速判决',
  tags: ['CRC', 'CRC-1', 'CRC-2'],
  body: [
    '- **CRC-1（2B）**：只覆盖 FLIT 装载域的头部区域。数据量小 → 校验极快，**在 FEC 解码之前**就能判断"这批 TLP 头是否干净"。',
    '- **CRC-2（4B）**：覆盖整个 FLIT 净荷，FEC 解码后做最终完整性判定。',
    '- 判决优先级：CRC-1 过 → 大概率 header 可用；FEC 纠错后 CRC-2 过 → FLIT 可交付；都不过 → 整 FLIT 丢弃待重传。',
    '- 设计意图：把"是否重传"的判决挪到流水线最前端，**压缩 First Retry 的反应时间**。'
  ].join('\n'),
  verify: '分域注错：只翻 CRC-1 覆盖区 / 只翻纯数据区 / 翻 FEC 域，核对三条判决路径的行为与时序；防"纠错反而纠坏"（FEC 纠错后 CRC-2 仍失败）的兜底。'
},
{
  id: 'k-m5-04', module: 'm5', title: 'First Retry 机制',
  tags: ['重传', 'First Retry', '延迟'],
  body: [
    '- FEC 不可纠且 CRC 失败时，接收端**不等传统超时**，立即通过链路控制信息要求从该 FLIT 起重传 —— 即 First Retry。',
    '- 重传以 FLIT 为单位、延迟为常数，对上层表现的**时延抖动可控**；平均带宽仅少量下降（依赖信道质量）。',
    '- 与传统机制的对比：Gen1-5 的重传由 Nak/超时驱动、以 TLP 为单位；Gen6 的重传以 FLIT 为单位、由 FEC/CRC 判决驱动、反应更快。',
    '- 连续重传失败仍会升级到 Recovery 重新训练（保留兜底路径）。'
  ].join('\n'),
  verify: '重传期间新 FLIT 的去重（序列/编号不回退）；连续 First Retry 失败 → Recovery 的升级条件；重传风暴下吞吐与延迟的统计。'
},

/* ---------------- M6 电源管理 ---------------- */
{
  id: 'k-m6-01', module: 'm6', title: 'L0p：带宽按需伸缩',
  tags: ['L0p', '电源', 'lane contraction'],
  body: [
    '- **L0p 是 Gen6 新增**的电源状态：在 L0 内部把活动 lane 数收缩（lane contraction）/恢复，**无需进入 Recovery 断流**。',
    '- 动机：AI/服务器负载波动大，x16 满配常驻太耗电；L0p 让链路像"自动挡"一样按流量伸缩宽度。',
    '- 收缩/恢复期间数据连续性由协议保证（数据重新分布在保留 lane 上），上层只看到带宽变化。',
    '- 与 L1 家族互补：L1 断流省电更多但恢复慢；L0p 不断流、恢复快，粒度细。',
    '',
    'L0p 只在 FLIT 模式（Gen6 速率）下有意义。'
  ].join('\n'),
  verify: '高价值用例族：收缩/恢复瞬间的数据完整性（byte 流不断不重）、收缩到各宽度组合、收缩期间恰逢重传/FEC 错误的复合场景。'
},
{
  id: 'k-m6-02', module: 'm6', title: 'ASPM 与 L1 子状态回顾',
  tags: ['ASPM', 'L1', '回顾'],
  body: [
    '- **ASPM L0s**：空闲快速省电，恢复需 retrain 若干有序集，延迟小。',
    '- **ASPM L1（L1.0）**：整链路电气空闲，恢复走 Recovery，延迟中等。',
    '- **L1.1 / L1.2（CLKREQ 子状态）**：进一步关 PLL/时钟、降共模电压，恢复延迟最大（几十微秒级），吞吐空闲场景节能显著。',
    '- Gen6 语境：L0p 管"带宽伸缩"，L1 家族管"深度睡眠"，二者组合覆盖动态功耗谱。',
    '',
    '功耗状态切换的时序与误切换是低功耗 bug 高发区（如 L1.2 恢复时序违规导致链路挂死）。'
  ].join('\n'),
  verify: '状态机覆盖：L0↔L0s↔L1.x 全转移；切换期间 pending TLP 的处理；CLKREQ 时序断言；与 L0p 的组合场景。'
},

/* ---------------- M7 流控变化 ---------------- */
{
  id: 'k-m7-01', module: 'm7', title: 'FLIT 粒度的流控',
  tags: ['流控', 'FLIT'],
  body: [
    '- FLIT 模式下 credit 单位从"TLP header/DW"改为**以 FLIT（及其内部槽位）为粒度**计数。',
    '- 初始化与更新仍遵循"能力交换 + 增量归还"的模式，但报文搭载在 Link Control FLIT 里而非独立 DLLP 帧。',
    '- credit 归还时机直接影响吞吐：归还慢 → 发送方饿死；规范对归还时限有约束（防死锁条款）。'
  ].join('\n'),
  verify: 'credit 记账 checker（发送量 ≤ 已授予量始终成立）；UpdateFC 搭载位置与时限合规；credit 用尽时发送侧停发行为。'
},
{
  id: 'k-m7-02', module: 'm7', title: '共享缓冲池（Shared Flow Control Buffer）',
  tags: ['共享缓冲', '流控'],
  body: [
    '- 传统模式三类事务（P/NP/Cpl）各自独立 buffer + 独立 credit：某类用满时其他类的空闲 buffer 只能干看，利用率低。',
    '- FLIT 模式支持**共享缓冲池**：多类事务共用存储，按池化 credit 管理，buffer 面积/利用率显著优化（6.0 控制器的重要卖点）。',
    '- 仍保留防死锁的保底规则（如 NP 与 Cpl 不能互相饿死的隔离策略）。'
  ].join('\n'),
  verify: '混合负载下池化 credit 的记账正确性；构造某类事务洪泛，验证不饿死其他类；池满边界与归还节奏。'
},

/* ---------------- M8 均衡与链路训练 ---------------- */
{
  id: 'k-m8-01', module: 'm8', title: '均衡流程回顾（Gen3-5）',
  tags: ['均衡', '回顾'],
  body: [
    '- Gen3+ 速率提升后必须做链路均衡（Link Equalization），在 **Recovery 状态的 EQ 阶段**完成。',
    '- **Phase 1**：TS1/TS2 交换初始 preset 与 TX preset。',
    '- **Phase 2**：下行端发 preset/coefficient 请求调上行 TX（带独立超时）。',
    '- **Phase 3**：反向，调下行 TX。',
    '- 均衡结果写回链路状态寄存器，EQ 完成标志置位后回 L0。',
    '',
    'Verilog/SV 验证常做 EQ 参数协商的 checker 与超时路径覆盖。'
  ].join('\n'),
  verify: 'Phase1-3 全路径、每个 phase 的超时与重试、非法 coefficient 请求的响应、均衡失败降速回退。'
},
{
  id: 'k-m8-02', module: 'm8', title: 'Gen6 的 PAM4 均衡与训练',
  tags: ['PAM4', '均衡', '训练'],
  body: [
    '- 速率提升到 64 GT/s 时进入 Gen6 专属均衡流程，使用 **PAM4 preset 集合**（preset 编号空间与 NRZ 不同）。',
    '- 训练协商内容更多：preset、**precoding 开关**、电平判决相关参数。',
    '- 接收端训练承担电平对齐与采样相位细调，训练不达标走超时回退（降速重试）。',
    '- Retimer 透明参与均衡转发（Retimer Folio flit 承载相关状态）。'
  ].join('\n'),
  verify: 'Gen5→Gen6 均衡切换路径；precoding 协商不一致注入；preset 集合覆盖矩阵；训练失败→回退 Gen5 的完整路径。'
},
{
  id: 'k-m8-03', module: 'm8', title: '环回（Loopback）与测试角色',
  tags: ['Loopback', '测试'],
  body: [
    '- **Loopback 状态**：链路一方把收到的数据原样回发，用于信号完整性/BER 测试与合规测试（PCI-SIG 一致性测试大量使用）。',
    '- 入口：主从角色（Loopback Master/Slave），进入前双方协商。',
    '- Gen6 下 Loopback 配合 PAM4 激励源做误码率评估；近端/远端环回（NELB/FELB）是 PHY 与系统级 debug 的常用分界手段。'
  ].join('\n',
  ),
  verify: 'Loopback 进入/退出的状态覆盖；环回期间错误统计（BERT 计数）寄存器/信号的正确性。'
},

/* ---------------- M9 UIO 与 6.1 ---------------- */
{
  id: 'k-m9-01', module: 'm9', title: 'UIO：Unordered I/O',
  tags: ['UIO', '排序', '6.1'],
  body: [
    '- 2024 年以 ECN 形式发布，并入 **PCIe 6.1** 基线，并延续到 7.0。',
    '- 动机：经典排序规则（尤其"Cpl 不得越过 Posted 写"）在**多路径交换 fabric**（AI 训练集群、GPUDirect 类流量）里强制串行化，限制并行度。',
    '- UIO 引入新的事务属性/消息语义：允许**显式声明无排序约束的 IO 流**（如带缓存语义的写入），交换器可乱序转发，提升 fabric 聚合带宽。',
    '- 兼容性：传统设备不受影响（不响应 UIO 能力即按老规则走），需要端到端能力协商。'
  ].join('\n'),
  verify: 'UIO 能力协商（有一端不支持时的回退）；UIO 流与传统流混合时的排序边界 checker；乱序后上层一致性（缓存语义）验证。'
},
{
  id: 'k-m9-02', module: 'm9', title: 'PCIe 6.1 / 7.0 与 CXL 生态',
  tags: ['6.1', '7.0', 'CXL'],
  body: [
    '- **6.0（2022.1）**：64 GT/s、PAM4、FLIT、FEC、L0p —— 体系结构大版本。',
    '- **6.1（2024 末）**：吸收 ECN 的维护版，代表特性是 UIO。',
    '- **7.0**：128 GT/s，继续 PAM4 路线，特性与 6.x 兼容（学完 6.0 迁移成本低）。',
    '- **CXL 2.0/3.0** 复用 PCIe 6.0 的 FLIT/PAM4 物理与链路层，在其上叠加缓存一致性与内存语义 —— 学 PCIe 6.0 等于半只脚踏进 CXL。',
    '- 面向 AI/互连（NVLink、UPI、以太网超大规模互连竞争）的时代背景：PCIe 的每次演进都在争夺"AI 集群互连"生态位。'
  ].join('\n'),
  verify: '了解即可；若做 CXL 验证，FLIT/FEC/L0p 部分的验证资产可直接复用。'
},

/* ---------------- M10 验证专题 ---------------- */
{
  id: 'k-m10-01', module: 'm10', title: '错误注入用例矩阵（重中之重）',
  tags: ['错误注入', '用例'],
  body: [
    '6.0 验证的核心价值在于**分级错误响应**。建议按矩阵设计用例（错误类型 × 数量 × 位置 × 时机）：',
    '- **FEC 可纠（1~8 符号错）**：链路不断、不重传、数据静默纠正；上层无感知。检查纠错统计计数器。',
    '- **FEC 不可纠 + CRC 失败**：丢弃该 FLIT → First Retry；检查重传的 FLIT 与原 FLIT 内容一致、序列不回退。',
    '- **仅 CRC-1 失败**：header 区域错误，走快速重传判决路径（时序上应早于 FEC 完成判决）。',
    '- **FEC"纠错后仍错"**（错误恰好被纠成另一个合法值但 CRC-2 不过）：必须兜底重传，绝不能交付坏数据。',
    '- **连续错误**：连续 First Retry 失败次数达到阈值 → 升级 Recovery。',
    '- **时机维度**：错误恰逢 L0p 收缩/恢复、恰逢 NULL flit、恰逢流控更新搭载。',
    '',
    '**铁律：无论注错组合多刁钻，scoreboard 上交付给事务层的数据流必须与发送端完全一致（或链路明确报错），绝不静默丢字节。**'
  ].join('\n'),
  verify: '把本卡当 checklist 逐行建用例；所有注错用例共用"数据流最终一致"断言。'
},
{
  id: 'k-m10-02', module: 'm10', title: 'FLIT 打包/解包验证清单',
  tags: ['打包', 'corner case', '清单'],
  body: [
    '- 边界填充：TLP 差 1B 放不下 → 移入下一 FLIT，本 FLIT 剩余空间合法填充。',
    '- 恰好填满：无 pad、下一 TLP 从新 FLIT 头开始。',
    '- 最大 payload（1024DW）：1 个 header flit + 若干整 data flit + 尾部 pad。',
    '- 多 TLP 拼包：header 紧排、data 跟随；不同 TC/Attr 的 TLP 是否允许拼同一 FLIT（查规范）。',
    '- ECRC 存在时的净荷布局与 4B 对齐。',
    '- NULL flit：空闲期连续填充、节奏恒定；Link Control 信息搭载优先级。',
    '- 发送侧乱序到达（多 VC 场景）时的 FLIT 装配顺序稳定性。'
  ].join('\n'),
  verify: '每行一个定向序列；scoreboard 做"TLP 流 → FLIT 流 → TLP 流"的双向参考模型比对。'
},
{
  id: 'k-m10-03', module: 'm10', title: '覆盖率模型设计',
  tags: ['覆盖率', '验证计划'],
  body: [
    '- **状态覆盖**：LTSSM 全状态 × 转移边（重点新增：L0p 相关转移、Gen6 均衡子状态）。',
    '- **速率×宽度×状态**三维交叉：64/32/16/8/2.5 GT/s × x1~x16 × 主要状态。',
    '- **错误处理覆盖**：错误类型（可纠/不可纠/CRC1/CRC2/FEC）× 数量 × 位置 × 链路状态（L0/L0p/均衡中）。',
    '- **FLIT 覆盖**：六种 flit 类型 × 各种填充比例分桶（空/部分/满）× 搭载内容。',
    '- **流控覆盖**：三类事务 × 池化/独立模式 × credit 水位分桶（空/低/高/满）。',
    '- 收敛策略：用"未覆盖点 → 反推定向序列"闭环，而不是随机轰。'
  ].join('\n'),
  verify: '把覆盖组直接映射到本系统的模块结构，边学边当验证计划骨架。'
},
{
  id: 'k-m10-04', module: 'm10', title: 'SVA 断言示例集',
  tags: ['断言', 'SVA'],
  body: [
    '- **FEC 可纠不重传**：`fec_uncorrectable |-> retry_req` 的逆命题——纠错成功时不得触发重传。',
    '```systemverilog\nproperty p_fec_ok_no_retry;\n  @(posedge clk) disable iff (!rst_n)\n  (fec_corrected && !crc2_fail) |-> ##[1:8] !retry_req;\nendproperty\n```',
    '- **CRC 失败必重传**：`crc2_fail |-> ##[1:N] retry_req`（N 按 First Retry 时延预算取值）。',
    '- **L0p 数据连续**：lane 数变化事件前后，参考模型 byte 流单调递增不回退。',
    '- **NULL flit 节奏**：空闲期相邻 flit 起点间隔恒等于 flit 周期。',
    '- **credit 不透支**：任意时刻 `sent_flits[cid] <= granted_flits[cid]`。',
    '- **First Retry 序列不回退**：重传的 FLIT 编号 ≥ 之前最大已确认编号。'
  ].join('\n'),
  verify: '断言挂在 monitor 采集的总线上（而非 DUT 内部信号），保证可复用于不同实现。'
},
{
  id: 'k-m10-05', module: 'm10', title: '互操作与合规测试',
  tags: ['互操作', '合规', 'CV'],
  body: [
    '- **跨代互操作**：Gen6 EP ↔ Gen5/4 RC（协商到共同最高速率）；经 Retimer 的三方组合；不同插损信道。',
    '- **速率回退**：均衡失败 → 逐级降速的完整链路；降速后功能不回退（FLIT↔128b/130b 模式切换正确）。',
    '- **合规测试**：PCI-SIG 一致性（物理层眼图/抖动、链路层协议 CV suite、配置空间检查）。产品上市前过 PCI-SIG Integrators List。',
    '- **SI 仿真联动**：信道模型（S 参数）+ 激励做误码率扫描，指导均衡 preset 缺省值。'
  ].join('\n'),
  verify: '搭建"速率爬升/回退"自动回归；合规用例可作为验证计划的功能覆盖子集来源。'
},
{
  id: 'k-m10-06', module: 'm10', title: 'UVM 验证环境架构建议',
  tags: ['UVM', '环境', 'VIP'],
  body: [
    '- **拓扑**：DUT（EP 或 RC 控制器）+ 对端 VIP；中间可选插入 Retimer 模型与注错 agent。',
    '- **分层 agent**：FLIT 级 driver/monitor（PHY-DL 之间）+ TLP 级 monitor（TL 层），双视角 scoreboard。',
    '- **注错 agent**：可控注入符号错/CRC 错/FEC 域错，与随机序列正交组合。',
    '- **参考模型**：TLP→FLIT 装配参考模型（发送侧）+ FLIT→TLP 还原参考模型（接收侧），比对点放在 flit 边界与 TLP 边界两处。',
    '- **序列库分层**：基础（单 TLP 边界）→ 场景（混合负载/带宽按需）→ 错误（注错矩阵）→ 回归组合。',
    '- 复用商用 VIP（Synopsys/Cadence 等）时重点学其"注错 + 统计"接口，这是 6.0 用例的灵魂。'
  ].join('\n'),
  verify: '环境骨架可直接参考本卡；先把双视角 scoreboard 和注错 agent 搭起来，再扩序列。'
},

/* ---------------- M11 参考资料 ---------------- */
{
  id: 'k-m11-01', module: 'm11', title: '官方资料索引',
  tags: ['资料', 'spec', 'PCI-SIG'],
  body: [
    '- **PCI-SIG 规范页**：pcisig.com → Specifications（正式规范需公司会员账号；多数芯片公司都有，找团队要权限）。',
    '- **PCI-SIG 白皮书（强烈推荐先读）**：PCIe 6.0 Technology 系列 —— *PCIe 6.0 Technology Introduction*、PAM4 信令、FLIT、FEC、L0p 各一篇，免费注册下载，是官方最好的入门材料。',
    '- **PCI-SIG Developers Conference**：年度开发者大会，议程与部分录像公开（2026 台北场就有 6.1 UIO 专题）。',
    '- 规范阅读建议：先读"Introduction/Overview"章节建立框架，再按 FLIT→FEC→L0p 专题精读，最后啃排序/流控细节章节。'
  ].join('\n'),
  verify: '读 spec 时随手把条款编号记进知识卡片，方便回溯（本系统支持自定义笔记，见设置页说明）。'
},
{
  id: 'k-m11-02', module: 'm11', title: '书籍与文章',
  tags: ['书', '文章'],
  body: [
    '- **王齐《PCI Express 体系结构导读》**：中文经典，协议框架讲得细（覆盖到 Gen3/4 时代机制），打基础首选。',
    '- **MindShare《PCI Express System Architecture》**：英文经典教材，TLP/流控/排序章节值得精读；Gen6 内容需配白皮书补。',
    '- **Synopsys / Cadence 技术博客**：搜 "PCIe 6.0 article series"，两家对 FLIT/FEC/L0p 都有图解深入的文章，验证视角强。',
    '- **Rambus / 西数 / 安费诺等博客**：PAM4 信号完整性与信道分析角度的文章。',
    '- **CXL Consortium（cxl.io）**：CXL 白皮书，理解 FLIT 复用与一致性协议分层。'
  ].join('\n'),
  verify: '建议阅读顺序：6.0 总览白皮书 → 本书 M1 基础查漏 → Synopsys FLIT/FEC 文章 → spec 精读 → 验证专题实践。'
},
{
  id: 'k-m11-03', module: 'm11', title: '动手实践路径',
  tags: ['实践', '环境'],
  body: [
    '- **第一步（一周内可完成）**：用 SystemVerilog 或 Python 写一个 FLIT 解析器：输入 symbol 流，切 FLIT、识别六种类型、校验 CRC、还原 TLP。这是检验"真懂 FLIT"的试金石。',
    '- **第二步**：在解析器上加注错钩子（翻转任意 bit），观察"可纠/不可纠"分类逻辑。',
    '- **第三步**：搭 UVM 环境：DUT 换成简单 BFM，先跑通 TLP→FLIT 参考模型比对。',
    '- **第四步**：接入商用 VIP 或开源 PCIe BFM，跑注错矩阵回归。',
    '- 若公司有 6.0 相关项目，主动认领错误注入与 L0p 场景——这两块最难也最值钱。'
  ].join('\n'),
  verify: '实践与刷题结合：每学完一个模块，先过本系统对应题目，再写对应代码模块。'
},

/* ================= 深度卡片（规范级细节） ================= */

{
  id: 'k-m1-08', module: 'm1', title: 'TLP Header 逐字段解析（DW0~DW3）',
  tags: ['TLP', 'header', '字段', '深度'],
  body: [
    'TLP Header 为 3DW（12B）或 4DW（16B），字段语义如下（位级布局请对照规范 "TLP Header" 格式图，Base Spec 事务层章节）：',
    '- **DW0**：`Fmt[1:0]`（Header 格式）+ `Type[4:0]`（事务类型）+ `TC[2:0]`（Traffic Class，默认 0）+ `TD`（存在 TLP Digest）+ `EP`（Poisoned 数据标记）+ `Attr`（属性位：Relaxed Ordering / No Snoop / ID-based Ordering）+ `Length[9:0]`（以 DW 为单位的 payload 长度，位于 DW0 低 10 位）。',
    '- **DW1**：Request 类 TLP 为 **Requester ID**（Bus:Dev:Fn，16b）+ **Tag**（8b，Gen4+ 可扩展到 10b tag 以支持最多 1024 个未完成请求）；Completion 类为 Completer ID 等 ID 字段。',
    '- **DW2（3DW 头）**：32 位地址；**DW2/DW3（4DW 头）**：64 位地址。Mem/IO/Config 请求带 **First DW BE / Last DW BE**（首尾 DWORD 字节使能，指示哪些字节有效）。',
    '- Config 请求的 DW2 低位还有 **Register Number / Extended Register Number** 字段。',
    '',
    '**关键位语义**：',
    '- `EP=1` 表示数据已被污染（poisoned），接收方按错误处理但不得丢弃链路状态——验证上要确认 poison 传播策略。',
    '- `TC` 与 VC 映射：不同 TC 可走不同虚拟通道，是 QoS 和死锁避免的基础。',
    '- `Length=0` 有特殊含义：MemRd 表示读 1 DW（零长度读），Message 表示无数据。',
    '- `First/Last BE` 组合出"部分首尾 DW"的合法集合（如 First=0001/0011/0111/1111 等），非法组合是协议违规。'
  ].join('\n'),
  verify: '逐字段 checker：Fmt/Type 合法组合表、Length 与实际字节数一致、BE 合法集合、Tag 不超过已授权数量、ID 与配置空间匹配。'
},
{
  id: 'k-m1-09', module: 'm1', title: 'Fmt/Type 编码表（常用 TLP 全集）',
  tags: ['TLP', '编码', 'Fmt', 'Type', '深度'],
  body: [
    'DW0 高位决定 TLP 类型，**Fmt 决定头长与有无数据**：`00`=3DW 无数据，`01`=4DW 无数据，`10`=3DW 带数据，`11`=4DW 带数据。',
    '',
    '| Type | 事务 | 说明 |',
    '| 00000 | MemRd / MemWr | Memory 读写（Fmt 决定带否数据） |',
    '| 00001 | MemRdLk / MemWr? | 锁定读（Legacy，配合 Lock 语义） |',
    '| 00010 | IORd / IOWr | IO 读写（恒 3DW 头） |',
    '| 00100 | CfgRd0 / CfgWr0 | Type 0 配置读/写（目标为下游端点） |',
    '| 00101 | CfgRd1 / CfgWr1 | Type 1 配置读/写（目标为下游桥下设备） |',
    '| 01010 | Cpl / CplD | 无数据/带数据 Completion |',
    '| 01011 | CplLk / CplDLk | 锁定 Completion（Legacy） |',
    '| 1xxxx | Msg / MsgD | Message（有无数据由最低位区分） |',
    '',
    '- **Message 路由子类型**（Type 高位）：`01000` Address、`01001` ID、`01100` 广播?（以规范为准）、`10010` 本地、`10011` 采集（gathered）、`10100`/`10101` 直达路由。常见消息：INTx（Assert/Deassert）、错误消息、Set/Get_Slot_Power、PME_Turn_Off、Unlock、LTR、Set_Deallocate_Type 等。',
    '- **AtomicOp（Gen3+）**：FetchAdd / Swap / CompareSwap，可用 4DW 头，目标为 P2P 端点内存（不经主存），验证时关注路由与原子性保障。',
    '- 配置事务只由 RC 发起：目标在下游总线上用 Type 0，目标在自身次级总线的桥后用 Type 1。'
  ].join('\n'),
  verify: '用例需覆盖每条 Type 编码的生成与解析；非法 Type/Fmt 组合（如 CfgRd 带 4DW 头）必须报协议错误。'
},
{
  id: 'k-m1-10', module: 'm1', title: 'DLLP 类型全集与帧结构',
  tags: ['DLLP', 'Ack', 'Nak', '流控', '深度'],
  body: [
    'DLLP 是链路层管理的 8 字节定长帧：**1B Type + 3B 信息 + 2B CRC16（+ 扩展）**，无序列号、无 ACK、不经流控。',
    '',
    '| 类别 | Type 编码 | 信息字段 |',
    '| ACK | 00h | AckNak_Seq_Num[11:0]（下一个期望序列号） |',
    '| NAK | 10h | AckNak_Seq_Num[11:0]（首个出错 TLP 序列号） |',
    '| InitFC1-P/NP/Cpl | 8xh/9xh/Axh 区段 | HdrCred[11:0] + DataCred[11:0] |',
    '| InitFC2-P/NP/Cpl | Cxh/Dxh/Exh 区段 | 同上 |',
    '| UpdateFC-P/NP/Cpl | F0h/E0h/D0h 等 | 同上 |',
    '| PM 族 | PM_Enter_L1 / Enter_L23 / Active_State_Request 等 | L-state/子状态编码 |',
    '| Vendor Specific | 70h 区段 | 自定义（规范允许） |',
    '',
    '- FC DLLP 的 credit 字段为 12 bit：数据 credit 以 DW 计；**全 1（FFFh）表示无限 credit**（infinite），常用于 header 或固定 buffer 的设计。',
    '- InitFC1/InitFC2 都要发，且**以两轮一致为准**（防 DLLP 损坏导致 credit 记账错）；运行期只有 UpdateFC。',
    '- Ack/NAK 中序列号语义：ACK 携带"已全部确认"的边界（下一个期望），NAK 携带第一个需要重传的 TLP 序列号。',
    '- DLLP CRC16 保护的是整帧；DLLP CRC 错静默丢弃（无需 NAK——发送方的 Replay 超时机制兜底）。'
  ].join('\n'),
  verify: 'DLLP CRC 错误注入验证"静默丢弃 + Replay 超时兜底"路径；InitFC 两轮不一致注入验证错误处理；FFF 无限 credit 的发送行为。'
},
{
  id: 'k-m1-11', module: 'm1', title: '流控记账深入：credit 流转、无限值与协议错误',
  tags: ['流控', 'credit', '深度', '协议错误'],
  body: [
    '**Credit 流转闭环**（以 Completion data credit 为例）：',
    '- 接收方广播初始 credit（如 128 DW）→ 发送方每发一个 CplD 消耗 credit → 接收方把 buffer 归还给池后发 UpdateFC（**累计归还值**）→ 发送方 `可用 = 授予累计 - 已消耗累计`。',
    '- 归还值是"从链路训练以来累计发布的 credit 总量"，不是增量——两端各自维护计数器做减法，天然容错单次 DLLP 丢失（下次更新会覆盖）。',
    '',
    '**credit 不足判定**：发送一个 TLP 需要的 credit = 1 个 header credit + `ceil(payload DW)` 个 data credit（对 CplD 还有特殊的 DWO/DW1 计数规则——按是否带 BE 处理）。任一不足即必须停发该类 TLP。',
    '',
    '**FC 协议错误清单**（规范定义，验证必查）：',
    '- 接收方收到**超过其已授予 credit** 的 TLP（接收超额）→ 报 FC 协议错误。',
    '- 发送方在 credit 不足时发送 → 接收方可检出（与上一条同一机制观察）。',
    '- RO 允许的例外：Relaxed Ordering 的 Posted 写可能" seeming 超额"，需按 RO 规则豁免判断。',
    '- UpdateFC **超时**（接收方长时间未归还）与 **V=1 语义**（规范允许 UpdateFC 携带"无限"标记场景）。',
    '',
    '**验证设计**：建一个独立 FC 记账 scoreboard——按事务类型维护 granted/consumed/returned 三组计数器，任意时刻断言 `consumed ≤ granted` 且 `granted = 初始 + 累计归还`。'
  ].join('\n'),
  verify: '数字用例：初始 Cpl data credit=64，连发 17 个 4DW CplD（消耗 68DW）→ 预期第 17 个被阻塞；归还 32DW 后恰可再发 7 个（68-64+32=36? 注意按实际消耗重算）。建议做成参数化用例族。'
},
{
  id: 'k-m1-12', module: 'm1', title: 'LTSSM 全子状态图与关键转移',
  tags: ['LTSSM', '子状态', '链路训练', '深度'],
  body: [
    '主状态与子状态全图（自上而下为正常训练路径）：',
    '- **Detect**：Quiet（电气空闲、链路未激活）→ Active（发送 Detect 检测波形，感知对端 presence）→ 成功检测到至少 1 lane 对端。',
    '- **Polling**：Active（互发 TS1/TS2，测 BER，兼容性检测）→ Compliance（进入合规测试模式，发 Compliance Pattern）→ Configuration（TS2 达标）→ Exit。',
    '- **Configuration**：Linkwidth.Start/Accept（协商目标宽度：下行主导）→ Lanenum.Wait/Accept/Reaccess（分配 lane 编号，检查连续性）→ Complete（交换最终参数、进入 L0 前最后确认）→ Idle。',
    '- **L0**：正常工作状态。所有事务只在 L0 及其扩展态（L0p）交换。',
    '- **Recovery**：ReceiverLock（重捕符号锁/块锁）→ RcvrCfg（互发 TS1/TS2 改变链路参数：速率、宽度、均衡）→ Idle → L0。',
    '- **低功耗**：L0s（Entry/Idle/Exit，单方向快速休眠）；L1（Entry/Idle，双向协商）；L1.1/L1.2（CLKREQ 子状态）；L2（辅助电源域，PME 唤醒）。',
    '- **测试/管理**：Loopback（Entry/Active/Exit）；Disabled；Hot Reset；Compliance；Recoverable/Controllable Reset（Gen4+ 引入的 FLR 相关）。',
    '',
    '**关键转移触发**（覆盖率清单的素材）：',
    '- L0 → Recovery：速率改变请求、EQ 启动、重传失败（REPLAY_NUM 滚动）、收到 TS1 请求、误码导致失锁。',
    '- L1 → Recovery：唤醒（收到 EIOS/EIEOS 或 TS1）。',
    '- Configuration 阶段任何子状态超时 → 降级重试（如 16 lane 目标只训出 8 lane）。',
    '- 检测到对端 disable → Disabled 状态。'
  ].join('\n'),
  verify: '覆盖率必须建模"状态 × 转移 × 触发原因"三维；对每个 Recovery 入口原因单独建 bin（这是实际项目 bug 密集区）。'
},
{
  id: 'k-m1-13', module: 'm1', title: '配置空间寄存器地图与 ECAM 访问',
  tags: ['配置空间', 'ECAM', 'BAR', '深度'],
  body: [
    '**Type 0 标准头（端点）关键字段偏移**：',
    '- `00h` VendorID / `02h` DeviceID；`04h` Command（含 Bus Master/MSI Enable 等）/ `06h` Status；`08h` RevisionID / ClassCode[23:0]。',
    '- `0Eh` HeaderType（00h=Type0、01h=Type1、多功能 bit7）；`10h~24h` BAR0~BAR5（每个 32b，64 位 BAR 占两个）。',
    '- `2Ch` Subsystem Vendor/DeviceID；`30h` Expansion ROM BAR；`34h` Capabilities Pointer（capability 链入口）。',
    '- `3Ch` Interrupt Line/Pin；MSI/MSI-X/Power/PXIe 等 capability 挂在链上，ID 顺链跳转。',
    '',
    '**Type 1 标准头（桥/交换器）**：额外含 `18h` Primary/Secondary/Subordinate Bus Number、`1Ch` Secondary Status、`20h/24h/28h` I/O 与 Memory 的 Base/Limit 窗口、`30h~34h` Prefetchable Memory Base/Limit 等——这是枚举与地址路由的硬件基础。',
    '',
    '**常用 capability**：`01h` MSI、`05h` MSI-X、`10h` PCIe Capability。PCIe Capability 内部布局（相对偏移）：`+04h` DeviceCap、`+08h` DevCtrl/Status（MPS=[7:5]、MRRS=[14:12]）、`+0Ch` LinkCap、`+10h` LinkCtrl/Status（ASPM 控制=[1:0]）、Gen4+ 的 `+28h` LinkCap2、`+2Ch` LinkCtrl2（**Target Link Speed=[3:0]**，调试限速利器）。',
    '',
    '**MSI-X 结构**：Table（每项 16B：Message Address 64b + Message Data 32b + Vector Control 32b）与 PBA 的位置由 MSI-X capability 中的 BIR（指向哪个 BAR）+ Offset 指定。**MSI** 支持多向量（Multiple Message Enable），地址固定、data 递增区分向量。',
    '',
    '**ECAM**：配置空间映射到内存 = `MMCFG基址 + (Bus << 20 | Device << 15 | Function << 12) + offset`，256 条总线全映射需 256MB 空间。总线号超出桥的 Subordinate 时访问产生 Master Abort（读回全 1）。'
  ].join('\n'),
  verify: '用寄存器级用例验证：MPS/MRRS 修改后 TLP 尺寸变化、Target Link Speed 限速生效、MSI-X Table 项逐字段正确、ECAM 地址解码与 Master Abort。'
},
{
  id: 'k-m2-05', module: 'm2', title: 'Gen5 → Gen6 协议栈逐层对比',
  tags: ['对比', '架构', '深度'],
  body: [
    '| 层 | Gen5（32 GT/s） | Gen6（64 GT/s） | 验证影响 |',
    '| 事务层 TL | TLP 直接进 DL | TLP 先装配成 FLIT | 需要新的 TLP↔FLIT 参考模型 |',
    '| 数据链路 DL | 独立 DLLP 帧 + TLP 粒度 LCRC/Replay | DLLP 消失，Link Control Flit 承载；FLIT 粒度 CRC+FEC+First Retry | 错误处理机制整体重写，是验证重心 |',
    '| 流控 | 三类独立 credit（Hdr/Data 分计） | FLIT 粒度 + 可选共享缓冲池 | credit 记账模型需重做 |',
    '| 物理层 PL | NRZ + 128b/130b | PAM4 + FLIT 成帧 + 新均衡/prescoding | PHY 与协议层耦合更深（FEC 分布在符号域） |',
    '| 电源管理 | L0/L0s/L1.x/L2 | 新增 **L0p**（不断流缩宽） | 新状态机 + 数据连续性验证 |',
    '| 排序规则 | 经典四类限制 | 同 Gen5；6.1 增补 UIO | UIO 是独立新语义，需能力协商 |',
    '',
    '一句话总结：**TL 几乎不动，DL 推倒重来，PL 换血，PM 加一态**。学 6.0 的精力分配应该与这句话成正比。'
  ].join('\n'),
  verify: '把本表当验证计划的工作分解结构（WBS）：每格至少对应一个 feature 文件夹和一组用例。'
},
{
  id: 'k-m3-05', module: 'm3', title: 'FLIT 布局细节与开销计算',
  tags: ['FLIT', '布局', '开销', '深度'],
  body: [
    '公开资料普遍引用的 256B FLIT 划分（**精确域边界以规范为准**）：',
    '- **~236B 净荷区**：承载 TLP（可含多个 TLP 头/数据）。',
    '- **6B CRC**：CRC-1（2B，16 位，覆盖净荷区前段的 header 部分）+ CRC-2（4B，32 位，覆盖净荷区）。',
    '- **14B FEC 校验**：RS(544,528) 的校验符号，跨 FLIT 交织布放。',
    '',
    '**开销与效率**：CRC+FEC 合计 20B / 256B ≈ 7.8% 协议开销（另有序列管理等少量字段），Gen6 实测净效率约 **90%~92%**，低于 Gen5 的 ~98.5%——但符号率不变下带宽仍翻倍，是值得付的代价。',
    '**设计取舍**：CRC-1 窄（16b）因为只保护 header 区（错误暴露面小）；CRC-2 宽（32b）保护整个净荷（数据错误暴露面大）。这种"分域 + 分宽"是面积/延迟/保护的折中典范。',
    '**验证注意**：FLIT 的字节序（lane 上如何 striping）、header 域的精确边界、CRC 覆盖范围（含不含 FLIT 头）都必须与 spec 对齐后写进参考模型——这三处是最容易"想当然"出错的地方。'
  ].join('\n'),
  verify: '对 CRC 覆盖范围做边界注错（恰好覆盖边界的字节翻位），确认判决路径符合预期。'
},
{
  id: 'k-m3-06', module: 'm3', title: 'FLIT 模式 vs 非 FLIT 模式：链路层差异总表',
  tags: ['FLIT', '对比', '链路层', '深度'],
  body: [
    '| 维度 | 非 FLIT 模式（Gen1-5） | FLIT 模式（Gen6 速率） |',
    '| 帧单位 | TLP（变长）+ DLLP（8B 定长） | FLIT（256B 定长） |',
    '| 链路管理信息 | 独立 DLLP 物理帧 | 搭载于 Link Control Flit |',
    '| 错误保护 | 每 TLP 12b 序列号 + LCRC32 | FLIT 内双 CRC + 跨 FLIT RS FEC |',
    '| 重传 | Nak/超时驱动，从序列号起重发 | First Retry：不可纠 FLIT 立即重传 |',
    '| 流控 credit | Hdr/Data 分计、P/NP/Cpl 独立池 | FLIT 粒度；可选共享池 |',
    '| 空闲填充 | 电闲/SKP 有序集 | NULL Flit（保持固定节奏） |',
    '| 时钟容差补偿 | 周期性插入 SKP | 由 PHY 层机制处理（对上层透明） |',
    '| 速率爬升 | Recovery → 变速率 | 同样经 Recovery，但进入 64 GT/s 后转 FLIT 模式 |',
    '',
    '**互操作要点**：同一链路在 ≤32 GT/s 用非 FLIT 模式、64 GT/s 用 FLIT 模式，速率切换必然伴随"链路层协议模式切换"——模式切换瞬间的 in-flight TLP 处理是验证难点（规范要求切换前清空/确认在途数据）。'
  ].join('\n'),
  verify: '定向用例：32↔64 GT/s 往返切换时 in-flight TLP 的完整性；切换后立即注错的判决路径。'
},
{
  id: 'k-m3-07', module: 'm3', title: 'TLP→FLIT 装配算法（参考模型伪代码）',
  tags: ['FLIT', '参考模型', '伪代码', '深度'],
  body: [
    '发送侧装配参考模型核心逻辑（验证环境的 golden model）：',
    '```',
    'state: cur_flit[]      # 当前 FLIT 缓冲 256B',
    '       cur_off = 0      # 已填字节数',
    '',
    'function pack_tlp(tlp):',
    '  need = header_len(tlp) + payload_len(tlp) + pad_align(tlp)',
    '  # 规则1: TLP 不得跨 FLIT 边界拆分（header 不可拆；',
    '  #        大 payload 由 Data Payload Flit 承载）',
    '  if header_len(tlp) > space_left(cur_flit):',
    '      emit_flit(cur_flit, pad_to_256=true)',
    '      cur_off = 0',
    '  emit_flit_header_part(tlp)          # OH/SH 类型',
    '  while payload_left(tlp) >= full_dp_flit:',
    '      emit_flit(cur_flit); emit_dp_flit(tlp.chunk(236))',
    '  if payload_left(tlp) > 0:',
    '      fill_tail_with_pad(tlp.rest)     # 规则2: 尾部 pad',
    '      emit_flit(cur_flit); cur_off = 0',
    '',
    'function idle():                        # 规则3: 空闲发 NULL',
    '  if no_pending_tlp: emit_null_flit()',
    '```',
    '**关键校验点**：pad 值的合法集合、多 TLP 拼包时类型兼容规则、Link Control 信息的搭载优先级（高于 TLP？抢占还是等待 flit 边界？）、ECRC 是否计入净荷。每一条都必须从规范原文确认后写死在模型里——参考模型"错得自信"比 DUT 错更危险。'
  ].join('\n'),
  verify: '用模型对拍：随机 TLP 流 → 模型输出 FLIT 流 vs DUT 输出，逐字节比对（含 pad 与 CRC 域）。'
},
{
  id: 'k-m4-04', module: 'm4', title: 'PAM4 电平集合、格雷映射与判决',
  tags: ['PAM4', '格雷码', '判决', '深度'],
  body: [
    'PAM4 的 4 个电平（归一化）：**-3、-1、+1、+3**（等间距，间距为 2）。NRZ 的电平是 -1/+1（间距 2）——所以 PAM4 眼高是 NRZ 的 1/3，SNR 损失约 9.5 dB。',
    '**格雷映射**：相邻电平只差 1 bit。一种常见映射（电平 -3→+3 对应）：`11, 10, 00, 01`？——具体映射表以规范为准；关键性质是**判决错到相邻电平 = 单 bit 错**，这正是为 FEC 优化的。',
    '**接收端处理链（现代 SerDes）**：CTLE（线性均衡）→ ADC 采样 → DSP（DFE/MLSE 类判决反馈）→ 符号判决 → 解映射。协议层验证不需要建 DSP 模型，但需要理解：',
    '- 判决错误的**相关性**：一个噪声尖峰可能污染连续符号（burst），这是 precoding + 交织存在的理由。',
    '- 符号率的确定性：32 GBaud 恒定节奏是 FLIT/FEC 时延可预测的物理基础。',
    '**验证接口**：PHY 层仿真中，协议侧关心的是"符号流中的错误分布"——注错模型应支持"独立随机 + 突发 + 周期性"三种错误分布，分别检验 FEC 交织的兜底能力。'
  ].join('\n'),
  verify: '把"PAM4 符号错误分布模型"做成了独立组件，供 FEC/重传验证复用；覆盖单 bit 错（格雷邻位）与跨符号 burst 错两类。'
},
{
  id: 'k-m4-05', module: 'm4', title: '链路 BER 预算与 FEC/重传的联合设计',
  tags: ['BER', 'FEC', '预算', '深度'],
  body: [
    '**误码预算链**（数量级概念，非精确规范值）：',
    '- PAM4 裸信道 BER：约 **1e-4 ~ 1e-6**（取决于信道插损与均衡质量）。',
    '- 经过 FEC（纠 8 符号/码字）后：残余 BER 大幅下降，但仍不足以独立达标。',
    '- FEC 不可纠的 FLIT 走 First Retry 重传 → 最终等效 BER 达到 PCIe 要求（**1e-12 量级目标**甚至更严）。',
    '',
    '**联合设计的三个自由度**：',
    '- FEC 强度（码率 528/544 ≈ 97%）：纠错能力 vs 开销。',
    '- 重传策略：First Retry（快速、常数延迟）兜底低概率事件。',
    '- 物理层均衡（preset 协商）：把裸 BER 压进 FEC 能兜住的区间。',
    '',
    '**对比以太网 112G 的重 FEC**：以太网用 RS(544,514) 多码字串联 + 更高延迟换取更强纠错（适合无重传的 WAN 链路）；PCIe 选择轻 FEC + 重传，因为 PCIe 链路两端都是本地设备、重传代价低、时延敏感。**设计约束决定协议形态**——这是读协议时永远要问的问题。',
    '**验证落地**：错误注入强度应扫描"裸 BER 等效区间"（每 flit 0~10+ 符号错），统计吞吐/延迟分布，确认 First Retry 风暴阈值前吞吐下降曲线符合预期。'
  ].join('\n'),
  verify: '性能回归：注错率 × 负载强度二维扫描，输出吞吐/时延 P99 曲线，作为 silicon 后 SI 调试的对照基线。'
},
{
  id: 'k-m5-05', module: 'm5', title: 'RS(544,528) 数学基础与交织设计',
  tags: ['RS', 'FEC', '数学', '交织', '深度'],
  body: [
    '**符号域**：RS 码定义在 GF(2^10)（1024 个符号元素），每符号 10 bit。码字 = 544 符号 = 528 信息 + 16 校验。',
    '**纠错能力**：最小距离 d = 16 - 528 + 544 - 528 + 1？——RS 码最小距离 = 校验符号数 + 1 = 17，可纠 t = floor(17-1)/2 = **8 个符号错**（或检测 16 个）。',
    '**为什么选 10 bit 符号**：PAM4 每 symbol 携带 2 bit，5 个链路符号 = 1 个 GF 符号；10 bit 符号让"单个 GF 符号错"对应 5 个相邻链路符号错——**把 burst 错误局部化**，配合交织把大 burst 摊薄到多个码字，每个码字 ≤8 错即可全纠。',
    '**交织**：校验符号跨 FLIT 分布（不是集中存放），相邻码字的数据交错排列。效果：连续 100 个符号的 burst 错可能只给每个码字贡献 2~3 个错——远小于 8 的上限。',
    '**precoding 的配合**：信道反射造成的错误在符号域是相关的；precoding 把相关性打散成孤立错误，让"随机纠错"假设成立。两者是同一防御体系的两个环节。',
    '**验证要点**：RS 译码器本身（GF 运算、伴随式、纠错位置）应该用形式验证或独立 C 模型等价性检查；协议层验证关注的是错误分布 → 纠错结果 → 重传触发的**端到端行为**。'
  ].join('\n'),
  verify: 'FEC 单元验证：注入 1~8 错（全纠）、9 错（检测/误纠路径）、burst 跨交织分布（分摊后 ≤8 全纠）。误纠必须被 CRC-2 拦截。'
},
{
  id: 'k-m5-06', module: 'm5', title: 'First Retry vs 传统 Replay：机制对比与序列管理',
  tags: ['重传', 'First Retry', 'Replay', '对比', '深度'],
  body: [
    '| 维度 | 传统 Replay（Gen1-5） | First Retry（Gen6） |',
    '| 触发 | Nak DLLP 或 REPLAY_TIMER 超时 | FEC 不可纠 + CRC 判决失败，立即请求 |',
    '| 重传单位 | TLP（从 NAK 序列号起全部在途 TLP） | FLIT（固定 256B） |',
    '| 判决延迟 | 接收→Nak→发送方处理，含超时兜底 | 常数、流水线内完成 |',
    '| 无效 TLP 处理 | LCRC 错即丢 | FEC 先救，救不了才丢 |',
    '| 升级路径 | REPLAY_NUM 滚动 → Recovery | 连续 First Retry 失败 → Recovery |',
    '',
    '**序列管理细节**（Gen6 FLIT 序列）：',
    '- FLIT 序列号/确认信息搭载在 Link Control Flit 中；接收端检测到序列断裂 → 丢弃后续直到补齐（与传统 TLP 序列号逻辑同构）。',
    '- 重传期间**新到的确认**与**重传数据**可能交叠：发送方必须保证重传流与新流的边界清晰（不可重传已确认部分）。',
    '- 与 L0p 的交互：重传恰逢 lane 收缩时，重传数据要按收缩后的 lane 布局重新 striping——复合场景是验证重点。',
    '**为什么延迟可控**：FLIT 固定 256B + FEC 结构固定 → 从"发现坏 FLIT"到"重传完成"的周期数是常数，P99 时延可写进 QoS 契约。'
  ].join('\n'),
  verify: '断言 First Retry 端到端延迟上界；重传 × L0p 收缩复合用例；重传流与确认流交叠的边界用例。'
},
{
  id: 'k-m6-03', module: 'm6', title: 'L0p 过程细节与验证时序点',
  tags: ['L0p', '过程', '时序', '深度'],
  body: [
    'L0p 的两个操作方向：**Downshift**（收缩活动 lane 数）与 **Upshift**（恢复）。过程要点：',
    '- 协商发生在 L0 内、以 FLIT 边界为切换点——数据流不断，Lane 布局在约定边界切换。',
    '- 切换前后，FLIT 的字节到 lane 的 striping 映射改变；协议保证切换窗口内的数据完整性（有专门的 L0p 控制信息承载切换约定）。',
    '- 触发方：软件显式请求或硬件自治策略（带宽/功耗权衡）；双方需交换能力（支持的最小活动 lane 数等）。',
    '- 与 ASPM 的关系：L0p 管"细粒度伸缩"，L1 管"深度睡眠"；L0p 可作为进入 L1 前的中间步（先收缩到最小宽度再进 L1）。',
    '',
    '**验证时序点清单**：',
    '- 切换边界的 FLIT 完整性：切换点两侧的 FLIT 均须完整（不可半途重排）。',
    '- 收缩期间的重传/FEC 行为不变（错误判决逻辑与宽度无关）。',
    '- Upshift/Downshift 的握手超时路径（对端不响应 → 回退/报错）。',
    '- 软件寄存器与硬件自治同时请求的仲裁。',
    '- 连续快速往返切换（stress）：状态机无死锁、无泄漏。'
  ].join('\n'),
  verify: '把"切换点 × in-flight 事务 × 注错"做三维交叉用例；参考模型按切换约定同步更新 striping。'
},
{
  id: 'k-m7-03', module: 'm7', title: '共享流控池记账示例（数字演练）',
  tags: ['流控', '共享池', '示例', '深度'],
  body: [
    '设共享池总容量 **64 个 credit**（FLIT 粒度），P/NP/Cpl 共享，且规范要求为防饿死设置保底约束（示意）：NP 与 Cpl 各自至少保留 8。某时刻状态：',
    '- 已授予：P=30，NP=10，Cpl=16（合计 56，池剩余 8）',
    '- 已归还：P=12，NP=4，Cpl=6',
    '- 在途占用（未归还）：P=18，NP=6，Cpl=10',
    '',
    '**发送判定**：',
    '- 发 P：需 P 剩余额度（30-18=12）> 0 且池有余量 → 允许（同时不能挤掉 NP/Cpl 的保底：池剩余须减去保底占用后仍够）。若本笔会侵占保底区 → 阻塞等待归还。',
    '- 发 NP：剩余 4，够发 1 FLIT 粒度事务 → 允许。',
    '- Cpl 类推。',
    '',
    '**checker 断言集**：',
    '- `sum(granted) - sum(returned) ≤ POOL_SIZE`（池不透支）。',
    '- 各类 `granted - returned ≥ 0`（单类不透支）。',
    '- 保底约束：当某类饥饿时长超阈值时，其他类不得继续挤占（饿死检测器）。',
    '- 归还节奏：归还时延不超规范上限（防死锁条款）。',
    '',
    '独立模式 vs 共享模式的**选择字段**在训练/配置阶段协商——两种模式都要验证（互操作时可能两端策略不同）。'
  ].join('\n'),
  verify: '本卡数字可直接做成参数化 UVM sequence：随机化授予/归还节奏，checker 盯全部不变式。'
},
{
  id: 'k-m8-04', module: 'm8', title: '均衡参数深入：Preset、Coefficient 与请求流程',
  tags: ['均衡', 'preset', 'coefficient', '深度'],
  body: [
    '**TX 均衡模型**：发送端三抽头 FFE，系数 `C-1, C0, C+1`（各 6 bit，约束 |C-1|+|C0|+|C+1| ≤ 合法范围且总增益归一），对应"pre-cursor / main / post-cursor"去加重。',
    '**Preset**：把常用系数组合编号为 **Preset 0~9**（4 bit 编码），训练时先按 preset 粗调、再按显式 coefficient 细调。Preset 与系数的具体映射表在规范物理层章节（EQ 章节）——Gen6 的 PAM4 preset 集合与 NRZ 独立定义。',
    '**请求流程**（Gen3-5，Gen6 同构扩展）：',
    '- 下行接收端通过 TS2/TS1 的 EQ 字段向上行发送端发请求：`Preset 编号` 或 `显式系数（3×6bit）+ 使用标志`。',
    '- 上行端应用新系数后发带"已更新"标志的 TS；下行端评估眼图/误码，继续请求或确认完成。',
    '- 每个 Phase 有独立超时；超时 → 重试或放弃 EQ（降级速率）。',
    '**验证关注**：',
    '- 系数合法性检查（越界系数请求 → 对端拒绝/保持旧值）。',
    '- 请求-应用-确认的握手完整性（丢一步 → 超时路径）。',
    '- Retimer 透明转发不破坏 EQ 握手时序。',
    '- Gen5→Gen6 速率切换时 preset 空间切换（NRZ preset ≠ PAM4 preset）。'
  ].join('\n'),
  verify: '把 EQ 做成独立 agent：可注错（非法系数、超时不响应、中途反悔），覆盖每个 Phase 的成功/超时/回退全路径。'
},
{
  id: 'k-m8-05', module: 'm8', title: 'Loopback 状态机与合规测试应用',
  tags: ['Loopback', '合规', 'BERT', '深度'],
  body: [
    '**进入流程**：主设备在 TS1 中置 Loopback 位发送 → 从设备回带 Loopback 位的 TS1/TS2 确认 → 双方进入 Loopback.Active：主发已知 pattern，从设备逐 bit 回环。退出需交换带 Exit 标志的 TS。',
    '**两种环回路径**：',
    '- **内部环回（near-end）**：PHY 内部 TX→RX 短接，隔离数字逻辑验证。',
    '- **远端环回（far-end）**：对端设备回环，覆盖完整信道（含 Retimer）。',
    '**合规测试用法**：PCI-SIG 一致性测试中，被测设备被置入 Loopback，测试仪（BERT）注入 PRBS/合规 pattern 测眼图、抖动容限、BER。近端/远端环回组合定位问题在 PHY 数字、模拟前端还是信道。',
    '**验证角色**：RTL 验证中 Loopback 用例相对简单（状态覆盖 + 数据回环一致性）；但**要验证异常退出**——环回中掉电/复位/对端消失，必须能干净退出不留悬挂状态。',
    '**Gen6 差异**：PAM4 下 BER 测试需要考虑符号错误统计（不是纯 bit），Retimer Folio Flit 在环回中的处理也要覆盖。'
  ].join('\n'),
  verify: 'Loopback 状态覆盖（Entry/Active/Exit + 异常退出）；回环数据一致性 checker。'
},
{
  id: 'k-m9-03', module: 'm9', title: 'TLP 前缀体系与 PASID',
  tags: ['前缀', 'PASID', '扩展', '深度'],
  body: [
    'TLP 前缀是"附加在 TLP 头前面的可选字段"，分两类：',
    '- **End-End Prefix**：端到端有效，中间代理不得修改/删除（如 PASID 前缀——进程地址空间标识，配合 SVA/SVM 让多个进程共享一个设备）。',
    '- **Local Prefix**：逐跳处理（如某些路由/多播语义前缀）。',
    '**PASID 工作机制**：设备驱动为每个进程绑定 PASID → 设备发出的 TLP 带 PASID 前缀 → IOMMU 按 PASID 查对应页表 → 不同进程的同一设备 DMA 互相隔离。AI 场景（多进程共享加速器）的刚需。',
    '**与 Gen6 的关系**：FLIT 模式下前缀随 TLP 一起装配进 FLIT 净荷；前缀数量有上限（规范定义最大前缀数），装配算法需处理"头 + 前缀 + 数据"的布局。',
    '**验证关注**：前缀存在/缺失的排列组合、非法前缀顺序、前缀与 ECRC 的覆盖关系、PASID 空间耗尽行为。'
  ].join('\n'),
  verify: 'SVA/参考模型把前缀当一等公民解析；跨 IOMMU 的端到端用例（PASID 隔离正确性）属于系统级验证。'
},
{
  id: 'k-m9-04', module: 'm9', title: 'UIO 语义深入：放松了什么、保留了什么',
  tags: ['UIO', '排序', '语义', '深度'],
  body: [
    '**经典排序的瓶颈回顾**：Cpl 不得越过 Posted 写（同 TC 同路径）——在多路径 fabric 中，一条慢路径的 Posted 写会拖住所有后续 Cpl，并行度被串行化。',
    '**UIO 的放松**：允许被显式标记的 IO 流（UIO 流）相对其他事务乱序转发，包括跨路径。交换器可自由重排 → 聚合吞吐显著提升。',
    '**保留的约束**（不能放松的部分）：',
    '- UIO 流内部的顺序仍需保证（同一流内不得乱序，除非进一步子语义）。',
    '- 与**缓存一致性**交互的边界：UIO 语义假定上层（驱动/软件）保证一致性与同步——乱序可见性由软件 fence 管控。',
    '- 非 UIO 设备完全无感：能力协商失败 → 全部回退经典排序。',
    '**与 Relaxed Ordering 的区别**：RO 只放松个别"写-写"限制且作用域同路径；UIO 是跨路径的、成体系的乱序框架，且引入显式的流标记/能力协商。',
    '**验证重点**：',
    '- 排序 checker 必须参数化（UIO 能力协商结果 → 套用不同规则矩阵）。',
    '- 乱序转发下 scoreboard 的比对策略：按流（flow）归序后再比对，而不是全局时序。',
    '- 上层一致性：乱序到达的写对软件的可见顺序（配合内存屏障语义的用例）。'
  ].join('\n'),
  verify: '双拓扑用例：单路径（UIO 无收益但无副作用）+ 交换 fabric 多路径（乱序转发发生），各配排序矩阵 checker。'
},
{
  id: 'k-m10-07', module: 'm10', title: '双视角参考模型设计（TLP↔FLIT）',
  tags: ['参考模型', 'scoreboard', '架构', '深度'],
  body: [
    '**架构**：两个独立模型 + 两个比对点。',
    '- 发送侧模型 `tlp2flit`：输入 TLP 流（含属性/长度/ECRC），输出 FLIT 字节流。内含装配算法（见 M3 伪代码）、CRC 计算器、序列/确认记账。',
    '- 接收侧模型 `flit2tlp`：输入 FLIT 符号流（monitor 从 PHY 接口采集），先模拟 FEC 纠错（可选：简化为"按注错清单改写"），再 CRC 判决、解包还原 TLP 流。',
    '- **比对点 1（flit 边界）**：模型 FLIT 字节流 vs DUT FLIT 流逐字节一致。',
    '- **比对点 2（TLP 边界）**：还原出的 TLP 流与原始激励一致（顺序按排序规则归序后比对）。',
    '**为什么两个都要**：只比对 TLP 流会漏掉"FLIT 打包错误但 TLP 恰好可还原"的 bug（如非法 pad、错位的 Link Control 搭载）；只比对 FLIT 流会在有合法重传/纠错时误报。双比对点 = 高灵敏度 + 低误报。',
    '**注错感知**：模型必须知道注错 agent 注入了什么（通过 analysis port 订阅），否则把"被注错的正确行为"判为 mismatch。',
    '**实现建议**：SystemVerilog DPI 调 C/Python 模型，或纯 SV 实现（可控性好）；模型代码与 checker 解耦，方便移植到 emulation。'
  ].join('\n'),
  verify: '模型自测：先用模型生成的 FLIT 流喂 flit2tlp，应无损还原——模型自身的金标准测试。'
},
{
  id: 'k-m10-08', module: 'm10', title: 'SVA 断言库扩展（Gen6 协议检查清单）',
  tags: ['SVA', '断言', '清单', '深度'],
  body: [
    '协议层断言建议清单（挂在 monitor 信号上，与实现解耦）：',
    '```',
    '// 1. FLIT 节奏恒定（空闲期）',
    'property p_flit_rate;',
    '  @(posedge clk) (idle_mode) |=> (flit_start == $past(flit_start) + FLIT_PERIOD);',
    'endproperty',
    '',
    '// 2. 不可纠错误必触发重传（First Retry 预算内）',
    'property p_retry_latency;',
    '  @(posedge clk) (fec_fail && crc2_fail) |-> ##[1:RETRY_BUDGET] retry_req;',
    'endproperty',
    '',
    '// 3. 可纠错误不得触发重传',
    'property p_fec_no_retry;',
    '  @(posedge clk) (fec_corrected && !crc2_fail) |-> ##[1:8] !retry_req;',
    'endproperty',
    '',
    '// 4. credit 不透支（共享池）',
    'property p_pool_no_overdraft;',
    '  @(posedge clk) 1 |-> (sum_granted - sum_returned) <= POOL_SIZE;',
    'endproperty',
    '',
    '// 5. L0p 切换边界 FLIT 完整（用计数器比对该 FLIT 的字节数）',
    '// 6. 重传序列号单调不减',
    '// 7. LTSSM 非法转移（用 fsm 状态编码的合法转移表驱动）',
    '// 8. NULL flit 只出现在空闲或填充位置',
    '```',
    '**落地建议**：断言库按模块分文件管理，与覆盖组一一对应（断言失败 → 自动标记覆盖 bin 为 fail 而非 pass）。'
  ].join('\n'),
  verify: '断言密度指标：每个协议特性至少 1 条 end-to-end 断言 + 若干局部断言；仿真报告里断言通过率单独统计。'
},
{
  id: 'k-m10-09', module: 'm10', title: '功能覆盖组：SystemVerilog covergroup 实例',
  tags: ['覆盖率', 'covergroup', '代码', '深度'],
  body: [
    '```',
    'covergroup cg_err @(posedge clk);',
    '  cp_type: coverpoint err_type { bins corr[]  = {FEC_CORR, CRC1_ONLY};',
    '                                 bins uncorr = {FEC_UNCORR}; }',
    '  cp_count: coverpoint err_count { bins one   = {1};',
    '                                   bins few   = {[2:7]};',
    '                                   bins edge  = {8};      // RS 纠错上限',
    '                                   bins over  = {[9:16]}; }',
    '  cp_state: coverpoint ltssm_state { bins l0 = {L0}; bins l0p = {L0P};',
    '                                     bins rec = {RECOVERY}; }',
    '  cx_err_x_state: cross cp_type, cp_count, cp_state {',
    '    // 忽略不可达组合，防止假覆盖',
    '    ignore_bins invalid = binsof(cp_state) intersect {RECOVERY}',
    '                        && binsof(cp_count) intersect {[1:16]}; }',
    'endgroup',
    '',
    'covergroup cg_flit @(posedge clk);',
    '  cp_type: coverpoint flit_type { bins all[6] = {OH, SH, DP, LC, RF, NL}; }',
    '  cp_fill: coverpoint fill_ratio { bins empty  = {0};',
    '                                   bins part[] = {[1:99]};',
    '                                   bins full   = {100}; }',
    '  cx: cross cp_type, cp_fill;',
    'endgroup',
    '```',
    '**收敛技巧**：cross bins 过多是假覆盖的重灾区——用 `ignore_bins` 明确排除不可达组合；对 `part[]` 这类大区间用采样统计而不是穷举 bin。'
  ].join('\n'),
  verify: '每个 covergroup 与验证计划条目双向追溯：计划里的每一行都能指到具体 bin，反之亦然。'
},
{
  id: 'k-m10-10', module: 'm10', title: '形式验证在 PCIe 6.0 中的切入点',
  tags: ['formal', '等价性', '深度'],
  body: [
    '仿真穷不尽的组合，formal 可以在某些局部"证完就走"：',
    '- **FEC 译码器等价性**：RS 译码器 RTL vs 高层 C 模型，枚举全部错误模式（1~8 错位置组合是有限的、可证尽的）——天然的 formal 题。',
    '- **CRC 覆盖域**：断言"任何单 bit/双 bit 差异必然导致 CRC 变化"（CRC 的数学性质），证 CRC 实现与规范多项式一致。',
    '- **FLIT 装配器协议合规**：把装配规则（不跨边界、pad 合法、NULL 节奏）写成性质，证 RTL 在任意 TLP 输入序列下不违反。',
    '- **流控不变式**：`consumed ≤ granted`、池不透支——对任意 credit 归还时序成立（归纳证明，不怕 corner case 漏掉）。',
    '- **LTSSM 死锁自由**：从任意合法状态出发总能到达 L0 或报错（活性性质需要 fairness 约束，难度较高但价值大）。',
    '- **仲裁公平性**：共享池的保底约束——NP/Cpl 不会被 P 无限饿死。',
    '**落地顺序建议**：先做 FEC/CRC 这类"纯函数型"单元（ROI 最高），再做装配器/流控这类"有状态"的（需要好的抽象模型），LTSSM 活性放最后。'
  ].join('\n'),
  verify: 'formal 通过的模块在仿真回归里可以降权（不必重复轰炸 corner），把仿真资源挪到系统集成场景。'
},
{
  id: 'k-m10-11', module: 'm10', title: '性能验证与 emulation 场景设计',
  tags: ['性能', 'emulation', 'QoS', '深度'],
  body: [
    '功能正确 ≠ 性能达标。6.0 性能验证的量化指标：',
    '- **吞吐**：x16 满配、大 payload 顺序流的目标吞吐（理论 ~121 GB/s 单向，打 8~9 折合理）；小 payload 随机流的有效吞吐。',
    '- **时延**：TLP 端到端延迟分布（P50/P99）；First Retry 引入的时延抖动上界；L0p 收缩/恢复的过渡时延。',
    '- **QoS**：多 TC 场景下高优先级 TC 的时延保障（VC 调度策略验证：严格优先级/WFQ 行为符合设计）。',
    '- **并发**：tag 用尽场景（1024 个 outstanding 读）的行为与恢复。',
    '**emulation/FPGA 场景**：RTL 仿真跑不动 10^9 量级事务，性能与长稳靠 Palladium/Zebra/P Protium 类平台：',
    '- 用真实软件栈（驱动 + 应用）跑长稳，抓偶发挂死。',
    '- 信道/PHY 用虚拟化或 FPGA 原型替代，协议层全 RTL。',
    '- 性能计数器（吞吐/延迟直方图）作为 IP 的验证交付物之一，从 RTL 就要设计好。',
    '**回归策略**：性能用例单独成 suite，指标用断言/后处理脚本判定，趋势入库（每次提交对比基线）。'
  ].join('\n'),
  verify: '性能指标断言化：`throughput >= X && p99_latency <= Y`，让性能回归能进 CI 门禁。'
},
{
  id: 'k-m10-12', module: 'm10', title: 'Gen6 项目常见 Bug 模式 Top 10',
  tags: ['bug', '经验', '清单', '深度'],
  body: [
    '从业界 6.0/高速 IP 项目反复出现的 bug 模式中提炼（验证计划应针对性加检查）：',
    '1. **FLIT 打包边界**：差 1 字节放不下时的 pad/等待实现错——最高频。',
    '2. **CRC 覆盖域错位**：CRC-1/2 的覆盖边界与规范差一个字段，正常流测不出，特定长度才触发。',
    '3. **FEC 误纠不拦截**：错误被"纠"成另一个值后 CRC-2 漏检（兜底断言缺失导致漏测）。',
    '4. **模式切换残留**：32↔64 GT/s 切换后旧模式的 FIFO/状态残留污染新流。',
    '5. **L0p 竞态**：收缩请求与重传/流控更新同周期到达的仲裁漏洞。',
    '6. **credit 归还丢失**：异常路径（丢弃、重传）中归还计数器少加一次 → 逐渐饿死（长稳才暴露）。',
    '7. **EQ 超时参数**：Phase 超时用仿真值写成硅后值，或反之；降速回退路径死循环。',
    '8. **poisoned TLP 处理**：EP=1 的 TLP 被当成正常数据交付（缺 poison 传播 checker）。',
    '9. **跨代协商**：与 Gen5 对端互操作时能力位误读（自家 IP 自测永远发现不了）。',
    '10. **性能计数器溢出**：64bit 计数器截断/复位语义错，硅后性能数据不可信。',
    '',
    '共性：**都与边界/异常路径相关，正常通路全部绿灯**。这验证了"6.0 验证价值在错误处理"的判断。'
  ].join('\n'),
  verify: '把 Top 10 直接转成 10 个定向用例文件夹，作为新项目验证计划的起点。'
},
{
  id: 'k-m11-04', module: 'm11', title: '规范章节地图与精读路线',
  tags: ['spec', '阅读', '地图', '深度'],
  body: [
    'PCIe Base Specification 的组织方式（各代特性以 ECN 或版本增量融入正文）：',
    '- **事务层章节**：TLP 格式（Header 图、Fmt/Type 表）、流控、排序规则、TLP 前缀、AtomicOp、UIO（6.1 增补）。',
    '- **数据链路章节**：DLLP、Ack/Nak/Replay、初始化流控；**6.0 在此章节大幅改写**：FLIT 模式、FEC、双 CRC、First Retry。',
    '- **物理层章节**：有序集（TS1/TS2）、LTSSM、均衡（EQ）、Loopback；6.0 增补 PAM4 信令、PAM4 preset、L0p。',
    '- **电源管理章节**：D/L 状态、ASPM、PME；L0p 的协议细节分布在此与物理层章节。',
    '- **配置/软件章节**：配置空间、capability、ECAM 相关（部分在系统章节）。',
    '- **附录**：时序参数表、事务排序矩阵、合规模式定义——验证工程师最常翻的三个附录。',
    '',
    '**精读路线（对应本系统模块）**：',
    '1. 先读各章 Overview + 协议栈图（对应 M1/M2）。',
    '2. FLIT/FEC/First Retry 小节逐字读（对应 M3/M5）——6.0 的灵魂。',
    '3. EQ 与 L0p 小节（对应 M6/M8）。',
    '4. 排序矩阵附录对照 M9 的 UIO。',
    '5. 时序参数附录边读边做进表格（断言/超时用例的参数来源）。',
    '',
    '提醒：本系统的卡片是"导航图"，规范原文才是"法律条文"——两者对照阅读，发现出入以规范为准。'
  ].join('\n'),
  verify: '读规范时给每节标注"已验证/未验证"——未验证章节就是下一个用例清单。'
},

/* ================= M12/M13：VIP 实战与样片定位 ================= */

{
  id: 'k-m12-01', module: 'm12', title: '主流 PCIe VIP 生态对比',
  tags: ['VIP', '生态', 'Synopsys', 'Cadence'],
  body: [
    '商用 PCIe VIP 按能力维度对比（具体型号/版本能力以厂商最新文档为准）：',
    '- **Synopsys DesignWare VIP（VC/VM）**：协议覆盖最全（Gen1~Gen6/ CXL），提供 Active/Passive 组件、错误注入框架、软件测试套件（VTSA?），与 VCS/Verdi 生态无缝；新特性（L0p/UIO）跟进最快。',
    '- **Cadence VIP（Denali）**：与 Xcelium/Maxim? 生态集成好，协议检查严格，提供 C 模型接口与纯软件仿真模式。',
    '- **Avery 等其他厂商**：性价比路线，部分厂商在特定接口（如 AER/PLDA 语义）有特色。',
    '- **开源/自制 BFM**：适合前期 bring-up 与小团队；协议覆盖和注错能力远不及商用 VIP——6.0 项目强烈建议商用 VIP（错误处理矩阵无法手写穷举）。',
    '',
    '**选型关注维度**：协议版本支持（6.0/6.1 全特性？）、注错 API 粒度（符号级/TLP 级/时序级）、passive monitor 独立性（能否挂现有设计）、软件模型（后门配置/BIOS 仿真）、性能建模（带宽/延迟统计）、与自家验证环境的可移植性。'
  ].join('\n'),
  verify: 'VIP 能力调研做成 checklist 进验证计划：每个验证主题对应 VIP 的哪个组件/API，缺口的自行开发补齐。'
},
{
  id: 'k-m12-02', module: 'm12', title: 'VIP bring-up Checklist',
  tags: ['VIP', 'bring-up', '清单'],
  body: [
    '新项目接入 VIP 的标准步骤（按序，每步可回归）：',
    '- **环境骨架**：VIP 组件例化（active device/host）+ 时钟复位 + 接口对齐（PCLK/PIPE/PHY 接口形态选对）。',
    '- **参数对齐**：GT/s 目标、链路宽度、MaxPayload/MaxReadRequest、VC 数、ASPM 能力——与 DUT 配置空间能力**双向一致**（不一致是最常见的 bring-up 假失败）。',
    '- **训练通路**：先跑最低速率训练通过（2.5 GT/s），再逐级打开速率/均衡；VIP 的 EQ 协作模式（自动/手动 preset）先自动化后调试。',
    '- **基础事务**：MemRd/Wr、ConfigRd/Wr 走通 → scoreboard 数据一致。',
    '- **错误路径解锁**：确认 VIP 的注错接口默认关闭、检查器（checker）等级从宽松到严格逐级收紧。',
    '- **回归化**：参数化序列 + makefile/regression 接入；每次 VIP 版本升级做差异回归。'
  ].join('\n'),
  verify: 'bring-up 每步的通过判据写成文档，避免"看起来通了"——训练通过 ≠ 事务正确。'
},
{
  id: 'k-m12-03', module: 'm12', title: '注错能力实战：错误矩阵构建',
  tags: ['VIP', '注错', '错误矩阵'],
  body: [
    '商用 VIP 的注错 API 通常覆盖以下维度（按层）：',
    '- **PHY/符号级**：symbol 位翻转、burst 错、乱序、SKP 插入异常、EIOS 丢失。',
    '- **链路帧级**：LCRC/CRC 破坏、序列号跳变、DLLP/FLIT 丢弃/重复/延迟、Replay 破坏、credit 破坏（超发/少还）。',
    '- **事务级**：ECRC 破坏、poison 置位、排序违规（RO/IDO 越界）、Completion 异常（超时/错误状态/部分返回）。',
    '- **时序级**：Ack 延迟超限、UpdateFC 超时、FC 归还拖延、Recovery 请求插入时机。',
    '',
    '**错误矩阵构建方法**：行=错误类型（穷举 API 能力），列=注入时机（L0/L0p/训练中/切换中）与注入参数（数量/位置/重复次数）——每格一个用例；用例体 = VIP 注错 API + 期望行为检查（纠错/重传/升级）+ 数据一致性断言。**把 VIP 文档的注错清单当生成矩阵的输入**，不要凭想象写。'
  ].join('\n'),
  verify: '矩阵自动化：参数化 sequence + config_db 驱动注入类型，一条 base test 扫全矩阵。'
},
{
  id: 'k-m12-04', module: 'm12', title: 'VIP+UVM 集成经验',
  tags: ['VIP', 'UVM', '集成'],
  body: [
    '- **配置传递**：VIP 配置对象经 config_db 下发，集中在 env 层配置文件/测试参数统一管理，禁止散落在 sequence 里改。',
    '- **回调/钩子**：错误注入走 VIP 的 callback/API 而非改源码——升级不崩；把注错点抽象成自己的 error_agent，正交于激励。',
    '- **连接**：VIP analysis port → 自家 scoreboard/coverage；TLP 级与 flit 级双订阅点都要接。',
    '- **寄存器模型**：VIP 的 reg model（若有）与 DUT reg model 的 adapter 对齐；配置空间读写经 VIP 后门加速 bring-up。',
    '- **序列分层**：VIP 自带 sequence 库（合规/边界）当素材，业务序列继承或封装；混合负载场景用 virtual sequence 调度两类 agent。',
    '- **版本管理**：VIP 版本与 DUT 特性清单绑定（如"L0p 支持从 vX.Y 起"），升级走独立分支回归。'
  ].join('\n'),
  verify: '集成完成标志：全部 checker 开到最严 + 全部注错 API 可用 + 覆盖率直通无死角。'
},
{
  id: 'k-m12-05', module: 'm12', title: 'VIP 使用常见坑 Top 8',
  tags: ['VIP', '坑', '经验'],
  body: [
    '1. **参数不一致假失败**：DUT 与 VIP 的能力配置差一位（MPS/宽度），训练反复失败——先对配置再查协议。',
    '2. **超时太短**：仿真里重训练/重均衡时间被低估，VIP 超时报错——用规范下限再放余量。',
    '3. **复位后残留**：VIP 未做干净复位（状态机/credit 记账残留），第二遍训练行为诡异——每个用例独立复位并校验 VIP 内部状态清零。',
    '4. **EQ 协作模式用错**：自动 EQ 与 DUT 的手动调试互相干扰；调试期切手动 preset。',
    '5. **乱序期望写死**：VIP 乱序交付时 scoreboard 按序比对误报——按排序规则归序再比（见 M10 参考模型卡）。',
    '6. **低功耗响应缺失**：DUT 发 L1 请求 VIP 不应答挂死——VIP 的 PM 响应模式要显式使能。',
    '7. **注错忘了关**：注错用例跑完未清理，后续用例全挂——注入范围限定在单 sequence 生命周期内。',
    '8. **checker 等级一刀切**：bring-up 期全严导致噪声淹没问题；分阶段收紧。'
  ].join('\n'),
  verify: '坑清单当回归诊断手册：失败先查这 8 条再深挖。'
},
{
  id: 'k-m12-06', module: 'm12', title: 'VIP 性能与压力测试用法',
  tags: ['VIP', '性能', '压力'],
  body: [
    '- **带宽**：VIP 连续大 payload 单向流 + 统计接口读有效带宽；关注 DUT 的 credit 归还节奏对吞吐的影响（对照 M7）。',
    '- **时延**：时间戳打在 TLP 级（读写分开统计）；Cpl 延迟分 RC 读/Peer 读；重传/纠错事件单独标记延迟分布。',
    '- **反压建模**：VIP 侧可控的 credit 收缩/归还延迟 → 构造 DUT 内部 buffer 高水位场景。',
    '- **压力组合**：多 VC 混合负载 + 注错低概率穿插 + 功耗状态切换（L0p/L1）——长稳跑 emul 或 VIP 加速模式。',
    '- **统计交付**：吞吐/延迟/重传率三组直方图作为回归基线入库，性能回归对比趋势而非单点。'
  ].join('\n'),
  verify: '性能指标进 CI 门禁：超标即 fail，防止性能静默劣化。'
},

{
  id: 'k-m13-01', module: 'm13', title: '硅后 debug 方法论与工具链',
  tags: ['样片', 'debug', '方法论'],
  body: [
    '（本模块案例为综合业界常见失败模式整理的教学案例，用于建立 debug 思维，非特指某公司项目。）',
    '',
    '**症状四大类与第一响应**：',
    '- **训练类**（链路起不来/降级）→ 抓训练波形（分析仪/内置 trace）+ 看 LTSSM 停驻状态 + 电气参数（眼图/幅度）。',
    '- **数据类**（CRC 错/重传/静默丢数据）→ 链路层计数器（纠错/重传/margin）+ 错误是否随温度/负载/速率变化。',
    '- **配置类**（枚举丢设备/寄存器异常/中断异常）→ 配置空间 dump 对比 + 枚举过程 trace + FLR/热插拔时序。',
    '- **功耗类**（L1.2 挂死/唤醒失败/功耗异常）→ CLKREQ/PM 信号波形 + 状态机停留 + 平台协同配置。',
    '',
    '**工具链**：协议分析仪（训练/事务级）、BERT/margin 扫描（电气余量）、JTAG/片上 trace（内部状态）、温度箱（应力相关）、软件寄存器 dump（配置态）。**先分类再动手**——四类问题的工具链和假设树完全不同。'
  ].join('\n'),
  verify: 'debug 报告模板：症状/分类/假设树/证据/根因/修复/回归项——每个案例都填全。'
},
{
  id: 'k-m13-02', module: 'm13', title: '案例 1：训练卡死在 Polling',
  tags: ['样片', '案例', '训练'],
  body: [
    '**现象**：上电后链路起不来，LTSSM 停在 Polling.Active，重试若干次后降级或超时。',
    '**定位路径**：① 分析仪抓两侧 TS 交换 → 发现一端 TS1 收不到或符号错率极高；② 查电气：TX 幅度/去加重、极性反转配置、AC 耦合；③ 查配置：lane 反转/极性配置位与板级走线一致性。',
    '**根因（典型模式）**：lane 极性反转配置与 PCB 走线不符（高速走线为省过孔常交叉）；或 TX 输出摆幅配置错误导致眼图全闭。',
    '**修复**：配置位纠正/幅参数修正；板级问题改板前用可编程极性兜底。',
    '**验证启示**：极性/反转变量在 RTL 验证阶段就要全覆盖（仿真里配错只是"通不过训练"，硅后就是训不出来）；训练失败自动降级路径要可观测。'
  ].join('\n'),
  verify: '把 lane 极性反转、通道交换（x4 反接）做成验证的强制覆盖项。'
},
{
  id: 'k-m13-03', module: 'm13', title: '案例 2：EQ 后偶发 CRC 错',
  tags: ['样片', '案例', '均衡'],
  body: [
    '**现象**：训练/均衡通过，高负载下偶发 LCRC 错（每 1e9 符号几个），重传正常但吞吐下降 5%。',
    '**定位路径**：① margin 扫描（眼高/眼宽余量）→ 发现均衡后眼图余量偏小；② 分析仪回放 EQ 过程 → 确认选中的 preset 非最优；③ 温度/电压拉偏复现 → 余量随条件恶化。',
    '**根因（典型模式）**：均衡收敛到了局部次优点（EQ 演算法在多极值环境中收敛过早），叠加工艺角偏慢，余量不足。',
    '**修复**：EQ 重试策略调参（允许更多 preset 尝试）、引入 margin 反馈的 preset 微调、必要时手动指定 preset。',
    '**验证启示**：RTL 验证要覆盖"EQ 结果次优"场景（模拟非理想信道 + 强制次优 preset），确认降级余量下的行为（性能下降而非失效）；margin 扫描接口设计阶段就要留。'
  ].join('\n'),
  verify: '信道模拟 + 非理想均衡结果注入，验证系统在"差但合法"链路上的鲁棒性。'
},
{
  id: 'k-m13-04', module: 'm13', title: '案例 3：高温下掉链路',
  tags: ['样片', '案例', '温度'],
  body: [
    '**现象**：常温全绿，温箱 85°C+ 高负载运行数小时后偶发掉链（进 Recovery 后训练失败或数据错）。',
    '**定位路径**：① 温度相关性确认（降温复现消失）；② 掉链瞬间抓波形 → 判断是电气失锁（symbol 错暴涨）还是状态机问题；③ 分离器件/信道/封装因素（换板/换芯片对比）。',
    '**根因（典型模式）**：高温下 TX 输出摆幅/Jitter 恶化 + DFE 自适应跟踪不及时；或封装/信道插损随温度漂移超出训练余量。',
    '**修复**：温度补偿参数、自适应重新均衡触发条件（错误率阈值触发重 EQ）、散热优化。',
    '**验证启示**：RTL 阶段做"参数漂移注入"（均衡参数随仿真时间缓慢劣化），验证自适应重训练的触发与收敛；温箱回归是 silicon 必做项。'
  ].join('\n'),
  verify: '重 EQ 触发阈值（错误率/持续时间）的覆盖与迟滞（防反复震荡）验证。'
},
{
  id: 'k-m13-05', module: 'm13', title: '案例 4：Replay 风暴导致带宽骤降',
  tags: ['样片', '案例', '重传'],
  body: [
    '**现象**：特定负载下带宽从标称值掉 30%+，链路层重传计数高企（replay 风暴），但无硬错误。',
    '**定位路径**：① 分析仪统计重传触发原因（Nak vs 超时）→ 超时为主；② 看 ACK 返回时序 → ACK 被 DUT 内部某级延迟阻塞；③ 结合 DUT 内部 trace 定位阻塞点（credit 检查/仲裁）。',
    '**根因（典型模式）**：Replay Timer 超时参数与实际 ACK 路径延迟不匹配（配置成规范下限但 ACK 合并策略延迟偏大），超时触发全量重传 → 带宽塌陷。',
    '**修复**：Timer 参数按链路实际延迟校准；ACK 处理路径优化；必要时自适应 timer。',
    '**验证启示**：参数类 bug（timer/阈值）在 RTL 验证要用**规范边界值双向扫**（min/max）；性能回归必须包含重传敏感负载。'
  ].join('\n'),
  verify: 'ACK 延迟参数扫描用例族：确认各延迟下不误触超时。'
},
{
  id: 'k-m13-06', module: 'm13', title: '案例 5：L1.2 唤醒挂死',
  tags: ['样片', '案例', '低功耗'],
  body: [
    '**现象**：进入 L1.2 后偶发无法唤醒，链路死在电气空闲，需要复位恢复；概率低、难复现。',
    '**定位路径**：① 抓 CLKREQ#/PERST# 等 PM 信号时序 → 对照规范时序参数；② 平台侧（BIOS/RC 配置）与 EP 配置对比 → 发现双方 L1.2 子状态使能/时序参数不一致；③ 复现最小化：特定进入/退出序列 + 特定时序窗口。',
    '**根因（典型模式）**：CLKREQ 唤醒握手时序在临界窗口（一方提前/滞后于规范窗口），或平台与 EP 的 L1.2 子状态协商不一致导致唤醒流程分歧。',
    '**修复**：时序参数对齐 + 唤醒超时兜底路径 + 协商一致性检查。',
    '**验证启示**：低功耗验证必须做**平台协同**（RC+EP 联合）与**时序边界扫描**（在规范窗口边界注入扰动）；挂死类 bug 的兜底路径（超时复位）要有断言覆盖。'
  ].join('\n'),
  verify: 'L1.2 唤醒时序扰动扫描（±20% 窗口）+ 兜底路径断言。'
},
{
  id: 'k-m13-07', module: 'm13', title: '案例 6：枚举阶段丢失设备',
  tags: ['样片', '案例', '枚举'],
  body: [
    '**现象**：拓扑里有设备偶尔枚举不到（热插拔或重启后概率出现）， BIOS/OS 层面表现为设备消失。',
    '**定位路径**：① 复现时抓配置事务 trace → CfgRd 无响应（Master Abort）或返回异常；② 查设备侧：收到 CfgRd 时的状态（FLR 进行中？未就绪？）；③ 查桥的窗口配置（总线号/地址窗口）。',
    '**根因（典型模式）**：FLR（Function Level Reset）期间设备不响应配置访问，而软件枚举与 FLR 完成时序竞争；或热插拔后桥窗口未及时更新。',
    '**修复**：枚举前等待 FLR 完成（软件时序）；设备侧 FLR 期间按规范要求响应（规范允许在 FLR 100ms 内完成）；桥窗口更新时序修正。',
    '**验证启示**：FLR 与配置访问的竞争用例（枚举/FLR/热插拔交织）是必测项；Master Abort 与设备无响应的区分要可观测。'
  ].join('\n'),
  verify: 'FLR×枚举×热插拔交织场景进回归；FLR 100ms 时序断言。'
},
{
  id: 'k-m13-08', module: 'm13', title: '案例 7：高负载下 Completion 超时',
  tags: ['样片', '案例', 'Completion'],
  body: [
    '**现象**：大压力测试中读请求偶发 AER Completion Timeout 报错，重试后成功；请求量越大概率越高。',
    '**定位路径**：① 先区分"真丢"还是"慢"：分析仪看 CplD 是否最终返回 → 返回了但晚于超时；② 慢的原因：DUT 内部某类 buffer 占满导致 Cpl 排队（对照共享流控池行为）；③ 真丢的原因：Cpl 在内部被错误丢弃（对账）。',
    '**根因（典型模式）**：NP 类 credit 设置过大导致 DUT 接收 Cpl 时内部缓冲不足排队；或 Cpl 与内部 DMA 通道仲裁饥饿。',
    '**修复**：credit/buffer 配比优化；仲裁加权；软件超时时间按 P99 校准。',
    '**验证启示**：Completion 超时的验证核心是"定量"——构造可控的 Cpl 延迟分布，验证超时阈值在 P99 之外（含重传/纠错引入的尾部）。'
  ].join('\n'),
  verify: 'Cpl 延迟分布生成器 + 超时阈值边界扫描。'
},
{
  id: 'k-m13-09', module: 'm13', title: '案例 8：MSI-X 中断偶发丢失',
  tags: ['样片', '案例', '中断'],
  body: [
    '**现象**：高中断速率下软件偶发"事件发生了但没收到中断"，轮询能兜住，概率极低。',
    '**定位路径**：① 确认事件确实发生（硬件状态位置位）且软件已使能该向量；② 抓 MSI-X TLP（内存写）是否发出 → 发了但地址/数据错？没发？③ 关联硬件事件与 MSI-X TLP 的时序 → 找到窗口。',
    '**根因（典型模式）**：向量掩码更新与 pending 位设置的竞态（软件改 Mask 位时硬件恰在置 pending）；或 MSI-X TLP 与其他 posted 写乱序到 RC（排序规则边界）；或中断聚合策略丢事件。',
    '**修复**：掩码-pending 竞态的硬件互锁；关键中断绕过聚合；必要时 de-assert/re-assert INTx 语义兜底。',
    '**验证启示**：中断验证要覆盖**硬件事件×软件配置变化×链路状态**三维交织；MSI-X TLP 的地址/数据/排序逐一断言（很多团队只查"有没有中断"）。'
  ].join('\n'),
  verify: 'MSI-X TLP 内容与排序断言 + 掩码竞态定向用例。'
},

/* ================= RDMA：R1-R9 ================= */

/* ---------------- R1 体系结构与对象模型 ---------------- */
{
  id: 'k-r1-01', module: 'r1', title: 'RDMA 三种实现对比：IB / RoCEv2 / iWARP',
  tags: ['RDMA', 'IB', 'RoCEv2', 'iWARP'],
  body: [
    '| 维度 | InfiniBand（IB） | RoCEv2 | iWARP |',
    '| 网络层 | 自有 IB 链路/LRH+GRH 路由 | 以太网 + IPv4/v6 | 以太网 + IPv4/v6 + TCP |',
    '| 传输层 | IB 传输（BTH/PSN） | 同 IB 传输（BTH/PSN） | DDP/RDMAP（TCP 上） |',
    '| 无损依赖 | 天然无损（credit 流控） | 依赖 PFC/ECN 配置 | TCP 自带可靠性，无需无损网 |',
    '| 管理 | SM 子网管理器（LID/路由） | 标准以太网/IP 管理 | 同 RoCE |',
    '| 生态/部署 | HPC 顶流（专用交换机） | 数据中心主流（AI/存储） | 存量部署，新增少 |',
    '',
    '- 三者的** verbs API 相同**——应用层一致，底层网络可替换（这是 verbs 抽象的价值）。',
    '- RoCEv2 的关键设计：把 IB 传输层（可靠、无序化处理、PSN）原封不动搬到 UDP/IP 上（目的端口 4791），复用以太网生态；代价是**需要无损网络**（丢包会触发重传风暴）。',
    '- 验证视角：RoCEv2 = IB 传输语义 + 以太网/IP 环境，验证重心在两者交界（封装/ICRC/拥塞联动）。'
  ].join('\n'),
  verify: '对比表当架构评审 checklist：每个部署决策（IB vs RoCE）对应不同验证重点。'
},
{
  id: 'k-r1-02', module: 'r1', title: 'verbs 对象层级与生命周期',
  tags: ['verbs', '对象模型', 'PD'],
  body: [
    'verbs（RDMA 编程接口）的对象树：',
    '- **设备上下文**（ibv_open_device，对应一个 NIC）→ **PD（Protection Domain，保护域）**：隔离边界，其下的对象互相关联。',
    '- PD 下挂：**MR**（内存区域）、**CQ**（完成队列）、**QP**（队列对）、**SRQ**（共享接收队列）、**AH**（地址句柄，UD 用）。',
    '- 关联规则：QP 的 WQE 引用 MR（lkey），完成写入 CQ；同一 PD 的对象才能互操作；**跨 PD 访问必须经 rkey 校验**。',
    '',
    '- **控制面（slow path）**：create/modify/destroy 走内核（ibv_modify_qp 等），慢、可睡眠。',
    '- **数据面（fast path）**：post_send/post_recv/poll_cq 全用户态（kernel bypass），直接写 doorbell/MMIO——RDMA 低时延的本质。',
    '- **销毁顺序**：先销毁使用方（QP）再销毁被引用方（CQ/MR/PD），销毁 MR 时必须保证无在途访问（经典 bug 源）。',
    '',
    '验证视角：对象生命周期 = RDMA 版的"配置空间验证"——创建/修改/销毁×并发×在途访问的竞争是重点。'
  ].join('\n'),
  verify: 'MR 销毁时在途访问、QP 转换态时 modify 竞争——生命周期竞争用例族。'
},
{
  id: 'k-r1-03', module: 'r1', title: '内存注册与 MR：lkey/rkey 与访问检查',
  tags: ['MR', 'rkey', '内存', 'ODP'],
  body: [
    '**注册流程**：用户提交虚拟地址+长度 → 驱动 pin 住物理页（page lock，防换出）→ 生成 IOVA（设备可见地址）→ 硬件 MR 表记录 → 返回句柄。',
    '- **lkey**：本地访问凭据（WQE 里引用"用哪块内存"）。',
    '- **rkey**：远程访问凭据（告诉对端：可对我这块内存做 WRITE/READ/Atomic）。',
    '- **权限位**：LOCAL_WRITE / REMOTE_WRITE / REMOTE_READ / REMOTE_ATOMIC / MW_BIND——最小权限原则：没有 REMOTE_READ 就不能被对端读。',
    '',
    '**远端访问检查链**（对端发 RDMA WRITE 时 DUT 内部做的事）：VA + rkey → MR 查找（key 是否有效/匹配）→ 权限检查（REMOTE_WRITE 置位？）→ 边界检查（VA+len 不越 MR 界）→ 执行。任一步失败 → 回 NAK（含远程访问错误语义）→ 对端 CQE 报 REMOTE_ACCESS_ERR。',
    '- **MW（Memory Window）**：二段绑定——先注册大 MR，再从 MR 上开小窗口给对端（细粒度授权，窗口可单独失效）。',
    '- **ODP（On-Demand Paging）**：免 pin，访问未驻留页触发 page fault 流程（需硬件+IOMMU 支持，GPU 场景重要）。',
    ''
  ].join('\n'),
  verify: '注入矩阵：rkey 失效/过期、权限位缺失、VA 越界（首字节/末字节/整段）、MW 绑定竞争——每项验证错误码与 NAK 语义正确。'
},
{
  id: 'k-r1-04', module: 'r1', title: 'Doorbell 与 WQE 提交路径',
  tags: ['doorbell', 'WQE', '提交'],
  body: [
    '**提交流水线**（发送侧）：',
    '1. 软件把 **WQE**（Work Queue Element：opcode/参数/lkey/SGL 等）写入 SQ 环形缓冲（主机内存）。',
    '2. 软件写 **doorbell**（8B MMIO：QP 号 + SQ 中新 WQE 的索引）"按铃"通知 NIC。',
    '3. NIC DMA 读走 WQE → 按 PSN 逐个发包。',
    '4. 完成后 NIC DMA 写 CQE → 触发 MSI-X 中断（可选）。',
    '',
    '**关键顺序约束**：WQE 必须在 doorbell 之前对 NIC 可见——需要写序保证（memory barrier / write-combining 语义）。顺序错了 = NIC 读到旧数据 = 静默数据损坏（极难查）。',
    '- **批量提交**：多个 WQE 一次 doorbell（索引直接跳到最后一个）——高频小包场景的关键优化。',
    '- **DBREC**（doorbell record）：接收侧的"门铃记录"映射到主机内存，NIC 异步读取，减少 MMIO 次数。',
    '- **inline 发送**：小 payload 直接嵌在 WQE 里，省一次 DMA（IBV_SEND_INLINE，受 max_inline_data 限制）。',
    '',
    '验证视角：门铃-WQE 的顺序、批量、回卷（ring index wrap）、乱序 ring 是 NIC 验证的头部注入点。'
  ].join('\n'),
  verify: '注入：doorbell 先于 WQE 可见、重复 ring、跨 2^24? 回卷、WQE 格式错——每种验证设备端行为（容忍/报错）明确。'
},
{
  id: 'k-r1-05', module: 'r1', title: 'CQ 与完成机制',
  tags: ['CQ', 'CQE', '完成'],
  body: [
    '**CQE 字段**：WR ID（软件上下文回执）、QP 号、opcode、状态（成功/错误码）、byte_len（传输字节数）、时间戳（可选）。一次 READ 完成时 byte_len = 读回字节数。',
    '- **完成策略**：只有带 IBV_SEND_SIGNALED 的 WR 生成 CQE（未签名的省 CQ 空间但应用拿不到单 WR 完成通知——按批设计）。',
    '- **通知模式**：polling（轮询 poll_cq，最低延迟，AI/存储常用）vs 事件（req_notify_cq + comp_channel + 中断，CPU 友好）。',
    '- **arm 语义**：ARM_NEXT（下一个 CQE 通知）/ ARM_SOLICITED（下一个带 Solicited 标记的）/ ARM_ALWAYS——配错会丢通知。',
    '- **CQ Overrun**：CQE 写满又来新完成 → 严重错误：**相关 QP 转 Error**（规范要求）——poll 不及时会毁掉整个连接，这是"轮询延迟"验证的重点。',
    '- **中断合并**（interrupt coalescing）：多 CQE 聚合一次中断——降 CPU 但加延迟，可配置，验证边界。'
  ].join('\n'),
  verify: 'CQ 满注入（不 poll 灌满）→ 验证 QP Error 行为与软件恢复；arm 语义各模式丢通知边界。'
},

/* ---------------- R2 QP 状态机与传输类型 ---------------- */
{
  id: 'k-r2-01', module: 'r2', title: 'QP 四类型对比：RC / UC / UD / XRC',
  tags: ['QP', 'RC', 'UC', 'UD', 'XRC'],
  body: [
    '| 类型 | 连接性 | 支持操作 | 可靠性 | 典型场景 |',
    '| RC（Reliable Connection） | 一对一 | SEND/RDMA WRITE/READ/Atomic 全集 | ACK/重传/保序 | 通用可靠传输（默认选择） |',
    '| UC（Unreliable Connection） | 一对一 | SEND/WRITE（无 READ/Atomic） | 不保证 | 自定义可靠层场景 |',
    '| UD（Unreliable Datagram） | 无连接 | 仅 SEND | 不保证（可丢/乱序/重复） | 广播/多播、轻量探活、路由协议 |',
    '| XRC（eXtended RC） | 跨进程共享 | 同 RC | 同 RC | MPI 多进程共享，省 QP 数量 |',
    '',
    '- **UD 上限**：payload ≤ Path MTU（不分段），且 RoCEv2 下无 GRH 但需注意 Q_Key 校验；大量小消息场景 UD 效率高（无连接状态）。',
    '- **SRD**（AWS 专用 Reliable Datagram）：可靠但允许乱序，云内优化——了解即可。',
    '- **QP 数量问题**：RC 全互联 = N×(N-1) 个 QP，万节点集群爆炸；XRC/SRQ/多播是缓解手段；NIC 的 QP 上下文缓存容量是扩展性瓶颈（验证重点，见 R7）。'
  ].join('\n'),
  verify: '每类型至少一组用例；UD 的乱序/重复/丢包容忍路径单独建 case。'
},
{
  id: 'k-r2-02', module: 'r2', title: 'QP 状态机全迁移',
  tags: ['QP', '状态机', 'modify_qp'],
  body: [
    '主迁移路径：**RESET → INIT → RTR → RTS**（经 ibv_modify_qp 逐级迁移）：',
    '- **RESET**：刚创建，一切停摆（无 WQE 处理）。',
    '- **INIT**：配置阶段——可设置 P_Key? /端口/access_flags（允许哪些远端访问类型）；**RQ 可开始 post_recv**（SQ 仍不可发）。',
    '- **RTR**（Ready To Receive）：填对端信息（dest_qp、rq_psn、path_mtu、max_dest_rd_atomic、min_rnr_timer、ah_attr）→ **接收路径就绪**，可收对端发来的包。',
    '- **RTS**（Ready To Send）：填发送参数（sq_psn、timeout、retry_cnt、rnr_retry、max_rd_atomic）→ **发送路径就绪**。',
    '',
    '**运行期状态**：',
    '- **SQD（Send Queue Drained）**：排空 SQ 再改参数（限流/调度场景）。',
    '- **SQE（SQ Error）**：本地 SQ 出错，只影响 SQ，RQ 仍可工作（UC/RC 有此中间态）。',
    '- **ERROR**：致命错误态——未完成 WQE 全部以错误 CQE 刷新，必须 Reset 重建（参数全清）。',
    '- **迁移相关**：MIGrate/rearm 状态与 SM 重定向有关（IB 特有），RoCE 少用。',
    '',
    '**非法迁移**（如 RTS→INIT）必须被拒绝（EINVAL/EPERM）——验证必查。'
  ].join('\n'),
  verify: '合法迁移矩阵全覆盖 + 非法迁移拒绝 + ERROR 后 CQ 刷新顺序（先发后收？按 WQE 顺序）断言。'
},
{
  id: 'k-r2-03', module: 'r2', title: 'RTR/RTS 关键属性表',
  tags: ['RTR', 'RTS', '属性', 'timeout'],
  body: [
    '**RTR（接收侧）属性**：',
    '- `rq_psn`：期望的接收起始 PSN——**必须与对端 sq_psn 匹配**，错一个字节都全丢（最经典的 bring-up 错误）。',
    '- `path_mtu`：512/1024/2048/4096——两端可不同？不行，**必须一致**（端到端分段基准）。',
    '- `max_dest_rd_atomic`：本端能承受的并发 READ/Atomic 数（2 的幂，≤16）。',
    '- `min_rnr_timer`：本端无 WQE 时让对端等待的最小重试间隔。',
    '- `ah_attr`：对端地址（RoCE: IP/GID/DSCP/ hops；IB: LID/SL）。',
    '',
    '**RTS（发送侧）属性**：',
    '- `sq_psn`：发送起始 PSN（与对端 rq_psn 匹配）。',
    '- `timeout`：ACK 超时 = **4.096μs × 2^timeout**（编码 0~31）——0 约 4μs，20 约 72 分钟？粗算 2^20×4.096μs≈4.3s? ——**精确值以 IBTA spec Table 41/时间表为准**；常用 12~18 区间（秒级）。',
    '- `retry_cnt`：超时/NAK 重试上限（0~7），用尽 → QP Error。',
    '- `rnr_retry`：RNR 重试上限（**7 = 无限重试**）。',
    '- `max_rd_atomic`：本端发起的并发 READ/Atomic 上限（受对端 max_dest_rd_atomic 约束，取小）。',
    '',
    '**两端不匹配的后果**：PSN 不匹配 → 全部 sequence error；MTU 不匹配 → 分段错乱；rd_atomic 协商错 → 对端拒绝请求。'
  ].join('\n'),
  verify: '属性组合扫描：PSN 错配/MTU 不一致/rd_atomic 越限——验证错误报告路径而非静默异常。'
},
{
  id: 'k-r2-04', module: 'r2', title: 'RC 操作全集与 send_flags',
  tags: ['RC', 'opcode', 'send_flags'],
  body: [
    '**RC 支持的消息类型**：',
    '- **SEND**（对端 RQ 消费，需对端 post_recv 配对）：大消息按 MTU 分段为 First/Middle/Last/Only 包。',
    '- **RDMA WRITE**：直接写对端内存（带 RETH：远端 VA/RKey/DMALen），不消耗对端 RQ WQE——零拷贝核心。',
    '- **RDMA READ**：请求（RETH）→ 对端主动读自己内存发回（Response 带数据+AETH）——消耗**发起方**的 max_rd_atomic 额度。',
    '- **Atomic**：FetchAdd / CompareSwap（64b 原子操作，对端内存执行）——分布式锁/同步原语。',
    '',
    '**send_flags**：',
    '- `IBV_SEND_SIGNALED`：生成 CQE（默认策略由 SQ 语义决定：不签名则不生成）。',
    '- `IBV_SEND_INLINE`：payload 内嵌 WQE（≤max_inline_data），省 DMA。',
    '- `IBV_SEND_FENCE`：等待前序 READ/Atomic 完成才执行本条（处理 RAW 依赖）。',
    '- `IBV_SEND_SOLICITED`：对端可按 Solicited 事件策略延迟通知（大消息最后一个包常用）。',
    '',
    '**分段规则**：消息 >MTU → First + n×Middle + Last；Last 包可带 IMM；READ 无分段（响应端按 MTU 分段发送）。'
  ].join('\n'),
  verify: 'F/M/L 分段边界（=MTU/±1）、READ 并发上限（max_rd_atomic 边界）、FENCE 语义验证。'
},
{
  id: 'k-r2-05', module: 'r2', title: 'XRC 与 QP 共享机制',
  tags: ['XRC', '共享', 'MPI'],
  body: [
    '**XRC（eXtended Reliable Connection）解决什么**：MPI 多进程（rank）全互联场景下，每对进程一对 QP 会爆炸（N 进程 → N² QP）。XRC 允许**同节点的多个进程共享一组传输 QP**。',
    '- **XRC Domain**（ibv_open_xrcd）：多个进程/文件描述符的共享域，域内共享 target QP 与 SRQ。',
    '- **SRQ（Shared Receive Queue）**：多个 QP 共用接收 WQE 池——接收 buffer 按需取用，省内存（独立 QP 每个都要预挂 recv WQE）。',
    '- 发送侧：进程用 XRC 语义指定目标 TGID? （目标进程的上下文）——传输 QP 归属某进程但服务所有共享进程。',
    '',
    '**验证关注**：',
    '- 共享 SRQ 的 WQE 分配公平性（一个 QP 不得饿死其他 QP）。',
    '- 进程退出时的清理（SRQ/QP 引用计数、在途 WQE 处理）。',
    '- XRC 与普通 RC 混用时的隔离与权限。',
    '- SRQ 的 limit 触发事件（buffer 不足通知软件补充）与 RNR 的联动。'
  ].join('\n'),
  verify: 'SRQ 耗尽 → limit event → 软件补 WQE 的闭环用例；多 QP 公平性统计。'
},

/* ---------------- R3 RoCEv2 报文格式 ---------------- */
{
  id: 'k-r3-01', module: 'r3', title: 'RoCEv2 报文封装逐层解析',
  tags: ['封装', 'RoCEv2', 'ICRC'],
  body: [
    '完整封装（外到内）：**以太网帧头 → IP 头（v4/v6）→ UDP 头（目的端口 4791）→ IB 传输头（BTH [+扩展头]）→ payload → ICRC（4B）**。',
    '- **UDP 端口 4791**：RoCEv2 的协议标识——交换机/DPU 据此识别 RoCE 流量做 ECN/ECMP 处理。',
    '- **IP 层**：承载 GID 语义（RoCE GID 常由 IPv6 派生或 MAC 派生），DSCP 用于流量类映射（拥塞控制依赖它）。',
    '- **ICRC（InfiniBand CRC，4B）**：端到端保护，覆盖 **BTH 起始至 ICRC 前的全部内容**；对 IP/UDP 头的**可变字段（TTL/HopLimit、checksum 等）按规范虚零处理**——包在网络中被路由（TTL 递减）不影响 ICRC 校验（与 PCIe ECRC 同思想，端到端数据完整性）。',
    '- **MTU 关系**：一个包的 payload ≤ Path MTU；大消息按 MTU 分段（每段都是独立完整包）。',
    '',
    '**与 PCIe 类比**：BTH ≈ TLP Header，ICRC ≈ ECRC，PSN ≈ 序列号——可靠传输的思想同构，环境从 PCIe 链路换成了以太网/IP。'
  ].join('\n'),
  verify: 'ICRC 覆盖范围边界注入（翻 payload 任一 bit 必须检出）；TTL 变化不影响 ICRC 的虚零处理验证。'
},
{
  id: 'k-r3-02', module: 'r3', title: 'BTH 逐字段解析（8 字节）',
  tags: ['BTH', '字段', 'PSN'],
  body: [
    'Base Transport Header，固定 8B，每个 IB 传输包必备：',
    '| 字段 | 位宽 | 语义 |',
    '| Opcode | 8 | 操作码（见 R3 Opcode 表） |',
    '| Solicited | 1 | 请求对端按 Solicited 策略通知 |',
    '| MigReq | 1 | 迁移请求（IB 高可用） |',
    '| PadCount | 2 | 填充字节数/4（payload 对齐 4B） |',
    '| TransportHdrVersion | 4 | 版本（当前 0） |',
    '| PartitionKey | 16 | 分区键（隔离/租户，RoCE 常填 0xFFFF 绕过） |',
    '| FECN | 1 | 前向拥塞标记 |',
    '| BECN | 1 | 反向拥塞标记 |',
    '| Reserved | 6 | — |',
    '| Destination QP | 24 | 目标 QP 号（24bit 空间，QP0=SM、QP1=GSI 管理保留） |',
    '| AckRequest | 1 | 要求接收方立即回 ACK |',
    '| Reserved | 7 | — |',
    '| PSN | 24 | 包序列号（回绕于 2^24） |',
    '',
    '**验证要点**：P_Key 校验失败 → 丢包（隔离生效）；AckRequest 语义（置位必须即时 ACK）；PSN 回绕处理（0xFFFFFF→0x000000 连续性）；FECN/BECN 与 ECN 的联动（RoCEv2 复用 IP ECN，BTH 内的 FECN/BECN 在 RoCE 下用法有限）。'
  ].join('\n'),
  verify: '24bit PSN 回绕边界用例（0xFFFFFE/FFFFFF/000000 连续流）必须有。'
},
{
  id: 'k-r3-03', module: 'r3', title: 'DETH 与扩展头（RETH/AETH/IMM/Atomic）',
  tags: ['DETH', 'RETH', 'AETH', '扩展头'],
  body: [
    '**DETH（Datagram Extended Transport Header，8B）**：UD 包专用——`Q_Key(32) + Source QP(24) + Reserved(8)`。Q_Key 校验：目标 QP 是"特权 QP"（管理类）时要求 **Q_Key = 0x80010000**（特权值），普通 QP 任意（但对端校验其注册的值）。',
    '**扩展头按 opcode 出现**（紧跟 BTH 之后）：',
    '- **RETH（RDMA Extended Transport Header，12B）**：RDMA WRITE/READ 请求携带——`VA(64) + RKey(32) + DMALen(32)`，指定远端内存位置。',
    '- **AETH（ACK Extended Transport Header，4B）**：ACK/READ Response 携带——`MSN(24) + Credit(8)`。MSN = 已确认完成的消息数-1；Credit = 对端可用的 RDMA READ/Atomic 额度归还信息（0xF 编码"不变"）。',
    '- **ImmDt（Immediate Data，4B）**：SEND/WRITE 的 IMM 变体携带 4B 用户数据（经 CQE 通知对端，带外传小信息）。',
    '- **AtomicETH（16B）**：Atomic 请求——VA + RKey + Swap/Addend（64b 各一）+ Compare? （CS 双操作数）。',
    '',
    '**布局规则**：扩展头按规范固定顺序排列，PadCount 只作用于 payload 对齐（扩展头不受影响）。'
  ].join('\n'),
  verify: '每类扩展头的存在性/顺序/长度 checker；Q_Key 校验（特权/普通）双向用例。'
},
{
  id: 'k-r3-04', module: 'r3', title: 'Opcode 编码表（常用值）',
  tags: ['opcode', '编码', 'BTH'],
  body: [
    '常用 opcode 编码（**完整表以 IBTA spec 传输层 Opcode 表为准**）：',
    '| Opcode | 含义 |',
    '| 0x00 | ACK（确认） |',
    '| 0x01 | SEND_LAST_WITH_IMMEDIATE |',
    '| 0x02 | SEND_ONLY_WITH_IMMEDIATE |',
    '| 0x04 | SEND_FIRST |',
    '| 0x05 | SEND_MIDDLE |',
    '| 0x06 | SEND_LAST |',
    '| 0x07 | SEND_ONLY |',
    '| 0x08 | RDMA_WRITE_FIRST |',
    '| 0x09 | RDMA_WRITE_MIDDLE |',
    '| 0x0A | RDMA_WRITE_LAST |',
    '| 0x0B | RDMA_WRITE_ONLY |',
    '| 0x0C | RDMA_WRITE_ONLY_WITH_IMMEDIATE |',
    '| 0x10 | RDMA_READ_REQUEST |',
    '| 0x11 | RDMA_READ_RESPONSE_FIRST? / 仅 Middle/Last/Only 组合 |',
    '| 0x14 | COMPARE_SWAP request |',
    '| 0x15 | FETCH_ADD request |',
    '| 0x20 | RNR NAK |',
    '',
    '- READ Response 不设 First（以 Middle 起始? ——实际：响应只有 Middle/Last/Only 三种形态），值以规范为准。',
    '- **验证**：opcode×传输类型×分段位置的合法组合表是 checker 的基础；非法 opcode（保留值）必须被丢弃且不 crash。'
  ].join('\n'),
  verify: 'opcode 保留值注入（如 0x03/0x0D）→ 静默丢弃 + 计数，不得影响其他 QP。'
},
{
  id: 'k-r3-05', module: 'r3', title: 'UD、GRH 与 IB 原生路由头',
  tags: ['UD', 'GRH', 'LRH', '路由'],
  body: [
    '**IB 原生报文头**（对照 RoCEv2 的差异）：',
    '- **LRH（Local Route Header，8B）**：IB 链路层路由——VL（虚拟通道）、SL（服务级）、**DLID**（目的本地标识，SM 分配的 16bit 地址）。',
    '- **GRH（Global Route Header，40B）**：跨子网全局路由，**IPv6 风格**——Ver/TrafficClass/FlowLabel(32) + PayloadLen + NextHdr + HopLimit + **SGID(128) + DGID(128)**。NextHdr 标志后续头类型。',
    '- **RoCEv2 没有 LRH/GRH**——以太网头+IP 头承担等价功能；GID 语义由 IP 地址 + RoCE GID（MAC/IPv6 派生）映射承接。**"RoCEv2 用 GRH"是常见误解。**',
    '',
    '**UD 语义**：',
    '- 无连接：发往目标 QPN（+Q_Key 校验），不建状态，不 ACK——可能丢/乱序/重复。',
    '- payload ≤ Path MTU（不分段）。',
    '- **多播**：DGID 设多播地址，一组 QP 接收；UD 是唯一支持多播的传输类型。',
    '- 使用场景：节点发现、路由协议、简单遥测——需要可靠性的都不用 UD。'
  ].join('\n'),
  verify: 'UD 乱序/重复/丢失的接收行为（用户层可见，硬件不重排）；多播复制与隔离。'
},

/* ---------------- R4 可靠传输与错误处理 ---------------- */
{
  id: 'k-r4-01', module: 'r4', title: 'PSN 与 ACK 语义',
  tags: ['PSN', 'ACK', 'AETH'],
  body: [
    '**RC 的确认机制**：',
    '- 接收端维护期望 PSN；**ACK 携带"下一个期望 PSN"**（cumulative：之前的全部确认）。',
    '- **AckRequest=1** 的包 → 接收端必须立即回 ACK（发送方在等关键确认，如 READ 请求）。',
    '- 无 AckReq → 可**合并 ACK**（攒多个包回一个，规范给出延迟/包数策略）——ACK 风暴与延迟的权衡。',
    '- **AETH.MSN**：消息级确认（已完成的 message 数-1）——分段消息按"整条消息"确认，不是按包。',
    '- **AETH.Credit**：RDMA READ/Atomic 的资源额度归还（对端处理完一个 READ，把额度还你）。',
    '',
    '**乱序到达**：网络可乱序交付；接收端策略（实现可配）：缓存乱序包等空洞补齐，或丢弃并 NAK（Go-Back-N 语义）。**不缓存 = 带宽浪费，缓存 = 内部 buffer 压力**——这是 NIC 设计的关键取舍。',
    '',
    '**验证**：ACK 合并策略的边界（何时必须 ACK）、乱序注入下两种接收策略的行为、MSN 与 PSN 的一致性。'
  ].join('\n'),
  verify: 'AckReq 边界（每个包都置位 = ACK 风暴；全不置 = 靠超时）——两端行为都要覆盖。'
},
{
  id: 'k-r4-02', module: 'r4', title: 'Go-Back-N 重传与超时参数',
  tags: ['重传', 'Go-Back-N', 'timeout', 'retry'],
  body: [
    '**两种触发**：',
    '- **NAK（sequence error）**：收到 PSN 不符 → NAK 携带期望 PSN → 发送端**从该 PSN 起重发所有未确认包**（Go-Back-N，含已发未确认的——即使它们本身没错）。',
    '- **超时**：ACK 迟迟不回（丢包/对端故障）→ 超时重传最旧未确认包。',
    '',
    '**参数**：',
    '- `timeout`：ACK 超时 = 4.096μs × 2^timeout（编码 0~31；常用秒级取值）。',
    '- `retry_cnt`：0~7；用尽 → **QP 转 Error**，未完成 WQE 以 RETRY_EXC_ERR 状态刷新（软件能感知并重建）。',
    '- 重传包与原包 PSN 相同（不重新编号）。',
    '',
    '**与 PCIe First Retry 的对比**：PCIe Gen6 重传以 FLIT 为单位、判决在接收端本地（FEC/CRC）；RoCE 重传以 PSN 为单位、依赖接收端 NAK/发送端超时——**没有本地纠错，全靠重传**，所以 RoCE 网络必须尽量不丢包（PFC/ECN 的意义）。',
    '',
    '**验证**：丢包/乱序注入 → NAK/超时路径 → 重传流正确（PSN 连续、数据一致）→ retry 用尽 → QP Error → 软件重建全链路。'
  ].join('\n'),
  verify: '丢包率×吞吐曲线（重传风暴的量化）；NAK 与超时双路径都触发过。'
},
{
  id: 'k-r4-03', module: 'r4', title: 'RNR NAK 与接收流控',
  tags: ['RNR', '流控', 'WQE'],
  body: [
    '**RNR（Receiver Not Ready）语义**：接收端 RQ 没有可用的 recv WQE（软件没及时 post）→ 回 **RNR NAK**，携带一个 timer 值告知"多久后再试"。',
    '- **min_rnr_timer**（RTS/RTR 属性）：本端强制要求对端的最小重试间隔（编码指数级，约几百 μs 起步）。',
    '- **rnr_retry**：发送端 RNR 重试上限；**7 = 无限重试**（长等待场景，如存储后端慢）。',
    '- 用尽 → CQE 报 **RNR_RETRY_EXC_ERR**，该 WQE 完成（失败态）。',
    '- 收到 RNR NAK 时，**期间到达的对端重传包如何处理**（丢弃重发后重新 NAK）——实现细节但影响带宽。',
    '',
    '**与 credit 的区别**：credit/流控（BTH 之外，IB 链路层 credit 或 RDMA 拥塞控制）防"网络拥塞"；RNR 防"接收方软件没准备好"——两层独立。',
    '',
    '**验证**：RNR timer 编码表扫描；rnr_retry=7 的长稳（不误转 Error）；RNR 风暴下带宽与 CPU 影响。'
  ].join('\n'),
  verify: 'RNR 场景在存储类负载（后端偶尔慢）是常态而非异常——按常态设计用例。'
},
{
  id: 'k-r4-04', module: 'r4', title: '完成状态码全集与定位方向',
  tags: ['CQE', '错误码', 'debug'],
  body: [
    '常用 ibv_wc 状态码（完整表见 IBTA/verbs 文档）：',
    '| 状态码 | 含义 | 定位方向 |',
    '| SUCCESS | 成功 | — |',
    '| LOC_LEN_ERR | 本地 SGL 长度非法 | 激励/驱动 WQE 构造 |',
    '| LOC_OP_ERR | 本地 opcode 不支持 | QP 类型 vs 操作 |',
    '| LOC_PROT_ERR | 本地保护错（SQ 语义） | WQE 格式 |',
    '| WR_FLUSH_ERR | QP 已 Error，WQE 被冲刷 | 上游错误的下游表现 |',
    '| MW_BIND_ERR | 绑定 MW 出错 | MW 生命周期 |',
    '| BAD_RESP_ERR | 对端响应非法（格式错） | 对端互操作问题 |',
    '| LOC_ACCESS_ERR | 本地访问违例 | lkey/权限/VA |',
    '| REMOTE_INV_REQ_ERR | 远端判定本端请求非法 | rkey/VA/权限（对端日志） |',
    '| REMOTE_ACCESS_ERR | 远端访问违例（rkey 无效等） | rkey 生命周期 |',
    '| REMOTE_OP_ERR | 远端操作错 | 对端内部状态 |',
    '| RETRY_EXC_ERR | 重试计数用尽 | 链路质量/对端存活 |',
    '| RNR_RETRY_EXC_ERR | RNR 重试用尽 | 接收端 WQE 供给 |',
    '',
    '**关键思路**：REMOTE_* 错误的根因在**对端**（抓对端日志）；WR_FLUSH_ERR 是其他错误的连带表现（先查谁把 QP 打进 Error 的）。'
  ].join('\n'),
  verify: '每种错误码至少一个触发用例（注错矩阵直接产出）——错误码是 RDMA debug 的地图。'
},
{
  id: 'k-r4-05', module: 'r4', title: 'ICRC 与数据完整性体系',
  tags: ['ICRC', '完整性', 'CRC'],
  body: [
    '**ICRC 定位**：RC（IB 传输层）的端到端 CRC-32，覆盖 BTH 起（含）到 ICRC 前（含 payload），IP/UDP 可变字段虚零参与。',
    '- 校验失败 → 包**静默丢弃**（无 NAK！），恢复完全依赖发送端超时重传——所以 ICRC 错误的代价 = 一次完整重传周期。',
    '- UC/UD 丢弃即丢失（无恢复）。',
    '',
    '**RDMA 数据完整性四道防线**（对照 PCIe）：',
    '1. 以太网 FCS（逐跳链路层）≈ PCIe LCRC；',
    '2. ICRC（端到端）≈ PCIe ECRC；',
    '3. rkey/权限检查（访问合法性）≈ 配置空间 ACL；',
    '4. 应用层校验（如 NVMe 的数据摘要）。',
    '',
    '**验证**：ICRC 生成/校验与规范一致性（对拍 rxe 或独立 C 模型）；FCS 过但 ICRC 错的组合注入（链路错但端到端发现——最难查的一类，必须有用例）。'
  ].join('\n'),
  verify: '"FCS 正确 + ICRC 错误"注入是高价值 corner：链路层全绿、端到端拦下。'
},

/* ---------------- R5 无损网络与拥塞控制 ---------------- */
{
  id: 'k-r5-01', module: 'r5', title: 'PFC：基于优先级的流控（802.1Qbb）',
  tags: ['PFC', '无损', '802.1'],
  body: [
    '**原理**：以太网传统的 pause（802.3x）会停整个端口；PFC（802.1Qbb）按 **8 个优先级独立暂停**——RDMA 流量所在优先级不丢包，其他流量照常。',
    '- **PFC 帧**：MAC Control 帧（EtherType 0x8808，目的 MAC 01-80-C2-00-00-01），携带 `Priority Enable Vector`（8bit 位图：哪些优先级被暂停）+ 每 优先级的 `Time`（暂停时长，超时自动恢复或等 XOFF 复位）。',
    '- **部署**：RDMA 流量映射到专属优先级（CoS/DSCP 分类）→ 交换机/网卡对该优先级使能 PFC → 队列满时发 PFC 暂停对端。',
    '- **PFC watchdog**：长时间 pause 不恢复（对端挂死/配置错）→ watchdog 强制恢复/丢包/告警，防整口挂死。',
    '',
    '**与 RDMA 的关系**：RoCEv2 假设"网络基本不丢包"——丢包触发 Go-Back-N 重传，吞吐崩塌。PFC 是实现"基本不丢包"的手段，但它只管**拥塞性丢包**，不管 CRC 错/缓冲不足。',
    '',
    '**验证**：PFC 帧格式/位图/Time 语义、pause 生效与恢复时序、PFC 风暴（持续 XOFF）下 watchdog 行为。'
  ].join('\n'),
  verify: 'PFC 使能优先级与非使能优先级的隔离性（互不拖累）必须有用例。'
},
{
  id: 'k-r5-02', module: 'r5', title: 'PFC 死锁与 headroom 计算',
  tags: ['PFC', '死锁', 'headroom'],
  body: [
    '**PFC 死锁成因**：多优先级 + 拓扑中 PFC 依赖成环——A 的优先级 3 被 B 暂停，B 的优先级 4 被 A 暂停，互相等待永久阻塞（路由环路/ECMP 环 + 多优先级交织时更易发生）。',
    '**缓解**：无环拓扑设计、按优先级隔离（不同业务不同优先级不交叉路由）、PFC watchdog 兜底、极端时降级丢包。',
    '',
    '**Headroom（预留缓冲）计算**：PFC 生效有延迟——从对端队列满到 XOFF 帧到我这再到我停发，期间的在途数据必须被接收方缓冲吸收，否则丢包：',
    '- headroom ≈ 链路带宽 ×（XOFF 传播延迟 + 对端响应 + 帧处理时间）+ 若干最大帧；',
    '- 距离越长/速率越高，headroom 越大（400G 长距场景显著）——配置不足 = PFC 失效反而丢包。',
    '',
    '**验证**：headroom 不足注入（缓冲水位逼近上限 + 突发）→ 观察 PFC 生效前是否丢包；死锁场景仿真（环+多优先级互压）。'
  ].join('\n'),
  verify: 'PFC 参数（watermark/watchdog）与 headroom 是部署验证必查项——参数错 = 无损网变丢包网。'
},
{
  id: 'k-r5-03', module: 'r5', title: 'ECN 与 CNP：拥塞通知机制',
  tags: ['ECN', 'CNP', '拥塞'],
  body: [
    '**ECN（Explicit Congestion Notification）**：IP 头的 2bit——`00` 不支持、`01/10` ECT（ECN capable）、`11` CE（拥塞经历）。',
    '- **交换机**：队列深度越过 **Kmin** 开始按概率标 CE（**Kmax** 全标，**Pmax** 概率上限——RED/ECN marking 三参数）。',
    '- **接收 NIC**：看到 CE 标记的 RoCE 包 → 生成 **CNP**（Congestion Notification Packet，RoCEv2 定义：BTH opcode 0x81）沿反向路径发回**发送端**。',
    '- **发送 NIC**：收 CNP → 降速（DCQCN，见下卡）。',
    '',
    '**设计意图**：PFC 管"不丢包"（被动、晚），ECN 管"早点降速"（主动、早）——理想状态是 ECN 把拥塞控制在 PFC 触发之前（PFC watermark 远高于 ECN Kmax）。',
    '',
    '**验证**：CNP 报文格式/生成时机/聚合（不是每个 CE 包都发 CNP，会风暴）、Kmin/Kmax/Pmax 参数扫描下的标记率、CNP 丢失/风暴的系统行为。'
  ].join('\n'),
  verify: 'ECN 参数与 PFC watermark 的相对关系（ECN 先于 PFC）是部署验证的关键组合。'
},
{
  id: 'k-r5-04', module: 'r5', title: 'DCQCN 算法状态机',
  tags: ['DCQCN', '拥塞', '算法'],
  body: [
    '**DCQCN（Data Center QCN）**= PFC + ECN/CNP + 速率调节的完整拥塞控制体系，三个角色：',
    '- **CP（Congestion Point，交换机）**：队列过 Kmin → 按 Pmax 概率标 CE。',
    '- **NP（Notification Point，接收 NIC）**：收到 CE 包 → 生成/聚合 CNP（定时器内多个 CE 合一个 CNP，防风暴）。',
    '- **RP（Reaction Point，发送 NIC）**：收 CNP → **降速**：当前速率 ×（1 - alpha/2）？核心是维护 alpha（降速因子，指数加权更新）；停止收 CNP 后**定时器步进升速**（Rate Increase）恢复带宽。',
    '',
    '**调参要点**：alpha 更新率（快→抖动，慢→迟钝）、升速步长（大→震荡，小→恢复慢）、NP 聚合定时器——**没有全局最优，按负载画像调**（AI 突发 vs 存储稳态需求不同）。',
    '',
    '**验证重点**（RoCE 网卡验证的硬骨头）：',
    '- 多流竞争下的公平收敛（各流最终均分带宽？）。',
    '- CNP 丢失/延迟/风暴下的稳定性（不震荡、不死锁在低速率）。',
    '- 与 PFC 的协同（降速不及时 → 队列涨 → PFC 介入 → 不应频繁）。',
    '- 长稳：吞吐/时延/标记率随时间的稳定性。'
  ].join('\n'),
  verify: 'DCQCN 行为验证需要系统级仿真（多节点），单 NIC RTL 验证侧重 RP/NP 的协议行为正确性。'
},
{
  id: 'k-r5-05', module: 'r5', title: 'ETS 与多业务 QoS（802.1Qaz）',
  tags: ['ETS', 'QoS', '多业务'],
  body: [
    '**ETS（Enhanced Transmission Selection）**：802.1Qaz 定义的带宽分配——8 个优先级归并成若干 **TC（Traffic Class）**，每个 TC 分配带宽权重（如 RDMA 50% / 存储 30% / 普通 TCP 20%），支持严格优先级（低时延业务）与 ETS 加权轮询混合。',
    '- **典型 AI/存储集群配置**：RDMA 流量专属 TC + PFC；其他业务共享 TC 无 PFC；CNP 也走 RDMA TC（不能被压）。',
    '- **DSCP→优先级映射**：入口按 DSCP 分类（RoCEv2 数据包与 CNP 用不同 DSCP 区分）。',
    '',
    '**部署验证清单**：',
    '- 分类正确性（各 DSCP 进对的 TC/队列）。',
    '- 带宽配额生效（压制/保障边界）。',
    '- RDMA TC 的 PFC/ECN 配置与其他 TC 独立。',
    '- 极限场景：某 TC 风暴不拖垮其他 TC（隔离性）。',
    '- CNP 优先保障（CNP 被拥塞压住 → 降速信号丢失 → 拥塞失控的恶性循环）。'
  ].join('\n'),
  verify: 'CNP 必须走最高保障——"拥塞控制信号本身被拥塞丢掉"是真实事故模式。'
},

/* ---------------- R6 应用场景 ---------------- */
{
  id: 'k-r6-01', module: 'r6', title: 'AI 训练：NCCL、GPUDirect 与在网计算',
  tags: ['AI', 'NCCL', 'GPUDirect', 'SHARP'],
  body: [
    '**数据通路**：分布式训练的梯度同步是集合通信（AllReduce/AllGather），由 **NCCL** 库在 GPU 间调度：节点内走 NVLink/PCIe P2P，跨节点走 **GPUDirect RDMA**——NIC 的 DMA 引擎**直接读写 GPU 显存**（GPU BAR 映射 + IOMMU/P2P 授权），绕过 CPU 内存拷贝，带宽与时延都省一个数量级。',
    '- **SHARP（在网聚合）**：交换机/NPU 上执行聚合运算（sum 等），AllReduce 流量不必全量到根节点再分发——网络即计算。',
    '- **流量画像**：集合通信是**同步突发**（所有 rank 同时刻爆发同型流量），瞬时压力极大；NCCL 参数（NCCL_IB_HCA/NCCL_IB_QPS_PER_CONN 等）决定 QP/通道布局。',
    '- **对 NIC 验证的要求**：万级 QP/通道、同步突发下的拥塞（DCQCN 大考）、长稳（训练跑数天）、GPUDirect 路径的 IOMMU/权限交互。',
    '- **故障画像**：一张卡掉线拖死整个作业——错误恢复（QP 重建）的速度直接等于训练任务的损失。'
  ].join('\n'),
  verify: '同步突发流量模型（多源同时爆发）+ QP 大规模扩展性是 AI 场景验证的两大主题。'
},
{
  id: 'k-r6-02', module: 'r6', title: '分布式存储与 NVMe-oF',
  tags: ['存储', 'NVMe-oF', 'SPDK'],
  body: [
    '**NVMe-oF**（NVMe over Fabrics）：把 NVMe 协议从本地 PCIe 拓展到网络——RDMA 是其主流传输绑定（也有 TCP/FC）。**Admin Queue + IO Queue 对** 直接映射到 RDMA QP（SQ/CQ 语义同构——NVMe 本来就是为 PCIe 队列设计的）。',
    '- **SPDK**：用户态 NVMe 驱动栈，配合 RDMA 实现全用户态存储 IO 路径（kernel bypass 的极致）。',
    '- **流量画像**：小 IO（4K）× 极高 IOPS × 时延敏感；后端抖动 → RNR 场景常态（rnr_retry=7 无限等就为它设计）。',
    '- **一致性要求**：块存储语义下**写必须保序**（RC 同 QP 保序满足）+ Fencing（故障节点必须被立刻隔离，防"僵尸写"——cluster 级别的一致性协议负责，NIC 的错误快速上报是前提）。',
    '- **验证重点**：IO 路径时延分布（P99.9）、RNR/重传恢复对 IOPS 的影响、错误注入后的数据完整性（块内容逐一比对）。'
  ].join('\n'),
  verify: '存储场景 = "小包高频 + 保序 + 快速故障隔离"三个关键词的组合验证。'
},
{
  id: 'k-r6-03', module: 'r6', title: 'HPC 与 MPI 的 RDMA 映射',
  tags: ['HPC', 'MPI'],
  body: [
    '**MPI 语义到 RDMA 的映射**（OpenMPI/MPICH 的 transport 层）：',
    '- **小消息（eager 协议）**：直接 SEND，对端预挂 buffer 收下即完成（低时延）。',
    '- **大消息（rendezvous 协议）**：先握手（对端登记接收位置）→ 发送端 RDMA WRITE 直写对端内存（+IMM 通知完成）——大带宽路径。',
    '- **tag matching**：MPI 消息按 (src, tag, comm) 匹配——匹配逻辑在软件/NIC offload；乱序到达的消息先缓存等匹配。',
    '- **collectives offload**：AllReduce 等下放到网络（IB SHARP / 交换机辅助）。',
    '',
    '**XRC/SRQ 的主场**：单节点多 rank 共享连接（见 R2 XRC 卡）。',
    '',
    '**验证视角**：MPI 是"消息语义 + 匹配"层，RDMA 提供管道——验证关注混合大小消息、多 rank 并发、 rendezvous 与 eager 切换边界、对端缓存不足时的降级路径。'
  ].join('\n'),
  verify: 'eager/rendezvous 切换阈值附近的边界负载；tag matching 乱序容错。'
},
{
  id: 'k-r6-04', module: 'r6', title: '云与虚拟化：SR-IOV、vDPA 与租户隔离',
  tags: ['云', 'SR-IOV', 'vDPA', '隔离'],
  body: [
    '**SR-IOV**：NIC 分出 PF（物理功能，管管理员用）+ 多个 VF（虚拟功能，直通给 VM/容器）——VF 拥有完整 RDMA 能力，性能最好；代价：**热迁移难**（VF 状态在硬件里）。',
    '- **vDPA/virtio-over-RDMA**：数据面直通硬件、控制面软件模拟（virtio 接口）——迁移友好与性能的折中。',
    '- **租户隔离**：P_Key（IB 分区）/ VLAN-VNI 映射（RoCE）、QP 号空间隔离（QPN 全局唯一，VF 间不得互访——硬件 ACL）、rkey 生命周期管理（租户间 MR 不得互通）。',
    '- **网络策略**：租户间 QP 建立要过策略检查（如同 OVS 流表）——DPU/SmartNIC 时代由 DPU 承担。',
    '',
    '**验证重点**：VF 数量扩展（每 VF 的 QP/资源配额）、租户间隔离性（恶意 rkey/Q_Key 探测必须失败）、热迁移对 RDMA 连接的影响（vDPA 路径）、云规模下的 QPN 资源管理。'
  ].join('\n'),
  verify: '隔离性用例（租户 A 试图访问租户 B 的 MR/QP）是安全验证，必须全覆盖。'
},
{
  id: 'k-r6-05', module: 'r6', title: 'IB 拓扑与子网管理（对照 RoCE 的差异）',
  tags: ['IB', '拓扑', 'SM'],
  body: [
    '**IB 网络由 SM（Subnet Manager）集中管理**（通常驻留在某台交换机上）：',
    '- 发现拓扑 → 给每个端口分配 **LID**（16bit 本地地址）→ 计算各交换机的**路由表**（线性转发表，常见 fat-tree 的"向上向下"路由防拥塞）→ 下发。',
    '- **VL/SL**：IB 的虚拟通道/服务级——链路层 credit 流控按 VL 独立（IB 天然无损的机制）。',
    '- **自适应路由**：部分交换机支持按拥塞动态选路（MLNX 拓展）。',
    '',
    '**与 RoCE 的管理差异**：RoCE 完全复用以太网/IP 管理（路由协议/SDN），无 SM——换来生态、失去 IB 的精细链路控制（VL credit）。',
    '',
    '**验证视角**：做 RoCE NIC 验证基本不碰 SM，但理解 IB 有助于把握"RoCEv2 把哪些 IB 机制搬走了、哪些没搬"——**传输层全搬、链路层 credit 没搬（换成了以太网 PFC）**，这正是 RoCE 依赖无损以太网配置的根本原因。'
  ].join('\n'),
  verify: '概念卡：对照 R5 理解"为什么 RoCE 需要 PFC"——链路层 credit 缺位的补偿。'
},

/* ---------------- R7 RDMA 验证专题 ---------------- */
{
  id: 'k-r7-01', module: 'r7', title: 'RoCE NIC 验证环境架构',
  tags: ['验证环境', 'NIC', '架构'],
  body: [
    'DUT = RoCE NIC。三方 agent + 双视角 scoreboard：',
    '- **PCIe VIP（主机侧）**：捕获门铃 MMIO 写、服务 DMA（提供内存模型：WQE/CQE/MR 数据）、收发 MSI-X——模拟主机驱动行为。',
    '- **Ethernet/RoCE VIP（网络侧）**：收发以太网/IP/UDP/BTH 包，支持 RoCE 语义（PSN/重传引擎/ECN 标记/拥塞模型）。',
    '- **主机软件模型**：驱动语义层——WQE 生成器（按测试意图构造 opcode/SGL/标志）、QP/资源管理器、完成处理器。',
    '- **Scoreboard 双视角**：网络侧包流（去 ICRC 后）↔ 主机侧 DMA 数据流逐一对账；WQE ↔ 发出的包 ↔ CQE **三方对账**（一个 WR 应产生确定的包序列与一个完成）。',
    '- **参考模型**：完整 RDMA 传输语义（PSN 管理/重传/RNR/分段）——可从 Linux rxe.ko 移植（见 R8）。',
    '',
    '**关键难点**：三方时序耦合（门铃→DMA→发包→回包→CQE→中断）——任何一方的时序扰动都应被 scoreboard 正确容忍而非误报。'
  ].join('\n'),
  verify: '三方对账是 RoCE NIC 验证的核心资产——先搭对账，再谈随机。'
},
{
  id: 'k-r7-02', module: 'r7', title: '流量模型与激励设计',
  tags: ['流量', '激励', '分段'],
  body: [
    '**激励维度**（组合空间巨大，需分层收敛）：',
    '- QP：类型（RC/UC/UD）× 数量（1 到万级）× 状态路径；',
    '- 操作：opcode 混合（SEND/WRITE/READ/Atomic 比例）、message 大小分布（inline 边界、MTU 边界、multi-MTU 大消息）、SEND 的 recv 配对率（RNR 诱因）；',
    '- MTU：512/1024/2048/4096 与对端一致性；',
    '- 并发：outstanding 深度（max_rd_atomic 边界）、doorbell 批量（一次 ring 多 WQE）、多 QP 交错。',
    '',
    '**必须覆盖的场景**：',
    '- 大消息分段全序列（First/Middle/Last 边界：=MTU、MTU±1、超长）。',
    '- 多 QP 公平性（同优先级流均分带宽）与饥饿检测。',
    '- 同步突发（AI 集合通信画像）：多 QP 同刻爆发。',
    '- 长稳（10^9+ 事务）：资源泄漏/计数器回卷/缓慢退化。'
  ].join('\n'),
  verify: '约束随机为主 + 定向边界为辅；流量画像参数化（AI/存储/HPC 模板）。'
},
{
  id: 'k-r7-03', module: 'r7', title: 'RDMA 错误注入矩阵',
  tags: ['注错', '矩阵', '错误'],
  body: [
    '**网络侧注入**（RoCE VIP 能力）：',
    '- 丢包（数据包/ACK/CNP 分类丢）、乱序、延迟、重复；',
    '- PSN 跳变/回绕边界错误；',
    '- ICRC 破坏（FCS 正确 + ICRC 错的高价值组合）；',
    '- BTH 字段错（P_Key/Q_Key/DestQP 不存在）；',
    '- ECN：误标/漏标/标记风暴；PFC：风暴/丢失/时序扰动；',
    '',
    '**主机侧注入**（PCIe VIP/软件模型）：',
    '- doorbell-WQE 乱序（WQE 未可见先 ring）、重复 doorbell、门铃跨页/wc 合并扰动；',
    '- WQE 格式错（opcode 与 QP 类型不符、SGL 长度 0/超限）；',
    '- MR 越界（VA±1、rkey 过期/伪造）、Q_Key 错、CQ 满；',
    '- 寄存器/属性竞态（QP 迁移中 post WQE）。',
    '',
    '**预期行为表**：每行注入 → 明确期望（NAK/RNR/超时重传/CQE 错误码/QP Error/静默丢弃）→ 端到端一致性断言兜底。'
  ].join('\n'),
  verify: '矩阵行数即验证完备性指标；每行必须有确定性判据（非"不挂就行"）。'
},
{
  id: 'k-r7-04', module: 'r7', title: 'QP 状态机验证与属性一致性',
  tags: ['QP', '状态机', '断言'],
  body: [
    '- **合法迁移全覆盖**：RESET→INIT→RTR→RTS 主路径 + SQD/SQE/ERROR 分支 + Error→Reset 重建；每条迁移的属性生效验证（INIT 后 access_flags 生效等）。',
    '- **非法迁移拒绝**：跳级（RESET→RTS）、回退（RTS→INIT）、ERROR 态 modify 部分字段——返回错误码且状态不变。',
    '- **SVA 断言示例**：ERROR 态不再发新包（数据面静默）；RTR 前 SQ 不发包；CQE 刷新顺序 = WQE 顺序（同 QP 内）。',
    '- **属性两端一致性**：PSN/MTU/rd_atomic 协商（错配必须显式失败，不静默错位）；modify 竞态（另一线程同时 post/modify 的串行化）。',
    '- **并发 QP 独立性**：一个 QP 的 Error/重传不得污染其他 QP 的状态与数据（隔离性断言）。'
  ].join('\n'),
  verify: '状态机覆盖率（状态×迁移×属性组合）+ 隔离性断言是 QP 验证的双柱。'
},
{
  id: 'k-r7-05', module: 'r7', title: '一致性与数据完整性验证',
  tags: ['一致性', 'scoreboard', '保序'],
  body: [
    '- **保序断言**：RC 同 QP 内 message 按序完成/交付（网络乱序由接收端重组）——乱序注入后顺序必须不变。',
    '- **数据完整性**：网络侧 payload ↔ 主机 DMA 内存逐字节比对（端到端）：WRITE 数据、READ 返回数据、SEND 到 recv buffer——三路全对账。',
    '- **不重不漏**：重传场景下对端收到的数据恰好一份（重复包被 PSN 去重）；分段重组无缺段。',
    '- **跨 QP/跨 VF 隔离**：数据不串台（QPN 过滤、rkey 隔离）。',
    '- **ICRC 端到端**：链路层 FCS 全对但内容被改的组合（仿中间篡改）必须被 ICRC 拦截。',
    '- **异步一致性**：CQE 报告的字节数/状态与实际传输一致（不能"报成功丢数据"）。'
  ].join('\n'),
  verify: '铁律同 PCIe：无论注入什么，成功完成的数据必须与发送端一致，失败必须显式报错。'
},
{
  id: 'k-r7-06', module: 'r7', title: '性能验证：线速、时延与扩展性',
  tags: ['性能', '线速', '时延'],
  body: [
    '- **吞吐**：单流线速（100/200/400G 对应包速率），小包（64B）与大包（MTU）分别测——小包是包处理能力瓶颈；多流聚合吞吐与公平性。',
    '- **时延**：全链路分解——WQE DMA → 处理 → 发包 → 对端 → CQE → 中断；分段统计 P50/P99.9（时延尾延迟是 AI/存储的要害）。',
    '- **重传敏感度**：注入不同丢包率（1e-6~1e-3）下的吞吐/时延曲线——无损网应在 PFC 保护下贴近零重传。',
    '- **扩展性**：QP 数量扫描（1K/10K/100K）——QP 上下文缓存命中、门铃处理吞吐、内存占用；cache miss 悬崖是设计边界。',
    '- **方法**：RTL 仿真跑不动线速量级——协议正确性在仿真，性能在 emulation/FPGA 原型 + 真实流量（perftest）。',
    '- **门禁化**：吞吐/时延基线入库，回归对比趋势。'
  ].join('\n'),
  verify: '小包线速 + 时延 P99.9 + QP 扩展悬崖——三个数字决定 NIC 的市场竞争力。'
},
{
  id: 'k-r7-07', module: 'r7', title: '一致性与互操作测试',
  tags: ['合规', '互操作', 'perftest'],
  body: [
    '- **IBTA 合规**：InfiniBand Trade Association 定义 RoCE 一致性程序（协议行为/报文格式/时钟与状态机检查）——产品上市前过合规是生态入场券。',
    '- **互操作矩阵**：对端 NIC（ConnectX 系列）、交换机（不同厂商的 ECN/PFC 实现）、驱动栈（rdma-core 版本）——**拥塞配置的互操作**（对端 ECN 参数不同 → 你的 DCQCN 行为）是重灾区。',
    '- **工具链即负载**：perftest（ib_send_bw/ib_send_lat/ib_read_bw/ib_write_bw、qperf）是行业通用基准——验证环境的激励要与这些工具的流量模式兼容。',
    '- **软件栈兼容**：rdma-core 的 verbs 语义演进（新 API/废弃 API）、内核 ULP（NVMe-oF/NFS over RDMA）。',
    '- **长稳与压测**：真实应用画像（NCCL/SPDK/fio）跑天级长稳，抓 RTL 仿真永远看不到的缓慢退化。'
  ].join('\n'),
  verify: '互操作测试 = 用真实世界的多样性补 RTL 验证的单一假设。'
},

/* ---------------- R8 VIP 与实战 ---------------- */
{
  id: 'k-r8-01', module: 'r8', title: 'RDMA/RoCE VIP 生态',
  tags: ['VIP', 'RoCE', '生态'],
  body: [
    'RoCE NIC 验证需要 **Ethernet VIP + RoCE 协议能力 + PCIe VIP** 的组合（具体型号/能力以厂商最新文档为准）：',
    '- **Synopsys DesignWare VIP**：Ethernet VIP + RoCEv2 附加包（IB 传输语义/PSN/重传引擎/拥塞模型），与其 PCIe/CXL VIP 组合可搭完整 NIC 环境——组合生态是其最大优势。',
    '- **Cadence VIP**：Ethernet/IP 家族，与 Xcelium 集成，RoCE 能力随版本演进。',
    '- **Avery 等**：RoCE VIP 单项供应商，性价比路线。',
    '- **自制 ETH BFM + rxe 参考模型**：早期 bring-up 可行，但 PSN/重传/拥塞语义工作量大。',
    '',
    '**能力评估维度**：RoCE 语义完整度（PSN/NAK/RNR 引擎？ECN/CNP 生成与响应？）、注错粒度（丢包/乱序/延迟/位错/CNP 扰动）、拥塞行为建模（可编程 ECN 标记/DCQCN 对端模型）、统计（标记率/丢包率/时延直方图）、与 PCIe VIP 的协同接口（内存共享/DMA 服务）。'
  ].join('\n'),
  verify: '选型 checklist 与 PCIe VIP 对齐（M12），外加拥塞建模与三方协同两项特有维度。'
},
{
  id: 'k-r8-02', module: 'r8', title: 'SoftRoCE（rxe.ko）作为黄金参考模型',
  tags: ['rxe', 'SoftRoCE', '参考模型'],
  body: [
    '**Linux SoftRoCE（rxe.ko）**：内核态的软件 RoCEv2 实现——完整的 IB 传输语义（QP 状态机/PSN/重传/RNR/ICRC/分段），跑在普通以太网上。',
    '**验证用法**：',
    '- **协议参考**：语义有争议时读 rxe 源码（drivers/infiniband/sw/rxe）——一个"活的规范实现"；',
    '- **对拍**：相同 WQE 序列分别喂 RTL NIC 与 rxe（经标准化网络环境），比对生成的包流（BTH/PSN/opcode/数据）——参考模型对拍的经典玩法；',
    '- **激励源**：rdma-core + perftest 直接跑在 SoftRoCE 上，生成真实软件流量画像喂给验证环境。',
    '',
    '**局限**：rxe 的实现选择（如乱序包处理策略、ACK 合并参数）是"一种合法实现"而非唯一——**对拍差异要先查规范再判谁错**；性能相关（时延/调度）不代表硬件行为。',
    '',
    '配套：rdma-core（用户态 verbs 库源码 = API 权威行为）、ibv_* 系列工具。'
  ].join('\n'),
  verify: '对拍流水线：WQE 转储 → rxe/RTL 双跑 → 包级 diff → 差异归类（规范模糊 vs bug）。'
},
{
  id: 'k-r8-03', module: 'r8', title: '实战：RDMA NIC 与 PCIe VIP 协同',
  tags: ['实战', '协同', 'PCIe'],
  body: [
    'NIC 验证的本质：**三条通路的时间耦合**——',
    '1. **提交通路**：主机驱动写 WQE 到内存（PCIe VIP 的 memory model 服务）→ 门铃 MMIO 写（VIP 捕获）。',
    '2. **DMA 通路**：NIC 发起 DMA 读 WQE/读 MR 数据/写 CQE/写对端内存（RDMA WRITE 场景）——PCIe VIP 扮演内存与 DMA target。',
    '3. **通知通路**：CQ arm → MSI-X 中断（VIP 捕获）→ 软件模型处理。',
    '',
    '**联合 scoreboard 三方对账**：一个 WR（WQE）↔ 确定的包序列（网络 VIP）↔ 确定的完成（CQE 内容+中断）——任何一方缺失/多余/内容错即 fail。READ 的多包响应、大消息分段、重传的包都要纳入对账模型。',
    '**时序验证点**：WQE 可见性先于门铃（内存序）；doorbell 后 WQE 的 DMA 读取时限；CQE 写入与中断的先后（中断唤醒软件时 CQE 必须可见——memory ordering！）；多 QP 的 DMA 公平调度。',
    '**实用技巧**：PCIe VIP 的 latency 注入（MMIO/DMA 延迟扫描）暴露 NIC 端的时序假设漏洞。'
  ].join('\n'),
  verify: '三方对账 + memory ordering 断言（CQE 可见性 vs 中断）是 NIC 验证区别于纯协议验证的标志。'
},
{
  id: 'k-r8-04', module: 'r8', title: '实战常见坑 Top 8（RoCE NIC）',
  tags: ['坑', '实战', '经验'],
  body: [
    '1. **WQE/doorbell 乱序**：设备在 WQE 未完全可见时读——write-combining 边界；表现为偶发数据错，极难查（必须主动注入验证设备端顺序假设）。',
    '2. **CQE 可见性 vs 中断**：中断先于 CQE 数据到达软件 → 读到旧数据——NIC 端必须保证写序（平台内存模型）。',
    '3. **门铃去抖/合并**：连续多次 ring 的合并处理与索引回卷——回卷边界（2^24? QPN/索引位宽）经典。',
    '4. **CQE 聚合与中断合并边界**：聚合窗口内最后事件丢失/延迟超标——coalescing 参数边界扫描。',
    '5. **QPN 冲突**：VF/PF 全局 QPN 分配器冲突（大规模 VF 场景）；QPN=0/1 等保留值误用。',
    '6. **MR 生命周期**：dereg 时在途 DMA/网络访问——必须等在途清零（引用计数），否则内存重用后写飞（硅后最难查的内存踩踏）。',
    '7. **定时器精度**：仿真时间 vs 真实时间（retry/RNR/coalescing 定时器在仿真里被放大）——参数化+时间抽象。',
    '8. **PSN 回卷**：24bit 回绕点的比较逻辑（无符号比较陷阱）——强制回绕边界用例。'
  ].join('\n'),
  verify: '坑 1/2/6 属于"硅后极难查、硅前必须防"——排序与生命周期的断言要早建。'
},

/* ---------------- R9 资料与工具 ---------------- */
{
  id: 'k-r9-01', module: 'r9', title: 'RDMA 规范与标准清单',
  tags: ['资料', '规范', 'IBTA'],
  body: [
    '- **InfiniBand Architecture Specification Vol.1/Vol.2（IBTA）**：RDMA 传输语义的根——**IBTA 官网免费注册下载**（对比 PCIe 的会员制，上手友好）。传输层（QP/PSN/重传）、报文格式（BTH/扩展头）、Verbs 语义全在 Vol.1。',
    '- **RoCEv2 定义**：IB spec 的 Routing/RoCEv2 附件（Annex A16? 以 IBTA 文档列表为准）——定义以太网/IP 封装与拥塞配合。',
    '- **NVMe-oF Specification**（NVM Express 组织，免费）：存储场景的传输绑定。',
    '- **IEEE 802.1Qbb（PFC）/802.1Qaz（ETS）/802.3x**：无损以太网的链路层基础。',
    '- **论文（拓展）**：DCQCN（SIGCOMM 2015）、HPCC、定时器/参数调优系列——理解拥塞控制设计动机。',
    '- **PCIe Base 6.5**（你已有）：R4 对比卡、R8 协同卡的 PCIe 侧知识回看这里。'
  ].join('\n'),
  verify: '阅读顺序建议：IB Vol.1 传输层章节 → RoCEv2 附件 → 802.1Qbb → DCQCN 论文。'
},
{
  id: 'k-r9-02', module: 'r9', title: '源码与工具链',
  tags: ['工具', '源码', 'perftest'],
  body: [
    '- **rdma-core**（GitHub Linux-rdma 组织）：用户态 verbs 库（libibverbs/libibumad）——API 行为的权威参考，所有 RDMA 应用的地基。',
    '- **Linux kernel drivers/infiniband**：mlx5 驱动（工业级 NIC 驱动的教科书）+ **sw/rxe（SoftRoCE，可读可改的协议参考实现）**。',
    '- **perftest**：ib_send_bw/ib_send_lat/ib_read_bw/ib_write_bw/ib_atomic_bw——行业标准基准工具，验证环境激励的兼容目标。',
    '- **qperf**：带宽/延迟综合测量。',
    '- **SPDK + nvme-cli**：存储路径（NVMe-oF over RDMA）实践。',
    '- **ethtool/sysfs**：PFC/ECN 参数查看与调整（部署验证必会）。',
    '- **实验环境**：两台带 RoCE 网卡的机器（或云上实例）+ 交换机 PFC/ECN 配置；无硬件时 SoftRoCE 虚拟对即可跑通全部 verbs 语义学习。'
  ].join('\n'),
  verify: '动手路线：SoftRoCE 双机（虚拟机即可）→ perftest 跑通 → ibv_ 自己写 client/server → 读 rxe 源码对照本系统 R1-R4。'
},
];

/* 让旧浏览器/严格模式都安全 */
if (typeof window !== 'undefined') {
  window.MODULES = MODULES;
  window.KNOWLEDGE = KNOWLEDGE;
}
