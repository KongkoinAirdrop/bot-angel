const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const Mailjs = require('@cemalgnlts/mailjs');
require('dotenv').config();

const mailjs = new Mailjs();

puppeteer.use(StealthPlugin());

const checkEmail = async () => {
  return new Promise(async (resolve, reject) => {
    await mailjs
      .login(`${process.env.EMAIL}`, `${process.env.PASSWORD}`)
      .then(async () => {
        await mailjs.me().then((e) => {
          console.log(`Berhasil login sebagai ${e.data.address}`);
        });
        await new Promise((resolve) => setTimeout(resolve, 10000));
        await mailjs.getMessages().then((msg) => {
          if (msg.data.length >= 1 && msg.status) {
            resolve(msg.data[0].intro);
          } else {
            reject('Tidak ada email masuk');
          }
        });
        return;
      });
  });
};

async function main() {
  console.clear();
  var browser;
  let berhasil = 0;
  if (!process.env.EMAIL) {
    console.log('Email tidak ditemukan, silahkan isi .env');
    process.exit(0);
  }
  while (true) {
    browser = await puppeteer.launch({
      headless: 'new',
      devtools: true,
      args: ['--start-maximized'],
    });
    const [page] = await browser.pages();

    //set cookie from json file
    const cookiesString = fs.readFileSync('./cookies.json');
    const parsedCookies = JSON.parse(cookiesString);
    await page.setCookie(...parsedCookies);
    console.log('Akses website...');
    await page.goto(
      'https://www.angel.com/tickets/sound-of-freedom/id?locale=en&region=id&promo=claim-free-ticket',
      {
        waitUntil: 'domcontentloaded',
      }
    );
    //wait for selector
    await page.waitForSelector(
      "[id^='headlessui-dialog-panel-']:last-child > div > div > div.absolute.right-5.top-5.z-10.flex.w-fit.cursor-pointer.flex-row.justify-end.rounded-full.bg-core-gray-100.p-1\\.5 > svg"
    );

    await page.click(
      "[id^='headlessui-dialog-panel-']:last-child > div > div > div.absolute.right-5.top-5.z-10.flex.w-fit.cursor-pointer.flex-row.justify-end.rounded-full.bg-core-gray-100.p-1\\.5 > svg"
    );

    await new Promise((resolve) => setTimeout(resolve, 3000));

    await page.click(
      '#__next > div.bg-core-gray-950 > div > div.bottom-0.flex.flex-col.lg\\:absolute.lg\\:left-\\[55vh\\].lg\\:right-0.lg\\:top-0.xl\\:left-\\[53vh\\].\\32 xl\\:left-\\[51vh\\].tall\\:left-\\[40vh\\] > div > div.flex.h-full.items-center.justify-center > div > div.flex.flex-col.gap-4.border-t-2.border-t-core-gray-300.py-8.md\\:flex-row.md\\:py-8 > button'
    );

    await new Promise((resolve) => setTimeout(resolve, 5000));
    try {
      await page.waitForSelector(
        '#headlessui-dialog-panel-\\:rb\\: > div > div > div.px-4 > div > div:nth-child(2) > div.flex.items-center.justify-items-center > div',
        {
          timeout: 5000,
        }
      );
    } catch (e) {
      console.log('Tidak menemukan selector\n');
      await browser.close();
      continue;
    }
    await page.click(
      '#headlessui-dialog-panel-\\:rb\\: > div > div > div.px-4 > div > div:nth-child(2) > div.flex.items-center.justify-items-center > div'
    );
    await page.click(
      '#headlessui-dialog-panel-\\:rb\\: > div > div > div.px-4 > div > div:nth-child(2) > div.cursor-pointer > div > div'
    );
    await page.click(
      '#headlessui-dialog-panel-\\:rb\\: > div > div > div.px-4 > div > div.mx-auto.mt-7.flex.w-fit.flex-col.justify-items-stretch > button'
    );
    console.log('Mengirim OTP...');
    const emailres = await checkEmail();
    console.log(emailres);
    const otp = emailres.match(/\d/g)?.join('') || '';
    console.log(`OTP: ${otp}`);
    if (!otp) {
      console.log('OTP tidak ditemukan');
      await browser.close();
    }
    try {
      await page.waitForSelector(
        '#headlessui-dialog-panel-\\:rb\\: > div > div > div.px-4 > div > div:nth-child(2) > div > div > div > input'
      );
    } catch (e) {
      console.log('Tidak menemukan selector\n');
      await browser.close();
      continue;
    }
    await page.type(
      '#headlessui-dialog-panel-\\:rb\\: > div > div > div.px-4 > div > div:nth-child(2) > div > div > div > input',
      `${otp}`,
      {
        delay: 250,
      }
    );
    await new Promise((resolve) => setTimeout(resolve, 3000));
    try {
      await page.click(
        '#headlessui-dialog-panel-\\:rb\\: > div > div > div.px-4 > div > div.mx-auto.mt-7.flex.w-fit.flex-col.justify-items-stretch > button'
      );
    } catch (e) {
      console.log('Gak bisa klik button\n');
      await browser.close();
      continue;
    }
    console.log('Menunggu hasil...');

    await new Promise((resolve) => setTimeout(resolve, 3000));
    const hasil = await page.evaluate(() => {
      //check if selector exist
      const selector =
        '#headlessui-dialog-panel-\\:rb\\: > div > div > div.px-4 > div > h5';
      if (document.querySelector(selector)) {
        return document.querySelector(selector).innerText;
      } else {
        return 'Gagal Bang!';
      }
    });
    console.log(hasil);
    console.log('');
    if (hasil === 'Ticket Requested') {
      console.log('Ganti akun, sudah limit claim.');
      process.exit(0);
    }

    if (hasil.toLowerCase().includes('email sent')) {
      console.log('Berhasil!');
      process.exit(0);
    }

    await browser.close();
  }
}

main();
