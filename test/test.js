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
    assert.equal(log.modules['foo.css'].destHash, '38b747114e77681cac428dc166c2e6b4');
  });

  it('生成低流量图片', function() {
    assert.equal(log.modules['foo.lowbandwidth.png'].destHash, 'f4e73883ae35fd2d63ec352cf222e74d');
  });
});
