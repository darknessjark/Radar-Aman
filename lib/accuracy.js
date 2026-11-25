// Results of the link-check accuracy runs (eval/results/ in the repository has every run and the links used).
export const REPO_RESULTS = "https://github.com/darknessjark/Radar-Aman/tree/main/eval/results";
export const RUNS = [
  { id: "v1", date: "2026-11-24", note: "before any fixes", phish: 77, live: 61, recall: 22.1, precision: 89.5, fpr: 1.1, legit: 177, official: "0/107" },
  { id: "v5", date: "2026-11-24", note: "after fixes, unseen links", phish: 100, live: 33, recall: 11.0, precision: 78.6, fpr: 1.1, legit: 277, official: "0/107" },
  { id: "v6", date: "2026-11-25", note: "+ cloaking, kit and address-shape signals, unseen links", phish: 100, live: 20, recall: 11.0, precision: 61.1, fpr: 2.5, legit: 277, official: "0/107" },
  { id: "v7", date: "2026-11-25", note: "cloaking limited to trap-like pages, unseen links", phish: 100, live: 24, recall: 13.0, precision: 81.3, fpr: 1.1, legit: 277, official: "0/107" }
];
