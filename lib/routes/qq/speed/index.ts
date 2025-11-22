import { Route } from '@/types';

import cache from '@/utils/cache';
import got from '@/utils/got';
import { load } from 'cheerio';
import iconv from 'iconv-lite';
import timezone from '@/utils/timezone';
import { parseDate } from '@/utils/parse-date';

export const handler = async (ctx) => {
    const { category = '14551' } = ctx.req.param();
    const limit = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit'), 10) : 12;

    const rootUrl = 'https://speed.qq.com';
    const rootImageUrl = 'https://game.gtimg.cn';
    
    // 构建不同分类的URL
    let path;
    switch (category) {
        case '14551': // 综合
            path = 'webplat/info/news_version3/147/14551/m22621/list_1.shtml';
            break;
        case '14578': // 活动
            path = 'webplat/info/news_version3/147/14551/14572/14578/m22621/list_1.shtml';
            break;
        case '14585': // 公告
            path = 'webplat/info/news_version3/147/14551/14572/14585/m22621/list_1.shtml';
            break;
        case '61459': // 赛事
            path = 'webplat/info/news_version3/147/14551/61459/m22621/list_1.shtml';
            break;
        default:
            path = 'webplat/info/news_version3/147/14551/m22621/list_1.shtml';
    }

    const currentUrl = new URL(path, rootUrl).href;

    const { data: response } = await got(currentUrl, {
        responseType: 'buffer',
    });

    const $ = load(iconv.decode(response, 'gbk'));

    const language = $('html').prop('lang');

    let items = $('div.news-list-item ul li.list-item')
        .slice(0, limit)
        .toArray()
        .map((item) => {
            item = $(item);

            return {
                title: item.find('p').text(),
                pubDate: parseDate(item.find('span.date').text()),
                link: new URL(item.find('a.clearfix').prop('href'), rootUrl).href,
            };
        });

    items = await Promise.all(
        items.map((item) =>
            cache.tryGet(item.link, async () => {
                const { data: detailResponse } = await got(item.link, {
                    responseType: 'buffer',
                });

                const $$ = load(iconv.decode(detailResponse, 'gbk'));

                const title = $$('div.news-details-title h4').text();
                const description = $$('div.news-details-cont').html();
                const image = $$('div.news-details-cont img').first().prop('src');

                item.title = title;
                item.description = description;
                item.pubDate = timezone(parseDate($$('p.news-details-p1').text().trim()), +8);
                item.content = {
                    html: description,
                    text: $$('div.news-details-cont').text(),
                };
                item.image = image;
                item.banner = image;
                item.language = language;

                return item;
            })
        )
    );

    const image = new URL('images/speed/web202305/logo.png', rootImageUrl).href;

    // 获取分类名称
    let categoryName = '综合';
    switch (category) {
        case '14551':
            categoryName = '综合';
            break;
        case '14578':
            categoryName = '活动';
            break;
        case '14585':
            categoryName = '公告';
            break;
        case '61459':
            categoryName = '赛事';
            break;
    }

    return {
        title: `${$('title').text().split(/-/)[0]} - ${categoryName}`,
        description: $('meta[name="Description"]').prop('content'),
        link: currentUrl,
        item: items,
        allowEmpty: true,
        image,
        author: $('meta[name="author"]').prop('content'),
        language,
    };
};

export const route: Route = {
    path: '/speed/news/:category?',
    name: 'QQ飞车专区资讯中心',
    url: 'speed.qq.com',
    maintainers: ['nczitzk'],
    handler,
    example: '/qq/speed/news',
    parameters: { category: '分类，默认为 14551，即综合，可在对应分类页 URL 中找到对应的分类ID' },
    description: `::: tip
  分类参数对应关系如下：
:::

| 分类 | 分类ID | 路由示例 |
|------|--------|----------|
| [综合](https://speed.qq.com/webplat/info/news_version3/147/14551/m22621/list_1.shtml) | 14551 | [\`/qq/speed/news/14551\`](https://rsshub.app/qq/speed/news/14551) |
| [活动](https://speed.qq.com/webplat/info/news_version3/147/14551/14572/14578/m22621/list_1.shtml) | 14578 | [\`/qq/speed/news/14578\`](https://rsshub.app/qq/speed/news/14578) |
| [公告](https://speed.qq.com/webplat/info/news_version3/147/14551/14572/14585/m22621/list_1.shtml) | 14585 | [\`/qq/speed/news/14585\`](https://rsshub.app/qq/speed/news/14585) |
| [赛事](https://speed.qq.com/webplat/info/news_version3/147/14551/61459/m22621/list_1.shtml) | 61459 | [\`/qq/speed/news/61459\`](https://rsshub.app/qq/speed/news/61459) |
  `,
    categories: ['game'],

    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportRadar: true,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            title: 'QQ飞车专区资讯中心 - 综合',
            source: ['speed.qq.com/webplat/info/news_version3/147/14551/m22621/list_1.shtml'],
            target: '/speed/news/14551',
        },
        {
            title: 'QQ飞车专区资讯中心 - 活动',
            source: ['speed.qq.com/webplat/info/news_version3/147/14551/14572/14578/m22621/list_1.shtml'],
            target: '/speed/news/14578',
        },
        {
            title: 'QQ飞车专区资讯中心 - 公告',
            source: ['speed.qq.com/webplat/info/news_version3/147/14551/14572/14585/m22621/list_1.shtml'],
            target: '/speed/news/14585',
        },
        {
            title: 'QQ飞车专区资讯中心 - 赛事',
            source: ['speed.qq.com/webplat/info/news_version3/147/14551/61459/m22621/list_1.shtml'],
            target: '/speed/news/61459',
        },
    ],
};