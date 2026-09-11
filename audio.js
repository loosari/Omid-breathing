(function () {
  'use strict';

  const base = 'assets/audio/';
  const files = {
    inhale: base + 'inhale.wav',
    hold: base + 'hold.wav',
    exhale: base + 'exhale.wav',
    complete: base + 'complete.wav',
    ambient: base + 'ambient-soft.wav'
  };

  const clips = {};
  Object.keys(files).forEach(function (key) {
    const audio = new Audio(files[key]);
    audio.preload = 'auto';
    audio.setAttribute('playsinline', '');
    clips[key] = audio;
  });

  let volume = 0.4;
  let enabled = true;
  let ambientEnabled = false;
  let ambientStarted = false;

  function setVolume(value) {
    volume = Math.max(0, Math.min(1, Number(value) || 0));
    Object.keys(clips).forEach(function (key) {
      clips[key].volume = key === 'ambient' ? volume * 0.34 : volume;
    });
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    if (!enabled) stopAmbient();
  }

  function setAmbientEnabled(value) {
    ambientEnabled = Boolean(value);
    if (!ambientEnabled) stopAmbient();
  }

  function playCue(type) {
    if (!enabled || !clips[type]) return;
    const clip = clips[type];
    try {
      clip.currentTime = 0;
      clip.volume = volume;
      const result = clip.play();
      if (result && typeof result.catch === 'function') result.catch(function () {});
    } catch (error) {}
  }

  function startAmbient() {
    if (!ambientEnabled || ambientStarted) return;
    ambientStarted = true;
    const clip = clips.ambient;
    clip.loop = true;
    clip.volume = volume * 0.34;
    try {
      const result = clip.play();
      if (result && typeof result.catch === 'function') result.catch(function () { ambientStarted = false; });
    } catch (error) { ambientStarted = false; }
  }

  function stopAmbient() {
    ambientStarted = false;
    const clip = clips.ambient;
    try { clip.pause(); clip.currentTime = 0; } catch (error) {}
  }

  function stopAll() {
    Object.keys(clips).forEach(function (key) {
      try { clips[key].pause(); clips[key].currentTime = 0; } catch (error) {}
    });
    ambientStarted = false;
  }

  window.OmidBreathingAudio = {
    setVolume: setVolume,
    setEnabled: setEnabled,
    setAmbientEnabled: setAmbientEnabled,
    playCue: playCue,
    playCompletion: function () { playCue('complete'); },
    startAmbient: startAmbient,
    stopAmbient: stopAmbient,
    stopAll: stopAll
  };

  setVolume(volume);
})();
