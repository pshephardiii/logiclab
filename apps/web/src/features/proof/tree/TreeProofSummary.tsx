import type { TreeProof } from '@logiclab/contracts';
import type { ReactNode } from 'react';
import { treePreviewLayout } from './editor';
import { TreeProofPreview } from './TreeProofPreview';
import { TreeProofNodeList } from './TreeProofNodeList';

/** Read-only entered work or an authorized reference, with a tolerant fallback for unsafe layouts. */
export function TreeProofSummary({
  proof,
  rules,
  label,
  children,
}: {
  proof: TreeProof | null;
  rules: { id: string; label: string }[];
  label: string;
  children?: ReactNode;
}) {
  const layout = proof ? treePreviewLayout(proof) : null;
  const attached = new Set(layout?.order);
  const detached = proof?.nodes.flatMap((_, index) => (attached.has(index) ? [] : [index])) ?? [];
  const root = proof?.nodes.findIndex((node) => node.id === proof.rootId) ?? -1;

  return (
    <details>
      <summary>{label}</summary>
      {!proof ? (
        <p>No proof entered.</p>
      ) : !proof.nodes.length ? (
        <p>No proof nodes entered.</p>
      ) : layout && layout.order.length > 0 ? (
        <>
          <TreeProofPreview proof={proof} rules={rules} label={`${label} diagram`} />
          {detached.length > 0 && (
            <section aria-label="Unattached proof nodes">
              <h4>Unattached nodes</h4>
              <TreeProofNodeList proof={proof} rules={rules} indices={detached} />
            </section>
          )}
        </>
      ) : (
        <>
          <p>
            {layout
              ? 'No existing conclusion root is selected.'
              : 'Shared or cyclic links, duplicate identities or the node limit prevent a tree diagram.'}{' '}
            All entered nodes are listed below.
          </p>
          <p>Conclusion root: node {root < 0 ? '?' : root + 1}.</p>
          <TreeProofNodeList proof={proof} rules={rules} />
        </>
      )}
      {children}
    </details>
  );
}
