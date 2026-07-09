// 纯后勤倒排调度引擎 (LogisticsCountdownEngine, StageOS v2.0)
// 职责边界:只做物理流转调度(采购/物流/校验/场地基建),严禁输出任何艺术排练建议。
// 所有里程碑在输出前经过教学词汇拦截过滤,越界任务直接被阻断。
import type { ScheduleItem } from "./stageos";

/** 严格封堵艺术指导越界的关键词黑名单 */
export const LOGISTICS_BLOCKED_KEYWORDS = [
  "排练",
  "发声",
  "走位",
  "表情",
  "音准",
  "动作",
  "节奏",
  "情感",
] as const;

/** 高频动作类节目(需追加物理安全核验节点) */
const HIGH_MOTION_PROGRAM_TYPES = new Set([
  "classical_dance",
  "folk_dance",
  "modern_jazz_street",
  "ballet",
  "cheerleading",
  "acrobatics_martial_arts",
  "sports_opening_ceremony",
]);

export type LogisticsMilestone = {
  /** 演出日前第 N 天 */
  daysBefore: number;
  /** 后勤类别:采购/物流/校验/物资审查/场地基建/现场 */
  category: string;
  task: string;
  owner: string;
};

export type LogisticsTimelineInput = {
  performanceDate?: string;
  weeklyFreq?: number;
  peopleCount: number;
  programType?: string;
  /** 既有基础里程碑(会与引擎追加项合并后统一过滤排序) */
  baseMilestones?: LogisticsMilestone[];
};

/** 任务是否触碰教学词汇红线 */
export function isBlockedLogisticsTask(task: string): boolean {
  return LOGISTICS_BLOCKED_KEYWORDS.some((kw) => task.includes(kw));
}

/**
 * 后勤倒排时间表:
 * 1. 人数 > 30 自动加 7 天物流缓冲(否则 3 天)
 * 2. 高频动作类节目强制追加面料弹力/防滑测试与场地摩擦系数核验节点
 * 3. 每周训练频次 < 3 时试穿校验窗口提前 2 天
 * 4. 所有任务经教学词汇拦截过滤后按日期排序输出
 */
export function buildLogisticsTimeline(input: LogisticsTimelineInput): ScheduleItem[] {
  const { performanceDate, weeklyFreq, peopleCount, programType, baseMilestones = [] } = input;
  const bufferDays = peopleCount > 30 ? 7 : 3;
  const fittingLead = (weeklyFreq ?? 3) < 3 ? 2 : 0;

  const raw: LogisticsMilestone[] = [
    ...baseMilestones,
    {
      daysBefore: 45,
      category: "采购",
      task: `确认 ${peopleCount} 人量体数据,完成服装及 A/B 类道具下单`,
      owner: "采购",
    },
    {
      daysBefore: 20 + bufferDays,
      category: "物流",
      task: "首批入库检查,统计尺码不符清单",
      owner: "排产",
    },
    {
      daysBefore: 10 + fittingLead,
      category: "校验",
      task: "全员带妆及道具静态试穿校验",
      owner: "排产 + 班主任",
    },
  ];

  // 高频动作类:动态追加物理安全核验节点(纯物资与场地,不涉教学)
  if (programType && HIGH_MOTION_PROGRAM_TYPES.has(programType)) {
    raw.push(
      { daysBefore: 20, category: "物资审查", task: "强制进行面料弹力与鞋底防滑测试", owner: "采购" },
      {
        daysBefore: 7,
        category: "场地基建",
        task: "舞台实地踩点,专项确认地板摩擦系数与防滑地胶需求",
        owner: "现场",
      },
    );
  }

  // 教学词汇拦截 + 去重(同天同任务) + 由远及近排序
  const seen = new Set<string>();
  const target = performanceDate ? new Date(performanceDate) : null;
  const timeline: ScheduleItem[] = [];
  for (const m of raw.sort((a, b) => b.daysBefore - a.daysBefore)) {
    if (isBlockedLogisticsTask(m.task)) {
      console.log("[合规模块] 拦截教学越界任务:", m.task);
      continue;
    }
    const key = `${m.daysBefore}|${m.task}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const item: ScheduleItem & { date?: string; category?: string } = {
      daysBefore: m.daysBefore,
      task: m.task,
      owner: m.owner,
    };
    item.category = m.category;
    if (target) {
      const d = new Date(target);
      d.setDate(d.getDate() - m.daysBefore);
      item.date = d.toISOString().slice(0, 10);
    }
    timeline.push(item);
  }
  return timeline;
}
