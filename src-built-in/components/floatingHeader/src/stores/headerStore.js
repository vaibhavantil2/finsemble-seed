/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/
import { EventEmitter } from "events";
let values = {
	companionBounds: {},
	state: "small",
	headerConfigs: {},
	companionWindow: null
};
var HeaderStore = Object.assign({}, EventEmitter.prototype, {

	/**
	 * Sets initial values for the store.
	 * @todo convert to the DistributedStoreClient.
	 */
	initialize: function () {

	},
	getCompanionWindow() {
		return values.companionWindow;
	},
	setCompanionWindow(window) {
		values.companionWindow = window;
	},
	getState() {
		return values.state;
	},
	toggleState() {
		values.state = values.state === "small" ? "large" : "small";
	},
	setCompanionBounds(bounds) {
		values.companionBounds = bounds
	},
	getCompanionBounds() {
		return values.companionBounds;
	}
});

var visible = true;
var timeout = null;

var Actions = {
	initialize(cb) {
		var spData = FSBL.Clients.WindowClient.getSpawnData();
		var self = this;
		FSBL.FinsembleWindow.wrap(spData.parent, function (err, wrappedWindow) {
			HeaderStore.setCompanionWindow(wrappedWindow);
			wrappedWindow.addListener("bounds-set", Actions.onBoundsChanged);
			wrappedWindow.addListener("closed", Actions.onCompanionClosed);
			wrappedWindow.addListener("hidden", Actions.onCompanionHidden);
			wrappedWindow.addListener("shown", Actions.onCompanionShown);
			wrappedWindow.addListener("maximized", Actions.onCompanionMaximized);
			wrappedWindow.addListener("restored", Actions.onCompanionRestored);
			wrappedWindow.addListener("bringToFront", Actions.onCompanionBringToFront);
			wrappedWindow.addListener("restored", Actions.onCompanionRestored);
			wrappedWindow.getBounds({}, function (err, bounds) {
				HeaderStore.setCompanionBounds(bounds);
				console.log("bounds", bounds)
				FSBL.Clients.WindowClient.finsembleWindow.setBounds({ left: bounds.left + (bounds.width / 2) - 86, width: 86, height: 10, top: bounds.top }, {}, function () {
					cb();
				})
			})
		});
	},

	showMe() {
		console.log("showMe");
		timeout = null;
		FSBL.Clients.WindowClient.finsembleWindow.show(null, function () {
			console.log("btf");
			FSBL.Clients.WindowClient.finsembleWindow.bringToFront();			
		});
	},

	onBoundsChanged(bounds) {
		HeaderStore.setCompanionBounds(bounds);
		if (HeaderStore.getState() === "small") {
			if (timeout) {
				clearTimeout(timeout);
			} else {
				FSBL.Clients.WindowClient.finsembleWindow.hide();
			}
			timeout = setTimeout(function () {
				Actions.showMe();
			}, 50);
			var mainWindow = fin.desktop.Window.getCurrent();
			FSBL.Clients.WindowClient.finsembleWindow.setBounds({ left: bounds.left + (bounds.width / 2) - 86, width: 86, height: 10, top: bounds.top }, {}, function (err) {
				Actions.updateWindowPosition();
			})
		} else {
			FSBL.Clients.WindowClient.finsembleWindow.setBounds({ left: bounds.left, width: bounds.width, height: 38, top: bounds.top }, {}, function () {

			})
		}
	},
	isMouseInHeader(cb) {
		setTimeout(function () {
			let finWindow = fin.desktop.Window.getCurrent();
			fin.desktop.System.getMousePosition(function (mousePosition) {
				finWindow.getBounds(function (bounds) {
					let inBounds = FSBL.Clients.WindowClient.isPointInBox({ x: mousePosition.left, y: mousePosition.top }, bounds)
					return cb(null, inBounds);
				})
			});
		}, 100)

	},
	updateWindowPosition() {
		setTimeout(function () {
			HeaderStore.getCompanionWindow().getBounds({}, function (err, bounds) {
				HeaderStore.setCompanionBounds(bounds);
				if (!bounds.width) bounds.width = bounds.right - bounds.left
				console.log("bounds update", bounds, bounds.left + (bounds.width / 2) - 86)

				FSBL.Clients.WindowClient.finsembleWindow.setBounds({ left: bounds.left + (bounds.width / 2) - 43, width: 86, height: 10, top: bounds.top }, {}, function () {
					/*setTimeout(function () {
						console.log("bring to front time")
						FSBL.Clients.WindowClient.finsembleWindow.bringToFront();
					}, 200)*/
				})
			})
		}, 100)
	},
	onCompanionClosed() {
		FSBL.Clients.WindowClient.finsembleWindow.close({});
	},
	onCompanionHidden() {
		FSBL.Clients.WindowClient.finsembleWindow.hide();
	},
	onCompanionShown() {
		FSBL.Clients.WindowClient.finsembleWindow.show();
	},
	onCompanionBringToFront() {
		console.log("bringtofornt")
		Actions.updateWindowPosition();
	},
	onCompanionMaximized() {
		console.log("onCompanionMaximized")
		Actions.updateWindowPosition();
	},
	onCompanionRestored() {
		Actions.updateWindowPosition();
	},
	expandWindow(cb) {
		let finWindow = fin.desktop.Window.getCurrent();
		let currentBound = HeaderStore.getCompanionBounds();
		FSBL.Clients.WindowClient.finsembleWindow.updateOptions({
			"cornerRounding": {
				"height": 0,
				"width": 0
			}
		});
		finWindow.animate({ position: { duration: 0, left: currentBound.left }, size: { duration: 0, width: currentBound.width, height: 1 } },
			function (err) { console.error(err) },
			function (err) {
				console.log("emit event");

				finWindow.animate({ size: { duration: 350, height: 38 } }, function () { }, function () {
					HeaderStore.emit("tabRegionShow")
				});
				HeaderStore.toggleState()
				cb()
				console.log("err", err)
			})
	},
	contractWindow(cb) {
		let finWindow = fin.desktop.Window.getCurrent();
		let currentBound = HeaderStore.getCompanionBounds();
		FSBL.Clients.WindowClient.finsembleWindow.updateOptions({
			"cornerRounding": {
				"height": 0,
				"width": 0
			}
		});
		finWindow.animate({ size: { duration: 350, height: 10 } },
			function (err) { console.error(err) },
			function () {
				finWindow.animate({ position: { duration: 0, left: currentBound.left + (currentBound.width / 2) - 43, top: currentBound.top }, size: { duration: 0, width: 86 } }, function () { }, function () {
					HeaderStore.toggleState()
					cb()
				});

			});
	}
}
HeaderStore.initialize();

export { HeaderStore as Store };
export { Actions };
