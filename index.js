var _ = require('lodash');
var async = require('async');
var images = require('images');
var path = require('path');
var postcss = require('postcss');

var pkg = require('./package.json');

function getBackgroundImageAndNodeList(context, root, callback) {
  var backgroundImageList = [];

  var reg = new RegExp('url\\s*\\(\\s*[\'"]?([^\/][\\w\\_\\/\\.\\-]*)[\'\"]?\\s*\\)', 'im');

  var backgroundNodeList = _.filter(root.nodes, function(node) {
    if (node.type === 'rule') {
      return _.findLast(node.nodes, function(subNode) {
        if (
          subNode.type === 'decl' &&
          (subNode.prop === 'background' || subNode.prop === 'background-image') &&
          reg.test(subNode.value)
        ) {
          backgroundImageList.push({
            src: reg.exec(subNode.value)[1]
          });
          return true;
        }
      });
    }
  });

  callback(null, backgroundImageList, backgroundNodeList);
}

function getImageInfo(context, backgroundImageList, backgroundNodeList, callback) {
  async.eachSeries(
    backgroundImageList,
    function(backgroundImage, callback) {
      context.resolveModule(backgroundImage.src, function(err, module) {
        if (err) {
          return callback(err);
        }

        backgroundImage.url = module.url;
        backgroundImage.src = module.src;

        var image;
        var size;

        try {
          image = images(path.resolve(context.context, backgroundImage.src));
          size = image.size();
        } catch(err) {
          return callback(err);
        }

        backgroundImage.image = image;
        backgroundImage.width = size.width;
        backgroundImage.height = size.height;
        backgroundImage.format = path.extname(backgroundImage.src);

        callback();
      });
    },

    function(err) {
      callback(err, backgroundImageList, backgroundNodeList);
    });
}

function scaleImage(context, backgroundImageList, backgroundNodeList, callback) {
  async.eachSeries(
    backgroundImageList,
    function(backgroundImage, callback) {
      var width = backgroundImage.width / 2;
      var height = backgroundImage.height / 2;

      var contents;

      try {
        contents = backgroundImage.image
          .resize(width, height)
          .encode(backgroundImage.format);
      } catch(err) {
        return callback(err);
      }

      var src = backgroundImage.src;
      var extname = path.extname(src);

      src = src.replace(new RegExp(extname + '$'), '.lowbandwidth' + extname);

      context.emitModule(src, contents, function(err, module) {
        if (err) {
          return callback(err);
        }

        backgroundImage.scaled = module.url;
        callback();
      });
    },

    function(err) {
      callback(err, backgroundImageList, backgroundNodeList);
    });
}

function addRule(context, root, backgroundImageList, backgroundNodeList, callback) {
  // 追加1倍图规则
  _.each(backgroundNodeList, function(backgroundNode, index) {
    var rule = '{background-image: url('+ backgroundImageList[index].scaled +');}';
    var selectors = backgroundNode.selectors.map(function(selector) {
      return '.lowbandwidth ' + selector;
    });

    root.nodes.splice(root.nodes.indexOf(backgroundNode) + 1, 0, postcss.parse(selectors + rule).first);
  });

  callback();
}

module.exports = function(options, callback) {
  var context = this;

  // 样式语法树根
  var root = postcss.parse(
    context.contents.toString(),
    {from: path.resolve(context.context, context.src)}
  );

  async.waterfall(
    [
      _.partial(getBackgroundImageAndNodeList, context, root),
      _.partial(getImageInfo, context),
      _.partial(scaleImage, context),
      _.partial(addRule, context, root)
    ],
    function(err) {
      if (err) {
        return callback(err);
      }

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
