/* ============================================================
 * PCIe 6.0 学习系统 - 题库数据
 * type: 'single' 单选 | 'multi' 多选 | 'judge' 判断
 * answer: 单选/判断为选项下标数字；多选为下标数组
 * judge 题固定 options: ['正确','错误']
 * ============================================================ */

const QUESTIONS = [

/* ---------------- M1 基础回顾（6题） ---------------- */
{
  id: 'q-m1-01', module: 'm1', type: 'single',
  q: 'TLP 的序列号（Sequence Number）和 LCRC 是在哪一层加上去的？',
  options: ['事务层（Transaction Layer）', '数据链路层（Data Link Layer）', '物理层（Physical Layer）', '软件层（配置空间写）'],
  answer: 1,
  explain: '数据链路层负责可靠交付：为 TLP 加序列号与 LCRC、处理 Ack/Nak 和 Replay。事务层只管 TLP 的生成/解析/排序/流控决策。'
},
{
  id: 'q-m1-02', module: 'm1', type: 'single',
  q: '64 位地址的 Memory Read TLP，其 Header 大小是多少？',
  options: ['3 双字（12B）', '4 双字（16B）', '6 双字（24B）', '取决于 payload 大小'],
  answer: 1,
  explain: '64 位地址 Memory 事务用 4DW Header；32 位地址 Memory 及 IO/Config 用 3DW Header。Header 大小与 payload 无关。'
},
{
  id: 'q-m1-03', module: 'm1', type: 'multi',
  q: '关于 PCIe 流控（Flow Control），下列说法正确的是？',
  options: [
    'Posted、Non-Posted、Completion 三类事务的 credit 相互独立',
    'UpdateFC DLLP 中的数值是"累计已释放"的 credit，发送方做差得到可用量',
    'credit 用尽后发送方仍可发送，接收方必须缓存',
    '流控初始化通过 InitFC1/InitFC2 DLLP 完成'
  ],
  answer: [0, 1, 3],
  explain: 'C 错误：credit 用尽仍发送属于协议违规（会触发流控协议错误）。三类 credit 独立、InitFC 初始化、UpdateFC 增量归还（累计值语义）均正确。'
},
{
  id: 'q-m1-04', module: 'm1', type: 'single',
  q: '接收端检测到某个 TLP 的 LCRC 错误后，典型动作是？',
  options: [
    '丢弃该 TLP 并发送 Nak，要求从该 TLP 起重传',
    '向上层报告数据错误并继续接收后续 TLP',
    '立即将链路转入 Recovery 重新训练',
    '用 ECRC 重新校验并自行纠错'
  ],
  answer: 0,
  explain: '链路层错误处理：发 Nak 请求重传，丢弃该 TLP 及其后到来的（序列号不连续的）TLP，直到重传补齐。只有重传反复失败（REPLAY_NUM 滚动）才升级进 Recovery。ECRC 是端到端校验，与链路层重传无关。'
},
{
  id: 'q-m1-05', module: 'm1', type: 'single',
  q: '链路要从 L1 返回正常工作状态 L0，需要经过哪个 LTSSM 状态？',
  options: ['Detect', 'Polling', 'Recovery', 'Configuration'],
  answer: 2,
  explain: '退出低功耗（L0s/L1）回 L0 都要经过 Recovery 做位锁定/符号锁定恢复。Detect/Polling/Configuration 是初始链路建立路径。'
},
{
  id: 'q-m1-06', module: 'm1', type: 'judge',
  q: '枚举过程中，软件通过"先读 BAR 返回值判断地址空间大小，再写入基址完成映射"。',
  options: ['正确', '错误'],
  answer: 0,
  explain: '写全 1 再读回，根据低位 0 的个数推断 BAR 需要的地址空间尺寸，然后分配并写入基址。这是标准枚举流程。'
},

/* ---------------- M2 总览（4题） ---------------- */
{
  id: 'q-m2-01', module: 'm2', type: 'single',
  q: 'PCIe 各代速率演进正确的是？',
  options: ['Gen5 是 32 GT/s，Gen6 是 64 GT/s', 'Gen5 是 16 GT/s，Gen6 是 64 GT/s', 'Gen5 是 32 GT/s，Gen6 是 128 GT/s', 'Gen4 是 16 GT/s，Gen5 是 64 GT/s'],
  answer: 0,
  explain: 'Gen4=16、Gen5=32、Gen6=64 GT/s（128 GT/s 是 Gen7）。Gen6 x16 单向聚合约 121 GB/s。'
},
{
  id: 'q-m2-02', module: 'm2', type: 'multi',
  q: '下列哪些属于 PCIe 6.0 引入的重大变化？',
  options: ['PAM4 信令', '固定长度 FLIT', '前向纠错 FEC', '8b/10b 编码'],
  answer: [0, 1, 2],
  explain: '8b/10b 是 Gen1/2 时代的编码，Gen3 起改为 128b/130b，Gen6 改为 FLIT+FEC 体系。PAM4、FLIT、FEC（以及 L0p）是 Gen6 的四大支柱。'
},
{
  id: 'q-m2-03', module: 'm2', type: 'judge',
  q: 'PCIe 6.0 的 Nyquist 频率约是 Gen5 的两倍，因此必须更换更高速的信道材料。',
  options: ['正确', '错误'],
  answer: 1,
  explain: 'PAM4 每符号携带 2 bit，64 GT/s 对应符号率 32 GBaud，Nyquist 频率与 Gen5 的 32 GT/s NRZ 相当（约 16 GHz）——"速率翻倍、信道不变"正是 Gen6 的核心卖点之一。'
},
{
  id: 'q-m2-04', module: 'm2', type: 'single',
  q: 'Gen6 设备上电后链路训练的起始速率是？',
  options: ['2.5 GT/s（Gen1）', '32 GT/s（Gen5）', '由 EEPROM 配置的默认速率', '64 GT/s 直接训练'],
  answer: 0,
  explain: '所有 PCIe 设备训练都从 2.5 GT/s 开始，进入 L0 后再经 Recovery 逐级（可跳级）提升到双方支持的最高速率，这是向后兼容的根本保证。'
},

/* ---------------- M3 FLIT（7题） ---------------- */
{
  id: 'q-m3-01', module: 'm3', type: 'single',
  q: 'PCIe 6.0 引入固定长度 FLIT 的根本原因是？',
  options: [
    '减少 TLP 头部开销',
    '为 FEC 提供固定结构，使纠错与重传延迟恒定',
    '兼容以太网帧格式',
    '简化扰码器设计'
  ],
  answer: 1,
  explain: 'FEC 编解码需要固定大小的码块；固定 256B 的 FLIT 让纠错时延、First Retry 时延都是常数。因果链：速率翻倍→PAM4→误码率升高→FEC→FLIT。'
},
{
  id: 'q-m3-02', module: 'm3', type: 'single',
  q: '一个 FLIT 的固定长度是多少字节？',
  options: ['64B', '128B', '256B', '512B'],
  answer: 2,
  explain: 'FLIT 固定 256 字节，由约 236B 的 TLP 装载域、双 CRC（合计 6B）和 14B FEC 域构成（精确域边界以规范为准）。'
},
{
  id: 'q-m3-03', module: 'm3', type: 'multi',
  q: '下列哪些是 PCIe 6.0 定义的 FLIT 类型？',
  options: ['Optimized Header Flit', 'Data Payload Flit', 'Link Control Flit', 'Posted Header Flit'],
  answer: [0, 1, 2],
  explain: '六种类型：Optimized Header、Standard Header、Data Payload、Link Control、Retimer Folio、NULL。"Posted Header Flit"是编造的——流控类型不定义 flit 类型。'
},
{
  id: 'q-m3-04', module: 'm3', type: 'judge',
  q: '一个 TLP 的 payload 可以被拆分到两个相邻 FLIT 中传输。',
  options: ['正确', '错误'],
  answer: 1,
  explain: 'TLP 不能跨 FLIT 边界拆分。放不进当前 FLIT 剩余空间的 TLP 要等下一个 FLIT；大 payload 的 TLP 用整数个 Data Payload flit 承载，尾部 pad。'
},
{
  id: 'q-m3-05', module: 'm3', type: 'single',
  q: '链路空闲时（无 TLP 可发），FLIT 模式下的行为是？',
  options: [
    '停止发送任何数据，链路电气空闲',
    '持续发送 NULL FLIT 维持固定节奏',
    '发送 SKP 有序集占位',
    '自动进入 L1 省电'
  ],
  answer: 1,
  explain: 'FLIT 模式下节奏恒定是硬约束：空闲时发 NULL flit 填充，保证 FEC/重传流水线的可预测性。传统 SKP 周期插入机制在 flit 模式下不再使用。'
},
{
  id: 'q-m3-06', module: 'm3', type: 'single',
  q: 'Ack/Nak 与流控更新信息在 FLIT 模式下如何传输？',
  options: [
    '仍作为独立 DLLP 物理帧发送',
    '搭载在 Link Control FLIT 中',
    '编码进每个 FLIT 的 FEC 域',
    '通过带外信号传递'
  ],
  answer: 1,
  explain: '链路管理信息（流控更新、重传请求等）由 Link Control flit 承载，不再以独立物理帧形式出现——这是 Gen6 链路层外观的重大变化。'
},
{
  id: 'q-m3-07', module: 'm3', type: 'multi',
  q: '验证 FLIT 打包逻辑时，值得优先覆盖的边界场景包括？',
  options: [
    'TLP 恰好填满 FLIT、以及差 1B 放不下的场景',
    '最大 payload（1024DW）TLP 的 header flit + data flit 链',
    '多个小 TLP 拼包进同一 FLIT',
    '所有 FLIT 都只装半个 TLP 的稳态场景'
  ],
  answer: [0, 1, 2],
  explain: 'A/B/C 都是打包规则的高危边界。D 不是有意义的定向场景（且"半个 TLP"本身违反不可拆分规则）。'
},

/* ---------------- M4 PAM4（5题） ---------------- */
{
  id: 'q-m4-01', module: 'm4', type: 'single',
  q: 'PAM4 调制中，每个符号（symbol）携带多少 bit？',
  options: ['1 bit', '2 bit', '4 bit', '8 bit'],
  answer: 1,
  explain: '4 个电平 → log2(4) = 2 bit/符号。因此 64 GT/s 的数据率只对应 32 GBaud 符号率。'
},
{
  id: 'q-m4-02', module: 'm4', type: 'single',
  q: '相比 NRZ，PAM4 的电平间距缩小为 1/3，带来的 SNR 裕量损失约为？',
  options: ['3 dB', '约 9 dB', '20 dB', '6 dB'],
  answer: 1,
  explain: '电平间隔缩小 1/3（约 -9.5dB），眼图高度大幅下降，裸误码率显著升高——这正是必须引入 FEC 的直接原因。'
},
{
  id: 'q-m4-03', module: 'm4', type: 'single',
  q: 'PAM4 采用格雷码（Gray coding）映射电平的好处是？',
  options: [
    '提高每符号携带的 bit 数',
    '判决出错时最可能只错 1 个 bit，减轻 FEC 负担',
    '消除符号间干扰 ISI',
    '降低发射端功耗'
  ],
  answer: 1,
  explain: '相邻电平的 2bit 组合只差 1 bit，噪声导致判到相邻电平时只产生单 bit 错，对 FEC 更友好。格雷码不改变比特率，也不解决 ISI。'
},
{
  id: 'q-m4-04', module: 'm4', type: 'judge',
  q: 'Precoding（预编码）的作用是把信道反射造成的连续相关性错误打散，避免突发错误耗尽 FEC 纠错能力。',
  options: ['正确', '错误'],
  answer: 0,
  explain: 'precoding 在发送端对相邻符号做预运算，接收端逆运算，使一个噪声事件不再连环污染多个符号，配合 RS FEC 的交织获得高可纠率。训练期间协商启用。'
},
{
  id: 'q-m4-05', module: 'm4', type: 'multi',
  q: '关于 Gen6 物理层，下列说法正确的有？',
  options: [
    '符号率 32 GBaud，与 Gen5 NRZ 符号率相同',
    'Nyquist 频率约 16 GHz，与 Gen5 相当',
    'PAM4 使裸信道 BER 更高，因此裸 BER 即可满足 1e-12 目标',
    'Gen6 定义了 PAM4 专属的均衡 preset 集合'
  ],
  answer: [0, 1, 3],
  explain: 'C 错误：PAM4 裸 BER 只能到 1e-4~1e-6 量级，必须靠 FEC+重传才能等效达到 PCIe 的 BER 目标。'
},

/* ---------------- M5 FEC（7题） ---------------- */
{
  id: 'q-m5-01', module: 'm5', type: 'single',
  q: 'Gen6 采用的 FEC 编码是？',
  options: ['汉明码', 'BCH 码', 'RS(544,528)', 'LDPC'],
  answer: 2,
  explain: 'Reed-Solomon RS(544,528)，在 GF(2^10) 上运算：528 个信息符号 + 16 个校验符号。选择它是纠错能力/延迟/面积权衡的结果（轻量 FEC 路线）。'
},
{
  id: 'q-m5-02', module: 'm5', type: 'single',
  q: 'RS(544,528) 最多能纠正一个码字内多少个符号错误？',
  options: ['4 个', '8 个', '16 个', '28 个'],
  answer: 1,
  explain: 'RS 码纠错能力 = 校验符号数/2 = 16/2 = 8 个符号错。配合跨 FLIT 交织，把 burst 错摊到多个码字。'
},
{
  id: 'q-m5-03', module: 'm5', type: 'single',
  q: '接收端收到一个含 3 个符号错的 FLIT（FEC 可以纠正），正确的处理是？',
  options: [
    '静默纠正并向上层交付正确数据，链路无重传',
    '丢弃该 FLIT 并触发 First Retry',
    '进入 Recovery 重新训练',
    '向上层交付带错误标记的数据'
  ],
  answer: 0,
  explain: 'FEC 可纠范围内（≤8 符号错）静默纠正，上层无感知，链路不断流不重传。验证时应检查纠错计数器递增而重传计数不变。'
},
{
  id: 'q-m5-04', module: 'm5', type: 'multi',
  q: '关于 FLIT 中的双 CRC 设计，正确的有？',
  options: [
    'CRC-1 覆盖装载域头部区域，可在 FEC 解码前先校验',
    'CRC-2 覆盖整个 FLIT 净荷',
    '双 CRC 的目的是压缩 First Retry 的判决延迟',
    '两个 CRC 校验都通过才允许 FEC 纠错'
  ],
  answer: [0, 1, 2],
  explain: 'D 说反了：FEC 纠错先于/独立于最终 CRC 判定，CRC-2 在 FEC 解码后做最终校验，防"纠错后仍错"的数据被交付。'
},
{
  id: 'q-m5-05', module: 'm5', type: 'single',
  q: 'First Retry 的触发条件是？',
  options: [
    '任意 1 个符号错误',
    'FEC 不可纠正且 CRC 校验失败',
    '连续收到 3 个 NULL flit',
    '链路空闲超过 1ms'
  ],
  answer: 1,
  explain: '可纠错误静默纠正；只有 FEC 纠不了且 CRC 失败才丢弃该 FLIT 并立即请求重传（不等传统超时）。'
},
{
  id: 'q-m5-06', module: 'm5', type: 'judge',
  q: 'First Retry 以 FLIT 为单位重传，其延迟是常数，因此对上层时延抖动可控。',
  options: ['正确', '错误'],
  answer: 0,
  explain: 'FLIT 固定 256B + FEC 固定结构 → 重传代价可预测。这是 Gen6 "低延迟轻量 FEC" 路线相对以太网重 FEC 的核心差异。'
},
{
  id: 'q-m5-07', module: 'm5', type: 'multi',
  q: '错误注入验证中，必须验证"绝不静默交付坏数据"的兜底场景包括？',
  options: [
    'FEC 把数据"纠成"另一个错误但合法的值，CRC-2 仍失败',
    '连续 First Retry 失败达到阈值，链路升级进 Recovery',
    '仅 FEC 域本身被注入错误',
    '注入可纠数量以内的错误后正常纠正'
  ],
  answer: [0, 1, 2],
  explain: 'D 是正常路径验证。A 是最刁钻的兜底（纠错后必须被 CRC-2 拦下重传）；B 验证升级路径；C 验证校验域自身的完整性保护。'
},

/* ---------------- M6 电源（3题） ---------------- */
{
  id: 'q-m6-01', module: 'm6', type: 'single',
  q: 'L0p 状态的核心能力是？',
  options: [
    '在 L0 内收缩/恢复活动 lane 数，无需进入 Recovery 断流',
    '深度关闭时钟与 PLL',
    '把链路速率降低一半',
    '关闭未使用的 VC'
  ],
  answer: 0,
  explain: 'L0p（Gen6 新增）实现 lane contraction：按需伸缩带宽而数据流不断。深度关时钟是 L1.1/L1.2 的职责；L0p 不改速率、与 VC 无关。'
},
{
  id: 'q-m6-02', module: 'm6', type: 'judge',
  q: 'L0p 收缩/恢复期间，上层看到的数据流必须是连续的（不丢字节、不重复）。',
  options: ['正确', '错误'],
  answer: 0,
  explain: '协议保证数据在保留 lane 上重新分布的连续性。验证时用参考模型比对收缩前后的 byte 流单调连续，这是 L0p 用例的核心断言。'
},
{
  id: 'q-m6-03', module: 'm6', type: 'single',
  q: '恢复延迟从大到小排列，正确的是？',
  options: [
    'L1.2 > L1 > L0s > L0p（恢复动作在 L0 内完成）',
    'L0p > L1.2 > L1 > L0s',
    'L0s > L1 > L1.2 > L0p',
    'L1 > L1.2 > L0s > L0p'
  ],
  answer: 0,
  explain: '越深的省电状态恢复越慢：L1.2（关 PLL/时钟，微秒~几十微秒级）> L1 > L0s > L0p（L0 内部动作，最快）。'
},

/* ---------------- M7 流控（3题） ---------------- */
{
  id: 'q-m7-01', module: 'm7', type: 'single',
  q: 'FLIT 模式下，流控 credit 的计数粒度变为？',
  options: ['以 TLP 个数计', '以 FLIT 及其内部槽位为粒度', '以字节计', '以 symbol 计'],
  answer: 1,
  explain: 'credit 单位从传统 header/DW 计数改为 FLIT 粒度；更新信息由 Link Control flit 承载，不再走独立 DLLP 帧。'
},
{
  id: 'q-m7-02', module: 'm7', type: 'multi',
  q: '共享流控缓冲池（Shared Flow Control Buffer）相比独立 buffer 的优势与约束，正确的有？',
  options: [
    '多类事务共用存储，提高 buffer 利用率',
    '降低接收缓冲总面积',
    '任何情况下三类事务都可以无限制互相挤占',
    '仍需保留防死锁/防饿死的保底规则'
  ],
  answer: [0, 1, 3],
  explain: 'C 错误：池化不等于无序挤占——必须保证 Non-Posted 与 Completion 不互相饿死（死锁避免条款），实现上有隔离/配额策略。'
},
{
  id: 'q-m7-03', module: 'm7', type: 'judge',
  q: '验证流控时，断言"任意时刻 sent ≤ granted"（发送量不超过已授予量）是防止协议违规的基本检查。',
  options: ['正确', '错误'],
  answer: 0,
  explain: 'credit 透支即协议违规。该不变式应作为持续断言挂在 monitor 上，配合"credit 耗尽必须停发"的行为检查。'
},

/* ---------------- M8 均衡（4题） ---------------- */
{
  id: 'q-m8-01', module: 'm8', type: 'single',
  q: 'Gen3+ 的链路均衡（Link Equalization）在哪个 LTSSM 状态中完成？',
  options: ['Polling', 'Configuration', 'Recovery', 'L0'],
  answer: 2,
  explain: '速率切换后的均衡在 Recovery 的 EQ 子阶段完成（Phase 1/2/3），完成后回 L0。'
},
{
  id: 'q-m8-02', module: 'm8', type: 'multi',
  q: '关于均衡 Phase 的说法，正确的有？',
  options: [
    'Phase 1 通过 TS1/TS2 交换初始 preset',
    'Phase 2 调整上行发送端（上行接收端发请求）',
    'Phase 3 调整下行发送端',
    '均衡只做一次，速率变化后无需重做'
  ],
  answer: [0, 1, 2],
  explain: 'D 错误：每次速率改变进 Recovery 都要重新均衡。A/B/C 描述了三阶段流程，各 phase 有独立超时与回退路径——覆盖率重点。'
},
{
  id: 'q-m8-03', module: 'm8', type: 'single',
  q: 'Gen6 均衡相比 Gen5 的显著不同点不包括？',
  options: [
    '使用 PAM4 专属 preset 集合',
    '训练内容包含 precoding 开关协商',
    '接收端训练需同时处理电平判决与采样相位',
    '均衡不再需要，由 FEC 全权兜底'
  ],
  answer: 3,
  explain: 'FEC 与均衡是互补关系：均衡把误码率压到 FEC 可纠的量级，FEC 再把残余错误纠正/重传。PAM4 下均衡反而更重要。'
},
{
  id: 'q-m8-04', module: 'm8', type: 'judge',
  q: 'Loopback 状态常用于信号完整性与 BER 测试，是合规测试的重要手段。',
  options: ['正确', '错误'],
  answer: 0,
  explain: '一方回发收到的数据用于误码统计（BERT），PCI-SIG 物理层一致性测试大量使用；近端/远端环回帮助定位 PHY 与链路问题分界。'
},

/* ---------------- M9 UIO（3题） ---------------- */
{
  id: 'q-m9-01', module: 'm9', type: 'single',
  q: 'UIO（Unordered I/O）主要解决什么问题？',
  options: [
    'PAM4 误码率过高',
    '经典排序规则在多路径交换 fabric 中强制串行化、限制并行度',
    'FLIT 打包的带宽浪费',
    'L0p 恢复延迟过大'
  ],
  answer: 1,
  explain: '传统规则（如 Completion 不得越过 Posted 写）在 AI 集群多路径拓扑里成为吞吐瓶颈；UIO 允许显式声明无排序约束的 IO 流，交换器可乱序转发。'
},
{
  id: 'q-m9-02', module: 'm9', type: 'multi',
  q: '关于 UIO 的兼容性设计，正确的有？',
  options: [
    '不支持 UIO 的设备按传统规则工作，不受影响',
    '需要端到端能力协商',
    'UIO 流可以与任何传统流随意乱序',
    'UIO 于 2024 年以 ECN 发布并并入 6.1 规范'
  ],
  answer: [0, 1, 3],
  explain: 'C 错误：UIO 的乱序是"显式声明、有边界"的，UIO 流与传统流之间仍遵循必要的排序/一致性约束（否则缓存一致性被破坏）。'
},
{
  id: 'q-m9-03', module: 'm9', type: 'judge',
  q: 'CXL 2.0/3.0 复用了 PCIe 6.0 的 FLIT/PAM4 物理与链路层，学 PCIe 6.0 可直接迁移大半知识到 CXL。',
  options: ['正确', '错误'],
  answer: 0,
  explain: 'CXL 在 PCIe 6.0 物理层（FLIT/PAM4/FEC）之上叠加缓存一致性与内存语义协议，FLIT/FEC/L0p 相关的验证资产高度可复用。'
},

/* ---------------- M10 验证专题（6题） ---------------- */
{
  id: 'q-m10-01', module: 'm10', type: 'single',
  q: '错误注入用例中，注入"FEC 纠错能力以内（如 3 个符号错）"的错误，期望的行为是？',
  options: [
    '链路断流并重新训练',
    '静默纠正，重传计数器不变，数据正常交付',
    '触发 First Retry',
    '上报 ECRC 错误'
  ],
  answer: 1,
  explain: '可纠错误静默纠正、上层无感知。检查点：纠错计数器递增、retry 计数不变、scoreboard 数据流一致。'
},
{
  id: 'q-m10-02', module: 'm10', type: 'multi',
  q: '设计 6.0 验证覆盖率模型时，值得建立的交叉覆盖维度包括？',
  options: [
    '错误类型 × 错误数量 × 链路状态（L0/L0p/均衡中）',
    '速率 × 链路宽度 × LTSSM 状态',
    'FLIT 类型 × 填充比例分桶',
    '仅统计代码行覆盖即可'
  ],
  answer: [0, 1, 2],
  explain: 'D 错误：控制密集的协议验证中代码覆盖远不够，功能交叉覆盖（cross coverage）才是主体；A/B/C 是三大核心交叉组。'
},
{
  id: 'q-m10-03', module: 'm10', type: 'single',
  q: '断言"CRC-2 失败后必须在 N 个周期内出现重传请求"主要检验什么？',
  options: [
    'FEC 纠错能力',
    'First Retry 的快速判决与响应路径',
    'credit 归还时限',
    'L0p 数据连续性'
  ],
  answer: 1,
  explain: '这是 First Retry 时延预算的直接形式化：不可纠错误出现后重传请求必须在预算内发出，防止实现退化为慢速超时重传。'
},
{
  id: 'q-m10-04', module: 'm10', type: 'judge',
  q: '6.0 验证的 scoreboard 铁律：无论注错组合多刁钻，交付给事务层的数据流必须与发送端完全一致，或链路明确报错——绝不静默丢失/篡改字节。',
  options: ['正确', '错误'],
  answer: 0,
  explain: '这是错误注入验证的第一原则：所有"有趣行为"（纠正/重传/升级）都必须以数据最终一致为前提，否则就是数据完整性 bug。'
},
{
  id: 'q-m10-05', module: 'm10', type: 'multi',
  q: '6.0 UVM 环境设计建议中，正确的有？',
  options: [
    '建立 FLIT 级与 TLP 级双视角 monitor/scoreboard',
    '设置独立的注错 agent，与随机序列正交组合',
    '参考模型做 TLP→FLIT 装配与 FLIT→TLP 还原的双向比对',
    '把所有检查都放进 DUT 内部（依赖实现细节）'
  ],
  answer: [0, 1, 2],
  explain: 'D 错误：检查应挂在接口/monitor 采集的信号上，避免与实现耦合、保证可复用于不同 DUT 和不同项目。'
},
{
  id: 'q-m10-06', module: 'm10', type: 'single',
  q: '跨代互操作测试中，Gen6 EP 插入 Gen5 only 的 RC，期望结果是？',
  options: [
    '无法工作，需要更换硬件',
    '协商到双方共同支持的最高速率（Gen5）正常工作',
    '强制工作在 2.5 GT/s',
    'RC 报错并禁用该端口'
  ],
  answer: 1,
  explain: '训练时交换速率能力，链路取交集（本例 Gen5）；速率不同不等于不兼容。若 Gen5 下均衡失败才会进一步降速。'
},

/* ---------------- 综合（2题） ---------------- */
{
  id: 'q-x-01', module: 'm2', type: 'single',
  q: '【综合】"速率翻倍 → PAM4 → 误码率升高 → FEC → 固定长度 FLIT → 固定延迟重传"这条因果链中，FLIT 与 First Retry 的关系是？',
  options: [
    'FLIT 让重传延迟恒定，使 FEC+重传路线满足时延敏感场景',
    'FLIT 只是物理层帧格式的美化',
    'First Retry 由软件驱动发起，与 FLIT 无关',
    'FLIT 与 FEC 相互独立，可以分别取消'
  ],
  answer: 0,
  explain: '固定 256B 结构 → FEC 编解码时延常数 → 重传代价可预测。断掉链条任何一环（变长 TLP 直接 FEC / 无 FEC 的 PAM4）都不可行，这是理解 Gen6 的总纲。'
},
{
  id: 'q-x-02', module: 'm10', type: 'multi',
  q: '【综合】作为 6.0 验证工程师，以下哪些是 你 应该优先建立的核心验证资产？',
  options: [
    '分级错误注入矩阵（可纠/不可纠/CRC 分域/复合时机）',
    'TLP↔FLIT 双向参考模型与 scoreboard',
    'L0p 收缩/恢复数据连续性断言',
    '只跑通正常通路（happy path）的冒烟测试'
  ],
  answer: [0, 1, 2],
  explain: '6.0 的验证价值集中在错误处理与打包边界；只有 happy path 的环境在 6.0 项目里几乎没有意义（VIP 自带的示例就能覆盖）。'
},
/* ================= 深度题（对应规范级卡片） ================= */

/* M1 深度（9题） */
{
  id: 'qd-m1-01', module: 'm1', type: 'single',
  q: 'TLP Header 的 DW0 中，Length 字段（以 DW 计的 payload 长度）占多少位？',
  options: ['6 bit', '8 bit', '10 bit', '12 bit'],
  answer: 2,
  explain: 'Length 为 10 bit，位于 DW0 低 10 位，最大 1024 DW = 4KB payload。Length=0 对 MemRd 有特殊含义（读 1 DW）。'
},
{
  id: 'qd-m1-02', module: 'm1', type: 'single',
  q: 'Fmt[1:0] = 10b 表示什么？',
  options: ['3DW Header 无数据', '4DW Header 无数据', '3DW Header 带数据', '4DW Header 带数据'],
  answer: 2,
  explain: 'Fmt：00=3DW无数据、01=4DW无数据、10=3DW带数据、11=4DW带数据。所以 IOWr（3DW 带数据）的 Fmt=10。'
},
{
  id: 'qd-m1-03', module: 'm1', type: 'single',
  q: 'CfgRd0 与 CfgRd1 的区别是？',
  options: [
    '一个带数据一个不带',
    'Type 0 用于访问下游端点的配置空间，Type 1 用于访问下游桥后面的设备配置空间',
    '一个 32 位地址一个 64 位地址',
    '只差 ECRC 是否存在'
  ],
  answer: 1,
  explain: '配置事务由 RC 发起：目标是直连下游总线上的设备用 Type 0（00100），目标是桥后总线的设备用 Type 1（00101），桥根据 Type 1 决定是否转发并转换成 Type 0。'
},
{
  id: 'qd-m1-04', module: 'm1', type: 'single',
  q: 'DLLP 的总长度（链路上传输的字节数）是？',
  options: ['6 字节', '8 字节', '12 字节', '变长'],
  answer: 1,
  explain: 'DLLP 是 8 字节定长帧：1B Type + 3B 信息 + 2B CRC16（以及填充/扩展），无序列号、不需要 Ack。'
},
{
  id: 'qd-m1-05', module: 'm1', type: 'judge',
  q: '流控 credit 字段中"全 1"值（如 12 bit 的 FFFh）表示无限 credit。',
  options: ['正确', '错误'],
  answer: 0,
  explain: '全 1 是规范定义的无限 credit 编码，常用于 header credit 或 buffer 无限大的设计场景，此时该类 TLP 发送不受 credit 约束。'
},
{
  id: 'qd-m1-06', module: 'm1', type: 'single',
  q: 'UpdateFC DLLP 中携带的 credit 数值语义是？',
  options: [
    '本次新增归还的 credit 数（增量）',
    '从链路训练以来累计归还的 credit 总量',
    '当前剩余可用 credit',
    '当前 buffer 占用量'
  ],
  answer: 1,
  explain: 'UpdateFC 携带累计值，发送方用"授予累计 - 已消耗累计"算可用量。累计语义天然容忍单次 DLLP 丢失，后续更新会覆盖。'
},
{
  id: 'qd-m1-07', module: 'm1', type: 'multi',
  q: '经典排序规则中（同一 TC、同一路径），哪些"超越"是禁止的？',
  options: ['Posted 写超越更早的 Posted 写', 'Completion 超越更早的 Posted 写', 'NP 事务超越更早的 NP 事务', 'NP 事务超越更早的 Posted 写'],
  answer: [0, 1, 2],
  explain: '禁止的三条：P 不得越过 P；Cpl 不得越过 P；NP 不得越过 NP。允许的：NP 可越过 P 和 Cpl；Cpl 可越过 NP。这正是死锁避免的核心设计。'
},
{
  id: 'qd-m1-08', module: 'm1', type: 'single',
  q: 'ECAM 机制下，总线 5、设备 3、功能 2 的配置空间偏移 0x10 的地址计算是？',
  options: [
    'MMCFG基址 + 5×2^20 + 3×2^15 + 2×2^12 + 0x10',
    'MMCFG基址 + 5×2^16 + 3×2^11 + 2×2^8 + 0x10',
    'MMCFG基址 + 0x53210',
    'MMCFG基址 + 5×3×2×0x10'
  ],
  answer: 0,
  explain: 'ECAM 地址 = 基址 + (Bus<<20 | Dev<<15 | Func<<12) + offset。256 条总线 × 32 设备 × 8 功能 × 4KB = 256MB 映射空间。'
},
{
  id: 'qd-m1-09', module: 'm1', type: 'single',
  q: '调试时想把链路锁定在 8 GT/s 不让它爬升到 32 GT/s，应该改哪个寄存器字段？',
  options: [
    'Link Control 中的 ASPM 控制位',
    'Device Control 中的 MPS 字段',
    'Link Control 2 中的 Target Link Speed 字段',
    'MSI-X 的 BIR 字段'
  ],
  answer: 2,
  explain: 'LinkCtrl2 的 Target Link Speed[3:0]（PCIe Capability +2Ch 处）设定目标速率，训练时链路不会超过它——是链路调试最常用的"限速开关"。'
},

/* M2/M3 深度（4题） */
{
  id: 'qd-m2-01', module: 'm2', type: 'multi',
  q: '关于 Gen5→Gen6 的逐层变化，正确的有？',
  options: [
    '事务层 TLP 格式基本不变，但需要被装配进 FLIT',
    '数据链路层的独立 DLLP 物理帧消失，由 Link Control Flit 承载链路管理信息',
    '物理层从 128b/130b NRZ 换成 PAM4',
    '排序规则在 6.0 基线中被完全废除'
  ],
  answer: [0, 1, 2],
  explain: 'D 错误：6.0 基线保留经典排序；6.1 的 UIO 是"可选放松"而非废除，且需要能力协商。A/B/C 即"TL 不动、DL 重来、PL 换血"。'
},
{
  id: 'qd-m3-01', module: 'm3', type: 'single',
  q: '公开资料普遍引用的 256B FLIT 划分是？',
  options: [
    '236B 净荷 + 6B 双 CRC + 14B FEC 校验',
    '240B 净荷 + 8B CRC + 8B FEC',
    '128B 净荷 + 64B CRC + 64B FEC',
    '224B 净荷 + 16B CRC + 16B FEC'
  ],
  answer: 0,
  explain: '236+6+14=256：CRC-1（2B）保护 header 区、CRC-2（4B）保护净荷、14B 承载 RS(544,528) 校验符号（跨 FLIT 交织）。精确边界以规范为准。'
},
{
  id: 'qd-m3-02', module: 'm3', type: 'judge',
  q: 'FLIT 模式下速率切换（32↔64 GT/s）时，切换瞬间的 in-flight TLP 可以直接丢弃重发，无需特殊处理。',
  options: ['正确', '错误'],
  answer: 1,
  explain: '模式切换（非 FLIT ↔ FLIT）伴随链路层协议模式变化，规范要求切换前处理好在途数据（确认/清空），验证中这是必须覆盖的定向场景。'
},
{
  id: 'qd-m3-03', module: 'm3', type: 'multi',
  q: 'TLP→FLIT 装配参考模型中，必须从规范确认（不能想当然）的规则包括？',
  options: ['pad 字节的合法值集合', '多 TLP 拼包的类型兼容规则', 'Link Control 信息的搭载优先级', 'FLIT 的 lane striping 字节序'],
  answer: [0, 1, 2, 3],
  explain: '四条全选。参考模型"错得自信"比 DUT 错更危险——所有规则必须以规范原文为准并标注条款来源。'
},

/* M4/M5 深度（5题） */
{
  id: 'qd-m4-01', module: 'm4', type: 'single',
  q: 'PAM4 的 4 个电平（归一化）与相邻电平间距是？',
  options: ['电平 ±1、±2，间距 1', '电平 -3/-1/+1/+3，间距 2', '电平 0/1/2/3，间距 1', '电平 ±0.5、±1.5，间距 1'],
  answer: 1,
  explain: '等间距四电平 -3/-1/+1/+3（间距 2），NRZ 是 ±1（间距 2）——所以 PAM4 眼高是 NRZ 的 1/3，SNR 损失约 9.5dB。'
},
{
  id: 'qd-m4-02', module: 'm4', type: 'judge',
  q: 'PAM4 采用格雷映射后，判决错到相邻电平只会产生单 bit 错，这减轻了 FEC 的纠错负担。',
  options: ['正确', '错误'],
  answer: 0,
  explain: '格雷码保证相邻电平的 2bit 组合只差 1 bit——最常见的判决错误（错到相邻电平）只损坏 1 bit，配合 RS 码符号纠错效率更高。'
},
{
  id: 'qd-m5-01', module: 'm5', type: 'single',
  q: 'RS(544,528) 在 GF(2^10) 上定义，其纠错能力（每个码字可纠正的符号错数）是？',
  options: ['4 个符号', '8 个符号', '16 个符号', '528 个符号'],
  answer: 1,
  explain: '16 个校验符号 → 最小距离 17 → 可纠 floor(16/2)=8 个符号错。这是轻量 FEC 的设计平衡点：开销小（约 3% 码率损失）、纠错配合重传够用。'
},
{
  id: 'qd-m5-02', module: 'm5', type: 'multi',
  q: '关于 FEC 交织（interleaving）的设计意图，正确的有？',
  options: [
    '把连续 burst 错误摊薄到多个码字，每个码字错数不超过 8',
    '让校验符号跨 FLIT 分布，而非集中存放',
    '10 bit GF 符号对应 5 个链路符号，把错误局部化',
    '交织可以替代重传机制'
  ],
  answer: [0, 1, 2],
  explain: 'D 错误：交织提高 burst 容忍度，但不能替代重传——超出纠错能力的错误仍需 First Retry。A/B/C 是交织+符号宽度的三重防御逻辑。'
},
{
  id: 'qd-m5-03', module: 'm5', type: 'single',
  q: '一个 FLIT 被注入 9 个符号错（RS 纠错上限 8），最可能的行为链是？',
  options: [
    '静默纠正，无任何反应',
    'FEC 不可纠 → CRC 判决 → 丢弃该 FLIT → First Retry 重传',
    '直接进入 Recovery 重新训练',
    '向上层交付带错误标记的数据'
  ],
  answer: 1,
  explain: '超纠错能力 → CRC-2 拦截 → 整 FLIT 丢弃并触发 First Retry（常数延迟重传）。连续失败才升级 Recovery。绝不允许交付未确认的数据。'
},

/* M6/M7/M8 深度（5题） */
{
  id: 'qd-m6-01', module: 'm6', type: 'single',
  q: 'L0p 收缩/恢复（lane downshift/upshift）的切换边界是？',
  options: [
    '任意字节边界',
    'FLIT 边界',
    'TLP 边界',
    '必须先进入 Recovery 才能切换'
  ],
  answer: 1,
  explain: 'L0p 在 L0 内以 FLIT 边界为切换点，数据流不断；FLIT 的 lane striping 在切换点更新。这正是 FLIT 固定长度带来的另一个好处。'
},
{
  id: 'qd-m7-01', module: 'm7', type: 'single',
  q: '共享流控池（总量 64 credit）中，为防止某类事务饿死，正确的设计是？',
  options: [
    '三类事务完全均分池容量',
    '为 Non-Posted/Completion 等设置保底配额，同时允许池化共享',
    '谁先到谁占用，不做限制',
    '只允许 P 类使用共享池'
  ],
  answer: 1,
  explain: '池化的意义是提高利用率，但必须保留防死锁/防饿死的保底约束（如 NP、Cpl 的最小保留配额）。完全无限制的挤占会导致 Completion 无法归还进而死锁。'
},
{
  id: 'qd-m8-01', module: 'm8', type: 'single',
  q: 'Gen3-5 均衡中，TX preset 的编码范围是？',
  options: ['0~3', '0~7', '0~9', '0~15'],
  answer: 2,
  explain: 'Preset 0~9（4 bit 编码），训练时先用 preset 粗调、再用显式系数（C-1/C0/C+1 各 6 bit）细调。Gen6 的 PAM4 preset 是独立定义的集合。'
},
{
  id: 'qd-m8-02', module: 'm8', type: 'multi',
  q: '均衡请求-确认流程中，验证必须覆盖的异常路径包括？',
  options: ['对端发出越界的非法系数请求', '请求发出后对端超时不响应', 'Phase 中途对端反悔（回退请求）', 'Retimer 转发破坏 EQ 握手时序'],
  answer: [0, 1, 2, 3],
  explain: '全选。均衡的异常路径是链路训练 bug 密集区：每条异常都应有明确回退行为（拒绝/保持旧值/超时重试/降速），并纳入覆盖率。'
},
{
  id: 'qd-m8-03', module: 'm8', type: 'judge',
  q: 'Loopback 状态验证中，"异常退出"（掉电、复位、对端消失）场景比正常进入/退出更重要。',
  options: ['正确', '错误'],
  answer: 0,
  explain: '正常路径几乎不会出错；异常退出若处理不当会留下悬挂状态，导致后续训练失败——这类问题在硅后极难定位，RTL 阶段必须覆盖。'
},

/* M9 深度（2题） */
{
  id: 'qd-m9-01', module: 'm9', type: 'multi',
  q: '关于 TLP 前缀（TLP Prefix），正确的有？',
  options: [
    'End-End Prefix 端到端有效，中间代理不得修改或删除',
    'PASID 前缀配合 IOMMU 实现多进程 DMA 隔离',
    '前缀位于 TLP Header 之后、Payload 之前',
    'FLIT 模式下前缀随 TLP 一起装配进 FLIT 净荷'
  ],
  answer: [0, 1, 3],
  explain: 'C 错误：前缀在 TLP Header **之前**（所以叫前缀）。前缀分 End-End 和 Local 两类，数量有上限，是 Gen4+ SVA/PASID 等扩展的基础机制。'
},
{
  id: 'qd-m9-02', module: 'm9', type: 'single',
  q: 'UIO 与传统 Relaxed Ordering（RO）的本质区别是？',
  options: [
    'UIO 只用于 Memory 写，RO 只用于读',
    'RO 只在同路径放松个别写-写限制；UIO 是跨路径、成体系、需能力协商的乱序框架',
    'UIO 由硬件自动启用，RO 需要软件设置',
    '没有本质区别，只是换了名字'
  ],
  answer: 1,
  explain: 'RO 是 Gen1 时代的小幅放松（同路径、特定写-写对）；UIO 面向多路径 fabric，允许显式标记的 IO 流跨路径乱序，引入流标记与能力协商，是 6.1 的体系性增强。'
},

/* M10 深度（4题） */
{
  id: 'qd-m10-01', module: 'm10', type: 'single',
  q: '为什么 TLP↔FLIT 参考模型需要"双比对点"（FLIT 边界 + TLP 边界）？',
  options: [
    '节省仿真时间',
    '只比 TLP 流会漏掉"打包非法但 TLP 恰可还原"的 bug；只比 FLIT 流会在合法重传/纠错时误报',
    '规范要求必须有两个比对点',
    '为了支持多 VC 并发'
  ],
  answer: 1,
  explain: '双比对点 = 高灵敏度 + 低误报：FLIT 级抓打包/CRC 布局错误，TLP 级抓数据完整性错误，且知道注错信息后能容忍合法的纠错与重传。'
},
{
  id: 'qd-m10-02', module: 'm10', type: 'multi',
  q: '哪些验证对象适合用形式验证（formal）解决？',
  options: [
    'RS 译码器的全部错误模式枚举（1~8 错位置组合）',
    'FLIT 装配器在任意输入下不违反装配规则',
    '流控不变式 consumed ≤ granted 对任意归还时序成立',
    '大规模系统级性能测试'
  ],
  answer: [0, 1, 2],
  explain: 'D 属于性能/长稳验证，是 emulation 的领域。formal 擅长"有限状态空间的穷尽证明"：纯函数单元、协议合规性质、不变式。'
},
{
  id: 'qd-m10-03', module: 'm10', type: 'judge',
  q: 'Gen6 项目常见 bug 集中在正常通路的带宽与时延上，错误处理路径反而很少出问题。',
  options: ['正确', '错误'],
  answer: 1,
  explain: '恰好相反：常见 bug 模式（打包边界、CRC 覆盖域、FEC 误纠、L0p 竞态、credit 归还丢失等）全部在边界与异常路径，正常通路往往全部绿灯。'
},
{
  id: 'qd-m10-04', module: 'm10', type: 'single',
  q: '性能验证中"1024 个 outstanding 读请求并发"这个用例主要检验什么？',
  options: [
    'FEC 纠错能力',
    'Tag 资源用尽场景的行为与恢复（10-bit tag 支持与回退）',
    'L0p 收缩速度',
    'ECRC 生成正确性'
  ],
  answer: 1,
  explain: 'Tag 默认 8 bit（256 个），Gen4+ 可扩展到 10 bit（1024 个）。outstanding 上限用例验证 tag 管理、流控配合与耗尽后的反压行为。'
},
];

if (typeof window !== 'undefined') {
  window.QUESTIONS = QUESTIONS;
}
