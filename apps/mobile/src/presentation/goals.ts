export function shouldShowGoalsInitialLoadFailure(
  hasLoaded: boolean,
  loadError: string | null,
): boolean {
  return !hasLoaded && loadError !== null;
}
