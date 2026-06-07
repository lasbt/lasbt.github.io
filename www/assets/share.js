const CONFIG = {
    title: 'Luis Antonio',
    url: 'https://lasbt.github.io',
    // Random phrases for sharing the profile
    phrases: [
        'Take a look at this awesome page:',
        'You might like this:',
        'Found something interesting for you:',
        'Have a look at this site:'
    ]
};

// Utility: get random item from array
function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Build share data dynamically
function createShareData() {
    return {
        title: CONFIG.title,
        text: getRandomItem(CONFIG.phrases),
        url: CONFIG.url
    };
}

// Handle sharing
async function handleShare() {
    const shareData = createShareData();

    if (!navigator.share) {
        alert('Sharing is not supported on this browser.');
        redirectToUrl(shareData.url);
        return;
    }

    try {
        await navigator.share(shareData);
    } catch (err) {
        console.warn('Sharing was cancelled or failed.', err);
    } finally {
        redirectToUrl(shareData.url);
    }
}

// Handle redirect
function redirectToUrl(url) {
    window.location.href = url;
}

// Init
function init() {
    document.body.addEventListener('click', handleShare, { once: true });
}

init();
