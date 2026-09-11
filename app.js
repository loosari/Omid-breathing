(function () {
  'use strict';

  const exercises = Array.isArray(window.OMID_BREATHING_EXERCISES) ? window.OMID_BREATHING_EXERCISES : [];
  const goals = Array.isArray(window.OMID_BREATHING_GOALS) ? window.OMID_BREATHING_GOALS : [];
  const durations = Array.isArray(window.OMID_BREATHING_DURATIONS) ? window.OMID_BREATHING_DURATIONS : [];

  const SETTINGS_KEY = 'omid-breathing-settings-v2';
  const HISTORY_KEY = 'omid-breathing-history-v2';
  const CUSTOM_KEY = 'omid-breathing-custom-v1';

  const state = {
    selectedGoalId: 'calm',
    selectedExercise: null,
    selectedDuration: 180,
    phases: [],
    phaseIndex: -1,
    cycle: 0,
    elapsed: 0,
    totalDuration: 180,
    running: false,
    paused: false,
    completed: false,
    phaseStartedAt: 0,
    timerId: null,
    previousAnnouncedPhase: '',
    settings: {
      voiceGuidance: true,
      vibration: true,
      reducedMotion: false,
      defaultExerciseId: exercises[0] ? exercises[0].id : '',
      phaseSounds: true,
      ambientSound: false,
      volume: 0.4
    },
    lastSettingsFocus: null,
    customExercises: [],
    customDuration: 180
  };

  const el = {};

  init();

  function init() {
    cacheElements();
    state.customExercises = loadCustomExercises();
    loadSettings();
    configureAudio();
    state.selectedExercise = getExerciseById(state.settings.defaultExerciseId) || exercises[0] || null;
    renderGoals();
    renderExercises();
    renderCustomExercises();
    renderDurations();
    renderCustomDurations();
    renderSettings();
    bindEvents();
    applyReducedMotionSetting();
    resetPracticeVisuals();
  }

  function cacheElements() {
    [
      'selectionView','setupView','practiceView','completionView','goalList','exerciseHeading','exerciseList',
      'showAllExercisesButton','setupBackButton','setupTitle','setupExerciseTitle','setupExerciseDescription',
      'setupExercisePattern','durationList','durationPreview','startConfiguredButton','practiceTitle',
      'practiceDurationLabel','backButton','soundButton','cycleLabel','timeLabel','progressBar','breathingOrb',
      'phaseLabel','countdownLabel','instructionLabel','safetyLiveLabel','mainActionButton','restartButton',
      'completionSummary','completionDuration','completionCycles','repeatButton','chooseAnotherButton',
      'settingsButton','settingsPanel','settingsSheet','closeSettingsButton','voiceGuidanceToggle',
      'phaseSoundToggle','ambientSoundToggle','volumeRange','volumeValue','vibrationToggle','reducedMotionToggle','defaultExerciseSelect',
      'customBuilderButton','customExerciseList','builderPanel','builderSheet','closeBuilderButton','cancelBuilderButton','saveCustomButton',
      'customTitleInput','customInhaleInput','customHoldInput','customExhaleInput','customPatternPreview','customCyclePreview','customDurationList',
      'customDurationPreview','builderError','setupExerciseIcon','setupSafetyText','srStatus'
    ].forEach(function (id) { el[id] = document.getElementById(id); });
  }

  function bindEvents() {
    el.showAllExercisesButton.addEventListener('click', function () { selectGoal('all'); });
    el.customBuilderButton.addEventListener('click', openBuilder);
    el.closeBuilderButton.addEventListener('click', closeBuilder);
    el.cancelBuilderButton.addEventListener('click', closeBuilder);
    el.saveCustomButton.addEventListener('click', saveCustomExercise);
    el.builderPanel.addEventListener('click', function (event) { if (event.target.matches('[data-close-builder]')) closeBuilder(); });
    ['customInhaleInput','customHoldInput','customExhaleInput'].forEach(function (id) { el[id].addEventListener('input', updateCustomPreview); });
    el.setupBackButton.addEventListener('click', returnToSelection);
    el.startConfiguredButton.addEventListener('click', startPractice);
    el.mainActionButton.addEventListener('click', handleMainAction);
    el.restartButton.addEventListener('click', restartPractice);
    el.backButton.addEventListener('click', function () {
      if (state.running || state.paused) {
        pausePractice();
      }
      returnToSelection();
    });
    el.repeatButton.addEventListener('click', restartPractice);
    el.chooseAnotherButton.addEventListener('click', returnToSelection);
    el.soundButton.addEventListener('click', toggleVoiceGuidance);
    el.settingsButton.addEventListener('click', openSettings);
    el.closeSettingsButton.addEventListener('click', closeSettings);

    el.settingsPanel.addEventListener('click', function (event) {
      if (event.target.matches('[data-close-settings]')) closeSettings();
    });

    el.phaseSoundToggle.addEventListener('change', function () {
      state.settings.phaseSounds = el.phaseSoundToggle.checked;
      configureAudio(); saveSettings();
    });
    el.ambientSoundToggle.addEventListener('change', function () {
      state.settings.ambientSound = el.ambientSoundToggle.checked;
      configureAudio(); saveSettings();
    });
    el.volumeRange.addEventListener('input', function () {
      state.settings.volume = Number(el.volumeRange.value) / 100;
      el.volumeValue.textContent = toFaDigits(el.volumeRange.value) + '٪';
      configureAudio(); saveSettings();
    });

    el.voiceGuidanceToggle.addEventListener('change', function () {
      state.settings.voiceGuidance = el.voiceGuidanceToggle.checked;
      saveSettings();
      updateSoundButton();
    });

    el.vibrationToggle.addEventListener('change', function () {
      state.settings.vibration = el.vibrationToggle.checked;
      saveSettings();
    });

    el.reducedMotionToggle.addEventListener('change', function () {
      state.settings.reducedMotion = el.reducedMotionToggle.checked;
      saveSettings();
      applyReducedMotionSetting();
    });

    el.defaultExerciseSelect.addEventListener('change', function () {
      state.settings.defaultExerciseId = el.defaultExerciseSelect.value;
      saveSettings();
      state.selectedExercise = getExerciseById(state.settings.defaultExerciseId) || state.selectedExercise;
    });

    document.addEventListener('keydown', handleGlobalKeydown);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && state.running && !state.paused) pausePractice('این تمرین برای شما متوقف شد چون صفحه در پس‌زمینه قرار گرفت.');
    });

    window.addEventListener('beforeunload', cleanup);
  }

  function renderGoals() {
    el.goalList.innerHTML = '';
    goals.filter(function (goal) { return goal.id !== 'all'; }).forEach(function (goal) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'goal-card' + (state.selectedGoalId === goal.id ? ' is-selected' : '');
      button.dataset.goalId = goal.id;
      button.innerHTML = [
        '<span class="goal-icon" aria-hidden="true"></span>',
        '<span class="goal-copy"><strong></strong><small></small></span>'
      ].join('');
      button.querySelector('.goal-icon').textContent = goal.icon;
      button.querySelector('strong').textContent = goal.title;
      button.querySelector('small').textContent = goal.description;
      button.addEventListener('click', function () { selectGoal(goal.id); });
      el.goalList.appendChild(button);
    });
  }

  function selectGoal(goalId) {
    state.selectedGoalId = goalId;
    renderGoals();
    renderExercises();
  }

  function renderExercises() {
    const filtered = state.selectedGoalId === 'all'
      ? exercises
      : exercises.filter(function (exercise) { return exercise.goals.indexOf(state.selectedGoalId) !== -1; });

    el.exerciseList.innerHTML = '';

    if (!filtered.length) {
      el.exerciseList.innerHTML = '<p class="muted">تمرین مناسبی برای این هدف پیدا نشد.</p>';
      return;
    }

    const goalTitle = state.selectedGoalId === 'all' ? 'همه تمرین‌ها' : getGoalById(state.selectedGoalId).title;
    el.exerciseHeading.textContent = goalTitle;

    filtered.forEach(function (exercise) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'exercise-card';
      button.dataset.exerciseId = exercise.id;
      button.innerHTML = [
        '<div class="exercise-card-icon" aria-hidden="true">◌</div>',
        '<div class="exercise-card-main">',
          '<div class="exercise-card-head">',
            '<span class="exercise-name"></span>',
            '<span class="difficulty-tag"></span>',
          '</div>',
          '<p class="exercise-description"></p>',
          '<div class="exercise-card-footer"><span class="exercise-pattern"></span><span class="goal-fit"></span></div>',
        '</div>',
        '<span class="exercise-arrow" aria-hidden="true">‹</span>'
      ].join('');

      button.querySelector('.exercise-name').textContent = exercise.title;
      button.querySelector('.difficulty-tag').textContent = exercise.difficulty;
      button.querySelector('.exercise-description').textContent = exercise.description;
      button.querySelector('.exercise-pattern').textContent = formatPattern(exercise);
      button.querySelector('.goal-fit').textContent = state.selectedGoalId === 'all' ? 'انتخاب تمرین' : 'پیشنهاد برای این هدف';
      button.addEventListener('click', function () { openSetup(exercise.id); });
      el.exerciseList.appendChild(button);
    });
  }

  function renderCustomExercises() {
    if (!el.customExerciseList) return;
    el.customExerciseList.innerHTML = '';
    if (!state.customExercises.length) return;
    const heading = document.createElement('div');
    heading.className = 'custom-list-heading';
    const hs = document.createElement('span'); hs.textContent = 'تمرین‌های من';
    const hm = document.createElement('small'); hm.textContent = 'در مرورگر شما ذخیره شده‌اند';
    heading.appendChild(hs); heading.appendChild(hm); el.customExerciseList.appendChild(heading);
    state.customExercises.forEach(function (exercise) {
      const row = document.createElement('div'); row.className = 'custom-exercise-row';
      const select = document.createElement('button'); select.type='button'; select.className='custom-exercise-select';
      select.innerHTML = '<span class="custom-exercise-icon">✦</span><span class="custom-exercise-main"><strong></strong><small></small></span><span class="exercise-arrow">‹</span>';
      select.querySelector('strong').textContent = exercise.title;
      select.querySelector('small').textContent = formatPattern(exercise);
      select.addEventListener('click', function () { openSetup(exercise.id); });
      const del = document.createElement('button'); del.type='button'; del.className='custom-delete-button'; del.textContent='حذف'; del.setAttribute('aria-label','حذف ' + exercise.title);
      del.addEventListener('click', function () { deleteCustomExercise(exercise.id); });
      row.appendChild(select); row.appendChild(del); el.customExerciseList.appendChild(row);
    });
  }

  function renderCustomDurations() {
    if (!el.customDurationList) return;
    el.customDurationList.innerHTML = '';
    durations.forEach(function (duration) {
      const b=document.createElement('button'); b.type='button'; b.className='duration-chip'+(state.customDuration===duration.seconds?' is-selected':'');
      b.setAttribute('role','radio'); b.setAttribute('aria-checked', String(state.customDuration===duration.seconds)); b.textContent=duration.label;
      b.addEventListener('click', function(){ state.customDuration=duration.seconds; renderCustomDurations(); updateCustomDurationPreview(); });
      el.customDurationList.appendChild(b);
    });
    updateCustomDurationPreview();
  }

  function renderDurations() {
    el.durationList.innerHTML = '';
    durations.forEach(function (duration) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'duration-chip' + (state.selectedDuration === duration.seconds ? ' is-selected' : '');
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', String(state.selectedDuration === duration.seconds));
      button.dataset.duration = duration.seconds;
      button.textContent = duration.label;
      button.addEventListener('click', function () {
        state.selectedDuration = duration.seconds;
        renderDurations();
        updateDurationPreview();
      });
      el.durationList.appendChild(button);
    });
    updateDurationPreview();
  }

  function openSetup(exerciseId) {
    const exercise = getExerciseById(exerciseId);
    if (!exercise) return;

    stopTimer();
    window.speechSynthesis?.cancel();
    state.selectedExercise = exercise;
    state.selectedDuration = clampDuration(state.selectedDuration);
    state.running = false;
    state.paused = false;
    state.completed = false;
    state.elapsed = 0;

    el.setupExerciseTitle.textContent = exercise.title;
    el.setupExerciseDescription.textContent = exercise.description;
    el.setupExercisePattern.textContent = formatPattern(exercise);
    el.setupExerciseIcon.textContent = exercise.icon || '✦';
    el.setupSafetyText.textContent = exercise.safetyNote || 'تمرین را بدون فشار انجام دهید و در صورت ناراحتی به تنفس طبیعی برگردید.';
    updateDurationPreview();
    showView('setup');
  }

  function updateDurationPreview() {
    const duration = getDurationLabel(state.selectedDuration);
    el.durationPreview.textContent = duration;
  }

  function startPractice() {
    if (!state.selectedExercise) return;

    stopTimer();
    window.speechSynthesis?.cancel();

    state.phases = buildTimedSession(state.selectedExercise, state.selectedDuration);
    state.totalDuration = state.phases.reduce(function (sum, phase) { return sum + phase.duration; }, 0);
    state.phaseIndex = -1;
    state.cycle = 0;
    state.elapsed = 0;
    state.running = true;
    state.paused = false;
    state.completed = false;
    state.previousAnnouncedPhase = '';
    configureAudio();
    OmidBreathingAudio.startAmbient();

    el.practiceTitle.textContent = state.selectedExercise.title;
    el.practiceDurationLabel.textContent = getApproxDurationLabel(state.totalDuration);
    el.instructionLabel.textContent = state.selectedExercise.instruction;
    el.safetyLiveLabel.textContent = state.selectedExercise.safetyNote;
    el.restartButton.hidden = false;
    el.mainActionButton.textContent = 'مکث';

    showView('practice');
    resetPracticeVisuals();
    runNextPhase();
    el.practiceView.focus();
  }

  function buildTimedSession(exercise, targetSeconds) {
    const preparation = Math.min(Number(exercise.preparation || 0), 5);
    const cycleDuration = Number(exercise.inhale || 0) + Number(exercise.hold || 0) + Number(exercise.exhale || 0);
    if (cycleDuration <= 0) return [];

    const available = Math.max(1, targetSeconds - preparation);
    const cycles = Math.max(1, Math.floor(available / cycleDuration));
    const phases = [];

    if (preparation > 0) {
      phases.push({ type: 'preparation', label: 'آماده شوید', voiceText: 'آماده شوید', duration: preparation, cycleIndex: 0 });
    }

    for (let i = 0; i < cycles; i += 1) {
      buildBreathPhases(exercise).forEach(function (phase) {
        phases.push(Object.assign({}, phase, { cycleIndex: i }));
      });
    }

    return phases;
  }

  function runNextPhase() {
    if (!state.running) return;
    const nextIndex = state.phaseIndex + 1;
    if (nextIndex >= state.phases.length) {
      finishPractice();
      return;
    }

    state.phaseIndex = nextIndex;
    const phase = state.phases[nextIndex];
    state.cycle = phase.cycleIndex + 1;
    state.phaseStartedAt = performance.now();
    renderPhase(phase);
    vibrateForPhase(phase);
    playPhaseSound(phase);
    speakPhase(phase);
    runClock();
  }

  function runClock() {
    stopTimer();
    if (!state.running) return;

    const tick = function () {
      if (!state.running) return;
      const phase = state.phases[state.phaseIndex];
      if (!phase) return;

      const phaseElapsed = Math.max(0, (performance.now() - state.phaseStartedAt) / 1000);
      state.elapsed = Math.min(state.totalDuration, calculateSessionElapsedBeforeCurrentPhase() + phaseElapsed);
      updatePhaseCountdown(phase, phaseElapsed);
      updateProgress();

      if (phaseElapsed >= phase.duration) {
        runNextPhase();
        return;
      }

      state.timerId = window.requestAnimationFrame(tick);
    };

    state.timerId = window.requestAnimationFrame(tick);
  }

  function handleMainAction() {
    if (!state.selectedExercise) return;
    if (!state.running && !state.paused) return;
    if (state.running) pausePractice();
    else resumePractice();
  }

  function pausePractice(message) {
    if (!state.running) return;
    state.running = false;
    state.paused = true;
    stopTimer();
    el.mainActionButton.textContent = 'ادامه';
    el.instructionLabel.textContent = message || 'تمرین موقتاً متوقف شده است.';
    el.breathingOrb.style.setProperty('--orb-scale', getCurrentScale());
    announce(message || 'تمرین موقتاً متوقف شد.');
  }

  function resumePractice() {
    if (!state.paused) return;
    state.running = true;
    state.paused = false;
    state.phaseStartedAt = performance.now() - currentPhaseElapsedMs();
    el.mainActionButton.textContent = 'مکث';
    el.instructionLabel.textContent = state.selectedExercise.instruction;
    announce('تمرین ادامه پیدا کرد.');
    runClock();
  }

  function restartPractice() {
    startPractice();
  }

  function finishPractice() {
    stopTimer();
    state.running = false;
    state.paused = false;
    state.completed = true;
    state.elapsed = state.totalDuration;
    window.speechSynthesis?.cancel();
    saveSession();

    const completedCycles = getCompletedBreathCycles();
    el.completionDuration.textContent = getApproxDurationLabel(state.totalDuration);
    el.completionCycles.textContent = toFaDigits(completedCycles);
    el.completionSummary.textContent = 'یک جلسه کامل از «' + state.selectedExercise.title + '» را انجام دادید. چند لحظه بدون عجله بمانید و اجازه دهید ریتم طبیعی تنفس برگردد.';
    announce('تمرین به پایان رسید.');
    showView('completion');
    el.repeatButton.focus();
  }

  function getCompletedBreathCycles() {
    return state.phases.filter(function (phase) { return phase.type === 'exhale' && phase.cycleIndex >= 0; }).length;
  }

  function returnToSelection() {
    stopTimer();
    window.speechSynthesis?.cancel();
    OmidBreathingAudio.stopAll();
    state.running = false;
    state.paused = false;
    state.completed = false;
    showView('selection');
    resetPracticeVisuals();
  }

  function renderPhase(phase) {
    el.phaseLabel.textContent = phase.label;
    el.breathingOrb.classList.remove('is-inhale', 'is-exhale', 'is-hold', 'is-preparation');

    if (state.settings.reducedMotion) {
      el.breathingOrb.style.setProperty('--orb-scale', phase.type === 'inhale' || phase.type === 'hold' ? '1.25' : '1');
      return;
    }

    if (phase.type === 'inhale') {
      el.breathingOrb.classList.add('is-inhale');
      animateOrbTo(1.55, phase.duration);
    } else if (phase.type === 'exhale') {
      el.breathingOrb.classList.add('is-exhale');
      animateOrbTo(1, phase.duration);
    } else if (phase.type === 'hold') {
      el.breathingOrb.classList.add('is-hold');
      animateOrbTo(1.55, 0.18);
    } else {
      el.breathingOrb.classList.add('is-preparation');
      animateOrbTo(1.12, 0.3);
    }
  }

  function animateOrbTo(scale, duration) {
    el.breathingOrb.style.transitionDuration = Math.max(0.01, duration) + 's';
    requestAnimationFrame(function () {
      el.breathingOrb.style.setProperty('--orb-scale', String(scale));
    });
  }

  function updatePhaseCountdown(phase, elapsedSeconds) {
    const remaining = Math.max(0, Math.ceil(phase.duration - elapsedSeconds));
    el.countdownLabel.textContent = toFaDigits(remaining);
    const cycleText = phase.type === 'preparation'
      ? 'آماده‌سازی'
      : 'چرخه ' + toFaDigits(phase.cycleIndex + 1);
    el.cycleLabel.textContent = cycleText;
    el.timeLabel.textContent = formatClock(state.elapsed);
  }

  function updateProgress() {
    const progress = state.totalDuration > 0 ? Math.min(100, (state.elapsed / state.totalDuration) * 100) : 0;
    el.progressBar.style.width = progress + '%';
  }

  function resetPracticeVisuals() {
    el.phaseLabel.textContent = 'آماده';
    el.countdownLabel.textContent = '—';
    el.cycleLabel.textContent = 'چرخه ۱';
    el.timeLabel.textContent = '۰:۰۰';
    el.progressBar.style.width = '0%';
    el.mainActionButton.textContent = 'شروع تمرین';
    el.restartButton.hidden = true;
    el.breathingOrb.classList.remove('is-inhale', 'is-exhale', 'is-hold', 'is-preparation');
    el.breathingOrb.style.transitionDuration = '.4s';
    el.breathingOrb.style.setProperty('--orb-scale', '1');
    if (state.selectedExercise) {
      el.instructionLabel.textContent = state.selectedExercise.instruction;
      el.safetyLiveLabel.textContent = state.selectedExercise.safetyNote;
    }
  }

  function toggleVoiceGuidance() {
    state.settings.voiceGuidance = !state.settings.voiceGuidance;
    saveSettings();
    updateSoundButton();
    if (!state.settings.voiceGuidance && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  function updateSoundButton() {
    const enabled = state.settings.voiceGuidance;
    el.soundButton.textContent = enabled ? '🔊' : '🔇';
    el.soundButton.setAttribute('aria-pressed', String(enabled));
    el.soundButton.setAttribute('aria-label', enabled ? 'خاموش کردن صدای راهنما' : 'روشن کردن صدای راهنما');
  }

  function speakPhase(phase) {
    if (!state.settings.voiceGuidance || !('speechSynthesis' in window) || !phase.voiceText) return;
    const key = state.phaseIndex + ':' + phase.cycleIndex;
    if (key === state.previousAnnouncedPhase) return;
    state.previousAnnouncedPhase = key;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(phase.voiceText);
    utterance.lang = 'fa-IR';
    utterance.rate = 0.82;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  function vibrateForPhase(phase) {
    if (!state.settings.vibration || !('vibrate' in navigator)) return;
    if (phase.type === 'inhale') navigator.vibrate(16);
    else if (phase.type === 'hold') navigator.vibrate([10, 40, 10]);
    else if (phase.type === 'exhale') navigator.vibrate([9]);
    else navigator.vibrate([8]);
  }

  function openSettings() {
    state.lastSettingsFocus = document.activeElement;
    renderSettings();
    el.settingsPanel.hidden = false;
    el.closeSettingsButton.focus();
  }

  function closeSettings() {
    el.settingsPanel.hidden = true;
    if (state.lastSettingsFocus && typeof state.lastSettingsFocus.focus === 'function') state.lastSettingsFocus.focus();
    else el.settingsButton.focus();
  }

  function renderSettings() {
    el.voiceGuidanceToggle.checked = state.settings.voiceGuidance;
    el.phaseSoundToggle.checked = state.settings.phaseSounds;
    el.ambientSoundToggle.checked = state.settings.ambientSound;
    el.volumeRange.value = Math.round((state.settings.volume || 0.4) * 100);
    el.volumeValue.textContent = toFaDigits(el.volumeRange.value) + '٪';
    el.vibrationToggle.checked = state.settings.vibration;
    el.reducedMotionToggle.checked = state.settings.reducedMotion;
    el.defaultExerciseSelect.innerHTML = '';
    getAllExercises().forEach(function (exercise) {
      const option = document.createElement('option');
      option.value = exercise.id;
      option.textContent = exercise.title;
      el.defaultExerciseSelect.appendChild(option);
    });
    el.defaultExerciseSelect.value = state.settings.defaultExerciseId;
    updateSoundButton();
  }

  function showView(name) {
    el.selectionView.hidden = name !== 'selection';
    el.setupView.hidden = name !== 'setup';
    el.practiceView.hidden = name !== 'practice';
    el.completionView.hidden = name !== 'completion';
  }

  function handleGlobalKeydown(event) {
    if (event.key === 'Escape' && !el.settingsPanel.hidden) {
      closeSettings();
    }
  }

  function loadSettings() {
    try {
      const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
      if (stored && typeof stored === 'object') state.settings = Object.assign({}, state.settings, stored);
    } catch (error) {
      // Use defaults if storage is unavailable or corrupted.
    }

    if (!getExerciseById(state.settings.defaultExerciseId)) {
      state.settings.defaultExerciseId = exercises[0] ? exercises[0].id : '';
    }

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches && typeof localStorage !== 'undefined') {
      state.settings.reducedMotion = true;
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    } catch (error) {
      // Ignore storage limitations.
    }
  }

  function saveSession() {
    const entry = {
      at: new Date().toISOString(),
      exerciseId: state.selectedExercise ? state.selectedExercise.id : '',
      duration: state.totalDuration,
      cycles: getCompletedBreathCycles()
    };

    try {
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      const safeHistory = Array.isArray(history) ? history.slice(-29) : [];
      safeHistory.push(entry);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(safeHistory));
    } catch (error) {
      // History is optional; do not block the completion screen.
    }
  }

  function applyReducedMotionSetting() {
    document.documentElement.classList.toggle('reduced-motion-user', state.settings.reducedMotion);
  }

  function calculateSessionElapsedBeforeCurrentPhase() {
    let seconds = 0;
    for (let i = 0; i < state.phaseIndex; i += 1) seconds += state.phases[i].duration;
    return seconds;
  }

  function currentPhaseElapsedMs() {
    if (!state.phaseStartedAt) return 0;
    return Math.max(0, performance.now() - state.phaseStartedAt);
  }

  function getCurrentScale() {
    return Number(el.breathingOrb.style.getPropertyValue('--orb-scale')) || 1;
  }

  function stopTimer() {
    if (state.timerId !== null) {
      cancelAnimationFrame(state.timerId);
      state.timerId = null;
    }
  }

  function cleanup() {
    stopTimer();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }


  function configureAudio() {
    if (!window.OmidBreathingAudio) return;
    OmidBreathingAudio.setEnabled(Boolean(state.settings.phaseSounds));
    OmidBreathingAudio.setAmbientEnabled(Boolean(state.settings.ambientSound));
    OmidBreathingAudio.setVolume(Number(state.settings.volume || 0.4));
  }

  function playPhaseSound(phase) {
    if (!state.settings.phaseSounds || !window.OmidBreathingAudio) return;
    if (phase.type === 'inhale') OmidBreathingAudio.playCue('inhale');
    else if (phase.type === 'hold') OmidBreathingAudio.playCue('hold');
    else if (phase.type === 'exhale') OmidBreathingAudio.playCue('exhale');
  }

  function openBuilder() {
    el.builderError.hidden = true;
    if (!el.customTitleInput.value) el.customTitleInput.value = 'تمرین من';
    updateCustomPreview(); renderCustomDurations();
    el.builderPanel.hidden = false; el.customTitleInput.focus();
  }
  function closeBuilder() { el.builderPanel.hidden = true; }
  function updateCustomPreview() {
    const inhale=Number(el.customInhaleInput.value)||0, hold=Number(el.customHoldInput.value)||0, exhale=Number(el.customExhaleInput.value)||0;
    const parts=['دم '+toFaDigits(inhale)]; if(hold>0) parts.push('مکث '+toFaDigits(hold)); parts.push('بازدم '+toFaDigits(exhale));
    el.customPatternPreview.textContent=parts.join(' · '); el.customCyclePreview.textContent='هر چرخه: '+toFaDigits(inhale+hold+exhale)+' ثانیه';
  }
  function updateCustomDurationPreview() { el.customDurationPreview.textContent=getDurationLabel(state.customDuration); }
  function saveCustomExercise() {
    const title=String(el.customTitleInput.value||'').trim()||'تمرین من';
    const inhale=clampInt(el.customInhaleInput.value,1,30), hold=clampInt(el.customHoldInput.value,0,30), exhale=clampInt(el.customExhaleInput.value,1,30);
    if(inhale<1||exhale<1){showBuilderError('برای دم و بازدم حداقل ۱ ثانیه وارد کنید.');return;}
    const exercise={id:'custom-'+Date.now().toString(36),title:title,icon:'✦',description:'الگوی تنفسی ساخته‌شده توسط شما.',goals:['calm','sleep','focus'],inhale:inhale,hold:hold,exhale:exhale,preparation:5,difficulty:'شخصی',instruction:'ریتم انتخاب‌شده را بدون فشار دنبال کنید.',safetyNote:'اگر احساس ناخوشایند داشتید، تمرین را متوقف کنید و به تنفس طبیعی برگردید.',custom:true};
    state.customExercises.push(exercise); persistCustomExercises(); renderExercises(); renderCustomExercises(); closeBuilder(); openSetup(exercise.id);
  }
  function showBuilderError(message){el.builderError.textContent=message;el.builderError.hidden=false;}
  function clampInt(value,min,max){const n=parseInt(value,10);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):min;}
  function deleteCustomExercise(id){const ex=state.customExercises.find(function(x){return x.id===id;});if(!ex)return;if(!window.confirm('این تمرین سفارشی حذف شود؟'))return;state.customExercises=state.customExercises.filter(function(x){return x.id!==id;});if(state.settings.defaultExerciseId===id)state.settings.defaultExerciseId=exercises[0]?exercises[0].id:'';persistCustomExercises();saveSettings();renderExercises();renderCustomExercises();renderSettings();}
  function loadCustomExercises(){try{const v=JSON.parse(localStorage.getItem(CUSTOM_KEY)||'[]');return Array.isArray(v)?v.filter(Boolean):[];}catch(error){return[];}}
  function persistCustomExercises(){try{localStorage.setItem(CUSTOM_KEY,JSON.stringify(state.customExercises));}catch(error){}}

  function buildBreathPhases(exercise) {
    const phases = [];
    if (Number(exercise.inhale || 0) > 0) phases.push({ type: 'inhale', label: 'دم', voiceText: 'دم', duration: Number(exercise.inhale) });
    if (Number(exercise.hold || 0) > 0) phases.push({ type: 'hold', label: 'مکث', voiceText: 'مکث', duration: Number(exercise.hold) });
    if (Number(exercise.exhale || 0) > 0) phases.push({ type: 'exhale', label: 'بازدم', voiceText: 'بازدم', duration: Number(exercise.exhale) });
    return phases;
  }

  function getExerciseById(id) { return getAllExercises().find(function (exercise) { return exercise.id === id; }) || null; }
  function getAllExercises() { return exercises.concat(state.customExercises || []); }
  function getGoalById(id) { return goals.find(function (goal) { return goal.id === id; }) || null; }
  function clampDuration(seconds) { return durations.some(function (item) { return item.seconds === seconds; }) ? seconds : 180; }
  function getDurationLabel(seconds) {
    const known = durations.find(function (item) { return item.seconds === seconds; });
    return known ? known.label : Math.round(seconds / 60) + ' دقیقه';
  }

  function getApproxDurationLabel(seconds) {
    const minutes = Math.max(1, Math.round(seconds / 60));
    return 'حدود ' + toFaDigits(minutes) + ' دقیقه';
  }

  function formatPattern(exercise) {
    const parts = ['دم ' + toFaDigits(exercise.inhale)];
    if (exercise.hold > 0) parts.push('مکث ' + toFaDigits(exercise.hold));
    parts.push('بازدم ' + toFaDigits(exercise.exhale));
    return parts.join(' · ') + ' ثانیه';
  }

  function formatClock(seconds) {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;
    return toFaDigits(minutes + ':' + String(remainingSeconds).padStart(2, '0'));
  }

  function toFaDigits(value) {
    return String(value).replace(/[0-9]/g, function (digit) { return '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]; });
  }

  function announce(message) {
    if (el.srStatus) el.srStatus.textContent = message;
  }
})();
