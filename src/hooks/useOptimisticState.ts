import { useState, useTransition, useCallback } from "react";

export function useOptimisticState<T>(
  initialState: T,
  action: (state: T) => Promise<{ success: boolean; error?: string }>
) {
  const [state, setState] = useState<T>(initialState);
  const [isPending, startTransition] = useTransition();

  const updateState = useCallback(
    (nextState: T) => {
      const previousState = state;
      setState(nextState);

      startTransition(async () => {
        try {
          const res = await action(nextState);
          if (!res.success) {
            setState(previousState);
          }
        } catch (err) {
          setState(previousState);
        }
      });
    },
    [state, action]
  );

  return [state, updateState, isPending] as const;
}
