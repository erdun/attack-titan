import os from 'os'
import crypto from 'crypto'

export default class Que {
  constructor() {
    this.cpus = os.cpus()
    this.max = 1;
    this.total = {}
    this.list = {}
    this.isDrain = false;
    this.finish = false;
  }
  id() {
    const tmp = Date.now()
    const rdm = Math.floor(Math.random() * 0xFFFF);
    const str = `${tmp}${rdm}`

    return crypto.createHash('sha1').update(str).digest('hex')
  }
  add(task, ...rest) {
    const _id = this.id()
    this.finish = false;
    this.isDrain = false;

    this.total[_id] = {
      task,
      arg: rest
    }

    return _id
  }
  remove(id) {
    delete this.total[id]
    this._isDrain()
  }
  addToList(id) {
    this.list[id] = this.total[id]

    delete this.total[id]

    return new Promise((res, rej) => {})
  }
  listKeys() {
    return Object.keys(this.total)
  }
  _isDrain() {
    this.isDrain = !this.listKeys().length

    return this.isDrain
  }
  start(cb) {
    this.cb = cb
    this.init()
  }
  init() {
    const _keys = this.listKeys()
    let count = this.max > _keys.length
      ? _keys.length
      : this.max

    while(count--) {
      this.addToList(_keys[count])
      this.run(_keys[count])
    }
  }
  run(id) {
    const tsk = this.list[id]
    console.log('start to run', tsk)

    tsk.task(...tsk.arg)
      .then(pages => {
        this.cb(pages)

        this.autoAdd()
      })
      .catch(e => console.error('run task error', e))
  }
  autoAdd() {
    console.log('is drain', this._isDrain())
    if (this._isDrain()) return

    const _list = this.listKeys()
    const _key = _list[0]

    this.addToList(_key)
    this.run(_key)
  }
}

