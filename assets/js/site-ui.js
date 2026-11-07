(() => {
	const themeToggle = document.getElementById('theme-toggle');
	const themeColor = document.querySelector('meta[name="theme-color"]');
	const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');

	function setTheme(theme, save = false) {
		const isDark = theme === 'dark';
		const label = `Switch to ${isDark ? 'light' : 'dark'} mode`;
		document.documentElement.dataset.theme = theme;
		themeToggle.setAttribute('aria-pressed', String(isDark));
		themeToggle.setAttribute('aria-label', label);
		themeToggle.setAttribute('title', label);
		themeColor.setAttribute('content', isDark ? '#101a14' : '#f4f6ef');

		if (save) localStorage.setItem('jakesampson-theme', theme);
	}

	setTheme(document.documentElement.dataset.theme || 'light');

	themeToggle.addEventListener('click', () => {
		setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark', true);
	});

	if (localStorage.getItem('jakesampson-theme') === null) {
		colorScheme.addEventListener('change', event => setTheme(event.matches ? 'dark' : 'light'));
	}
})();
