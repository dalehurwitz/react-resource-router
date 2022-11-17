type FeatureFlags = { [key: string]: { value: string } };
type GlobalVar = {
  ssr__allFeatureFlags?: FeatureFlags;
  ssr__feFeatureFlags?: FeatureFlags;
  featureFlags?: FeatureFlags;
};

export const booleanFeatureFlag = (...args: Parameters<typeof String.raw>) => {
  const globalVar = (
    typeof window !== 'undefined' ? window : globalThis
  ) as GlobalVar;
  const featureFlags =
    globalVar.ssr__allFeatureFlags ||
    globalVar.ssr__feFeatureFlags ||
    globalVar.featureFlags;
  const name = String.raw(...args);

  return !!featureFlags?.[name]?.value;
};

export const isImprovedPrefetchingEnabled = () =>
  booleanFeatureFlag`jfp.rrr-improved-prefetching`;
