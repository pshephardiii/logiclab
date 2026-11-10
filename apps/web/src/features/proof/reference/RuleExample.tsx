import { getPropositionalRule } from '@logiclab/logic-engine/proof/rules';
import type { ExampleLine } from './rule-reference';
import type { ReactNode } from 'react';

export type ProofHelpFormat = 'fitch' | 'dependency' | 'tree';
type Props = {
  lines: ExampleLine[];
  format: ProofHelpFormat;
  rules: { id: string; label: string }[];
};

/** Static examples only. Never receives or evaluates the current reference/student proof. */
export function RuleExample({ lines, format, rules }: Props) {
  const label = (id: string) =>
    rules.find((rule) => rule.id === id)?.label ?? getPropositionalRule(id)?.label ?? id;

  function tree(position: number, path: string): ReactNode {
    const line = lines[position - 1]!;
    return (
      <div className="rule-example-node" key={path}>
        {line.kind === 'inference' && (
          <>
            <div className="rule-example-children">
              {line.citations.map((citation, index) => tree(citation, `${path}-line-${index}`))}
              {line.discharges.map(([assumption, end], index) => (
                <div className="rule-example-branch" key={index}>
                  {tree(end, `${path}-branch-${index}`)}
                  <span>Discharge assumption a{assumption}</span>
                </div>
              ))}
            </div>
            <span className="rule-example-rule">{label(line.rule!)}</span>
          </>
        )}
        <code>{line.kind === 'assumption' ? `[${line.formula}] a${position}` : line.formula}</code>
        {line.kind === 'premise' && <span>Premise</span>}
      </div>
    );
  }

  if (format === 'tree')
    return (
      <div
        className="proof-reference-scroll"
        role="region"
        aria-label="Worked tree example"
        tabIndex={0}
      >
        {tree(lines.length, 'root')}
      </div>
    );

  return (
    <div
      className="proof-reference-scroll"
      role="region"
      aria-label={`Worked ${format} example`}
      tabIndex={0}
    >
      <table className="proof-reference-table rule-example-lines">
        <caption>Worked {format === 'fitch' ? 'Fitch' : 'dependency'} example</caption>
        <thead>
          <tr>
            <th scope="col">Line</th>
            {format === 'dependency' && <th scope="col">Dependencies</th>}
            <th scope="col">Formula</th>
            <th scope="col">Reason</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={index}>
              <th scope="row">{index + 1}</th>
              {format === 'dependency' && (
                <td>
                  {'{'}
                  {line.dependencies.join(', ')}
                  {'}'}
                </td>
              )}
              <td
                className={format === 'fitch' && line.scope ? 'rule-example-subproof' : undefined}
              >
                <code>{line.formula}</code>
              </td>
              <td>
                {line.kind === 'premise' ? (
                  'Premise'
                ) : line.kind === 'assumption' ? (
                  'Assumption'
                ) : (
                  <>
                    {label(line.rule!)}
                    {line.citations.length > 0 && ` · ${line.citations.join(', ')}`}
                    {line.discharges.length > 0 &&
                      ` · ${format === 'dependency' ? 'discharge pairs' : 'subproofs'} ${line.discharges.map(([start, end]) => `${start}–${end}`).join(', ')}`}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
