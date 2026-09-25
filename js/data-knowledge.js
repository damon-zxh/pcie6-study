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
];

/* 让旧浏览器/严格模式都安全 */
if (typeof window !== 'undefined') {
  window.MODULES = MODULES;
  window.KNOWLEDGE = KNOWLEDGE;
}
