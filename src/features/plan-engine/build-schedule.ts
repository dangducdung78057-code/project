import type { ScheduleItem } from "@/lib/stageos";

/**
 * 生成倒排计划。
 * 时间线由本地物流排产器(buildLogisticsTimeline)按日程快照生成,
 * 此处保留独立编排位,后续接入省级比赛全自动成案时扩展。
 */
export function buildSchedule(items: ScheduleItem[]): ScheduleItem[] {
  return items;
}
