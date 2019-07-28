const fetch = require('node-fetch')
const config = require('../config.js')
const cloudscraper = require('cloudscraper') // For cloudflare
const RequestError = require('../structs/errors/RequestError.js')
const FeedParserError = require('../structs/errors/FeedParserError.js')
const DecodedFeedParser = require('../structs/DecodedFeedParser.js')
const ArticleIDResolver = require('../structs/ArticleIDResolver.js')
const REQUEST_ERROR_CODE = 50042
const FEEDPARSER_ERROR_CODE = 40002

class FeedFetcher {
  constructor () {
    throw new Error('Cannot be instantiated')
  }

  static async fetchURL (url, requestOptions = {}) {
    if (!url) throw new Error('No url defined')
    const options = {
      timeout: 15000,
      follow: 5,
      headers: { 'user-agent': `Mozilla/5.0 ${url.includes('.tumblr.com') ? 'GoogleBot' : ''} (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36` },
      ...requestOptions
    }
    let endStatus
    let res

    try {
      res = await fetch(url, options)
    } catch (err) {
      throw new RequestError(err.message)
    }

    endStatus = res.status

    if (res.status === 200) return res.body
    if (res.status === 403 || res.status === 400) {
      delete options.headers
      const res2 = await this.fetch(url, options)
      endStatus = res2.status
      if (res2.status === 200) return res2.body
    }

    const serverHeaders = res.headers.get('server')
    if (!serverHeaders || !serverHeaders.includes('cloudflare')) throw new RequestError(REQUEST_ERROR_CODE, `Bad status code (${endStatus})`)

    // Cloudflare is used here
    if (config._vip) throw new RequestError(REQUEST_ERROR_CODE, `Bad Cloudflare status code (${endStatus}) (Unsupported on public bot)`, true)

    return cloudscraper({ method: 'GET', uri: url, resolveWithFullResponse: true }).then(res => {
      if (res.statusCode !== 200) throw new RequestError(REQUEST_ERROR_CODE, `Bad Cloudflare status code (${res.statusCode})`, true)
      const Readable = require('stream').Readable
      const feedStream = new Readable()
      feedStream.push(res.body)
      feedStream.push(null)
      return feedStream
    })
  }

  static async parseStream (stream, url) {
    const feedparser = new DecodedFeedParser(null, url)
    const idResolver = new ArticleIDResolver()
    stream.pipe(feedparser)
    const articleList = []

    return new Promise((resolve, reject) => {
      feedparser.on('error', err => {
        feedparser.removeAllListeners('end')
        if (err.message === 'Not a feed') reject(new FeedParserError(FEEDPARSER_ERROR_CODE, 'That is a not a valid feed. Note that you cannot add just any link. You may check if it is a valid feed by using online RSS feed validators'))
        else reject(new FeedParserError(null, err.message))
      })

      feedparser.on('readable', function () {
        let item
        do {
          item = this.read()
          if (item) {
            idResolver.recordArticle(item)
            articleList.push(item)
          }
        } while (item)
      })

      feedparser.on('end', () => {
        if (articleList.length === 0) return resolve({ articleList })
        const idType = idResolver.getIDType()
        for (const article of articleList) {
          article._id = ArticleIDResolver.getIDTypeValue(article, idType)
        }
        resolve({ articleList, idType })
      })
    })
  }

  static async fetchFeed (url, options) {
    const stream = await this.fetchURL(url, options)
    const { articleList, idType } = await this.parseStream(stream, url)
    return { articleList, idType }
  }
}

module.exports = FeedFetcher
