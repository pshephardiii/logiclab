import {
  proofDiagnosticSchema,
  proofDiagnosticCodeSchema,
  classBillingResponseSchema,
} from '@logiclab/contracts';
import { CheckerDiagnosticCode } from '@logiclab/contracts/checker-diagnostic-code';
import {
  truthTreeDiagnosticSchema,
  truthTreeDiagnosticCodeSchema,
} from '@logiclab/contracts/truth-tree';
import {
  PurchaseStatus,
  ClassCapability,
  purchaseStatusSchema,
  simulatorOutcomeSchema,
} from '@logiclab/contracts/billing-values';

const proofCodes = [
  'UNSUPPORTED_VERSION',
  'RESOURCE_LIMIT',
  'INVALID_STRUCTURE',
  'INVALID_FORMULA',
  'UNKNOWN_RULE',
  'RULE_DISABLED',
  'INVALID_REFERENCE',
  'RULE_MISMATCH',
  'INVALID_DEPENDENCY',
  'INCOMPLETE_PROOF',
  'TARGET_NOT_ESTABLISHED',
];

const truthTreeCodes = [
  'UNSUPPORTED_VERSION',
  'RESOURCE_LIMIT',
  'INVALID_STRUCTURE',
  'INVALID_REFERENCE',
  'INCOMPLETE_TREE',
  'INVALID_PROBLEM',
  'INVALID_FORMULA',
  'INITIAL_MISMATCH',
  'UNKNOWN_RULE',
  'RULE_MISMATCH',
  'INVALID_CLOSURE',
  'VERIFICATION_FAILED',
];

test.each([
  ['proof', proofDiagnosticSchema, proofDiagnosticCodeSchema, proofCodes],
  ['truth tree', truthTreeDiagnosticSchema, truthTreeDiagnosticCodeSchema, truthTreeCodes],
] as const)(
  '%s diagnostics preserve their own exact wire-code subset',
  (_, schema, codeSchema, expected) => {
    expect(codeSchema.options).toEqual(expected);

    for (const code of expected) {
      expect(schema.parse({ code, message: 'Diagnostic detail.' })).toEqual({
        code,
        message: 'Diagnostic detail.',
      });
    }

    for (const code of [...Object.values(CheckerDiagnosticCode), 'FUTURE_DIAGNOSTIC']) {
      expect(schema.safeParse({ code, message: 'Diagnostic detail.' }).success).toBe(
        expected.includes(code),
      );
    }
  },
);

test('shared checker codes contain the two existing catalogs without duplicate values', () => {
  const values = Object.values(CheckerDiagnosticCode);

  expect(new Set(values)).toEqual(new Set([...proofCodes, ...truthTreeCodes]));
  expect(new Set(values).size).toBe(values.length);
  expect(CheckerDiagnosticCode.UnsupportedVersion).toBe('UNSUPPORTED_VERSION');
});

test('billing values preserve purchase states and the narrower simulator outcome set', () => {
  expect(Object.values(PurchaseStatus)).toEqual(['pending', 'paid', 'failed', 'refunded']);
  expect(purchaseStatusSchema.options).toEqual(['pending', 'paid', 'failed', 'refunded']);
  expect(simulatorOutcomeSchema.options).toEqual(['paid', 'failed', 'refunded']);
  expect(simulatorOutcomeSchema.safeParse(PurchaseStatus.Pending).success).toBe(false);
  expect(simulatorOutcomeSchema.safeParse('covered').success).toBe(false);
  expect(ClassCapability.PublishAssignments).toBe('publish_assignments');
});

test('checkout block reasons remain separate from persisted purchase statuses', () => {
  expect(
    classBillingResponseSchema.parse({
      classId: 'a1111111-1111-4111-8111-111111111111',
      checkoutBlockedReason: 'covered',
      coverage: { active: true, endsAt: null },
      purchases: [],
      nextOffset: null,
    }).checkoutBlockedReason,
  ).toBe('covered');
  expect(purchaseStatusSchema.safeParse('covered').success).toBe(false);
});
