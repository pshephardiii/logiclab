export type SampleStage<Work> = { caption: string; work: Work };

/** Each public demonstration snapshot is independent of adjacent stages and editable work. */
export function sampleStage<Work>(caption: string, work: Work): SampleStage<Work> {
  return { caption, work: structuredClone(work) };
}

/** Stable, repository-owned identities make curated citations reproducible across loads. */
export function sampleId(number: number): string {
  return `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
}
