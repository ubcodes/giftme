/** Errors whose message is safe to show to people. */
export class UserError extends Error {}

export type Result<T> = ({ ok: true } & T) | { ok: false; error: string }

export async function attempt<T extends object>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, ...(await fn()) }
  } catch (err) {
    if (err instanceof UserError) return { ok: false, error: err.message }
    console.error(err)
    return { ok: false, error: 'Something went wrong on our side. Please try again in a moment.' }
  }
}
