import fs from 'fs'
import url from 'url'
import path from 'path'
import superagent from 'superagent'
import cheerio from 'cheerio'
import eventproxy from 'eventproxy'
import _ from 'underscore'
import shell from 'shelljs'
import Nightmare from 'nightmare'

import config from '../config'

const nightmare = new Nightmare()

export default class Crawler {
  constructor() {
    this.url = config.enter
    this.dir = './data/city'
    this.chapters = []
    this.data = {}
  }
  mkdir(...rest) {
    shell.mkdir('-p', ...rest)
  }
  writeFile(filePath = '', data) {
    const abPath = path.resolve(filePath)
    const dir = path.dirname(abPath)
    const isExist = fs.existsSync(dir)

    !isExist && this.mkdir(dir)

    return new Promise((res, rej) => {
      fs.writeFile(abPath, data, (err) =>{
        if (err) {
          rej(err)
        }
        res(err)
      })
    })
  }
  chaptersArr() {
    const self = this
    const chapters = this.chapters
    return new Promise((rs, rj) => {
      try{
        superagent
          .get(self.url)
          .set({
            'Accept-Charset': 'utf-8',
            'Accept': 'text/html',
          })
          .end((err, res) => {
            if (err) rj(err)
            if (!res.text) rj('prohibit by the website or get nothing')

            const $ = cheerio.load(res.text)

            const nodes = $('#rp_comiclist11_0_dl_0 > tr > td')

            const data = nodes.each((i, el) => {
              const childrens = $(el).children();
              const firstDomLength = childrens.eq(0).text().length

              const processEachChid = child => {
                const onclickStr = child.attribs.onclick

                const reghd = onclickStr.match(/(\'(.+)\')/)
                chapters.push(reghd[2])
              }
              _.each(childrens, processEachChid)

            })

            rs(chapters)
          })
        } catch (e) {
          rj(e)
        }
    })
  }
  eachChapter(_url) {
    return new Promise((rs, rj) => {
      if (!_url) rs([])

      try{
        nightmare
          .goto(_url)
          .evaluate(() => {
            return document.querySelector('#pageindex')
          })
          .then((res) => {
            const picArr = Object.keys(res)

            rs(picArr)
          })
          .catch(e => console.log(e))
        } catch (e) {
          console.log('yuansheng ', e)
          rj(e)
        }
    })
  }
  getPicUrl(_url) {
    return new Promise((rs, rj) => {
      if (!_url) rs('')

      try{
        nightmare
          .goto(_url)
          .wait(1000)
          .evaluate(() => {
            return document.querySelector('#TheImg').src
          })
          .then((imgHref) => {
            rs(imgHref)
          })
          .catch(e => console.log(e))
        } catch (e) {
          rj(e)
        }
    })
  }
  downloadImg(_path, _url) {
    const self = this
    return new Promise((rs, rj) => {
      if (!_url) rs()

      try{
        superagent
          .get(_url)
          .end((err, res) => {
            if (err) {
              console.error('download with error', err);
              rs()
              return
            }
            if (!res) {
              rs()
              return
            }

            self.writeFile(_path, res.body)
            rs()
          })
        } catch (e) {
          rj(e)
        }
    })
  }
  downImg(_path, _url) {
    const self = this

    return new Promise((res, rej) => {
      Promise
        .resolve()
        .then(() => {
          if (fs.existsSync(_path)) {
            console.log('exist omit')
            return Promise.resolve()
          }
          return self.getPicUrl(_url)
        })
        .then(imgUrl => {
          return self.downloadImg(_path, imgUrl)
        })
        .then(e => res(e))
        .catch(e => rej(e))
    })
  }
  start() {
    const self = this
    Promise
      .resolve()
      .then(() => {
        return this.chaptersArr()
      })
      .then((chaptersArr) => {
        return new Promise((res, rej) => {
          let _chapterUrl = '';
          const eachChapter = (chapter) => {
            _chapterUrl = self.chapterUrl(chapter)

            self.eachChapter(_chapterUrl)
              .then(pages => {
                self.data[_chapterUrl] = pages

                console.log('get one task', self.data)

                const downImg = (OriginUrl, page = 0) => {
                  const _url = OriginUrl + `-${page}`
                  const ext = url.parse(OriginUrl)
                  const dirname = ext.search.split('=')[1]

                  console.log('begin to download img', _url)
                  return self.downImg(`data/${dirname}/${page}.jpg`, _url)
                }

                const addOneImg = () => {
                  const img = pages.pop()

                  if (img) {
                    downOneImg(_chapterUrl, img)
                  } else {
                    oneTask()
                  }
                }

                function downOneImg(uri, _img) {
                  downImg(uri, _img)
                    .then(a => {
                      console.log('downlaod one img', _img)
                      addOneImg()
                    })
                    .catch(e => console.log('download one image with error', e))
                }

                addOneImg()
              })
              .catch(e => console.log('get page meet error', e))
          }

          function oneTask() {
            const _chapter = chaptersArr.shift()

            if (_chapter) {
              eachChapter(_chapter)
            } else {
              console.log('process exit')
              process.exit(0)
            }
          }
          oneTask()
        })
      })
      .catch(e => console.error(e))     
  }
  chapterUrl(param) {
    const params = param.split('.').shift().split('-')
    return `${config.chapterRoot}/comic-${params[0]}.html?ch=${params[1]}`
  }
}

const crawler = new Crawler()
crawler.start()
