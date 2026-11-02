const GITHUB_REPO = "https://github.com/AnthusAI/Babulus";

export const githubBlobUrl = (path: string) => {
  const clean = path.replace(/^\/+/, "");
  return `${GITHUB_REPO}/blob/main/${clean}`;
};

export const githubTreeUrl = (path: string) => {
  const clean = path.replace(/^\/+/, "");
  return `${GITHUB_REPO}/tree/main/${clean}`;
};

