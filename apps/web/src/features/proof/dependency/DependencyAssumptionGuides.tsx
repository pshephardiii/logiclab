import type { dependencyAssumptionGuides } from './assumption-guides';

export function DependencyAssumptionGuides({
  guides,
  index,
}: {
  guides: ReturnType<typeof dependencyAssumptionGuides>['guides'];
  index: number;
}) {
  return (
    <span className="dependency-assumption-guides" aria-hidden="true">
      {guides
        .filter((guide) => guide.start <= index && guide.end >= index)
        .map((guide) => (
          <span
            key={guide.id}
            className={`dependency-assumption-guide${guide.start === index ? ' guide-start' : ''}${guide.closed && guide.end === index ? ' guide-end' : ''}`}
            style={{ left: `${guide.lane * 0.6}rem` }}
            title={`Assumption on line ${guide.line}`}
          />
        ))}
    </span>
  );
}
