/** Read an error name without assuming a thrown value is an Error instance. */
export const errorName = (error: unknown) => (error instanceof Error ? error.name : '');
