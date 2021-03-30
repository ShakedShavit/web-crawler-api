const cheerio = require('cheerio');
const fetch = require('node-fetch');
const urlJoin = require('url-join');

const getAllLinksInPage = async (url) => {
    const links = [];

    try {
        const res = await fetch(url);
        const html = await res.text();
        const $ = cheerio.load(html);
    
        $('a').each((index, element) => {
            let hrefVal = $(element).attr('href');
            if (!!hrefVal && (hrefVal[0] === '/' || hrefVal.slice(0, 2) === './')) {
                hrefVal = urlJoin(url, hrefVal);
                hrefVal = hrefVal.replace('/./', '/');
                hrefVal = hrefVal.replace('./', '/');
            }
            else if (hrefVal == undefined || hrefVal.slice(0, 4) !== 'http') return;
    
            links.push(hrefVal);
        });

        return links;
    } catch (err) {
        console.log(err);
    }
}

module.exports = getAllLinksInPage;