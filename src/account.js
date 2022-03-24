import request from 'sync-request';
import config from '../config.js';
import { log } from './log.js';
import { parseDOM } from './DOMParser.js';
import { updateFile } from './storage.js';

const headers = { "cookie": `golden_key=${config.token}`};

function countTradeProfit() {
    let result = 0;
    let ordersCount = 0;
    try {
        let first = true;
        let continueId;
        while(1) {
            let method, data;
            if(!first) {
                method = 'POST';
                data = `${encodeURI('continue')}=${encodeURI(continueId)}`;
                headers["content-type"] = 'application/x-www-form-urlencoded';
                headers["x-requested-with"] = 'XMLHttpRequest';
            } else {
                first = false;
                method = 'GET';
            }
            const res = request(method, `${config.api}/orders/trade`, {
                headers: headers,
                body: data,
                retry: true,
                retryDelay: 500,
                maxRetries: Infinity
            });
            const body = res.getBody('utf8');
            const doc = parseDOM(body);
            const items = doc.querySelectorAll(".tc-item");
            const order = items[0].querySelector(".tc-order").innerHTML;
            const continueEl = doc.querySelector(".dyn-table-form");

            if(continueEl == null) {
                break;
            }

            continueId = continueEl.firstElementChild.value;

            items.forEach(item => {
                const status = item.querySelector(".tc-status").innerHTML;
                if(status == `Закрыт`) {
                    ordersCount++;
                    let price = item.querySelector(".tc-price").childNodes[0].data;
                    price = Number(price);
                    result += price;
                }
            });
            log(`${ordersCount} ${result}`);
        }
    } catch (err) {
        log(`Ошибка при подсчёте профита: ${err}`);
    }
    return result;
}

function autoUserDataUpdate(timeout) {
    setInterval(getUserData, timeout);
    log(`Автоматический апдейт данных запущен.`);
}

function getUserData() {
    let result = false;
    try {
        const res = request('GET', config.api, {
            headers: headers,
            retry: true,
            retryDelay: 500,
            maxRetries: Infinity
        });
        const body = res.getBody('utf8');
        const doc = parseDOM(body);
        const appData = JSON.parse(doc.querySelector("body").dataset.appData);
        const PHPSESSID = res.headers['set-cookie'][0].split(';')[0].split('=')[1];

        if(appData.userId != 0) {
            result = {
                id: appData.userId,
                csrfToken: appData["csrf-token"],
                sessid: PHPSESSID
            };
            updateFile(result, '../data/appData.js');
        } else {
            log(`Необходимо авторизоваться.`);
        }
    } catch (err) {
        log(`Ошибка при получении данных аккаунта: ${err}`);
    }
    return result;
}

export { headers, getUserData, countTradeProfit, autoUserDataUpdate };