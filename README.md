# multivariantviewer

A JBrowse plugin that adds some custom glyphs for variants on a "multi VCF" file (VCF with multiple individuals)

## Example configuration

    {
        "type": "MultiVariantViewer/View/Track/MultiVariantViewer",
        "urlTemplate": "variants.vcf.gz",
        "label": "Variant track",
        "storeClass": "JBrowse/Store/SeqFeature/VCFTabix",
        "style": {
            "height":1,
            "color": "function(feat,gt,fullgt) { return gt=='ref'? 'blue': 'orange'; }"
        }
    }

## Options

* style->height - pixel height of each individual. Default: 5
* style->offset - pixel offset between individuals. Default: 0
* style->color - a color or a callback that returns a colors for each individual. function callback signature is function(feature, string ['ref' or 'alt'], genotype [the actual genotype as 0|0 or 0|1 or similar]). defaults to coloring 'ref' as green and 'alt' as red


## Screenshot

![](img/example.png)

Shows 1000genomes data VCF data

## Installation

Clone the repo to your plugins directory and name it VariantTrack

    git clone https://github.com/cmdcolin/multivariantviewer MultiVariantViewer

Then add it to your jbrowse config using "plugins": ["MultiVariantViewer"] or similar. http://gmod.org/wiki/JBrowse_FAQ#How_do_I_install_a_plugin

