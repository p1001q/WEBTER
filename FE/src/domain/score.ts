import type { OpenSourceItem, Service } from "@/api/types";
import { POLICY } from "./policy";

export type ScorePeriod = "d3" | "w" | "m" | "all";
/** 인기 점수 — R-METRIC (점수 자체는 UI에 노출하지 않음) */
export const scoreAll = (s: Service) =>
  s.clicks * POLICY.scoreWeights.click +
  s.likes * POLICY.scoreWeights.like +
  s.saves * POLICY.scoreWeights.save;
export const scoreOf = (s: Service, period: ScorePeriod) =>
  period === "d3"
    ? s.sc[0]
    : period === "w"
      ? s.sc[1]
      : period === "m"
        ? s.sc[2]
        : scoreAll(s);
export const osScoreAll = (o: OpenSourceItem) =>
  o.likes * POLICY.osWeights.like + o.saves * POLICY.osWeights.save;
