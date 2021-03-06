window.MAP = (function () {
    "use strict";
    // private variables and functions

    // constructor
    var module = function () {
        // create a map in the "map" div, set the view to a given place and zoom
        this.MAP = L.map('map');

        if (!this._restoreMapContext()) {
            this.MAP.setView([0, 0], 3);
        }

        var osm = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        });

        this.MAP.addLayer(osm);

        this.redIcon = L.icon({
            iconUrl: '/static/img/healthsite-marker-red.png',
            iconRetinaUrl: '/static/img/healthsite-marker-red-2x.png',
            iconSize: [26, 46],
            iconAnchor: [13, 46]
        });

        this.MAP.attributionControl.setPrefix(''); // Don't show the 'Powered by Leaflet' text.

        // add markers layer
        this._setupClusterLayer();

        // add point layer
        this._setupPointLayer();

        // add newLocalityLayer
        this._setupNewLocalityLayer();

        //bind external events
        this._bindExternalEvents();
        this._bindInternalEvents();

        //store initial map context
        this._updateMapContext();

        // hide zoom control on mobile and tablet7
        $('.leaflet-control-zoom').addClass('hidden-xs');
        $('.leaflet-control-zoom').addClass('hidden-sm');

    }

    // prototype
    module.prototype = {
        constructor: module,

        _restoreMapContext: function () {
            if (sessionStorage.key('map_zoom') && sessionStorage.key('map_center')) {
                var zoom = parseInt(sessionStorage.getItem('map_zoom'), 10);
                var center = sessionStorage.getItem('map_center').split('|');

                var latLngCenter = new L.latLng(parseFloat(center[0]), parseFloat(center[1]));

                if (zoom && center) {
                    this.MAP.setView(latLngCenter, zoom);
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        },

        _updateMapContext: function () {
            var center = this.MAP.getCenter();
            var zoom = this.MAP.getZoom();

            sessionStorage.setItem('map_center', center.lat+'|'+center.lng);
            sessionStorage.setItem('map_zoom', zoom);
        },

        _bindInternalEvents: function() {
            var self = this;
            this.MAP.on('moveend', function (evt) {
                self._updateMapContext();
            }, this);
        },

        _bindExternalEvents:function () {
            var self = this;

            $APP.on('locality.edit', function (evt, payload) {
                self.pointLayer.setLatLng(self.original_marker_position);
                self.MAP.addLayer(self.pointLayer);

            });

            $APP.on('locality.cancel', function (evt) {
                // user clicked cancel while updating Locality
                self.MAP.removeLayer(self.pointLayer);
                self.pointLayer.setLatLng([0,0]);
            });

            $APP.on('locality.save', function (evt) {
                // user clicked save while updating Locality
                self.MAP.removeLayer(self.pointLayer);
                self.pointLayer.setLatLng([0,0]);
            });


            $APP.on('locality.info', function (evt, payload) {
                // remove edit marker if it exists
                if (self.pointLayer) {
                    self.MAP.removeLayer(self.pointLayer);
                    self.pointLayer.setLatLng([0,0]);
                };

                self.original_marker_position = [payload.geom[1], payload.geom[0]];
                // move map to the marker
                if (payload.zoomto) {
                    self.MAP.setView(self.original_marker_position, self.MAP.getMaxZoom());
                } else {
                    self.MAP.panTo(self.original_marker_position);
                }
            });
        },

        _setupNewLocalityLayer: function () {
            this.newLocalityLayer = L.featureGroup();

            this.drawControl = new L.Control.Draw({
                draw: {
                    polyline: false,
                    polygon: false,
                    rectangle: false,
                    circle: false,
                    marker: {
                        icon: this.redIcon
                    }
                },
                edit: {
                    featureGroup: this.newLocalityLayer
                }
            });
            // create markerDraw control
            this.markerDrawControl = new L.Draw.Marker(this.MAP, this.drawControl.options.draw.marker);
        },

        _setupPointLayer: function () {
            this.pointLayer = L.marker([0, 0], {
                'clickable': true,
                'draggable': true,
                'icon': this.redIcon
            });

            this.pointLayer.on('dragend', function (evt) {
                $APP.trigger('locality.map.move', {'latlng': evt.target._latlng});
            });
        },

        _setupClusterLayer: function() {
              var self = this;
              var clusterLayer = L.clusterLayer({
                'url': '/localities.json'
              });
              self.MAP.addLayer(clusterLayer);
        }
    }

    // return module
    return module;
}());
