import fs from 'fs'
import { EventEmitter } from 'events'
import url from 'url'

import express from 'express'
import superagent from 'superagent'
import cheerio from 'cheerio'
import eventproxy from 'eventproxy'
import _ from 'underscore'

import config from '../config'

class Crawler extends EventEmitter{
  constructor(props) {
    super(props)
    this.url = config.url
    this.dir = './data/city'
  }
  writeFile(filePath, data) {
    return new Promise((res, rej) => {
      fs.writeFile(filePath, data, (err) =>{
        if (err) {
          rej(err)
        }
        res(err)
      })
    })
  }
  crawler() {
    return new Promise((rs, rj) => {
      try{
        superagent
          .get(config.url)
          .end((err, res) => {
            if (err) rj(err)
            const $ = cheerio.load(res.text)

            const cities = [];
            const nodes = $('.TRS_PreAppend .MsoNormal')

            const data = nodes.each((i, el) => {
              const childrens = $(el).children();
              const firstDomLength = childrens.eq(0).text().length

              switch(firstDomLength) {
                case 1:
                  var number = childrens.eq(1).text().trim()
                  var value = childrens.eq(2).text().trim()
                  var lastParent = _.last(cities) || {}
                  var parentChildren = lastParent.children || []

                  parentChildren.push({
                    value,
                    label: value,
                    number,
                    children: []
                  })
                  break;
                case 2:
                  var lastParent = _.last(cities) || {}
                  var parentChildren = _.last(lastParent.children || []) || {}
                  var parentChildrenChidren = parentChildren.children || []
                  var number = childrens.eq(1).text().trim()
                  var value = childrens.eq(2).text().trim()

                  parentChildrenChidren.push({
                    value,
                    label: value,
                    number,
                  })
                  break;
                case 11:
                  var number = childrens.eq(0).text().trim()
                  var value = childrens.eq(1).text().trim()
                  cities.push({
                    value,
                    label: value,
                    number,
                    children: []
                  })
                  break;
              }
            })

            rs(cities)
          })
        } catch (e) {
          rj(e)
        }
    })
  }
  async init() {
    var cities = await this.crawler()
    var writfleResutl = await this.writeFile(this.dir, JSON.stringify(cities))
  }
}

const cw = new Crawler()

cw.init()
  .then(a => console.log(a))
  .then(b => console.log(b))
  .catch(e => console.error(e))
