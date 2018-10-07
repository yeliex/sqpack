const fs = require('fs');

// 读取前0x400个字节的SQPACK头信息
exports.readHeader = async (path) => {

};

//
exports.readIndex = async (path) => {
  const data = {};
  let cache = null;
  let index = 0;

  const stream = fs.createReadStream(path, {
    start: 0x400,
  });

  // chunk单次读取最多读取65536个字节,第一次读取需要去掉文件头, 然后读取每个文件的信息, 有多余的扔到cache
  stream.on('data', (chunk) => {
    console.log(chunk, chunk.length);
    stream.close();
  });

  return new Promise((rec, rej) => {
    stream.on('end', () => {
      console.log(1);
    });

    stream.on('error', (error) => {
      console.log(error);
      rej(error);
    });

  });
};
