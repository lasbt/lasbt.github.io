const GITHUB_USER = "lasbt";
const PROJECT_LIMIT = 3;
const IMAGE_TYPES = /\.(?:avif|gif|jpe?g|png|webp)$/i;
const IGNORE_PATHS = /(^|\/)(?:\.git|build|coverage|dist|node_modules|target|vendor)(\/|$)/i;
const IGNORE_NAMES = /(?:^|[-_.])(?:avatar|badge|favicon|icon|logo)(?:[-_.]|$)/i;
const LANGUAGE_COLORS = {
  "C": "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  "CSS": "#663399",
  "Go": "#00add8",
  "HTML": "#e34c26",
  "Java": "#b07219",
  "JavaScript": "#d4a72c",
  "Kotlin": "#a97bff",
  "Python": "#3572a5",
  "Rust": "#dea584",
  "Shell": "#89e051",
  "TypeScript": "#3178c6"
};

const projectList = document.getElementById("project-list");

function formatCount(value) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function makeProjectCard(repository, index) {
  const card = document.createElement("article");
  card.className = "project-card";
  card.style.setProperty("--card-order", index);

  const body = document.createElement("div");
  body.className = "project-card__body";

  const header = document.createElement("div");
  header.className = "project-card__header";

  const heading = document.createElement("h3");
  heading.className = "project-card__title";
  const link = document.createElement("a");
  link.href = repository.html_url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = repository.name;
  heading.append(link);

  const visibility = document.createElement("span");
  visibility.className = "project-card__visibility";
  visibility.textContent = "Public";
  header.append(heading, visibility);

  const description = document.createElement("p");
  description.className = "project-card__description";
  description.textContent = repository.description || "An ongoing project from my GitHub profile.";

  if (repository.topics?.length) {
    const topics = document.createElement("div");
    topics.className = "project-card__topics";
    repository.topics.slice(0, 3).forEach((topic) => {
      const tag = document.createElement("span");
      tag.className = "project-card__topic";
      tag.textContent = topic;
      topics.append(tag);
    });
    body.append(header, description, topics);
  }

  const details = document.createElement("div");
  details.className = "project-card__details";

  if (repository.language) {
    const language = document.createElement("span");
    language.className = "project-card__language";
    const languageDot = document.createElement("span");
    languageDot.className = "project-card__language-dot";
    languageDot.setAttribute("aria-hidden", "true");
    languageDot.style.setProperty("--language-color", LANGUAGE_COLORS[repository.language] || "#68756f");
    language.append(languageDot, repository.language);
    details.append(language);
  }

  const stars = document.createElement("span");
  stars.className = "project-card__metric";
  stars.textContent = `Stars ${formatCount(repository.stargazers_count)}`;

  const forks = document.createElement("span");
  forks.className = "project-card__metric";
  forks.textContent = `Forks ${formatCount(repository.forks_count)}`;

  const issues = document.createElement("span");
  issues.className = "project-card__metric";
  issues.textContent = `Issues ${formatCount(repository.open_issues_count)}`;

  const metrics = document.createElement("div");
  metrics.className = "project-card__metrics";
  metrics.append(stars, forks, issues);
  details.append(metrics);

  const footer = document.createElement("div");
  footer.className = "project-card__footer";

  if (repository.license?.spdx_id) {
    const license = document.createElement("span");
    license.textContent = repository.license.spdx_id;
    footer.append(license);
  }

  const updated = document.createElement("time");
  updated.dateTime = repository.updated_at;
  updated.textContent = `Updated ${new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(repository.updated_at))}`;
  footer.append(updated);

  if (!repository.topics?.length) body.append(header, description);
  body.append(details, footer);
  card.append(body);
  return card;
}

function imagePriority(path) {
  const filename = path.split("/").pop();
  return /(?:cover|demo|hero|preview|screenshot)/i.test(filename) ? 1 : 0;
}

async function findRepositoryImage(repository) {
  try {
    const branch = repository.default_branch.split("/").map(encodeURIComponent).join("/");
    const response = await fetch(
      `https://api.github.com/repos/${repository.full_name}/git/trees/${branch}?recursive=1`,
      { headers: { Accept: "application/vnd.github+json" } }
    );
    if (!response.ok) return null;

    const { tree = [] } = await response.json();
    const images = tree
      .filter((entry) => entry.type === "blob" && IMAGE_TYPES.test(entry.path))
      .filter((entry) => !IGNORE_PATHS.test(entry.path))
      .filter((entry) => !IGNORE_NAMES.test(entry.path.split("/").pop()))
      .filter((entry) => entry.path.split("/").length <= 5)
      .sort((first, second) => imagePriority(second.path) - imagePriority(first.path));

    if (!images.length) return null;

    const imagePath = images[0].path.split("/").map(encodeURIComponent).join("/");
    return `https://raw.githubusercontent.com/${repository.full_name}/${branch}/${imagePath}`;
  } catch {
    return null;
  }
}

async function addRepositoryImage(card, repository, useLiveLookup) {
  const imageUrl = repository.image_url || (useLiveLookup ? await findRepositoryImage(repository) : null);
  if (!imageUrl) return;

  const media = document.createElement("div");
  media.className = "project-card__media";

  const image = document.createElement("img");
  image.src = imageUrl;
  image.alt = `Preview from ${repository.name}`;
  image.loading = "lazy";
  image.addEventListener("error", () => media.remove(), { once: true });

  media.append(image);
  card.prepend(media);
}

async function fetchLiveProjects() {
  const response = await fetch(
    `https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&direction=desc&per_page=100`,
    { headers: { Accept: "application/vnd.github+json" } }
  );
  if (!response.ok) throw new Error("GitHub API request failed");

  return (await response.json())
    .filter((repository) => !repository.fork && !repository.archived)
    .filter((repository) => repository.name.toLowerCase() !== GITHUB_USER)
    .sort((first, second) =>
      second.stargazers_count - first.stargazers_count ||
      second.forks_count - first.forks_count ||
      Date.parse(second.updated_at) - Date.parse(first.updated_at)
    )
    .slice(0, PROJECT_LIMIT);
}

async function loadProjectData() {
  try {
    const response = await fetch("assets/projects-data.json", { cache: "no-store" });
    if (response.ok) {
      const repositories = await response.json();
      if (Array.isArray(repositories)) return { repositories, useLiveImages: false };
    }
  } catch {
    // Local preview can fall back to the public API when no snapshot exists.
  }

  return { repositories: await fetchLiveProjects(), useLiveImages: true };
}

function showStatus(message, linkText, linkUrl) {
  const status = document.createElement("p");
  status.className = "project-status";
  status.textContent = message;

  if (linkText && linkUrl) {
    status.append(" ");
    const link = document.createElement("a");
    link.href = linkUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = linkText;
    status.append(link);
  }

  projectList.replaceChildren(status);
}

async function loadProjects() {
  try {
    const { repositories, useLiveImages } = await loadProjectData();

    if (!repositories.length) {
      showStatus("No public projects to show just yet.", "Browse GitHub", `https://github.com/${GITHUB_USER}`);
      return;
    }

    const cards = repositories.map(makeProjectCard);
    projectList.replaceChildren(...cards);
    await Promise.all(cards.map((card, index) =>
      addRepositoryImage(card, repositories[index], useLiveImages)
    ));
  } catch {
    showStatus(
      "Projects could not load right now.",
      "Browse all repositories on GitHub",
      `https://github.com/${GITHUB_USER}?tab=repositories`
    );
  } finally {
    projectList.setAttribute("aria-busy", "false");
  }
}

loadProjects();