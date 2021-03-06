/*
 * Copyright 2015 - 2016 Anton Tananaev (anton.tananaev@gmail.com)
 * Copyright 2016 Andrey Kunitsyn (abyss@fox5.ru)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

Ext.define('Traccar.view.ReportController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.report',

    config: {
        listen: {
            controller: {
                '*': {
                    selectDevice: 'selectDevice',
                    selectReport: 'selectReport'
                }
            }
        }
    },

    onReportClick: function (button) {
        var reportType, deviceId, fromDate, fromTime, from, toDate, toTime, to, store, url;

        reportType = this.lookupReference('reportTypeField').getValue();

        deviceId = this.lookupReference('deviceField').getValue();

        fromDate = this.lookupReference('fromDateField').getValue();
        fromTime = this.lookupReference('fromTimeField').getValue();

        if (reportType && deviceId) {
            from = new Date(
                fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate(),
                fromTime.getHours(), fromTime.getMinutes(), fromTime.getSeconds(), fromTime.getMilliseconds());

            toDate = this.lookupReference('toDateField').getValue();
            toTime = this.lookupReference('toTimeField').getValue();

            to = new Date(
                toDate.getFullYear(), toDate.getMonth(), toDate.getDate(),
                toTime.getHours(), toTime.getMinutes(), toTime.getSeconds(), toTime.getMilliseconds());

            if (button.reference === "showButton") {
                store = this.getView().getStore();
                store.load({
                    params: {
                        deviceId: deviceId,
                        type: '%',
                        from: from.toISOString(),
                        to: to.toISOString()
                    }
                });
            } else if (button.reference === "csvButton") {
                url = this.getView().getStore().getProxy().url;
                this.downloadCsv(url, {
                    deviceId: deviceId,
                    type: '%',
                    from: from.toISOString(),
                    to: to.toISOString()
                });
            }
        }
    },

    onClearClick: function () {
        this.getView().getStore().removeAll();
    },

    onSelectionChange: function (selected) {
        if (selected.getCount() > 0) {
            this.fireEvent('selectReport', selected.getLastSelected(), true);
        }
    },

    selectDevice: function (device) {
        if (device) {
            this.getView().getSelectionModel().deselectAll();
        }
    },

    selectReport: function (position, center) {
        if (position instanceof Traccar.model.Position) {
            this.getView().getSelectionModel().select([position], false, true);
        }
    },

    downloadCsv: function (requestUrl, requestParams) {
        Ext.Ajax.request({
            url: requestUrl,
            method: 'GET',
            params: requestParams,
            headers: {
                Accept: 'text/csv'
            },
            success: function (response) {
                var disposition, filename, type, blob, url, downloadUrl, elementA;
                disposition = response.getResponseHeader('Content-Disposition');
                filename = disposition.slice(disposition.indexOf("=") + 1, disposition.length);
                type = response.getResponseHeader('Content-Type');
                blob = new Blob([response.responseText], { type: type });
                if (typeof window.navigator.msSaveBlob !== 'undefined') {
                    // IE workaround
                    window.navigator.msSaveBlob(blob, filename);
                } else {
                    url = window.URL || window.webkitURL;
                    downloadUrl = url.createObjectURL(blob);
                    if (filename) {
                        elementA = document.createElement("a");
                        elementA.href = downloadUrl;
                        elementA.download = filename;
                        document.body.appendChild(elementA);
                        elementA.click();
                    }
                    setTimeout(function () {
                        url.revokeObjectURL(downloadUrl);
                    }, 100);
                }
            }
        });
    },

    onTypeChange: function (combobox, newValue, oldValue) {
        var routeColumns, eventsColumns, summaryColumns, tripsColumns;
        if (oldValue !== null) {
            this.onClearClick();
        }
        routeColumns = [{
            text: Strings.positionValid,
            dataIndex: 'valid',
            flex: 1,
            renderer: Traccar.AttributeFormatter.getFormatter('valid')
        }, {
            text: Strings.positionFixTime,
            dataIndex: 'fixTime',
            flex: 1,
            xtype: 'datecolumn',
            renderer: Traccar.AttributeFormatter.getFormatter('fixTime')
        }, {
            text: Strings.positionLatitude,
            dataIndex: 'latitude',
            flex: 1,
            renderer: Traccar.AttributeFormatter.getFormatter('latitude')
        }, {
            text: Strings.positionLongitude,
            dataIndex: 'longitude',
            flex: 1,
            renderer: Traccar.AttributeFormatter.getFormatter('latitude')
        }, {
            text: Strings.positionAltitude,
            dataIndex: 'altitude',
            flex: 1,
            renderer: Traccar.AttributeFormatter.getFormatter('altitude')
        }, {
            text: Strings.positionSpeed,
            dataIndex: 'speed',
            flex: 1,
            renderer: Traccar.AttributeFormatter.getFormatter('speed')
        }, {
            text: Strings.positionAddress,
            dataIndex: 'address',
            flex: 1,
            renderer: Traccar.AttributeFormatter.getFormatter('address')
        }];

        eventsColumns = [{
            text: Strings.positionFixTime,
            dataIndex: 'serverTime',
            flex: 1,
            xtype: 'datecolumn',
            renderer: Traccar.AttributeFormatter.getFormatter('serverTime')
        }, {
            text: Strings.reportDeviceName,
            dataIndex: 'deviceId',
            flex: 1,
            renderer: function (value) {
                return Ext.getStore('Devices').findRecord('id', value).get('name');
            }
        }, {
            text: Strings.sharedType,
            dataIndex: 'type',
            flex: 1,
            renderer: function (value) {
                var typeKey = 'event' + value.charAt(0).toUpperCase() + value.slice(1);
                return Strings[typeKey];
            }
        }, {
            text: Strings.sharedGeofence,
            dataIndex: 'geofenceId',
            flex: 1,
            renderer: function (value) {
                if (value !== 0) {
                    return Ext.getStore('Geofences').findRecord('id', value).get('name');
                }
            }
        }];

        summaryColumns = [{
            text: Strings.reportDeviceName,
            dataIndex: 'deviceId',
            flex: 1,
            renderer: function (value) {
                return Ext.getStore('Devices').findRecord('id', value).get('name');
            }
        }, {
            text: Strings.sharedDistance,
            dataIndex: 'distance',
            flex: 1,
            renderer: Traccar.AttributeFormatter.getFormatter('distance')
        }, {
            text: Strings.reportAverageSpeed,
            dataIndex: 'averageSpeed',
            flex: 1,
            renderer: Traccar.AttributeFormatter.getFormatter('speed')
        }, {
            text: Strings.reportMaximumSpeed,
            dataIndex: 'maxSpeed',
            flex: 1,
            renderer: Traccar.AttributeFormatter.getFormatter('speed')
        }, {
            text: Strings.reportEngineHours,
            dataIndex: 'engineHours',
            flex: 1,
            renderer: Traccar.AttributeFormatter.getFormatter('hours')
        }];

        tripsColumns = [{
            text: Strings.reportDeviceName,
            dataIndex: 'deviceId',
            flex: 1,
            renderer: function (value) {
                return Ext.getStore('Devices').findRecord('id', value).get('name');
            }
        }, {
            text: Strings.reportStartTime,
            dataIndex: 'startTime',
            flex: 1,
            xtype: 'datecolumn',
            renderer: Traccar.AttributeFormatter.getFormatter('startTime')
        }, {
            text: Strings.reportStartAddress,
            dataIndex: 'startAddress',
            flex: 1,
            renderer: Traccar.AttributeFormatter.getFormatter('address')
        }, {
            text: Strings.reportEndTime,
            dataIndex: 'endTime',
            flex: 1,
            xtype: 'datecolumn',
            renderer: Traccar.AttributeFormatter.getFormatter('endTime')
        }, {
            text: Strings.reportEndAddress,
            dataIndex: 'endAddress',
            flex: 1,
            renderer: Traccar.AttributeFormatter.getFormatter('address')
        }, {
            text: Strings.sharedDistance,
            dataIndex: 'distance',
            flex: 1,
            renderer: Traccar.AttributeFormatter.getFormatter('distance')
        }, {
            text: Strings.reportAverageSpeed,
            dataIndex: 'averageSpeed',
            flex: 1,
            renderer: Traccar.AttributeFormatter.getFormatter('speed')
        }, {
            text: Strings.reportMaximumSpeed,
            dataIndex: 'maxSpeed',
            flex: 1,
            renderer: Traccar.AttributeFormatter.getFormatter('speed')
        }, {
            text: Strings.reportDuration,
            dataIndex: 'duration',
            flex: 1,
            renderer: Traccar.AttributeFormatter.getFormatter('duration')
        }, {
            text: Strings.reportSpentFuel,
            dataIndex: 'spentFuel',
            flex: 1,
            renderer: Traccar.AttributeFormatter.getFormatter('spentFuel')
        }];

        if (newValue === 'route') {
            this.getView().reconfigure('ReportRoute', routeColumns);
        } else if (newValue === 'events') {
            this.getView().reconfigure('ReportEvents', eventsColumns);
        } else if (newValue === 'summary') {
            this.getView().reconfigure('ReportSummary', summaryColumns);
        } else if (newValue === 'trips') {
            this.getView().reconfigure('ReportTrips', tripsColumns);
        }
    }

});
