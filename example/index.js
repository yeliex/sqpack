const path = require('path');
const SQPack = require('../index');

const sqpack = new SQPack({
  path: path.resolve(__dirname, '../test'),
  name: '0a0000',
});

sqpack.index();
