var express = require('express');
var tmp = require('tmp-promise');
var fs = require('fs');
var child = require('child_process');  
var app = express();
var spawn = child.spawn;

app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.get('/', function(req, res) {
    var ref = req.query.ref;
    var start = Math.round(req.query.start);
    var end = Math.round(req.query.end);
    var tabix = req.query.url;
    var fs = require('fs');
    var file = fs.createWriteStream('myOutput.txt');
    var proc = spawn('tabix', ['-p', 'vcf', '-h', tabix, ref + ':' + start + '-' + end]);

    proc.stderr.on('data', function(data) {
        console.error(data.toString('utf8'));
    });

    var lineReader = require('readline').createInterface({
        input: proc.stdout,
        terminal: false
    });

    lineReader.on('line', function (line) {
        var ret = line.toString('utf8');
        console.log(ret);
        if(ret[0] != '#') {
            var id = ret.split('\t')[2];
            console.log(id);
        }
    });
    res.send('Hello World!');
});

app.listen(process.env.EXPRESS_PORT || 4730);
