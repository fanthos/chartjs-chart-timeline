(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('chart.js'), require('moment')) :
    typeof define === 'function' && define.amd ? define(['chart.js', 'moment'], factory) :
    (factory(global.Chart,global.moment));
}(this, (function (Chart,moment) { 'use strict';

    Chart = Chart && Chart.hasOwnProperty('default') ? Chart['default'] : Chart;
    moment = moment && moment.hasOwnProperty('default') ? moment['default'] : moment;

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

    function sorter(a, b) {
    	return a - b;
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
    		var elemOpts = me.chart.options.elements;
            var timestamp0, timestamp1;
            var timestampobj = {};

    		// Convert labels to timestamps
    		// for (i = 0, ilen = dataLabels.length; i < ilen; ++i) {
    		// 	labels.push(parse(me, dataLabels[i]));
    		// }

    		// Convert data to timestamps
            // adapted for timeline which has two timestamps instead of one
    		for (i = 0, ilen = (chart.data.datasets || []).length; i < ilen; ++i) {
    			if (chart.isDatasetVisible(i)) {
    				data = chart.data.datasets[i].data;

    				// Let's consider that all data have the same format.
                    // for timeline data is in arrays like [start, end, label]
    				if (helpers.isArray(data[0])) {
    					datasets[i] = [];

    					for (j = 0, jlen = data.length; j < jlen; ++j) {
    						timestamp0 = parse(me, data[j][elemOpts.keyStart]);
    						timestamp1 = parse(me, data[j][elemOpts.keyEnd]);
    						if (timestamp0 > timestamp1) {
    							[timestamp0, timestamp1] = [timestamp1, timestamp0];
    						}
    						if (min > timestamp0 && timestamp0) {
    							min = timestamp0;
    						}
    						if (max < timestamp1 && timestamp1) {
    							max = timestamp1;
    						}
    						datasets[i][j] = [timestamp0, timestamp1, data[j][elemOpts.keyValue]];
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

    });

    Chart.scaleService.registerScaleType('timeline', TimelineScale, TimelineScaleConfig);

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
            'hoverBorderWidth',
    		'barThickness',
    		'maxBarThickness',
    		'minBarLength',
            'textPadding',
            'showText',
            'keyValue',
            'keyStart',
            'keyEnd'
    	],

        getBarBounds : function (bar) {
            var vm =   bar._view;
            var x1, x2, y1, y2;

            x1 = vm.x;
            x2 = vm.x + vm.width;
            y1 = vm.y;
            y2 = vm.y + vm.height;

            return {
                left : x1,
                top: y1,
                right: x2,
                bottom: y2
            };
        },

        update: function(reset) {
            var me = this;
            var meta = me.getMeta();
            var chartOpts = me.chart.options;
            if (chartOpts.textPadding || chartOpts.minBarLength ||
                    chartOpts.showText || chartOpts.colorFunction) {
                var elemOpts = me.chart.options.elements;
                elemOpts.textPadding = chartOpts.textPadding || elemOpts.textPadding;
                elemOpts.minBarLength = chartOpts.minBarLength || elemOpts.minBarLength;
                elemOpts.colorFunction = chartOpts.colorFunction || elemOpts.colorFunction;
                elemOpts.minBarLength = chartOpts.minBarLength || elemOpts.minBarLength;
                if (Chart._tl_depwarn !== true) {
                    console.log('Timeline Chart: Configuration deprecated. Please check document on Github.');
                    Chart._tl_depwarn = true;
                }
            }

            helpers.each(meta.data, function(rectangle, index) {
                me.updateElement(rectangle, index, reset);
            }, me);
        },

        updateElement: function(rectangle, index, reset) {
            var me = this;
            var meta = me.getMeta();
            var dataset = me.getDataset();
            var options = me._resolveDataElementOptions(rectangle, index);

            var xScale = me.getScaleForId(meta.xAxisID);
            var yScale = me.getScaleForId(meta.yAxisID);
            var data = dataset.data[index];
            var x = xScale.getPixelForValue(data[options.keyStart]);
            var y = yScale.getPixelForValue(data, me.index, me.index);
            var end = xScale.getPixelForValue(data[options.keyEnd]);
            var width = end - x;
            var ruler = me.getRuler(index);
            var height = me.calculateBarHeight(ruler);

            rectangle._xScale = me.getScaleForId(meta.xAxisID);
    		rectangle._yScale = me.getScaleForId(meta.yAxisID);
            rectangle._datasetIndex = me.index;
            rectangle._index = index;
            rectangle._model = {
                backgroundColor: options.backgroundColor,
                borderColor: options.borderColor,
                borderSkipped: options.borderSkipped,
                borderWidth: options.borderWidth,
                datasetLabel: dataset.label,
                label: me.chart.data.labels[index],
                // the following are additional to regular bar
                x: reset ?  x - width : x,   // Top left of rectangle
                y: (y - (height / 2)) , // Top left of rectangle
                width: Math.max(width, options.minBarLength),
                height: height,
                base: x + width,
                text: data[options.keyValue],
                textColor: (helpers.color(options.backgroundColor).luminosity()) > 0.5 ? '#000000' : '#ffffff',
            };

            var text = data[options.keyValue];
            var showText = options.showText;

            // TO DO: how to integrate existing color function?
            // e.g. function overrides dataset/element option if return value is not null?
            // var color = helpers.color(elemOpts.colorFunction(text, data, dataset, index));

            rectangle.draw = function() {
                var ctx = this._chart.ctx;
                var vm = this._view;
                var oldAlpha = ctx.globalAlpha;
                var oldOperation = ctx.globalCompositeOperation;

                // Draw new rectangle with Alpha-Mix.
                ctx.fillStyle = vm.backgroundColor;
                ctx.lineWidth = vm.borderWidth;
                ctx.globalCompositeOperation = 'destination-over';
                ctx.fillRect(vm.x, vm.y, vm.width, vm.height);

                ctx.globalAlpha = 0.5;
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillRect(vm.x, vm.y, vm.width, vm.height);

                var bw = vm.borderWidth || 0;
                if (bw > 0) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(vm.x, vm.y, vm.width, vm.height);
                    ctx.clip();
                    ctx.fillStyle = vm.borderColor;
                    ctx.rect(vm.x + bw, vm.y + bw, vm.width - (2 * bw), vm.height - (2 * bw));
                    ctx.fill('evenodd');
                    ctx.restore();
                }

                ctx.globalAlpha = oldAlpha;
                ctx.globalCompositeOperation = oldOperation;
                if (options.showText) {
                    ctx.beginPath();
                    var textRect = ctx.measureText(vm.text);
                    if ((textRect.width > 0) && (textRect.width + options.textPadding + 2 < vm.width)) {
                        if (options.font) {ctx.font = options.font;}                    ctx.fillStyle = vm.textColor;
                        ctx.lineWidth = 0;
                        ctx.strokeStyle = vm.textColor;
                        ctx.textBaseline = 'middle';
                        ctx.fillText(vm.text, vm.x + options.textPadding, vm.y + (vm.height) / 2);
                    }
                    ctx.fill();
                }
            };

            rectangle.inXRange = function (mouseX) {
                var bounds = me.getBarBounds(this);
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
                    var bounds = me.getBarBounds(this);
                    inRange = mouseX >= bounds.left && mouseX <= bounds.right &&
                        mouseY >= bounds.top && mouseY <= bounds.bottom;
                }
                return inRange;
            };

            rectangle.pivot();
        },

        getBarCount: function() {
            var me = this;
            var barCount = 0;
            helpers.each(me.chart.data.datasets, function(dataset, datasetIndex) {
                var meta = me.chart.getDatasetMeta(datasetIndex);
                if (meta.bar && me.chart.isDatasetVisible(datasetIndex)) {
                    ++barCount;
                }
            }, me);
            return barCount;
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
        calculateBarHeight: function(ruler) {
            var me = this;
            var yScale = me.getScaleForId(me.getMeta().yAxisID);
            if (yScale.options.barThickness) {
                return yScale.options.barThickness;
            }
            return yScale.options.stacked ? ruler.categoryHeight : ruler.barHeight;
        },

        /**
    	 * @private
    	 */
         _resolveElementOptions: function(element, index) {
            var me = this;
    		var chart = me.chart;
    		var dataset = me.getDataset();
    		var custom = element.custom || {};
    		var options = chart.options.elements || {};

            var values = {};
            var i, ilen, key;

    		// Scriptable options
    		var context = {
    			chart: chart,
    			dataIndex: index,
    			dataset: dataset,
    			datasetIndex: me.index
    		};

            var keys = [
                'backgroundColor',
                'borderColor',
                'borderSkipped',
                'borderWidth',
                'hoverBackgroundColor',
                'hoverBorderColor',
                'hoverBorderWidth'
            ];

    		for (i = 0, ilen = keys.length; i < ilen; ++i) {
    			key = keys[i];
    			values[key] = helpers.options.resolve([
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
    	_resolveDataElementOptions: function(element, index) {

            // TODO revert to standard _resolveDataElementOptions from datasetcontroller

            var resolve = helpers.options.resolve;
            // copied from dataset controller
            var me = this;
    		var custom = element && element.custom;
    		var cached = me._cachedDataOpts;
    		if (cached && !custom) {
    			return cached;
    		}
    		var chart = me.chart;
    		var datasetOpts = me._config;
    		var options = chart.options.elements[me.dataElementType.prototype._type] || {};
    		var elementOptions = me._dataElementOptions;
    		var values = {};

    		// Scriptable options
    		var context = {
    			chart: chart,
    			dataIndex: index,
    			dataset: me.getDataset(),
    			datasetIndex: me.index
    		};

    		// `resolve` sets cacheable to `false` if any option is indexed or scripted
    		var info = {cacheable: !custom};

    		var keys, i, ilen, key;

    		custom = custom || {};

    		if (helpers.isArray(elementOptions)) {
    			for (i = 0, ilen = elementOptions.length; i < ilen; ++i) {
    				key = elementOptions[i];
    				values[key] = resolve([
    					custom[key],
    					datasetOpts[key],
    					options[key]
    				], context, index, info);
    			}
    		} else {
    			keys = Object.keys(elementOptions);
    			for (i = 0, ilen = keys.length; i < ilen; ++i) {
    				key = keys[i];
    				values[key] = resolve([
    					custom[key],
    					datasetOpts[elementOptions[key]],
    					datasetOpts[key],
    					options[key]
    				], context, index, info);
    			}
    		}

            // TODO merge global options
            if (!options.keyStart) {options.keyStart = 0;}        if (!options.keyEnd) {options.keyEnd = 1;}        if (!options.keyValue) {options.keyValue = 2;}        // if (!options.barThickness) {options.barThickness = 30};
            // if (!options.maxBarThickness) {options.maxBarThickness = 60};
            if (!options.minBarLength) {options.minBarLength = 40;}        if (!options.showText) {options.showText = true;}        if (!options.textPadding) {options.textPadding = 4;}
            if (info.cacheable) {
    			me._cachedDataOpts = Object.freeze(values);
    		}

            var indexOpts = me._getIndexScale().options;
    		var valueOpts = me._getValueScale().options;

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
            backgroundColor: "gold",
            borderColor: "orange",
            borderWidth: 2,
            hoverBackgroundColor: "orange",
            hoverBorderColor: "red",
            hoverBorderWidth: 1,
            showText: true,
            textPadding: 4,
            minBarLength: 5,
            keyStart: 0,
            keyEnd: 1,
            keyValue: 2
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
                barThickness : 20,
                categoryPercentage: 0.9,
                barPercentage: 0.7,
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
                    var elemOpts = this._chart.options.elements;
                    var d = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
                    return [d[elemOpts.keyValue], moment(d[elemOpts.keyStart]).format('L LTS'), moment(d[elemOpts.keyEnd]).format('L LTS')];
                }
            }
        }
    };

})));
