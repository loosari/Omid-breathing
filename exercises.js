(function () {
  'use strict';

  window.OMID_BREATHING_GOALS = [
    { id: 'calm', title: 'آرام‌تر شدن', icon: '◌', description: 'برای چند دقیقه آرام‌تر و آهسته‌تر شدن.' },
    { id: 'sleep', title: 'آماده‌شدن برای خواب', icon: '☾', description: 'ریتمی نرم و کم‌تحریک پیش از خواب.' },
    { id: 'focus', title: 'تمرکز', icon: '◉', description: 'یک وقفه کوتاه برای جمع‌کردن توجه.' },
    { id: 'all', title: 'همه تمرین‌ها', icon: '＋', description: 'مشاهده همه گزینه‌های موجود.' }
  ];

  window.OMID_BREATHING_DURATIONS = [
    { seconds: 60, label: '۱ دقیقه' },
    { seconds: 180, label: '۳ دقیقه' },
    { seconds: 300, label: '۵ دقیقه' },
    { seconds: 600, label: '۱۰ دقیقه' }
  ];

  window.OMID_BREATHING_EXERCISES = [
    {
      id: 'calm-4-6', title: 'تنفس آرام', icon: '◌',
      description: 'بازدم کمی طولانی‌تر از دم است؛ ریتمی ساده و قابل‌فهم برای شروع.',
      goals: ['calm', 'sleep'], inhale: 4, hold: 0, exhale: 6, preparation: 5,
      difficulty: 'مقدماتی', instruction: 'آرام و بدون فشار نفس بکشید. هنگام بازدم، اجازه دهید شانه‌ها رها شوند.',
      safetyNote: 'هدف، راحتی و ریتم است؛ نه نفس عمیق یا اجباری.'
    },
    {
      id: 'balanced-4-4', title: 'تنفس متعادل', icon: '◉',
      description: 'دم و بازدم با زمان برابر؛ مناسب برای آشنایی با ریتم تمرین.',
      goals: ['calm', 'focus'], inhale: 4, hold: 0, exhale: 4, preparation: 5,
      difficulty: 'مقدماتی', instruction: 'نفس را طبیعی نگه دارید و فقط با ریتم دایره همراه شوید.',
      safetyNote: 'بدون تلاش برای عمیق‌تر کردن نفس، ریتم را به‌آرامی دنبال کنید.'
    },
    {
      id: 'slow-5-5', title: 'تنفس آهسته', icon: '≈',
      description: 'ریتمی کمی آهسته‌تر برای تمرکز بر جریان پیوسته دم و بازدم.',
      goals: ['calm', 'sleep', 'focus'], inhale: 5, hold: 0, exhale: 5, preparation: 5,
      difficulty: 'مقدماتی', instruction: 'نفس را نرم و پیوسته نگه دارید؛ لازم نیست نفس‌ها خیلی عمیق باشند.',
      safetyNote: 'اگر ریتم برایتان راحت نیست، به تنفس طبیعی برگردید.'
    },
    {
      id: 'pause-4-2-6', title: 'تنفس با مکث', icon: '•',
      description: 'بین دم و بازدم یک مکث کوتاه دارد؛ گزینه‌ای پیشرفته‌تر.',
      goals: ['calm'], inhale: 4, hold: 2, exhale: 6, preparation: 5,
      difficulty: 'پیشرفته‌تر', instruction: 'مکث را بدون حبس اجباری و بدون ایجاد فشار انجام دهید.',
      safetyNote: 'اگر مکث برایتان ناخوشایند است، تمرین را متوقف کنید و به تنفس طبیعی برگردید.'
    }
  ];
})();
