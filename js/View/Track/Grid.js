define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/on',
    'JBrowse/View/Track/CanvasFeatures',
    'JBrowse/View/Track/BlockBased',
    'JBrowse/Util',
    'dojo/Deferred',
    'dijit/Tooltip',
    'dojox/data/CsvStore'
],
function (
    declare,
    array,
    lang,
    on,
    CanvasFeatures,
    BlockBased,
    Util,
    Deferred,
    Tooltip,
    CsvStore
) {
    return declare(CanvasFeatures, {
        constructor: function () {
            this.labels = {};
            this.labelsCompleted = new Deferred();
            var thisB = this;
            if (this.config.sublabels) {
                this.config.sublabels.forEach(function (elt) {
                    this.labels[elt.name] = elt;
                }, this);
                this.labelsCompleted.resolve('success');
            } else if (this.config.sublabelsCsv) {
                var store = new CsvStore({url: Util.resolveUrl(thisB.config.baseUrl, this.config.sublabelsCsv) });
                store.fetch({
                    onComplete: function (items) {
                        for (var i = 0; i < items.length; i++) {
                            var name = store.getValue(items[i], 'name');
                            var population = store.getValue(items[i], 'population');
                            var color = store.getValue(items[i], 'population');
                            thisB.labels[name] = {name: name, color: color, population: population};
                        }
                        thisB.labelsCompleted.resolve('success');
                    }, onError: function () {
                        thisB.labelsCompleted.reject('error');
                    }
                });
            } else {
                this.labelsCompleted.resolve('success');
            }
        },

        _defaultConfig: function () {
            var ret = Util.deepUpdate(lang.clone(this.inherited(arguments)), {
                glyph: 'MultiVariantViewer/View/FeatureGlyph/Variant',
                showLabels: true,
                showTooltips: true,
                style: {
                    height: 12,
                    showLabels: false,
                    ref_color: '#aaa',
                    het_color: 'cyan',
                    hom_color: 'blue',
                    no_call: 'white'
                }
            });
            return ret;
        },

        // override getLayout to access addRect method
        _getLayout: function () {
            var thisB = this;
            var layout = this.inherited(arguments);
            return declare.safeMixin(layout, {
                getTotalHeight: function () {
                    return thisB.totalHeight;
                }
            });
        },

        makeTrackLabel: function () {
            var thisB = this;
            var c = this.config;

            if (c.showLabels || c.showTooltips) {
                this.labelsCompleted.then(function () {
                    var ret = thisB.store.getVCFHeader || thisB.store.getParser;
                    ret.call(thisB.store).then(function (header) {
                        var keys = dojo.clone(header.samples);
                        if (c.sortByPopulation) {
                            keys.sort(function (a, b) { var r = thisB.labels; return r[a.trim()].population.localeCompare(r[b.trim()].population); });
                        } else if (c.sortBySublabels) {
                            keys = thisB.config.sublabels.map(function (r) { return r.name; });
                        }
                        thisB.keyorder = dojo.clone(keys);
                        thisB.sublabels = array.map(keys, function (sample) {
                            var key = sample.trim();
                            var elt = thisB.labels[key] || {};
                            var width = c.labelWidth ? c.labelWidth + 'px' : null;
                            var htmlnode = dojo.create('div', {
                                className: 'varianttrack-sublabel',
                                id: thisB.config.label + '_' + key,
                                style: {
                                    position: 'absolute',
                                    height: c.style.height - 1 + 'px',
                                    width: c.showLabels ? width : '10px',
                                    font: c.labelFont,
                                    backgroundColor: elt.color
                                },
                                innerHTML: c.showLabels ? key : ''
                            }, thisB.div);

                            on(htmlnode, c.clickTooltips ? 'click' : 'mouseover', function () {
                                Tooltip.show(key + '<br />' + (elt.description || '') + '<br />' + (elt.population || ''), htmlnode);
                            });
                            on(htmlnode, 'mouseleave', function () {
                                Tooltip.hide(htmlnode);
                            });


                            return htmlnode;
                        });
                    });
                });
            }

            this.inherited(arguments);
        },

        updateStaticElements: function (coords) {
            this.inherited(arguments);
            if (this.sublabels && 'x' in coords) {
                var height = this.config.style.height + (this.config.style.offset || 0);
                array.forEach(this.sublabels, function (sublabel, i) {
                    sublabel.style.left = coords.x + 'px';
                    sublabel.style.top = i * height + 'px';
                });
            }
        },
        _trackMenuOptions: function () {
            var opts = this.inherited(arguments);
            var thisB = this;
            if (this.config.sublabels && this.config.sublabels[0].population) {
                opts.push({
                    label: 'Sort by population',
                    type: 'dijit/CheckedMenuItem',
                    checked: !!thisB.config.sortByPopulation,
                    onClick: function () {
                        thisB.config.sortByPopulation = !thisB.config.sortByPopulation;
                        thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
                        thisB.redraw();
                        thisB.makeTrackLabel();
                    }
                });
            }

            return opts;
        },
        fillBlock: function (args) {
            var thisB = this;
            var ret = this.store.getVCFHeader || this.store.getParser;
            ret.call(this.store).then(function (header) {
                thisB.totalHeight = header.samples.length * (thisB.config.style.height + (thisB.config.style.offset || 0));
                thisB.heightUpdate(thisB.totalHeight, args.blockIndex);
            });
            this.inherited(arguments);
        },

        // given viewargs and a feature object, highlight that feature in
        // all blocks.  if feature is undefined or null, unhighlight any currently
        // highlighted feature
        mouseoverFeature: function (feature, evt) {
            if (this.lastMouseover === feature) {return;}

            if (evt) {var bpX = this.browser.view.absXtoBp(evt.clientX);}

            if (this.labelTooltip) {this.labelTooltip.style.display = 'none';}

            array.forEach(this.blocks, function (block) {
                if (!block) {return;}
                var context = this.getRenderingContext({ block: block, leftBase: block.startBase, scale: block.scale });
                if (!context) {return;}

                if (this.lastMouseover && block.fRectIndex) {
                    var r = block.fRectIndex.getByID(this.lastMouseover.id());
                    if (r) {this.renderFeature(context, r);}
                }

                if (block.tooltipTimeout) {window.clearTimeout(block.tooltipTimeout);}

                if (feature) {
                    var fRect = block.fRectIndex && block.fRectIndex.getByID(feature.id());
                    if (!fRect) {return;}

                    if (block.containsBp(bpX)) {
                        var renderTooltip = dojo.hitch(this, function () {
                            if (!this.labelTooltip) {return;}
                            var label = fRect.label || fRect.glyph.makeFeatureLabel(feature);
                            var description = fRect.description || fRect.glyph.makeFeatureDescriptionLabel(feature);

                            if ((!label && !description)) {return;}


                            if (!this.ignoreTooltipTimeout) {
                                this.labelTooltip.style.left = evt.clientX + 'px';
                                this.labelTooltip.style.top = (evt.clientY + 15) + 'px';
                            }
                            this.ignoreTooltipTimeout = true;
                            this.labelTooltip.style.display = 'block';
                            var labelSpan = this.labelTooltip.childNodes[0];
                            var descriptionSpan = this.labelTooltip.childNodes[1];

                            if (this.config.onClick && this.config.onClick.label) {
                                var ctx = lang.mixin({ track: this, feature: feature, callbackArgs: [ this, feature ] });
                                labelSpan.style.display = 'block';
                                labelSpan.style.font = label.font;
                                labelSpan.style.color = label.fill;
                                labelSpan.innerHTML = this.template(feature, this._evalConf(ctx, this.config.onClick.label, 'label'));
                                return;
                            }
                            if (label) {
                                labelSpan.style.display = 'block';
                                labelSpan.style.font = label.font;
                                labelSpan.style.color = label.fill;
                                labelSpan.innerHTML = label.text;
                            } else {
                                labelSpan.style.display = 'none';
                                labelSpan.innerHTML = '(no label)';
                            }
                            if (description) {
                                descriptionSpan.style.display = 'block';
                                descriptionSpan.style.font = description.font;
                                descriptionSpan.style.color = description.fill;
                                descriptionSpan.innerHTML = description.text;
                            } else {
                                descriptionSpan.style.display = 'none';
                                descriptionSpan.innerHTML = '(no description)';
                            }
                        });
                        if (this.ignoreTooltipTimeout) {renderTooltip();} else {block.tooltipTimeout = window.setTimeout(renderTooltip, 600);}
                    }

                    fRect.glyph.mouseoverFeature(context, fRect);
                    this._refreshContextMenu(fRect);
                } else {
                    block.tooltipTimeout = window.setTimeout(dojo.hitch(this, function () { this.ignoreTooltipTimeout = false; }), 200);
                }
            }, this);

            this.lastMouseover = feature;
        }
    });
});
