interface GitHubReleaseAsset {
  id: number;
  name: string;
  url: string;
  content_type: string;
  size: number;
}

interface GitHubRelease {
  id: number;
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  assets: GitHubReleaseAsset[];
}

const GITHUB_API_BASE = 'https://api.github.com';
const RELEASE_CACHE_TTL_MS = 60 * 1000;

let cachedRelease: { expiresAt: number; release: GitHubRelease } | null = null;

function getBrokerConfig() {
  const token = process.env.GITHUB_RELEASE_TOKEN;
  const owner = process.env.GITHUB_RELEASE_OWNER;
  const repo = process.env.GITHUB_RELEASE_REPO;

  if (!token || !owner || !repo) {
    throw new Error('Desktop update broker is missing GitHub release configuration.');
  }

  return { token, owner, repo };
}

function getGitHubHeaders(token: string, accept = 'application/vnd.github+json') {
  return {
    Authorization: `Bearer ${token}`,
    Accept: accept,
    'User-Agent': 'ImagineThis-Desktop-Update-Broker',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API request failed (${response.status}): ${body}`);
  }

  return response.json() as Promise<T>;
}

export async function getLatestStableRelease() {
  if (cachedRelease && cachedRelease.expiresAt > Date.now()) {
    return cachedRelease.release;
  }

  const { token, owner, repo } = getBrokerConfig();
  const releases = await fetchJson<GitHubRelease[]>(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/releases?per_page=20`,
    {
      headers: getGitHubHeaders(token),
    }
  );

  const latestRelease = releases.find((release) => !release.draft && !release.prerelease);
  if (!latestRelease) {
    throw new Error('No stable GitHub release was found for desktop updates.');
  }

  cachedRelease = {
    release: latestRelease,
    expiresAt: Date.now() + RELEASE_CACHE_TTL_MS,
  };

  return latestRelease;
}

export async function getReleaseAssetByName(assetName: string) {
  const release = await getLatestStableRelease();
  const asset = release.assets.find((item) => item.name === assetName);

  if (!asset) {
    throw new Error(`Release asset not found: ${assetName}`);
  }

  return asset;
}

export async function downloadReleaseAsset(assetName: string) {
  const { token } = getBrokerConfig();
  const asset = await getReleaseAssetByName(assetName);
  const response = await fetch(asset.url, {
    headers: getGitHubHeaders(token, 'application/octet-stream'),
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub asset download failed (${response.status}): ${body}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  return {
    asset,
    buffer,
  };
}
