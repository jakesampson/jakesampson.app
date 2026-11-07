(() => {
	const map = document.getElementById('map');
	const roadNetwork = document.getElementById('road-network');
	const reachableNetwork = document.getElementById('reachable-network');
	const originMarker = document.getElementById('map-origin');
	const distance = document.getElementById('map-distance');
	const distanceValue = document.getElementById('map-distance-value');
	const result = document.getElementById('map-result');
	const stations = [...map.querySelectorAll('.charging-station')];
	const svgNamespace = 'http://www.w3.org/2000/svg';
	const unitsPerKilometre = 600 / 1500;
	const nodes = {
		mountisa: { x: 81, y: 146 },
		cloncurry: { x: 153, y: 151 },
		winton: { x: 233, y: 190 },
		juliaCreek: { x: 222, y: 147 },
		charters: { x: 284, y: 128 },
		hughenden: { x: 306, y: 170 },
		longreach: { x: 280, y: 245 },
		barcaldine: { x: 326, y: 232 },
		springsure: { x: 367, y: 278 },
		charleville: { x: 318, y: 320 },
		roma: { x: 395, y: 302 },
		toowoomba: { x: 468, y: 330 },
		warwick: { x: 480, y: 350 },
		brisbane: { x: 548, y: 360 },
		gympie: { x: 516, y: 315 },
		maryborough: { x: 526, y: 294 },
		bundaberg: { x: 500, y: 278 },
		biloela: { x: 445, y: 245 },
		rockhampton: { x: 480, y: 218 },
		emerald: { x: 382, y: 242 },
		alpha: { x: 342, y: 275 },
		nebo: { x: 423, y: 190 },
		sarina: { x: 455, y: 170 },
		mackay: { x: 445, y: 145 },
		cardwell: { x: 414, y: 120 },
		townsville: { x: 405, y: 90 },
		cairnsSouth: { x: 378, y: 52 },
		cairns: { x: 385, y: 20 }
	};
	const edges = [];
	let origin;

	function addRoads(nodeIds, type = 'local') {
		for (let index = 0; index < nodeIds.length - 1; index++) {
			edges.push({
				from: nodeIds[index],
				to: nodeIds[index + 1],
				type
			});
		}
	}

	addRoads([
		'cairns', 'cairnsSouth', 'townsville', 'cardwell', 'mackay',
		'sarina', 'rockhampton', 'bundaberg', 'maryborough', 'gympie', 'brisbane'
	], 'highway');
	addRoads(['mountisa', 'cloncurry', 'winton', 'longreach', 'barcaldine', 'alpha', 'emerald', 'rockhampton'], 'regional');
	addRoads(['mountisa', 'cloncurry', 'juliaCreek', 'charters', 'hughenden', 'townsville'], 'regional');
	addRoads(['longreach', 'charleville', 'roma', 'toowoomba', 'warwick', 'brisbane'], 'regional');
	addRoads(['emerald', 'springsure', 'roma'], 'regional');
	addRoads(['emerald', 'nebo', 'mackay'], 'regional');
	addRoads(['rockhampton', 'biloela', 'bundaberg'], 'regional');
	addRoads(['bundaberg', 'maryborough', 'toowoomba']);
	addRoads(['winton', 'juliaCreek', 'hughenden']);
	addRoads(['longreach', 'hughenden'], 'regional');

	stations.forEach(station => {
		const node = nodes[station.dataset.node];
		if (!node) throw new Error(`Unknown road node for charging station: ${station.dataset.name}`);
		station.setAttribute('transform', `translate(${node.x} ${node.y})`);
	});

	function pointOnEdge(edge, fraction) {
		const start = nodes[edge.from];
		const end = nodes[edge.to];
		return {
			x: start.x + (end.x - start.x) * fraction,
			y: start.y + (end.y - start.y) * fraction
		};
	}

	function pathElement(className, start, end) {
		const path = document.createElementNS(svgNamespace, 'path');
		path.setAttribute('class', className);
		path.setAttribute('d', `M${start.x} ${start.y}L${end.x} ${end.y}`);
		return path;
	}

	edges.forEach(edge => {
		const roadClass = ` is-${edge.type}`;
		roadNetwork.append(
			pathElement(`road-segment${roadClass}`, nodes[edge.from], nodes[edge.to]),
			pathElement(`road-line${roadClass}`, nodes[edge.from], nodes[edge.to])
		);
	});

	function snapToRoad(point) {
		let nearest;
		let nearestDistance = Infinity;

		edges.forEach((edge, index) => {
			const start = nodes[edge.from];
			const end = nodes[edge.to];
			const dx = end.x - start.x;
			const dy = end.y - start.y;
			const fraction = Math.max(0, Math.min(1,
				((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)
			));
			const snapped = pointOnEdge(edge, fraction);
			const squaredDistance = (point.x - snapped.x) ** 2 + (point.y - snapped.y) ** 2;

			if (squaredDistance < nearestDistance) {
				nearestDistance = squaredDistance;
				nearest = { edgeIndex: index, fraction, ...snapped };
			}
		});

		return nearest;
	}

	function getNetworkDistances(start) {
		const distances = Object.fromEntries(Object.keys(nodes).map(node => [node, Infinity]));
		const startEdge = edges[start.edgeIndex];
		const startLength = Math.hypot(
			nodes[startEdge.to].x - nodes[startEdge.from].x,
			nodes[startEdge.to].y - nodes[startEdge.from].y
		) / unitsPerKilometre;
		distances[startEdge.from] = startLength * start.fraction;
		distances[startEdge.to] = startLength * (1 - start.fraction);
		const pending = [
			{ node: startEdge.from, distance: distances[startEdge.from] },
			{ node: startEdge.to, distance: distances[startEdge.to] }
		];

		while (pending.length) {
			pending.sort((a, b) => b.distance - a.distance);
			const current = pending.pop();
			if (current.distance > distances[current.node]) continue;

			edges.forEach(edge => {
				let neighbor;
				if (edge.from === current.node) neighbor = edge.to;
				else if (edge.to === current.node) neighbor = edge.from;
				else return;

				const length = Math.hypot(
					nodes[edge.to].x - nodes[edge.from].x,
					nodes[edge.to].y - nodes[edge.from].y
				) / unitsPerKilometre;
				const nextDistance = current.distance + length;
				if (nextDistance < distances[neighbor]) {
					distances[neighbor] = nextDistance;
					pending.push({ node: neighbor, distance: nextDistance });
				}
			});
		}

		return distances;
	}

	function addReachableRoad(edge, node, fraction) {
		if (fraction <= 0) return;
		const start = nodes[node];
		const end = pointOnEdge(edge, node === edge.from ? fraction : 1 - fraction);
		reachableNetwork.append(pathElement('road-reachable', start, end));
	}

	function update() {
		const range = Number(distance.value) / 1000;
		const distances = getNetworkDistances(origin);
		const progress = (Number(distance.value) - Number(distance.min))
			/ (Number(distance.max) - Number(distance.min)) * 100;
		const rangeLabel = `${range} km`;
		distanceValue.value = rangeLabel;
		distance.setAttribute('aria-valuetext', `${rangeLabel} available`);
		distance.style.setProperty('--slider-progress', `${progress}%`);
		originMarker.setAttribute('transform', `translate(${origin.x} ${origin.y})`);
		reachableNetwork.replaceChildren();

		edges.forEach((edge, index) => {
			const length = Math.hypot(
				nodes[edge.to].x - nodes[edge.from].x,
				nodes[edge.to].y - nodes[edge.from].y
			);
			const lengthInKilometres = length / unitsPerKilometre;
			if (index === origin.edgeIndex) {
				const reachableFraction = range / lengthInKilometres;
				const start = pointOnEdge(edge, Math.max(0, origin.fraction - reachableFraction));
				const end = pointOnEdge(edge, Math.min(1, origin.fraction + reachableFraction));
				reachableNetwork.append(pathElement('road-reachable', start, end));
			}
			const fromFraction = Math.max(0, Math.min(1, (range - distances[edge.from]) / lengthInKilometres));
			const toFraction = Math.max(0, Math.min(1, (range - distances[edge.to]) / lengthInKilometres));
			addReachableRoad(edge, edge.from, fromFraction);
			if (fromFraction < 1) addReachableRoad(edge, edge.to, toFraction);
		});

		const reachableStations = stations.map(station => {
			const routeDistance = distances[station.dataset.node];
			const reachable = routeDistance <= range;
			station.classList.toggle('is-reachable', reachable);
			return {
				name: station.dataset.name,
				distance: routeDistance,
				reachable
			};
		}).filter(station => station.reachable)
			.sort((a, b) => a.distance - b.distance);

		result.replaceChildren();
		if (!reachableStations.length) {
			result.textContent = 'No charging stations in range. Increase your available range or choose another road.';
			return;
		}

		const summary = document.createElement('p');
		summary.className = 'map-result-count';
		summary.textContent = `${reachableStations.length} of ${stations.length} charging stations in range`;
		const list = document.createElement('ul');
		list.className = 'map-result-list';

		reachableStations.forEach(station => {
			const item = document.createElement('li');
			const name = document.createElement('span');
			const routeDistance = document.createElement('span');
			name.textContent = station.name;
			routeDistance.className = 'map-result-distance';
			routeDistance.textContent = `${(Math.round(station.distance * 10) / 10).toFixed(1)} km route`;
			item.append(name, routeDistance);
			list.append(item);
		});

		result.append(summary, list);
	}

	function setOrigin(point) {
		origin = snapToRoad(point);
		update();
	}

	map.addEventListener('click', event => {
		const point = map.createSVGPoint();
		point.x = event.clientX;
		point.y = event.clientY;
		const position = point.matrixTransform(map.getScreenCTM().inverse());
		setOrigin(position);
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
		setOrigin({
			x: Math.max(0, Math.min(600, origin.x + move[0])),
			y: Math.max(0, Math.min(400, origin.y + move[1]))
		});
	});

	origin = snapToRoad({ x: 548, y: 360 });
	map.setAttribute('tabindex', '0');
	distance.disabled = false;
	distance.addEventListener('input', update);
	update();
})();
