var assert = require('assert');
var fs = require('fs');
var miaow = require('miaow');
var path = require('path');

var parse = require('..');
describe('miaow-lowbandwidth-task', function() {
  this.timeout(10e3);

  var log;

  function doCompile(done) {
    miaow({
      context: path.resolve(__dirname, './fixtures')
    }, function(err) {
      if (err) {
        console.error(err.toString(), err.stack);
        process.exit(1);
      }

      log = JSON.parse(fs.readFileSync(path.resolve(__dirname, './output/miaow.log.json')));
      done();
    });
  }

  before(doCompile);

  it('接口是否存在', function() {
    assert(!!parse);
  });

  it('修改样式', function() {
    assert.equal(log.modules['foo.css'].destHash, 'dc1fa44749ee90f9c4bc280bd73c47d9');
  });

  it('生成低流量图片', function() {
    assert.equal(log.modules['foo.lowbandwidth.png'].destHash, 'fe3f1ada24a1a4e7c45be03b957d09c4');
  });
});
