const STORY = {
  blogUrl: "https://zunalita.github.io/user/luis",
  build: {
    phrase: "I build with purpose.",
    description: "I see technology as a force for freedom, collaboration, and progress.",
    action: "Explore my work"
  },
  writing: {
    phrase: "And I write every day.",
    description: "Notes, ideas, and experiments from my corner of the web.",
    action: "Visit my blog"
  }
};

const storyStage = document.getElementById("story-stage");
const storySticky = document.getElementById("story-sticky");
const storyVisual = document.getElementById("story-visual");
const storyAccessibleText = document.getElementById("story-accessible-text");
const storyHeading = document.getElementById("story-heading");
const storyDescription = document.getElementById("story-description");
const storyCta = document.getElementById("story-cta");
const storyCtaLabel = document.getElementById("story-cta-label");
const giraffeReveal = document.getElementById("giraffe-reveal");
const giraffeContinuation = document.getElementById("giraffe-continuation");
const waveField = document.getElementById("wave-field");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let showingWriting = false;
let animationVersion = 0;
let frameRequested = false;

function wait(duration) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

async function animatePhrase(phrase, version) {
  if (prefersReducedMotion.matches) {
    storyVisual.textContent = phrase;
    storyHeading.classList.remove("is-typing");
    return;
  }

  storyHeading.classList.add("is-typing");
  storyVisual.classList.add("is-erasing");
  await wait(220);
  if (version !== animationVersion) return;

  storyVisual.textContent = "";
  storyVisual.classList.remove("is-erasing");
  storyVisual.classList.add("is-entering");
  storyVisual.getBoundingClientRect();
  storyVisual.classList.remove("is-entering");

  for (const character of phrase) {
    if (version !== animationVersion) return;
    storyVisual.textContent += character;
    await wait(32);
  }

  if (version === animationVersion) storyHeading.classList.remove("is-typing");
}

function setStoryPhase(isWriting) {
  if (showingWriting === isWriting) return;
  showingWriting = isWriting;
  const version = ++animationVersion;
  const content = isWriting ? STORY.writing : STORY.build;

  if (!isWriting) {
    waveField.classList.remove("is-visible");
    giraffeReveal.classList.remove("is-visible");
    giraffeContinuation.classList.remove("is-visible");
  }
  storyDescription.textContent = content.description;
  storyAccessibleText.textContent = content.phrase;
  storyCtaLabel.textContent = content.action;

  if (isWriting) {
    storyCta.href = STORY.blogUrl;
    storyCta.target = "_blank";
    storyCta.rel = "noopener noreferrer";
  } else {
    storyCta.href = "#work";
    storyCta.removeAttribute("target");
    storyCta.removeAttribute("rel");
  }

  animatePhrase(content.phrase, version).then(async () => {
    if (!isWriting || version !== animationVersion) return;

    waveField.classList.add("is-visible");
    await wait(prefersReducedMotion.matches ? 0 : 450);
    if (version !== animationVersion) return;

    giraffeReveal.classList.add("is-visible");
    giraffeContinuation.classList.add("is-visible");
    await wait(prefersReducedMotion.matches ? 0 : 700);
    if (version === animationVersion) completeStoryScroll();
  });
}

function completeStoryScroll() {
  const stageTop = storyStage.getBoundingClientRect().top + window.scrollY;
  const finalPosition = stageTop + storyStage.offsetHeight - storySticky.offsetHeight;
  window.scrollTo({
    top: finalPosition,
    behavior: prefersReducedMotion.matches ? "auto" : "smooth"
  });
}

function updateStoryFromScroll() {
  frameRequested = false;
  const scrollDistance = storyStage.offsetHeight - storySticky.offsetHeight;
  const progress = Math.min(1, Math.max(0, -storyStage.getBoundingClientRect().top / scrollDistance));
  storySticky.style.setProperty("--story-progress", String(progress));
  setStoryPhase(progress >= 0.42);
}

function requestStoryUpdate() {
  if (frameRequested) return;
  frameRequested = true;
  window.requestAnimationFrame(updateStoryFromScroll);
}

function positionGiraffeContinuation() {
  giraffeContinuation.style.top = `${storyStage.offsetTop + storyStage.offsetHeight}px`;
}

storyVisual.textContent = "";
positionGiraffeContinuation();
animatePhrase(STORY.build.phrase, animationVersion);
window.addEventListener("scroll", requestStoryUpdate, { passive: true });
window.addEventListener("resize", () => {
  positionGiraffeContinuation();
  requestStoryUpdate();
});
window.addEventListener("pageshow", requestStoryUpdate);