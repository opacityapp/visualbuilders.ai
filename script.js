/* ========================================
   Visual Builders — script.js
   ======================================== */

document.addEventListener("DOMContentLoaded", () => {
  initVideoPlayback();
  initNavScroll();
  initCommunity();
});

/* ========== Video Playback + Effects ========== */

function initVideoPlayback() {
  const medias = Array.from(document.querySelectorAll(".video-block__media"));
  const spacers = Array.from(document.querySelectorAll(".video-block__spacer"));
  const videos = medias.map((m) => m.querySelector("video"));
  const muteButtons = medias.map((m) => m.querySelector(".video-block__mute"));

  if (medias.length < 1) return;

  let isMuted = true;
  let activeIndex = 0;
  let ticking = false;

  // Build custom player bar for each video
  const playerBars = medias.map((media, i) => {
    const bar = document.createElement("div");
    bar.className = "video-player-bar";
    bar.innerHTML = `
      <button class="video-player-bar__btn" data-action="play-pause" aria-label="Pause">
        <svg class="icon-pause" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"/>
          <rect x="14" y="4" width="4" height="16" rx="1"/>
        </svg>
        <svg class="icon-play" viewBox="0 0 24 24" fill="currentColor" style="display:none">
          <polygon points="6 4 20 12 6 20"/>
        </svg>
      </button>
      <div class="video-player-bar__scrubber">
        <div class="video-player-bar__track">
          <div class="video-player-bar__progress"></div>
        </div>
      </div>
      <span class="video-player-bar__time">0:00 / 0:00</span>
    `;
    media.appendChild(bar);
    return bar;
  });

  function formatTime(seconds) {
    if (!isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // Enter player mode — show custom bar, hide overlay
  function enterPlayerMode(index) {
    const caption = medias[index].querySelector(".video-block__caption");
    const muteBtn = muteButtons[index];

    if (caption) caption.style.display = "none";
    if (muteBtn) muteBtn.style.display = "none";
    playerBars[index].classList.add("is-active");
    medias[index].dataset.playerMode = "true";
  }

  // Exit player mode — hide custom bar, restore overlay
  function exitPlayerMode(index) {
    const caption = medias[index].querySelector(".video-block__caption");
    const muteBtn = muteButtons[index];

    if (caption) {
      caption.style.display = "";
      caption.style.opacity = "";
    }
    if (muteBtn) {
      muteBtn.style.display = "";
      muteBtn.style.opacity = "";
    }
    playerBars[index].classList.remove("is-active");
    delete medias[index].dataset.playerMode;
  }

  // Update progress bar and time display
  function updatePlayerBar(index) {
    const video = videos[index];
    const bar = playerBars[index];
    if (!video || !bar) return;

    const progress = bar.querySelector(".video-player-bar__progress");
    const time = bar.querySelector(".video-player-bar__time");
    const pct = video.duration ? (video.currentTime / video.duration) * 100 : 0;
    progress.style.width = `${pct}%`;
    time.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;

    // Update play/pause icon
    const iconPause = bar.querySelector(".icon-pause");
    const iconPlay = bar.querySelector(".icon-play");
    if (video.paused) {
      iconPause.style.display = "none";
      iconPlay.style.display = "block";
    } else {
      iconPause.style.display = "block";
      iconPlay.style.display = "none";
    }
  }

  // Wire up timeupdate for progress
  videos.forEach((video, i) => {
    if (!video) return;
    video.addEventListener("timeupdate", () => {
      if (medias[i].dataset.playerMode) updatePlayerBar(i);
    });
    video.addEventListener("pause", () => updatePlayerBar(i));
    video.addEventListener("play", () => updatePlayerBar(i));
  });

  // Wire up player bar buttons and scrubber
  playerBars.forEach((bar, i) => {
    // Play/pause — resume with audio when playing from paused
    bar
      .querySelector('[data-action="play-pause"]')
      .addEventListener("click", () => {
        const video = videos[i];
        if (!video) return;
        if (video.paused) {
          video.muted = false;
          video.volume = 1;
          isMuted = false;
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });

    // Scrubber — click/drag to seek
    const scrubber = bar.querySelector(".video-player-bar__scrubber");
    function seek(e) {
      const video = videos[i];
      if (!video || !video.duration) return;
      const rect = scrubber.getBoundingClientRect();
      const pct = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width),
      );
      video.currentTime = pct * video.duration;
      updatePlayerBar(i);
    }

    let dragging = false;
    scrubber.addEventListener("mousedown", (e) => {
      dragging = true;
      seek(e);
    });
    window.addEventListener("mousemove", (e) => {
      if (dragging) seek(e);
    });
    window.addEventListener("mouseup", () => {
      dragging = false;
    });
    // Touch support
    scrubber.addEventListener(
      "touchstart",
      (e) => {
        dragging = true;
        seek(e.touches[0]);
      },
      { passive: true },
    );
    scrubber.addEventListener(
      "touchmove",
      (e) => {
        if (dragging) seek(e.touches[0]);
      },
      { passive: true },
    );
    scrubber.addEventListener("touchend", () => {
      dragging = false;
    });
  });

  // Unmute — click anywhere on the video (or the mute button) to enter player mode
  function handleUnmute(index) {
    const video = videos[index];
    if (!video) return;

    isMuted = false;
    video.muted = false;
    video.volume = 1;
    video.currentTime = 0;
    video.play().catch(() => {});
    enterPlayerMode(index);

    // Scroll to just before the next video so a small scroll triggers transition
    if (index < medias.length - 1) {
      const nextMedia = medias[index + 1];
      const target = nextMedia.offsetTop - window.innerHeight - 50;
      window.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
    }
  }

  muteButtons.forEach((btn) => {
    if (!btn) return;
    btn.addEventListener("click", () => handleUnmute(activeIndex));
  });

  // Click on the video area to unmute (ambient mode) or play/pause (player mode)
  medias.forEach((media, i) => {
    media.addEventListener("click", (e) => {
      if (e.target.closest(".video-player-bar") || e.target.closest(".video-block__mute")) return;

      if (media.dataset.playerMode) {
        // Player mode — toggle play/pause
        const video = videos[i];
        if (!video) return;
        if (video.paused) {
          video.muted = false;
          video.volume = 1;
          isMuted = false;
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      } else {
        // Ambient mode — unmute and enter player mode
        handleUnmute(i);
      }
    });
  });

  function updateActiveVideo(newIndex) {
    // Never re-trigger on the same video — respects user pause
    if (newIndex === activeIndex) return;

    videos.forEach((video, i) => {
      if (!video) return;
      if (i === newIndex) {
        if (medias[i].dataset.playerMode) {
          // Returning to a video that was in player mode — resume with audio fade-in
          video.muted = false;
          video.volume = 0; // scroll handler will fade in
          isMuted = false;
          video.play().catch(() => {});
          updatePlayerBar(i);
        } else {
          // Ambient mode — play muted
          video.muted = true;
          video.play().catch(() => {});
        }
      } else {
        // Pause and mute non-active videos, but keep playerMode state
        video.pause();
        video.muted = true;
      }
    });

    isMuted = true;
    activeIndex = newIndex;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const vh = window.innerHeight;

      // Determine active video — switch when next video is 50% in view
      let newActive = 0;
      medias.forEach((media, i) => {
        if (media.getBoundingClientRect().top <= vh * 0.5) {
          newActive = i;
        }
      });

      updateActiveVideo(newActive);

      // Preload next video when current spacer enters viewport
      medias.forEach((media, i) => {
        if (i < medias.length - 1 && spacers[i]) {
          const nextVideo = videos[i + 1];
          if (nextVideo && !nextVideo.dataset.preloaded) {
            const spacerRect = spacers[i].getBoundingClientRect();
            if (spacerRect.top < vh * 1.5) {
              nextVideo.preload = "auto";
              nextVideo.dataset.preloaded = "true";
            }
          }
        }

        // Caption + mute button fade
        const caption = media.querySelector(".video-block__caption");
        const muteBtn = media.querySelector(".video-block__mute");
        if (spacers[i]) {
          const spacerRect = spacers[i].getBoundingClientRect();
          const fadeProgress = Math.max(
            0,
            Math.min(1, (vh * 0.5 - spacerRect.top) / (vh * 0.3)),
          );
          const opacity = 1 - fadeProgress;
          if (caption) caption.style.opacity = opacity;
          if (muteBtn) muteBtn.style.opacity = opacity;
        }

        // Shrink current video + fade audio as next video slides up
        if (i < medias.length - 1) {
          const next = medias[i + 1];
          const nextRect = next.getBoundingClientRect();
          const progress = Math.max(0, Math.min(1, 1 - nextRect.top / vh));

          if (progress > 0) {
            const scale = 1 - progress * 0.12; // 1 → 0.88
            media.style.transform = `scale(${scale})`;
          } else {
            media.style.transform = "";
          }

          media.style.opacity = `${1 - progress}`;

          // Fade audio from 30% to 50% scroll progress
          const video = videos[i];
          if (video && !video.muted && i === activeIndex) {
            if (progress < 0.3) {
              video.volume = 1;
            } else if (progress < 0.5) {
              video.volume = 1 - (progress - 0.3) / 0.2;
            } else {
              video.volume = 0;
            }
          }
        }
      });

      ticking = false;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });

  // Pause all but the first on load; apply data-start timecode
  videos.forEach((v, i) => {
    if (!v) return;
    if (i > 0) v.pause();
    const startTime = parseFloat(v.dataset.start);
    if (startTime) {
      v.addEventListener(
        "loadedmetadata",
        () => {
          v.currentTime = startTime;
        },
        { once: true },
      );
    }
  });
}

/* ========== Nav Scroll ========== */

function initNavScroll() {
  const nav = document.getElementById("nav");
  const videosContainer = document.getElementById("videos");
  if (!nav || !videosContainer) return;

  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const videosBottom = videosContainer.getBoundingClientRect().bottom;
      if (videosBottom <= nav.offsetHeight) {
        nav.classList.add("nav--scrolled");
      } else {
        nav.classList.remove("nav--scrolled");
      }
      ticking = false;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

/* ========== Community ========== */

function initCommunity() {
  const grid = document.getElementById("supporters-grid");
  const gridWrapper = document.getElementById("supporters-grid-wrapper");
  const showAllBtn = document.getElementById("supporters-show-all");
  const countEl = document.getElementById("supporter-count");
  const form = document.getElementById("supporter-form");
  const input = document.getElementById("handle-input");

  let supporters = [];

  fetch("supporters.json")
    .then((res) => res.json())
    .then((data) => {
      supporters = data;
      const local = getLocalSupporters();
      local.forEach((handle) => {
        if (!supporters.includes(handle)) {
          supporters.push(handle);
        }
      });
      renderSupporters();
    })
    .catch(() => {
      supporters = getLocalSupporters();
      renderSupporters();
    });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    let handle = input.value.trim();
    if (!handle) return;

    if (handle.startsWith("@")) {
      handle = handle.slice(1);
    }

    if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
      input.setCustomValidity(
        "Enter a valid X handle (letters, numbers, underscores)",
      );
      input.reportValidity();
      return;
    }

    input.setCustomValidity("");

    const lowerHandle = handle.toLowerCase();
    if (supporters.some((s) => s.toLowerCase() === lowerHandle)) {
      input.value = "";
      input.placeholder = "Already added!";
      setTimeout(() => {
        input.placeholder = "your X handle";
      }, 2000);
      return;
    }

    supporters.push(handle);
    saveLocalSupporter(handle);
    renderSupporters();
    input.value = "";
  });

  function renderSupporters() {
    grid.innerHTML = "";

    supporters.forEach((handle) => {
      const card = document.createElement("a");
      card.className = "supporter-card";
      card.href = `https://x.com/${handle}`;
      card.target = "_blank";
      card.rel = "noopener";

      const avatar = document.createElement("img");
      avatar.className = "supporter-card__avatar";
      avatar.src = `https://unavatar.io/twitter/${handle}`;
      avatar.alt = `@${handle}`;
      avatar.loading = "lazy";
      avatar.onerror = function () {
        this.src = generateFallbackAvatar(handle);
      };

      const handleText = document.createElement("span");
      handleText.className = "supporter-card__handle";
      handleText.textContent = `@${handle}`;

      card.appendChild(avatar);
      card.appendChild(handleText);
      grid.appendChild(card);
    });

    if (supporters.length >= 100) {
      countEl.textContent = `${supporters.length} visual builders and counting`;
    }

    requestAnimationFrame(checkOverflow);
  }

  function checkOverflow() {
    if (gridWrapper.classList.contains("is-expanded")) return;
    const overflows = gridWrapper.scrollHeight > gridWrapper.clientHeight + 1;
    gridWrapper.classList.toggle("is-overflowing", overflows);
    showAllBtn.style.display = overflows ? "" : "none";
  }

  showAllBtn.addEventListener("click", () => {
    const expanded = gridWrapper.classList.toggle("is-expanded");
    showAllBtn.textContent = expanded ? "Show less" : "Show all";
  });

  window.addEventListener("resize", checkOverflow);

  function getLocalSupporters() {
    try {
      return JSON.parse(localStorage.getItem("vb-supporters") || "[]");
    } catch {
      return [];
    }
  }

  function saveLocalSupporter(handle) {
    const local = getLocalSupporters();
    if (!local.includes(handle)) {
      local.push(handle);
      localStorage.setItem("vb-supporters", JSON.stringify(local));
    }
  }

  function generateFallbackAvatar(handle) {
    const letter = handle.charAt(0).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <rect width="48" height="48" rx="24" fill="#eceae4"/>
      <text x="24" y="24" text-anchor="middle" dominant-baseline="central"
        font-family="Inter, sans-serif" font-size="18" font-weight="500" fill="#555">${letter}</text>
    </svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
}
