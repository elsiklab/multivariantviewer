define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'JBrowse/View/FeatureGlyph/Box'
],
function (
    declare,
    array,
    lang,
    FeatureGlyph
) {
    return declare(FeatureGlyph, {
        getColor: function (feature, genotype, genotypeFull) {
            return this.getConf('style.matrixColor', [feature, genotype, genotypeFull]);
        },
        renderFeature: function (context, fRect) {
            if (fRect.f.get('type') !== 'SNV') return null;

            var genotypes = fRect.f.get('genotypes');
            delete genotypes.toString;
            var color = lang.hitch(this, 'getColor');
            var style = lang.hitch(this, 'getStyle');
            var height = this._getFeatureHeight(fRect.viewInfo, fRect.f);
            var keys = Object.keys(genotypes);
            var thisB = this;
            if (this.config.sortByPopulation) {
                keys.sort(function (a, b) { return thisB.track.labels[a.trim()].population.localeCompare(thisB.track.labels[b.trim()].population); });
            }

            keys.forEach(function (key, ret) {
                var col;
                if (genotypes[key].GT) {
                    var valueParse = genotypes[key].GT.values[0];
                    var splitter = (valueParse.match(/[\|\/]/g) || [])[0];
                    var split = valueParse.split(splitter);
                    if(!splitter) {
                        if(valueParse == '0') {
                            col = this.config.style.ref_color || color(fRect.f, 'ref', valueParse);
                        }
                        else {
                            col = this.config.style.hom_color || color(fRect.f, 'alt', valueParse);
                        }
                    }
                    else {
                        if (+split[0] === +split[1] && split[0] !== '.' && +split[0] !== 0) {
                            col = this.config.style.hom_color || color(fRect.f, 'alt', valueParse);
                        } else if (+split[0] !== +split[1]) {
                            col = this.config.style.het_color || color(fRect.f, 'alt', valueParse);
                        } else {
                            col = this.config.style.ref_color || color(fRect.f, 'ref', valueParse);
                        }
                    }
                } else {
                    col = this.config.style.ref_color || color(fRect.f, 'ref');
                }
                var offset = ret * (style(fRect.f, 'height') + (style(fRect.f, 'offset') || 0));
                this.renderBox(context, fRect.viewInfo, fRect.f, offset, height, fRect.f, function () { return col; });
            }, this);

            return 0;
        }
    });
});

