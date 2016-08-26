var express = require('express');
var tmp = require('tmp-promise');
var fs = require('fs');
var child = require('child_process');  
var app = express();

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
    var proc = child.spawn('tabix', ['-p', 'vcf', '-h', tabix, ref + ':' + start + '-' + end]);

    proc.stderr.on('data', function(data) {
        console.error(data.toString('utf8'));
    });
    var vcfname = tmp.tmpNameSync({ prefix: 'vcf' });
    var access = fs.createWriteStream(vcfname, { flags: 'w' });
    proc.stdout.pipe(access);

    var lineReader = require('readline').createInterface({
        input: proc.stdout,
        terminal: false
    });

    var snps = [];

    lineReader.on('line', function (line) {
        var ret = line.toString('utf8');
        if(ret[0] != '#') {
            var id = ret.split('\t')[2];
            snps.push(id);
        }
    });

    lineReader.on('close', function () {
        var rsids = tmp.tmpNameSync({ prefix: 'rsid' });
        fs.writeFileSync(rsids, snps.filter(function(elt) { return elt!='.'; }).join('\n'));
        var outputname = tmp.tmpNameSync({ prefix: 'plink' });
        console.log(rsids,outputname,vcfname)
        var plink = child.spawnSync('plink2', ['--vcf', vcfname, '--ld-window-r2', '0', '--r2', '--ld-snp-list', rsids, '--out', outputname, '--allow-extra-chr']);
        res.send(fs.readFileSync(outputname + '.ld'));
    });
});

app.listen(process.env.EXPRESS_PORT || 4730);
