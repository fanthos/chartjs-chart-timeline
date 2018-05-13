import Chart from 'chart.js'
import moment from 'moment'

const helpers = Chart.helpers;
const isArray = helpers.isArray;

let TimelineConfig = {
    position: 'bottom',

    tooltips: {
        mode: 'nearest',
    },
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
        autoSkip: false
    }
};


/**
 * Convert the given value to a moment object using the given time options.
 * @see http://momentjs.com/docs/#/parsing/
 */
function momentify(value, options) {
	let parser = options.parser;
	let format = options.parser || options.format;

	if (typeof parser === 'function') {
		return parser(value);
	}

	if (typeof value === 'string' && typeof format === 'string') {
		return moment(value, format);
	}

	if (!(value instanceof moment)) {
		value = moment(value);
	}

	if (value.isValid()) {
		return value;
	}

	// Labels are in an incompatible moment format and no `parser` has been provided.
	// The user might still use the deprecated `format` option to convert his inputs.
	if (typeof format === 'function') {
		return format(value);
	}

	return value;
}

function parse(input, scale) {
	if (helpers.isNullOrUndef(input)) {
		return null;
	}

	let options = scale.options.time;
	let value = momentify(scale.getRightValue(input), options);
	if (!value.isValid()) {
		return null;
	}

	if (options.round) {
		value.startOf(options.round);
	}

	return value.valueOf();
}

function arrayUnique(items) {
	let hash = {};
	let out = [];
	let i, ilen, item;

	for (i = 0, ilen = items.length; i < ilen; ++i) {
		item = items[i];
		if (!hash[item]) {
			hash[item] = true;
			out.push(item);
		}
	}

	return out;
}

let MIN_INTEGER = Number.MIN_SAFE_INTEGER || -9007199254740991;
let MAX_INTEGER = Number.MAX_SAFE_INTEGER || 9007199254740991;

let TimelineScale = Chart.scaleService.getScaleConstructor('time').extend({

    determineDataLimits: function() {
        let me = this;
        let chart = me.chart;
        let timeOpts = me.options.time;
        let min = MAX_INTEGER;
        let max = MIN_INTEGER;
        let timestamps = [];
        let timestampobj = {};
        let datasets = [];
        let i, j, ilen, jlen, data, timestamp0, timestamp1;


        // Convert data to timestamps
        for (i = 0, ilen = (chart.data.datasets || []).length; i < ilen; ++i) {
            if (chart.isDatasetVisible(i)) {
                data = chart.data.datasets[i].data;
                datasets[i] = [];

                for (j = 0, jlen = data.length; j < jlen; ++j) {
                    timestamp0 = parse(data[j][0], me);
                    timestamp1 = parse(data[j][1], me);
                    if (timestamp0 > timestamp1) {
                        [timestamp0, timestamp1] = [timestamp1, timestamp0];
                    }
                    if (min > timestamp0 && timestamp0) {
                        min = timestamp0;
                    }
                    if (max < timestamp1 && timestamp1) {
                        max = timestamp1;
                    }
                    datasets[i][j] = [timestamp0, timestamp1, data[j][2]];
                    if (timestampobj.hasOwnProperty(timestamp0)) {
                        timestampobj[timestamp0] = true;
                        timestamps.push(timestamp0);
                    }
                    if (timestampobj.hasOwnProperty(timestamp1)) {
                        timestampobj[timestamp1] = true;
                        timestamps.push(timestamp1);
                    }
                }
            } else {
                datasets[i] = [];
            }
        }

        if (timestamps.size) {
            timestamps.sort((a, b) => a - b);
        }

        min = parse(timeOpts.min, me) || min;
        max = parse(timeOpts.max, me) || max;

        // In case there is no valid min/max, let's use today limits
        min = min === MAX_INTEGER ? +moment().startOf('day') : min;
        max = max === MIN_INTEGER ? +moment().endOf('day') + 1 : max;

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
    },
});

Chart.scaleService.registerScaleType('timeline', TimelineScale, TimelineConfig);

Chart.controllers.timeline = Chart.controllers.bar.extend({

    getBarBounds : function (bar) {
        let vm =   bar._view;
        let x1, x2, y1, y2;

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
        let me = this;
        let meta = me.getMeta();
        helpers.each(meta.data, function(rectangle, index) {
            me.updateElement(rectangle, index, reset);
        }, me);
    },

    updateElement: function(rectangle, index, reset) {
        let me = this;
        let meta = me.getMeta();
        let xScale = me.getScaleForId(meta.xAxisID);
        let yScale = me.getScaleForId(meta.yAxisID);
        let dataset = me.getDataset();
        let data = dataset.data[index];
        let custom = rectangle.custom || {};
        let datasetIndex = me.index;
        let rectangleElementOptions = me.chart.options.elements.rectangle;
        let textPad = me.chart.options.textPadding;
        let minBarWidth = me.chart.options.minBarWidth;

        rectangle._xScale = xScale;
        rectangle._yScale = yScale;
        rectangle._datasetIndex = me.index;
        rectangle._index = index;

        let text = data[2];

        let ruler = me.getRuler(index);

        let x = xScale.getPixelForValue(data[0]);
        let end = xScale.getPixelForValue(data[1]);

        let y = yScale.getPixelForValue(data, datasetIndex, datasetIndex);
        let width = end - x;
        let height = me.calculateBarHeight(ruler);
        let color = me.chart.options.colorFunction(text, data, dataset, index);
        let showText = me.chart.options.showText;

        let font = me.chart.options.elements.font;

        if (!font) {
            font = '12px bold Arial';
        }

        // This one has in account the size of the tick and the height of the bar, so we just
        // divide both of them by two and subtract the height part and add the tick part
        // to the real position of the element y. The purpose here is to place the bar
        // in the middle of the tick.
        let boxY = y - (height / 2);

        rectangle._model = {
            x: reset ?  x - width : x,   // Top left of rectangle
            y: boxY , // Top left of rectangle
            width: Math.max(width, minBarWidth),
            height: height,
            base: x + width,
            backgroundColor: color.rgbaString(),
            borderSkipped: custom.borderSkipped ? custom.borderSkipped : rectangleElementOptions.borderSkipped,
            borderColor: custom.borderColor ? custom.borderColor : helpers.getValueAtIndexOrDefault(dataset.borderColor, index, rectangleElementOptions.borderColor),
            borderWidth: custom.borderWidth ? custom.borderWidth : helpers.getValueAtIndexOrDefault(dataset.borderWidth, index, rectangleElementOptions.borderWidth),
            // Tooltip
            label: me.chart.data.labels[index],
            datasetLabel: dataset.label,
            text: text,
            textColor: color.luminosity() > 0.5 ? '#000000' : '#ffffff',
        };

        rectangle.draw = function() {
            let ctx = this._chart.ctx;
            let vm = this._view;
            let oldAlpha = ctx.globalAlpha;
            let oldOperation = ctx.globalCompositeOperation;

            // Draw new rectangle with Alpha-Mix.
            ctx.fillStyle = vm.backgroundColor;
            ctx.lineWidth = vm.borderWidth;
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillRect(vm.x, vm.y, vm.width, vm.height);

            ctx.globalAlpha = 0.5;
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillRect(vm.x, vm.y, vm.width, vm.height);

            ctx.globalAlpha = oldAlpha;
            ctx.globalCompositeOperation = oldOperation;
            if (showText) {
                ctx.beginPath();
                let textRect = ctx.measureText(vm.text);
                if (textRect.width > 0 && textRect.width + textPad + 2 < vm.width) {
                    ctx.font = font;
                    ctx.fillStyle = vm.textColor;
                    ctx.lineWidth = 0;
                    ctx.strokeStyle = vm.textColor;
                    ctx.textBaseline = 'middle';
                    ctx.fillText(vm.text, vm.x + textPad, vm.y + (vm.height) / 2);
                }
                ctx.fill();
            }
        };

        rectangle.inXRange = function (mouseX) {
            let bounds = me.getBarBounds(this);
            return mouseX >= bounds.left && mouseX <= bounds.right;
        };
        rectangle.tooltipPosition = function () {
            let vm = this.getCenterPoint();
            return {
                x: vm.x ,
                y: vm.y
            };
        };

        rectangle.getCenterPoint = function () {
            let vm = this._view;
            let x, y;
            x = vm.x + (vm.width / 2);
            y = vm.y + (vm.height / 2);

            return {
                x : x,
                y : y
            };
        };

        rectangle.inRange = function (mouseX, mouseY) {
            let inRange = false;

            if(this._view)
            {
                let bounds = me.getBarBounds(this);
                inRange = mouseX >= bounds.left && mouseX <= bounds.right &&
                    mouseY >= bounds.top && mouseY <= bounds.bottom;
            }
            return inRange;
        };

        rectangle.pivot();
    },

    getBarCount: function() {
        let me = this;
        let barCount = 0;
        helpers.each(me.chart.data.datasets, function(dataset, datasetIndex) {
            let meta = me.chart.getDatasetMeta(datasetIndex);
            if (meta.bar && me.chart.isDatasetVisible(datasetIndex)) {
                ++barCount;
            }
        }, me);
        return barCount;
    },


    // draw
    draw: function (ease) {
        let easingDecimal = ease || 1;
        let i, len;
        let metaData = this.getMeta().data;
        for (i = 0, len = metaData.length; i < len; i++)
        {
            metaData[i].transition(easingDecimal).draw();
        }
    },

    // From controller.bar
    calculateBarHeight: function(ruler) {
        let me = this;
        let yScale = me.getScaleForId(me.getMeta().yAxisID);
        if (yScale.options.barThickness) {
            return yScale.options.barThickness;
        }
        return yScale.options.stacked ? ruler.categoryHeight : ruler.barHeight;
    },

    removeHoverStyle: function(e) {
        // TODO
    },

    setHoverStyle: function(e) {
        // TODO: Implement this
    }

});


Chart.defaults.timeline = {

    colorFunction: function() {
        return Color('black');
    },
    showText: true,
    textPadding: 4,
    minBarWidth: 1,

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
        }],
        yAxes: [{
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
        }]
    },
    tooltips: {
        callbacks: {
            title: function(tooltipItems, data) {
                let d = data.labels[tooltipItems[0].datasetIndex]
                return d;
            },
            label: function(tooltipItem, data) {
                let d = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
                return [d[2], moment(d[0]).format('L LTS'), moment(d[1]).format('L LTS')];
            }
        }
    }
};
