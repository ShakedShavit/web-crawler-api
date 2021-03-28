const cheerio = require('cheerio');
const fetch = require('node-fetch');
const urlJoin = require('url-join');

class Site {
    constructor(url, level) {
        this.url = url;
        this.links = [];
        this.title = '';
        this.level = level;

        Site.siteCounter++;
    }

    static siteCounter = 0;

    async getHtmlFromUrl() {
        try {
            const res = await fetch(this.url);
            const html = await res.text();
            return html;
        } catch (err) {
            console.log(err);
        }
    }

    async setTitle() {
        try {
            const html = await getHtmlFromUrl(this.url);
            const $ = cheerio.load(html);
            this.title = $('title').text();
        } catch (err) {
            console.log(err);
        }
    }

    async setLinks(maxPages = Infinity) {
        console.log(this.url); //

        if (Site.siteCounter >= maxPages) return true;

        try {
            const html = await getHtmlFromUrl(this.url);
            const $ = cheerio.load(html);

            $('a').each((index, element) => {
                if (Site.siteCounter >= maxPages) return false;

                let hrefVal = $(element).attr('href');
                if (!!hrefVal && (hrefVal[0] === '/' || hrefVal.slice(0, 2) === './')) {
                    hrefVal = urlJoin(this.url, hrefVal);
                    hrefVal = hrefVal.replace('/./', '/');
                    hrefVal = hrefVal.replace('./', '/');
                }
                else if (hrefVal == undefined || hrefVal.slice(0, 4) !== 'http') return;

                this.links.push(
                    // Check if the url is already in the tree with redis
                    new Site(
                        hrefVal, // get the href attribute
                        this.level + 1
                    ));
            });
        } catch (err) {
            console.log(err);
        }
    }
}

const getHtmlFromUrl = async (url) => {
    try {
        const res = await fetch(url);
        const html = await res.text();
        return html;
    } catch (err) {
        console.log(err);
        throw new Error(err.message);
    }
}

module.exports = Site;