import { postProblemHandler } from './handler';
import { problemFixture, problem, draftInput } from '../../../../test/problem-fixture';
import { invokeHandler } from '../../../../test/invoke-handler';
import { sessionId } from '../../../../test/auth-fixture';
test('create uses authenticated ownership and validates formula before writing', async () => {
  const { context, problems, user } = problemFixture();
  expect(
    (await invokeHandler(postProblemHandler(context), draftInput, { logiclab_session: sessionId }))
      .statusCode,
  ).toBe(201);
  expect(problems.create).toHaveBeenCalledWith(user.id, draftInput);
  problems.create.mockClear();
  await expect(
    invokeHandler(
      postProblemHandler(context),
      { ...draftInput, definition: { ...draftInput.definition, formula: 'P &' } },
      { logiclab_session: sessionId },
    ),
  ).rejects.toMatchObject({ code: 'EXPECTED_EXPRESSION' });
  expect(problems.create).not.toHaveBeenCalled();
});
