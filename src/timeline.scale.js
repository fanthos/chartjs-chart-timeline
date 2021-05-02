var Chart = require('chart.js');
var moment = require('moment');

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
		var i, j, ilen, jlen, data, timestamp;
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
