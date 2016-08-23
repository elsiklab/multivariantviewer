define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dijit/Dialog'
],
function(
    declare,
    array,
    lang,
    Dialog
) {
    return declare(Dialog, {
        title: 'MultiVariantViewer',
        getColor: function(track, feature, genotype, genotypeFull) {
            return track.getConf('style.color', [feature, genotype, genotypeFull]);
        },
        show: function(args) {
            var track = args.track;
            var browser = args.browser;
            var region = browser.view.visibleRegion();
            var w = 800;
            var h = 2300;

            var ret = dojo.create('div', { className: 'canvascontainer' }, this.container);
            var c = dojo.create('canvas', { width: w*2, height: h*2, style: { width: w+'px', height: h+'px' } }, ret);
            var ctx = c.getContext('2d');
            var feats = [];
            var color = lang.hitch(this, 'getColor');
            ctx.scale(2, 2);



            track.store.getFeatures(region, function(f) {
                feats.push(f);
            }, function() {
                var l = w / feats.length;
                ctx.fillStyle="#FF0000";
                for (var i = 0; i < feats.length; i++) {
                    var genotypes = feats[i].get('genotypes');
                    delete genotypes.toString;
                    var k = h / Object.keys(genotypes).length;
                    Object.keys(genotypes).forEach(function(f,j) {
                        if (genotypes[f].GT) {
                            var valueParse = genotypes[f].GT.values[0];
                            var splitter = (valueParse.match(/[\|\/]/g) || [])[0];
                            var split = valueParse.split(splitter);
                            if ((split[0] != 0   || split[1] != 0) && (split[0] != '.' || split[1] != '.')) {
                                ctx.fillStyle = color(track, feats[i], 'alt', valueParse);
                            } else {
                                ctx.fillStyle = color(track, feats[i], 'ref', valueParse);
                            }   
                        } else {
                            ctx.fillStyle = color(track, feats[i], 'ref');
                        }
                        ctx.fillRect(i * l, j * k, l+0.5, k+0.5);
                    });
                }
            }, function(error) {
                console.error(error);
            });

            this.set('content', ret);
            this.inherited(arguments);
        }

    });
});
