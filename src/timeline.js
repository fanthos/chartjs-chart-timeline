import Chart from 'chart.js';
// import moment from 'moment';

function object_assign(target, varArgs) { // .length of function is 2
    'use strict';
    if (target === null || target === undefined) {
        throw new TypeError('Cannot convert undefined or null to object');
    }

    var to = Object(target);

    for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];

        if (nextSource !== null && nextSource !== undefined) {
            for (var nextKey in nextSource) {
                // Avoid bugs when hasOwnProperty is shadowed
                if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                    to[nextKey] = nextSource[nextKey];
                }
            }
        }
    }
    return to;
}

const helpers = Chart.helpers;
const isArray = helpers.isArray;
const registry = Chart.registry;
const adapter = Chart._adapters._date;

var _color = Chart.helpers.color;

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

var MIN_INTEGER = Number.MIN_SAFE_INTEGER || -9007199254740991;
var MAX_INTEGER = Number.MAX_SAFE_INTEGER || 9007199254740991;

function color_luminosity(c) {
    var v = c._rgb
    return (v.r * 0.3 + v.g * 0.59 + v.b * 0.11) / 256
}

function BarWithTextElement() {
    Chart.BarElement.apply(this, arguments);
}

BarWithTextElement.prototype = object_assign(Object.create(Chart.BarElement.prototype), {
    
//     rectangle._model = {
//         x: reset ?  x - width : x,   // Top left of rectangle
//         y: boxY , // Top left of rectangle
//         width: Math.max(width, minBarWidth),
//         height: height,
//         base: x + width,
//         backgroundColor: color.hexString(),
//         borderSkipped: custom.borderSkipped ? custom.borderSkipped : rectangleElementOptions.borderSkipped,
//         borderColor: custom.borderColor ? custom.borderColor : helpers.resolve(dataset.borderColor || [], undefined, index) || rectangleElementOptions.borderColor,
//         borderWidth: custom.borderWidth ? custom.borderWidth : helpers.resolve(dataset.borderWidth || [], undefined, index) || rectangleElementOptions.borderWidth,
//         // Tooltip
//         label: me.chart.data.labels[index],
//         datasetLabel: dataset.label,
//         text: text,
//         textColor: color_luminosity(color) > 0.5 ? '#000000' : '#ffffff',
//     };

//     rectangle.draw = function() {
//         var ctx = this._chart.ctx;
//         var vm = this._view;
//         var oldAlpha = ctx.globalAlpha;
//         var oldOperation = ctx.globalCompositeOperation;

//         // Draw new rectangle with Alpha-Mix.
//         ctx.fillStyle = vm.backgroundColor;
//         ctx.lineWidth = vm.borderWidth;
//         ctx.globalCompositeOperation = 'destination-over';
//         ctx.fillRect(vm.x, vm.y, vm.width, vm.height);

//         ctx.globalAlpha = 0.5;
//         ctx.globalCompositeOperation = 'source-over';
//         ctx.fillRect(vm.x, vm.y, vm.width, vm.height);

//         ctx.globalAlpha = oldAlpha;
//         ctx.globalCompositeOperation = oldOperation;
//         if (showText) {
//             ctx.beginPath();
//             var textRect = ctx.measureText(vm.text);
//             if (textRect.width > 0 && textRect.width + textPad + 2 < vm.width) {
//                 ctx.font = font;
//                 ctx.fillStyle = vm.textColor;
//                 ctx.lineWidth = 0;
//                 ctx.strokeStyle = vm.textColor;
//                 ctx.textBaseline = 'middle';
//                 ctx.fillText(vm.text, vm.x + textPad, vm.y + (vm.height) / 2);
//             }
//             ctx.fill();
//         }
//     };

//     rectangle.inXRange = function (mouseX) {
//         var bounds = me.getBarBounds(this);
//         return mouseX >= bounds.left && mouseX <= bounds.right;
//     };
//     rectangle.tooltipPosition = function () {
//         var vm = this.getCenterPoint();
//         return {
//             x: vm.x ,
//             y: vm.y
//         };
//     };

//     rectangle.getCenterPoint = function () {
//         var vm = this._view;
//         var x, y;
//         x = vm.x + (vm.width / 2);
//         y = vm.y + (vm.height / 2);

//         return {
//             x : x,
//             y : y
//         };
//     };

//     rectangle.inRange = function (mouseX, mouseY) {
//         var inRange = false;

//         if(this._view)
//         {
//             var bounds = me.getBarBounds(this);
//             inRange = mouseX >= bounds.left && mouseX <= bounds.right &&
//                 mouseY >= bounds.top && mouseY <= bounds.bottom;
//         }
//         return inRange;
//     };

//     rectangle.pivot();
// }
});

function TimelineScale() {
    Chart.TimeScale.apply(this, arguments);
}

TimelineScale.prototype = object_assign(Object.create(Chart.TimeScale.prototype), {
    determineDataLimits() {
        var me = this;
        var chart = me.chart;
        var timeOpts = me.options.time;
        var elemOpts = me.chart.options.elements;
        var min = MAX_INTEGER;
        var max = MIN_INTEGER;
        var timestamps = [];
        var timestampobj = {};
        var datasets = [];
        var i, j, ilen, jlen, data, timestamp0, timestamp1;
        const adapter = this._adapter;


        // Convert data to timestamps
        for (i = 0, ilen = (chart.data.datasets || []).length; i < ilen; ++i) {
            if (chart.isDatasetVisible(i)) {
                data = chart.data.datasets[i].data;
                datasets[i] = [];

                for (j = 0, jlen = data.length; j < jlen; ++j) {
                    timestamp0 = adapter.parse(data[j][elemOpts.keyStart], me);
                    timestamp1 = adapter.parse(data[j][elemOpts.keyEnd], me);
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
                    if (!Object.prototype.hasOwnProperty.call(timestampobj, timestamp0)) {
                        timestampobj[timestamp0] = true;
                        timestamps.push(timestamp0);
                    }
                    if (!Object.prototype.hasOwnProperty.call(timestampobj, timestamp1)) {
                        timestampobj[timestamp1] = true;
                        timestamps.push(timestamp1);
                    }
                }
            } else {
                datasets[i] = [];
            }
        }

        if (timestamps.length) {
            timestamps.sort(function (a, b){
                return a - b;
            });
        }

        // min = timeOpts.min && adapter.parse(timeOpts.min, me) || min;
        // max = timeOpts.max && adapter.parse(timeOpts.max, me) || max;

        // In case there is no valid min/max, var's use today limits
        min = isFinite(min) && !isNaN(min) ? min : +adapter.startOf(Date.now(), unit);
        max = isFinite(max) && !isNaN(max) ? max : +adapter.endOf(Date.now(), unit) + 1;

        // Make sure that max is strictly higher than min (required by the lookup table)
        me.min = Math.min(min, max);
        me.max = Math.max(min + 1, max);

        // PRIVATE
        me._horizontal = me.isHorizontal();
        me._table = [];
        me._timestamps = {
            data: timestamps,
            datasets: datasets,
            labels: []
        };
    }
});

TimelineScale.id = 'timeline';
TimelineScale.defaults = {
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

Chart.register(TimelineScale);

// Chart.scaleService.registerScaleType('timeline', TimelineScale, TimelineConfig);

function TimelineController() {
    Chart.BarController.apply(this, arguments);
}

TimelineController.prototype = object_assign(Object.create(Chart.BarController.prototype), {
    getBarBounds(bar) {
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

    // update(reset) {
    //     var me = this;
    //     var meta = me.getMeta();
    //     var chartOpts = me.chart.options;
    //     if (chartOpts.textPadding || chartOpts.minBarWidth ||
    //             chartOpts.showText || chartOpts.colorFunction) {
    //         var elemOpts = me.chart.options.elements;
    //         elemOpts.textPadding = chartOpts.textPadding || elemOpts.textPadding;
    //         elemOpts.minBarWidth = chartOpts.minBarWidth || elemOpts.minBarWidth;
    //         elemOpts.colorFunction = chartOpts.colorFunction || elemOpts.colorFunction;
    //         elemOpts.minBarWidth = chartOpts.minBarWidth || elemOpts.minBarWidth;
    //         if (Chart._tl_depwarn !== true) {
    //             console.log('Timeline Chart: Configuration deprecated. Please check document on Github.');
    //             Chart._tl_depwarn = true;
    //         }
    //     }

    //     helpers.each(meta.data, function(rectangle, index) {
    //         me.updateElement(rectangle, index, reset);
    //     }, me);
    // },

    updateElements(rectangle, start, count, mode) {
        var me = this;
        // var sharedOptions = me.getSharedOptions(firstOpts);
        var vscale = me._cachedMeta.vScale;
        var iscale = me._cachedMeta.iScale;
        var meta = me.getMeta();
        var dataset = me.getDataset();
        var custom = rectangle.custom || {};
        var datasetIndex = me.index;
        var opts = me.chart.options;
        var elemOpts = opts.elements || TimelineController.defaults.elements;
        var rectangleElementOptions = elemOpts.rectangle || {};
        var textPad = elemOpts.textPadding;
        var minBarWidth = elemOpts.minBarWidth;
        var reset = mode === 'reset';
        var firstOpts = me.resolveDataElementOptions(start, mode);
        var sharedOptions = me.getSharedOptions(firstOpts);

        // rectangle._xScale = xScale;
        // rectangle._yScale = yScale;
        // rectangle._datasetIndex = me.index;
        // rectangle._index = index;

        // This one has in account the size of the tick and the height of the bar, so we just
        // divide both of them by two and subtract the height part and add the tick part
        // to the real position of the element y. The purpose here is to place the bar
        // in the middle of the tick.
        var boxY = y - (height / 2);

        for (var index = start; index < start + count; index++) {
            var options = sharedOptions || me.resolveDataElementOptions(i, mode);
            // var options = sharedOptions || me.resolveDataElementOptions(i, mode);
            var data = dataset.data[index];
            var text = data[elemOpts.keyValue];
    
            var ruler = me._getRuler(index);
    
            var x = vscale.getPixelForValue(data[elemOpts.keyStart]);
            var end = vscale.getPixelForValue(data[elemOpts.keyEnd]);
    
            var y = iscale.getPixelForValue(data, datasetIndex, datasetIndex);
            var width = end - x;
            var height = me.calculateBarHeight(ruler);
            var color = _color(elemOpts.colorFunction(text, data, dataset, index));
            var showText = elemOpts.showText;
    
            var font = elemOpts.font;
    
            if (!font) {
                font = '12px bold Arial';
            }
    
            // var vpixels = me._calculateBarValuePixels(i, options);
            // var ipixels = me._calculateBarIndexPixels(i, ruler, options);
            var properties = {
                x: reset ?  x - width : x,   // Top left of rectangle
                y: boxY , // Top left of rectangle
                width: Math.max(width, minBarWidth),
                height: height,
                base: x + width,
                backgroundColor: color.hexString(),
                borderSkipped: custom.borderSkipped ? custom.borderSkipped : rectangleElementOptions.borderSkipped,
                borderColor: custom.borderColor ? custom.borderColor : helpers.resolve(dataset.borderColor || [], undefined, index) || rectangleElementOptions.borderColor,
                borderWidth: custom.borderWidth ? custom.borderWidth : helpers.resolve(dataset.borderWidth || [], undefined, index) || rectangleElementOptions.borderWidth,
                // Tooltip
                label: me.chart.data.labels[index],
                datasetLabel: dataset.label,
                text: text,
                textColor: color_luminosity(color) > 0.5 ? '#000000' : '#ffffff',
            };
            properties.options = options;
            // if (includeOptions) {
            //   properties.options = options;
            // }
            me.updateElement(rectangle[index], index, properties, mode);
        }
    },

    getBarCount() {
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


    // // draw
    // draw(ease){
    //     var easingDecimal = ease || 1;
    //     var i, len;
    //     var metaData = this.getMeta().data;
    //     for (i = 0, len = metaData.length; i < len; i++)
    //     {
    //         metaData[i].transition(easingDecimal).draw();
    //     }
    // },

    // From controller.bar
    calculateBarHeight(ruler) {
        var me = this;
        var yScale = me.getScaleForId(me.getMeta().yAxisID);
        if (yScale.options.barThickness) {
            return yScale.options.barThickness;
        }
        return yScale.options.stacked ? ruler.categoryHeight : ruler.barHeight;
    },

    removeHoverStyle(e) {
        // TODO
    },

    setHoverStyle(e) {
        // TODO: Implement this
    },

    // parseObjectData(meta, data, start, count) {
    //     var iScale = meta.iScale,
    //         vScale = meta.vScale;
    //     var _this$_parsing = this._parsing,
    //         _this$_parsing$xAxisK = _this$_parsing.xAxisKey,
    //         xAxisKey = _this$_parsing$xAxisK === void 0 ? 'x' : _this$_parsing$xAxisK,
    //         _this$_parsing$yAxisK = _this$_parsing.yAxisKey,
    //         yAxisKey = _this$_parsing$yAxisK === void 0 ? 'y' : _this$_parsing$yAxisK;
    //     var iAxisKey = iScale.axis === 'x' ? xAxisKey : yAxisKey;
    //     var vAxisKey = vScale.axis === 'x' ? xAxisKey : yAxisKey;
    //     var parsed = [];
    //     var i, ilen, item, obj;
    //     for (i = start, ilen = start + count; i < ilen; ++i) {
    //       obj = data[i];
    //       item = {};
    //       item[iScale.axis] = iScale.parse(resolveObjectKey(obj, iAxisKey), i);
    //       parsed.push(parseValue(resolveObjectKey(obj, vAxisKey), item, vScale, i));
    //     }
    //     return parsed;
    //   }
});


var TimelineControllerDefaults = object_assign({}, Chart.BarController.defaults, {
    elements: {
        colorFunction: function() {
            return _color('black');
        },
        showText: true,
        textPadding: 4,
        minBarWidth: 1,
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
        x: {
            type: 'timeline',
            position: 'bottom',
            distribution: 'linear',
            categoryPercentage: 0.8,
            barPercentage: 0.9,

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
        },
        y: {
            type: 'category',
            position: 'left',
            barThickness : 20,
            categoryPercentage: 0.8,
            barPercentage: 0.9,
            offset: true,
            gridLines: {
                display: true,
                offsetGridLines: true,
                drawBorder: true,
                drawTicks: true
            }
        }
    },
    tooltips: {
        callbacks: {
            title: function(tooltipItems, data) {
                var elemOpts = this._chart.options.elements;
                var d = data.labels[tooltipItems[0].datasetIndex]
                return d;
            },
            label: function(tooltipItem, data) {
                var elemOpts = this._chart.options.elements;
                var d = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
                return [d[elemOpts.keyValue], moment(d[elemOpts.keyStart]).format('L LTS'), moment(d[elemOpts.keyEnd]).format('L LTS')];
            }
        }
    }
});


TimelineController.id = 'timeline';
TimelineController.defaults = TimelineControllerDefaults;

Chart.register(TimelineController);
