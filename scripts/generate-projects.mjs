import { writeFile } from "node:fs/promises";

const USER = "lasbt";
const LIMIT = 3;
const TOKEN = process.env.GITHUB_TOKEN;
const IMAGE_TYPES = /\.(?:avif|gif|jpe?g|png|webp)$/i;
const IGNORED_PATHS = /(^|\/)(?:\.git|build|coverage|dist|node_modules|target|vendor)(\/|$)/i;
const IGNORED_NAMES = /(?:^|[-_.])(?:avatar|badge|favicon|icon|logo)(?:[-_.]|$)/i;

async function github(path) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

  const response = await fetch(`https://api.github.com${path}`, {
    headers
  });
  if (!response.ok) throw new Error(`GitHub API returned ${response.status} for ${path}`);
  return response.json();
}

function imagePriority(path) {
  return /(?:cover|demo|hero|preview|screenshot)/i.test(path.split("/").pop()) ? 1 : 0;
}

async function findImage(repository) {
  try {
    const branch = encodeURIComponent(repository.default_branch);
    const { tree = [] } = await github(`/repos/${repository.full_name}/git/trees/${branch}?recursive=1`);
    const image = tree
      .filter((entry) => entry.type === "blob" && IMAGE_TYPES.test(entry.path))
      .filter((entry) => !IGNORED_PATHS.test(entry.path))
      .filter((entry) => !IGNORED_NAMES.test(entry.path.split("/").pop()))
      .filter((entry) => entry.path.split("/").length <= 5)
      .sort((first, second) => imagePriority(second.path) - imagePriority(first.path))[0];

    if (!image) return null;

    const imagePath = image.path.split("/").map(encodeURIComponent).join("/");
    return `https://raw.githubusercontent.com/${repository.full_name}/${branch}/${imagePath}`;
  } catch {
    return null;
  }
}

const repositories = await github(`/users/${USER}/repos?sort=updated&direction=desc&per_page=100`);
const topRepositories = repositories
  .filter((repository) => !repository.fork && !repository.archived)
  .filter((repository) => repository.name.toLowerCase() !== USER)
  .sort((first, second) =>
    second.stargazers_count - first.stargazers_count ||
    second.forks_count - first.forks_count ||
    Date.parse(second.updated_at) - Date.parse(first.updated_at)
  )
  .slice(0, LIMIT);

const snapshot = await Promise.all(topRepositories.map(async (repository) => ({
  name: repository.name,
  full_name: repository.full_name,
  html_url: repository.html_url,
  description: repository.description,
  topics: repository.topics,
  language: repository.language,
  stargazers_count: repository.stargazers_count,
  forks_count: repository.forks_count,
  open_issues_count: repository.open_issues_count,
  updated_at: repository.updated_at,
  license: repository.license ? { spdx_id: repository.license.spdx_id } : null,
  default_branch: repository.default_branch,
  image_url: await findImage(repository)
})));

await writeFile(
  new URL("../www/assets/projects-data.json", import.meta.url),
  `${JSON.stringify(snapshot, null, 2)}\n`
);

console.log(`Generated a snapshot for ${snapshot.length} repositories.`);