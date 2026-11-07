(() => {
	const map = document.getElementById('map');
	const radiusCircle = document.getElementById('map-radius');
	const originMarker = document.getElementById('map-origin');
	const distance = document.getElementById('map-distance');
	const distanceValue = document.getElementById('map-distance-value');
	const result = document.getElementById('map-result');
	const places = [...map.querySelectorAll('.map-place')];
	const metresPerUnit = 35;
	let origin = { x: 300, y: 200 };

	function update() {
		const radius = Number(distance.value) / metresPerUnit;
		const nearby = [];
		radiusCircle.setAttribute('cx', origin.x);
		radiusCircle.setAttribute('cy', origin.y);
		radiusCircle.style.r = `${radius}px`;
		originMarker.setAttribute('transform', `translate(${origin.x} ${origin.y})`);
		const metres = Number(distance.value);
		const value = metres < 1000 ? metres : metres / 1000;
		distanceValue.value = `${value} ${metres < 1000 ? 'm' : 'km'}`;
		distance.setAttribute('aria-valuetext', `${value} ${metres < 1000 ? 'metres' : value === 1 ? 'kilometre' : 'kilometres'}`);
		const progress = (Number(distance.value) - Number(distance.min)) / (Number(distance.max) - Number(distance.min)) * 100;
		distance.style.setProperty('--slider-progress', `${progress}%`);

		places.forEach(place => {
			const x = Number(place.dataset.x);
			const y = Number(place.dataset.y);
			const included = Math.hypot(x - origin.x, y - origin.y) <= radius;
			place.classList.toggle('is-nearby', included);
			if (included) nearby.push(place.dataset.name);
		});

		const count = nearby.length;
		result.textContent = count
			? `${count} railway ${count === 1 ? 'feature' : 'features'} nearby: ${nearby.join(' · ')}`
			: 'No railway features nearby. Try another spot or a bigger radius.';
	}

	map.addEventListener('click', event => {
		const point = map.createSVGPoint();
		point.x = event.clientX;
		point.y = event.clientY;
		const position = point.matrixTransform(map.getScreenCTM().inverse());
		origin = { x: position.x, y: position.y };
		update();
	});

	map.addEventListener('keydown', event => {
		const moves = {
			ArrowUp: [0, -10],
			ArrowDown: [0, 10],
			ArrowLeft: [-10, 0],
			ArrowRight: [10, 0]
		};
		const move = moves[event.key];
		if (!move) return;
		event.preventDefault();
		origin = {
			x: Math.max(0, Math.min(600, origin.x + move[0])),
			y: Math.max(0, Math.min(400, origin.y + move[1]))
		};
		update();
	});
	map.setAttribute('tabindex', '0');
	distance.disabled = false;
	distance.addEventListener('input', update);
	update();
})();
