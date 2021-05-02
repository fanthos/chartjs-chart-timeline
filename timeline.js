(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('chart.js'), require('moment')) :
	typeof define === 'function' && define.amd ? define(['chart.js', 'moment'], factory) :
	(factory(global.Chart,global.moment));
}(this, (function (Chart,moment) { 'use strict';

	Chart = Chart && Chart.hasOwnProperty('default') ? Chart['default'] : Chart;
	moment = moment && moment.hasOwnProperty('default') ? moment['default'] : moment;

	// use var for const to still support ES5
	var helpers = Chart.helpers;

	var TimelineScaleConfig = {
		position: 'bottom',
		tooltips: {
			mode: 'nearest',
		},
		adapters: {},
		time: {
			parser: false, // false == a pattern string from http://momentjs.com/docs/#/parsing/string-format/ or a custom callback that converts its argument to a moment
			format: false, // DEPRECATED false == date objects, moment object, callback or a pattern string from http://momentjs.com/docs/#/parsing/string-format/
			unit: false, // false == automatic or override with week, month, year, etc.
			round: false, // none, or override with week, month, year, etc.
			displayFormat: false, // DEPRECATED
			isoWeekday: false, // override week start day - see http://momentjs.com/docs/#/get-set/iso-weekday/
			minUnit: 'millisecond',
			distribution: 'linear',
			bounds: 'data',

			// defaults to unit's corresponding unitFormat below or override using pattern string from http://momentjs.com/docs/#/displaying/format/
			displayFormats: {
				millisecond: 'h:mm:ss.SSS a', // 11:20:01.123 AM,
				second: 'h:mm:ss a', // 11:20:01 AM
				minute: 'h:mm a', // 11:20 AM
				hour: 'hA', // 5PM
				day: 'MMM D', // Sep 4
				week: 'll', // Week 46, or maybe "[W]WW - YYYY" ?
				month: 'MMM YYYY', // Sept 2015
				quarter: '[Q]Q - YYYY', // Q3
				year: 'YYYY' // 2015
			},
		},
		ticks: {
			autoSkip: true
		}
	};

	function toTimestamp(scale, input) {
		var adapter = scale._adapter;
		var options = scale.options.time;
		var parser = options.parser;
		var format = parser || options.format;
		var value = input;

		if (typeof parser === 'function') {
			value = parser(value);
		}

		// Only parse if its not a timestamp already
		if (!helpers.isFinite(value)) {
			value = typeof format === 'string'
				? adapter.parse(value, format)
				: adapter.parse(value);
		}

		if (value !== null) {
			return +value;
		}

		// Labels are in an incompatible format and no `parser` has been provided.
		// The user might still use the deprecated `format` option for parsing.
		if (!parser && typeof format === 'function') {
			value = format(input);

			// `format` could return something else than a timestamp, if so, parse it
			if (!helpers.isFinite(value)) {
				value = adapter.parse(value);
			}
		}

		return value;
	}

	function parse(scale, input) {
		if (helpers.isNullOrUndef(input)) {
			return null;
		}

		var options = scale.options.time;
		var value = toTimestamp(scale, scale.getRightValue(input));
		if (value === null) {
			return value;
		}

		if (options.round) {
			value = +scale._adapter.startOf(value, options.round);
		}

		return value;
	}

	function arrayUnique(items) {
		var hash = {};
		var out = [];
		var i, ilen, item;

		for (i = 0, ilen = items.length; i < ilen; ++i) {
			item = items[i];
			if (!hash[item]) {
				hash[item] = true;
				out.push(item);
			}
		}

		return out;
	}

	function sorter(a, b) {
		return a - b;
	}

	var MIN_INTEGER = Number.MIN_SAFE_INTEGER || -9007199254740991;
	var MAX_INTEGER = Number.MAX_SAFE_INTEGER || 9007199254740991;

	var TimelineScale = Chart.scaleService.getScaleConstructor('time').extend({

		determineDataLimits: function() {
			var me = this;
			var chart = me.chart;
			var adapter = me._adapter;
			var timeOpts = me.options.time;
			var unit = timeOpts.unit || 'day';
			var min = MAX_INTEGER;
			var max = MIN_INTEGER;
			var timestamps = [];
			var datasets = [];
			var labels = [];
			var i, j, ilen, jlen, data;
			var dataLabels = chart.data.labels || [];
			var datasetOptions = me.chart.options.datasets.timeline;
			var timestamp0, timestamp1;
			var timestampobj = {};

			// skip label convert for timeline
			// Convert labels to timestamps
			// for (i = 0, ilen = dataLabels.length; i < ilen; ++i) {
			// 	labels.push(parse(me, dataLabels[i]));
			// }

			// Convert data to timestamps
			// adapted for timeline which has two timestamps instead of one
			for (i = 0, ilen = (chart.data.datasets || []).length; i < ilen; ++i) {
				if (chart.isDatasetVisible(i)) {
					var dataset = chart.data.datasets[i];
					data = dataset.data;

					// Let's consider that all data have the same format.
					// for timeline data is in arrays like [start, end, label]
					if (helpers.isArray(data[0])) {
						datasets[i] = [];

						for (j = 0, jlen = data.length; j < jlen; ++j) {
							timestamp0 = parse(me, data[j][dataset.keyStart || datasetOptions.keyStart]);
							timestamp1 = parse(me, data[j][dataset.keyEnd || datasetOptions.keyEnd]);
							if (timestamp0 > timestamp1) {
								[timestamp0, timestamp1] = [timestamp1, timestamp0];
							}
							if (min > timestamp0 && timestamp0) {
								min = timestamp0;
							}
							if (max < timestamp1 && timestamp1) {
								max = timestamp1;
							}
							datasets[i][j] = [timestamp0, timestamp1, data[j][dataset.keyValue || datasetOptions.keyValue]];
							if (Object.prototype.hasOwnProperty.call(timestampobj, timestamp0)) {
								timestampobj[timestamp0] = true;
								timestamps.push(timestamp0);
							}
							if (Object.prototype.hasOwnProperty.call(timestampobj, timestamp1)) {
								timestampobj[timestamp1] = true;
								timestamps.push(timestamp1);
							}
						}
					} else {
						for (j = 0, jlen = labels.length; j < jlen; ++j) {
							timestamps.push(labels[j]);
						}
						datasets[i] = labels.slice(0);
					}
				} else {
					datasets[i] = [];
				}
			}

			// for timeline do not consider labels for min/max
			// if (labels.length) {
			// 	// Sort labels **after** data have been converted
			// 	labels = arrayUnique(labels).sort(sorter);
			// 	min = Math.min(min, labels[0]);
			// 	max = Math.max(max, labels[labels.length - 1]);
			// }

			if (timestamps.length) {
				timestamps = arrayUnique(timestamps).sort(sorter);
				min = Math.min(min, timestamps[0]);
				max = Math.max(max, timestamps[timestamps.length - 1]);
			}

			min = parse(me, timeOpts.min) || min;
			max = parse(me, timeOpts.max) || max;

			// In case there is no valid min/max, set limits based on unit time option
			min = min === MAX_INTEGER ? +adapter.startOf(Date.now(), unit) : min;
			max = max === MIN_INTEGER ? +adapter.endOf(Date.now(), unit) + 1 : max;

			// Make sure that max is strictly higher than min (required by the lookup table)
			me.min = Math.min(min, max);
			me.max = Math.max(min + 1, max);

			// PRIVATE
			me._horizontal = me.isHorizontal();
			me._table = [];
			me._timestamps = {
				data: timestamps,
				datasets: datasets,
				labels: labels
			};
		},

		/**
		 * @private
		 */
		_parseValue: function(value) {
			var start, end, min, max;

			if (helpers.isArray(value)) {
				start = +this.getRightValue(parse(this, value[0]));
				end = +this.getRightValue(parse(this, value[1]));
				min = Math.min(start, end);
				max = Math.max(start, end);
			} else {
				value = +this.getRightValue(parse(me, value));
				start = undefined;
				end = value;
				min = value;
				max = value;
			}

			return {
				min: min,
				max: max,
				start: start,
				end: end
			};
		},

	});

	Chart.scaleService.registerScaleType('timeline', TimelineScale, TimelineScaleConfig);

	// copied from controller.bar, not modified
	function swap(orig, v1, v2) {
		return orig === v1 ? v2 : orig === v2 ? v1 : orig;
	}

	// copied from controller.bar, not modified
	function parseBorderSkipped(vm) {
		var edge = vm.borderSkipped;
		var res = {};

		if (!edge) {
			return res;
		}

		if (vm.horizontal) {
			if (vm.base > vm.x) {
				edge = swap(edge, 'left', 'right');
			}
		} else if (vm.base < vm.y) {
			edge = swap(edge, 'bottom', 'top');
		}

		res[edge] = true;
		return res;
	}

	// copied from controller.bar, not modified
	function parseBorderWidth(vm, maxW, maxH) {
		var value = vm.borderWidth;
		var skip = parseBorderSkipped(vm);
		var t, r, b, l;

		if (helpers.isObject(value)) {
			t = +value.top || 0;
			r = +value.right || 0;
			b = +value.bottom || 0;
			l = +value.left || 0;
		} else {
			t = r = b = l = +value || 0;
		}

		return {
			t: skip.top || (t < 0) ? 0 : t > maxH ? maxH : t,
			r: skip.right || (r < 0) ? 0 : r > maxW ? maxW : r,
			b: skip.bottom || (b < 0) ? 0 : b > maxH ? maxH : b,
			l: skip.left || (l < 0) ? 0 : l > maxW ? maxW : l
		};
	}

	// modified from original controller.bar, ignoring isVertical
	function getBarBounds(vm) {
		return {
			left: vm.x,
			top: vm.y,
			right: vm.x + vm.width,
			bottom: vm.y + vm.height
		};
	}

	// copied from controller.bar, not modified
	function boundingRects(vm) {
		var bounds = getBarBounds(vm);
		var width = bounds.right - bounds.left;
		var height = bounds.bottom - bounds.top;
		var border = parseBorderWidth(vm, width / 2, height / 2);

		return {
			outer: {
				x: bounds.left,
				y: bounds.top,
				w: width,
				h: height
			},
			inner: {
				x: bounds.left + border.l,
				y: bounds.top + border.t,
				w: width - border.l - border.r,
				h: height - border.t - border.b
			}
		};
	}

	/**
	 * Computes the "optimal" sample size to maintain bars equally sized while preventing overlap.
	 * @private
	 */
	 function computeMinSampleSize(scale, pixels) {
		var min = scale._length;
		var prev, curr, i, ilen;

		for (i = 1, ilen = pixels.length; i < ilen; ++i) {
			min = Math.min(min, Math.abs(pixels[i] - pixels[i - 1]));
		}

		for (i = 0, ilen = scale.getTicks().length; i < ilen; ++i) {
			curr = scale.getPixelForTick(i);
			min = i > 0 ? Math.min(min, Math.abs(curr - prev)) : min;
			prev = curr;
		}

		return min;
	}

	/**
	 * Computes an "ideal" category based on the absolute bar thickness or, if undefined or null,
	 * uses the smallest interval (see computeMinSampleSize) that prevents bar overlapping. This
	 * mode currently always generates bars equally sized (until we introduce scriptable options?).
	 * @private
	 */
	 function computeFitCategoryTraits(index, ruler, options) {
		var thickness = options.barThickness;
		var count = ruler.stackCount;
		var curr = ruler.pixels[index];
		var min = helpers.isNullOrUndef(thickness)
			? computeMinSampleSize(ruler.scale, ruler.pixels)
			: -1;
		var size, ratio;

		// only modification for timeline, there are no stacks
		count = 1;

		if (helpers.isNullOrUndef(thickness)) {
			size = min * options.categoryPercentage;
			ratio = options.barPercentage;
		} else {
			// When bar thickness is enforced, category and bar percentages are ignored.
			// Note(SB): we could add support for relative bar thickness (e.g. barThickness: '50%')
			// and deprecate barPercentage since this value is ignored when thickness is absolute.
			size = thickness * count;
			ratio = 1;
		}

		// console.log('chunk: ' + (size / count)
		// 				+ ' ratio: ' + ratio
		// 				+ ' start: ' + (curr - (size / 2)));

		return {
			chunk: size / count,
			ratio: ratio,
			start: curr - (size / 2)
		};
	}

	/**
	 * Computes an "optimal" category that globally arranges bars side by side (no gap when
	 * percentage options are 1), based on the previous and following categories. This mode
	 * generates bars with different widths when data are not evenly spaced.
	 * @private
	 */
	 function computeFlexCategoryTraits(index, ruler, options) {
		var pixels = ruler.pixels;
		var curr = pixels[index];
		var prev = index > 0 ? pixels[index - 1] : null;
		var next = index < pixels.length - 1 ? pixels[index + 1] : null;
		var percent = options.categoryPercentage;
		var start, size;

		if (prev === null) {
			// first data: its size is double based on the next point or,
			// if it's also the last data, we use the scale size.
			prev = curr - (next === null ? ruler.end - ruler.start : next - curr);
		}

		if (next === null) {
			// last data: its size is also double based on the previous point.
			next = curr + curr - prev;
		}

		start = curr - (curr - Math.min(prev, next)) / 2 * percent;
		size = Math.abs(next - prev) / 2 * percent;

		return {
			chunk: size / ruler.stackCount,
			ratio: options.barPercentage,
			start: start
		};
	}

	Chart.controllers.timeline = Chart.controllers.bar.extend({

		/**
		 * @private
		 */
		 _dataElementOptions: [
			'backgroundColor',
			'borderColor',
			'borderSkipped',
			'borderWidth',
			'hoverBackgroundColor',
			'hoverBorderColor',
			'hoverBorderWidth'
		],

		_datasetOptions: [
			'backgroundColor',
			'borderColor',
			'borderSkipped',
			'borderWidth',
			'hoverBackgroundColor',
			'hoverBorderColor',
			'hoverBorderWidth',
			'barPercentage',
			'barThickness',
			'categoryPercentage',
			'maxBarThickness',
			'minBarLength',
			'textPadding',
			'showText',
			'keyValue',
			'keyStart',
			'keyEnd'
		],

		initialize: function() {
			var me = this;

			Chart.controllers.bar.prototype.initialize.apply(me, arguments);

			var elementOptions = me.chart.options.elements;
			helpers._deprecated('timeline chart', elementOptions.colorFunction, 'options.elements.colorFunction', 'dataset.backgroundColor');
		},

		_updateElementGeometry: function(rectangle, index, reset, options) {
			var me = this;

			// call regular controller.bar.updateElement
			Chart.controllers.bar.prototype._updateElementGeometry.apply(me, arguments);

			var data = me.getDataset().data[index];
			var start = rectangle._xScale.getPixelForValue(data[options.keyStart]);
			var stop = rectangle._xScale.getPixelForValue(data[options.keyEnd]);
			var labelText = data[options.keyValue];
			var ruler = me.getRuler(index);
			var pixels = me.calculateBarIndexPixels(me.index, index, ruler, options);
			// we're (mis)using some intrinsics of getPixelForValue on category axis here,
			// giving the index instead of the value
			var y = rectangle._yScale.getPixelForValue(me.index, me.index);
			// var height = me.calculateBarHeight(ruler);

			rectangle._model.x = start;
			rectangle._model.width = stop - start;
			rectangle._model.y = y - (pixels.size / 2);
			rectangle._model.height = pixels.size;

			if (options.showText || true) {
				rectangle._model.text = labelText;
				rectangle._model.textPadding = options.textPadding;
				rectangle._model.fontColor = helpers.color(options.fontColor || Chart.defaults.global.defaultFontColor).rgbaString();
				rectangle._model.font = helpers.options._parseFont(options).string;
			} else {
				rectangle._model.text = undefined;
			}

			rectangle.draw = function() {
				// cannot use any inherited prototype draw here
				// so copied here from controller.bar
				var ctx = this._chart.ctx;
				var vm = this._view;
				var rects = boundingRects(vm);
				var outer = rects.outer;
				var inner = rects.inner;

				ctx.fillStyle = vm.backgroundColor;
				ctx.fillRect(outer.x, outer.y, outer.w, outer.h);

				if (!(outer.w === inner.w && outer.h === inner.h)) {
					ctx.save();
					ctx.beginPath();
					ctx.rect(outer.x, outer.y, outer.w, outer.h);
					ctx.clip();
					ctx.fillStyle = vm.borderColor;
					ctx.rect(inner.x, inner.y, inner.w, inner.h);
					ctx.fill('evenodd');
					ctx.restore();
				}

				if (vm.text) {
					var textRect = ctx.measureText(vm.text);
					if (textRect.width > 0) {
						ctx.save();
						ctx.beginPath();
						ctx.rect(inner.x, inner.y, inner.w, inner.h);
						ctx.clip();
						ctx.lineWidth = 0;
						ctx.font = vm.font;
						ctx.fillStyle = vm.fontColor;
						ctx.textBaseline = 'middle';
						ctx.fillText(vm.text, vm.x + vm.textPadding, vm.y + (vm.height) / 2);
						ctx.restore();
					}
				}
			};

			rectangle.inXRange = function (mouseX) {
				var bounds = getBarBounds(this._view);
				return mouseX >= bounds.left && mouseX <= bounds.right;
			};

			rectangle.tooltipPosition = function () {
	            var vm = this.getCenterPoint();
	            return {
	                x: vm.x ,
	                y: vm.y
	            };
	        };

			rectangle.getCenterPoint = function () {
				var vm = this._view;
				var x, y;
				x = vm.x + (vm.width / 2);
				y = vm.y + (vm.height / 2);

				return {
					x : x,
					y : y
				};
			};

			rectangle.inRange = function (mouseX, mouseY) {
				var inRange = false;

				if(this._view)
				{
					var bounds = getBarBounds(this._view);
					inRange = mouseX >= bounds.left && mouseX <= bounds.right &&
						mouseY >= bounds.top && mouseY <= bounds.bottom;
				}
				return inRange;
			};

			rectangle.getArea = function() {
				var vm = this._view;

				return vm.height * Math.abs(vm.x - vm.base);
			};

		},

		// draw
		draw: function (ease) {
			var easingDecimal = ease || 1;
			var i, len;
			var metaData = this.getMeta().data;
			for (i = 0, len = metaData.length; i < len; i++)
			{
				metaData[i].transition(easingDecimal).draw();
			}
		},

		// From controller.bar
		calculateBarIndexPixels: function(datasetIndex, index, ruler, options) {
			var me = this;
			var range = options.barThickness === 'flex'
				? computeFlexCategoryTraits(index, ruler, options)
				: computeFitCategoryTraits(index, ruler, options);

			var stackIndex = me.getStackIndex(datasetIndex, me.getMeta().stack);
			var center = range.start + (range.chunk * stackIndex) + (range.chunk / 2);
			var size = Math.min(
				helpers.valueOrDefault(options.maxBarThickness, Infinity),
				range.chunk * range.ratio);

			return {
				base: center - size / 2,
				head: center + size / 2,
				center: center,
				size: size
			};
		},

		/**
		 * @private
		 */
		 _resolveDataElementOptions: function(element, index) {
			var me = this;
			var chart = me.chart;
			var dataset = me.getDataset();
			var custom = chart.options.datasets.timeline;
			var options = chart.options.elements.rectangle || {};

			var values = {};
			var i, ilen, key;

			// Scriptable options
			var context = {
				chart: chart,
				dataIndex: index,
				dataset: dataset,
				datasetIndex: me.index
			};

			var datasetKeys = me._datasetOptions;
			for (i = 0, ilen = datasetKeys.length; i < ilen; ++i) {
				key = datasetKeys[i];
				values[key] = helpers.options.resolve([
					dataset[key],
					custom[key],
					options[key]], context, index);
			}

			var keys = me._dataElementOptions;

			for (i = 0, ilen = keys.length; i < ilen; ++i) {
				key = keys[i];
				values[key] = helpers.options.resolve([
					values[key],
					custom[key],
					dataset[key],
					options[key]
				], context, index);
			}

			return values;
		},

		/**
		 * @private
		 */
		 _getValueScaleId: function() {
			return this.getMeta().xAxisID;
		},

		/**
		 * @private
		 */
		_getIndexScaleId: function() {
			return this.getMeta().yAxisID;
		}

	});

	Chart.defaults.timeline = {
		elements: {
			rectangle: {
				backgroundColor: Chart.defaults.global.backgroundColor,
				borderColor: Chart.defaults.global.backgroundColor,
				borderWidth: 0,
				borderSkipped: null,
				hoverBackgroundColor: helpers.getHoverColor(Chart.defaults.global.backgroundColor),
				hoverBorderColor: helpers.getHoverColor(Chart.defaults.global.borderColor),
				hoverBorderWidth: 1,
				showText: true,
				textPadding: 4,
				minBarLength: 5,
				fontColor: '#fff'
			}
		},

		datasets: {
			timeline: {
				categoryPercentage: 0.8,
				barPercentage: 0.9,
				keyStart: 0,
				keyEnd: 1,
				keyValue: 2
			}
		},

		layout: {
			padding: {
				left: 0,
				right: 0,
				top: 0,
				bottom: 0
			}
		},

		legend: {
			display: false
		},

		scales: {
			xAxes: [{
				type: 'timeline',
				position: 'bottom',
				distribution: 'linear',
				gridLines: {
					display: true,
					// offsetGridLines: true,
					drawBorder: true,
					drawTicks: true
				},
				ticks: {
					maxRotation: 0
				},
				unit: 'day'
			}],
			yAxes: [{
				type: 'category',
				position: 'left',
				offset: true,
				gridLines: {
					display: true,
					offsetGridLines: true,
					drawBorder: true,
					drawTicks: true
				}
			}]
		},
		tooltips: {
			callbacks: {
				title: function(tooltipItems, data) {
					var elemOpts = this._chart.options.elements;
					var d = data.labels[tooltipItems[0].datasetIndex];
					return d;
				},
				label: function(tooltipItem, data) {
					var elemOpts = data.datasets[tooltipItem.datasetIndex];
					var d = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];

					return [d[elemOpts.keyValue || 2],
						moment(d[elemOpts.keyStart || 0]).format('L LTS'),
						moment(d[elemOpts.keyEnd || 1]).format('L LTS')];
				}
			}
		}
	};

})));
