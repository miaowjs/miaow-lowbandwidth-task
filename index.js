var _ = require('lodash');
var async = require('async');
var path = require('path');
var postcss = require('postcss');

var getLowbandwidthImage = require('./lib/getLowbandwidthImage');

var pkg = require('./package.json');

var reg = /url\s*\(\s*['"]?([^\/][\w_\/\.\-]*)['"]?\)/;

module.exports = function(options, callback) {
  var context = this;

  // 样式语法树根
  var root = postcss.parse(
    context.contents.toString(),
    {from: path.resolve(context.context, context.src)}
  );

  var backgroundImageList = [];

  // 获取带有背景图设置的节点
  var backgroundNodeList = _.filter(root.nodes, function(node) {
    if (node.type === 'rule') {
      return _.findLast(node.nodes, function(subNode) {
        if (
          subNode.type === 'decl' &&
          (subNode.prop === 'background' || subNode.prop === 'background-image') &&
          reg.test(subNode.value)
        ) {
          backgroundImageList.push(reg.exec(subNode.value)[1]);
          return true;
        }
      });
    }
  });

  if (backgroundNodeList.length === 0) {
    return callback();
  }

  // 追加1倍图规则
  async.mapSeries(
    backgroundImageList,
    getLowbandwidthImage.bind(context),
    function(err, lowbandwidthImageList){
      if (err) {
        return callback(err);
      }

      _.each(backgroundNodeList, function(backgroundNode, index) {
        var rule = '{background-image: url('+ lowbandwidthImageList[index] +');}';
        var selectors = backgroundNode.selectors.map(function(selector) {
          return '[data-net="lowbandwidth"] ' + selector;
        });

        root.nodes.splice(
          root.nodes.indexOf(backgroundNode) + 1,
          0,
          postcss.parse(selectors + rule).first
        );
      });

      try {
        context.contents = new Buffer(root.toResult().css);
      } catch (err) {
        return callback(err);
      }

      callback();
    }
  );
};

module.exports.toString = function() {
  return [pkg.name, pkg.version].join('@');
};
