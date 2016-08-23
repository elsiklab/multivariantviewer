define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dijit/Dialog'
],
function(
    declare,
    array,
    Dialog
) {
    return declare(Dialog, {
        title: 'MultiVariantViewer',

        constructor: function() {
        },

        show: function() {
            var ret = dojo.create('div', { className: 'canvascontainer' }, this.container);
            dojo.create('canvas', { width: 800, height: 600 }, ret);

            this.set('content', ret);
            this.inherited(arguments);
        }

    });
});
