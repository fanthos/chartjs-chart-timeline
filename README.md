# chartjs-chart-timeline

Timeline chart library for Chart.js.
```javascript
"type": "timeline",
"options": {
    "colorFunction": function(text, data, dataset, index) {
        return Color('black');
    },
    "showText": true,
    "textPadding": 4,
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

Usage: https://github.com/fanthos/chartjs-chart-timeline/wiki
