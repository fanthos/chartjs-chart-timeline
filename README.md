# chartjs-chart-timeline

Timeline chart library for Chart.js.
```javascript
"type": "timeline",
"options": {
    // Depricated and will be removed in future. Please use elements.* instead.
    // "colorFunction": function(text, data, dataset, index) {
    //     return Color('black');
    // },
    // "showText": true,
    // "textPadding": 4
    "elements": {
        "colorFunction": function(text, data, dataset, index) {
            return Color('black');
        },
        "showText": true,
        "textPadding": 4
    }
},
"data": {
    "labels": [
        "Cool Graph",
        "heater1"
    ],
    "datasets": [
        {
            "data": [
                [
                    "2018-01-22T16:00:00.000Z",
                    "2018-01-23T05:40:44.626Z",
                    "Unknown"
                ]
            ]
        },
        {
            "data": [
                [
                    "2018-01-22T16:00:00.000Z",
                    "2018-01-23T04:57:43.736Z",
                    "On"
                ],
                [
                    "2018-01-23T04:57:43.736Z",
                    "2018-01-23T04:57:55.437Z",
                    "Off"
                ],
                [
                    "2018-01-23T04:57:55.437Z",
                    "2018-01-23T05:40:44.626Z",
                    "On"
                ]
            ]
        }
    ]
},
```

Example for dynamic resize by dataset count:
```javascript
resizeChart() {
    if (!this._chart) return;
    // Chart not ready
    if (this.$.chartTarget.clientWidth === 0) {
        if (this._resizeTimer === undefined) {
            this._resizeTimer = setInterval(this.resizeChart.bind(this), 10);
            return;
        }
    }

    clearInterval(this._resizeTimer);
    this._resizeTimer = undefined;

    this._resizeChart();
}

_resizeChart() {
    const chartTarget = this.$.chartTarget;

    const options = this.data;
    const data = options.data;

    if (data.datasets.length === 0) {
        return;
    }

    if (!this.isTimeline) {
        this._chart.resize();
        return;
    }

    // Recalculate chart height for Timeline chart
    var axis = this._chart.boxes.filter(x => x.position === 'bottom')[0];
    if (axis && axis.height > 0) {
        this._axisHeight = axis.height;
    }
    if (!this._axisHeight) {
        chartTarget.style.height = '100px';
        chartTarget.height = '100px';
        this._chart.resize();
        axis = this._chart.boxes.filter(x => x.position === 'bottom')[0];
        if (axis && axis.height > 0) {
            this._axisHeight = axis.height;
        }
    }
    if (this._axisHeight) {
        const cnt = data.datasets.length;
        const targetHeight = ((30 * cnt) + this._axisHeight) + 'px';
        if (chartTarget.style.height !== targetHeight) {
            chartTarget.style.height = targetHeight;
            chartTarget.height = targetHeight;
        }
        this._chart.resize();
    }
}
```

Usage: https://github.com/fanthos/chartjs-chart-timeline/wiki
