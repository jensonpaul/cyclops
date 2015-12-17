'use strict';

const Backbone = require('backbone');

const ProcessData = require('./ProcessData');
const ProcessDataCollection = Backbone.Collection.extend({
    model: ProcessData,
    comparator: 'name'
});
const DiskData = require('./DiskData');
const DiskDataCollection = Backbone.Collection.extend({
    model: DiskData,
    comparator: 'name'
});

module.exports = Backbone.Model.extend({
    defaults: {
        hostname: null,
        lastPing: null,
        logs: [],
        processMap: {},
        processDataCollection: new ProcessDataCollection(),
        diskMap: {},
        diskDataCollection: new DiskDataCollection(),
        platform: {},
        cpuMetrics: []
    },

    handleMessage: function(type, content) {
        this.set('lastPing', new Date().toISOString());
        switch (type) {
            case 'status': this.handleStatusMessage(content); break;
            case 'log': this.handleLogMessage(content); break;
            case 'metrics': this.handleMetricsMessage(content); break;
        }
    },

    handleStatusMessage: function(content) {
        content.forEach(status => {
            const processData = this._findOrCreateProcessData(status.name);
            processData.handleStatus(status);
        });
    },

    handleLogMessage: function(content) {
        this.set('logs', this.get('logs').concat(content));
    },

    handleMetricsMessage: function(content) {
        const platform = content.platform;
        const systemCpuMetrics = content.systemCpuMetrics;
        const processCpuMetrics = content.processCpuMetrics;
        const diskMetrics = content.diskMetrics;

        this.set('platform', platform);
        this.get('cpuMetrics').push(systemCpuMetrics);

        Object.keys(processCpuMetrics).forEach(name => {
            const processData = this._findOrCreateProcessData(name);
            processData.handleCpuMetrics(processCpuMetrics[name]);
        });

        Object.keys(diskMetrics).forEach(name => {
            const diskData = this._findOrCreateDiskData(name);
            diskData.handleDiskMetrics(diskMetrics[name]);
        });
    },

    _findOrCreateProcessData: function(name) {
        const processMap = this.get('processMap');
        let processData = processMap[name];
        if (!processData) {
            processData = new ProcessData({ name });
            processMap[name] = processData;
            this.get('processDataCollection').add(processData);
        }

        return processData;
    },

    _findOrCreateDiskData: function(name) {
        const diskMap = this.get('diskMap');
        let diskData = diskMap[name];
        if (!diskData) {
            diskData = new DiskData({ name });
            diskMap[name] = diskData;
            this.get('diskDataCollection').add(diskData);
        }

        return diskData;
    }
});
