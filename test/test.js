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
    assert.equal(log.modules['foo.css'].destHash, '3b8d4e24cb1068505026b6993aa9d1d3');
  });

  it('生成低流量图片', function() {
    assert.equal(log.modules['foo.lowbandwidth.png'].destHash, 'c05a575455479ebc2577fd5cb7a9de7e');
  });
});
