// instroom.js
document.addEventListener("DOMContentLoaded", () => {
  const loadingDiv = document.getElementById("loading");
  const errorDiv = document.getElementById("error");
  const profileDataDiv = document.getElementById("profile-data");
  const initialStateDiv = document.getElementById("initial-state");
  const usernameSpan = document.getElementById("username");
  const emailSpan = document.getElementById("email");
  const followersSpan = document.getElementById("followers");
  const locationSpan = document.getElementById("country");
  const engagementRateSpan = document.getElementById("engagement-rate");
  const averageLikesSpan = document.getElementById("average-likes");
  const averageCommentsSpan = document.getElementById("average-comments");
  const averageReelPlaysSpan = document.getElementById("average-reel-plays");
  const remainingCreditsSpan = document.getElementById("remaining-credits");
  const profileSection = document.querySelector(".profile-section") || document.getElementById("profile-data");
  const profilePicImg = document.getElementById("profile-pic");
  const fetchDataBtn = document.getElementById("fetch-data-btn");

  // Initialize Bootstrap tooltips
  if (typeof bootstrap !== 'undefined') {
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
      new bootstrap.Tooltip(el);
    });
  }

  function formatNumber(num) {
    if (typeof num !== 'number' || isNaN(num)) return "N/A";
    if (num < 1000) return num.toString();
    if (num < 1000000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    if (num < 1000000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  }

  function loadRemainingCredits() {
    chrome.storage.local.get(["usageCount", "lastReset"], (result) => {
      const MAX_USAGE = 1000;
      let usageCount = result.usageCount || 0;
      const currentMonth = new Date().toISOString().slice(0, 7);
      if (result.lastReset !== currentMonth) usageCount = 0;
      remainingCreditsSpan.textContent = MAX_USAGE - usageCount;
    });
  }

  // Minimize / restore popup
  const minimizeBtn = document.getElementById("minimize-btn");
  const popupContainer = document.querySelector(".popup-container");

  function applyMinimizedState(minimized) {
    if (!popupContainer || !minimizeBtn) return;
    popupContainer.classList.toggle("minimized", minimized);
    minimizeBtn.title = minimized ? "Restore" : "Minimize";
    window.parent.postMessage({ type: "resize_sidebar", height: document.body.scrollHeight }, "*");
    try { localStorage.setItem("instroom_minimized", minimized ? "1" : "0"); } catch (e) {}
  }

  if (minimizeBtn && popupContainer) {
    let initialMin = false;
    try { initialMin = localStorage.getItem("instroom_minimized") === "1"; } catch (e) {}
    applyMinimizedState(initialMin);
    minimizeBtn.addEventListener("click", () => {
      applyMinimizedState(!popupContainer.classList.contains("minimized"));
    });
  }

  function displayCommonData(data) {
    usernameSpan.textContent = data.username || "N/A";
    emailSpan.textContent = data.email || "N/A";
    locationSpan.textContent = data.location || "N/A";
    profilePicImg.src = data.profilePicUrl || "images/instroomLogo.png";
    profilePicImg.onerror = () => { profilePicImg.src = "images/instroomLogo.png"; };
    followersSpan.textContent = formatNumber(data.followers_count);
  }

  function displayInstagramData(data) {
    displayCommonData(data);
    engagementRateSpan.textContent = data.engagement_rate || "N/A";
    averageLikesSpan.textContent = data.avg_likes || "N/A";
    averageCommentsSpan.textContent = data.avg_comments || "N/A";
    averageReelPlaysSpan.textContent = data.avg_video_views || "N/A";
  }

  function displayTikTokData(data) {
    displayCommonData(data);
    engagementRateSpan.textContent = data.engagement_rate || "N/A";
    averageLikesSpan.textContent = data.avg_likes || "N/A";
    averageCommentsSpan.textContent = data.avg_comments || "N/A";
    averageReelPlaysSpan.textContent = data.avg_video_views || "N/A";
  }

  function displayError(message) {
    loadingDiv.style.display = "none";
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
  }

  window.addEventListener("message", (event) => {
    const request = event.data;
    if (!request) return;

    if (request.type === "refresh_sidebar") {
      initialStateDiv.style.display = "block";
      loadingDiv.style.display = "none";
      profileDataDiv.style.display = "none";
      errorDiv.style.display = "none";
      loadRemainingCredits();

    } else if (request.message === "instagram_data") {
      initialStateDiv.style.display = "none";
      loadingDiv.style.display = "none";
      profileDataDiv.style.display = "block";
      displayInstagramData(request.data);

    } else if (request.message === "tiktok_data") {
      initialStateDiv.style.display = "none";
      loadingDiv.style.display = "none";
      profileDataDiv.style.display = "block";
      displayTikTokData(request.data);

    } else if (request.message === "profile_url") {
      if (request.profilePicUrl) profilePicImg.src = request.profilePicUrl;
      if (request.username) usernameSpan.textContent = request.username;

    } else if (request.message === "instagram_data_error" || request.message === "tiktok_data_error") {
      displayError(request.error);

    } else if (request.message === "usage_limit_reached") {
      displayError(request.error);
      if (profileSection) {
        profileSection.innerHTML = `
          <div class="no-credits-message">
            <p>You've reached your monthly credit limit. To continue using all features, please upgrade your plan:</p>
            <a href="https://instroom-landing-page.vercel.app/" target="_blank">Subscribe</a>
          </div>
        `;
      }
      initialStateDiv.style.display = "none";
      profileDataDiv.style.display = "none";

    } else if (request.message === "remaining_credits") {
      remainingCreditsSpan.textContent = request.remaining;
    }
  });

  fetchDataBtn.addEventListener("click", () => {
    initialStateDiv.style.display = "none";
    loadingDiv.style.display = "block";
    errorDiv.style.display = "none";

    const spinnerHtml = '<div class="spinner"></div>';
    engagementRateSpan.innerHTML = spinnerHtml;
    averageLikesSpan.innerHTML = spinnerHtml;
    averageCommentsSpan.innerHTML = spinnerHtml;
    averageReelPlaysSpan.innerHTML = spinnerHtml;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0 && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { message: "get_profile_url" });
      } else {
        displayError("Could not find an active tab to analyze.");
      }
    });
  });

  loadRemainingCredits();

  const resizeObserver = new ResizeObserver(() => {
    window.parent.postMessage({ type: "resize_sidebar", height: document.body.scrollHeight }, "*");
  });
  resizeObserver.observe(document.body);

  // Copy to clipboard
  const copyBtn = document.getElementById("copy-email-btn");
  let copyTimeout;

  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const emailText = emailSpan.textContent.trim();
      if (!emailText || emailText === "N/A") return;

      const showCopied = () => {
        const copyIcon = copyBtn.querySelector(".copy-icon");
        const checkIcon = copyBtn.querySelector(".check-icon");
        copyIcon.style.display = "none";
        checkIcon.style.display = "block";
        clearTimeout(copyTimeout);
        copyTimeout = setTimeout(() => {
          copyIcon.style.display = "block";
          checkIcon.style.display = "none";
        }, 1500);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(emailText).then(showCopied).catch(() => {
          const ta = document.createElement("textarea");
          ta.value = emailText;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          if (document.execCommand("copy")) showCopied();
          document.body.removeChild(ta);
        });
      } else {
        const ta = document.createElement("textarea");
        ta.value = emailText;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        if (document.execCommand("copy")) showCopied();
        document.body.removeChild(ta);
      }
    });
  }
});
