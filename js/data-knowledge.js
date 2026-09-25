/* ============================================================
 * PCIe 6.0 学习系统 - 知识库数据
 * 结构：MODULES 定义模块，KNOWLEDGE 定义知识卡片
 * 卡片字段：id / module / title / tags / body / verify(验证要点)
 * body 支持极简格式：**粗体**、`代码`、- 列表项、空行分段
 * ============================================================ */

const MODULES = [
  { id: 'm1',  name: 'M1 PCIe 基础回顾',        desc: '分层模型 / TLP / 流控 / LTSSM / 枚举 / 排序' },
  { id: 'm2',  name: 'M2 PCIe 6.0 总览',         desc: '演进路线与四大技术支柱' },
  { id: 'm3',  name: 'M3 FLIT 机制',             desc: 'FLIT 结构 / 类型 / TLP 打包' },
  { id: 'm4',  name: 'M4 PAM4 信令',             desc: '四电平调制 / 格雷码 / 预编码' },
  { id: 'm5',  name: 'M5 FEC 与错误处理',        desc: 'RS 纠错码 / 双 CRC / First Retry' },
  { id: 'm6',  name: 'M6 电源管理',              desc: 'L0p / ASPM 回顾' },
  { id: 'm7',  name: 'M7 流控变化',              desc: 'FLIT 粒度流控 / 共享缓冲池' },
  { id: 'm8',  name: 'M8 均衡与链路训练',        desc: '均衡回顾 / PAM4 均衡 / 环回测试' },
  { id: 'm9',  name: 'M9 UIO 与 6.1 新特性',     desc: 'Unordered I/O / CXL 关联' },
  { id: 'm10', name: 'M10 验证重难点专题',       desc: '错误注入 / 覆盖率 / 断言 / 互操作 / 环境' },
  { id: 'm11', name: 'M11 参考资料',             desc: '规范 / 白皮书 / 文章 / 书籍' },
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
];

/* 让旧浏览器/严格模式都安全 */
if (typeof window !== 'undefined') {
  window.MODULES = MODULES;
  window.KNOWLEDGE = KNOWLEDGE;
}
