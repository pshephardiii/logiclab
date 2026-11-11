import type { ReactNode } from 'react';
import { ProofDropdown } from './ProofDropdown';
import { proofNotation } from '../helpers/proof-notation';
import './statement-premises.css';

/** Statement sources are an ordered list, not proof nodes or dependency annotations. */
export function StatementPremises({
  premises,
  selectedId,
  disabled,
  onEdit,
  onMove,
  onDelete,
  entry,
}: {
  premises: { id: string; formula: string }[];
  selectedId: string | null;
  disabled: boolean;
  onEdit: (id: string) => void;
  onMove: (index: number, delta: -1 | 1) => void;
  onDelete: (id: string) => void;
  entry: ReactNode;
}) {
  return (
    <section className="statement-premises" aria-label="Problem premise diagram">
      <ol>
        {premises.map((premise, index) => (
          <li key={premise.id} data-proof-premise={premise.id}>
            <div className={selectedId === premise.id ? 'selected-statement-premise' : undefined}>
              <code>{proofNotation(premise.formula) || '(blank)'}</code>
              <ProofDropdown
                label={`Actions for premise ${index + 1}`}
                trigger={<span aria-hidden="true">⋯</span>}
                disabled={disabled}
              >
                {(close) => (
                  <div className="proof-line-menu">
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        onEdit(premise.id);
                      }}
                    >
                      Edit premise {index + 1}
                    </button>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => {
                        close();
                        onMove(index, -1);
                      }}
                    >
                      Move premise {index + 1} up
                    </button>
                    <button
                      type="button"
                      disabled={index === premises.length - 1}
                      onClick={() => {
                        close();
                        onMove(index, 1);
                      }}
                    >
                      Move premise {index + 1} down
                    </button>
                    <button
                      type="button"
                      className="delete-action"
                      onClick={() => {
                        close();
                        onDelete(premise.id);
                      }}
                    >
                      Delete premise {index + 1}
                    </button>
                  </div>
                )}
              </ProofDropdown>
            </div>
          </li>
        ))}
      </ol>
      {entry}
    </section>
  );
}
