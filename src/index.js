const { resolve } = require('path');
const util = require('./util');

class SQPack {
  /**
   *
   * @param path sqpack文件所在路径
   * @param name 文件名
   */
  constructor({ path, name } = {}) {
    this.base = resolve(process.cwd(), path);
    this.name = name;

    this.indexes = {};
    this.files = {
      res: [],
      index: [],
    };

    this._init();
  }

  // todo: 判断文件是否存在, 并生成相关文件
  _init() {
    this.files.res = [resolve(this.base, `${this.name}.win32.dat0`)];
    this.files.index = [resolve(this.base, `${this.name}.win32.index`)];
  }

  /**
   * 读取索引文件建立索引
   * @returns {Promise<void>}
   */
  async index() {
    await util.readIndex(this.files.index[0]);
  }
}

module.exports = SQPack;
