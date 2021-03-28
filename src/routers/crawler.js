const express = require('express');
const Site = require('../utils/site');
const {
    createQueue
} = require('../middleware/sqs');

const router = new express.Router();

router.post('/start-scraping', async (req, res) => {
    try {
        const maxPages = req.body.maxPages ? parseInt(req.body.maxPages) + 1 : Infinity;
        const rootSite = new Site(req.body.startUrl, 0);
    
        let values = [rootSite];
        let hasMaxPagesBeenReached = false;

        while (values.length) {
            console.log(values[0].level); //

            // here send the url to sqs

            await values[0].setTitle();
    
            if (values[0].level < parseInt(req.body.maxDepth) && !hasMaxPagesBeenReached) {
                hasMaxPagesBeenReached = await values[0].setLinks(maxPages);
    
                values = values.concat(values[0].links)
            }

            values.shift();
        }

        console.log('Done');
        
        res.send();
    } catch (err) {
        console.log(err);
        res.status(400).send(err);
    }


    // await recursive(rootSite, 0, 1);

    // const recursive = async (currentSite, index, previousLevelLength) => {
    //     if (currentLevel === req.body.maxDepth - 1) return;

    //     await currentSite.setLinksAndTitle();

    //     if (index === previousLevelLength - 1) {
    //         currentLevel++;

    //     } else {
    //         recursive(currentSite.links[index + 1], index + 1, previousLevelLength);
    //     }

    //     for (site of currentSite.links) {
    //         await site.setLinksAndTitle();
    //     }
    // }
});

module.exports = router;