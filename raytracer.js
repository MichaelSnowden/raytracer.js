function dot(u, v) {
	return u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
}

function scale(u, k) {
	return [u[0] * k, u[1] * k, u[2] * k];
}

function norm(u) {
	return Math.sqrt(dot(u, u));
}

function normalize(u) {
	return scale(u, 1.0 / norm(u));
}

function sub(u, v) {
	return [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
}

function add(u, v) {
	return [u[0] + v[0], u[1] + v[1], u[2] + v[2]];
}

function mix(u, v, r) {
	return add(scale(u, r), scale(v, 1 - r));
}

function distanceTo(u, v) {
	return norm(sub(v, u));
}

function makeSphere(radius, center, color) {
	return function(source, direction, callback) {
		var v = sub(source, center);
		var b = -dot(v, direction);
		var v2 = dot(v, v);
		var r2 = radius * radius;
		var d2 = b * b - v2 + r2;
		if (d2 > 0) {
			var distance;
			if (b - Math.sqrt(d2) > 0.01) {
				distance = b - Math.sqrt(d2);
			} else if (b + Math.sqrt(d2) > 0.01) {
				distance = b + Math.sqrt(d2);
			} else {
				return;
			}
			var intersection = add(source, scale(direction, distance));
			var normal = normalize(sub(intersection, center));
			callback(intersection, normal, color);
		}
	}
}

function trace(shapes, ambient, lights, backgroundColor, source, direction, depth) {
	var hit = {
		intersection: null,
		distance: 999999.0, 
		normal: null,
		color: null
	}

	function callback(intersection, normal, color) {
		var distance = distanceTo(source, intersection);
		if (distance < hit.distance) {
			hit = {
				intersection: intersection,
				distance: distance,
				normal: normal,
				color: color
			};
		}
	}

	for (shape of shapes) {
	    shape(source, direction, callback);
	}

	if (hit.intersection == null) {
		return backgroundColor;
	}

	var direct = hit.color;
	var intensity = 0;
	for (var light of lights) {
		var intensity = Math.max(ambient, intensity, dot(normalize(sub(light, hit.intersection)), hit.normal));
	}
	var direct = scale(hit.color, intensity);
	if (depth == 1) {
		return direct;
	} else {
		var bounce = sub(direction, scale(hit.normal, 2 * dot(direction, hit.normal)));
		var reflected = trace(shapes, ambient, lights, backgroundColor, hit.intersection, bounce, depth - 1);
		return mix(direct, reflected, 0.5 + 0.5 * Math.pow(intensity, 30));
	}
}

function Raytracer(obj) {
	this.backgroundColor = obj.backgroundColor || [0, 0, 0];
	this.camera = obj.camera || [0, 1, 0];
	this.lights = obj.lights || [[2, 2, 0]];
	this.ambient = obj.ambient || 0.5;
	this.depth = obj.depth || 3;
	this.shapes = obj.shapes || [makeSphere(1, [0, 0, 3], [1, 0, 0])];
	this.canvas = obj.canvas || document.createElement("canvas");
	if (!obj.canvas) {
		this.canvas.width = obj.width || 200;
		this.canvas.height = obj.height || this.canvas.width;
		if (obj.parent) {
			obj.parent.appendChild(this.canvas);
		} else {
			document.body.appendChild(this.canvas);
		}
	}
	this.context = this.canvas.getContext("2d");
	this.canvasData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
}

Raytracer.prototype.drawPixel = function(x, y, r, g, b, a) {
    var index = (x + y * this.canvas.width) * 4;

    this.canvasData.data[index + 0] = r;
    this.canvasData.data[index + 1] = g;
    this.canvasData.data[index + 2] = b;
    this.canvasData.data[index + 3] = a;
}

Raytracer.prototype.render = function() {
	for (var x = 0; x < this.canvas.width; ++x) {
		for (var y = 0; y < this.canvas.height; ++y) {
            var direction = normalize([x / Math.min(this.canvas.width, this.canvas.height) - 0.5, y / Math.min(this.canvas.width, this.canvas.height) - 0.5, 1.0]);
            var color = scale(trace(this.shapes, this.ambient, this.lights, this.backgroundColor, this.camera, direction, this.depth), 255);
			this.drawPixel(x, this.canvas.height - y, color[0], color[1], color[2], 255);
		}
	}
	this.context.putImageData(this.canvasData, 0, 0);
}
