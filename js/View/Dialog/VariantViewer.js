define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/on',
    'dijit/Dialog'
],
function(
    declare,
    array,
    lang,
    on,
    Dialog
) {
    return declare(Dialog, {
        title: 'MultiVariantViewer',
        getColor: function(track, feature, genotype, genotypeFull) {
            return track.getConf('style.matrixColor', [feature, genotype, genotypeFull]);
        },
        show: function(args) {
            var browser = args.browser;
            this.width = args.width || 800;
            this.height = args.height || 2300;
            this.track = args.track;
            this.feats = [];

            var region = browser.view.visibleRegion();
            var thisB = this;
            var ret = dojo.create('div', { className: 'canvascontainer' }, this.container);

            if (this.track.config.sublabels) {
                dojo.create('label', { for: 'sortcheckbox', innerHTML: 'Sort?' }, ret);
                var checkbox = dojo.create('input', { id: 'sortcheckbox', type: 'checkbox' }, ret);
                dojo.create('br', ret);
                on(checkbox, 'click', function() {
                    thisB.drawMatrix(checkbox.checked);
                });
            }

            var c = dojo.create('canvas', {
                width: this.width * 2,
                height: this.height * 2,
                style: {
                    width: this.width + 'px',
                    height: this.height + 'px'
                }
            }, ret);
            var ctx = c.getContext('2d');
            this.canvas = c;
            ctx.scale(2, 2);

            this.track.store.getFeatures(region, function(f) {
                thisB.feats.push(f);
            }, function() {
                thisB.drawMatrix();
            }, function(error) {
                console.error(error);
            });

            this.set('content', ret);
            this.inherited(arguments);
        },

        drawMatrix: function(sort) {
            var feats = this.feats;
            var c = this.canvas;
            var track = this.track;
            var w = this.width;
            var h = this.height;
            var ctx = c.getContext('2d');
            var color = lang.hitch(this, 'getColor');

            // draw names
            var feat = feats[0];
            var genotypes = feat.get('genotypes');
            delete genotypes.toString;
            var keys = Object.keys(genotypes);

            if (sort) {
                keys.sort(function(a, b) { return track.labels[a.trim()].population.localeCompare(track.labels[b.trim()].population); });
            }
            var dx = w / feats.length;
            var dy = h / keys.length;
            ctx.save();
            if (track.config.sublabels) {
                dx = (w - 15) / feats.length;
                for (var j = 0; j < keys.length; j++) {
                    var f = keys[j].trim();
                    ctx.fillStyle = track.labels[f].color;
                    ctx.fillRect(0, j * dy, 10, dy + 0.5);
                }
                ctx.translate(15, 0);
            }

            // draw matrix
            for (var i = 0; i < feats.length; i++) {
                var genotypes = feats[i].get('genotypes');
                delete genotypes.toString;
                for (var j = 0; j < keys.length; j++) {
                    var g = keys[j];
                    if (genotypes[g].GT) {
                        var valueParse = genotypes[g].GT.values[0];
                        var splitter = (valueParse.match(/[\|\/]/g) || [])[0];
                        var split = valueParse.split(splitter);
                        if ((+split[0] !== 0   || +split[1] !== 0) && (split[0] !== '.' || split[1] !== '.')) {
                            ctx.fillStyle = color(track, feats[i], 'alt', valueParse);
                        } else {
                            ctx.fillStyle = color(track, feats[i], 'ref', valueParse);
                        }
                    } else {
                        ctx.fillStyle = color(track, feats[i], 'ref');
                    }
                    ctx.fillRect(i * dx, j * dy, dx + 0.5, dy + 0.5);
                }
            }
            ctx.restore();
        }

    });
});
