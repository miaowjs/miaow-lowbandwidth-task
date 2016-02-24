var gm = require('gm');
var path = require('path');

module.exports = function(image, callback) {
  var context = this;

  context.resolveModule(image, function(err, module) {
    if (err) {
      return callback(err);
    }

    image = path.resolve(context.context, module.src);

    gm(image)
      .identify(function(err, data) {
        if (err) {
          return callback(err);
        }

        var width = data.size.width / 2;
        var height = data.size.height / 2;

        gm(image)
          .resize(width, height)
          .toBuffer(data.format, function (err, contents) {
            if (err) {
              return callback(err);
            }

            var src = module.src;
            var extname = path.extname(src);

            src = src.replace(new RegExp(extname + '$'), '.lowbandwidth' + extname);

            context.emitModule(src, contents, function(err, module) {
              if (err) {
                return callback(err);
              }

              callback(null, module.url);
            });
          });
    });
  });
};
